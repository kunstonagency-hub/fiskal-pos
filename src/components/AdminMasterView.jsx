import React, { useState } from 'react';
import { Eye, Activity, PieChart, Clock, TrendingUp, DollarSign as DollarIcon, Percent, Award, Check, Store, UserPlus, CheckCircle, AlertCircle, MessageCircle, FileText, Key, Edit2, Trash2, X, Banknote, CreditCard } from 'lucide-react';
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
  fetchSaasTransactions,
  fetchSystemVendors,
  saasTransactions,
  bcvRate,
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
  storeIsDemo,
  setStoreIsDemo,
  handleToggleDemo,
  handleCreateSystemVendor,
  creatingVendor,
  newVendorName,
  setNewVendorName,
  newVendorEmail,
  setNewVendorEmail,
  newVendorPhone,
  setNewVendorPhone,
  sendStoreRenewalWhatsApp,
  handleOpenPreInvoice,
  handleOpenOwnerModal,
  handleStartEditStore,
  handleToggleKrono,
  handleDeleteStore
}) {

  // Estados para el Modal de Cobro de Renovación SaaS
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [targetStoreForRenew, setTargetStoreForRenew] = useState(null);
  const [renewAmount, setRenewAmount] = useState('30.00');
  const [renewPaymentMethod, setRenewPaymentMethod] = useState('cash_usd'); // 'cash_usd' | 'pago_movil' | 'zelle' | 'pending'
  const [renewReference, setRenewReference] = useState('');
  const [renewProcessing, setRenewProcessing] = useState(false);

  const handleToggleStoreStatus = async (storeId, currentStatus) => {
    try {
      const { error } = await supabase.from('stores').update({ is_active: !currentStatus }).eq('id', storeId);
      if (error) throw error;
      if (typeof fetchAdminStores === 'function') fetchAdminStores();
    } catch (error) {
      alert("Error al cambiar estatus del comercio: " + error.message);
    }
  };

  // Abrir la pasarela de cobro del SaaS
  const handleOpenRenewModal = (store) => {
    const finalPrice = getCalculatedMonthlyPrice(store.custom_discount, store.monthly_price_agreed).toFixed(2);
    setTargetStoreForRenew(store);
    setRenewAmount(finalPrice);
    setRenewPaymentMethod('cash_usd');
    setRenewReference('');
    setShowRenewModal(true);
  };

  // Confirmar el cobro administrativo
  const handleConfirmSaaSPayment = async (e) => {
    e.preventDefault();
    if (!targetStoreForRenew) return;

    if ((renewPaymentMethod === 'pago_movil' || renewPaymentMethod === 'zelle') && !renewReference.trim()) {
      alert("Por favor ingresa el número de referencia bancaria para tu control.");
      return;
    }

    setRenewProcessing(true);
    const store = targetStoreForRenew;
    const finalPriceNum = parseFloat(renewAmount) || 0;
    const isPendingPayment = renewPaymentMethod === 'pending';

    const now = new Date().getTime();
    let newExpirationDate = new Date();

    if (store.is_trial) {
      let trialDaysLeft = 0;
      if (store.trial_end_date) {
        const trialEnd = new Date(store.trial_end_date).getTime();
        if (trialEnd > now) {
          trialDaysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
        }
      }
      newExpirationDate.setDate(newExpirationDate.getDate() + 30 + trialDaysLeft);
    } else {
      let subDaysLeft = 0;
      if (store.subscription_expires_at) {
        const subEnd = new Date(store.subscription_expires_at).getTime();
        if (subEnd > now) {
          subDaysLeft = Math.ceil((subEnd - now) / (1000 * 60 * 60 * 24));
        }
      }
      newExpirationDate.setDate(newExpirationDate.getDate() + 30 + subDaysLeft);
    }

    try {
      // 1. Actualizar la tienda con su nueva fecha de corte
      const { data, error } = await supabase.from('stores').update({
        is_trial: false,
        is_active: true,
        subscription_expires_at: newExpirationDate.toISOString()
      }).eq('id', store.id).select();

      if (error) throw error;
      if (!data || data.length === 0) {
        alert("⚠️ La base de datos no permitió actualizar la tienda.");
        return;
      }

      // 2. Registrar el cobro detallado en saas_transactions (SOLO SI NO ES DEMO)
      if (!store.is_demo) {
        try {
          const methodTextMap = {
            cash_usd: 'Efectivo USD',
            pago_movil: 'Pago Móvil (Bs)',
            zelle: 'Zelle / Transferencia',
            pending: '⏳ Cobro Pendiente (Por cobrar)'
          };

          await supabase.from('saas_transactions').insert([{
            type: isPendingPayment ? 'pending_income' : 'income',
            amount: finalPriceNum,
            description: `Mensualidad: ${store.name} [${methodTextMap[renewPaymentMethod] || renewPaymentMethod}]`,
            store_id: store.id,
            vendor_id: store.system_vendor_id || null,
            payment_method: renewPaymentMethod,
            reference: renewReference.trim(),
            rate_applied: bcvRate || 0,
            is_pending: isPendingPayment
          }]);

          // Si tiene vendedor y NO es deuda pendiente, calcular su comisión
          if (store.system_vendor_id && !isPendingPayment) {
            const commissionAmount = finalPriceNum * 0.20;
            const { data: vData } = await supabase.from('system_vendors').select('pending_balance, total_earned').eq('id', store.system_vendor_id).single();
            if (vData) {
              await supabase.from('system_vendors').update({
                pending_balance: parseFloat((vData.pending_balance || 0)) + commissionAmount,
                total_earned: parseFloat((vData.total_earned || 0)) + commissionAmount
              }).eq('id', store.system_vendor_id);
            }
          }
        } catch (transErr) {
          console.warn("Aviso al registrar transacción:", transErr.message);
        }
      }

      alert(isPendingPayment 
        ? `⚠️ Comercio activado por 30 días, pero marcado con PAGO PENDIENTE ($${finalPriceNum.toFixed(2)}).` 
        : `¡Pago de $${finalPriceNum.toFixed(2)} registrado con éxito!\n\nTienda reactivada hasta: ${newExpirationDate.toLocaleDateString()}`);

      setShowRenewModal(false);
      setTargetStoreForRenew(null);
      fetchAdminStores();
      if (typeof fetchSystemVendors === 'function') fetchSystemVendors();
      if (typeof fetchSaasTransactions === 'function') fetchSaasTransactions();
    } catch (error) {
      alert("Error al procesar cobro: " + error.message);
    } finally {
      setRenewProcessing(false);
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
            <span style={{ fontSize: '13px', color: '#6c757d', fontWeight: 'bold' }}>Ingresos Cobrados (Suscripciones)</span>
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
              <div className="form-group" style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" id="storePaidAdvance" checked={storePaidAdvance} onChange={(e) => setStorePaidAdvance(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                <label htmlFor="storePaidAdvance" style={{ cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', margin: 0, color: '#2b8a3e' }}>
                  ¿El comercio pagó el mes por adelantado? (Activa 40 días: 30 de mes + 10 de cortesía)
                </label>
              </div>
            )}

            {/* CHECKBOX DE COMERCIO DE PRUEBA (DEMO) */}
            <div className="form-group" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', background: '#fff5f5', padding: '10px', borderRadius: '6px', border: '1px solid #ffc9c9' }}>
              <input 
                type="checkbox" 
                id="storeIsDemo" 
                checked={storeIsDemo} 
                onChange={(e) => setStoreIsDemo(e.target.checked)} 
                style={{ width: '18px', height: '18px', cursor: 'pointer' }} 
              />
              <label htmlFor="storeIsDemo" style={{ cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', margin: 0, color: '#c92a2a' }}>
                🧪 ¿Es Comercio de Prueba (Demo)? (No suma dinero a la contabilidad)
              </label>
            </div>

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
                <th style={{ textAlign: 'center' }}>Acciones & Cobros</th>
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
                        {store.is_demo && (
                          <span style={{ fontSize: '10px', background: '#ffe3e3', color: '#c92a2a', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', marginRight: '4px', border: '1px solid #ffa8a8' }}>
                            🧪 DEMO
                          </span>
                        )}
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
                        {!store.is_active ? (
                          <span className="badge-credit" style={{ background: '#ffe3e3', color: '#c92a2a' }}><AlertCircle size={12}/> Suspendido</span>
                        ) : (daysText.includes('expirada') || daysText.includes('vencida')) ? (
                          <span className="badge-credit" style={{ background: '#fff3bf', color: '#d9480f' }}><AlertCircle size={12}/> Vencido</span>
                        ) : (
                          <span className="badge-completed"><CheckCircle size={12}/> Activo</span>
                        )}
                      </td>
                      <td className="action-cell">
                        <div className="action-buttons" style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                          <button className="btn-icon-whatsapp" onClick={() => sendStoreRenewalWhatsApp(store)} title="Enviar WhatsApp de Renovación / Cobro">
                            <MessageCircle size={16} />
                          </button>

                          {/* BOTÓN RENOVAR CON PASARELA DE PAGO ADMINISTRATIVA */}
                          <button 
                            className="btn-icon-success" 
                            onClick={() => handleOpenRenewModal(store)} 
                            title="Cobrar Renovación (Registrar método de pago y referencia)" 
                            style={{ background: '#1c7ed6', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <DollarIcon size={13} /> Cobrar / Renovar
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
                            onClick={() => handleToggleDemo(store.id, store.is_demo)} 
                            style={{ 
                              borderColor: store.is_demo ? '#fa5252' : '#ced4da', 
                              color: store.is_demo ? '#fa5252' : '#495057', 
                              background: store.is_demo ? '#fff5f5' : '#f8f9fa',
                              fontSize: '11px', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' 
                            }}
                            title={store.is_demo ? "Comercio marcado como DEMO" : "Comercio marcado como REAL"}
                          >
                            {store.is_demo ? '🧪 Demo' : '🏢 Real'}
                          </button>

                          <button 
                            className="btn-secondary" 
                            onClick={() => handleToggleKrono(store.id, store.krono_enabled)} 
                            style={{ 
                              borderColor: store.krono_enabled ? '#10b981' : '#ced4da', 
                              color: store.krono_enabled ? '#10b981' : '#6c757d', 
                              background: store.krono_enabled ? '#ecfdf5' : '#f8f9fa',
                              fontSize: '11px', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' 
                            }}
                            title={store.krono_enabled ? "Krono Market está ACTIVO" : "Activar Krono Market"}
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

      {/* HISTORIAL DETALLADO DE COBROS SAAS */}
      {saasTransactions && saasTransactions.length > 0 && (
        <div className="product-list-card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2b8a3e' }}>
            <FileText size={18} /> Historial de Cobros y Transacciones del Sistema
          </h3>
          <div className="table-responsive">
            <table className="fiskal-table" style={{ fontSize: '13px' }}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Descripción / Comercio</th>
                  <th>Método de Pago</th>
                  <th>Referencia</th>
                  <th style={{ textAlign: 'right' }}>Monto Cobrado</th>
                </tr>
              </thead>
              <tbody>
                {saasTransactions.slice(0, 10).map((t) => (
                  <tr key={t.id}>
                    <td>{new Date(t.created_at).toLocaleDateString()}</td>
                    <td><strong>{t.description}</strong></td>
                    <td>
                      <span style={{ 
                        background: t.payment_method === 'pago_movil' ? '#e7f5ff' : t.payment_method === 'zelle' ? '#f3d9fa' : t.payment_method === 'pending' ? '#fff3bf' : '#ebfbee',
                        color: t.payment_method === 'pago_movil' ? '#1864ab' : t.payment_method === 'zelle' ? '#862e9c' : t.payment_method === 'pending' ? '#d9480f' : '#2b8a3e',
                        padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold'
                      }}>
                        {t.payment_method === 'cash_usd' ? '💵 Efectivo USD' : 
                         t.payment_method === 'pago_movil' ? '📱 Pago Móvil' : 
                         t.payment_method === 'zelle' ? '💳 Zelle' : 
                         t.payment_method === 'pending' ? '⏳ Pendiente' : '💵 Efectivo'}
                      </span>
                    </td>
                    <td><span style={{ color: '#495057' }}>{t.reference || '---'}</span></td>
                    <td style={{ textAlign: 'right' }}>
                      <strong style={{ color: t.type === 'expense' ? '#fa5252' : t.is_pending ? '#d9480f' : '#2b8a3e', fontSize: '14px' }}>
                        {t.type === 'expense' ? '-' : '+'}${parseFloat(t.amount).toFixed(2)}
                      </strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: PASARELA DE COBRO ADMINISTRATIVA (RENOVAR TIENDA)  */}
      {/* ========================================================= */}
      {showRenewModal && targetStoreForRenew && (
        <div className="modal-overlay" style={{ zIndex: 10008 }}>
          <div className="modal-content" style={{ width: '460px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <DollarIcon size={18} color="#2b8a3e" /> Cobro de Mensualidad
              </h3>
              <button className="btn-close-modal" onClick={() => setShowRenewModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleConfirmSaaSPayment}>
              <div className="modal-body fiskal-form">
                <div style={{ background: '#f8f9fa', padding: '12px 16px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
                  <div style={{ fontSize: '12px', color: '#6c757d' }}>Comercio a renovar:</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#212529' }}>{targetStoreForRenew.name}</div>
                  <div style={{ fontSize: '12px', color: '#495057', marginTop: '2px' }}>
                    Dueño: <strong>{targetStoreForRenew.owner_name || 'N/A'}</strong> | Tel: {targetStoreForRenew.phone || 'N/A'}
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '8px' }}>
                  <label>Monto a Cobrar ($ USD)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={renewAmount} 
                    onChange={(e) => setRenewAmount(e.target.value)} 
                    style={{ fontSize: '18px', fontWeight: 'bold', color: '#2b8a3e' }}
                    required 
                  />
                </div>

                {/* SELECTOR DE MÉTODO DE PAGO */}
                <div className="form-group">
                  <label>¿Cómo te pagó el comercio?</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setRenewPaymentMethod('cash_usd')}
                      style={{
                        padding: '10px 8px', borderRadius: '6px', border: renewPaymentMethod === 'cash_usd' ? '2px solid #2b8a3e' : '1px solid #ced4da',
                        background: renewPaymentMethod === 'cash_usd' ? '#ebfbee' : '#fff', color: renewPaymentMethod === 'cash_usd' ? '#2b8a3e' : '#495057',
                        fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                      }}
                    >
                      💵 Efectivo USD
                    </button>
                    <button
                      type="button"
                      onClick={() => setRenewPaymentMethod('pago_movil')}
                      style={{
                        padding: '10px 8px', borderRadius: '6px', border: renewPaymentMethod === 'pago_movil' ? '2px solid #1864ab' : '1px solid #ced4da',
                        background: renewPaymentMethod === 'pago_movil' ? '#e7f5ff' : '#fff', color: renewPaymentMethod === 'pago_movil' ? '#1864ab' : '#495057',
                        fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                      }}
                    >
                      📱 Pago Móvil
                    </button>
                    <button
                      type="button"
                      onClick={() => setRenewPaymentMethod('zelle')}
                      style={{
                        padding: '10px 8px', borderRadius: '6px', border: renewPaymentMethod === 'zelle' ? '2px solid #862e9c' : '1px solid #ced4da',
                        background: renewPaymentMethod === 'zelle' ? '#f3d9fa' : '#fff', color: renewPaymentMethod === 'zelle' ? '#862e9c' : '#495057',
                        fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                      }}
                    >
                      💳 Zelle / Transf.
                    </button>
                    <button
                      type="button"
                      onClick={() => setRenewPaymentMethod('pending')}
                      style={{
                        padding: '10px 8px', borderRadius: '6px', border: renewPaymentMethod === 'pending' ? '2px solid #d9480f' : '1px solid #ced4da',
                        background: renewPaymentMethod === 'pending' ? '#fff3bf' : '#fff', color: renewPaymentMethod === 'pending' ? '#d9480f' : '#495057',
                        fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                      }}
                    >
                      ⏳ Por Cobrar
                    </button>
                  </div>
                </div>

                {/* Detalle en Bolívares si es Pago Móvil */}
                {renewPaymentMethod === 'pago_movil' && (
                  <div style={{ background: '#e7f5ff', padding: '10px 14px', borderRadius: '6px', border: '1px solid #74c0fc', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#1864ab' }}>Total recibido en Bs (Tasa {bcvRate ? bcvRate.toFixed(2) : 'BCV'}):</span>
                    <strong style={{ fontSize: '15px', color: '#1864ab' }}>
                      Bs. {((parseFloat(renewAmount) || 0) * (bcvRate || 1)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                  </div>
                )}

                {/* Campo de Referencia Bancaria */}
                {renewPaymentMethod !== 'cash_usd' && (
                  <div className="form-group">
                    <label>{renewPaymentMethod === 'pending' ? 'Nota sobre el compromiso de pago' : 'Número de Referencia Bancaria'}</label>
                    <input 
                      type="text" 
                      value={renewReference} 
                      onChange={(e) => setRenewReference(e.target.value)} 
                      placeholder={renewPaymentMethod === 'pending' ? 'Ej. Prometió pagar el viernes...' : 'Ej. Ref: 894210'} 
                      required={renewPaymentMethod !== 'pending'}
                    />
                  </div>
                )}
              </div>

              <div className="modal-footer" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowRenewModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={renewProcessing} style={{ background: '#2b8a3e' }}>
                  {renewProcessing ? 'Registrando...' : 'Confirmar Cobro y Renovar 30 Días'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default AdminMasterView;