import React from 'react';
import { AlertCircle, Clock, CheckCircle, Play, DollarSign, MessageCircle, Eye, Trash2 } from 'lucide-react';
import { supabase } from '../supabase';

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
  setSales
}) {
  return (
    <div className="product-list-card" style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <h3 style={{ margin: 0 }}>Registro de Ventas y Cuentas ({filteredSales.length})</h3>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button 
            onClick={() => { setHistoryFilterType('all'); setHistoryCustomDate(''); }} 
            style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #ced4da', background: historyFilterType === 'all' ? '#1c7ed6' : '#fff', color: historyFilterType === 'all' ? '#fff' : '#495057', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Todos
          </button>
          <button 
            onClick={() => { setHistoryFilterType('yesterday'); setHistoryCustomDate(''); }} 
            style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #ced4da', background: historyFilterType === 'yesterday' ? '#1c7ed6' : '#fff', color: historyFilterType === 'yesterday' ? '#fff' : '#495057', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Ayer
          </button>
          <button 
            onClick={() => { setHistoryFilterType('last_week'); setHistoryCustomDate(''); }} 
            style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #ced4da', background: historyFilterType === 'last_week' ? '#1c7ed6' : '#fff', color: historyFilterType === 'last_week' ? '#fff' : '#495057', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Semana Pasada
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fff', border: '1px solid #ced4da', borderRadius: '4px', padding: '2px 6px' }}>
            <span style={{ fontSize: '11px', color: '#6c757d' }}>Fecha:</span>
            <input 
              type="date" 
              value={historyCustomDate} 
              onChange={(e) => { setHistoryCustomDate(e.target.value); setHistoryFilterType('custom'); }} 
              style={{ border: 'none', fontSize: '12px', outline: 'none', background: 'transparent' }}
            />
          </div>
        </div>
      </div>

      <div className="table-responsive">
        <table className="fiskal-table">
          <thead>
            <tr>
              <th>Factura #</th>
              <th>Fecha y Hora</th>
              <th>Cliente</th>
              <th>Total USD</th>
              <th>Saldo Pendiente</th>
              <th>Estatus</th>
              <th style={{ textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.length === 0 ? (
              <tr><td colSpan="7" className="empty-text">No hay ventas registradas para este filtro.</td></tr>
            ) : (
              filteredSales.map((sale) => (
                <tr key={sale.id}>
                  <td>
                    <strong>
                      {sale.invoice_number || (String(sale.id).startsWith('local') ? 'Pendiente' : `A-${String(sale.id).padStart(3, '0')}`)}
                    </strong>
                  </td>
                  <td>{new Date(sale.created_at).toLocaleString()}</td>
                  <td>{sale.client_name || 'Cliente General'}</td>
                  <td><strong>${sale.total_usd.toFixed(2)}</strong></td>
                  <td>
                    {sale.status === 'credit' ? (
                      <span className="badge-credit"><AlertCircle size={12}/> Crédito</span>
                    ) : ['pending', 'preparando', 'en preparación', 'ready', 'listo', 'espera_pago'].includes(String(sale.status).toLowerCase()) ? (
                      <span className="badge-pending"><Clock size={12}/> En Espera</span>
                    ) : (
                      <span className="badge-completed"><CheckCircle size={12}/> Pagada</span>
                    )}
                  </td>
                  <td className="action-cell">
                    <div className="action-buttons">
                      {['pending', 'preparando', 'en preparación', 'ready', 'listo', 'espera_pago'].includes(String(sale.status).toLowerCase()) && (
                        <button className="btn-icon-success" onClick={() => handleResumeOrder(sale)} title="Retomar cuenta"><Play size={16} /></button>
                      )}
                      {sale.status === 'credit' && (
                        <button className="btn-icon-success" onClick={() => handleStartSettleCredit(sale)} title="Abonar"><DollarSign size={16} /></button>
                      )}
                      {sale.status === 'credit' && (
                        <button className="btn-icon-whatsapp" onClick={() => sendWhatsAppReminder(sale)} title="WhatsApp"><MessageCircle size={16} /></button>
                      )}
                      <button className="btn-icon-primary" onClick={() => handleViewInvoice(sale)} title="Ver Factura"><Eye size={18} /></button>

                      {(currentUserRole === 'owner' || currentUserRole === 'super_admin') && (
                        <button 
                          style={{ background: '#fa5252', color: 'white', border: 'none', borderRadius: '4px', padding: '6px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          onClick={async (e) => {
                            e.stopPropagation(); 
                            const confirmDelete = window.confirm(`⚠️ ¿ESTÁS SEGURO? Estás a punto de ELIMINAR permanentemente la Factura/Pedido #${sale.invoice_number || sale.id}. Esta acción no se puede deshacer.`);
                            if (confirmDelete) {
                              try {
                                const { error: pErr } = await supabase.from('payment_history').delete().eq('sale_id', sale.id).eq('store_id', currentStoreId);
                                if (pErr) throw pErr;
                                const { error: sErr } = await supabase.from('sales').delete().eq('id', sale.id).eq('store_id', currentStoreId);
                                if (sErr) throw sErr;
                                if (typeof setSales === 'function') {
                                  setSales(prevSales => prevSales.filter(s => s.id !== sale.id));
                                }
                              } catch (err) {
                                console.error("Error al eliminar la factura:", err);
                                alert("Hubo un error al eliminar el pedido: " + err.message);
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default SalesHistoryView;