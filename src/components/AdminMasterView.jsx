import React from 'react';
import { Eye, Activity, PieChart, Clock, TrendingUp, DollarSign as DollarIcon, Percent, Award, Check, Store, UserPlus, CheckCircle, AlertCircle, MessageCircle, FileText, Key, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '../supabase';

function AdminMasterView({
  currentStoreType,
  setCurrentStoreType,
  getSystemFinancials,
  baseMonthlyPrice,
  setBaseMonthlyPrice,
  globalPromoDiscount,
  setGlobalPromoDiscount,
  handleSaveSaasSettings,
  savingSettings,
  getCalculatedMonthlyPrice,
  systemVendors,
  adminStores,
  fetchAdminStores,
  handlePayVendor,
  editingStore,
  resetStoreForm,
  handleSaveStore,
  storeName,
  setStoreName,
  storeRif,
  setStoreRif,
  newStoreType,
  setNewStoreType,
  storeCountry,
  setStoreCountry,
  ownerName,
  setOwnerName,
  ownerDoc,
  setOwnerDoc,
  storePhone,
  setStorePhone,
  storeEmail,
  setStoreEmail,
  storeAddress,
  setStoreAddress,
  storeCity,
  handleCityChange,
  storeState,
  storeCustomDiscount,
  setStoreCustomDiscount,
  storePaidAdvance,
  setStorePaidAdvance,
  handleCreateSystemVendor,
  creatingVendor,
  newVendorName,
  setNewVendorName,
  newVendorEmail,
  setNewVendorEmail,
  newVendorPhone,
  setNewVendorPhone,
  sendStoreRenewalWhatsApp,
  handleRenewSubscription,
  handleOpenPreInvoice,
  handleOpenOwnerModal,
  handleStartEditStore,
  handleToggleKrono,
  handleDeleteStore
}) {

  // Función segura para activar o suspender un comercio
  const handleToggleStoreStatus = async (storeId, currentStatus) => {
    try {
      const { error } = await supabase.from('stores').update({ is_active: !currentStatus }).eq('id', storeId);
      if (error) throw error;
      if (typeof fetchAdminStores === 'function') fetchAdminStores();
    } catch (error) {
      alert("Error al cambiar estatus del comercio: " + error.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Selector de Demo para el Super Admin */}
      <div style={{ background: '#e7f5ff', padding: '16px', borderRadius: '6px', border: '1px solid #74c0fc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Eye size={20} color="#1c7ed6" />
          <div>
            <h4 style={{ margin: 0, color: '#1971c2' }}>Modo Demostración (Super Admin)</h4>
            <span style={{ fontSize: '12px', color: '#495057' }}>Cambia la interfaz para mostrarle a un cliente cómo se ve el sistema.</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => setCurrentStoreType('standard')} 
            style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '4px', border: currentStoreType === 'standard' ? 'none' : '1px solid #ced4da', background: currentStoreType === 'standard' ? '#1c7ed6' : '#fff', color: currentStoreType === 'standard' ? '#fff' : '#495057', cursor: 'pointer', fontWeight: 'bold' }}>
            Tienda Estándar
          </button>
          <button 
            onClick={() => setCurrentStoreType('restaurant')} 
            style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '4px', border: currentStoreType === 'restaurant' ? 'none' : '1px solid #ced4da', background: currentStoreType === 'restaurant' ? '#d9480f' : '#fff', color: currentStoreType === 'restaurant' ? '#fff' : '#495057', cursor: 'pointer', fontWeight: 'bold' }}>
            Comida Rápida
          </button>
        </div>
      </div>
      
      {/* TARJETAS FINANCIERAS RESUMEN */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="product-form-card" style={{ padding: '20px', borderLeft: '4px solid #1c7ed6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#6c757d', fontWeight: 'bold' }}>Ingresos Totales (Suscripciones)</span>
            <Activity size={18} color="#1c7ed6" />
          </div>
          <h2 style={{ fontSize: '28px', marginTop: '12px', color: '#212529' }}>${getSystemFinancials().totalIncome.toFixed(2)}</h2>
        </div>
        <div className="product-form-card" style={{ padding: '20px', borderLeft: '4px solid #fa5252' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#6c757d', fontWeight: 'bold' }}>Comisiones Pagadas a Vendedores</span>
            <PieChart size={18} color="#fa5252" />
          </div>
          <h2 style={{ fontSize: '28px', marginTop: '12px', color: '#212529' }}>${getSystemFinancials().totalExpenses.toFixed(2)}</h2>
        </div>
        <div className="product-form-card" style={{ padding: '20px', borderLeft: '4px solid #f59f00' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#6c757d', fontWeight: 'bold' }}>Comisiones por Liquidar (Pendiente)</span>
            <Clock size={18} color="#f59f00" />
          </div>
          <h2 style={{ fontSize: '28px', marginTop: '12px', color: '#212529' }}>${getSystemFinancials().totalPendingComm.toFixed(2)}</h2>
        </div>
        <div className="product-form-card" style={{ padding: '20px', borderLeft: '4px solid #2b8a3e', background: '#f8fff9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#2b8a3e', fontWeight: 'bold' }}>Beneficio Neto del Sistema</span>
            <TrendingUp size={18} color="#2b8a3e" />
          </div>
          <h2 style={{ fontSize: '28px', marginTop: '12px', color: '#2b8a3e' }}>${getSystemFinancials().netProfit.toFixed(2)}</h2>
        </div>
      </div>

      {/* TARJETAS DE FINANZAS Y COMISIONES */}
      <div className="products-layout" style={{ gridTemplateColumns: '1fr 2fr' }}>
        <div className="product-form-card" style={{ background: '#f8f9fa' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1c7ed6' }}>
            <DollarIcon size={18} /> Precios y Promociones
          </h3>
          <p style={{ fontSize: '12px', color: '#6c757d', marginBottom: '16px' }}>
            Ajusta la tarifa base del sistema. Quienes se registren hoy quedarán atados permanentemente a esta tarifa, incluso si la subes en el futuro.
          </p>
          <form onSubmit={handleSaveSaasSettings} className="fiskal-form">
            <div className="form-group">
              <label>Precio Base Mensual ($ USD)</label>
              <input 
                type="number" 
                step="0.01" 
                value={baseMonthlyPrice} 
                onChange={e => setBaseMonthlyPrice(e.target.value)} 
                required 
              />
            </div>
            <div className="form-group">
              <label>Promoción Global Actual (%)</label>
              <div style={{ position: 'relative' }}>
                <Percent size={14} style={{ position: 'absolute', left: '10px', top: '12px', color: '#6c757d' }} />
                <input 
                  type="number" 
                  step="1" 
                  max="100" 
                  min="0"
                  value={globalPromoDiscount} 
                  onChange={e => setGlobalPromoDiscount(e.target.value)} 
                  style={{ paddingLeft: '32px' }}
                />
              </div>
              <span style={{ fontSize: '11px', color: '#fa5252' }}>
                {globalPromoDiscount > 0 ? `Un nuevo registro hoy pagará $${getCalculatedMonthlyPrice(0, baseMonthlyPrice).toFixed(2)} /mes de por vida.` : 'Sin promoción activa.'}
              </span>
            </div>
            <button type="submit" className="btn-primary" disabled={savingSettings} style={{ width: '100%', marginTop: '8px' }}>
              {savingSettings ? 'Guardando...' : 'Aplicar Precios a Nuevos Registros'}
            </button>
          </form>
        </div>

        <div className="product-list-card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#d9480f' }}>
            <Award size={18} /> Rendimiento de Vendedores y Pago de Comisiones
          </h3>
          <div className="table-responsive">
            <table className="fiskal-table" style={{ fontSize: '13px' }}>
              <thead>
                <tr>
                  <th>Vendedor</th>
                  <th style={{ textAlign: 'center' }}>Comercios Activos</th>
                  <th>Ganancia Histórica</th>
                  <th style={{ color: '#d9480f' }}>Saldo Pendiente</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {systemVendors.length === 0 ? (
                  <tr><td colSpan="5" className="empty-text">No hay vendedores registrados.</td></tr>
                ) : (
                  systemVendors.map(v => {
                    const vendorStores = adminStores.filter(s => s.system_vendor_id === v.id);
                    const activeCount = vendorStores.filter(s => s.is_active).length;
                    return (
                      <tr key={v.id}>
                        <td><strong>{v.name}</strong><br/><span style={{ fontSize: '11px', color: '#6c757d' }}>{v.email}</span></td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge-completed">{activeCount} / {vendorStores.length}</span>
                        </td>
                        <td><strong>${(parseFloat(v.total_earned) || 0).toFixed(2)}</strong></td>
                        <td><strong style={{ color: (parseFloat(v.pending_balance) || 0) > 0 ? '#d9480f' : '#2b8a3e', fontSize: '14px' }}>${(parseFloat(v.pending_balance) || 0).toFixed(2)}</strong></td>
                        <td style={{ textAlign: 'center' }}>
                          <button 
                            className="btn-primary" 
                            onClick={() => handlePayVendor(v)} 
                            disabled={(parseFloat(v.pending_balance) || 0) <= 0}
                            style={{ fontSize: '11px', padding: '6px 12px', background: (parseFloat(v.pending_balance) || 0) > 0 ? '#1c7ed6' : '#ced4da', cursor: (parseFloat(v.pending_balance) || 0) > 0 ? 'pointer' : 'not-allowed' }}
                          >
                            <Check size={14} style={{ marginRight: '4px' }} /> Liquidar
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: '11px', color: '#6c757d', marginTop: '12px' }}>* El saldo pendiente suma automáticamente el 50% de la cuota de nuevos registros y el 20% recurrente de sus renovaciones mensuales.</p>
        </div>
      </div>

      <div className="products-layout">
        <div className="product-form-card">
          <h3>{editingStore ? `Editando: ${editingStore.name}` : 'Registrar Nuevo Comercio SaaS'}</h3>
          <form onSubmit={handleSaveStore} className="fiskal-form">
            <div className="form-group">
              <label>Nombre del Negocio / Comercio</label>
              <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="Ej. Inversiones La Esquina C.A." required />
            </div>
            <div className="form-group">
              <label>RIF del Negocio</label>
              <input type="text" value={storeRif} onChange={(e) => setStoreRif(e.target.value)} placeholder="Ej. J-12345678-9" />
            </div>
            
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label>Tipo de Interfaz (Máscara)</label>
              <select value={newStoreType} onChange={(e) => setNewStoreType(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ced4da', fontSize: '13px' }}>
                <option value="standard">Minimarket / Tienda Estándar</option>
                <option value="restaurant">Restaurante / Comida Rápida</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label>País Operativo del Comercio</label>
              <select value={storeCountry} onChange={(e) => setStoreCountry(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ced4da', fontSize: '13px' }}>
                <option value="venezuela">Venezuela (Bolívares / BCV / Pago Móvil)</option>
                <option value="panama">Panamá (Dolarizado / Sin BCV)</option>
                <option value="el_salvador">El Salvador (Dolarizado / Sin BCV)</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div className="form-group">
                <label>Nombre del Propietario</label>
                <input type="text" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Ej. Carlos Pérez" />
              </div>
              <div className="form-group">
                <label>Cédula del Propietario</label>
                <input type="text" value={ownerDoc} onChange={(e) => setOwnerDoc(e.target.value)} placeholder="Ej. V-12345678" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div className="form-group">
                <label>Teléfono de Contacto</label>
                <input type="text" value={storePhone} onChange={(e) => setStorePhone(e.target.value)} placeholder="Ej. 0414-1234567" />
              </div>
              <div className="form-group">
                <label>Correo Electrónico</label>
                <input type="email" value={storeEmail} onChange={(e) => setStoreEmail(e.target.value)} placeholder="correo@negocio.com" />
              </div>
            </div>
            <div className="form-group">
              <label>Dirección Física</label>
              <input type="text" value={storeAddress} onChange={(e) => setStoreAddress(e.target.value)} placeholder="Ej. Av. Principal, Local 4" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div className="form-group">
                <label>Ciudad</label>
                <input type="text" value={storeCity} onChange={handleCityChange} placeholder="Ej. Los Teques" />
              </div>
              <div className="form-group">
                <label>Estado (Auto-detectado)</label>
                <input type="text" value={storeState} onChange={(e) => setStoreState(e.target.value)} placeholder="Ej. Miranda" />
              </div>
            </div>

            {editingStore && (
              <div className="form-group" style={{ background: '#e7f5ff', padding: '12px', borderRadius: '6px', border: '1px solid #74c0fc' }}>
                <label style={{ color: '#1971c2', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Award size={14}/> Descuento Especial a este Comercio (%)
                </label>
                <input type="number" step="1" max="100" min="0" value={storeCustomDiscount} onChange={(e) => setStoreCustomDiscount(e.target.value)} />
                <span style={{ fontSize: '11px', color: '#495057', display: 'block', marginTop: '4px' }}>
                  Este comercio tiene un precio base congelado de <strong>${editingStore.monthly_price_agreed || baseMonthlyPrice}</strong>. Con el {storeCustomDiscount}% de descuento pasará a pagar <strong>${getCalculatedMonthlyPrice(storeCustomDiscount, editingStore.monthly_price_agreed).toFixed(2)}</strong> mensuales.
                </span>
              </div>
            )}
            
            {!editingStore && (
              <div className="form-group" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" id="storePaidAdvance" checked={storePaidAdvance} onChange={(e) => setStorePaidAdvance(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                <label htmlFor="storePaidAdvance" style={{ cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', margin: 0, color: '#2b8a3e' }}>
                  ¿El comercio pagó el mes por adelantado? (Activa 40 días: 30 de mes + 10 de cortesía)
                </label>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              {editingStore && (
                <button type="button" className="btn-secondary" onClick={resetStoreForm} style={{ flex: 1 }}>Cancelar</button>
              )}
              <button type="submit" className="btn-primary" style={{ flex: 2 }}>
                <Store size={18} /> {editingStore ? 'Actualizar Comercio' : 'Registrar Comercio'}
              </button>
            </div>
          </form>
        </div>

        <div className="product-form-card">
          <h3>Registrar Vendedor de Sistema</h3>
          <form onSubmit={handleCreateSystemVendor} className="fiskal-form">
            <div className="form-group">
              <label>Nombre del Vendedor</label>
              <input type="text" value={newVendorName} onChange={e => setNewVendorName(e.target.value)} placeholder="Ej. Marcos Silva" required />
            </div>
            <div className="form-group">
              <label>Correo (Acceso al Portal)</label>
              <input type="email" value={newVendorEmail} onChange={e => setNewVendorEmail(e.target.value)} placeholder="vendedor@fiskal.com" required />
            </div>
            <div className="form-group">
              <label>Teléfono</label>
              <input type="text" value={newVendorPhone} onChange={e => setNewVendorPhone(e.target.value)} placeholder="Ej. 04121234567" />
            </div>
            <button type="submit" className="btn-primary" disabled={creatingVendor} style={{ background: '#d9480f' }}>
              <UserPlus size={18} /> {creatingVendor ? 'Creando...' : 'Crear Vendedor de Sistema'}
            </button>
          </form>

          <div style={{ marginTop: '20px' }}>
            <h4 style={{ fontSize: '13px', color: '#6c757d', marginBottom: '8px' }}>Vendedores Activos ({systemVendors.length})</h4>
            <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
              {systemVendors.map(v => (
                <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#f8f9fa', borderRadius: '4px', marginBottom: '4px', fontSize: '12px' }}>
                  <span><strong>{v.name}</strong> ({v.email})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* TABLA DE COMERCIOS REGISTRADOS */}
      <div className="product-list-card">
        <h3>Comercios Registrados ({adminStores.length})</h3>
        <div className="table-responsive">
          <table className="fiskal-table">
            <thead>
              <tr>
                <th>Negocio & Vendedor</th>
                <th>Tarifa Mensual ($)</th>
                <th>Prueba / Vencimiento</th>
                <th>Estatus</th>
                <th style={{ textAlign: 'center' }}>Acciones & WhatsApp</th>
              </tr>
            </thead>
            <tbody>
              {adminStores.length === 0 ? (
                <tr><td colSpan="5" className="empty-text">No hay comercios registrados.</td></tr>
              ) : (
                adminStores.map((store) => {
                  const now = new Date().getTime();
                  let daysText = '---';
                  let isExpiringSoon = false;
                  if (store.is_trial && store.trial_end_date) {
                    const diff = new Date(store.trial_end_date).getTime() - now;
                    const d = Math.ceil(diff / (1000 * 60 * 60 * 24));
                    daysText = d > 0 ? `${d} días de prueba` : 'Prueba expirada';
                    isExpiringSoon = d <= 3;
                  } else if (store.subscription_expires_at) {
                    const diff = new Date(store.subscription_expires_at).getTime() - now;
                    const d = Math.ceil(diff / (1000 * 60 * 60 * 24));
                    daysText = d > 0 ? `${d} días de mes activo` : 'Suscripción vencida';
                    isExpiringSoon = d <= 5;
                  }
                  
                  const basePriceDisplay = store.monthly_price_agreed !== null && store.monthly_price_agreed !== undefined ? store.monthly_price_agreed : baseMonthlyPrice;
                  const hasCustomDisc = store.custom_discount > 0;
                  const finalDisplayPrice = getCalculatedMonthlyPrice(store.custom_discount, store.monthly_price_agreed);

                  return (
                    <tr key={store.id}>
                      <td>
                        <strong>{store.name}</strong><br/>
                        <span style={{ fontSize: '11px', color: '#d9480f' }}>Vendedor: <strong>{store.system_vendors?.name || 'Admin Central'}</strong></span><br/>
                        <span style={{ fontSize: '10px', background: store.store_type === 'restaurant' ? '#ffe8cc' : '#e7f5ff', color: store.store_type === 'restaurant' ? '#d9480f' : '#1971c2', padding: '2px 4px', borderRadius: '4px' }}>
                          {store.store_type === 'restaurant' ? 'Restaurante' : 'Estándar'}
                        </span>
                      </td>
                      <td>
                        <strong>${finalDisplayPrice.toFixed(2)}</strong><br/>
                        {hasCustomDisc && <span style={{ fontSize: '10px', background: '#ffe3e3', color: '#c92a2a', padding: '2px 4px', borderRadius: '4px' }}>-{store.custom_discount}% aplicado</span>}
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: isExpiringSoon ? '#fa5252' : '#2b8a3e' }}>{daysText}</span>
                      </td>
                      <td>
                        {store.is_active ? (
                          <span className="badge-completed"><CheckCircle size={12}/> Activo</span>
                        ) : (
                          <span className="badge-credit" style={{ background: '#ffe3e3', color: '#c92a2a' }}><AlertCircle size={12}/> Suspendido</span>
                        )}
                      </td>
                      <td className="action-cell">
                        <div className="action-buttons" style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                          <button className="btn-icon-whatsapp" onClick={() => sendStoreRenewalWhatsApp(store)} title="Enviar WhatsApp de Renovación / Cobro">
                            <MessageCircle size={16} />
                          </button>
                          <button className="btn-icon-success" onClick={() => handleRenewSubscription(store)} title="Renovar Suscripción (Suma 30 días al tiempo restante)" style={{ background: '#1c7ed6', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Award size={13} /> Renovar
                          </button>
                          <button className="btn-icon-primary" onClick={() => handleOpenPreInvoice(store)} title="Generar Recibo / Factura SaaS" style={{ background: '#4c6ef5', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <FileText size={13} /> Recibo
                          </button>
                          <button className="btn-icon-success" onClick={() => handleOpenOwnerModal(store)} title="Acceso" style={{ background: '#2b8a3e', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Key size={13} /> Acceso
                          </button>
                          <button className="btn-icon-edit" onClick={() => handleStartEditStore(store)} title="Editar Datos y Promociones"><Edit2 size={16} /></button>
                          
                          <button 
                            className="btn-secondary" 
                            onClick={() => handleToggleKrono(store.id, store.krono_enabled)} 
                            style={{ 
                              borderColor: store.krono_enabled ? '#10b981' : '#ced4da', 
                              color: store.krono_enabled ? '#10b981' : '#6c757d', 
                              background: store.krono_enabled ? '#ecfdf5' : '#f8f9fa',
                              fontSize: '11px', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' 
                            }}
                            title={store.krono_enabled ? "Krono Market está ACTIVO para este comercio" : "Activar Krono Market para este comercio"}
                          >
                            🛒 {store.krono_enabled ? 'Krono ON' : 'Krono OFF'}
                          </button>

                          <button className="btn-secondary" onClick={() => handleToggleStoreStatus(store.id, store.is_active)} style={{ borderColor: store.is_active ? '#fa5252' : '#2b8a3e', color: store.is_active ? '#fa5252' : '#2b8a3e', fontSize: '11px', padding: '4px 8px' }}>
                            {store.is_active ? 'Suspender' : 'Activar'}
                          </button>
                          <button className="btn-icon-danger" onClick={() => handleDeleteStore(store.id, store.name)} title="Eliminar Comercio Definitivamente" style={{ background: '#fa5252', color: '#fff', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <Trash2 size={16} />
                          </button>
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
    </div>
  );
}

export default AdminMasterView;