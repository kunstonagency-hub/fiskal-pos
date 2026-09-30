import React, { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "../supabase";
import {
  Maximize2,
  Monitor,
  X,
  Bell,
  CheckCircle,
  Clock,
  ChefHat,
  Timer,
  ZoomIn,
  ZoomOut,
  PlayCircle,
  BookmarkPlus,
  ListVideo,
  Trash2,
  Settings,
  Columns,
  LayoutGrid,
  Headphones, 
} from "lucide-react";

// Dashboard de cocina y pantalla pública.
const GENERAL_KEYWORDS = [
  "toddy",
  "harina",
  "azucar",
  "galletas",
  "citrato",
  "disco duro",
  "cronch",
  "palitos",
];

const FALLBACK_BANNERS = [
  {
    url: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=1920&q=80",
    title: "¡Pide tus Adicionales Favoritos!",
  },
  {
    url: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1920&q=80",
    title: "Las Mejores Hamburguesas",
  },
];

export default function KitchenDashboard({
  sales,
  setSales,
  currentStoreId,
  currentStoreName,
  kdsBanners = [],
}) {
  const [isPublicMode, setIsPublicMode] = useState(false);

  const [displayMode, setDisplayMode] = useState("banner");
  const [currentSlide, setCurrentSlide] = useState(0);

  const [fontScale, setFontScale] = useState(1);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRadioMode, setIsRadioMode] = useState(false); 

  const [savedLinks, setSavedLinks] = useState([]);
  const [showSavedLinks, setShowSavedLinks] = useState(false);

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [kdsConfig, setKdsConfig] = useState({
    layout: "grid",
    hideReady: false,
    col1Cats: [],
    col2Cats: [],
    col3Cats: [],
  });

  const [dbCategories, setDbCategories] = useState([]);
  const [extraCats, setExtraCats] = useState([]);

  useEffect(() => {
    const savedConfig = localStorage.getItem(
      `fiskal_kds_config_${currentStoreId}`
    );
    if (savedConfig) {
      try {
        setKdsConfig(JSON.parse(savedConfig));
      } catch (e) {
        console.error("Error leyendo KDS Config", e);
      }
    }
  }, [currentStoreId]);

  const updateKdsConfig = (newConfig) => {
    setKdsConfig(newConfig);
    localStorage.setItem(
      `fiskal_kds_config_${currentStoreId}`,
      JSON.stringify(newConfig)
    );
  };

  useEffect(() => {
    if (!currentStoreId) return;
    const fetchSavedLinks = async () => {
      try {
        const { data } = await supabase
          .from("settings")
          .select("value")
          .eq("key", `kds_yt_${currentStoreId}`)
          .maybeSingle();
        if (data && data.value) {
          setSavedLinks(JSON.parse(data.value));
        }
      } catch (err) {
        console.log("Error cargando listas de YouTube:", err);
      }
    };
    fetchSavedLinks();
  }, [currentStoreId]);

  useEffect(() => {
    if (!currentStoreId) return;
    const fetchCats = async () => {
      try {
        const { data } = await supabase
          .from("products")
          .select("category")
          .eq("store_id", currentStoreId);
        if (data) {
          const uniqueCats = [
            ...new Set(data.map((item) => item.category?.trim()).filter(Boolean)),
          ];
          setDbCategories(uniqueCats);
        }
      } catch (e) {
        console.error("Error obteniendo categorías", e);
      }
    };
    fetchCats();
  }, [currentStoreId]);

  const handleSaveLink = async () => {
    if (!youtubeUrl.trim()) {
      alert("Primero pega un enlace de YouTube para poder guardarlo.");
      return;
    }
    const label = window.prompt(
      "Dale un nombre a esta lista o video (Ej: Rock Clásico, Electrónica, etc.):",
      "Nueva Lista"
    );
    if (!label) return;

    const updatedLinks = [...savedLinks, { label, url: youtubeUrl }];
    setSavedLinks(updatedLinks);

    try {
      await supabase.from("settings").upsert(
        {
          key: `kds_yt_${currentStoreId}`,
          value: JSON.stringify(updatedLinks),
          store_id: currentStoreId,
        },
        { onConflict: "key" }
      );
      alert("¡Lista guardada con éxito!");
    } catch (error) {
      console.error("Error guardando enlace:", error);
    }
  };

  const handleDeleteLink = async (indexToRemove) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta lista guardada?"))
      return;
    const updatedLinks = savedLinks.filter((_, idx) => idx !== indexToRemove);
    setSavedLinks(updatedLinks);
    try {
      await supabase.from("settings").upsert(
        {
          key: `kds_yt_${currentStoreId}`,
          value: JSON.stringify(updatedLinks),
          store_id: currentStoreId,
        },
        { onConflict: "key" }
      );
    } catch (error) {
      console.error("Error eliminando enlace:", error);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFull = !!document.fullscreenElement;
      setIsFullscreen(isFull);
      if (!isFull) {
        setIsPublicMode(false);
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const [, setTicker] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTicker((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const [readyPopup, setReadyPopup] = useState(null);
  const prevReadyIdsRef = useRef(new Set());
  const isFirstLoadRef = useRef(true);
  const popupTimeoutRef = useRef(null);

  const getYouTubeData = (url) => {
    if (!url) return { videoId: null, listId: null };
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    const videoId = match && match[2].length === 11 ? match[2] : null;
    const listMatch = url.match(/[?&]list=([^#&?]*)/);
    const listId = listMatch ? listMatch[1] : null;

    return { videoId, listId };
  };

  const { videoId, listId } = getYouTubeData(youtubeUrl);

  const activeBanners = useMemo(() => {
    const base =
      kdsBanners && kdsBanners.length > 0 ? kdsBanners : FALLBACK_BANNERS;

    // Ocultar video de la pantalla rotativa si MODO RADIO está activo
    return videoId && !isRadioMode
      ? [...base, { type: "youtube", videoId, listId, title: "YouTube Video" }]
      : base;
  }, [kdsBanners, videoId, listId, isRadioMode]);

  useEffect(() => {
    if (!isPublicMode) return;

    let timer;
    if (displayMode === "banner") {
      const currentBannerItem = activeBanners[currentSlide];
      const slideDuration =
        currentBannerItem && currentBannerItem.type === "youtube"
          ? 10000
          : 5000;

      timer = setTimeout(() => {
        if (currentSlide < activeBanners.length - 1) {
          setCurrentSlide((prev) => prev + 1);
        } else {
          setDisplayMode("board");
        }
      }, slideDuration);
    } else {
      timer = setTimeout(() => {
        setCurrentSlide(0);
        setDisplayMode("banner");
      }, 7000);
    }
    return () => clearTimeout(timer);
  }, [isPublicMode, displayMode, currentSlide, activeBanners]);

  useEffect(() => {
    if (!sales || !Array.isArray(sales)) return;
    const currentReadyOrders = sales.filter((s) => {
      const st = String(s.status || s.estatus || "")
        .trim()
        .toLowerCase();
      return st === "ready" || st === "listo" || st === "espera_pago";
    });

    if (isFirstLoadRef.current) {
      currentReadyOrders.forEach((o) => prevReadyIdsRef.current.add(o.id));
      isFirstLoadRef.current = false;
      return;
    }

    const newlyReady = currentReadyOrders.find(
      (o) => !prevReadyIdsRef.current.has(o.id)
    );

    if (newlyReady) {
      prevReadyIdsRef.current.add(newlyReady.id);
      const orderIdStr = String(newlyReady.id);
      const orderNum = newlyReady.invoice_number || `#${orderIdStr.slice(-4)}`;
      const clientName = newlyReady.client_name || "Cliente";
      try {
        const bell = new Audio(
          "https://upload.wikimedia.org/wikipedia/commons/3/34/Sound_Effect_-_Door_Bell.ogg"
        );
        bell.play().catch((e) => console.log("Audio:", e));
      } catch (e) {}

      setReadyPopup({ orderNum, clientName });
      if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
      popupTimeoutRef.current = setTimeout(() => {
        setReadyPopup(null);
      }, 10000);
    }
  }, [sales]);

  const getItems = (s) => {
    if (!s) return [];
    if (Array.isArray(s.items)) return s.items;
    if (typeof s.items === "string") {
      try {
        return JSON.parse(s.items);
      } catch (e) {}
    }
    if (Array.isArray(s.cart)) return s.cart;
    if (typeof s.cart === "string") {
      try {
        return JSON.parse(s.cart);
      } catch (e) {}
    }
    return [];
  };

  const rawOrders =
    typeof sales !== "undefined" && Array.isArray(sales) ? sales : [];

  const availableCategories = useMemo(() => {
    const cats = new Set();
    dbCategories.forEach((c) => cats.add(c));
    extraCats.forEach((c) => cats.add(c));
    rawOrders.forEach((s) => {
      getItems(s).forEach((i) =>
        cats.add(i.category ? i.category.trim() : "General")
      );
    });
    if (kdsConfig.col1Cats) kdsConfig.col1Cats.forEach((c) => cats.add(c));
    if (kdsConfig.col2Cats) kdsConfig.col2Cats.forEach((c) => cats.add(c));
    if (kdsConfig.col3Cats) kdsConfig.col3Cats.forEach((c) => cats.add(c));
    return Array.from(cats).filter(Boolean).sort();
  }, [rawOrders, dbCategories, extraCats, kdsConfig]);

  const waitingOrders = rawOrders.filter((s) => {
    if (!s) return false;
    const status = String(s.status || s.estatus || s.state || "")
      .trim()
      .toLowerCase();
    if (["completed", "pagada", "paid", "credit", "crédito"].includes(status))
      return false;
    const validKitchenStates = [
      "pending",
      "en espera",
      "pendiente",
      "preparando",
      "en preparación",
      "ready",
      "listo",
      "espera_pago",
      "web_unpaid" ,
    ];
    if (!validKitchenStates.includes(status)) return false;
    const itemsList = getItems(s);
    if (itemsList.length === 0) return false;
    const kitchenItems = itemsList.filter((item) => {
      const name = String(item.name || "").toLowerCase();
      return !GENERAL_KEYWORDS.some((gk) => name.includes(gk));
    });
    return kitchenItems.length > 0;
  });

  waitingOrders.sort((a, b) => {
    const timeA = new Date(
      a.payment_details?.kitchen_sent_at || a.created_at
    ).getTime();
    const timeB = new Date(
      b.payment_details?.kitchen_sent_at || b.created_at
    ).getTime();
    return timeB - timeA;
  });

  const preparingOrders = waitingOrders.filter((o) => {
    const st = String(o.status || "")
      .trim()
      .toLowerCase();
    return (
      st === "pending" ||
      st === "pendiente" ||
      st === "preparando" ||
      st === "en preparación" ||
      st === "en espera"
    );
  });

  const readyOrders = waitingOrders.filter((o) => {
    const st = String(o.status || "")
      .trim()
      .toLowerCase();
    return st === "ready" || st === "listo" || st === "espera_pago";
  });

  const getTimerInfo = (order) => {
    const pd = order.payment_details || {};
    const startTime = pd.prep_started_at
      ? new Date(pd.prep_started_at).getTime()
      : null;
    if (!startTime) return null;

    const isReady = ["ready", "listo", "espera_pago"].includes(
      String(order.status || "").toLowerCase()
    );
    const endTime =
      isReady && pd.prep_finished_at
        ? new Date(pd.prep_finished_at).getTime()
        : Date.now();

    const diffSec = Math.max(0, Math.floor((endTime - startTime) / 1000));
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    const formatted = `${String(mins).padStart(2, "0")}:${String(secs).padStart(
      2,
      "0"
    )}`;

    let badgeColor = "#16a34a";
    if (diffSec >= 600) {
      badgeColor = "#e05d5d";
    } else if (diffSec >= 300) {
      badgeColor = "#f59e0b";
    }

    return { formatted, diffSec, badgeColor, isReady };
  };

  const zoomIn = () => setFontScale((prev) => Math.min(prev + 0.2, 1.8));
  const zoomOut = () => setFontScale((prev) => Math.max(prev - 0.2, 0.8));

  const renderOrderCard = (order, index, targetCats = []) => {
    const orderId = order && order.id ? order.id.toString() : String(index + 1);
    const itemsList = getItems(order).filter((item) => {
      const name = String(item.name || "").toLowerCase();
      return !GENERAL_KEYWORDS.some((gk) => name.includes(gk));
    });

    let stationItems = itemsList;
    if (targetCats.length > 0) {
      stationItems = itemsList.filter((i) => {
        const c = i.category ? i.category.trim() : "General";
        return targetCats.includes(c);
      });
    }

    if (stationItems.length === 0) return null;

    const currentStatus = String(order.status || order.estatus || "pending")
      .trim()
      .toLowerCase();
    const globalIsReady =
      currentStatus === "ready" ||
      currentStatus === "listo" ||
      currentStatus === "espera_pago";

    const displayItems = stationItems.filter((item) => !item.dispatched);
    const stationIsReady = stationItems.length > 0 && displayItems.length === 0;
    const stationIsPreparing = displayItems.some((i) => i.preparing) && !stationIsReady;

    if (kdsConfig.hideReady && (stationIsReady || globalIsReady)) {
      return null;
    }

    if (displayItems.length === 0 && !stationIsReady && !globalIsReady) {
      return null;
    }

    const timerInfo = getTimerInfo(order);

    let headerBg = "#e05d5d"; // Rojo por defecto
    let headerColor = "#fff";
    let borderColor = "#e5e7eb";
    let statusText = "PENDIENTE";
    const isWebUnpaid = currentStatus === "web_unpaid";

    if (isWebUnpaid) {
      headerBg = "#8b5cf6"; // Morado para Delivery Web
      headerColor = "#fff";
      borderColor = "#8b5cf6";
      statusText = "🌐 DELIVERY WEB (POR COBRAR)";
    } else if (stationIsPreparing) {
      headerBg = "#f59e0b"; // Naranja
      headerColor = "#111827";
      statusText = "PREPARANDO";
    } else if (stationIsReady) {
      headerBg = "#16a34a"; // Verde
      headerColor = "#fff";
      statusText = globalIsReady ? "LISTO PARA ENTREGAR" : "ESTACIÓN LISTA";
    }

    const timeStr = order.created_at
      ? new Date(order.created_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "--:--";

    return (
      <div
        key={`${orderId}-${targetCats.join("-")}`}
        style={{
          background: "#fff",
          borderRadius: "8px",
          border: `1px solid ${borderColor}`,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
          height: "fit-content", 
        }}
      >
        <div
          style={{
            background: headerBg,
            color: headerColor,
            padding: "14px 16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start", // Alineación arriba
          }}
        >
          {/* ======================================================== */}
          {/* AQUÍ ESTÁ EL CAMBIO SOLICITADO (NOMBRE GRANDE Y NEGRITA) */}
          {/* ======================================================== */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <strong style={{ fontSize: `${18 * fontScale}px`, lineHeight: 1 }}>
              #{order.invoice_number || orderId.slice(-4)}
            </strong>
            <strong style={{ fontSize: `${18 * fontScale}px`, lineHeight: 1 }}>
              {order.client_name || "Cliente"}
            </strong>
            <span style={{ fontSize: `${12 * fontScale}px`, opacity: 0.9 }}>
              Hora: {timeStr}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: "4px",
            }}
          >
            <span
              style={{
                fontSize: `${12 * fontScale}px`,
                fontWeight: "900",
                letterSpacing: "0.5px",
              }}
            >
              {statusText}
            </span>

            {timerInfo &&
              (stationIsPreparing ||
                (!stationIsReady && currentStatus === "preparando")) && (
                <span
                  style={{
                    background: "#ffffff",
                    color: timerInfo.badgeColor,
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontSize: `${12 * fontScale}px`,
                    fontWeight: "900",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  }}
                >
                  <Timer size={13 * fontScale} /> {timerInfo.formatted}
                </span>
              )}

            {timerInfo && stationIsReady && (
              <span
                style={{
                  background: "rgba(255,255,255,0.25)",
                  color: "#ffffff",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  fontSize: `${11 * fontScale}px`,
                  fontWeight: "bold",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                ⏱️ {timerInfo.formatted}
              </span>
            )}
          </div>
        </div>

        <div style={{ padding: "16px", flex: 1 }}>
          {displayItems.length > 0 ? (
            displayItems.map((item, i) => {
              const itemName = item && item.name ? item.name : "Producto";
              const itemQty = item && item.quantity ? item.quantity : 1;
              const customizationText =
                item.customization || item.customNote || "";

              return (
                <div
                  key={i}
                  style={{
                    paddingBottom: "12px",
                    marginBottom: "12px",
                    borderBottom:
                      i === displayItems.length - 1
                        ? "none"
                        : "1px dashed #e5e7eb",
                  }}
                >
                  <div
                    style={{
                      fontWeight: "700",
                      fontSize: `${16 * fontScale}px`,
                      color: "#111827",
                    }}
                  >
                    {itemQty} x {itemName}
                  </div>
                  {customizationText && (
                    <div
                      style={{
                        fontSize: `${13 * fontScale}px`,
                        marginTop: "4px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px", // Un poco de espacio entre las notas
                      }}
                    >
                      {/* Dividimos el texto por el separador ' | ' para evaluar cada nota individualmente */}
                      {customizationText.split(" | ").map((part, idx) => {
                        let partColor = "#4b5563"; // Gris oscuro por defecto
                        let borderColor = "#cbd5e1"; // Gris claro para el borde

                        const lowerPart = part.toLowerCase();

                        // Lógica de colores según el contenido
                        if (lowerPart.includes("con todo")) {
                          partColor = "#16a34a"; // Verde
                          borderColor = "#16a34a";
                        } else if (lowerPart.includes("extra:")) {
                          partColor = "#2563eb"; // Azul
                          borderColor = "#2563eb";
                        } else if (lowerPart.includes("sin ") || lowerPart.includes("nota:")) {
                          partColor = "#dc2626"; // Rojo
                          borderColor = "#dc2626";
                        } else if (lowerPart.includes("para llevar")) {
                          partColor = "#d97706"; // Naranja para empaques
                          borderColor = "#f59e0b";
                        }

                        return (
                          <div
                            key={idx}
                            style={{
                              color: partColor,
                              paddingLeft: "8px",
                              borderLeft: `3px solid ${borderColor}`,
                              display: "flex",
                              alignItems: "flex-start",
                            }}
                          >
                            <span style={{ fontWeight: "900", letterSpacing: "0.2px" }}>
                              • {part}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <p
              style={{
                textAlign: "center",
                color: "#9ca3af",
                fontStyle: "italic",
                margin: 0,
                fontSize: `${14 * fontScale}px`,
              }}
            >
              Todo despachado por esta estación
            </p>
          )}
        </div>

        <div style={{ display: "flex", borderTop: "1px solid #e5e7eb" }}>
          {!stationIsPreparing && !stationIsReady && !isWebUnpaid && (
            <button
              onClick={async (e) => {
                e.currentTarget.blur();
                const nowIso = new Date().toISOString();
                const updatedPd = { ...(order.payment_details || {}) };
                if (!updatedPd.prep_started_at)
                  updatedPd.prep_started_at = nowIso;

                const updatedItems = getItems(order).map((item) => {
                  const c = item.category ? item.category.trim() : "General";
                  const belongsToStation =
                    targetCats.length === 0 || targetCats.includes(c);
                  
                  if (belongsToStation && !item.dispatched) return { ...item, preparing: true };
                  
                  return item;
                });

                const isAnyItemPreparing = updatedItems.some(
                  (i) => i.preparing
                );
                const newStatus =
                  isAnyItemPreparing && currentStatus === "pending"
                    ? "preparando"
                    : order.status;

                if (typeof setSales === "function") {
                  setSales(
                    sales.map((s) =>
                      s.id === order.id
                        ? { ...s, status: newStatus, payment_details: updatedPd, items: updatedItems }
                        : s
                    )
                  );
                }
                try {
                  await supabase.from("sales").update({ status: newStatus, payment_details: updatedPd, items: updatedItems }).eq("id", order.id).eq("store_id", currentStoreId);
                } catch (err) { console.error(err); }
              }}
              style={{ flex: 1, background: "#fff", color: "#111827", border: "none", padding: "14px", cursor: "pointer", fontWeight: "bold", fontSize: "13px", textTransform: "uppercase" }}
            >
              Preparar
            </button>
          )}

          {!stationIsReady && !isWebUnpaid && (
            <button
              onClick={async (e) => {
                e.currentTarget.blur();
                const nowIso = new Date().toISOString();
                const updatedPd = { ...(order.payment_details || {}) };

                const updatedItems = getItems(order).map((item) => {
                  const c = item.category ? item.category.trim() : "General";
                  const belongsToStation = targetCats.length === 0 || targetCats.includes(c);
                  if (belongsToStation) return { ...item, dispatched: true };
                  return item;
                });

                const allKitchenItems = updatedItems.filter((item) => {
                  const name = String(item.name || "").toLowerCase();
                  return !GENERAL_KEYWORDS.some((gk) => name.includes(gk));
                });

                const allDispatched = allKitchenItems.length > 0 && allKitchenItems.every((i) => i.dispatched);
                const newStatus = allDispatched ? "ready" : order.status;
                if (allDispatched && !updatedPd.prep_finished_at) {
                  updatedPd.prep_finished_at = nowIso;
                }

                if (typeof setSales === "function") {
                  setSales(
                    sales.map((s) =>
                      s.id === order.id
                        ? { ...s, status: newStatus, payment_details: updatedPd, items: updatedItems }
                        : s
                    )
                  );
                }
                try {
                  await supabase.from("sales").update({ status: newStatus, payment_details: updatedPd, items: updatedItems }).eq("id", order.id).eq("store_id", currentStoreId);
                } catch (err) { console.error(err); }
              }}
              style={{ flex: 1, background: stationIsPreparing ? "#16a34a" : "#f9fafb", color: stationIsPreparing ? "#fff" : "#4b5563", border: "none", borderLeft: stationIsPreparing ? "none" : "1px solid #e5e7eb", padding: "14px", cursor: "pointer", fontWeight: "bold", fontSize: "13px", textTransform: "uppercase" }}
            >
              Despachar
            </button>
          )}

          {stationIsReady && !globalIsReady && !isWebUnpaid && (
            <div style={{ width: "100%", textAlign: "center", padding: "14px", background: "#16a34a", color: "#fff", fontSize: "13px", fontWeight: "bold", textTransform: "uppercase" }}>
              ✓ Estación Lista (Esperando Otras)
            </div>
          )}

          {stationIsReady && globalIsReady && !isWebUnpaid && (
            <div style={{ width: "100%", textAlign: "center", padding: "14px", background: "#16a34a", color: "#fff", fontSize: "13px", fontWeight: "bold", textTransform: "uppercase" }}>
              ✓ Esperando Entrega al Cliente
            </div>
          )}
        </div>
      </div>
    );
  };

  // VISTA PÚBLICA
  if (isPublicMode) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 99999,
          background: "#0a0f1d",
          width: "100vw",
          height: "100vh",
          overflow: "hidden",
        }}
      >
        <button
          onClick={async () => {
            if (document.fullscreenElement && document.exitFullscreen)
              await document.exitFullscreen().catch(() => {});
            setIsPublicMode(false);
          }}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            zIndex: 999999,
            background: "rgba(0,0,0,0.6)",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: "50%",
            width: "40px",
            height: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <X size={20} />
        </button>

        {/* REPRODUCTOR OCULTO DE MODO RADIO (Audio fluido, 0 consumo gráfico en Pantalla Pública) */}
        {isRadioMode && videoId && (
          <iframe
            style={{
              width: "1px",
              height: "1px",
              position: "absolute",
              opacity: 0,
              pointerEvents: "none",
            }}
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&controls=0&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1&playsinline=1${
              listId ? `&list=${listId}` : ""
            }`}
            allow="autoplay; encrypted-media"
          />
        )}

        {activeBanners.map((banner, idx) => {
          const isCurrent = displayMode === "banner" && idx === currentSlide;
          if (banner.type === "youtube") {
            const showAsBackgroundInBoard = displayMode === "board";
            return (
              <div
                key={idx}
                style={{
                  position: "absolute",
                  inset: 0,
                  opacity: isCurrent ? 1 : showAsBackgroundInBoard ? 0.3 : 0,
                  transition: "opacity 1.2s ease-in-out",
                  zIndex: isCurrent || showAsBackgroundInBoard ? 5 : 1,
                  filter: readyPopup ? "brightness(0.2) blur(6px)" : "none",
                  pointerEvents: "none",
                  background: "#000",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                <iframe
                  style={{
                    width: "960px",
                    height: "540px",
                    transform: "scale(2.2)",
                    border: "none",
                    pointerEvents: "none",
                  }}
                  src={`https://www.youtube.com/embed/${banner.videoId}?autoplay=1&mute=0&controls=0&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1&playsinline=1${
                    banner.listId ? `&list=${banner.listId}` : ""
                  }`}
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                />
              </div>
            );
          }
          const imgUrl = typeof banner === "string" ? banner : banner?.url;
          return (
            <div
              key={idx}
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage: `url(${imgUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                opacity: isCurrent ? 1 : 0,
                transition: "opacity 1.2s ease-in-out",
                zIndex: isCurrent ? 5 : 1,
                filter: readyPopup
                  ? "brightness(0.2) blur(6px)"
                  : "brightness(0.95)",
                pointerEvents: "none",
              }}
            />
          );
        })}

        <div
          style={{
            position: "absolute",
            inset: 0,
            padding: "32px",
            boxSizing: "border-box",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "24px",
            background: videoId
              ? "linear-gradient(135deg, rgba(15,23,42,0.85) 0%, rgba(30,41,59,0.85) 100%)"
              : "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
            opacity: displayMode === "board" ? 1 : 0,
            transition: "opacity 0.8s ease-in-out",
            zIndex: displayMode === "board" ? 10 : 0,
            filter: readyPopup ? "brightness(0.2) blur(6px)" : "none",
            pointerEvents: displayMode === "board" ? "auto" : "none",
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              borderRadius: "16px",
              border: "1px solid rgba(255,255,255,0.1)",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              backdropFilter: videoId ? "blur(8px)" : "none",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "20px",
                borderBottom: "1px solid rgba(255,255,255,0.1)",
                paddingBottom: "12px",
              }}
            >
              <ChefHat size={28} color="#f59e0b" />
              <h2
                style={{
                  margin: 0,
                  color: "#f59e0b",
                  fontSize: "24px",
                  fontWeight: "900",
                  letterSpacing: "1px",
                }}
              >
                EN PREPARACIÓN
              </h2>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
                gap: "14px",
                overflowY: "auto",
              }}
            >
              {preparingOrders.length === 0 ? (
                <span
                  style={{
                    color: "#64748b",
                    fontSize: "16px",
                    fontStyle: "italic",
                  }}
                >
                  Sin pedidos en espera
                </span>
              ) : (
                preparingOrders.map((po) => {
                  const num =
                    po.invoice_number || `#${String(po.id).slice(-4)}`;
                  return (
                    <div
                      key={po.id}
                      style={{
                        background: "rgba(245, 158, 11, 0.12)",
                        border: "1px solid rgba(245, 158, 11, 0.25)",
                        borderRadius: "12px",
                        padding: "16px",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "28px",
                          fontWeight: "900",
                          color: "#f59e0b",
                        }}
                      >
                        {num}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#cbd5e1",
                          marginTop: "4px",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {po.client_name || "Cliente"}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              borderRadius: "16px",
              border: "2px solid #16a34a",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              backdropFilter: videoId ? "blur(8px)" : "none",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "20px",
                borderBottom: "1px solid rgba(255,255,255,0.1)",
                paddingBottom: "12px",
              }}
            >
              <CheckCircle size={28} color="#16a34a" />
              <h2
                style={{
                  margin: 0,
                  color: "#16a34a",
                  fontSize: "24px",
                  fontWeight: "900",
                  letterSpacing: "1px",
                }}
              >
                ¡LISTOS PARA RETIRAR!
              </h2>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                gap: "16px",
                overflowY: "auto",
              }}
            >
              {readyOrders.length === 0 ? (
                <span
                  style={{
                    color: "#64748b",
                    fontSize: "16px",
                    fontStyle: "italic",
                  }}
                >
                  Esperando salida de cocina...
                </span>
              ) : (
                readyOrders.map((ro) => {
                  const num =
                    ro.invoice_number || `#${String(ro.id).slice(-4)}`;
                  return (
                    <div
                      key={ro.id}
                      style={{
                        background: "#16a34a",
                        borderRadius: "12px",
                        padding: "20px",
                        textAlign: "center",
                        boxShadow: "0 8px 24px rgba(22, 163, 74, 0.4)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "36px",
                          fontWeight: "900",
                          color: "#ffffff",
                          letterSpacing: "-1px",
                        }}
                      >
                        {num}
                      </div>
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: "bold",
                          color: "#dcfce7",
                          marginTop: "4px",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {ro.client_name || "Cliente"}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            background: "rgba(15, 23, 42, 0.96)",
            borderTop: "2px solid #16a34a",
            padding: "14px 28px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            zIndex: 50,
            backdropFilter: "blur(10px)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span
              style={{
                fontSize: "13px",
                fontWeight: "900",
                color: "#16a34a",
                textTransform: "uppercase",
                letterSpacing: "1px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Bell size={18} /> Listos para retirar:
            </span>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {readyOrders.length === 0 ? (
                <span
                  style={{
                    color: "#94a3b8",
                    fontSize: "13px",
                    fontStyle: "italic",
                  }}
                >
                  Cocinando con amor...
                </span>
              ) : (
                readyOrders.map((ro) => (
                  <span
                    key={ro.id}
                    style={{
                      background: "#16a34a",
                      color: "#fff",
                      padding: "4px 12px",
                      borderRadius: "6px",
                      fontSize: "16px",
                      fontWeight: "900",
                    }}
                  >
                    {ro.invoice_number || `#${String(ro.id).slice(-4)}`}
                  </span>
                ))
              )}
            </div>
          </div>
          <span
            style={{ color: "#94a3b8", fontSize: "13px", fontWeight: "bold" }}
          >
            {currentStoreName || "Fiskal Restaurant"}
          </span>
        </div>

        {readyPopup && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 999999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0, 0, 0, 0.75)",
              backdropFilter: "blur(10px)",
              animation: "fadeIn 0.3s ease-out",
            }}
          >
            <div
              style={{
                background: "#ffffff",
                borderRadius: "28px",
                padding: "50px 70px",
                textAlign: "center",
                boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
                border: "5px solid #16a34a",
                maxWidth: "680px",
                width: "90%",
              }}
            >
              <div
                style={{
                  width: "90px",
                  height: "90px",
                  borderRadius: "50%",
                  background: "#dcfce7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 18px",
                  color: "#16a34a",
                }}
              >
                <CheckCircle size={54} />
              </div>
              <span
                style={{
                  fontSize: "15px",
                  fontWeight: "900",
                  color: "#16a34a",
                  textTransform: "uppercase",
                  letterSpacing: "2px",
                  display: "block",
                  marginBottom: "8px",
                }}
              >
                ¡Tu Pedido está Listo!
              </span>
              <h1
                style={{
                  fontSize: "84px",
                  fontWeight: "900",
                  color: "#111827",
                  margin: "0 0 8px 0",
                  letterSpacing: "-2px",
                  lineHeight: 1,
                }}
              >
                {readyPopup.orderNum}
              </h1>
              <div
                style={{
                  fontSize: "26px",
                  fontWeight: "800",
                  color: "#1f2937",
                  textTransform: "capitalize",
                  borderTop: "2px dashed #e5e7eb",
                  paddingTop: "16px",
                  marginTop: "12px",
                }}
              >
                👤 {readyPopup.clientName}
              </div>
              <p
                style={{
                  fontSize: "15px",
                  color: "#6b7280",
                  marginTop: "12px",
                  marginBottom: 0,
                }}
              >
                Por favor acércate a la barra para retirar
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // VISTA 2: MODO OPERATIVO
  return (
    <div
      id="kds-panel"
      style={{
        padding: "24px",
        background: "#f8f9fa",
        minHeight: "100vh",
        width: "100%",
        boxSizing: "border-box",
        overflowY: "auto",
        position: "relative",
        display: "flex",          
        flexDirection: "column",  
      }}
    >
      {/* ========================================================================================= */}
      {/* ESTILOS INYECTADOS EXCLUSIVOS PARA HACER LA CABECERA Y EL GRID RESPONSIVOS EN MÓVILES */}
      {/* ========================================================================================= */}
      <style>{`
        .kds-header-wrapper {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .kds-actions-group {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .kds-youtube-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #fff;
          padding: 6px 12px;
          border-radius: 6px;
          border: 1px solid #d1d5db;
          position: relative;
        }
        .kds-youtube-input {
          border: none;
          outline: none;
          font-size: 13px;
          width: 180px;
          background: transparent;
        }
        .kds-action-btn {
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: bold;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          border: none;
        }
        .settings-modal-card {
          background: #fff;
          width: 500px;
          max-width: 90%;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.2);
        }

        /* MEDIA QUERIES EXCLUSIVAMENTE PARA CELULARES */
        @media (max-width: 768px) {
          #kds-panel {
            padding: 12px !important; 
          }
          .kds-header-wrapper {
            flex-direction: column;
            align-items: stretch;
            margin-bottom: 16px;
          }
          .kds-actions-group {
            flex-direction: column;
            align-items: stretch;
            width: 100%;
          }
          .kds-youtube-bar {
            width: 100%;
            box-sizing: border-box;
          }
          .kds-youtube-input {
            width: 100%;
            flex: 1; /* Estira el campo de texto a lo que sobre de espacio */
          }
          .kds-action-btn {
            width: 100%;
            justify-content: center;
            box-sizing: border-box;
          }
          .kds-youtube-dropdown {
            width: 100% !important; /* El desplegable de Mis Listas ocupará todo el ancho en móvil */
            right: 0;
            left: 0;
          }
          .kds-grid-layout {
            grid-template-columns: 1fr !important; /* Fuerza una sola columna vertical hacia abajo */
            gap: 16px !important;
          }
          .settings-modal-card {
            padding: 16px;
            max-height: 95vh;
            overflow-y: auto;
          }
        }
      `}</style>

      {showSettingsModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100000,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div className="settings-modal-card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
                borderBottom: "1px solid #e5e7eb",
                paddingBottom: "12px",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <Settings size={20} /> Configurar Pantalla KDS
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#6b7280",
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  color: "#111827",
                  background: "#f8fafc",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <input
                  type="checkbox"
                  checked={kdsConfig.hideReady}
                  onChange={(e) =>
                    updateKdsConfig({
                      ...kdsConfig,
                      hideReady: e.target.checked,
                    })
                  }
                  style={{ width: "18px", height: "18px" }}
                />
                Ocultar comandas despachadas (Listas)
                <span
                  style={{
                    fontSize: "11px",
                    color: "#64748b",
                    fontWeight: "normal",
                    display: "block",
                  }}
                >
                  Desaparece la orden en cada estación apenas la completen.
                </span>
              </label>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  fontWeight: "bold",
                  color: "#111827",
                  display: "block",
                  marginBottom: "8px",
                }}
              >
                Diseño de Pantalla (Layout)
              </label>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button
                  onClick={() => updateKdsConfig({ ...kdsConfig, layout: "grid" })}
                  style={{
                    flex: 1,
                    minWidth: "100px",
                    padding: "10px",
                    borderRadius: "6px",
                    border:
                      kdsConfig.layout === "grid"
                        ? "2px solid #111827"
                        : "1px solid #cbd5e1",
                    background:
                      kdsConfig.layout === "grid" ? "#f8fafc" : "#fff",
                    cursor: "pointer",
                    fontWeight: "bold",
                    fontSize: "12px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <LayoutGrid
                    size={24}
                    color={kdsConfig.layout === "grid" ? "#111827" : "#94a3b8"}
                  />{" "}
                  Cuadrícula
                </button>
                <button
                  onClick={() =>
                    updateKdsConfig({ ...kdsConfig, layout: "2-col" })
                  }
                  style={{
                    flex: 1,
                    minWidth: "100px",
                    padding: "10px",
                    borderRadius: "6px",
                    border:
                      kdsConfig.layout === "2-col"
                        ? "2px solid #111827"
                        : "1px solid #cbd5e1",
                    background:
                      kdsConfig.layout === "2-col" ? "#f8fafc" : "#fff",
                    cursor: "pointer",
                    fontWeight: "bold",
                    fontSize: "12px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Columns
                    size={24}
                    color={kdsConfig.layout === "2-col" ? "#111827" : "#94a3b8"}
                  />{" "}
                  2 Estaciones
                </button>
                <button
                  onClick={() =>
                    updateKdsConfig({ ...kdsConfig, layout: "3-col" })
                  }
                  style={{
                    flex: 1,
                    minWidth: "100px",
                    padding: "10px",
                    borderRadius: "6px",
                    border:
                      kdsConfig.layout === "3-col"
                        ? "2px solid #111827"
                        : "1px solid #cbd5e1",
                    background:
                      kdsConfig.layout === "3-col" ? "#f8fafc" : "#fff",
                    cursor: "pointer",
                    fontWeight: "bold",
                    fontSize: "12px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Columns
                    size={24}
                    color={kdsConfig.layout === "3-col" ? "#111827" : "#94a3b8"}
                  />{" "}
                  3 Estaciones
                </button>
              </div>
            </div>

            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                padding: "12px",
                borderRadius: "8px",
                maxHeight: "250px",
                overflowY: "auto",
              }}
            >
              <p
                style={{
                  margin: "0 0 12px 0",
                  fontSize: "12px",
                  color: "#166534",
                  fontWeight: "bold",
                }}
              >
                Asignar Categorías a cada Estación (Si dejas vacío mostrará
                todo)
              </p>
              {[
                1,
                kdsConfig.layout === "grid" ? null : 2,
                kdsConfig.layout === "3-col" ? 3 : null,
              ]
                .filter(Boolean)
                .map((colNum) => {
                  const colKey = `col${colNum}Cats`;
                  const colorKey = `col${colNum}Color`;
                  
                  // Paleta de colores pasteles predefinida
                  const pastelColors = [
                    { name: "Sin Color", hex: "transparent" },
                    { name: "Azul Pastel", hex: "#e0f2fe" },
                    { name: "Verde Pastel", hex: "#dcfce7" },
                    { name: "Amarillo Pastel", hex: "#fef08a" },
                    { name: "Rojo Pastel", hex: "#fee2e2" },
                    { name: "Morado Pastel", hex: "#f3e8ff" },
                    { name: "Gris Suave", hex: "#f1f5f9" }
                  ];

                  return (
                    <div key={colNum} style={{ marginBottom: "20px", paddingBottom: "12px", borderBottom: "1px dashed #cbd5e1" }}>
                      <strong
                        style={{
                          fontSize: "13px",
                          display: "block",
                          marginBottom: "8px",
                          color: "#111827",
                        }}
                      >
                        {kdsConfig.layout === "grid"
                          ? "Configuración de este dispositivo"
                          : `Configuración Estación ${colNum}`}
                      </strong>
                      
                      {/* --- NUEVO: Selector de Color --- */}
                      {kdsConfig.layout !== "grid" && (
                        <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "bold" }}>Fondo:</span>
                          <div style={{ display: "flex", gap: "6px" }}>
                            {pastelColors.map(color => {
                              const isSelected = (kdsConfig[colorKey] === color.hex) || (!kdsConfig[colorKey] && color.hex === "transparent");
                              return (
                                <button
                                  key={color.hex}
                                  onClick={() => updateKdsConfig({ ...kdsConfig, [colorKey]: color.hex })}
                                  title={color.name}
                                  style={{
                                    width: "24px",
                                    height: "24px",
                                    borderRadius: "50%",
                                    background: color.hex === "transparent" ? "#fff" : color.hex,
                                    border: isSelected ? "2px solid #111827" : "1px solid #cbd5e1",
                                    position: "relative",
                                    cursor: "pointer",
                                    padding: 0,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                  }}
                                >
                                  {color.hex === "transparent" && <div style={{width: "100%", height: "1px", background:"#ef4444", transform:"rotate(45deg)", position:"absolute"}}></div>}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {availableCategories.map((cat) => {
                          const isActive = kdsConfig[colKey].includes(cat);
                          return (
                            <button
                              key={cat}
                              onClick={() => {
                                const newCats = isActive
                                  ? kdsConfig[colKey].filter((c) => c !== cat)
                                  : [...kdsConfig[colKey], cat];
                                updateKdsConfig({
                                  ...kdsConfig,
                                  [colKey]: newCats,
                                });
                              }}
                              style={{
                                padding: "4px 10px",
                                borderRadius: "12px",
                                fontSize: "11px",
                                cursor: "pointer",
                                fontWeight: "bold",
                                background: isActive ? "#16a34a" : "#fff",
                                color: isActive ? "#fff" : "#4b5563",
                                border: isActive
                                  ? "1px solid #16a34a"
                                  : "1px solid #cbd5e1",
                              }}
                            >
                              {cat}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
            <button
              onClick={() => setShowSettingsModal(false)}
              style={{
                width: "100%",
                padding: "12px",
                background: "#111827",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontWeight: "bold",
                marginTop: "20px",
                cursor: "pointer",
              }}
            >
              Cerrar y Aplicar
            </button>
          </div>
        </div>
      )}

      {!isFullscreen && (
        <div className="kds-header-wrapper">
          <div>
            <h2
              style={{
                margin: 0,
                color: "#111827",
                letterSpacing: "-0.5px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              Panel de Cocina (KDS)
              <button
                onClick={() => setShowSettingsModal(true)}
                style={{
                  background: "#e2e8f0",
                  border: "none",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  color: "#475569",
                  gap: "4px",
                  fontSize: "12px",
                  fontWeight: "bold",
                }}
              >
                <Settings size={16} /> Ajustes
              </button>
            </h2>
            <p
              style={{
                fontSize: "13px",
                color: "#6b7280",
                margin: "4px 0 0 0",
              }}
            >
              Gestión de comandas y tiempos de preparación en vivo
            </p>
          </div>

          <div className="kds-actions-group">
            <div className="kds-youtube-bar">
              <PlayCircle size={18} color="#dc2626" />
              <input
                type="text"
                placeholder="Pegar link de YouTube..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                className="kds-youtube-input"
              />
              <div
                style={{
                  height: "20px",
                  width: "1px",
                  background: "#e5e7eb",
                  margin: "0 4px",
                }}
              ></div>
              <button
                onClick={handleSaveLink}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                  color: "#16a34a",
                  display: "flex",
                  alignItems: "center",
                }}
                title="Guardar Lista"
              >
                <BookmarkPlus size={18} />
              </button>
              <button
                onClick={() => setShowSavedLinks(!showSavedLinks)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                  color: "#4b5563",
                  display: "flex",
                  alignItems: "center",
                }}
                title="Mis Listas"
              >
                <ListVideo size={18} />
              </button>

              {/* BOTÓN MODO RADIO */}
              <div
                style={{
                  height: "20px",
                  width: "1px",
                  background: "#e5e7eb",
                  margin: "0 4px",
                }}
              ></div>
              <button
                onClick={() => setIsRadioMode(!isRadioMode)}
                style={{
                  background: isRadioMode ? "#16a34a" : "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  color: isRadioMode ? "#fff" : "#4b5563",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontWeight: "bold",
                  fontSize: "12px",
                  transition: "all 0.2s",
                }}
                title="Modo Radio: Oculta el video para reproducir solo el audio (Ideal para Fire TV)"
              >
                <Headphones size={18} /> {isRadioMode && "Radio"}
              </button>

              {showSavedLinks && (
                <div
                  className="kds-youtube-dropdown"
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    marginTop: "8px",
                    width: "280px",
                    background: "#fff",
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
                    zIndex: 1000,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      background: "#f9fafb",
                      padding: "12px",
                      borderBottom: "1px solid #e5e7eb",
                      fontSize: "13px",
                      fontWeight: "bold",
                      color: "#111827",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>🎵 Mis Listas</span>
                    <button
                      onClick={() => setShowSavedLinks(false)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#9ca3af",
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div style={{ maxHeight: "250px", overflowY: "auto" }}>
                    {savedLinks.length === 0 ? (
                      <div
                        style={{
                          padding: "16px",
                          textAlign: "center",
                          color: "#6b7280",
                          fontSize: "13px",
                          fontStyle: "italic",
                        }}
                      >
                        No tienes listas guardadas aún.
                      </div>
                    ) : (
                      savedLinks.map((link, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "10px 12px",
                            borderBottom: "1px solid #f3f4f6",
                            cursor: "pointer",
                          }}
                          onClick={() => {
                            setYoutubeUrl(link.url);
                            setShowSavedLinks(false);
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              overflow: "hidden",
                              flex: 1,
                              paddingRight: "8px",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "13px",
                                fontWeight: "bold",
                                color: "#374151",
                                whiteSpace: "nowrap",
                                textOverflow: "ellipsis",
                                overflow: "hidden",
                              }}
                            >
                              {link.label}
                            </span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteLink(idx);
                            }}
                            style={{
                              background: "#fee2e2",
                              border: "none",
                              color: "#ef4444",
                              cursor: "pointer",
                              padding: "6px",
                              borderRadius: "4px",
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              className="kds-action-btn"
              onClick={() => {
                setIsPublicMode(true);
                const panel = document.getElementById("kds-panel");
                if (panel && panel.requestFullscreen) {
                  panel.requestFullscreen().catch((e) => console.log(e));
                }
              }}
              style={{
                background: "#16a34a",
                color: "#fff",
                boxShadow: "0 2px 6px rgba(22, 163, 74, 0.3)",
              }}
            >
              <Monitor size={16} /> 📺 Pantalla Clientes (Público)
            </button>

            <button
              className="kds-action-btn"
              onClick={() => {
                const panel = document.getElementById("kds-panel");
                if (!document.fullscreenElement) {
                  if (panel && panel.requestFullscreen) {
                    panel.requestFullscreen();
                  }
                } else {
                  if (document.exitFullscreen) document.exitFullscreen();
                }
              }}
              style={{ background: "#111827", color: "#fff" }}
            >
              <Maximize2 size={16} /> Pantalla Completa Cocina
            </button>

            <span
              style={{
                background: "#f3f4f6",
                color: "#16a34a",
                border: "1px solid #d1fae5",
                padding: "8px 14px",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  background: "#16a34a",
                  borderRadius: "50%",
                  display: "inline-block",
                }}
              ></span>{" "}
              En Vivo
            </span>
          </div>
        </div>
      )}

      {/* Botones de Zoom: Solo visibles en Pantalla Completa (Cocina) */}
      {isFullscreen && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            zIndex: 1000,
          }}
        >
          <button
            onClick={zoomIn}
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "#111827",
              color: "#fff",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            }}
          >
            <ZoomIn size={24} />
          </button>
          <button
            onClick={zoomOut}
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "#fff",
              color: "#111827",
              border: "2px solid #111827",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
          >
            <ZoomOut size={24} />
          </button>
        </div>
      )}

      {(() => {
        const ordersToRender = kdsConfig.hideReady
          ? waitingOrders.filter(
              (o) =>
                !["ready", "listo", "espera_pago"].includes(
                  String(o.status || "").toLowerCase()
                )
            )
          : waitingOrders;

        if (ordersToRender.length === 0 && (!kdsConfig.layout || kdsConfig.layout === "grid")) {
          return (
            <div
              style={{
                textAlign: "center",
                padding: "60px",
                background: "#fff",
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
                flex: 1, // <-- Ocupa todo el espacio
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <p style={{ color: "#6b7280", fontSize: "15px", margin: 0 }}>
                No hay comandas pendientes en este momento.
              </p>
            </div>
          );
        }

        if (kdsConfig.layout === "2-col") {
          return (
            <div
              className="kds-grid-layout"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "24px",
                flex: 1, // <-- CLAVE: Rellena el 100% de la pantalla hacia abajo
              }}
            >
              {/* ESTACIÓN 1 */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  background: kdsConfig.col1Color || "transparent",
                  padding: kdsConfig.col1Color && kdsConfig.col1Color !== "transparent" ? "16px" : "0",
                  borderRadius: "16px",
                }}
              >
                <h3
                  style={{
                    background: "#e2e8f0",
                    padding: "12px",
                    borderRadius: "8px",
                    margin: 0,
                    textAlign: "center",
                    color: "#334155",
                    fontSize: "14px",
                    textTransform: "uppercase",
                  }}
                >
                  Estación 1{" "}
                  {kdsConfig.col1Cats.length > 0
                    ? `(${kdsConfig.col1Cats.length} cat.)`
                    : "(Todas)"}
                </h3>
                {ordersToRender.map((o, idx) =>
                  renderOrderCard(o, idx, kdsConfig.col1Cats)
                )}
                {ordersToRender.length === 0 && (
                  <div style={{textAlign: "center", color: "#64748b", marginTop: "40px", fontSize: "13px", fontWeight: "bold"}}>
                    Estación despejada ✓
                  </div>
                )}
              </div>
              
              {/* ESTACIÓN 2 */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  background: kdsConfig.col2Color || "transparent",
                  padding: kdsConfig.col2Color && kdsConfig.col2Color !== "transparent" ? "16px" : "0",
                  borderRadius: "16px",
                }}
              >
                <h3
                  style={{
                    background: "#e2e8f0",
                    padding: "12px",
                    borderRadius: "8px",
                    margin: 0,
                    textAlign: "center",
                    color: "#334155",
                    fontSize: "14px",
                    textTransform: "uppercase",
                  }}
                >
                  Estación 2{" "}
                  {kdsConfig.col2Cats.length > 0
                    ? `(${kdsConfig.col2Cats.length} cat.)`
                    : "(Todas)"}
                </h3>
                {ordersToRender.map((o, idx) =>
                  renderOrderCard(o, idx, kdsConfig.col2Cats)
                )}
                {ordersToRender.length === 0 && (
                  <div style={{textAlign: "center", color: "#64748b", marginTop: "40px", fontSize: "13px", fontWeight: "bold"}}>
                    Estación despejada ✓
                  </div>
                )}
              </div>
            </div>
          );
        }

        if (kdsConfig.layout === "3-col") {
          return (
            <div
              className="kds-grid-layout"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "16px",
                flex: 1, // <-- CLAVE: Rellena el 100% de la pantalla hacia abajo
              }}
            >
              {/* ESTACIÓN 1 */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  background: kdsConfig.col1Color || "transparent",
                  padding: kdsConfig.col1Color && kdsConfig.col1Color !== "transparent" ? "12px" : "0",
                  borderRadius: "16px",
                }}
              >
                <h3
                  style={{
                    background: "#e2e8f0",
                    padding: "12px",
                    borderRadius: "8px",
                    margin: 0,
                    textAlign: "center",
                    color: "#334155",
                    fontSize: "13px",
                    textTransform: "uppercase",
                  }}
                >
                  Estación 1{" "}
                  {kdsConfig.col1Cats.length > 0
                    ? `(${kdsConfig.col1Cats.length} cat.)`
                    : "(Todas)"}
                </h3>
                {ordersToRender.map((o, idx) =>
                  renderOrderCard(o, idx, kdsConfig.col1Cats)
                )}
                {ordersToRender.length === 0 && (
                  <div style={{textAlign: "center", color: "#64748b", marginTop: "30px", fontSize: "12px", fontWeight: "bold"}}>
                    Estación despejada ✓
                  </div>
                )}
              </div>
              
              {/* ESTACIÓN 2 */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  background: kdsConfig.col2Color || "transparent",
                  padding: kdsConfig.col2Color && kdsConfig.col2Color !== "transparent" ? "12px" : "0",
                  borderRadius: "16px",
                }}
              >
                <h3
                  style={{
                    background: "#e2e8f0",
                    padding: "12px",
                    borderRadius: "8px",
                    margin: 0,
                    textAlign: "center",
                    color: "#334155",
                    fontSize: "13px",
                    textTransform: "uppercase",
                  }}
                >
                  Estación 2{" "}
                  {kdsConfig.col2Cats.length > 0
                    ? `(${kdsConfig.col2Cats.length} cat.)`
                    : "(Todas)"}
                </h3>
                {ordersToRender.map((o, idx) =>
                  renderOrderCard(o, idx, kdsConfig.col2Cats)
                )}
                {ordersToRender.length === 0 && (
                  <div style={{textAlign: "center", color: "#64748b", marginTop: "30px", fontSize: "12px", fontWeight: "bold"}}>
                    Estación despejada ✓
                  </div>
                )}
              </div>

              {/* ESTACIÓN 3 */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  background: kdsConfig.col3Color || "transparent",
                  padding: kdsConfig.col3Color && kdsConfig.col3Color !== "transparent" ? "12px" : "0",
                  borderRadius: "16px",
                }}
              >
                <h3
                  style={{
                    background: "#e2e8f0",
                    padding: "12px",
                    borderRadius: "8px",
                    margin: 0,
                    textAlign: "center",
                    color: "#334155",
                    fontSize: "13px",
                    textTransform: "uppercase",
                  }}
                >
                  Estación 3{" "}
                  {kdsConfig.col3Cats.length > 0
                    ? `(${kdsConfig.col3Cats.length} cat.)`
                    : "(Todas)"}
                </h3>
                {ordersToRender.map((o, idx) =>
                  renderOrderCard(o, idx, kdsConfig.col3Cats)
                )}
                {ordersToRender.length === 0 && (
                  <div style={{textAlign: "center", color: "#64748b", marginTop: "30px", fontSize: "12px", fontWeight: "bold"}}>
                    Estación despejada ✓
                  </div>
                )}
              </div>
            </div>
          );
        }

        // Diseño en Cuadrícula (Por defecto)
        return (
          <div
            className="kds-grid-layout"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "20px",
              flex: 1,
              alignItems: "flex-start",   
              alignContent: "flex-start",
            }}
          >
            {ordersToRender.map((o, idx) =>
              renderOrderCard(o, idx, kdsConfig.col1Cats)
            )}
          </div>
        );
      })()}
    </div>
  );
}