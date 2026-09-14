import React from "react";
import { Lock, Eye } from "lucide-react";

// Vista de turnos y arqueo de caja.
// Aquí se gestiona la apertura/cierre del turno, el resumen del fondo inicial y el historial
// de cierres de caja con sus diferencias físicas y reportes Z.
function CashShiftsView({
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
