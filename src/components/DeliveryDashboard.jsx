import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase'; 
import { Bell, Clock, ChefHat, Truck, Check, XCircle, CreditCard, FileText } from 'lucide-react';

export default function DeliveryDashboard({ currentStoreId }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newOrderNotification, setNewOrderNotification] = useState(null);

  useEffect(() => {
    // Evitamos ejecutar la suscripción si el ID del comercio aún no ha cargado
    if (!currentStoreId) return;

    fetchActiveOrders();

    // Nombramos el canal de forma dinámica para que no colisione con otros comercios
    const channel = supabase
      .channel(`krono-orders-${currentStoreId}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'orders',
          filter: `store_id=eq.${currentStoreId}` 
        },
        (payload) => {
          // 1. Reproducir sonido de alerta del KDS
          try {
            const bell = new Audio('https://upload.wikimedia.org/wikipedia/commons/3/34/Sound_Effect_-_Door_Bell.ogg');
            bell.play().catch(err => console.log("Audio bloqueado por el navegador:", err));
          } catch(e) {}

          // 2. Mostrar alerta flotante
          const orderIdStr = String(payload.new.id);
          const orderNumber = orderIdStr.slice(-4).toUpperCase();
          setNewOrderNotification(`¡Nuevo pedido web Krono #${orderNumber}!`);

          // 3. Ocultar la alerta tras 6 segundos
          setTimeout(() => {
            setNewOrderNotification(null);
          }, 6000);

          // 4. Agregar pedido a la vista
          setOrders((prev) => [payload.new, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'orders',
          filter: `store_id=eq.${currentStoreId}` 
        },
        (payload) => {
          setOrders((prev) =>
            prev.map((order) => (order.id === payload.new.id ? payload.new : order))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentStoreId]);

  const fetchActiveOrders = async () => {
    if (!currentStoreId) return;

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('store_id', currentStoreId) // Filtro estricto de seguridad
      .not('status', 'in', '("Entregado","Rechazado")')
      .order('created_at', { ascending: false });
    
    if (data) setOrders(data);
    if (error) console.error("Error cargando pedidos:", error);
    setLoading(false);
  };

  const updateOrderStatus = async (id, newStatus) => {
    // Actualización optimista local para una interfaz más rápida (el WebSocket lo confirmará después)
    setOrders((prev) => prev.map((order) => (order.id === id ? { ...order, status: newStatus } : order)));

    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', id)
      .eq('store_id', currentStoreId);
    
    if (error) {
      alert('Error al actualizar el pedido: ' + error.message);
      fetchActiveOrders(); // Revertimos el estado visual si falla la base de datos
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Pendiente': return { bg: '#fee2e2', text: '#ef4444', icon: <Bell size={16} /> };
      case 'Preparando': return { bg: '#fef3c7', text: '#d97706', icon: <ChefHat size={16} /> };
      case 'En camino': return { bg: '#dbeafe', text: '#3b82f6', icon: <Truck size={16} /> };
      default: return { bg: '#f1f5f9', text: '#64748b', icon: <Clock size={16} /> };
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Cargando pedidos en vivo...</div>;
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui, sans-serif', position: 'relative' }}>
      
      {/* Alerta Flotante (Toast) idéntica a la lógica del KDS */}
      {newOrderNotification && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          background: '#10b981',
          color: '#fff',
          padding: '16px 24px',
          borderRadius: '12px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontWeight: 'bold',
          zIndex: 9999,
        }}>
          <Bell size={24} />
          {newOrderNotification}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bell color="#10b981" /> Pedidos Web (Krono)
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }}></span>
          <span style={{ color: '#64748b', fontSize: '14px', fontWeight: '500' }}>Conexión Activa</span>
        </div>
      </div>

      {orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 20px', background: '#fff', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
          <Clock size={48} color="#94a3b8" style={{ marginBottom: '16px' }} />
          <h3 style={{ color: '#0f172a', fontSize: '18px', margin: '0 0 8px 0' }}>Bandeja limpia</h3>
          <p style={{ color: '#64748b', margin: 0 }}>No hay pedidos activos en este momento.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
          {orders.map((order) => {
            const statusStyle = getStatusColor(order.status);
            
            let parsedItems = [];
            if (typeof order.items === 'string') {
              try { parsedItems = JSON.parse(order.items); } catch(e) { parsedItems = []; }
            } else if (Array.isArray(order.items)) {
              parsedItems = order.items;
            }

            return (
              <div key={order.id} style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                
                <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FileText size={14} /> TICKET #{order.id.slice(0, 6).toUpperCase()}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: statusStyle.bg, color: statusStyle.text, padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
                    {statusStyle.icon} {order.status}
                  </div>
                </div>

                <div style={{ padding: '16px', minHeight: '120px' }}>
                  {parsedItems.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{item.quantity || 1}x</span>
                        <span style={{ color: '#334155' }}>{item.name}</span>
                      </div>
                      <span style={{ fontWeight: '500', color: '#0f172a' }}>${Number(item.price).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div style={{ padding: '16px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ color: '#64748b', fontSize: '14px' }}>Total pagado:</span>
                    <span style={{ fontSize: '20px', fontWeight: '900', color: '#10b981' }}>${Number(order.total_amount).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569' }}>
                    <CreditCard size={14} />
                    <span style={{ textTransform: 'capitalize' }}>{order.payment_method?.replace('_', ' ') || 'No definido'}</span>
                    {order.payment_reference && (
                      <span style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                        Ref: {order.payment_reference}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ padding: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {order.status === 'Pendiente' && (
                    <>
                      <button onClick={() => updateOrderStatus(order.id, 'Preparando')} style={{ flex: 1, background: '#10b981', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
                        <Check size={16} /> Aceptar
                      </button>
                      <button onClick={() => updateOrderStatus(order.id, 'Rechazado')} style={{ flex: 1, background: '#fee2e2', color: '#ef4444', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
                        <XCircle size={16} /> Rechazar
                      </button>
                    </>
                  )}
                  {order.status === 'Preparando' && (
                    <button onClick={() => updateOrderStatus(order.id, 'En camino')} style={{ width: '100%', background: '#3b82f6', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
                      <Truck size={16} /> Despachar (En Camino)
                    </button>
                  )}
                  {order.status === 'En camino' && (
                    <button onClick={() => updateOrderStatus(order.id, 'Entregado')} style={{ width: '100%', background: '#0f172a', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
                      <Check size={16} /> Marcar Entregado
                    </button>
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