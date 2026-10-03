import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../supabase";
import {
  queueOfflineAction,
  getOfflineActions,
  clearOfflineAction,
  getOfflineSales,
  clearOfflineSale,
} from "../db";

/**
 * useOfflineSync - Hook para manejar la cola de acciones offline y su sincronización.
 *
 * Responsabilidades:
 * - Contar acciones pendientes
 * - Procesar la cola (INSERT/UPDATE/DELETE de productos, ventas, clientes)
 * - Detectar conflictos de clientes duplicados
 * - Sincronizar automáticamente al volver online
 *
 * @param {Object} options
 * @param {Boolean} options.isOnline - estado de conexión (viene de useOnlineStatus)
 * @param {String} options.currentStoreId - tienda activa
 * @param {Function} options.onSyncComplete - callback al terminar sync (para refrescar datos)
 * @param {Function} options.fetchClients - función para recargar clientes
 * @param {Function} options.fetchSales - función para recargar ventas
 * @param {Function} options.fetchProducts - función para recargar productos
 */
export function useOfflineSync({
  isOnline,
  currentStoreId,
  onSyncComplete,
  fetchClients,
  fetchSales,
  fetchProducts,
} = {}) {
  const [pendingSalesCount, setPendingSalesCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [conflictState, setConflictState] = useState(null);

  // ============================================================
  // Refs para evitar re-suscripciones cuando los callbacks cambian
  // ============================================================
  const isSyncingRef = useRef(isSyncing);
  const currentStoreIdRef = useRef(currentStoreId);
  const onSyncCompleteRef = useRef(onSyncComplete);
  const fetchClientsRef = useRef(fetchClients);
  const fetchSalesRef = useRef(fetchSales);
  const fetchProductsRef = useRef(fetchProducts);

  useEffect(() => {
    isSyncingRef.current = isSyncing;
    currentStoreIdRef.current = currentStoreId;
    onSyncCompleteRef.current = onSyncComplete;
    fetchClientsRef.current = fetchClients;
    fetchSalesRef.current = fetchSales;
    fetchProductsRef.current = fetchProducts;
  });

  // ============================================================
  // CONTAR PENDIENTES
  // ============================================================
  const checkPendingSales = useCallback(async () => {
    const actions = await getOfflineActions();
    const legacySales = await getOfflineSales();
    setPendingSalesCount(actions.length + legacySales.length);
  }, []);

  // ============================================================
  // SINCRONIZAR COLA COMPLETA
  // ============================================================
  const syncOfflineData = useCallback(async () => {
    if (isSyncingRef.current || !currentStoreIdRef.current) return;
    setIsSyncing(true);

    const storeId = currentStoreIdRef.current;

    try {
      // ============================================================
      // PASO 1: Procesar ventas legacy (esquema antiguo)
      // ============================================================
      const oldOfflineSales = await getOfflineSales();
      if (oldOfflineSales && oldOfflineSales.length > 0) {
        for (const record of oldOfflineSales) {
          try {
            const { data: newSale, error } = await supabase
              .from("sales")
              .insert([record.saleData])
              .select()
              .single();
            if (error) throw error;

            if (newSale && record.historyData) {
              const { error: histErr } = await supabase
                .from("payment_history")
                .insert([
                  {
                    sale_id: newSale.id,
                    amount_usd: record.historyData.amount_usd,
                    payment_details: record.historyData.payment_details,
                    store_id: storeId,
                  },
                ]);
              if (histErr) throw histErr;
            }

            if (
              record.saleData.status !== "pending" &&
              record.saleData.items &&
              record.saleData.items.length > 0
            ) {
              for (const item of record.saleData.items) {
                const { data: prodDb } = await supabase
                  .from("products")
                  .select("stock")
                  .eq("id", item.id)
                  .eq("store_id", storeId)
                  .single();
                if (prodDb) {
                  const newStock = Math.max(
                    0,
                    (prodDb.stock || 0) - item.quantity
                  );
                  await supabase
                    .from("products")
                    .update({ stock: newStock })
                    .eq("id", item.id)
                    .eq("store_id", storeId);
                }
              }
            }

            await clearOfflineSale(record.id);
          } catch (e) {
            console.error("Error legacy sale:", e);
          }
        }
      }

      // ============================================================
      // PASO 2: Procesar la cola de acciones nueva
      // ============================================================
      const actions = await getOfflineActions();
      if (actions.length === 0 && oldOfflineSales.length === 0) {
        setIsSyncing(false);
        return;
      }

      let generalErrorOccurred = false;
      const failedActions = [];
      const idMap = {};

      actions.sort((a, b) => a.timestamp - b.timestamp);

      for (const action of actions) {
        let syncFailed = false;
        let errorMessage = "";

        try {
          if (action.type === "INSERT_PRODUCT") {
            const { data: newProd, error } = await supabase
              .from("products")
              .insert([{ ...action.productData, store_id: storeId }])
              .select()
              .single();
            if (error) throw error;
            if (newProd && action.tempId) {
              idMap[action.tempId] = newProd.id;
            }
          } else if (action.type === "INSERT_SALE") {
            if (action.saleData.items) {
              action.saleData.items = action.saleData.items.map((item) => ({
                ...item,
                id: idMap[item.id] || item.id,
              }));
            }

            const { data: newSale, error } = await supabase
              .from("sales")
              .insert([{ ...action.saleData, store_id: storeId }])
              .select()
              .single();
            if (error) throw error;

            if (newSale && action.tempId) {
              idMap[action.tempId] = newSale.id;
            }

            if (newSale && action.historyData) {
              const { error: histErr } = await supabase
                .from("payment_history")
                .insert([
                  {
                    sale_id: newSale.id,
                    amount_usd: action.historyData.amount_usd,
                    payment_details: action.historyData.payment_details,
                    store_id: storeId,
                  },
                ]);
              if (histErr) throw histErr;
            }

            if (
              action.saleData.status !== "pending" &&
              action.saleData.items &&
              action.saleData.items.length > 0
            ) {
              for (const item of action.saleData.items) {
                const { data: prodDb } = await supabase
                  .from("products")
                  .select("stock")
                  .eq("id", item.id)
                  .eq("store_id", storeId)
                  .single();
                if (prodDb) {
                  const newStock = Math.max(
                    0,
                    (prodDb.stock || 0) - item.quantity
                  );
                  await supabase
                    .from("products")
                    .update({ stock: newStock })
                    .eq("id", item.id)
                    .eq("store_id", storeId);
                }
              }
            }
          } else if (action.type === "UPDATE_SALE") {
            const actualSaleId = idMap[action.saleId] || action.saleId;
            if (
              actualSaleId &&
              String(actualSaleId) !== "null" &&
              !String(actualSaleId).startsWith("local_")
            ) {
              const { error } = await supabase
                .from("sales")
                .update({
                  status: action.updatedStatus,
                  balance_due_usd: action.newBalanceDue,
                  payment_details: action.paymentDetails,
                })
                .eq("id", actualSaleId)
                .eq("store_id", storeId);
              if (error) throw error;

              const { error: histErr2 } = await supabase
                .from("payment_history")
                .insert([
                  {
                    sale_id: actualSaleId,
                    amount_usd: action.historyData.amount_usd,
                    payment_details: action.historyData.payment_details,
                    store_id: storeId,
                  },
                ]);
              if (histErr2) throw histErr2;
            }
          } else if (action.type === "DELETE_SALE") {
            const actualSaleId = idMap[action.saleId] || action.saleId;
            if (
              actualSaleId &&
              String(actualSaleId) !== "null" &&
              !String(actualSaleId).startsWith("local_")
            ) {
              const { error } = await supabase
                .from("sales")
                .delete()
                .eq("id", actualSaleId)
                .eq("store_id", storeId);
              if (error) throw error;
            }
          } else if (action.type === "UPDATE_PRODUCT") {
            const actualProdId = idMap[action.productId] || action.productId;
            if (
              actualProdId &&
              String(actualProdId) !== "null" &&
              !String(actualProdId).startsWith("local_")
            ) {
              const { error } = await supabase
                .from("products")
                .update(action.productData)
                .eq("id", actualProdId)
                .eq("store_id", storeId);
              if (error) throw error;
            }
          } else if (action.type === "DELETE_PRODUCT") {
            const actualProdId = idMap[action.productId] || action.productId;
            if (
              actualProdId &&
              String(actualProdId) !== "null" &&
              !String(actualProdId).startsWith("local_")
            ) {
              const { error } = await supabase
                .from("products")
                .delete()
                .eq("id", actualProdId)
                .eq("store_id", storeId);
              if (error) throw error;
            }
          } else if (action.type === "INSERT_CLIENT") {
            let conflictResolved = false;
            if (action.clientData && action.clientData.document) {
              const { data: existing } = await supabase
                .from("clients")
                .select("*")
                .eq("document", action.clientData.document)
                .eq("store_id", storeId)
                .single();

              if (existing) {
                const choice = await new Promise((resolve) => {
                  setConflictState({
                    title: "Conflicto de Cliente Detectado",
                    message: `La Cédula/RIF ${action.clientData.document} ya está registrada en la nube. ¿Qué datos deseas conservar?`,
                    local: action.clientData,
                    cloud: existing,
                    resolvePromise: resolve,
                  });
                });

                setConflictState(null);

                if (choice === "local") {
                  const { error: updErr } = await supabase
                    .from("clients")
                    .update({
                      name: action.clientData.name,
                      phone: action.clientData.phone,
                      email: action.clientData.email,
                    })
                    .eq("id", existing.id)
                    .eq("store_id", storeId);
                  if (updErr) throw updErr;
                }
                conflictResolved = true;
                if (action.tempId) idMap[action.tempId] = existing.id;
              }
            }
            if (!conflictResolved) {
              const { data: newClient, error: insErr } = await supabase
                .from("clients")
                .insert([{ ...action.clientData, store_id: storeId }])
                .select()
                .single();
              if (insErr) throw insErr;
              if (newClient && action.tempId) {
                idMap[action.tempId] = newClient.id;
              }
            }
          } else if (action.type === "DELETE_CLIENT") {
            const actualClientId = idMap[action.clientId] || action.clientId;
            if (
              actualClientId &&
              String(actualClientId) !== "null" &&
              !String(actualClientId).startsWith("local_")
            ) {
              const { error } = await supabase
                .from("clients")
                .delete()
                .eq("id", actualClientId)
                .eq("store_id", storeId);
              if (error) throw error;
            }
          }
        } catch (err) {
          syncFailed = true;
          errorMessage = err.message;
          console.error("Error sincronizando accion individual:", action, err);

          // Descartar acciones corruptas automáticamente
          if (
            errorMessage.includes("invalid input syntax") ||
            errorMessage.includes('uuid: "null"') ||
            errorMessage.includes("uuid: null") ||
            errorMessage.includes("not a valid UUID")
          ) {
            syncFailed = false;
            console.warn(
              "⚠️ Acción corrupta detectada y descartada automáticamente para liberar la cola."
            );
          }
        }

        if (!syncFailed) {
          await clearOfflineAction(action.local_id);
        } else {
          generalErrorOccurred = true;
          failedActions.push({
            type: action.type,
            reason: errorMessage,
          });
        }
      }

      // ============================================================
      // PASO 3: Refrescar datos y notificar al consumidor
      // ============================================================
      if (fetchClientsRef.current) await fetchClientsRef.current(storeId);
      if (fetchSalesRef.current) await fetchSalesRef.current(storeId);
      if (fetchProductsRef.current) await fetchProductsRef.current(storeId);

      await checkPendingSales();

      if (onSyncCompleteRef.current) {
        onSyncCompleteRef.current({
          success: !generalErrorOccurred,
          failedActions,
        });
      }
    } catch (error) {
      console.error(
        "Error crítico procesando la cola de sincronización:",
        error
      );
    } finally {
      setIsSyncing(false);
    }
  }, [checkPendingSales]);

  // ============================================================
  // SYNC AUTOMÁTICO AL VOLVER ONLINE
  // ============================================================
  useEffect(() => {
    let timeout;
    if (isOnline) {
      timeout = setTimeout(() => {
        syncOfflineData();
      }, 2500);
    }
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  return {
    // Estado
    pendingSalesCount,
    isSyncing,
    conflictState,
    setConflictState,
    // Acciones
    checkPendingSales,
    syncOfflineData,
  };
}