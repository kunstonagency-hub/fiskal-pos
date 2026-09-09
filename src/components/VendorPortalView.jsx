import React from 'react';
import { Store } from 'lucide-react';

function VendorPortalView({
  globalPromoDiscount,
  handleVendorRegisterStoreSubmit,
  vendorStoreName,
  setVendorStoreName,
  vendorStoreRif,
  setVendorStoreRif,
  vendorNewStoreType,
  setVendorNewStoreType,
  vendorStoreCountry,
  setVendorStoreCountry,
  vendorOwnerName,
  setVendorOwnerName,
  vendorOwnerPhone,
  setVendorOwnerPhone,
  vendorOwnerEmail,
  setVendorOwnerEmail,
  vendorPaidAdvance,
  setVendorPaidAdvance,
  getCalculatedMonthlyPrice,
  baseMonthlyPrice
}) {
  return (
    <div className="product-form-card" style={{ maxWidth: '700px', margin: '0 auto' }}>
      <h3>Registrar Nuevo Comercio</h3>
      <p style={{ fontSize: '13px', color: '#6c757d', marginBottom: '20px' }}>
        Como vendedor de sistema, al registrar un comercio aquí, el negocio quedará vinculado a tu ID para el cálculo automático de tus comisiones (50% registro y 20% mensualidad).
      </p>
      
      {globalPromoDiscount > 0 && (
        <div style={{ background: '#fff3bf', padding: '10px', borderRadius: '6px', marginBottom: '16px', fontSize: '13px', color: '#e67700', border: '1px solid #ffe066' }}>
          <strong>¡Promo Activa!</strong> Tienes un <strong>{globalPromoDiscount}% de descuento</strong> disponible para ofrecer a nuevos registros hoy.
        </div>
      )}

      <form onSubmit={handleVendorRegisterStoreSubmit} className="fiskal-form">
        <div className="form-group">
          <label>Nombre del Comercio / Negocio</label>
          <input 
            type="text" 
            value={vendorStoreName} 
            onChange={e => setVendorStoreName(e.target.value)} 
            placeholder="Ej. Minimarket El Triunfo" 
            required 
          />
        </div>
        <div className="form-group">
          <label>RIF / Cédula del Comercio</label>
          <input 
            type="text" 
            value={vendorStoreRif} 
            onChange={e => setVendorStoreRif(e.target.value)} 
            placeholder="Ej. J-12345678-9" 
          />
        </div>
        
        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label>Tipo de Interfaz (Máscara) del Cliente</label>
          <select 
            value={vendorNewStoreType} 
            onChange={e => setVendorNewStoreType(e.target.value)} 
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ced4da', fontSize: '13px' }}
          >
            <option value="standard">Minimarket / Tienda Estándar</option>
            <option value="restaurant">Restaurante / Comida Rápida</option>
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label>País Operativo del Comercio</label>
          <select 
            value={vendorStoreCountry} 
            onChange={e => setVendorStoreCountry(e.target.value)} 
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ced4da', fontSize: '13px' }}
          >
            <option value="venezuela">Venezuela (Bolívares / BCV / Pago Móvil)</option>
            <option value="panama">Panamá (Dolarizado / Sin BCV)</option>
            <option value="el_salvador">El Salvador (Dolarizado / Sin BCV)</option>
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="form-group">
            <label>Nombre del Dueño</label>
            <input 
              type="text" 
              value={vendorOwnerName} 
              onChange={e => setVendorOwnerName(e.target.value)} 
              placeholder="Ej. Pedro Gómez" 
            />
          </div>
          <div className="form-group">
            <label>Teléfono (WhatsApp)</label>
            <input 
              type="text" 
              value={vendorOwnerPhone} 
              onChange={e => setVendorOwnerPhone(e.target.value)} 
              placeholder="Ej. 04141234567" 
            />
          </div>
        </div>

        <div className="form-group">
          <label>Correo Electrónico</label>
          <input 
            type="email" 
            value={vendorOwnerEmail} 
            onChange={e => setVendorOwnerEmail(e.target.value)} 
            placeholder="dueño@comercio.com" 
          />
        </div>

        <div className="form-group" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input 
            type="checkbox" 
            id="vendorPaidAdvance" 
            checked={vendorPaidAdvance} 
            onChange={(e) => setVendorPaidAdvance(e.target.checked)} 
            style={{ width: '18px', height: '18px', cursor: 'pointer' }} 
          />
          <label htmlFor="vendorPaidAdvance" style={{ cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', margin: 0, color: '#2b8a3e' }}>
            ¿El comercio pagó el mes por adelantado? (Activa 40 días: 30 de mes + 10 cortesía)
          </label>
        </div>

        <button type="submit" className="btn-primary" style={{ background: '#2b8a3e', marginTop: '10px' }}>
          <Store size={18} /> Registrar Comercio (${getCalculatedMonthlyPrice(0, baseMonthlyPrice).toFixed(2)}/mes)
        </button>
      </form>
    </div>
  );
}

export default VendorPortalView;