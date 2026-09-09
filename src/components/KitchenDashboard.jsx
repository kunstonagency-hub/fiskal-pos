import React from 'react';
import { supabase } from '../supabase';

export default function KitchenDashboard({ sales, setSales, currentStoreId }) {
  const generalKeywords = ['toddy', 'harina', 'azucar', 'galletas', 'citrato', 'disco duro', 'cronch', 'palitos', 'pepsi', 'coca cola', 'refresco', 'agua', 'cerveza'];

  const getItems = (s) => {
    if (!s) return [];
    if (Array.isArray(s.items)) return s.items;
    if (typeof s.items === 'string') { try { return JSON.parse(s.items); } catch(e){} }
    if (Array.isArray(s.cart)) return s.cart;
    if (typeof s.cart === 'string') { try { return JSON.parse(s.cart); } catch(e){} }
    return [];
  };

  const rawOrders = (typeof sales !== 'undefined' && Array.isArray(sales)) ? sales : [];

  const waitingOrders = rawOrders.filter(s => {
    if (!s) return false;
    const status = String(s.status || s.estatus || s.state || '').trim().toLowerCase();
    
    if (['completed', 'pagada', 'paid', 'credit', 'crédito'].includes(status)) return false;
    
    const validKitchenStates = ['pending', 'en espera', 'pendiente', 'preparando', 'en preparación', 'ready', 'listo', 'espera_pago'];
    if (!validKitchenStates.includes(status)) return false;

    const itemsList = getItems(s);
    if (itemsList.length === 0) return false;

    const kitchenItems = itemsList.filter(item => {
      const name = String(item.name || '').toLowerCase();
      return !generalKeywords.some(gk => name.includes(gk));
    });

    return kitchenItems.length > 0;
  });

  return (
    <div 
      id="kds-panel"
      style={{ padding: '24px', background: '#f8f9fa', minHeight: '100vh', width: '100%', boxSizing: 'border-box', overflowY: 'auto' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#212529', letterSpacing: '-0.5px' }}>Panel de Cocina (KDS)</h2>
          <p style={{ fontSize: '13px', color: '#868e96', margin: '4px 0 0 0' }}>Gestión de comandas en tiempo real</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => {
              const panel = document.getElementById('kds-panel');
              if (!document.fullscreenElement) {
                if (panel && panel.requestFullscreen) {
                  panel.requestFullscreen().catch(err => console.error("Error fullscreen:", err));
                }
              } else {
                if (document.exitFullscreen) document.exitFullscreen();
              }
            }}
            style={{ background: '#212529', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            🖥️ Pantalla Completa
          </button>

          <span style={{ background: '#2b8a3e', color: '#fff', padding: '8px 16px', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', background: '#51cf66', borderRadius: '50%', display: 'inline-block' }}></span> En Vivo
          </span>
        </div>
      </div>

      {waitingOrders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', background: '#fff', borderRadius: '4px', border: '1px solid #dee2e6' }}>
          <p style={{ color: '#868e96', fontSize: '15px', margin: 0 }}>
            No hay comandas pendientes en este momento.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {waitingOrders.map((order, index) => {
            const orderId = order && order.id ? order.id.toString() : String(index + 1);
            
            const itemsList = getItems(order).filter(item => {
              const name = String(item.name || '').toLowerCase();
              return !generalKeywords.some(gk => name.includes(gk));
            });
            
            const currentStatus = String(order.status || order.estatus || 'pending').trim().toLowerCase();
            const isPreparing = currentStatus === 'preparando' || currentStatus === 'en preparación';
            const isReady = currentStatus === 'ready' || currentStatus === 'listo' || currentStatus === 'espera_pago';

            let headerBg = '#e03131'; 
            let headerColor = '#fff';
            let borderColor = '#e03131';
            let statusText = 'PENDIENTE';

            if (isPreparing) {
              headerBg = '#fab005'; 
              headerColor = '#212529';
              borderColor = '#fab005';
              statusText = 'PREPARANDO';
            } else if (isReady) {
              headerBg = '#2b8a3e'; 
              headerColor = '#fff';
              borderColor = '#2b8a3e';
              statusText = 'LISTO PARA ENTREGAR';
            }

            const timeStr = order.created_at ? new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--';

            return (
              <div key={order && order.id ? order.id : index} style={{ background: '#fff', borderRadius: '4px', border: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                <div style={{ background: headerBg, color: headerColor, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <strong style={{ fontSize: '18px', lineHeight: 1 }}>#{orderId.slice(-4)}</strong>
                    <span style={{ fontSize: '11px', opacity: 0.9 }}>{timeStr}</span>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.5px' }}>{statusText}</span>
                </div>

                <div style={{ padding: '16px', flex: 1 }}>
                  {itemsList.map((item, i) => {
                    const itemName = item && item.name ? item.name : 'Producto';
                    const itemQty = item && item.quantity ? item.quantity : 1;
                    const customizationText = item.customization || item.customNote || '';

                    return (
                      <div key={i} style={{ paddingBottom: '12px', marginBottom: '12px', borderBottom: i === itemsList.length - 1 ? 'none' : '1px dashed #e9ecef' }}>
                        <div style={{ fontWeight: '600', fontSize: '16px', color: '#212529' }}>{itemQty} x {itemName}</div>
                        
                        {customizationText && (
                          <div style={{ 
                            fontSize: '14px', 
                            color: customizationText === 'Con todo' ? '#1c7ed6' : '#e03131', 
                            marginTop: '4px', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '2px', 
                            paddingLeft: '8px', 
                            borderLeft: `2px solid ${customizationText === 'Con todo' ? '#a5d8ff' : '#ffc9c9'}` 
                          }}>
                            <span style={{ fontWeight: 'bold' }}>• {customizationText}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', borderTop: `1px solid ${borderColor}` }}>
                  {!isPreparing && !isReady && (
                    <button 
                      onClick={async (e) => {
                        e.currentTarget.blur();
                        if (typeof setSales === 'function') {
                          setSales(sales.map(s => s.id === order.id ? { ...s, status: 'preparando' } : s));
                        }
                        try {
                          await supabase.from('sales').update({ status: 'preparando' }).eq('id', order.id).eq('store_id', currentStoreId);
                        } catch (err) { console.error("Error al actualizar estatus:", err); }
                      }}
                      style={{ flex: 1, background: '#fff', color: '#e03131', border: 'none', padding: '14px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}
                    >
                      Preparar
                    </button>
                  )}

                  {!isReady && (
                    <button 
                      onClick={async (e) => {
                        e.currentTarget.blur();
                        if (typeof setSales === 'function') {
                          setSales(sales.map(s => s.id === order.id ? { ...s, status: 'ready' } : s));
                        }
                        try {
                          await supabase.from('sales').update({ status: 'ready' }).eq('id', order.id).eq('store_id', currentStoreId);
                        } catch (err) { console.error("Error al actualizar estatus:", err); }
                      }}
                      style={{ flex: 1, background: isPreparing ? '#fab005' : '#f8f9fa', color: isPreparing ? '#212529' : '#868e96', border: 'none', borderLeft: isPreparing ? 'none' : '1px solid #dee2e6', padding: '14px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}
                    >
                      Despachar
                    </button>
                  )}

                  {isReady && (
                    <div style={{ width: '100%', textAlign: 'center', padding: '14px', background: '#2b8a3e', color: '#fff', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Esperando Mesonero
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