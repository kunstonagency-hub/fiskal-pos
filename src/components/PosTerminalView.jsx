import React, { useState } from 'react';
import { Barcode, Camera, Search, ShieldAlert, Package, Store, UserCheck, Minus, Plus, Trash2, Clock, CreditCard, ShoppingCart, X } from 'lucide-react';

export default function PosTerminalView({
  currentStoreType,
  barcodeInput,
  setBarcodeInput,
  handleBarcodeSubmit,
  barcodeInputRef,
  startCameraScanner,
  productSearchQuery,
  setProductSearchQuery,
  currentShift,
  products,
  filteredProductsForCatalog,
  selectedRestaurantCategory,
  setSelectedRestaurantCategory,
  handleOpenModifierModal,
  handleOpenWeightModal,
  addToCart,
  selectedClient,
  setSelectedClient,
  clientSearchQuery,
  handleClientSearchChange,
  setClientSearchQuery,
  filteredClientsForPOS,
  setQuickDocInput,
  setClientDoc,
  setShowQuickClientModal,
  cart,
  updateQuantity,
  removeFromCart,
  currentStoreTaxEnabled,
  currentStoreTaxRate,
  cartSubtotalUSD,
  calculatedTaxUSD,
  totalUSD,
  totalBs,
  currentStoreCountry,
  handleHoldOrder,
  processing,
  setSettlingSale,
  setShowPaymentModal
}) {
  // Estado para controlar si el carrito está abierto en móviles/tablets
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // Calcular cantidad total de ítems en el carrito para la burbuja
  const totalCartItems = cart.reduce((total, item) => total + item.quantity, 0);

  return (
    <div className="pos-grid">
      {/* Estilos integrados - Corrección definitiva de altura, fondos blancos y centrado */}
      <style>{`
        .mobile-fab {
          display: none;
        }
        .mobile-close-header {
          display: none;
        }
        
        @media (max-width: 1024px) {
          .pos-grid {
            display: flex !important; 
            flex-direction: column !important;
            width: 100% !important;
            flex: 1 !important; 
            margin-bottom: 0 !important;
            padding-bottom: 0 !important;
            box-sizing: border-box !important;
          }
          
          /* EL ÁREA DE PRODUCTOS: Forzamos que crezca y esté centrada */
          .products-catalog {
            display: flex !important;
            flex-direction: column !important;
            width: 100% !important; 
            
            /* CENTRADO PERFECTO: Misma separación a la izquierda y derecha */
            padding-left: 16px !important; 
            padding-right: 16px !important; 
            box-sizing: border-box !important;
            
            /* LA MAGIA: Obliga al contenedor a estirarse y rellenar todo el vacío */
            flex-grow: 1 !important; 
            min-height: calc(100vh - 100px) !important; 
            
            /* COLCHÓN: Detiene los productos 110px antes para que la burbuja negra no los tape */
            padding-bottom: 110px !important; 
          }
          
          .cart-summary-wrapper {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 9999;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s;
          }
          .cart-summary-wrapper.open {
            opacity: 1;
            pointer-events: auto;
          }
          .cart-summary {
            position: absolute !important;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 85% !important;
            transform: translateY(100%);
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            border-radius: 24px 24px 0 0 !important;
            padding-top: 16px !important;
          }
          .cart-summary-wrapper.open .cart-summary {
            transform: translateY(0);
          }
          .mobile-fab {
            display: flex;
            position: fixed;
            bottom: 85px; 
            left: 16px;
            right: 16px;
            z-index: 9998;
            background: #111827;
            color: white;
            padding: 16px 20px;
            border-radius: 16px;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 8px 24px rgba(17, 24, 39, 0.3);
            cursor: pointer;
            font-weight: bold;
          }
          .mobile-close-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            padding-bottom: 16px;
            border-bottom: 1px solid #e9ecef;
          }
          .desktop-cart-title {
            display: none;
          }
        }
      `}</style>

      {/* SECCIÓN IZQUIERDA: CATÁLOGO */}
      <div className="products-catalog">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <h3>{currentStoreType === 'restaurant' ? 'Menú de Platillos' : 'Catálogo Rápido'}</h3>
          <form onSubmit={handleBarcodeSubmit} style={{ display: 'flex', gap: '6px', width: '300px' }}>
            <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
              <Barcode size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#6c757d', zIndex: 2 }} />
              <input 
                ref={barcodeInputRef}
                type="text" 
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Escanear código o SKU..."
                style={{ width: '100%', padding: '8px 38px 8px 34px', borderRadius: '6px', border: '1px solid #ced4da', fontSize: '13px', outline: 'none' }}
              />
              <button 
                type="button" 
                onClick={startCameraScanner}
                title="Escanear con Cámara"
                style={{ position: 'absolute', right: '4px', background: '#212529', color: '#fff', border: 'none', borderRadius: '4px', padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Camera size={15} />
              </button>
            </div>
          </form>
        </div>

        <div style={{ marginBottom: '16px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#6c757d', zIndex: 2 }} />
          <input
            type="text"
            value={productSearchQuery}
            onChange={(e) => setProductSearchQuery(e.target.value)}
            placeholder={currentStoreType === 'restaurant' ? "Buscar platillo, bebida o combo..." : "Buscar producto por nombre o SKU manualmente..."}
            style={{ width: '100%', padding: '8px 8px 8px 34px', borderRadius: '6px', border: '1px solid #ced4da', fontSize: '13px', outline: 'none', background: '#fff' }}
          />
        </div>

        {!currentShift && (
          <div className="alert-banner-warning" style={{ background: '#fff3bf', border: '1px solid #ffe066', padding: '12px', borderRadius: '8px', color: '#d97706', display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px' }}>
            <ShieldAlert size={20} />
            <span style={{ fontSize: '13px' }}>La caja se encuentra cerrada. Debes abrir un turno en la pestaña <strong>Caja / Turnos</strong> para poder facturar.</span>
          </div>
        )}

        {currentStoreType === 'restaurant' && !selectedRestaurantCategory ? (
          <div>
            {(() => {
              const restaurantProducts = products.filter(p => {
                const cat = (p.category || '').trim().toLowerCase();
                return cat !== 'general' && cat !== 'por peso';
              });
              const uniqueCategories = [...new Set(restaurantProducts.map(p => (p.category || 'General').trim()))];

              if (uniqueCategories.length === 0) {
                return (
                  <div style={{ textAlign: 'center', padding: '40px', background: '#f8f9fa', borderRadius: '8px', border: '1px dashed #ced4da' }}>
                    <Package size={40} color="#adb5bd" style={{ marginBottom: '12px' }} />
                    <h4>No hay categorías ni platillos creados</h4>
                    <p style={{ fontSize: '13px', color: '#6c757d', marginTop: '4px' }}>Ve a la pestaña <strong>Menú & Stock</strong> para registrar tus platillos y asignarles categorías.</p>
                  </div>
                );
              }

              return (
                <div className="catalog-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px' }}>
                  {uniqueCategories
                    .filter(cat => currentStoreType !== 'restaurant' || cat.toLowerCase() !== 'por peso')
                    .map((cat, idx) => {
                    const count = restaurantProducts.filter(p => (p.category || '').trim().toLowerCase() === cat.toLowerCase()).length;
                    return (
                      <div 
                        key={idx} 
                        onClick={() => setSelectedRestaurantCategory(cat)}
                        style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', border: '2px solid #dee2e6', borderRadius: '12px', transition: 'transform 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
                      >
                        <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                          <Store size={28} color="#16a34a" />
                        </div>
                        <h4 style={{ fontSize: '15px', fontWeight: 'bold', color: '#212529', marginBottom: '4px', textAlign: 'center' }}>{cat}</h4>
                        <span style={{ fontSize: '11px', color: '#6c757d', background: '#fff', padding: '2px 8px', borderRadius: '10px', border: '1px solid #e9ecef' }}>{count} platillo{count === 1 ? '' : 's'}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        ) : (
          <div>
            {currentStoreType === 'restaurant' && (
              <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button 
                  onClick={() => setSelectedRestaurantCategory(null)} 
                  style={{ background: '#e9ecef', border: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', color: '#495057' }}
                >
                  ← Volver a Categorías ({selectedRestaurantCategory})
                </button>
              </div>
            )}

            <div className="catalog-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px' }}>
              {(() => {
                let displayProducts = filteredProductsForCatalog;
                
                const fastFoodCats = ['hamburguesas', 'perros calientes', 'perros', 'pizzas', 'comida', 'comida rápida', 'bebidas', 'postres', 'salchipapas', 'pepitos'];
                displayProducts = displayProducts.filter(p => {
                  const cat = (p.category || '').trim().toLowerCase();
                  if (currentStoreType === 'restaurant') {
                    return cat !== 'general' && cat !== 'por peso';
                  } else {
                    return !fastFoodCats.includes(cat) && cat !== 'restaurante';
                  }
                });

                if (currentStoreType === 'restaurant' && selectedRestaurantCategory) {
                  const targetCat = selectedRestaurantCategory.trim().toLowerCase();
                  displayProducts = displayProducts.filter(p => {
                    const pCat = (p.category || '').trim().toLowerCase();
                    return pCat === targetCat || pCat.includes(targetCat) || targetCat.includes(pCat);
                  });
                }

                return displayProducts.length === 0 ? (
                  <p style={{ color: '#6c757d', fontSize: '14px', marginTop: '20px' }}>No se encontraron productos en esta vista.</p>
                ) : (
                  displayProducts.map((prod) => (
                    <div 
                      key={prod.id} 
                      onClick={() => {
                        if (currentStoreType === 'restaurant') {
                          handleOpenModifierModal(prod);
                        } else if (prod.category === 'Por Peso') {
                          handleOpenWeightModal(prod);
                        } else {
                          addToCart(prod);
                        }
                      }}
                      style={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', overflow: 'hidden', opacity: prod.stock <= 0 ? 0.6 : 1, boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}
                    >
                      <div style={{ height: '120px', width: '100%', background: '#f1f3f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {prod.image_url ? (
                          <img src={prod.image_url} alt={prod.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <Package size={36} color="#adb5bd" strokeWidth={1.5} />
                        )}
                      </div>
                      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                        <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: '#212529', margin: '0 0 8px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {prod.name}
                        </h4>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                          <span style={{ fontSize: '16px', fontWeight: '900', color: '#16a34a' }}>${prod.price.toFixed(2)}</span>
                          <span style={{ fontSize: '10px', background: prod.stock <= 5 ? '#ffe3e3' : '#f8f9fa', color: prod.stock <= 5 ? '#e05d5d' : '#495057', padding: '3px 6px', borderRadius: '6px', fontWeight: 'bold', border: '1px solid #e9ecef' }}>
                            {prod.stock !== undefined ? prod.stock : 0} ud.
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* BARRA FLOTANTE MÓVIL */}
      <div 
        className="mobile-fab" 
        onClick={() => setIsMobileCartOpen(true)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShoppingCart size={20} />
          <span>Ver Carrito ({totalCartItems})</span>
        </div>
        <span style={{ fontSize: '18px' }}>${totalUSD.toFixed(2)}</span>
      </div>

      {/* SECCIÓN DERECHA: RESUMEN DE VENTA (CARRITO) */}
      <div className={`cart-summary-wrapper ${isMobileCartOpen ? 'open' : ''}`} onClick={(e) => { if (e.target.className.includes('cart-summary-wrapper')) setIsMobileCartOpen(false); }}>
        <div className="cart-summary" style={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', height: '100%' }}>
          
          {/* Encabezado móvil para cerrar */}
          <div className="mobile-close-header">
            <h3 style={{ margin: 0, fontSize: '18px', color: '#111827', fontWeight: '800' }}>Resumen de Venta</h3>
            <button 
              onClick={() => setIsMobileCartOpen(false)}
              style={{ background: '#f1f3f5', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <X size={20} color="#495057" />
            </button>
          </div>

          <div>
            <h3 className="desktop-cart-title" style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#111827', fontWeight: '800' }}>Resumen de Venta</h3>
            <div className="form-group" style={{ position: 'relative' }}>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', marginBottom: '6px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><UserCheck size={14} /> Cliente Asociado</span>
                <span style={{ color: '#16a34a' }}>ACTIVO: {selectedClient}</span>
              </label>

              <div style={{ position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: '#adb5bd' }} />
                <input 
                  type="text"
                  value={clientSearchQuery}
                  onChange={handleClientSearchChange}
                  placeholder="Escribe cédula o nombre a buscar..."
                  style={{ width: '100%', padding: '8px 8px 8px 32px', borderRadius: '6px', border: '1px solid #ced4da', fontSize: '13px', outline: 'none' }}
                />
              </div>

              {clientSearchQuery.trim().length > 0 && (
                <div style={{ position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, background: '#fff', border: '1px solid #ced4da', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 50, maxHeight: '180px', overflowY: 'auto' }}>
                  <div 
                    onClick={() => { setSelectedClient('Cliente General'); setClientSearchQuery(''); }}
                    style={{ padding: '8px 12px', fontSize: '12px', borderBottom: '1px solid #f1f3f5', cursor: 'pointer', background: '#f8f9fa' }}
                  >
                    👤 <strong>Cliente General (Anónimo)</strong>
                  </div>
                  {filteredClientsForPOS.length > 0 ? (
                    filteredClientsForPOS.map(cli => (
                      <div 
                        key={cli.id} 
                        onClick={() => { setSelectedClient(cli.name); setClientSearchQuery(''); }}
                        style={{ padding: '8px 12px', fontSize: '12px', borderBottom: '1px solid #f1f3f5', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
                      >
                        <span><strong>{cli.name}</strong></span>
                        <span style={{ color: '#6c757d' }}>{cli.document || 'Sin Cédula'}</span>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '12px', textAlign: 'center' }}>
                      <p style={{ fontSize: '12px', color: '#e05d5d', marginBottom: '8px' }}>No se encontró ningún cliente</p>
                      <button 
                        type="button" 
                        onClick={() => {
                          setQuickDocInput(clientSearchQuery);
                          setClientDoc(clientSearchQuery);
                          setClientSearchQuery('');
                          setShowQuickClientModal(true);
                        }}
                        style={{ background: '#111827', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        + Registrar nuevo cliente
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* LISTA DEL CARRITO CON TOTALES POR LÍNEA */}
          <div style={{ flex: 1, overflowY: 'auto', margin: '16px 0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {cart.length === 0 ? (
              <p style={{ color: '#adb5bd', fontSize: '14px', textAlign: 'center', marginTop: '40px' }}>El carrito está vacío.</p>
            ) : (
              cart.map(item => (
                <div key={item.cartItemId || item.id} style={{ display: 'flex', alignItems: 'center', background: '#f8f9fa', padding: '12px', borderRadius: '8px', border: '1px solid #e9ecef', gap: '12px' }}>
                  
                  <div style={{ flex: 1 }}>
                    <strong style={{ display: 'block', fontSize: '14px', color: '#212529', marginBottom: '2px' }}>{item.name}</strong>
                    {(item.customization || item.customNote) ? (
                      <span style={{ fontSize: '11px', color: item.customization.includes('+') ? '#16a34a' : '#e05d5d', display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>
                        {item.customization || item.customNote}
                      </span>
                    ) : currentStoreType === 'restaurant' ? (
                      <span style={{ fontSize: '11px', color: '#4c6ef5', display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>
                        Con todo
                      </span>
                    ) : null}
                    <span style={{ fontSize: '12px', color: '#6c757d' }}>${item.price.toFixed(2)} c/u</span>
                  </div>

                  {/* TOTAL POR LÍNEA MULTIPLICADO */}
                  <div style={{ textAlign: 'right', minWidth: '60px' }}>
                    <strong style={{ fontSize: '15px', color: '#111827', fontWeight: '900' }}>
                      ${(item.price * item.quantity).toFixed(2)}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', padding: '4px', borderRadius: '6px', border: '1px solid #ced4da' }}>
                    <button onClick={() => updateQuantity(item.cartItemId || item.id, -1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><Minus size={14} color="#495057" /></button>
                    <span style={{ fontWeight: 'bold', width: '20px', textAlign: 'center', fontSize: '13px' }}>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.cartItemId || item.id, 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><Plus size={14} color="#495057" /></button>
                    <button onClick={() => removeFromCart(item.cartItemId || item.id)} style={{ background: '#fff5f5', border: 'none', cursor: 'pointer', padding: '4px', marginLeft: '4px', borderRadius: '4px', color: '#e05d5d' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* TOTALES GLOBALES */}
          <div style={{ borderTop: '2px solid #e9ecef', paddingTop: '16px' }}>
            {currentStoreTaxEnabled && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#6c757d', marginBottom: '6px' }}>
                  <span>Subtotal:</span>
                  <strong style={{ color: '#495057' }}>${cartSubtotalUSD.toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#6c757d', marginBottom: '12px' }}>
                  <span>Impuesto ({currentStoreTaxRate}%):</span>
                  <strong style={{ color: '#495057' }}>${calculatedTaxUSD.toFixed(2)}</strong>
                </div>
              </>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '15px', color: '#212529', fontWeight: 'bold' }}>Total USD:</span>
              <h2 style={{ fontSize: '26px', color: '#111827', margin: 0, fontWeight: '900' }}>${totalUSD.toFixed(2)}</h2>
            </div>
            
            {currentStoreCountry === 'venezuela' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '12px', color: '#6c757d' }}>Total Bolívares (BCV):</span>
                <h3 style={{ fontSize: '15px', color: '#495057', margin: 0 }}>Bs. {totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
              </div>
            )}
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => { setIsMobileCartOpen(false); handleHoldOrder(); }} 
                disabled={cart.length === 0 || processing || !currentShift} 
                style={{ flex: 1, padding: '14px', background: '#fff', border: '1px solid #ced4da', color: '#212529', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: cart.length === 0 ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', opacity: cart.length === 0 ? 0.5 : 1 }}
              >
                <Clock size={16} /> {currentStoreType === 'restaurant' ? 'A Cocina' : 'En Espera'}
              </button>
              <button 
                onClick={() => { setIsMobileCartOpen(false); setShowPaymentModal(true); }} 
                disabled={cart.length === 0 || !currentShift} 
                style={{ flex: 1.5, padding: '14px', background: '#111827', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: cart.length === 0 ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', opacity: cart.length === 0 ? 0.5 : 1 }}
              >
                <CreditCard size={18} /> Cobrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}