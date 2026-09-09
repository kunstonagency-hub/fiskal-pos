import React from 'react';
import { Barcode, Camera, Search, ShieldAlert, Package, Store, UserCheck, Minus, Plus, Trash2, Clock, CreditCard } from 'lucide-react';

function PosTerminalView({
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
  return (
    <div className="pos-grid">
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
                autoFocus
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
          <div className="alert-banner-warning">
            <ShieldAlert size={20} />
            <span>La caja se encuentra cerrada. Debes abrir un turno en la pestaña <strong>Caja / Turnos</strong> para poder facturar.</span>
          </div>
        )}

        {currentStoreType === 'restaurant' && !selectedRestaurantCategory ? (
          /* VISTA DE CATEGORÍAS DE RESTAURANTE */
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
                    <p style={{ fontSize: '13px', color: '#6c757d', marginTop: '4px' }}>Ve a la pestaña <strong>Menú & Stock</strong> para registrar tus platillos y asignarles categorías (ej. Hamburguesas, Perros, Bebidas).</p>
                  </div>
                );
              }

              return (
                <div className="catalog-grid">
                  {uniqueCategories
                    .filter(cat => currentStoreType !== 'restaurant' || cat.toLowerCase() !== 'por peso')
                    .map((cat, idx) => {
                    const count = restaurantProducts.filter(p => (p.category || '').trim().toLowerCase() === cat.toLowerCase()).length;
                    return (
                      <div 
                        key={idx} 
                        className="product-card" 
                        onClick={() => setSelectedRestaurantCategory(cat)}
                        style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', border: '2px solid #dee2e6' }}
                      >
                        <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                          <Store size={28} color="#2b8a3e" />
                        </div>
                        <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: '#212529', marginBottom: '4px', textAlign: 'center' }}>{cat}</h4>
                        <span style={{ fontSize: '12px', color: '#6c757d', background: '#fff', padding: '2px 8px', borderRadius: '10px' }}>{count} platillo{count === 1 ? '' : 's'}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        ) : (
          /* VISTA DE PLATILLOS (O TIENDA ESTÁNDAR) */
          <div>
            {currentStoreType === 'restaurant' && (
              <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button 
                  onClick={() => setSelectedRestaurantCategory(null)} 
                  style={{ background: '#e9ecef', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', color: '#495057' }}
                >
                  ← Volver a Categorías ({selectedRestaurantCategory})
                </button>
              </div>
            )}

            <div className="catalog-grid">
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
                  <p className="empty-text">No se encontraron platillos o productos en esta vista.</p>
                ) : (
                  displayProducts.map((prod) => (
                    <div 
                      key={prod.id} 
                      className={`product-card ${prod.stock <= 0 ? 'out-of-stock' : ''}`} 
                      onClick={() => {
                        if (currentStoreType === 'restaurant') {
                          handleOpenModifierModal(prod);
                        } else if (prod.category === 'Por Peso') {
                          handleOpenWeightModal(prod);
                        } else {
                          addToCart(prod);
                        }
                      }}
                    >
                      <div className="img-container">
                        {prod.image_url ? (
                          <img src={prod.image_url} alt={prod.name} />
                        ) : (
                          <Package size={36} strokeWidth={1.5} color="#adb5bd" />
                        )}
                      </div>
                      <div className="product-card-content">
                        <h4>{prod.name}</h4>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto' }}>
                          <span className="product-price">${prod.price.toFixed(2)}</span>
                          <span style={{ fontSize: '11px', background: prod.stock <= 2 ? '#ffe3e3' : '#f8f9fa', color: prod.stock <= 2 ? '#fa5252' : '#495057', padding: '4px 8px', borderRadius: '12px', fontWeight: 'bold', border: '1px solid #e9ecef' }}>
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

      <div className="cart-summary">
        <div>
          <h3>Resumen de Venta</h3>
          <div className="form-group" style={{ marginTop: '12px', position: 'relative' }}>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><UserCheck size={14} /> Cliente Asociado</span>
              <span style={{ fontSize: '11px', color: '#2b8a3e', fontWeight: '600' }}>Activo: {selectedClient}</span>
            </label>

            <div style={{ position: 'relative', marginTop: '4px' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: '#adb5bd' }} />
              <input 
                type="text"
                value={clientSearchQuery}
                onChange={handleClientSearchChange}
                placeholder="Escribe cédula o nombre a buscar..."
                style={{ width: '100%', padding: '8px 8px 8px 32px', borderRadius: '6px', border: '1px solid #ced4da', fontSize: '13px', outline: 'none', background: '#fff' }}
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
                    <p style={{ fontSize: '12px', color: '#fa5252', marginBottom: '8px' }}>No se encontró ningún cliente</p>
                    <button 
                      type="button" 
                      onClick={() => {
                        setQuickDocInput(clientSearchQuery);
                        setClientDoc(clientSearchQuery);
                        setClientSearchQuery('');
                        setShowQuickClientModal(true);
                      }}
                      style={{ background: '#2b8a3e', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      + Registrar nuevo cliente
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="cart-items-list">
          {cart.length === 0 ? (
            <p className="empty-text">El carrito está vacío.</p>
          ) : (
            cart.map(item => (
              <div key={item.cartItemId || item.id} className="cart-item">
                <div className="cart-item-info">
                  <strong>{item.name}</strong>
                  {(item.customization || item.customNote) ? (
                    <span style={{ fontSize: '11px', color: '#fa5252', display: 'block', fontWeight: 'bold' }}>
                      {item.customization || item.customNote}
                    </span>
                  ) : currentStoreType === 'restaurant' ? (
                    <span style={{ fontSize: '11px', color: '#1c7ed6', display: 'block', fontWeight: 'bold' }}>
                      Con todo
                    </span>
                  ) : null}

                  <span>${item.price.toFixed(2)} c/u</span>
                </div>
                <div className="cart-item-controls">
                  <button onClick={() => updateQuantity(item.cartItemId || item.id, -1)}><Minus size={14}/></button>
                  <span>{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.cartItemId || item.id, 1)}><Plus size={14}/></button>
                  <button className="btn-delete" onClick={() => removeFromCart(item.cartItemId || item.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="cart-totals-container">
          {currentStoreTaxEnabled && (
            <>
              <div className="cart-total-row" style={{ fontSize: '14px', color: '#495057', marginBottom: '4px' }}>
                <span>Subtotal:</span>
                <strong>${cartSubtotalUSD.toFixed(2)}</strong>
              </div>
              <div className="cart-total-row" style={{ fontSize: '14px', color: '#495057', marginBottom: '8px' }}>
                <span>Impuesto ({currentStoreTaxRate}%):</span>
                <strong>${calculatedTaxUSD.toFixed(2)}</strong>
              </div>
            </>
          )}
          <div className="cart-total-row">
            <span>Total USD:</span>
            <h2>${totalUSD.toFixed(2)}</h2>
          </div>
          {currentStoreCountry === 'venezuela' && (
            <div className="cart-total-row-bs">
              <span>Total Bolívares (BCV):</span>
              <h3>Bs. {totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-secondary" onClick={handleHoldOrder} disabled={cart.length === 0 || processing || !currentShift} style={{ flex: 1, fontSize: '13px' }}>
              <Clock size={14} /> {currentStoreType === 'restaurant' ? 'A Cocina / Espera' : 'En Espera'}
            </button>
            <button className="btn-primary checkout-btn" onClick={() => { setSettlingSale(null); setShowPaymentModal(true); }} disabled={cart.length === 0 || !currentShift} style={{ flex: 2 }}>
              <CreditCard size={16} /> Cobrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PosTerminalView;