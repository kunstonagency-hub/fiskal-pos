import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase";

// 🎯 Hook: useRate
// Maneja toda la lógica de la tasa de cambio (BCV / EUR / Manual).
// Incluye:
// - Carga automática desde API (dolarapi.com)
// - Persistencia en localStorage
// - Sincronización con Supabase (tabla settings)
// - Tasa manual personalizada
//
// Uso:
//   const rate = useRate(currentStoreId);
//   rate.bcvRate, rate.syncBcvRate, rate.showRateDropdown, etc.
export function useRate(storeId) {
  const [bcvRate, setBcvRate] = useState(0);
  const [loadingRate, setLoadingRate] = useState(false);
  const [lastSync, setLastSync] = useState("");
  const [rateType, setRateType] = useState(
    () => localStorage.getItem("fiskal_rate_type") || "BCV"
  );
  const [customRateInput, setCustomRateInput] = useState(
    () => localStorage.getItem("fiskal_custom_rate") || ""
  );
  const [showRateDropdown, setShowRateDropdown] = useState(false);
  const [tempRateType, setTempRateType] = useState("BCV");
  const [tempCustomRate, setTempCustomRate] = useState("");

  // ---- Función principal: obtener/actualizar la tasa ----
  const syncRate = useCallback(async (type, storeIdParam, manualValue = null) => {
    setLoadingRate(true);
    try {
      // Tasa manual: no consultamos API, la guardamos directo
      if (type === "CUSTOM" && manualValue !== null) {
        const val = parseFloat(manualValue);
        if (!isNaN(val) && val > 0) {
          setBcvRate(val);
          setLastSync("Tasa Manual");
          localStorage.setItem("fiskal_cache_bcv_rate", val.toString());
        }
        setLoadingRate(false);
        return;
      }

      if (navigator.onLine) {
        const endpoint =
          type === "EUR"
            ? "https://ve.dolarapi.com/v1/euros/oficial"
            : "https://ve.dolarapi.com/v1/dolares/oficial";

        const response = await fetch(endpoint);
        if (!response.ok)
          throw new Error("Error al conectar con el servicio de tasas");

        const data = await response.json();
        const liveRate = parseFloat(data.promedio || data.price);

        if (liveRate && !isNaN(liveRate)) {
          setBcvRate(liveRate);
          const timeStr = new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
          setLastSync(timeStr);
          localStorage.setItem("fiskal_cache_bcv_rate", liveRate.toString());

          // Guardar en Supabase (tabla settings) si tenemos storeId
          if (storeIdParam) {
            await supabase
              .from("settings")
              .upsert(
                {
                  key: type === "EUR" ? "eur_rate" : "bcv_rate",
                  value: liveRate,
                  store_id: storeIdParam,
                },
                { onConflict: "key" }
              );
          }
          setLoadingRate(false);
          return;
        }
      } else {
        // Modo offline: usar caché
        const cachedRate = localStorage.getItem("fiskal_cache_bcv_rate");
        if (cachedRate) {
          setBcvRate(parseFloat(cachedRate));
          setLastSync("Caché Local");
        }
      }
    } catch (error) {
      console.warn("Error obteniendo tasa en vivo:", error.message);
      const cachedRate = localStorage.getItem("fiskal_cache_bcv_rate");
      if (cachedRate) {
        setBcvRate(parseFloat(cachedRate));
        setLastSync("Caché Local");
      }
    }
    setLoadingRate(false);
  }, []);

  // ---- Wrapper: usa el rateType actual ----
  const syncBcvRate = useCallback(
    (storeIdParam) =>
      syncRate(
        rateType,
        storeIdParam,
        rateType === "CUSTOM" ? customRateInput : null
      ),
    [rateType, customRateInput, syncRate]
  );

  // ---- Efecto: cargar la tasa guardada cuando cambia la tienda ----
  useEffect(() => {
    const savedRateType = localStorage.getItem("fiskal_rate_type") || "BCV";
    const savedCustomRate = localStorage.getItem("fiskal_custom_rate") || "";
    setRateType(savedRateType);
    setCustomRateInput(savedCustomRate);

    if (savedRateType === "CUSTOM" && savedCustomRate) {
      const val = parseFloat(savedCustomRate);
      if (!isNaN(val)) {
        setBcvRate(val);
        setLastSync("Tasa Manual");
      }
    } else if (storeId) {
      syncRate(savedRateType, storeId);
    }
  }, [storeId, syncRate]);

  return {
    bcvRate,
    setBcvRate,
    loadingRate,
    lastSync,
    rateType,
    setRateType,
    customRateInput,
    setCustomRateInput,
    showRateDropdown,
    setShowRateDropdown,
    tempRateType,
    setTempRateType,
    tempCustomRate,
    setTempCustomRate,
    syncRate,
    syncBcvRate,
  };
}