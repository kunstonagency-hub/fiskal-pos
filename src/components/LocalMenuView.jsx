import React, { useState, useEffect } from 'react';
import { ShoppingBag, Minus, Plus, Trash2, ChefHat, CheckCircle, X, MapPin, Phone, Navigation, User, Search, Map as MapIcon } from 'lucide-react';
import { supabase } from '../supabase';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Ícono personalizado para el mapa
const customIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Componente para poder arrastrar el PIN en el mapa
function DraggableMarker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    }
  });
  return position === null ? null : (
    <Marker 
      position={position} 
      draggable={true} 
      eventHandlers={{ dragend: (e) => setPosition(e.target.getLatLng()) }} 
      icon={customIcon} 
    />
  );
}

function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export default function LocalMenuView({ storeId }) {
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [bcvRate, setBcvRate] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Detectar si el cliente entró por el enlace de WhatsApp (Delivery)
  const isDelivery = new URLSearchParams(window.location.search).get('mode') === 'delivery';
  
  // Estado para las categorías
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  
  const [cart, setCart] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  const [qty, setQty] = useState(1);
  const [modifiers, setModifiers] = useState([]);
  const [extras, setExtras] = useState([]);

  const [showCartModal, setShowCartModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  // Estados del Formulario del Cliente
  const [clientDoc, setClientDoc] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryRef, setDeliveryRef] = useState('');
  
  // Estados para Búsqueda de Cliente y Mapa
  const [isSearchingClient, setIsSearchingClient] = useState(false);
  const [clientFound, setClientFound] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapPos, setMapPos] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: st } = await supabase.from('stores').select('*').eq('id', storeId).single();
        if (st) setStore(st);

        const { data: prods } = await supabase.from('products').select('*').eq('store_id', storeId).order('category');
        if (prods && st) {
          // Si es un restaurante, ocultamos la categoría 'General' y 'Por Peso'
          if (st.store_type === 'restaurant') {
            setProducts(prods.filter(p => p.category !== 'General' && p.category !== 'Por Peso'));
          } else {
            // Si es COMERCIO GENERAL, mostramos TODO (excepto 'Por Peso' para evitar líos online)
            setProducts(prods.filter(p => p.category !== 'Por Peso').map(p => ({
              ...p,
              category: p.category ? p.category.trim() : 'General'
            })));
          }
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

  // BÚSQUEDA AUTOMÁTICA DE CLIENTE AL PERDER EL FOCO EN LA CÉDULA
  const handleSearchClient = async () => {
    const doc = clientDoc.trim();
    if (!doc || doc.length < 4) return;
    
    setIsSearchingClient(true);
    setClientFound(false);
    try {
      const { data } = await supabase
        .from('clients')
        .select('name, phone')
        .eq('store_id', storeId)
        .eq('document', doc)
        .maybeSingle();

      if (data) {
        setClientName(data.name || '');
        if (data.phone) setClientPhone(data.phone);
        setClientFound(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingClient(false);
    }
  };

  // CAPTURA Y MAPA GPS
  const handleOpenMap = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setMapPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setShowMapModal(true);
        },
        () => {
          // Si falla, abrimos el mapa en la ubicación de la tienda
          setMapPos({ lat: store?.lat || 10.4806, lng: store?.lng || -66.9036 });
          setShowMapModal(true);
        },
        { enableHighAccuracy: true }
      );
    } else {
      setMapPos({ lat: store?.lat || 10.4806, lng: store?.lng || -66.9036 });
      setShowMapModal(true);
    }
  };

  const confirmMapLocation = () => {
    if (mapPos) {
      const link = `https://maps.google.com/?q=${mapPos.lat},${mapPos.lng}`;
      setDeliveryRef(prev => prev ? `${prev}\nGPS: ${link}` : `GPS: ${link}`);
    }
    setShowMapModal(false);
  };

  const openProductModal = (prod) => {
    setSelectedProduct(prod);
    setQty(1);
    
    // Filtro estricto para evitar que salgan modificadores basura o vacíos
    let modsArray = [];
    if (prod.modifiers) {
      if (typeof prod.modifiers === 'string') {
        modsArray = prod.modifiers.split(',').map(s => s.trim()).filter(s => s && s.toLowerCase() !== 'null' && s.toLowerCase() !== 'undefined' && s !== '[]');
      } else if (Array.isArray(prod.modifiers)) {
        modsArray = prod.modifiers.filter(s => s && String(s).toLowerCase() !== 'null' && String(s).toLowerCase() !== 'undefined');
      }
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

    // Limpiamos si era "Con todo" pero el producto realmente no tenía ingredientes
    if (modifiers.length === 0 && activeExtras.length === 0) {
      customizationText = "";
    } else if (modifiers.length === 0 && activeExtras.length > 0) {
      customizationText = activeExtras.join(', ');
    }

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
    
    if (isDelivery) {
      if (!clientName.trim() || !clientPhone.trim() || !deliveryAddress.trim() || !clientDoc.trim()) {
        return alert("Por favor completa tu cédula, nombre, teléfono y dirección de entrega.");
      }
    } else {
      if (!clientName.trim() || !clientDoc.trim()) {
        return alert("Por favor ingresa tu cédula y nombre/mesa.");
      }
    }
    
    setIsProcessing(true);

    // --- NUEVO: Validar y Auto-Registrar Cliente en la Base de Datos ---
    let finalClientName = clientName.trim();
    try {
      const { data: existingClient } = await supabase
        .from('clients')
        .select('*')
        .eq('document', clientDoc.trim())
        .eq('store_id', storeId)
        .maybeSingle();

      if (!existingClient) {
        // El cliente es nuevo, lo guardamos para el futuro
        await supabase.from('clients').insert([{
          store_id: storeId,
          document: clientDoc.trim(),
          name: finalClientName,
          phone: clientPhone.trim() || null,
        }]);
      } else {
        // El cliente existe, usamos el nombre EXACTO de la base de datos
        finalClientName = existingClient.name; 
      }
    } catch(err) { console.error("Error con cliente:", err); }

    const saleData = {
      store_id: storeId,
      client_name: finalClientName, // <--- Nombre real vinculado a la BD
      items: cart,
      total_usd: cartTotal,
      total_bs: cartTotal * (bcvRate || 1),
      subtotal_usd: cartTotal,
      tax_usd: 0,
      status: isDelivery ? 'web_unpaid' : 'pending',
      balance_due_usd: cartTotal,
      payment_details: isDelivery 
        ? {
            is_delivery: true,
            client_document: clientDoc.trim(),
            client_phone: clientPhone.trim(),
            delivery_address: deliveryAddress,
            delivery_reference: deliveryRef,
            applied_bcv_rate: bcvRate,
          }
        : { 
            is_self_service: true, 
            client_document: clientDoc.trim(),
            kitchen_sent_at: new Date().toISOString(),
            applied_bcv_rate: bcvRate,
            table_name: clientName.trim() // Guardamos la mesa en los detalles para no manchar el nombre del cliente
          }
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
          <CheckCircle size={72} color={isDelivery ? "#8b5cf6" : "#16a34a"} style={{ margin: '0 auto 20px' }} />
          <h2 style={{ color: '#111827', marginBottom: '12px', fontSize: '24px', fontWeight: '900' }}>
            {isDelivery ? '¡Pedido de Delivery Recibido!' : '¡Pedido en Cocina!'}
          </h2>
          
          <p style={{ color: '#4b5563', marginBottom: '32px', fontSize: '15px', lineHeight: '1.5' }}>
            {isDelivery 
              ? 'Hemos recibido tu orden. Por favor mantente atento a tu teléfono, nuestro equipo verificará el pedido y se pondrá en contacto contigo muy pronto para coordinar el pago y el envío.'
              : `Tu orden ya está siendo preparada. Al terminar o cuando desees pagar, por favor acércate a la caja indicando tu mesa o nombre: `
            }
            {!isDelivery && <strong style={{color: '#111827', fontSize: '16px'}}>{clientName}</strong>}
          </p>
          
          <button onClick={() => { setOrderSuccess(false); setClientName(''); setShowCartModal(false); }} style={{ background: '#111827', color: '#fff', border: 'none', width: '100%', padding: '16px', borderRadius: '12px', fontWeight: '900', fontSize: '15px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
            Hacer otro pedido
          </button>
        </div>
      </div>
    );
  }

  const categories = ['Todas', ...new Set(products.map(p => p.category || 'General'))];
  const filteredProducts = selectedCategory === 'Todas' 
    ? products 
    : products.filter(p => (p.category || 'General') === selectedCategory);

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', paddingBottom: '100px', fontFamily: 'sans-serif' }}>
      
      <div style={{ background: '#ffffff', padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        {store.image_url ? (
          <img src={store.image_url} alt={store.name} style={{ width: '56px', height: '56px', borderRadius: '14px', objectFit: 'cover', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
        ) : (
          <div style={{ width: '56px', height: '56px', background: isDelivery ? '#8b5cf6' : '#111827', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <ChefHat size={28} />
          </div>
        )}
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-0.5px' }}>{store.name}</h1>
          <p style={{ fontSize: '13px', color: isDelivery ? '#8b5cf6' : '#64748b', margin: 0, fontWeight: '800' }}>
            {isDelivery ? 'Delivery & Pick-Up' : 'Auto-Servicio en Mesa'}
          </p>
        </div>
      </div>

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
                  background: isActive ? (isDelivery ? '#8b5cf6' : '#111827') : '#ffffff',
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
                  <strong style={{ color: isDelivery ? '#8b5cf6' : '#16a34a', fontSize: '16px', fontWeight: '900' }}>${Number(prod.price).toFixed(2)}</strong>
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

      {cart.length > 0 && !showCartModal && (
        <button 
          onClick={() => setShowCartModal(true)}
          style={{ position: 'fixed', bottom: '32px', left: '50%', transform: 'translateX(-50%)', background: isDelivery ? '#8b5cf6' : '#16a34a', color: '#fff', border: 'none', padding: '16px 24px', borderRadius: '50px', fontWeight: '900', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: `0 12px 30px ${isDelivery ? 'rgba(139, 92, 246, 0.4)' : 'rgba(22, 163, 74, 0.4)'}`, zIndex: 100, width: '90%', maxWidth: '400px', justifyContent: 'space-between', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ background: '#fff', color: isDelivery ? '#8b5cf6' : '#16a34a', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: '14px' }}>{cart.length}</span>
            <span>Ver mi Orden</span>
          </div>
          <span>${cartTotal.toFixed(2)}</span>
        </button>
      )}

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
                <strong style={{ fontSize: '22px', color: isDelivery ? '#8b5cf6' : '#16a34a', fontWeight: '900' }}>${Number(selectedProduct.price).toFixed(2)}</strong>
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
                            {hasQty && <strong style={{ fontSize: '14px', color: isDelivery ? '#8b5cf6' : '#16a34a' }}>+${(Number(ex.price) * ex.qty).toFixed(2)}</strong>}
                            <div style={{ display: 'flex', alignItems: 'center', border: hasQty ? (isDelivery ? '2px solid #8b5cf6' : '2px solid #16a34a') : '1px solid #cbd5e1', borderRadius: '10px', padding: '4px', background: hasQty ? (isDelivery ? '#f5f3ff' : '#f0fdf4') : '#fff' }}>
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

      {showCartModal && (
        <div style={{ position: 'fixed', inset: 0, background: '#f8fafc', zIndex: 99999, display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.2s' }}>
          <div style={{ background: '#fff', padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
            <button onClick={() => setShowCartModal(false)} style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '50%' }}><X size={20} color="#111827" /></button>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: '#0f172a' }}>Mi Orden</h2>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '24px', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
            
            {/* FORMULARIO MEJORADO CON BÚSQUEDA POR CÉDULA */}
            <div style={{ marginBottom: '24px', background: '#fff', padding: '20px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#475569', textTransform: 'uppercase', fontWeight: '800' }}>1. Datos de Contacto</h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', position: 'relative' }}>
                  <Search size={18} color="#94a3b8" style={{ marginRight: '10px' }}/>
                  <input 
                    type="text" 
                    value={clientDoc} 
                    onChange={e => { setClientDoc(e.target.value); setClientFound(false); }} 
                    onBlur={handleSearchClient}
                    placeholder="Cédula / RIF" 
                    required 
                    style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '14px', fontWeight: 'bold' }} 
                  />
                  {isSearchingClient && <span style={{ fontSize: '11px', color: '#8b5cf6', position: 'absolute', right: '12px', fontWeight: 'bold' }}>Buscando...</span>}
                  {clientFound && <span style={{ fontSize: '11px', color: '#10b981', position: 'absolute', right: '12px', fontWeight: 'bold' }}>¡Encontrado!</span>}
                </div>
                {!clientFound && clientDoc.length > 4 && !isSearchingClient && (
                  <span style={{ fontSize: '12px', color: '#f59e0b', marginLeft: '4px', marginTop: '-6px', fontWeight: 'bold' }}>Cliente nuevo. Completa tus datos.</span>
                )}

                <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <User size={18} color="#94a3b8" style={{ marginRight: '10px' }}/>
                  <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} placeholder={isDelivery ? "Nombre y Apellido" : "Nombre / Mesa"} required style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '14px', fontWeight: 'bold' }} />
                </div>

                {isDelivery && (
                  <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <Phone size={18} color="#94a3b8" style={{ marginRight: '10px' }}/>
                    <input type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="Número de WhatsApp" required style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '14px', fontWeight: 'bold' }} />
                  </div>
                )}
              </div>
            </div>

            {/* FORMULARIO DE DELIVERY CON GPS */}
            {isDelivery && (
              <div style={{ marginBottom: '24px', background: '#fff', padding: '20px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#475569', textTransform: 'uppercase', fontWeight: '800' }}>2. Datos de Envío</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <MapPin size={18} color="#94a3b8" style={{ marginRight: '10px', marginTop: '2px' }}/>
                    <textarea value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} placeholder="Dirección exacta de entrega" required rows="2" style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '14px', fontWeight: 'bold', resize: 'none' }} />
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', width: '100%' }}>
                      <Navigation size={18} color="#94a3b8" style={{ marginRight: '10px', marginTop: '2px' }}/>
                      <textarea value={deliveryRef} onChange={e => setDeliveryRef(e.target.value)} placeholder="Punto de referencia / Link de GPS (Opcional)" rows="2" style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '14px', fontWeight: 'bold', resize: 'none' }} />
                    </div>
                    <button type="button" onClick={handleOpenMap} style={{ marginTop: '8px', background: '#ede9fe', color: '#8b5cf6', border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      📍 Ubicar en el Mapa GPS
                    </button>
                  </div>
                </div>
              </div>
            )}

            {cart.map(item => (
              <div key={item.cartId} style={{ display: 'flex', alignItems: 'center', background: '#fff', padding: '20px', borderRadius: '20px', border: '1px solid #e2e8f0', marginBottom: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                <div style={{ flex: 1, paddingRight: '12px' }}>
                  <strong style={{ display: 'block', fontSize: '16px', color: '#0f172a', fontWeight: '900' }}>{item.name}</strong>
                  {item.customization && <span style={{ fontSize: '13px', color: '#d97706', display: 'block', marginTop: '6px', fontWeight: '600', lineHeight: '1.4' }}>{item.customization}</span>}
                  <span style={{ fontSize: '16px', fontWeight: '900', color: isDelivery ? '#8b5cf6' : '#16a34a', display: 'block', marginTop: '8px' }}>${(Number(item.price) * item.quantity).toFixed(2)}</span>
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
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <span style={{ fontSize: '16px', fontWeight: '800', color: '#475569' }}>Total a Pagar</span>
                <div style={{ textAlign: 'right' }}>
                  <h2 style={{ margin: 0, fontSize: '28px', color: '#111827', fontWeight: '900' }}>${cartTotal.toFixed(2)}</h2>
                  <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '700' }}>Bs. {(cartTotal * bcvRate).toLocaleString('es-VE', {minimumFractionDigits: 2})}</span>
                </div>
              </div>
              
              <button onClick={handleSendOrder} disabled={isProcessing} style={{ width: '100%', padding: '18px', background: isDelivery ? '#8b5cf6' : '#111827', color: '#fff', border: 'none', borderRadius: '16px', fontSize: '16px', fontWeight: '900', cursor: 'pointer', boxShadow: `0 8px 20px ${isDelivery ? 'rgba(139, 92, 246, 0.25)' : 'rgba(17, 24, 39, 0.25)'}` }}>
                {isProcessing ? 'Procesando...' : (isDelivery ? 'Confirmar Pedido de Delivery' : 'Enviar Orden a Cocina')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DEL MAPA GPS PARA CLIENTES */}
      {showMapModal && mapPos && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100000, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '500px', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapIcon size={18} color="#8b5cf6"/> Ubica tu dirección exacta
              </h3>
              <button onClick={() => setShowMapModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20}/></button>
            </div>
            
            <div style={{ height: '350px', width: '100%' }}>
              <MapContainer center={[mapPos.lat, mapPos.lng]} zoom={16} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapUpdater center={[mapPos.lat, mapPos.lng]} />
                <DraggableMarker position={mapPos} setPosition={setMapPos} />
              </MapContainer>
            </div>

            <div style={{ padding: '16px', background: '#fff' }}>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 16px 0', textAlign: 'center' }}>
                Arrastra el pin rojo <img src={customIcon.options.iconUrl} alt="pin" style={{height:'14px', verticalAlign:'middle'}}/> hasta la puerta de tu casa o lugar de entrega.
              </p>
              <button onClick={confirmMapLocation} style={{ width: '100%', padding: '14px', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}>
                Confirmar esta ubicación
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}