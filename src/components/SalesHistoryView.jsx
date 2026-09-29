import React from "react";
import {
  AlertCircle,
  Clock,
  CheckCircle,
  Play,
  DollarSign,
  MessageCircle,
  Eye,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { supabase } from "../supabase";

// Vista de historial y control financiero.
// Aquí se muestran las ventas registradas, las cuentas por cobrar, los pedidos en cocina y
// las acciones rápidas para reanudar, abonar, recordarle al cliente, ver la factura o eliminar.
function SalesHistoryView({
  filteredSales,
  historyFilterType,
  setHistoryFilterType,
  historyCustomDate,
  setHistoryCustomDate,
  handleResumeOrder,
  handleStartSettleCredit,
  sendWhatsAppReminder,
  handleViewInvoice,
  currentUserRole,
  currentStoreId,
  setSales,
}) {
  // --- Lógica de Seguridad ---
  const isOwnerOrAdmin = currentUserRole === "owner" || currentUserRole === "super_admin";

  // --- Lógica de Gráfica de Ventas (Agrupada por Día de la Semana) ---
  const salesByDay = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 0: 0 };
  filteredSales.forEach(sale => {
    if (sale.status === 'completed' || sale.status === 'credit') {
      const date = new Date(sale.created_at);
      const day = date.getDay(); // 0 = Dom, 1 = Lun...
      salesByDay[day] += (sale.total_usd || 0);
    }
  });
  
  const chartData = [
    { day: 'Lun', total: salesByDay[1] },
    { day: 'Mar', total: salesByDay[2] },
    { day: 'Mié', total: salesByDay[3] },
    { day: 'Jue', total: salesByDay[4] },
    { day: 'Vie', total: salesByDay[5] },
    { day: 'Sáb', total: salesByDay[6] },
    { day: 'Dom', total: salesByDay[0] },
  ];
  const maxChartValue = Math.max(...chartData.map(d => d.total));

  // Lógica Cashea con Selección de Facturas
  const [casheaSelectedIds, setCasheaSelectedIds] = React.useState([]);
  const [casheaRate, setCasheaRate] = React.useState("");

  const pendingCasheaSales = filteredSales.filter(s => s.payment_details?.cashea > 0 && !s.payment_details?.cashea_settled);
  const totalCasheaPending = pendingCasheaSales.reduce((sum, s) => sum + (s.payment_details?.cashea || 0), 0);

  const selectedCasheaSales = pendingCasheaSales.filter(s => casheaSelectedIds.includes(s.id));
  const selectedCasheaTotal = selectedCasheaSales.reduce((sum, s) => sum + (s.payment_details?.cashea || 0), 0);

  const handleToggleCashea = (id) => {
    setCasheaSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSettleCashea = async () => {
    if(selectedCasheaSales.length === 0) {
      alert("⚠️ Selecciona al menos una factura haciendo clic sobre ella para poder liquidar.");
      return;
    }
    if(!window.confirm(`¿Confirmar que Cashea ha depositado/liquidado las ${selectedCasheaSales.length} facturas seleccionadas por un total de $${selectedCasheaTotal.toFixed(2)} USD?`)) return;
    
    try {
      const promises = selectedCasheaSales.map(sale => {
        const updatedDetails = { ...sale.payment_details, cashea_settled: true };
        if(casheaRate) updatedDetails.cashea_settled_rate = parseFloat(casheaRate);
        return supabase.from('sales').update({ payment_details: updatedDetails }).eq('id', sale.id).eq('store_id', currentStoreId);
      });
      await Promise.all(promises);
      
      if (typeof setSales === "function") {
        setSales(prev => prev.map(s => {
          if (casheaSelectedIds.includes(s.id)) {
            return { ...s, payment_details: { ...s.payment_details, cashea_settled: true, cashea_settled_rate: parseFloat(casheaRate) } };
          }
          return s;
        }));
      }
      setCasheaSelectedIds([]);
      setCasheaRate("");
      alert("¡Facturas seleccionadas liquidadas correctamente!");
    } catch (err) {
      alert("Error al liquidar: " + err.message);
    }
  };

  return (
    <div
      className="product-list-card"
      style={{
        width: "100%",
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "10px",
        padding: "24px",
      }}
    >
      {/* ====== SECCIÓN FINANCIERA EXCLUSIVA PARA DUEÑOS ====== */}
      {isOwnerOrAdmin && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginBottom: "20px" }}>
          
          {/* Gráfica de Ventas */}
          <div style={{ background: "#f8f9fa", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "16px" }}>
            <h4 style={{ margin: "0 0 24px 0", color: "#111827", fontSize: "15px", display: "flex", alignItems: "center", gap: "6px" }}>
              <TrendingUp size={18} color="#10b981" /> 
              Rendimiento por Día de la Semana (Filtro actual)
            </h4>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "10px", height: "120px", paddingBottom: "20px", borderBottom: "1px solid #e5e7eb", margin: "0 10px" }}>
              {chartData.map((d, i) => {
                const heightPx = maxChartValue > 0 ? (d.total / maxChartValue) * 100 : 0;
                return (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", position: "relative", height: "100%" }}>
                    <span style={{ fontSize: "11px", color: "#4b5563", fontWeight: "bold", position: "absolute", bottom: `${heightPx + 4}px` }}>
                      ${d.total.toFixed(0)}
                    </span>
                    <div style={{ width: "40%", maxWidth: "40px", background: heightPx > 0 ? "#10b981" : "transparent", height: `${heightPx}px`, borderRadius: "4px 4px 0 0", minHeight: heightPx > 0 ? "4px" : "0", transition: "height 0.3s ease" }}></div>
                    <span style={{ fontSize: "12px", fontWeight: "600", color: "#6b7280", position: "absolute", bottom: "-24px" }}>{d.day}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Panel Detallado de Cashea (Solo aparece si hay deuda) */}
          {totalCasheaPending > 0 && (
        <div style={{ background: "#fef9c3", border: "1px solid #fde047", borderRadius: "8px", padding: "16px", marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #fde047", paddingBottom: "12px", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <h4 style={{ margin: 0, color: "#854d0e", fontSize: "16px", display: "flex", alignItems: "center", gap: "6px" }}>
                <DollarSign size={18} /> Estado de Cuenta: Cashea
              </h4>
              <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#a16207" }}>
                Deuda total acumulada: <strong>${totalCasheaPending.toFixed(2)} USD</strong>
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-end", background: "#fffbeb", padding: "10px", borderRadius: "8px", border: "1px solid #fde047" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "12px", color: "#854d0e", fontWeight: "bold" }}>Tasa a la que pagaron (Bs/$):</span>
                <input 
                  type="number" 
                  step="0.01" 
                  placeholder="Ej. 36.50" 
                  value={casheaRate} 
                  onChange={e => setCasheaRate(e.target.value)} 
                  style={{ padding: "6px 8px", width: "90px", border: "1px solid #eab308", borderRadius: "4px", fontSize: "13px", outline: "none", fontWeight: "bold", color: "#713f12" }}
                />
              </div>
              <div style={{ fontSize: "13px", color: "#854d0e", textAlign: "right" }}>
                Has seleccionado: <strong>${selectedCasheaTotal.toFixed(2)}</strong>
                <br/>
                {casheaRate > 0 ? (
                  <span style={{color: "#16a34a", fontWeight: "900", fontSize: "14px"}}>Recibirás en banco: Bs. {(selectedCasheaTotal * casheaRate).toLocaleString("es-VE", {minimumFractionDigits: 2})}</span>
                ) : (
                  <span style={{color: "#a16207", fontSize: "11px"}}>(Ingresa la tasa para ver en Bs)</span>
                )}
              </div>
              <button 
                onClick={handleSettleCashea}
                disabled={selectedCasheaSales.length === 0}
                style={{ background: selectedCasheaSales.length > 0 ? "#eab308" : "#fef08a", color: selectedCasheaSales.length > 0 ? "#111827" : "#a16207", border: "none", padding: "8px 16px", borderRadius: "6px", fontWeight: "900", cursor: selectedCasheaSales.length > 0 ? "pointer" : "not-allowed", fontSize: "12px", width: "100%", marginTop: "4px", transition: "all 0.2s" }}>
                Liquidar Seleccionadas ({selectedCasheaSales.length})
              </button>
            </div>
          </div>
          
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ fontSize: "12px", fontWeight: "bold", color: "#854d0e" }}>Facturas financiadas (Haz clic para seleccionar las que te están pagando):</span>
              <button 
                onClick={() => setCasheaSelectedIds(casheaSelectedIds.length === pendingCasheaSales.length ? [] : pendingCasheaSales.map(s=>s.id))} 
                style={{ background: "none", border: "none", color: "#a16207", fontSize: "12px", textDecoration: "underline", cursor: "pointer", fontWeight: "bold" }}>
                {casheaSelectedIds.length === pendingCasheaSales.length ? "Desmarcar Todas" : "Marcar Todas"}
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "8px", maxHeight: "150px", overflowY: "auto", paddingRight: "4px" }}>
              {pendingCasheaSales.map(s => {
                const isSelected = casheaSelectedIds.includes(s.id);
                return (
                  <div key={s.id} onClick={() => handleToggleCashea(s.id)} style={{ background: isSelected ? "#fef08a" : "#fff", border: isSelected ? "2px solid #eab308" : "1px solid #fde047", borderRadius: "6px", padding: "8px 12px", fontSize: "12px", display: "flex", flexDirection: "column", gap: "4px", cursor: "pointer", transition: "all 0.15s" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <input type="checkbox" checked={isSelected} readOnly style={{ cursor: "pointer", accentColor: "#eab308" }} />
                        <strong style={{ color: "#713f12" }}>{s.invoice_number || `A-${String(s.id).padStart(3, "0")}`}</strong>
                      </div>
                      <strong style={{ color: "#a16207" }}>${s.payment_details.cashea.toFixed(2)}</strong>
                    </div>
                    <div style={{ color: "#6b7280", fontSize: "11px", marginLeft: "20px" }}>{new Date(s.created_at).toLocaleDateString()} - {s.client_name || "Cliente"}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      
      </div>
      )}
      {/* ====== FIN SECCIÓN EXCLUSIVA PARA DUEÑOS ====== */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: "16px",
            fontWeight: "800",
            color: "#111827",
          }}
        >
          Registro de Ventas y Cuentas ({filteredSales.length})
        </h3>
        <div
          style={{
            display: "flex",
            gap: "6px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <button
            onClick={() => {
              setHistoryFilterType("all");
              setHistoryCustomDate("");
            }}
            style={{
              padding: "6px 12px",
              borderRadius: "4px",
              border:
                historyFilterType === "all"
                  ? "1px solid #111827"
                  : "1px solid #d1d5db",
              background: historyFilterType === "all" ? "#111827" : "#fff",
              color: historyFilterType === "all" ? "#fff" : "#374151",
              fontSize: "12px",
              cursor: "pointer",
              fontWeight: "700",
            }}
          >
            Todos
          </button>
          <button
            onClick={() => {
              setHistoryFilterType("yesterday");
              setHistoryCustomDate("");
            }}
            style={{
              padding: "6px 12px",
              borderRadius: "4px",
              border:
                historyFilterType === "yesterday"
                  ? "1px solid #111827"
                  : "1px solid #d1d5db",
              background:
                historyFilterType === "yesterday" ? "#111827" : "#fff",
              color: historyFilterType === "yesterday" ? "#fff" : "#374151",
              fontSize: "12px",
              cursor: "pointer",
              fontWeight: "700",
            }}
          >
            Ayer
          </button>
          <button
            onClick={() => {
              setHistoryFilterType("last_week");
              setHistoryCustomDate("");
            }}
            style={{
              padding: "6px 12px",
              borderRadius: "4px",
              border:
                historyFilterType === "last_week"
                  ? "1px solid #111827"
                  : "1px solid #d1d5db",
              background:
                historyFilterType === "last_week" ? "#111827" : "#fff",
              color: historyFilterType === "last_week" ? "#fff" : "#374151",
              fontSize: "12px",
              cursor: "pointer",
              fontWeight: "700",
            }}
          >
            Semana Pasada
          </button>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              background: "#fff",
              border: "1px solid #d1d5db",
              borderRadius: "4px",
              padding: "2px 8px",
            }}
          >
            <span
              style={{ fontSize: "11px", color: "#6b7280", fontWeight: "600" }}
            >
              Fecha:
            </span>
            <input
              type="date"
              value={historyCustomDate}
              onChange={(e) => {
                setHistoryCustomDate(e.target.value);
                setHistoryFilterType("custom");
              }}
              style={{
                border: "none",
                fontSize: "12px",
                outline: "none",
                background: "transparent",
              }}
            />
          </div>
        </div>
      </div>

      <div className="table-responsive">
        <table className="fiskal-table" style={{ fontSize: "13px" }}>
          <thead>
            <tr style={{ color: "#6b7280", borderBottom: "1px solid #e5e7eb" }}>
              <th>Factura #</th>
              <th>Fecha y Hora</th>
              <th>Cliente</th>
              <th>Total USD</th>
              <th>Estatus</th>
              <th style={{ textAlign: "center" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-text">
                  No hay ventas registradas para este filtro.
                </td>
              </tr>
            ) : (
              filteredSales.map((sale) => {
                const statusLower = String(sale.status || "")
                  .trim()
                  .toLowerCase();
                const isWaitingOrder = [
                  "pending",
                  "preparando",
                  "en preparación",
                  "ready",
                  "listo",
                  "espera_pago",
                  "en espera",
                ].includes(statusLower);
                const isCredit =
                  sale.status === "credit" ||
                  (Number(sale.balance_due_usd) > 0 && !isWaitingOrder);
                const isTrulyPaid =
                  sale.status === "completed" &&
                  Number(sale.balance_due_usd || 0) <= 0.01;

                return (
                  <tr
                    key={sale.id}
                    style={{ borderBottom: "1px solid #f3f4f6" }}
                  >
                    <td>
                      <strong>
                        {sale.invoice_number ||
                          (String(sale.id).startsWith("local")
                            ? "Pendiente"
                            : `A-${String(sale.id).padStart(3, "0")}`)}
                      </strong>
                    </td>
                    <td>{new Date(sale.created_at).toLocaleString()}</td>
                    <td>{sale.client_name || "Cliente General"}</td>
                    <td>
                      <strong>${Number(sale.total_usd || 0).toFixed(2)}</strong>
                      {sale.payment_details?.cashea > 0 && (
                         <div style={{fontSize: "10px", marginTop: "2px", color: sale.payment_details.cashea_settled ? "#16a34a" : "#ca8a04", fontWeight: "bold"}}>
                           Cashea: ${sale.payment_details.cashea.toFixed(2)} {sale.payment_details.cashea_settled ? "(Liquidado)" : "(Pendiente)"}
                         </div>
                      )}
                    </td>
                    <td>
                      {isCredit ? (
                        <span
                          style={{
                            background: "#fff5f5",
                            color: "#e05d5d",
                            padding: "3px 8px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: "700",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            border: "1px solid #ffc9c9",
                          }}
                        >
                          <AlertCircle size={12} /> Crédito ($
                          {Number(
                            sale.balance_due_usd || sale.total_usd,
                          ).toFixed(2)}
                          )
                        </span>
                      ) : isWaitingOrder ? (
                        <span
                          style={{
                            background: "#fff3bf",
                            color: "#d9480f",
                            padding: "3px 8px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: "700",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            border: "1px solid #ffe066",
                          }}
                        >
                          <Clock size={12} /> En Espera / Cocina
                        </span>
                      ) : isTrulyPaid ? (
                        <span
                          style={{
                            background: "#dcfce7",
                            color: "#16a34a",
                            padding: "3px 8px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: "700",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <CheckCircle size={12} /> Pagada
                        </span>
                      ) : (
                        <span
                          style={{
                            background: "#f3f4f6",
                            color: "#4b5563",
                            padding: "3px 8px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: "700",
                          }}
                        >
                          {sale.status}
                        </span>
                      )}
                    </td>
                    <td className="action-cell">
                      <div
                        className="action-buttons"
                        style={{
                          display: "flex",
                          gap: "4px",
                          justifyContent: "center",
                        }}
                      >
                        {isWaitingOrder && (
                          <button
                            className="btn-icon-success"
                            onClick={() => handleResumeOrder(sale)}
                            title="Retomar cuenta para cobrar"
                            style={{
                              background: "#111827",
                              color: "#fff",
                              border: "none",
                              padding: "6px 10px",
                              borderRadius: "4px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <Play size={14} /> Continuar / Cobrar
                          </button>
                        )}
                        {isCredit && (
                          <button
                            className="btn-icon-success"
                            onClick={() => handleStartSettleCredit(sale)}
                            title="Abonar a cuenta"
                            style={{
                              background: "#16a34a",
                              color: "#fff",
                              border: "none",
                              padding: "6px 10px",
                              borderRadius: "4px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <DollarSign size={14} /> Abonar
                          </button>
                        )}
                        {isCredit && (
                          <button
                            className="btn-icon-whatsapp"
                            onClick={() => sendWhatsAppReminder(sale)}
                            title="Recordatorio WhatsApp"
                          >
                            <MessageCircle size={16} />
                          </button>
                        )}
                        <button
                          className="btn-icon-primary"
                          onClick={() => handleViewInvoice(sale)}
                          title="Ver Factura"
                          style={{
                            background: "#f3f4f6",
                            border: "1px solid #d1d5db",
                            color: "#111827",
                            padding: "6px 8px",
                            borderRadius: "4px",
                          }}
                        >
                          <Eye size={16} />
                        </button>

                        {(currentUserRole === "owner" ||
                          currentUserRole === "super_admin") && (
                          <button
                            style={{
                              background: "#e05d5d",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              padding: "6px 8px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                            onClick={async (e) => {
                              e.stopPropagation();
                              const confirmDelete = window.confirm(
                                `⚠️ ¿ESTÁS SEGURO? Estás a punto de ELIMINAR permanentemente la Factura/Pedido #${sale.invoice_number || sale.id}. Esta acción no se puede deshacer.`,
                              );
                              if (confirmDelete) {
                                try {
                                  await supabase
                                    .from("payment_history")
                                    .delete()
                                    .eq("sale_id", sale.id)
                                    .eq("store_id", currentStoreId);
                                  await supabase
                                    .from("sales")
                                    .delete()
                                    .eq("id", sale.id)
                                    .eq("store_id", currentStoreId);
                                  if (typeof setSales === "function") {
                                    setSales((prevSales) =>
                                      prevSales.filter((s) => s.id !== sale.id),
                                    );
                                  }
                                } catch (err) {
                                  alert(
                                    "Error al eliminar el pedido: " +
                                      err.message,
                                  );
                                }
                              }
                            }}
                            title="Eliminar Pedido (Solo Dueño)"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default SalesHistoryView;
