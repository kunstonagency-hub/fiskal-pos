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
} from "lucide-react";

// Dashboard de cocina y pantalla pública.
// Este componente muestra el panel operativo de cocina, controla el flujo de pedidos y
// también ofrece la vista para clientes con banners, videos y tablero de pedidos listos.
const GENERAL_KEYWORDS = [
  "toddy",
  "harina",
  "azucar",
  "galletas",
  "citrato",
  "disco duro",
  "cronch",
  "palitos",
  "pepsi",
  "coca cola",
  "refresco",
  "agua",
  "cerveza",
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

  // Rotación: 'banner' (fotos publicitarias o video de YouTube) | 'board' (tablero general de pedidos)
  const [displayMode, setDisplayMode] = useState("banner");
  const [currentSlide, setCurrentSlide] = useState(0);

  // Estados para el tamaño de las letras (Zoom), YouTube, y Pantalla Completa
  const [fontScale, setFontScale] = useState(1);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // NUEVOS ESTADOS: Listas guardadas de YouTube
  const [savedLinks, setSavedLinks] = useState([]);
  const [showSavedLinks, setShowSavedLinks] = useState(false);

  // Cargar las listas de YouTube guardadas desde la base de datos al iniciar
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

  // Funciones para Guardar y Eliminar Listas
  const handleSaveLink = async () => {
    if (!youtubeUrl.trim()) {
      alert("Primero pega un enlace de YouTube para poder guardarlo.");
      return;
    }
    const label = window.prompt(
      "Dale un nombre a esta lista o video (Ej: Rock Clásico, Electrónica, etc.):",
      "Nueva Lista",
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
        { onConflict: "key" },
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
        { onConflict: "key" },
      );
    } catch (error) {
      console.error("Error eliminando enlace:", error);
    }
  };

  // Sincronizar salida de pantalla completa con el cierre automático del modo público
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

  // Reloj de un segundo para que los cronómetros de cocina corran en vivo
  const [, setTicker] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTicker((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Alerta gigante central de 10 segundos en pantalla pública
  const [readyPopup, setReadyPopup] = useState(null);
  const prevReadyIdsRef = useRef(new Set());
  const isFirstLoadRef = useRef(true);
  const popupTimeoutRef = useRef(null);

  // Extractor avanzado de YouTube (Soporta videos individuales y Mixes/Playlists completos)
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

  // Banners activos optimizados con useMemo
  const activeBanners = useMemo(() => {
    const base =
      kdsBanners && kdsBanners.length > 0 ? kdsBanners : FALLBACK_BANNERS;
    return videoId
      ? [...base, { type: "youtube", videoId, listId, title: "YouTube Video" }]
      : base;
  }, [kdsBanners, videoId, listId]);

  // =========================================================================
  // 1. ROTACIÓN DINÁMICA: DIAPOSITIVAS (5s IMAGEN / 10s YOUTUBE) Y TABLERO (7s)
  // =========================================================================
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

  // =========================================================================
  // 2. DETECCIÓN AUTOMÁTICA DE PEDIDOS LISTOS (ALERTA DE 10 SEGUNDOS)
  // =========================================================================
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
      (o) => !prevReadyIdsRef.current.has(o.id),
    );

    if (newlyReady) {
      prevReadyIdsRef.current.add(newlyReady.id);
      const orderIdStr = String(newlyReady.id);
      const orderNum = newlyReady.invoice_number || `#${orderIdStr.slice(-4)}`;
      const clientName = newlyReady.client_name || "Cliente";

      try {
        const bell = new Audio(
          "https://upload.wikimedia.org/wikipedia/commons/3/34/Sound_Effect_-_Door_Bell.ogg",
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

  // Ordenar los pedidos
  waitingOrders.sort((a, b) => {
    const timeA = new Date(
      a.payment_details?.kitchen_sent_at || a.created_at,
    ).getTime();
    const timeB = new Date(
      b.payment_details?.kitchen_sent_at || b.created_at,
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

  // =========================================================================
  // 3. CÁLCULO DEL CRONÓMETRO DE PREPARACIÓN
  // =========================================================================
  const getTimerInfo = (order) => {
    const pd = order.payment_details || {};
    const startTime = pd.prep_started_at
      ? new Date(pd.prep_started_at).getTime()
      : null;

    if (!startTime) return null;

    const isReady = ["ready", "listo", "espera_pago"].includes(
      String(order.status || "").toLowerCase(),
    );
    const endTime =
      isReady && pd.prep_finished_at
        ? new Date(pd.prep_finished_at).getTime()
        : Date.now();

    const diffSec = Math.max(0, Math.floor((endTime - startTime) / 1000));
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    const formatted = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

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

  // =========================================================================
  // VISTA 1: MODO PÚBLICO (PANTALLA SALÓN)
  // =========================================================================
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
        {/* BOTÓN FLOTANTE DE SALIDA (PARA SMART TV O TOUCH) */}
        <button
          onClick={async () => {
            if (document.fullscreenElement && document.exitFullscreen) {
              await document.exitFullscreen().catch(() => {});
            }
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
          title="Salir de Pantalla Clientes"
        >
          <X size={20} />
        </button>

        {/* FASE A: DIAPOSITIVAS (IMÁGENES Y VIDEO/MIX DE YOUTUBE INTERCALADOS CON TRANSPARENCIA) */}
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
                }}
              >
                <iframe
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100vw",
                    height: "100vh",
                    border: "none",
                    pointerEvents: "none",
                  }}
                  src={`https://www.youtube.com/embed/${banner.videoId}?autoplay=1&mute=0&controls=0${banner.listId ? `&list=${banner.listId}` : ""}`}
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

        {/* FASE B: TABLERO DE PEDIDOS CON TRANSPARENCIA Y EFECTO DIFUMINADO */}
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
          {/* Columna 1: En Preparación */}
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

          {/* Columna 2: Listos para Entregar */}
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

        {/* BARRA PERMANENTE INFERIOR */}
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
                readyOrders.map((ro) => {
                  const num =
                    ro.invoice_number || `#${String(ro.id).slice(-4)}`;
                  return (
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
                      {num}
                    </span>
                  );
                })
              )}
            </div>
          </div>
          <span
            style={{ color: "#94a3b8", fontSize: "13px", fontWeight: "bold" }}
          >
            {currentStoreName || "Fiskal Restaurant"}
          </span>
        </div>

        {/* ALERTA GIGANTE CENTRAL */}
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

  // =========================================================================
  // VISTA 2: MODO OPERATIVO DE COCINA (CON CRONÓMETROS Y ZOOM)
  // =========================================================================
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
      }}
    >
      {/* ENCABEZADO: Se oculta automáticamente al activar Pantalla Completa */}
      {!isFullscreen && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <h2
              style={{ margin: 0, color: "#111827", letterSpacing: "-0.5px" }}
            >
              Panel de Cocina (KDS)
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

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            {/* INPUT PARA YOUTUBE Y MIS LISTAS GUARDADAS */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "#fff",
                padding: "6px 12px",
                borderRadius: "6px",
                border: "1px solid #d1d5db",
                marginRight: "8px",
                position: "relative",
              }}
            >
              <PlayCircle size={18} color="#dc2626" />
              <input
                type="text"
                placeholder="Pegar link de YouTube o Mix..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                style={{
                  border: "none",
                  outline: "none",
                  fontSize: "13px",
                  width: "180px",
                  background: "transparent",
                }}
                title="Coloca el link de YouTube aquí para agregarlo como diapositiva con música en la Pantalla de Clientes"
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
                title="Guardar lista actual"
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
                title="Ver mis listas guardadas"
              >
                <ListVideo size={18} />
              </button>

              {/* DROPDOWN DE LISTAS GUARDADAS */}
              {showSavedLinks && (
                <div
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
                    <span>🎵 Mis Listas Guardadas</span>
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
                            transition: "background 0.2s",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = "#f9fafb")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "transparent")
                          }
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
                            <span
                              style={{
                                fontSize: "10px",
                                color: "#9ca3af",
                                whiteSpace: "nowrap",
                                textOverflow: "ellipsis",
                                overflow: "hidden",
                              }}
                            >
                              {link.url}
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
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                            title="Eliminar lista"
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
                border: "none",
                padding: "8px 16px",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: "bold",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 2px 6px rgba(22, 163, 74, 0.3)",
              }}
            >
              <Monitor size={16} /> 📺 Pantalla Clientes (Público)
            </button>

            <button
              onClick={() => {
                const panel = document.getElementById("kds-panel");
                if (!document.fullscreenElement) {
                  if (panel && panel.requestFullscreen) {
                    panel
                      .requestFullscreen()
                      .catch((err) => console.error("Error fullscreen:", err));
                  }
                } else {
                  if (document.exitFullscreen) document.exitFullscreen();
                }
              }}
              style={{
                background: "#111827",
                color: "#fff",
                border: "none",
                padding: "8px 16px",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: "bold",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
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

      {/* CONTROLES FLOTANTES DE ZOOM (ESQUINA INFERIOR DERECHA - PERMANECEN EN PANTALLA COMPLETA) */}
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
          title="Agrandar Letras"
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
          title="Achicar Letras"
        >
          <ZoomOut size={24} />
        </button>
      </div>

      {waitingOrders.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px",
            background: "#fff",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
          }}
        >
          <p style={{ color: "#6b7280", fontSize: "15px", margin: 0 }}>
            No hay comandas pendientes en este momento.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "20px",
            paddingBottom: "80px",
          }}
        >
          {waitingOrders.map((order, index) => {
            const orderId =
              order && order.id ? order.id.toString() : String(index + 1);

            const itemsList = getItems(order).filter((item) => {
              const name = String(item.name || "").toLowerCase();
              return !GENERAL_KEYWORDS.some((gk) => name.includes(gk));
            });
            const displayItems = itemsList.filter((item) => !item.dispatched);

            if (
              displayItems.length === 0 &&
              !["ready", "listo", "espera_pago"].includes(
                String(order.status || "").toLowerCase(),
              )
            ) {
              return null;
            }

            const currentStatus = String(
              order.status || order.estatus || "pending",
            )
              .trim()
              .toLowerCase();
            const isPreparing =
              currentStatus === "preparando" ||
              currentStatus === "en preparación";
            const isReady =
              currentStatus === "ready" ||
              currentStatus === "listo" ||
              currentStatus === "espera_pago";

            const timerInfo = getTimerInfo(order);

            let headerBg = "#e05d5d"; // Rojo pastel
            let headerColor = "#fff";
            let borderColor = "#e5e7eb";
            let statusText = "PENDIENTE";

            if (isPreparing) {
              headerBg = "#f59e0b";
              headerColor = "#111827";
              statusText = "PREPARANDO";
            } else if (isReady) {
              headerBg = "#16a34a";
              headerColor = "#fff";
              statusText = "LISTO PARA ENTREGAR";
            }

            const timeStr = order.created_at
              ? new Date(order.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "--:--";

            return (
              <div
                key={orderId}
                style={{
                  background: "#fff",
                  borderRadius: "8px",
                  border: `1px solid ${borderColor}`,
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                }}
              >
                <div
                  style={{
                    background: headerBg,
                    color: headerColor,
                    padding: "14px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px",
                    }}
                  >
                    <strong
                      style={{ fontSize: `${18 * fontScale}px`, lineHeight: 1 }}
                    >
                      #{order.invoice_number || orderId.slice(-4)}
                    </strong>
                    <span
                      style={{ fontSize: `${11 * fontScale}px`, opacity: 0.9 }}
                    >
                      {timeStr} | {order.client_name || "Cliente"}
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

                    {timerInfo && isPreparing && (
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

                    {timerInfo && isReady && (
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
                      const itemName =
                        item && item.name ? item.name : "Producto";
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
                                color: customizationText.includes("+")
                                  ? "#16a34a"
                                  : "#e05d5d",
                                marginTop: "4px",
                                display: "flex",
                                flexDirection: "column",
                                gap: "2px",
                                paddingLeft: "8px",
                                borderLeft: `2px solid ${customizationText.includes("+") ? "#16a34a" : "#e05d5d"}`,
                              }}
                            >
                              <span style={{ fontWeight: "bold" }}>
                                • {customizationText}
                              </span>
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
                      Todo despachado
                    </p>
                  )}
                </div>

                <div
                  style={{ display: "flex", borderTop: "1px solid #e5e7eb" }}
                >
                  {!isPreparing && !isReady && (
                    <button
                      onClick={async (e) => {
                        e.currentTarget.blur();
                        const nowIso = new Date().toISOString();
                        const updatedPd = {
                          ...(order.payment_details || {}),
                          prep_started_at: nowIso,
                        };

                        if (typeof setSales === "function") {
                          setSales(
                            sales.map((s) =>
                              s.id === order.id
                                ? {
                                    ...s,
                                    status: "preparando",
                                    payment_details: updatedPd,
                                  }
                                : s,
                            ),
                          );
                        }
                        try {
                          await supabase
                            .from("sales")
                            .update({
                              status: "preparando",
                              payment_details: updatedPd,
                            })
                            .eq("id", order.id)
                            .eq("store_id", currentStoreId);
                        } catch (err) {
                          console.error("Error estatus:", err);
                        }
                      }}
                      style={{
                        flex: 1,
                        background: "#fff",
                        color: "#111827",
                        border: "none",
                        padding: "14px",
                        cursor: "pointer",
                        fontWeight: "bold",
                        fontSize: "13px",
                        textTransform: "uppercase",
                      }}
                    >
                      Preparar (Iniciar)
                    </button>
                  )}

                  {!isReady && (
                    <button
                      onClick={async (e) => {
                        e.currentTarget.blur();
                        const nowIso = new Date().toISOString();
                        const updatedPd = {
                          ...(order.payment_details || {}),
                          prep_finished_at: nowIso,
                        };

                        const updatedItems = getItems(order).map((item) => ({
                          ...item,
                          dispatched: true,
                        }));

                        if (typeof setSales === "function") {
                          setSales(
                            sales.map((s) =>
                              s.id === order.id
                                ? {
                                    ...s,
                                    status: "ready",
                                    payment_details: updatedPd,
                                    items: updatedItems,
                                  }
                                : s,
                            ),
                          );
                        }
                        try {
                          await supabase
                            .from("sales")
                            .update({
                              status: "ready",
                              payment_details: updatedPd,
                              items: updatedItems,
                            })
                            .eq("id", order.id)
                            .eq("store_id", currentStoreId);
                        } catch (err) {
                          console.error("Error estatus:", err);
                        }
                      }}
                      style={{
                        flex: 1,
                        background: isPreparing ? "#16a34a" : "#f9fafb",
                        color: isPreparing ? "#fff" : "#4b5563",
                        border: "none",
                        borderLeft: isPreparing ? "none" : "1px solid #e5e7eb",
                        padding: "14px",
                        cursor: "pointer",
                        fontWeight: "bold",
                        fontSize: "13px",
                        textTransform: "uppercase",
                      }}
                    >
                      Despachar (Listo)
                    </button>
                  )}

                  {isReady && (
                    <div
                      style={{
                        width: "100%",
                        textAlign: "center",
                        padding: "14px",
                        background: "#16a34a",
                        color: "#fff",
                        fontSize: "13px",
                        fontWeight: "bold",
                        textTransform: "uppercase",
                      }}
                    >
                      ✓ Esperando Entrega al Cliente
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
