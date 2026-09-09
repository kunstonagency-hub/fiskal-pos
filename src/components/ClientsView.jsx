import React from 'react';
import { PlusCircle, MessageCircle, Eye, Trash2 } from 'lucide-react';

function ClientsView({
  clientName,
  setClientName,
  clientDoc,
  setClientDoc,
  clientPhone,
  setClientPhone,
  clientEmail,
  setClientEmail,
  handleAddClient,
  loadingClient,
  clientFilterTab,
  setClientFilterTab,
  clientsWithMetrics,
  getFilteredClientsByTab,
  handleOpenClientDetail,
  sendClientGeneralWhatsApp,
  currentUserRole,
  handleDeleteClient
}) {
  return (
    <div className="products-layout">
      <div className="product-form-card">
        <h3>Registrar Nuevo Cliente</h3>
        <form onSubmit={(e) => handleAddClient(e, false)} className="fiskal-form">
          <div className="form-group">
            <label>Nombre y Apellido / Razón Social</label>
            <input 
              type="text" 
              value={clientName} 
              onChange={(e) => setClientName(e.target.value)} 
              required 
              placeholder="Ej. Inversiones C.A." 
            />
          </div>
          <div className="form-group">
            <label>Cédula / RIF</label>
            <input 
              type="text" 
              value={clientDoc} 
              onChange={(e) => setClientDoc(e.target.value)} 
              required 
              placeholder="Ej. V-12345678" 
            />
          </div>
          <div className="form-group">
            <label>Teléfono</label>
            <input 
              type="text" 
              value={clientPhone} 
              onChange={(e) => setClientPhone(e.target.value)} 
              placeholder="Ej. 0414-1234567" 
            />
          </div>
          <div className="form-group">
            <label>Correo Electrónico</label>
            <input 
              type="email" 
              value={clientEmail} 
              onChange={(e) => setClientEmail(e.target.value)} 
              placeholder="correo@ejemplo.com" 
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loadingClient}>
            <PlusCircle size={18} /> {loadingClient ? 'Guardando...' : 'Guardar Cliente'}
          </button>
        </form>
      </div>

      <div className="product-list-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ margin: 0 }}>Directorio y Filtrado de Clientes</h3>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button 
              onClick={() => setClientFilterTab('all')} 
              style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #ced4da', background: clientFilterTab === 'all' ? '#1c7ed6' : '#fff', color: clientFilterTab === 'all' ? '#fff' : '#495057', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Todos ({clientsWithMetrics.length})
            </button>
            <button 
              onClick={() => setClientFilterTab('best')} 
              style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #ced4da', background: clientFilterTab === 'best' ? '#2b8a3e' : '#fff', color: clientFilterTab === 'best' ? '#fff' : '#495057', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              ⭐ Mejor Cliente
            </button>
            <button 
              onClick={() => setClientFilterTab('debtors')} 
              style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #ced4da', background: clientFilterTab === 'debtors' ? '#fa5252' : '#fff', color: clientFilterTab === 'debtors' ? '#fff' : '#495057', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              ⚠️ Morosos ({clientsWithMetrics.filter(c => c.totalPending > 0).length})
            </button>
            <button 
              onClick={() => setClientFilterTab('frequent')} 
              style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #ced4da', background: clientFilterTab === 'frequent' ? '#ae3ec9' : '#fff', color: clientFilterTab === 'frequent' ? '#fff' : '#495057', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              🔥 Más Frecuentes
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="fiskal-table">
            <thead>
              <tr>
                <th>Cliente & Cédula</th>
                <th>Total Facturado</th>
                <th>Saldo Pendiente</th>
                <th>Compras</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {getFilteredClientsByTab().length === 0 ? (
                <tr><td colSpan="5" className="empty-text">No hay clientes que coincidan con este filtro.</td></tr>
              ) : (
                getFilteredClientsByTab().map((cli) => (
                  <tr key={cli.id} style={{ cursor: 'pointer' }} onClick={() => handleOpenClientDetail(cli)} title="Haz clic para ver historial y notas">
                    <td>
                      <strong>{cli.name}</strong><br/>
                      <span style={{ fontSize: '11px', color: '#6c757d' }}>{cli.document || 'Sin Cédula'} | {cli.phone || 'Sin Telf'}</span>
                    </td>
                    <td><strong>${cli.totalBilled.toFixed(2)}</strong></td>
                    <td>
                      {cli.totalPending > 0 ? (
                        <span style={{ color: '#fa5252', fontWeight: 'bold' }}>${cli.totalPending.toFixed(2)}</span>
                      ) : (<span style={{ color: '#2b8a3e' }}>$0.00</span>)}
                    </td>
                    <td><span style={{ background: '#f1f3f5', padding: '2px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold' }}>{cli.salesCount}</span></td>
                    <td className="action-cell" onClick={(e) => e.stopPropagation()}>
                      <div className="action-buttons">
                        {cli.totalPending > 0 && cli.phone && (
                          <button className="btn-icon-whatsapp" onClick={() => sendClientGeneralWhatsApp(cli, cli.totalPending)} title="Cobro por WhatsApp">
                            <MessageCircle size={16} />
                          </button>
                        )}
                        <button className="btn-icon-primary" onClick={() => handleOpenClientDetail(cli)} title="Ver Historial y Notas">
                          <Eye size={16} />
                        </button>
                        {(currentUserRole === 'owner' || currentUserRole === 'super_admin') && (
                          <button className="btn-icon-danger" onClick={() => handleDeleteClient(cli.id)} title="Eliminar">
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
    </div>
  );
}

export default ClientsView;