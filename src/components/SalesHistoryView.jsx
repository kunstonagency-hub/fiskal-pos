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
    <div className="product-list-card" style={{ width: '100%', background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#111827' }}>
          Registro de Ventas y Cuentas ({filteredSales.length})
        </h3>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button 
            onClick={() => { setHistoryFilterType('all'); setHistoryCustomDate(''); }} 
            style={{ padding: '6px 12px', borderRadius: '4px', border: historyFilterType === 'all' ? '1px solid #111827' : '1px solid #d1d5db', background: historyFilterType === 'all' ? '#111827' : '#fff', color: historyFilterType === 'all' ? '#fff' : '#374151', fontSize: '12px', cursor: 'pointer', fontWeight: '700' }}
          >
            Todos
          </button>
          <button 
            onClick={() => { setHistoryFilterType('yesterday'); setHistoryCustomDate(''); }} 
            style={{ padding: '6px 12px', borderRadius: '4px', border: historyFilterType === 'yesterday' ? '1px solid #111827' : '1px solid #d1d5db', background: historyFilterType === 'yesterday' ? '#111827' : '#fff', color: historyFilterType === 'yesterday' ? '#fff' : '#374151', fontSize: '12px', cursor: 'pointer', fontWeight: '700' }}
          >
            Ayer
          </button>
          <button 
            onClick={() => { setHistoryFilterType('last_week'); setHistoryCustomDate(''); }} 
            style={{ padding: '6px 12px', borderRadius: '4px', border: historyFilterType === 'last_week' ? '1px solid #111827' : '1px solid #d1d5db', background: historyFilterType === 'last_week' ? '#111827' : '#fff', color: historyFilterType === 'last_week' ? '#fff' : '#374151', fontSize: '12px', cursor: 'pointer', fontWeight: '700' }}
          >
            Semana Pasada
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fff', border: '1px solid #d1d5db', borderRadius: '4px', padding: '2px 8px' }}>
            <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: '600' }}>Fecha:</span>
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
        <table className="fiskal-table" style={{ fontSize: '13px' }}>
          <thead>
            <tr style={{ color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>
              <th>Factura #</th>
              <th>Fecha y Hora</th>
              <th>Cliente</th>
              <th>Total USD</th>
              <th>Estatus</th>
              <th style={{ textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.length === 0 ? (
              <tr><td colSpan="6" className="empty-text">No hay ventas registradas para este filtro.</td></tr>
            ) : (
              filteredSales.map((sale) => {
                const statusLower = String(sale.status || '').trim().toLowerCase();
                const isWaitingOrder = ['pending', 'preparando', 'en preparación', 'ready', 'listo', 'espera_pago', 'en espera'].includes(statusLower);
                const isCredit = sale.status === 'credit' || (Number(sale.balance_due_usd) > 0 && !isWaitingOrder);
                const isTrulyPaid = sale.status === 'completed' && (Number(sale.balance_due_usd || 0) <= 0.01);

                return (
                  <tr key={sale.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td>
                      <strong>
                        {sale.invoice_number || (String(sale.id).startsWith('local') ? 'Pendiente' : `A-${String(sale.id).padStart(3, '0')}`)}
                      </strong>
                    </td>
                    <td>{new Date(sale.created_at).toLocaleString()}</td>
                    <td>{sale.client_name || 'Cliente General'}</td>
                    <td><strong>${Number(sale.total_usd || 0).toFixed(2)}</strong></td>
                    <td>
                      {isCredit ? (
                        <span style={{ background: '#fff5f5', color: '#e05d5d', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px', border: '1px solid #ffc9c9' }}>
                          <AlertCircle size={12}/> Crédito (${Number(sale.balance_due_usd || sale.total_usd).toFixed(2)})
                        </span>
                      ) : isWaitingOrder ? (
                        <span style={{ background: '#fff3bf', color: '#d9480f', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px', border: '1px solid #ffe066' }}>
                          <Clock size={12}/> En Espera / Cocina
                        </span>
                      ) : isTrulyPaid ? (
                        <span style={{ background: '#dcfce7', color: '#16a34a', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle size={12}/> Pagada
                        </span>
                      ) : (
                        <span style={{ background: '#f3f4f6', color: '#4b5563', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>
                          {sale.status}
                        </span>
                      )}
                    </td>
                    <td className="action-cell">
                      <div className="action-buttons" style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                        {isWaitingOrder && (
                          <button className="btn-icon-success" onClick={() => handleResumeOrder(sale)} title="Retomar cuenta para cobrar" style={{ background: '#111827', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Play size={14} /> Cobrar
                          </button>
                        )}
                        {isCredit && (
                          <button className="btn-icon-success" onClick={() => handleStartSettleCredit(sale)} title="Abonar a cuenta" style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <DollarSign size={14} /> Abonar
                          </button>
                        )}
                        {isCredit && (
                          <button className="btn-icon-whatsapp" onClick={() => sendWhatsAppReminder(sale)} title="Recordatorio WhatsApp">
                            <MessageCircle size={16} />
                          </button>
                        )}
                        <button className="btn-icon-primary" onClick={() => handleViewInvoice(sale)} title="Ver Factura" style={{ background: '#f3f4f6', border: '1px solid #d1d5db', color: '#111827', padding: '6px 8px', borderRadius: '4px' }}>
                          <Eye size={16} />
                        </button>

                        {(currentUserRole === 'owner' || currentUserRole === 'super_admin') && (
                          <button 
                            style={{ background: '#e05d5d', color: 'white', border: 'none', borderRadius: '4px', padding: '6px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            onClick={async (e) => {
                              e.stopPropagation(); 
                              const confirmDelete = window.confirm(`⚠️ ¿ESTÁS SEGURO? Estás a punto de ELIMINAR permanentemente la Factura/Pedido #${sale.invoice_number || sale.id}. Esta acción no se puede deshacer.`);
                              if (confirmDelete) {
                                try {
                                  await supabase.from('payment_history').delete().eq('sale_id', sale.id).eq('store_id', currentStoreId);
                                  await supabase.from('sales').delete().eq('id', sale.id).eq('store_id', currentStoreId);
                                  if (typeof setSales === 'function') {
                                    setSales(prevSales => prevSales.filter(s => s.id !== sale.id));
                                  }
                                } catch (err) {
                                  alert("Error al eliminar el pedido: " + err.message);
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