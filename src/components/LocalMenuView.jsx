import React, { useState, useEffect } from 'react';
import { ShoppingBag, Minus, Plus, Trash2, ChefHat, CheckCircle, X } from 'lucide-react';
import { supabase } from '../supabase';

export default function LocalMenuView({ storeId }) {
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [bcvRate, setBcvRate] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // NUEVO: Estado para las categorías
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  
  const [cart, setCart] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  const [qty, setQty] = useState(1);
  const [modifiers, setModifiers] = useState([]);
  const [extras, setExtras] = useState([]);

  const [showCartModal, setShowCartModal] = useState(false);
  const [clientName, setClientName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: st } = await supabase.from('stores').select('*').eq('id', storeId).single();
        if (st) setStore(st);

        const { data: prods } = await supabase.from('products').select('*').eq('store_id', storeId).order('category');
        if (prods) {
          setProducts(prods.filter(p => p.category !== 'General' && p.category !== 'Por Peso'));
        }

        const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
        if (res.ok) {
          const data = await res.json();
          setBcvRate(parseFloat(data.promedio || data.price) || 0);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [storeId]);

  const openProductModal = (prod) => {
    setSelectedProduct(prod);
    setQty(1);
    
    let modsArray = [];
    if (prod.modifiers) {
      if (Array.isArray(prod.modifiers)) modsArray = prod.modifiers;
      else if (typeof prod.modifiers === 'string') modsArray = prod.modifiers.split(',').map(s => s.trim()).filter(Boolean);
    }
    setModifiers(modsArray.map(name => ({ name, active: true })));

    let extraList = [];
    if (prod.extras) {
      if (Array.isArray(prod.extras)) extraList = prod.extras;
      else if (typeof prod.extras === 'string') {
        try { extraList = JSON.parse(prod.extras); } catch(e) {}
      }
    }
    setExtras(extraList.map(e => ({ ...e, qty: 0 })));
  };

  const handleAddToCart = () => {
    const excluded = modifiers.filter(m => !m.active).map(m => `Sin ${m.name}`);
    const activeExtras = extras.filter(e => e.qty > 0).map(e => {
      const label = e.qty > 1 ? `+ ${e.qty}x ${e.name}` : `+ ${e.name}`;
      return `${label} (+$${(Number(e.price) * e.qty).toFixed(2)})`;
    });
    
    let customizationText = excluded.length > 0 ? excluded.join(', ') : "Con todo";
    if (activeExtras.length > 0) customizationText += ` | ${activeExtras.join(', ')}`;

    const extrasTotal = extras.reduce((sum, e) => sum + (Number(e.price || 0) * (e.qty || 0)), 0);
    const unitPriceWithExtras = Number(selectedProduct.price || 0) + extrasTotal;

    const productToAdd = {
      ...selectedProduct,
      price: unitPriceWithExtras,
      basePrice: selectedProduct.price,
      quantity: qty,
      customization: customizationText,
      stock_deducted: false
    };

    setCart(prev => {
      const exists = prev.findIndex(item => item.id === productToAdd.id && item.customization === productToAdd.customization);
      if (exists > -1) {
        return prev.map((item, idx) => idx === exists ? { ...item, quantity: item.quantity + productToAdd.quantity } : item);
      }
      return [...prev, { ...productToAdd, cartId: Date.now() }];
    });

    setSelectedProduct(null);
  };

  const updateQuantity = (cartId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.cartId === cartId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);

  const handleSendOrder = async (e) => {
    e.preventDefault();
    if (!clientName.trim()) return alert("Por favor ingresa tu nombre o número de mesa.");
    setIsProcessing(true);

    const saleData = {
      store_id: storeId,
      client_name: `${clientName} (Mesa/QR)`,
      items: cart,
      total_usd: cartTotal,
      total_bs: cartTotal * (bcvRate || 1),
      subtotal_usd: cartTotal,
      tax_usd: 0,
      status: 'pending', 
      balance_due_usd: cartTotal,
      payment_details: { applied_bcv_rate: bcvRate, is_self_service: true, kitchen_sent_at: new Date().toISOString() }
    };

    try {
      const { error } = await supabase.from('sales').insert([saleData]);
      if (error) throw error;
      
      setOrderSuccess(true);
      setCart([]);
    } catch (err) {
      alert("Error enviando pedido: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '60px', fontFamily: 'sans-serif', color: '#64748b' }}>Cargando menú delicioso...</div>;
  if (!store) return <div style={{ textAlign: 'center', padding: '60px', fontFamily: 'sans-serif', color: '#dc2626' }}>Comercio no encontrado</div>;

  if (orderSuccess) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0fdf4', padding: '20px', fontFamily: 'sans-serif' }}>
        <div style={{ textAlign: 'center', background: '#fff', padding: '40px 24px', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', maxWidth: '400px', width: '100%' }}>
          <CheckCircle size={72} color="#16a34a" style={{ margin: '0 auto 20px' }} />
          <h2 style={{ color: '#111827', marginBottom: '12px', fontSize: '24px', fontWeight: '900' }}>¡Pedido en Cocina!</h2>
          <p style={{ color: '#4b5563', marginBottom: '32px', fontSize: '15px', lineHeight: '1.5' }}>Tu orden ya está siendo preparada. Al terminar o cuando desees pagar, por favor acércate a la caja indicando tu mesa o nombre: <strong style={{color: '#111827', fontSize: '16px'}}>{clientName}</strong>.</p>
          <button onClick={() => { setOrderSuccess(false); setClientName(''); setShowCartModal(false); }} style={{ background: '#111827', color: '#fff', border: 'none', width: '100%', padding: '16px', borderRadius: '12px', fontWeight: '900', fontSize: '15px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
            Hacer otro pedido
          </button>
        </div>
      </div>
    );
  }

  // LÓGICA DE CATEGORÍAS
  const categories = ['Todas', ...new Set(products.map(p => p.category || 'General'))];
  const filteredProducts = selectedCategory === 'Todas' 
    ? products 
    : products.filter(p => (p.category || 'General') === selectedCategory);

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', paddingBottom: '100px', fontFamily: 'sans-serif' }}>
      
      {/* CABECERA DEL LOCAL */}
      <div style={{ background: '#ffffff', padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        {store.image_url ? (
          <img src={store.image_url} alt={store.name} style={{ width: '56px', height: '56px', borderRadius: '14px', objectFit: 'cover', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
        ) : (
          <div style={{ width: '56px', height: '56px', background: '#111827', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <ChefHat size={28} />
          </div>
        )}
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-0.5px' }}>{store.name}</h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0, fontWeight: '600' }}>Auto-Servicio en Mesa</p>
        </div>
      </div>

      {/* FILTRO DE CATEGORÍAS DESLIZABLE */}
      {categories.length > 2 && (
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', padding: '20px 24px 10px 24px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {categories.map(cat => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '10px 20px', borderRadius: '50px', border: 'none', fontWeight: '800', fontSize: '14px', cursor: 'pointer', whiteSpace: 'nowrap',
                  background: isActive ? '#111827' : '#ffffff',
                  color: isActive ? '#ffffff' : '#475569',
                  boxShadow: isActive ? '0 4px 12px rgba(17, 24, 39, 0.2)' : '0 2px 6px rgba(0,0,0,0.04)',
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
      )}

      {/* MENÚ DE PLATILLOS */}
      <div style={{ padding: '20px 24px', maxWidth: '800px', margin: '0 auto' }}>
        
        {filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No hay productos en esta categoría.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredProducts.map(prod => (
              <div 
                key={prod.id} 
                onClick={() => openProductModal(prod)} 
                style={{ background: '#ffffff', borderRadius: '20px', padding: '16px', display: 'flex', gap: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', cursor: 'pointer', transition: 'transform 0.2s' }}
              >
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '900', margin: '0 0 6px 0', color: '#111827' }}>{prod.name}</h3>
                  {prod.description && <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 12px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.4' }}>{prod.description}</p>}
                  <strong style={{ color: '#16a34a', fontSize: '16px', fontWeight: '900' }}>${Number(prod.price).toFixed(2)}</strong>
                </div>
                {prod.image_url && (
                  <div style={{ width: '100px', height: '100px', borderRadius: '16px', overflow: 'hidden', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                    <img src={prod.image_url} alt="img" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* BOTÓN FLOTANTE DEL CARRITO */}
      {cart.length > 0 && !showCartModal && (
        <button 
          onClick={() => setShowCartModal(true)}
          style={{ position: 'fixed', bottom: '32px', left: '50%', transform: 'translateX(-50%)', background: '#16a34a', color: '#fff', border: 'none', padding: '16px 24px', borderRadius: '50px', fontWeight: '900', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 12px 30px rgba(22, 163, 74, 0.4)', zIndex: 100, width: '90%', maxWidth: '400px', justifyContent: 'space-between', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ background: '#fff', color: '#16a34a', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: '14px' }}>{cart.length}</span>
            <span>Ver mi Orden</span>
          </div>
          <span>${cartTotal.toFixed(2)}</span>
        </button>
      )}

      {/* MODAL DEL PRODUCTO (PERSONALIZACIÓN) */}
      {selectedProduct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', zIndex: 10000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '500px', borderRadius: '24px 24px 0 0', overflow: 'hidden', boxShadow: '0 -20px 50px rgba(0,0,0,0.3)', position: 'relative', display: 'flex', flexDirection: 'column', maxHeight: '90vh', animation: 'slideUp 0.3s ease-out' }}>
            
            <button onClick={() => setSelectedProduct(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.9)', color: '#0f172a', border: 'none', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
              <X size={20} />
            </button>
            
            <div style={{ width: '100%', height: '220px', background: '#f1f5f9' }}>
              {selectedProduct.image_url && <img src={selectedProduct.image_url} alt={selectedProduct.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
            
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '900', color: '#111827' }}>{selectedProduct.name}</h2>
                <strong style={{ fontSize: '22px', color: '#16a34a', fontWeight: '900' }}>${Number(selectedProduct.price).toFixed(2)}</strong>
              </div>
              {selectedProduct.description && <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 20px 0', lineHeight: '1.5' }}>{selectedProduct.description}</p>}

              {modifiers.length > 0 && (
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: '#059669', display: 'block', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>✓ Ingredientes base (Desmarca para quitar)</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {modifiers.map(m => (
                      <label key={m.name} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '15px', color: m.active ? '#0f172a' : '#94a3b8', fontWeight: m.active ? '700' : '500' }}>
                        <input type="checkbox" checked={m.active} onChange={() => setModifiers(prev => prev.map(mod => mod.name === m.name ? { ...mod, active: !mod.active } : mod))} style={{ width: '20px', height: '20px', accentColor: '#10b981' }}/>
                        <span style={{ textDecoration: m.active ? 'none' : 'line-through' }}>{m.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {extras.length > 0 && (
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: '#0f172a', display: 'block', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>⭐ Adicionales (Opcional)</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {extras.map(ex => {
                      const hasQty = (ex.qty || 0) > 0;
                      return (
                        <div key={ex.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px dashed #e2e8f0' }}>
                          <div>
                            <span style={{ fontSize: '15px', fontWeight: hasQty ? '800' : '600', color: hasQty ? '#0f172a' : '#475569', display: 'block' }}>+ {ex.name}</span>
                            <span style={{ fontSize: '13px', color: '#64748b' }}>${Number(ex.price).toFixed(2)} c/u</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {hasQty && <strong style={{ fontSize: '14px', color: '#16a34a' }}>+${(Number(ex.price) * ex.qty).toFixed(2)}</strong>}
                            <div style={{ display: 'flex', alignItems: 'center', border: hasQty ? '2px solid #16a34a' : '1px solid #cbd5e1', borderRadius: '10px', padding: '4px', background: hasQty ? '#f0fdf4' : '#fff' }}>
                              <button onClick={() => setExtras(prev => prev.map(e => e.name === ex.name ? { ...e, qty: Math.max(0, e.qty - 1) } : e))} style={{ border: 'none', background: 'none', padding: '6px 10px', cursor: 'pointer' }}><Minus size={16}/></button>
                              <span style={{ fontWeight: '900', width: '24px', textAlign: 'center', fontSize: '15px', color: '#0f172a' }}>{hasQty ? `x${ex.qty}` : '0'}</span>
                              <button onClick={() => setExtras(prev => prev.map(e => e.name === ex.name ? { ...e, qty: e.qty + 1 } : e))} style={{ border: 'none', background: 'none', padding: '6px 10px', cursor: 'pointer' }}><Plus size={16}/></button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '20px 24px', borderTop: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 -4px 15px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', border: '2px solid #e2e8f0', borderRadius: '12px', padding: '6px', background: '#f8fafc' }}>
                <button onClick={() => setQty(Math.max(1, qty - 1))} style={{ border: 'none', background: 'none', padding: '8px 12px', cursor: 'pointer' }}><Minus size={18} color="#0f172a" /></button>
                <span style={{ fontWeight: '900', minWidth: '30px', textAlign: 'center', fontSize: '18px', color: '#0f172a' }}>{qty}</span>
                <button onClick={() => setQty(qty + 1)} style={{ border: 'none', background: 'none', padding: '8px 12px', cursor: 'pointer' }}><Plus size={18} color="#0f172a" /></button>
              </div>
              <button 
                onClick={handleAddToCart}
                style={{ flex: 1, padding: '16px', background: '#111827', color: '#fff', border: 'none', borderRadius: '14px', fontWeight: '900', fontSize: '16px', cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: '12px', boxShadow: '0 8px 20px rgba(17, 24, 39, 0.25)' }}
              >
                <span>Agregar</span>
                <span>${( (Number(selectedProduct.price) + extras.reduce((sum, e) => sum + (Number(e.price) * e.qty), 0)) * qty ).toFixed(2)}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DEL CARRITO Y ENVÍO A CAJA */}
      {showCartModal && (
        <div style={{ position: 'fixed', inset: 0, background: '#f8fafc', zIndex: 99999, display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.2s' }}>
          <div style={{ background: '#fff', padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
            <button onClick={() => setShowCartModal(false)} style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '50%' }}><X size={20} color="#111827" /></button>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: '#0f172a' }}>Mi Orden</h2>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '24px', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
            {cart.map(item => (
              <div key={item.cartId} style={{ display: 'flex', alignItems: 'center', background: '#fff', padding: '20px', borderRadius: '20px', border: '1px solid #e2e8f0', marginBottom: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                <div style={{ flex: 1, paddingRight: '12px' }}>
                  <strong style={{ display: 'block', fontSize: '16px', color: '#0f172a', fontWeight: '900' }}>{item.name}</strong>
                  {item.customization && <span style={{ fontSize: '13px', color: '#d97706', display: 'block', marginTop: '6px', fontWeight: '600', lineHeight: '1.4' }}>{item.customization}</span>}
                  <span style={{ fontSize: '16px', fontWeight: '900', color: '#16a34a', display: 'block', marginTop: '8px' }}>${(Number(item.price) * item.quantity).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
                  <button onClick={() => updateQuantity(item.cartId, -99)} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}><Trash2 size={18}/></button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '6px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <button onClick={() => updateQuantity(item.cartId, -1)} style={{ border: 'none', background: '#fff', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}><Minus size={16} style={{margin:'0 auto'}}/></button>
                    <span style={{ fontWeight: '900', width: '24px', textAlign: 'center', fontSize: '15px' }}>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.cartId, 1)} style={{ border: 'none', background: '#fff', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}><Plus size={16} style={{margin:'0 auto'}}/></button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: '#fff', borderTop: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 -10px 25px rgba(0,0,0,0.05)' }}>
            <form onSubmit={handleSendOrder} style={{ maxWidth: '600px', margin: '0 auto' }}>
              <div style={{ marginBottom: '20px', background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <label style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block', letterSpacing: '0.5px' }}>¿Quién recibe? / Mesa</label>
                <input 
                  type="text" 
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  placeholder="Ej. Carlos / Mesa 4" 
                  required
                  style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '16px', outline: 'none', fontWeight: 'bold' }} 
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <span style={{ fontSize: '16px', fontWeight: '800', color: '#475569' }}>Total a Pagar</span>
                <div style={{ textAlign: 'right' }}>
                  <h2 style={{ margin: 0, fontSize: '28px', color: '#111827', fontWeight: '900' }}>${cartTotal.toFixed(2)}</h2>
                  <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '700' }}>Bs. {(cartTotal * bcvRate).toLocaleString('es-VE', {minimumFractionDigits: 2})}</span>
                </div>
              </div>
              <button type="submit" disabled={isProcessing} style={{ width: '100%', padding: '18px', background: '#111827', color: '#fff', border: 'none', borderRadius: '16px', fontSize: '16px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 8px 20px rgba(17, 24, 39, 0.25)' }}>
                {isProcessing ? 'Enviando a cocina...' : 'Enviar Orden a Cocina'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}