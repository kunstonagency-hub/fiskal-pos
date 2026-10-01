import React, { useState, useEffect } from "react";
import { Lock, Eye, CreditCard, Clock, Check, Save } from "lucide-react";

// Vista de turnos y arqueo de caja.
function CashShiftsView({
  supabase,
  currentStoreId,
  currentShift,
  getCurrentRegisterName,
  setShowCloseShiftModal,
  currentStoreCountry,
  shiftCashUSD,
  shiftCashBs,
  shiftZelle,
  shiftPagoMovilBs,
  shiftDebitBs,
  shiftChangePagoMovilBs,
  shiftChangePagoMovilUSD,
  setShowOpenShiftModal,
  pastShifts,
  registers,
  employees,
  sales,
  setSelectedShiftReport,
  setShowShiftReportModal,
}) {
  // ==========================================
  // ESTADO LOCAL PARA PUNTOS DE VENTA Y ALARMAS
  // ==========================================
  const [posTerminals, setPosTerminals] = useState([]);
  const [posClosures, setPosClosures] = useState([]);
  const [closingPosId, setClosingPosId] = useState(null);
  const [closingAmount, setClosingAmount] = useState("");

  // 1. Cargar Puntos de Venta y Cierres de hoy
  useEffect(() => {
    if (!supabase || !currentStoreId) return;

    const fetchPosData = async () => {
      const { data: terms } = await supabase
        .from("pos_terminals")
        .select("*")
        .eq("store_id", currentStoreId);
      if (terms) setPosTerminals(terms);

      if (currentShift) {
        const { data: closures } = await supabase
          .from("pos_closures")
          .select("*")
          .eq("shift_id", currentShift.id);
        if (closures) setPosClosures(closures);
      } else {
        setPosClosures([]);
      }
    };

    fetchPosData();
  }, [supabase, currentStoreId, currentShift]);

  // 1.5. Deshacer el cierre del lote (Reabrir)
  const handleReopenPos = async (closureId) => {
    if (!window.confirm("¿Seguro que deseas deshacer el cierre y reabrir este punto de venta?")) return;
    try {
      const { error } = await supabase.from("pos_closures").delete().eq("id", closureId);
      if (error) throw error;
      setPosClosures(posClosures.filter((c) => c.id !== closureId));
    } catch (err) {
      alert("Error al reabrir el punto de venta: " + err.message);
    }
  };

  // 2. Registrar el cierre del lote con el MONTO INGRESADO
  const handleRegisterPosClosure = async (posId) => {
    if (!currentShift) return;
    
    if (closingAmount === "" || isNaN(closingAmount) || Number(closingAmount) < 0) {
      return alert("Por favor ingresa un monto válido (puede ser 0 si no hubo transacciones).");
    }

    try {
      const { data, error } = await supabase
        .from("pos_closures")
        .insert([
          {
            store_id: currentStoreId,
            shift_id: currentShift.id,
            pos_terminal_id: posId,
            closed_amount: Number(closingAmount)
          },
        ])
        .select();

      if (error) throw error;
      setPosClosures([...posClosures, data[0]]);
      setClosingPosId(null);
      setClosingAmount("");
      alert("✅ Cierre de lote registrado exitosamente.");
    } catch (error) {
      alert("Error registrando cierre: " + error.message);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        maxWidth: "950px",
        margin: "0 auto",
        width: "100%",
      }}
    >
      <div
        className="product-form-card"
        style={{
          width: "100%",
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "10px",
          padding: "24px",
        }}
      >
        <h3
          style={{
            fontSize: "18px",
            fontWeight: "800",
            color: "#111827",
            margin: 0,
          }}
        >
          Gestión de Turno y Arqueo de Caja
        </h3>

        {currentShift ? (
          <div style={{ marginTop: "20px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <div>
                <span
                  style={{
                    background: "#f3f4f6",
                    color: "#111827",
                    padding: "4px 10px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontWeight: "700",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  CAJA ABIERTA: {getCurrentRegisterName()}
                </span>
                <p
                  style={{
                    fontSize: "12px",
                    color: "#6b7280",
                    marginTop: "4px",
                  }}
                >
                  Iniciado el:{" "}
                  {new Date(currentShift.opened_at).toLocaleString()}
                </p>
              </div>
              <button
                className="btn-primary"
                onClick={() => setShowCloseShiftModal(true)}
                style={{
                  background: "#111827",
                  color: "#ffffff",
                  border: "none",
                  fontWeight: "700",
                  padding: "10px 18px",
                  borderRadius: "6px",
                }}
              >
                Cerrar Turno (Reporte Z)
              </button>
            </div>

            <div
              style={{
                marginTop: "16px",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "12px",
                marginBottom: "20px",
              }}
            >
              {(() => {
                const floatUsd = Number(currentShift?.opening_float_usd || 0);
                const match = (currentShift?.notes || "").match(
                  /FondoBs:([0-9.]+)/,
                );
                const floatBs = match
                  ? parseFloat(match[1])
                  : Number(
                      currentShift?.opening_float_ves ||
                        currentShift?.opening_float_bs ||
                        0,
                    );

                const expectedUsd = floatUsd + shiftCashUSD;
                const expectedBs = floatBs + shiftCashBs;
                const hasEgresos = (shiftChangePagoMovilBs || 0) > 0;

                return (
                  <>
                    {/* Tarjeta 1: Fondo Inicial de Apertura */}
                    <div
                      style={{
                        background: "#fafafa",
                        padding: "16px",
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          color: "#6b7280",
                          fontWeight: "800",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        1. Fondo de Apertura
                      </span>
                      <div
                        style={{
                          marginTop: "8px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "2px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "18px",
                            fontWeight: "800",
                            color: "#111827",
                          }}
                        >
                          ${floatUsd.toFixed(2)}{" "}
                          <span
                            style={{
                              fontSize: "11px",
                              color: "#6b7280",
                              fontWeight: "500",
                            }}
                          >
                            USD
                          </span>
                        </div>
                        {(!currentStoreCountry ||
                          currentStoreCountry
                            .toLowerCase()
                            .includes("venezuela")) && (
                          <div
                            style={{
                              fontSize: "14px",
                              fontWeight: "700",
                              color: "#4b5563",
                            }}
                          >
                            Bs.{" "}
                            {floatBs.toLocaleString("es-VE", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tarjeta 2: Movimientos del Turno */}
                    <div
                      style={{
                        background: "#fafafa",
                        padding: "16px",
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          color: "#6b7280",
                          fontWeight: "800",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        2. Movimientos del Turno
                      </span>
                      <div
                        style={{
                          marginTop: "8px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "12px",
                              color: "#374151",
                              fontWeight: "600",
                            }}
                          >
                            Entradas (Ventas):
                          </span>
                          <strong
                            style={{
                              fontSize: "14px",
                              color: "#16a34a",
                              fontWeight: "800",
                            }}
                          >
                            +${(shiftCashUSD + shiftZelle).toFixed(2)} USD
                          </strong>
                        </div>
                        {(() => {
                           const shiftCashea = (sales || []).filter(s => s.shift_id === currentShift?.id && s.status === "completed").reduce((sum, s) => sum + (s.payment_details?.cashea || 0), 0);
                           if (shiftCashea > 0) return (
                             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                               <span style={{ fontSize: "11px", color: "#4f46e5", fontWeight: "600" }}>Ventas por Cashea:</span>
                               <strong style={{ fontSize: "12px", color: "#4f46e5", fontWeight: "800" }}>+${shiftCashea.toFixed(2)} USD</strong>
                             </div>
                           );
                           return null;
                        })()}

                        {hasEgresos ? (
                          <div
                            style={{
                              borderTop: "1px dashed #e5e7eb",
                              paddingTop: "6px",
                              display: "flex",
                              flexDirection: "column",
                              gap: "2px",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "11px",
                                  color: "#e05d5d",
                                  fontWeight: "600",
                                }}
                              >
                                Salidas Banco (Vueltos):
                              </span>
                              <strong
                                style={{
                                  fontSize: "12px",
                                  color: "#e05d5d",
                                  fontWeight: "800",
                                }}
                              >
                                -Bs.{" "}
                                {shiftChangePagoMovilBs.toLocaleString(
                                  "es-VE",
                                  {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  },
                                )}
                              </strong>
                            </div>
                            <span
                              style={{
                                fontSize: "10px",
                                color: "#6b7280",
                                textAlign: "right",
                              }}
                            >
                              (Equiv. a ${shiftChangePagoMovilUSD.toFixed(2)}{" "}
                              USD por Pago Móvil)
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: "11px", color: "#9ca3af" }}>
                            Sin salidas de banco registradas.
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Tarjeta 3: Arqueo Físico en Gaveta */}
                    <div
                      style={{
                        background: "#ffffff",
                        padding: "16px",
                        borderRadius: "8px",
                        border: "2px solid #111827",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          color: "#111827",
                          fontWeight: "800",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        3. Efectivo en Gaveta
                      </span>
                      <div
                        style={{
                          marginTop: "8px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "2px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "22px",
                            fontWeight: "900",
                            color: "#111827",
                          }}
                        >
                          ${expectedUsd.toFixed(2)}{" "}
                          <span
                            style={{
                              fontSize: "12px",
                              fontWeight: "700",
                              color: "#6b7280",
                            }}
                          >
                            USD FÍSICO
                          </span>
                        </div>
                        {(!currentStoreCountry ||
                          currentStoreCountry
                            .toLowerCase()
                            .includes("venezuela")) && (
                          <div
                            style={{
                              fontSize: "15px",
                              fontWeight: "800",
                              color: "#111827",
                            }}
                          >
                            Bs.{" "}
                            {expectedBs.toLocaleString("es-VE", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{" "}
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: "500",
                                color: "#6b7280",
                              }}
                            >
                              BS FÍSICO
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "48px 20px" }}>
            <Lock size={40} color="#9ca3af" style={{ marginBottom: "12px" }} />
            <h4
              style={{
                fontSize: "16px",
                fontWeight: "700",
                color: "#111827",
                margin: 0,
              }}
            >
              No hay turno abierto
            </h4>
            <p
              style={{
                color: "#6b7280",
                fontSize: "13px",
                margin: "6px 0 20px 0",
              }}
            >
              Abre una caja física para comenzar las operaciones del día.
            </p>
            <button
              className="btn-primary"
              onClick={() => setShowOpenShiftModal(true)}
              style={{
                background: "#111827",
                color: "#fff",
                border: "none",
                padding: "10px 20px",
                borderRadius: "6px",
                fontWeight: "700",
              }}
            >
              Abrir Turno de Caja
            </button>
          </div>
        )}
      </div>

      {/* --- SECCIÓN DE CONTROL Y REGISTRO DE PUNTOS DE VENTA --- */}
      {currentShift && posTerminals && posTerminals.length > 0 && (
        <div
          style={{
            background: "#ffffff",
            padding: "24px",
            borderRadius: "10px",
            border: "1px solid #e5e7eb",
          }}
        >
          <h4
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "16px",
              fontWeight: "800",
              color: "#111827",
              margin: "0 0 16px 0",
            }}
          >
            <CreditCard size={20} color="#0284c7" /> Cierre de Lotes (Puntos de Venta)
          </h4>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "16px",
            }}
          >
            {posTerminals.map((pos) => {
              const closureInfo = posClosures?.find((c) => c.pos_terminal_id === pos.id);
              const isClosed = !!closureInfo;
              const isClosingThis = closingPosId === pos.id;

              return (
                <div
                  key={pos.id}
                  style={{
                    background: isClosed ? "#f0fdf4" : "#f9fafb",
                    border: `1px solid ${isClosed ? "#bbf7d0" : "#e5e7eb"}`,
                    padding: "16px",
                    borderRadius: "8px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <strong
                      style={{
                        fontSize: "14px",
                        display: "block",
                        color: "#111827",
                      }}
                    >
                      {pos.name}
                    </strong>
                    <span style={{ fontSize: "12px", color: "#6b7280" }}>
                      {pos.bank} • Hora límite: {pos.closing_time.substring(0, 5)}
                    </span>
                  </div>

                  <div style={{ marginTop: "16px" }}>
                    {isClosed ? (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "4px",
                        }}
                      >
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "13px",
                            color: "#16a34a",
                            fontWeight: "bold",
                          }}
                        >
                          <Check size={16} /> Cerrado a las{" "}
                          {new Date(closureInfo.closed_at).toLocaleTimeString(
                            [],
                            { hour: "2-digit", minute: "2-digit" }
                          )}
                        </span>
                        <span style={{ fontSize: "12px", color: "#374151" }}>
                          Monto Lote:{" "}
                          <strong>
                            Bs.{" "}
                            {Number(closureInfo.closed_amount).toLocaleString(
                              "es-VE",
                              { minimumFractionDigits: 2 }
                            )}
                          </strong>
                        </span>
                        <button
                          onClick={() => handleReopenPos(closureInfo.id)}
                          style={{
                            marginTop: "8px",
                            background: "#fee2e2",
                            color: "#ef4444",
                            border: "1px solid #fca5a5",
                            padding: "6px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: "bold",
                            cursor: "pointer",
                            width: "100%"
                          }}
                        >
                          Deshacer Cierre (Reabrir)
                        </button>
                      </div>
                    ) : isClosingThis ? (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        }}
                      >
                        <label
                          style={{
                            fontSize: "11px",
                            fontWeight: "bold",
                            color: "#374151",
                          }}
                        >
                          Monto total del lote (Bs.):
                        </label>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={closingAmount}
                            onChange={(e) => setClosingAmount(e.target.value)}
                            style={{
                              flex: 1,
                              padding: "8px",
                              border: "1px solid #d1d5db",
                              borderRadius: "4px",
                              fontSize: "13px",
                              outline: "none",
                            }}
                          />
                          <button
                            onClick={() => handleRegisterPosClosure(pos.id)}
                            style={{
                              background: "#0284c7",
                              color: "#fff",
                              border: "none",
                              padding: "0 12px",
                              borderRadius: "4px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            <Save size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setClosingPosId(null);
                              setClosingAmount("");
                            }}
                            style={{
                              background: "#f3f4f6",
                              border: "1px solid #d1d5db",
                              padding: "0 12px",
                              borderRadius: "4px",
                              cursor: "pointer",
                            }}
                          >
                            X
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setClosingPosId(pos.id)}
                        style={{
                          background: "#111827",
                          color: "#fff",
                          border: "none",
                          width: "100%",
                          padding: "10px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: "bold",
                          cursor: "pointer",
                          transition: "0.2s",
                        }}
                      >
                        Registrar Cierre Lote
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Historial de Cierres de Caja (Reportes Z) */}
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
        <h3
          style={{
            fontSize: "16px",
            fontWeight: "800",
            color: "#111827",
            margin: "0 0 16px 0",
          }}
        >
          Historial de Cierres de Caja (Reportes Z)
        </h3>
        <div className="table-responsive">
          <table className="fiskal-table" style={{ fontSize: "13px" }}>
            <thead>
              <tr
                style={{ color: "#6b7280", borderBottom: "1px solid #e5e7eb" }}
              >
                <th>Apertura</th>
                <th>Cierre</th>
                <th>Caja</th>
                <th>Responsable</th>
                <th>Esperado</th>
                <th>Físico Contado</th>
                <th>Diferencia</th>
                <th style={{ textAlign: "center" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {!pastShifts || pastShifts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="empty-text">
                    No hay cierres de caja registrados o estás offline.
                  </td>
                </tr>
              ) : (
                pastShifts.map((s, index) => {
                  if (!s) return null;

                  const reg = (registers || []).find(
                    (r) => r?.id === s.register_id,
                  );
                  const emp = (employees || []).find(
                    (e) => e?.id === s.user_id,
                  );

                  const hSales = (sales || []).filter(
                    (sale) =>
                      sale?.shift_id === s.id && sale?.status === "completed",
                  );
                  const hCashUsd = hSales.reduce(
                    (sum, sale) => sum + (sale?.payment_details?.cash_usd || 0),
                    0,
                  );
                  const hCashBs = hSales.reduce(
                    (sum, sale) => sum + (sale?.payment_details?.cash_bs || 0),
                    0,
                  );

                  const expectedUsdDisplay =
                    (s.opening_float_usd || 0) + hCashUsd;

                  let fisicoContadoDisplay = `$${(s.actual_cash_usd || 0).toFixed(2)}`;
                  if (
                    s.notes &&
                    typeof s.notes === "string" &&
                    s.notes.includes("Contado:")
                  ) {
                    fisicoContadoDisplay = s.notes
                      .split("|")
                      .pop()
                      .trim()
                      .replace("Contado: ", "");
                  }

                  const diff = Number(s.difference_usd || 0);

                  return (
                    <tr
                      key={s.id || index}
                      style={{ borderBottom: "1px solid #f3f4f6" }}
                    >
                      <td>
                        {s.opened_at
                          ? new Date(s.opened_at).toLocaleString()
                          : ""}
                      </td>
                      <td>
                        {s.closed_at
                          ? new Date(s.closed_at).toLocaleString()
                          : "---"}
                      </td>
                      <td>
                        <strong>
                          {reg ? reg.name : `Caja #${s.register_id}`}
                        </strong>
                      </td>
                      <td>{emp ? emp.full_name : "Cajero"}</td>
                      <td>
                        <div
                          style={{ display: "flex", flexDirection: "column" }}
                        >
                          <strong>${expectedUsdDisplay.toFixed(2)}</strong>
                          {currentStoreCountry === "venezuela" &&
                            hCashBs > 0 && (
                              <span
                                style={{ fontSize: "11px", color: "#6b7280" }}
                              >
                                + Bs.{" "}
                                {hCashBs.toLocaleString("es-VE", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            )}
                        </div>
                      </td>
                      <td>
                        <strong>{fisicoContadoDisplay}</strong>
                      </td>
                      <td>
                        {diff === 0 ? (
                          <strong style={{ color: "#16a34a" }}>$0.00</strong>
                        ) : diff > 0 ? (
                          <strong style={{ color: "#16a34a" }}>
                            +${diff.toFixed(2)}
                          </strong>
                        ) : (
                          <strong style={{ color: "#e05d5d" }}>
                            -${Math.abs(diff).toFixed(2)}
                          </strong>
                        )}
                      </td>
                      <td className="action-cell">
                        <div
                          className="action-buttons"
                          style={{ justifyContent: "center" }}
                        >
                          <button
                            className="btn-icon-primary"
                            onClick={() => {
                              setSelectedShiftReport(s);
                              setShowShiftReportModal(true);
                            }}
                            title="Ver Reporte Z Detallado"
                            style={{
                              background: "#f3f4f6",
                              border: "1px solid #e5e7eb",
                              color: "#111827",
                              padding: "6px",
                              borderRadius: "4px",
                            }}
                          >
                            <Eye size={16} />
                          </button>
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
    </div>
  );
}

export default CashShiftsView;