import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase'; 
import { Bell, Clock, ChefHat, Truck, Check, XCircle, CreditCard, FileText } from 'lucide-react';

export default function DeliveryDashboard({ currentStoreId }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newOrderNotification, setNewOrderNotification] = useState(null);

  useEffect(() => {
    if (!currentStoreId) return;

    fetchActiveOrders();

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
          try {
            const bell = new Audio('https://upload.wikimedia.org/wikipedia/commons/3/34/Sound_Effect_-_Door_Bell.ogg');
            bell.play().catch(err => console.log("Audio bloqueado por el navegador:", err));
          } catch(e) {}

          const orderIdStr = String(payload.new.id);
          const orderNumber = orderIdStr.slice(-4).toUpperCase();
          setNewOrderNotification(`¡Nuevo pedido web Krono #${orderNumber}!`);

          setTimeout(() => {
            setNewOrderNotification(null);
          }, 6000);

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
      .eq('store_id', currentStoreId)
      .not('status', 'in', '("Entregado","Rechazado")')
      .order('created_at', { ascending: false });
    
    if (data) setOrders(data);
    if (error) console.error("Error cargando pedidos:", error);
    setLoading(false);
  };

  const updateOrderStatus = async (id, newStatus) => {
    const currentOrder = orders.find(o => o.id === id);
    
    setOrders((prev) => prev.map((order) => (order.id === id ? { ...order, status: newStatus } : order)));

    try {
      if (newStatus === 'Preparando' && currentOrder) {
        let clientDisplayName = "Cliente Krono";

        if (currentOrder.customer_info) {
          const { nombre, apellido } = currentOrder.customer_info;
          clientDisplayName = `${nombre} ${apellido} (Krono)`.trim();
        }

        let parsedItems = [];
        if (typeof currentOrder.items === 'string') {
          try { parsedItems = JSON.parse(currentOrder.items); } catch(e) { parsedItems = []; }
        } else if (Array.isArray(currentOrder.items)) {
          parsedItems = currentOrder.items;
        }

        const formattedSalesItems = parsedItems.map(item => ({
          id: item.id || 0,
          name: item.name,
          price: Number(item.price),
          quantity: item.quantity || 1,
          cost: item.cost || 0
        }));

        const payMethod = currentOrder.payment_method || 'efectivo';
        const paymentDetailsObj = {
          cash_usd: payMethod === 'efectivo' ? Number(currentOrder.total_amount) : 0,
          cash_bs: 0,
          zelle: payMethod === 'zelle' ? Number(currentOrder.total_amount) : 0,
          debit: payMethod === 'pago_movil' ? Number(currentOrder.total_amount) : 0,
          reference: currentOrder.payment_reference || ''
        };

        const { error: saleError } = await supabase
          .from('sales')
          .insert([{
            store_id: currentStoreId,
            client_name: clientDisplayName,
            items: formattedSalesItems,
            total_usd: Number(currentOrder.total_amount),
            total_bs: Number(currentOrder.total_amount) * 35,
            payment_details: paymentDetailsObj,
            status: 'completed'
          }]);

        if (saleError) {
          console.error("Error registrando la venta en Fiskal:", saleError);
          alert("El pedido se actualizó, pero hubo un detalle al insertar en 'sales': " + saleError.message);
        }
      }

      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', id)
        .eq('store_id', currentStoreId);
      
      if (error) throw error;

    } catch (error) {
      alert('Error al actualizar el pedido: ' + error.message);
      fetchActiveOrders();
    }
  };

  const handleWhatsAppContact = (order) => {
    if (!order.customer_info?.telefono) {
      alert("El cliente no ha proporcionado un número de teléfono.");
      return;
    }

    // 1. Limpieza de caracteres: dejamos solo los números
    let phone = order.customer_info.telefono.replace(/\D/g, ''); 

    // 2. Corrección inteligente de prefijos (Formato Venezuela)
    if (phone.startsWith('0')) {
      // De '04141234567' a '584141234567'
      phone = '58' + phone.substring(1);
    } else if (phone.startsWith('580')) {
      // De '5804141234567' a '584141234567'
      phone = '58' + phone.substring(3);
    } else if (phone.length === 10 && !phone.startsWith('58')) {
      // De '4141234567' a '584141234567'
      phone = '58' + phone;
    }

    const customerName = `${order.customer_info.nombre} ${order.customer_info.apellido}`;

    let parsedItems = [];
    if (typeof order.items === 'string') {
      try { parsedItems = JSON.parse(order.items); } catch(e) { parsedItems = []; }
    } else if (Array.isArray(order.items)) {
      parsedItems = order.items;
    }

    const itemsSummary = parsedItems
      .map(item => `• ${item.quantity || 1}x ${item.name} ($${Number(item.price).toFixed(2)})`)
      .join('\n');

    const paymentText = order.payment_method?.replace('_', ' ').toUpperCase() || 'No definido';
    const refText = order.payment_reference ? ` (Ref: ${order.payment_reference})` : '';

    const message = `¡Hola ${customerName}! 👋 Te escribimos desde el comercio para confirmar los detalles de tu pedido en Krono:\n\n${itemsSummary}\n\n💰 *Total a pagar:* $${Number(order.total_amount).toFixed(2)}\n💳 *Método de pago:* ${paymentText}${refText}\n\n¿Nos confirmas si todo está correcto para proceder? ¡Gracias!`;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
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
                  {order.customer_info && (
                    <div style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px dashed #cbd5e1', fontSize: '13px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}>
                            {order.customer_info.nombre} {order.customer_info.apellido} (Krono)
                          </div>
                          <div style={{ color: '#64748b' }}>C.I: {order.customer_info.cedula}</div>
                          <div style={{ color: '#64748b' }}>Tel: {order.customer_info.telefono}</div>
                        </div>
                        <button 
                          onClick={() => handleWhatsAppContact(order)}
                          style={{
                            background: '#25D366',
                            color: '#fff',
                            border: 'none',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                          }}
                          title="Enviar resumen por WhatsApp"
                        >
                          💬 WhatsApp
                        </button>
                      </div>
                    </div>
                  )}

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
                        <Check size={16} /> Aceptar Venta
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