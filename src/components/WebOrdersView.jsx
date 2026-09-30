import React from "react";
import { Monitor, ShoppingCart, CheckCircle } from "lucide-react";

const WebOrdersView = ({
  sales,
  currentStoreType,
  handleResumeOrder,
  supabase,
  currentStoreId,
  fetchSales,
}) => {
  // Filtramos TODOS los pedidos de delivery que no estén completados ni cancelados
  const activeWebOrders = sales.filter(
    (s) =>
      s.payment_details?.is_delivery &&
      s.status !== "completed" &&
      s.status !== "cancelled"
  );

  return (
    <div className="product-list-card" style={{ padding: "24px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h3
          style={{
            color: "#8b5cf6",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            margin: 0,
          }}
        >
          <Monitor size={24} /> Recepción de Pedidos Web / Delivery
        </h3>
        <span
          style={{
            background: "#ede9fe",
            color: "#6d28d9",
            padding: "6px 12px",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: "bold",
          }}
        >
          Panel Activo
        </span>
      </div>

      <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: "20px" }}>
        Aquí puedes gestionar los deliveries y pickups que envían tus clientes.
        Haz clic en "Procesar Pago" para llevarlos a la caja y confirmarlos.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: "16px",
        }}
      >
        {activeWebOrders.length === 0 ? (
          <div
            style={{
              gridColumn: "1 / -1",
              textAlign: "center",
              padding: "60px",
              background: "#f8f9fa",
              borderRadius: "12px",
              border: "1px dashed #ced4da",
            }}
          >
            <p
              style={{ color: "#9ca3af", fontSize: "15px", fontWeight: "bold" }}
            >
              No hay pedidos web activos en este momento.
            </p>
          </div>
        ) : (
          activeWebOrders.map((order) => {
            const isUnpaid = order.status === "web_unpaid";

            // Colores según el estatus real y tipo de tienda
            let statusColor = "#f59e0b"; // Naranja
            let statusLabel =
              currentStoreType === "restaurant"
                ? "En Cocina (Pendiente)"
                : "En Preparación (Pendiente)";

            if (isUnpaid) {
              statusColor = "#ef4444";
              statusLabel = "FALTA PAGO";
            } else if (order.status === "preparando") {
              statusColor = "#3b82f6";
              statusLabel =
                currentStoreType === "restaurant"
                  ? "Preparando en Cocina"
                  : "Preparando Pedido";
            } else if (order.status === "ready") {
              statusColor = "#10b981";
              statusLabel = "Listo para Entregar";
            }

            return (
              <div
                key={order.id}
                style={{
                  background: "#fff",
                  border: `2px solid ${isUnpaid ? "#8b5cf6" : "#e2e8f0"}`,
                  borderRadius: "12px",
                  padding: "16px",
                  boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
                  display: "flex",
                  flexDirection: "column"
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderBottom: "1px solid #e5e7eb",
                    paddingBottom: "12px",
                    marginBottom: "12px",
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    <strong style={{ fontSize: "16px", color: "#111827" }}>
                      #{order.invoice_number || order.id.toString().slice(-4)}
                    </strong>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#6b7280",
                        marginTop: "4px",
                      }}
                    >
                      {new Date(order.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <strong
                      style={{
                        fontSize: "18px",
                        color: "#16a34a",
                        display: "block",
                      }}
                    >
                      ${Number(order.total_usd).toFixed(2)}
                    </strong>
                    <span
                      style={{
                        fontSize: "10px",
                        background: statusColor,
                        color: "#fff",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontWeight: "bold",
                        display: "inline-block",
                        marginTop: "4px",
                      }}
                    >
                      {statusLabel}
                    </span>
                  </div>
                </div>

                <div style={{ marginBottom: "16px", fontSize: "13px", flexGrow: 1 }}>
                  <div style={{ fontWeight: "bold", color: "#374151" }}>
                    👤 {order.client_name || "Cliente Web"}
                  </div>

                  {order.payment_details?.delivery_address && (
                    <div
                      style={{
                        marginTop: "8px",
                        color: "#4b5563",
                        display: "flex",
                        gap: "6px",
                        alignItems: "flex-start",
                      }}
                    >
                      <span>📍</span>
                      <span style={{ lineHeight: "1.4" }}>
                        {order.payment_details.delivery_address}
                      </span>
                    </div>
                  )}

                  {order.payment_details?.delivery_reference && (
                    <div
                      style={{
                        marginTop: "6px",
                        color: "#8b5cf6",
                        fontSize: "12px",
                        background: "#f5f3ff",
                        padding: "6px",
                        borderRadius: "4px",
                      }}
                    >
                      <strong>Ref/GPS:</strong>{" "}
                      {order.payment_details.delivery_reference}
                    </div>
                  )}

                  {order.payment_details?.client_phone && (
                    <div style={{ marginTop: "8px", color: "#4b5563" }}>
                      📞 {order.payment_details.client_phone}
                    </div>
                  )}

                  {/* ⬇️ NUEVO: VISUALIZACIÓN DE LOS PRODUCTOS Y SUS EXTRAS ⬇️ */}
                  <div style={{ marginTop: "12px", background: "#f8f9fa", padding: "10px", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                    <strong style={{ fontSize: "11px", color: "#6b7280", textTransform: "uppercase", borderBottom: "1px solid #e5e7eb", display: "block", paddingBottom: "4px", marginBottom: "6px" }}>
                      🛒 Resumen del Pedido:
                    </strong>
                    
                    {order.items && order.items.map((item, idx) => (
                      <div key={idx} style={{ marginBottom: "6px", borderBottom: idx !== order.items.length - 1 ? "1px dashed #e5e7eb" : "none", paddingBottom: "4px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", color: "#111827", fontWeight: "700", fontSize: "13px" }}>
                          <span>{item.quantity}x {item.name}</span>
                          <span>${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                        {item.customization && item.customization !== "Con todo" && (
                          <div style={{ fontSize: "11px", color: "#d97706", marginTop: "2px", lineHeight: "1.3", fontWeight: "600" }}>
                            ↳ {item.customization}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {/* ⬆️ FIN DE LA NUEVA VISUALIZACIÓN ⬆️ */}

                </div>

                {isUnpaid ? (
                  <button
                    onClick={() => handleResumeOrder(order)}
                    style={{
                      width: "100%",
                      background: "#8b5cf6",
                      color: "#fff",
                      border: "none",
                      padding: "10px",
                      borderRadius: "6px",
                      fontWeight: "bold",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <ShoppingCart size={16} /> Confirmar y Cobrar
                  </button>
                ) : (
                  <button
                    onClick={async () => {
                      if (
                        !window.confirm(
                          "¿Seguro que ya enviaste/entregaste este pedido al cliente? Desaparecerá de la pantalla."
                        )
                      )
                        return;
                      try {
                        const { error } = await supabase
                          .from("sales")
                          .update({ status: "completed" })
                          .eq("id", order.id);
                        if (error) throw error;
                        fetchSales(currentStoreId);
                      } catch (e) {
                        alert(e.message);
                      }
                    }}
                    style={{
                      width: "100%",
                      background: "#10b981",
                      color: "#fff",
                      border: "none",
                      padding: "10px",
                      borderRadius: "6px",
                      fontWeight: "bold",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <CheckCircle size={16} /> Marcar como Entregado
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default WebOrdersView;