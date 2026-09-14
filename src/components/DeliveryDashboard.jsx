import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";
import {
  Bell,
  Clock,
  ChefHat,
  Truck,
  Check,
  XCircle,
  CreditCard,
  FileText,
} from "lucide-react";

// Dashboard de entregas Krono.
// Escucha pedidos entrantes, muestra el estado de cada entrega y permite actualizar el flujo
// de aceptación, preparación y envío del motorizado para cada orden activa.
export default function DeliveryDashboard({ storeId, isOnline, bcvRate }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newOrderNotification, setNewOrderNotification] = useState(null);

  useEffect(() => {
    if (!storeId) return;
    fetchActiveOrders();

    const channel = supabase
      .channel(`krono-orders-${storeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `store_id=eq.${storeId}`,
        },
        (payload) => {
          try {
            new Audio(
              "https://upload.wikimedia.org/wikipedia/commons/3/34/Sound_Effect_-_Door_Bell.ogg",
            ).play();
          } catch (e) {}
          const orderNum = String(payload.new.id).slice(-4).toUpperCase();
          setNewOrderNotification(`¡Nuevo pedido Krono #${orderNum}!`);
          setTimeout(() => setNewOrderNotification(null), 6000);
          setOrders((prev) => [payload.new, ...prev]);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `store_id=eq.${storeId}`,
        },
        (payload) => {
          setOrders((prev) =>
            prev.map((order) =>
              order.id === payload.new.id
                ? { ...order, ...payload.new }
                : order,
            ),
          );
        },
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [storeId]);

  const fetchActiveOrders = async () => {
    if (!storeId) return;
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("store_id", storeId)
      .not("status", "in", '("Entregado","Rechazado")')
      .order("created_at", { ascending: false });

    if (data) setOrders(data);
    setLoading(false);
  };

  const updateOrderStatus = async (id, newStatus) => {
    const currentOrder = orders.find((o) => o.id === id);
    setOrders((prev) =>
      prev.map((order) =>
        order.id === id ? { ...order, status: newStatus } : order,
      ),
    );

    try {
      // 1. CUANDO EL RESTAURANTE ACEPTA EL PEDIDO (PREPARANDO)
      if (newStatus === "Preparando" && currentOrder) {
        // A) Llama al Motorizado Inmediatamente (Para que viaje mientras cocinas)
        try {
          const { data: storeData } = await supabase
            .from("stores")
            .select("name, address, lat, lng")
            .eq("id", storeId)
            .single();

          const pLat = parseFloat(storeData?.lat) || 10.3755;
          const pLng = parseFloat(storeData?.lng) || -66.9587;
          const dropoffCoords = currentOrder.customer_info?.coordenadas || {
            lat: 10.37,
            lng: -66.96,
          };
          const clientName =
            `${currentOrder.customer_info?.nombre || ""} ${currentOrder.customer_info?.apellido || ""}`.trim() ||
            "Cliente Krono";

          const { error: riderErr } = await supabase
            .from("krono_deliveries")
            .insert([
              {
                order_id: String(currentOrder.id),
                store_id: storeId,
                pickup_name: storeData?.name || "Restaurante",
                pickup_address: storeData?.address || "Local del comercio",
                pickup_lat: pLat,
                pickup_lng: pLng,
                customer_name: clientName,
                customer_phone: currentOrder.customer_info?.telefono || "",
                customer_address:
                  currentOrder.customer_info?.direccion ||
                  "Dirección de entrega",
                dropoff_lat: parseFloat(dropoffCoords.lat) || 10.37,
                dropoff_lng: parseFloat(dropoffCoords.lng) || -66.96,
                delivery_pin: String(currentOrder.delivery_pin || "0000"),
                delivery_fee: 3.0,
                status: "buscando_motorizado",
              },
            ]);

          if (riderErr) console.error("Error alertando al rider:", riderErr);
          else alert("¡Motorizado llamado con éxito! En camino al local.");
        } catch (e) {
          console.error("Fallo al llamar moto:", e);
        }

        // B) Registrar la Venta Fiscal de forma segura
        try {
          const effectiveRate = Number(bcvRate) > 0 ? Number(bcvRate) : 1;
          let parsedItems =
            typeof currentOrder.items === "string"
              ? JSON.parse(currentOrder.items)
              : currentOrder.items;
          const formattedSalesItems = (parsedItems || []).map((item) => ({
            id: item.id || 0,
            name: item.name,
            price: Number(item.price),
            quantity: item.quantity || 1,
          }));
          const totalUsd = Number(currentOrder.total_amount) || 0;

          await supabase.from("sales").insert([
            {
              store_id: storeId,
              client_name:
                `${currentOrder.customer_info?.nombre || ""} (Krono)`.trim(),
              items: formattedSalesItems,
              total_usd: totalUsd,
              total_bs: totalUsd * effectiveRate,
              payment_details: {
                cash_usd:
                  currentOrder.payment_method === "efectivo" ? totalUsd : 0,
                cash_bs: 0,
                zelle: currentOrder.payment_method === "zelle" ? totalUsd : 0,
                debit:
                  currentOrder.payment_method === "pago_movil" ? totalUsd : 0,
                reference: currentOrder.payment_reference || "",
                applied_bcv_rate: effectiveRate,
              },
              status: "completed",
            },
          ]);
        } catch (e) {
          console.error("Fallo al guardar venta fiscal:", e);
        }
      }

      // 2. Actualizar el estado de la orden en Supabase
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", id);
      if (error) throw error;
    } catch (error) {
      alert("Error al actualizar el pedido: " + error.message);
      fetchActiveOrders();
    }
  };

  const handleWhatsAppContact = (order) => {
    if (!order.customer_info?.telefono)
      return alert("El cliente no ha proporcionado teléfono.");
    let phone = order.customer_info.telefono.replace(/\D/g, "");
    if (phone.startsWith("0")) phone = "58" + phone.substring(1);
    const msg = `¡Hola ${order.customer_info.nombre}! 👋 Tu pedido Krono por $${Number(order.total_amount).toFixed(2)} está en preparación.`;
    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,
      "_blank",
    );
  };

  const getStatusColor = (status) => {
    const st = String(status || "").toLowerCase();
    if (st === "pendiente")
      return { bg: "#fee2e2", text: "#ef4444", icon: <Bell size={16} /> };
    if (st === "preparando")
      return { bg: "#fef3c7", text: "#d97706", icon: <ChefHat size={16} /> };
    if (st === "en_comercio")
      return { bg: "#ede9fe", text: "#7c3aed", icon: <Truck size={16} /> };
    if (st === "en camino")
      return { bg: "#dbeafe", text: "#3b82f6", icon: <Truck size={16} /> };
    return { bg: "#f1f5f9", text: "#64748b", icon: <Clock size={16} /> };
  };

  if (loading)
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
        Cargando pedidos en vivo...
      </div>
    );

  return (
    <div
      style={{
        padding: "24px",
        maxWidth: "100%",
        boxSizing: "border-box",
        overflowX: "hidden",
        margin: "0 auto",
        position: "relative",
      }}
    >
      {newOrderNotification && (
        <div
          style={{
            position: "fixed",
            top: "24px",
            right: "24px",
            background: "#10b981",
            color: "#fff",
            padding: "16px 24px",
            borderRadius: "12px",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            fontWeight: "bold",
            zIndex: 9999,
          }}
        >
          <Bell size={24} /> {newOrderNotification}
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "32px",
          gap: "12px",
        }}
      >
        <h2
          style={{
            fontSize: "24px",
            fontWeight: "bold",
            color: "#0f172a",
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Bell color="#10b981" /> Pedidos Web (Krono)
        </h2>
      </div>

      {orders.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "64px 20px",
            background: "#fff",
            borderRadius: "16px",
            border: "1px dashed #cbd5e1",
            maxWidth: "100%",
            boxSizing: "border-box",
          }}
        >
          <Clock size={48} color="#94a3b8" style={{ marginBottom: "16px" }} />
          <h3
            style={{ color: "#0f172a", fontSize: "18px", margin: "0 0 8px 0" }}
          >
            Bandeja limpia
          </h3>
          <p style={{ color: "#64748b", margin: 0 }}>
            No hay pedidos activos en este momento.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fill, minmax(min(100%, 320px), 1fr))",
            gap: "16px",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {orders.map((order) => {
            const statusStyle = getStatusColor(order.status);
            let parsedItems =
              typeof order.items === "string"
                ? JSON.parse(order.items)
                : order.items;

            return (
              <div
                key={order.id}
                style={{
                  background: "#fff",
                  borderRadius: "16px",
                  border: "1px solid #e2e8f0",
                  overflow: "hidden",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
                  display: "flex",
                  flexDirection: "column",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              >
                <div
                  style={{
                    padding: "16px",
                    borderBottom: "1px solid #e2e8f0",
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "8px",
                    background: "#f8fafc",
                    boxSizing: "border-box",
                  }}
                >
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: "bold",
                      color: "#64748b",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <FileText size={14} /> TICKET #
                    {String(order.id).slice(-4).toUpperCase()}
                  </span>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      background: statusStyle.bg,
                      color: statusStyle.text,
                      padding: "6px 12px",
                      borderRadius: "20px",
                      fontSize: "12px",
                      fontWeight: "bold",
                      textTransform: "uppercase",
                    }}
                  >
                    {statusStyle.icon} {order.status}
                  </div>
                </div>

                <div
                  style={{
                    padding: "16px",
                    minHeight: "120px",
                    flex: 1,
                    boxSizing: "border-box",
                  }}
                >
                  <div
                    style={{
                      marginBottom: "16px",
                      paddingBottom: "12px",
                      borderBottom: "1px dashed #cbd5e1",
                      fontSize: "13px",
                      display: "flex",
                      flexWrap: "wrap",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "12px",
                    }}
                  >
                    <div style={{ flex: "1 1 120px", minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: "bold",
                          color: "#0f172a",
                          marginBottom: "4px",
                          wordBreak: "break-word",
                        }}
                      >
                        {order.customer_info?.nombre}{" "}
                        {order.customer_info?.apellido}
                      </div>
                      <div
                        style={{ color: "#64748b", wordBreak: "break-word" }}
                      >
                        Tel: {order.customer_info?.telefono}
                      </div>
                    </div>
                    <button
                      onClick={() => handleWhatsAppContact(order)}
                      style={{
                        background: "#25D366",
                        color: "#fff",
                        border: "none",
                        padding: "6px 10px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: "bold",
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      WhatsApp
                    </button>
                  </div>

                  {(parsedItems || []).map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "12px",
                        fontSize: "14px",
                        gap: "8px",
                        flexWrap: "nowrap",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span
                          style={{
                            fontWeight: "bold",
                            color: "#10b981",
                            marginRight: "6px",
                          }}
                        >
                          {item.quantity || 1}x
                        </span>
                        <span
                          style={{
                            color: "#334155",
                            fontWeight: "bold",
                            wordBreak: "break-word",
                          }}
                        >
                          {item.name}
                        </span>
                        {item.customization && (
                          <span
                            style={{
                              display: "block",
                              fontSize: "11px",
                              color: "#d97706",
                              marginTop: "4px",
                              wordBreak: "break-word",
                            }}
                          >
                            📌 {item.customization}
                          </span>
                        )}
                      </div>
                      <span
                        style={{
                          fontWeight: "500",
                          color: "#0f172a",
                          flexShrink: 0,
                        }}
                      >
                        ${Number(item.price * (item.quantity || 1)).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    padding: "16px",
                    background: "#f8fafc",
                    borderTop: "1px solid #e2e8f0",
                    borderBottom: "1px solid #e2e8f0",
                    boxSizing: "border-box",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px",
                      gap: "8px",
                    }}
                  >
                    <span style={{ color: "#64748b", fontSize: "14px" }}>
                      Total pagado:
                    </span>
                    <span
                      style={{
                        fontSize: "20px",
                        fontWeight: "900",
                        color: "#10b981",
                      }}
                    >
                      ${Number(order.total_amount).toFixed(2)}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      fontSize: "13px",
                      color: "#475569",
                      flexWrap: "wrap",
                    }}
                  >
                    <CreditCard size={14} flexShrink={0} />
                    <span
                      style={{
                        textTransform: "capitalize",
                        fontWeight: "bold",
                        wordBreak: "break-word",
                      }}
                    >
                      {order.payment_method?.replace("_", " ") || "No definido"}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    padding: "16px",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "8px",
                    boxSizing: "border-box",
                  }}
                >
                  {order.status === "Pendiente" && (
                    <>
                      <button
                        onClick={() => updateOrderStatus(order.id, "Rechazado")}
                        style={{
                          flex: "1 1 80px",
                          background: "#fee2e2",
                          color: "#ef4444",
                          border: "none",
                          padding: "10px",
                          borderRadius: "8px",
                          fontWeight: "bold",
                          cursor: "pointer",
                        }}
                      >
                        Rechazar
                      </button>
                      <button
                        onClick={() =>
                          updateOrderStatus(order.id, "Preparando")
                        }
                        style={{
                          flex: "2 1 140px",
                          background: "#10b981",
                          color: "#fff",
                          border: "none",
                          padding: "10px",
                          borderRadius: "8px",
                          fontWeight: "bold",
                          cursor: "pointer",
                        }}
                      >
                        Aceptar y Cocinar
                      </button>
                    </>
                  )}
                  {["Preparando", "en_comercio"].includes(order.status) && (
                    <div
                      style={{
                        width: "100%",
                        textAlign: "center",
                        padding: "12px",
                        background: "#f1f5f9",
                        color: "#64748b",
                        borderRadius: "8px",
                        fontWeight: "bold",
                        fontSize: "13px",
                        boxSizing: "border-box",
                      }}
                    >
                      ⏳ Esperando retiro del Motorizado...
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
