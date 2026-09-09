import React from 'react';
import { Lock, Eye } from 'lucide-react';

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
  setShowOpenShiftModal,
  pastShifts,
  registers,
  employees,
  sales,
  setSelectedShiftReport,
  setShowShiftReportModal
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '900px', margin: '0 auto', width: '100%' }}>
      <div className="product-form-card" style={{ width: '100%' }}>
        <h3>Gestión de Turno y Arqueo de Caja</h3>
        
        {currentShift ? (
          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <span className="badge-completed">CAJA ABIERTA: {getCurrentRegisterName()}</span>
                <p style={{ fontSize: '13px', color: '#6c757d', marginTop: '4px' }}>Iniciado el: {new Date(currentShift.opened_at).toLocaleString()}</p>
              </div>
              <button className="btn-primary" onClick={() => setShowCloseShiftModal(true)} style={{ background: '#fa5252' }}>
                Cerrar Turno (Reporte Z)
              </button>
            </div>

            <div className="payment-summary-box" style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginBottom: '20px' }}>
              {(() => {
                const floatUsd = Number(currentShift?.opening_float_usd || 0);
                const match = (currentShift?.notes || '').match(/FondoBs:([0-9.]+)/);
                const floatBs = match ? parseFloat(match[1]) : Number(currentShift?.opening_float_ves || currentShift?.opening_float_bs || 0);

                const expectedUsd = floatUsd + shiftCashUSD;
                const expectedBs = floatBs + shiftCashBs;

                return (
                  <>
                    {/* Tarjeta 1: Fondo Inicial */}
                    <div style={{ background: '#f8f9fa', padding: '14px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
                      <span style={{ fontSize: '12px', color: '#6c757d', fontWeight: 'bold', textTransform: 'uppercase' }}>Fondo Inicial de Caja:</span>
                      <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#495057' }}>
                          ${floatUsd.toFixed(2)} <span style={{ fontSize: '12px', color: '#adb5bd' }}>USD</span>
                        </div>
                        {(!currentStoreCountry || currentStoreCountry.toLowerCase().includes('venezuela')) && (
                          <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#495057' }}>
                            Bs. {floatBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tarjeta 2: Ingresos del Turno */}
                    <div style={{ background: '#f8f9fa', padding: '14px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
                      <span style={{ fontSize: '12px', color: '#6c757d', fontWeight: 'bold', textTransform: 'uppercase' }}>Ingresos del Turno:</span>
                      <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#2b8a3e' }}>
                          ${(shiftCashUSD + shiftZelle).toFixed(2)} <span style={{ fontSize: '12px', color: '#6c757d' }}>USD (Efectivo + Zelle)</span>
                        </div>
                        {(!currentStoreCountry || currentStoreCountry.toLowerCase().includes('venezuela')) && (
                          <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#2b8a3e' }}>
                            Bs. {(shiftCashBs + shiftPagoMovilBs + shiftDebitBs).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style={{ fontSize: '12px', color: '#6c757d' }}>(Efectivo + Digital)</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tarjeta 3: Efectivo Físico Esperado en Gaveta */}
                    <div style={{ background: '#e7f5ff', padding: '14px', borderRadius: '8px', border: '1px solid #74c0fc' }}>
                      <span style={{ fontSize: '12px', color: '#1864ab', fontWeight: 'bold', textTransform: 'uppercase' }}>Efectivo Esperado en Gaveta:</span>
                      <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#212529' }}>
                          ${expectedUsd.toFixed(2)} <span style={{ fontSize: '12px', color: '#6c757d' }}>Físico USD</span>
                        </div>
                        {(!currentStoreCountry || currentStoreCountry.toLowerCase().includes('venezuela')) && (
                          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#2b8a3e' }}>
                            Bs. {expectedBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style={{ fontSize: '12px', color: '#6c757d' }}>Físico Bs</span>
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
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <Lock size={48} color="#6c757d" style={{ marginBottom: '16px' }} />
            <h4>No hay ningún turno de caja abierto</h4>
            <p style={{ color: '#6c757d', fontSize: '14px', margin: '8px 0 24px 0' }}>Selecciona una de tus cajas físicas registradas para iniciar operaciones.</p>
            <button className="btn-primary" onClick={() => setShowOpenShiftModal(true)} style={{ margin: '0 auto' }}>Abrir Nueva Caja / Turno</button>
          </div>
        )}
      </div>

      {/* Historial de Cierres de Caja (Reportes Z) */}
      <div className="product-list-card" style={{ width: '100%' }}>
        <h3>Historial de Cierres de Caja (Reportes Z)</h3>
        <div className="table-responsive">
          <table className="fiskal-table">
            <thead>
              <tr>
                <th>Apertura</th>
                <th>Cierre</th>
                <th>Caja</th>
                <th>Responsable</th>
                <th>Esperado</th>
                <th>Físico Contado</th>
                <th>Diferencia</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {!pastShifts || pastShifts.length === 0 ? (
                <tr><td colSpan="8" className="empty-text">No hay cierres de caja registrados o estás offline.</td></tr>
              ) : (
                pastShifts.map((s, index) => {
                  if (!s) return null;

                  const reg = (registers || []).find(r => r?.id === s.register_id);
                  const emp = (employees || []).find(e => e?.id === s.user_id);
                  
                  const hSales = (sales || []).filter(sale => sale?.shift_id === s.id && sale?.status === 'completed');
                  const hCashUsd = hSales.reduce((sum, sale) => sum + (sale?.payment_details?.cash_usd || 0), 0);
                  const hCashBs = hSales.reduce((sum, sale) => sum + (sale?.payment_details?.cash_bs || 0), 0);
                  
                  const expectedUsdDisplay = (s.opening_float_usd || 0) + hCashUsd;

                  let fisicoContadoDisplay = `$${(s.actual_cash_usd || 0).toFixed(2)}`;
                  if (s.notes && typeof s.notes === 'string' && s.notes.includes('Contado:')) {
                    fisicoContadoDisplay = s.notes.split('|').pop().trim().replace('Contado: ', '');
                  }

                  return (
                    <tr key={s.id || index}>
                      <td>{s.opened_at ? new Date(s.opened_at).toLocaleString() : ''}</td>
                      <td>{s.closed_at ? new Date(s.closed_at).toLocaleString() : '---'}</td>
                      <td><strong>{reg ? reg.name : `Caja #${s.register_id}`}</strong></td>
                      <td>{emp ? emp.full_name : 'Cajero'}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <strong>${expectedUsdDisplay.toFixed(2)}</strong>
                          {currentStoreCountry === 'venezuela' && hCashBs > 0 && (
                            <span style={{ fontSize: '11px', color: '#6c757d' }}>+ Bs. {hCashBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <strong>{fisicoContadoDisplay}</strong>
                      </td>
                      <td>
                        <strong style={{ color: (s.difference_usd || 0) < 0 ? '#fa5252' : '#2b8a3e' }}>
                          ${(s.difference_usd || 0).toFixed(2)}
                        </strong>
                      </td>
                      <td className="action-cell">
                        <div className="action-buttons" style={{ justifyContent: 'center' }}>
                          <button className="btn-icon-primary" onClick={() => { setSelectedShiftReport(s); setShowShiftReportModal(true); }} title="Ver Reporte Z Detallado">
                            <Eye size={18} />
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