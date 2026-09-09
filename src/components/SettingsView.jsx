import React, { useEffect } from 'react';
import { Store, Check, UserPlus, User, HardDrive, Plus, Trash2, MessageCircle } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => { 
    map.setView(center, map.getZoom()); 
  }, [center, map]);
  return null;
}

function SettingsView({
  currentStoreRif,
  setCurrentStoreRif,
  currentStoreAddress,
  setCurrentStoreAddress,
  currentStoreCountry,
  currentStoreTaxEnabled,
  setCurrentStoreTaxEnabled,
  currentStoreTaxRate,
  setCurrentStoreTaxRate,
  currentStoreTaxInclusive,
  setCurrentStoreTaxInclusive,
  handleSaveFiscalSettings,
  savingFiscal,
  currentStoreLat,
  setCurrentStoreLat,
  currentStoreLng,
  setCurrentStoreLng,
  handleGetLocation,
  newEmpName,
  setNewEmpName,
  newEmpEmail,
  setNewEmpEmail,
  newEmpPass,
  setNewEmpPass,
  handleCreateEmployee,
  creatingEmployee,
  employees,
  newRegisterName,
  setNewRegisterName,
  isMainRegister,
  setIsMainRegister,
  handleAddRegister,
  registers,
  handleDeleteRegister,
  clientes,
  clienteSeleccionado,
  setClienteSeleccionado,
  productos,
  productoSeleccionado,
  setProductoSeleccionado,
  mostrarNuevaPlantilla,
  setMostrarNuevaPlantilla,
  nombreNuevaPlantilla,
  setNombreNuevaPlantilla,
  handleCrearPlantilla,
  plantillaActiva,
  setPlantillaActiva,
  plantillas,
  setPlantillas,
  insertarVariable,
  textareaRef,
  handleGuardarPlantillas,
  handleEnviarWhatsApp
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px', alignItems: 'stretch' }}>
      
      {/* 1. Datos Fiscales y Configuración de Comercio */}
      <div className="product-form-card" style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2b8a3e' }}>
          <Store size={20} /> Datos Fiscales y Configuración
        </h3>
        <form onSubmit={handleSaveFiscalSettings} className="fiskal-form" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div className="form-group">
            <label>{currentStoreCountry === 'venezuela' ? 'RIF' : 'Documento / NIT'} del Comercio</label>
            <input type="text" value={currentStoreRif} onChange={(e) => setCurrentStoreRif(e.target.value)} placeholder="Ej. J-12345678-9" />
          </div>
          <div className="form-group">
            <label>Dirección Física en Facturas</label>
            <textarea value={currentStoreAddress} onChange={(e) => setCurrentStoreAddress(e.target.value)} placeholder="Ej. Av. Principal, Local 4..." rows="2" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ced4da', fontSize: '13px', outline: 'none' }} />
          </div>
          
          <div style={{ borderTop: '1px solid #dee2e6', margin: '16px 0', paddingTop: '16px' }}>
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <input type="checkbox" id="taxEnabled" checked={currentStoreTaxEnabled} onChange={(e) => setCurrentStoreTaxEnabled(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
              <label htmlFor="taxEnabled" style={{ cursor: 'pointer', fontWeight: 'bold', margin: 0 }}>Habilitar Cálculo de Impuestos (IVA/ITBMS)</label>
            </div>
            
            {currentStoreTaxEnabled && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#f8f9fa', padding: '12px', borderRadius: '6px', border: '1px solid #ced4da' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Tasa de Impuesto (%)</label>
                  <input type="number" step="0.1" value={currentStoreTaxRate} onChange={(e) => setCurrentStoreTaxRate(e.target.value)} />
                </div>
                <div className="form-group" style={{ margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', margin: 0 }}>
                    <input type="checkbox" checked={currentStoreTaxInclusive} onChange={(e) => setCurrentStoreTaxInclusive(e.target.checked)} />
                    <span style={{ fontSize: '12px' }}>Impuesto incluido en el precio de los productos</span>
                  </label>
                </div>
              </div>
            )}
          </div>
          <button type="submit" className="btn-primary" disabled={savingFiscal} style={{ marginTop: 'auto' }}>
            <Check size={18} /> {savingFiscal ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </form>
      </div>

      {/* 2. Mapa GPS */}
      <div className="product-form-card" style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e64980' }}>
          📍 Ubicación GPS para Krono Delivery
        </h3>
        <p style={{ fontSize: '12px', color: '#6c757d', marginBottom: '16px' }}>
          Fija la ubicación exacta de tu local para los motorizados. Arrastra el marcador o usa tu GPS.
        </p>
        <button
          type="button"
          onClick={handleGetLocation}
          style={{ width: '100%', marginBottom: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: '#fff', border: '1px solid #e64980', color: '#e64980', padding: '10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          🎯 Ubicar con GPS
        </button>
        <div style={{ flex: 1, minHeight: '250px', width: '100%', borderRadius: '6px', overflow: 'hidden', border: '1px solid #ced4da' }}>
          <MapContainer 
            center={[currentStoreLat || 10.3755, currentStoreLng || -66.9587]} 
            zoom={15} 
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapUpdater center={[currentStoreLat || 10.3755, currentStoreLng || -66.9587]} />
            <Marker 
              position={[currentStoreLat || 10.3755, currentStoreLng || -66.9587]} 
              icon={customIcon}
              draggable={true}
              eventHandlers={{
                dragend: (e) => {
                  const marker = e.target;
                  const position = marker.getLatLng();
                  setCurrentStoreLat(position.lat);
                  setCurrentStoreLng(position.lng);
                },
              }}
            >
              <Popup>Ubicación de tu comercio</Popup>
            </Marker>
          </MapContainer>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '12px', color: '#495057', background: '#f8f9fa', padding: '8px', borderRadius: '4px' }}>
          <span><strong>Lat:</strong> {currentStoreLat ? currentStoreLat.toFixed(6) : 'N/A'}</span>
          <span><strong>Lng:</strong> {currentStoreLng ? currentStoreLng.toFixed(6) : 'N/A'}</span>
        </div>
      </div>

      {/* 3. Crear Empleados */}
      <div className="product-form-card" style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1c7ed6' }}>
          <UserPlus size={20} /> Registrar Cajero / Empleado
        </h3>
        <form onSubmit={handleCreateEmployee} className="fiskal-form">
          <div className="form-group">
            <label>Nombre Completo</label>
            <input type="text" value={newEmpName} onChange={(e) => setNewEmpName(e.target.value)} required placeholder="Ej. Juan Pérez" />
          </div>
          <div className="form-group">
            <label>Correo Electrónico</label>
            <input type="email" value={newEmpEmail} onChange={(e) => setNewEmpEmail(e.target.value)} required placeholder="juan@ejemplo.com" />
          </div>
          <div className="form-group">
            <label>Contraseña</label>
            <input type="password" value={newEmpPass} onChange={(e) => setNewEmpPass(e.target.value)} required placeholder="Mínimo 6 caracteres" />
          </div>
          <button type="submit" className="btn-primary" disabled={creatingEmployee} style={{ background: '#1c7ed6' }}>
            <User size={18} /> {creatingEmployee ? 'Registrando...' : 'Registrar Empleado'}
          </button>
        </form>

        <div style={{ marginTop: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <h4 style={{ fontSize: '13px', color: '#495057', marginBottom: '8px', borderBottom: '1px solid #dee2e6', paddingBottom: '4px' }}>Equipo de Trabajo</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, overflowY: 'auto', flex: 1 }}>
            {employees.map(emp => (
              <li key={emp.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: '#f8f9fa', marginBottom: '4px', borderRadius: '4px', fontSize: '12px' }}>
                <span><strong>{emp.full_name}</strong></span>
                <span style={{ color: '#6c757d' }}>Rol: {emp.role}</span>
              </li>
            ))}
            {employees.length === 0 && <li style={{ fontSize: '12px', color: '#adb5bd' }}>No hay empleados registrados.</li>}
          </ul>
        </div>
      </div>

      {/* 4. Columna Derecha: Cajas y Plantillas apiladas */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* --- TARJETA A: GESTIÓN DE CAJAS FÍSICAS --- */}
        <div className="product-form-card" style={{ margin: 0 }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#d9480f' }}>
            <HardDrive size={20} /> Gestión de Cajas Físicas
          </h3>
          <p style={{ fontSize: '12px', color: '#6c757d', marginBottom: '16px' }}>
            Agrega terminales para aperturar turnos separados.
          </p>
          <form onSubmit={handleAddRegister} className="fiskal-form">
            <div className="form-group">
              <label>Nombre de la Caja</label>
              <input 
                type="text" 
                value={newRegisterName} 
                onChange={(e) => setNewRegisterName(e.target.value)} 
                required 
                placeholder="Ej. Caja Principal" 
              />
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <input 
                type="checkbox" 
                id="isMainReg" 
                checked={isMainRegister} 
                onChange={(e) => setIsMainRegister(e.target.checked)} 
                style={{ width: '16px', height: '16px' }} 
              />
              <label htmlFor="isMainReg" style={{ margin: 0, cursor: 'pointer', fontSize: '13px' }}>
                Establecer como Caja Principal
              </label>
            </div>
            <button type="submit" className="btn-primary" style={{ background: '#d9480f' }}>
              <Plus size={18} /> Registrar Caja
            </button>
          </form>
          <div style={{ marginTop: '24px' }}>
            <h4 style={{ fontSize: '13px', color: '#495057', marginBottom: '8px', borderBottom: '1px solid #dee2e6', paddingBottom: '4px' }}>
              Cajas Registradas
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {registers.map(reg => (
                <li key={reg.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: reg.is_main ? '#fff4e6' : '#f8f9fa', marginBottom: '4px', borderRadius: '4px', fontSize: '12px', border: reg.is_main ? '1px solid #ffd8a8' : 'none' }}>
                  <span>
                    <strong>{reg.name}</strong> 
                    {reg.is_main && <span style={{ color: '#d9480f', fontSize: '10px', marginLeft: '4px' }}>(Principal)</span>}
                  </span>
                  <button onClick={() => handleDeleteRegister(reg.id)} style={{ background: 'none', border: 'none', color: '#fa5252', cursor: 'pointer' }}>
                    <Trash2 size={14}/>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* --- TARJETA B: PLANTILLAS DE WHATSAPP --- */}
        <div className="product-form-card" style={{ margin: 0 }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2b8a3e', marginBottom: '16px' }}>
            <MessageCircle size={20} /> Plantillas de WhatsApp
          </h3>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
            <div className="form-group" style={{ flex: 1, margin: 0 }}>
              <label style={{ fontSize: '12px', marginBottom: '4px', display: 'block', fontWeight: 'bold' }}>CLIENTE DESTINO</label>
              <select 
                value={clienteSeleccionado} 
                onChange={(e) => setClienteSeleccionado(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ced4da', fontSize: '12px', outline: 'none' }}
              >
                <option value="">Selecciona un cliente...</option>
                {clientes.map(cliente => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.name} {cliente.phone ? `(${cliente.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ flex: 1, margin: 0 }}>
              <label style={{ fontSize: '12px', marginBottom: '4px', display: 'block', fontWeight: 'bold' }}>PRODUCTO A ENVIAR</label>
              <select 
                value={productoSeleccionado} 
                onChange={(e) => setProductoSeleccionado(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ced4da', fontSize: '12px', outline: 'none' }}
              >
                <option value="">Selecciona un producto...</option>
                {productos.map(producto => (
                  <option key={producto.id} value={producto.id}>{producto.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', margin: 0 }}>PLANTILLA A EDITAR</label>
              <button 
                type="button"
                onClick={() => setMostrarNuevaPlantilla(!mostrarNuevaPlantilla)} 
                style={{ background: 'none', border: 'none', color: '#2b8a3e', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Plus size={14} /> Nueva Plantilla
              </button>
            </div>

            {mostrarNuevaPlantilla ? (
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <input 
                  type="text" 
                  value={nombreNuevaPlantilla} 
                  onChange={(e) => setNombreNuevaPlantilla(e.target.value)} 
                  placeholder="Ej. Recordatorio de Pago" 
                  style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '12px', outline: 'none' }}
                />
                <button onClick={handleCrearPlantilla} type="button" className="btn-primary" style={{ background: '#2b8a3e', padding: '0 12px', fontSize: '12px' }}>Crear</button>
                <button onClick={() => setMostrarNuevaPlantilla(false)} type="button" style={{ background: '#f8f9fa', border: '1px solid #ced4da', padding: '0 12px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>Cancelar</button>
              </div>
            ) : (
              <select 
                value={plantillaActiva} 
                onChange={(e) => setPlantillaActiva(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ced4da', fontSize: '12px', outline: 'none', backgroundColor: '#f8f9fa' }}
              >
                {Object.keys(plantillas).map(clave => (
                  <option key={clave} value={clave}>
                    {clave.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', color: '#6c757d', fontWeight: 'bold', margin: 0 }}>CONTENIDO DE LA PLANTILLA</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button type="button" onClick={() => insertarVariable('{cliente}')} style={{ background: '#e9ecef', border: '1px solid #ced4da', borderRadius: '4px', padding: '4px 8px', fontSize: '10px', cursor: 'pointer', color: '#495057' }}>+ Cliente</button>
                <button type="button" onClick={() => insertarVariable('{producto}')} style={{ background: '#e9ecef', border: '1px solid #ced4da', borderRadius: '4px', padding: '4px 8px', fontSize: '10px', cursor: 'pointer', color: '#495057' }}>+ Producto</button>
                <button type="button" onClick={() => insertarVariable('{comercio}')} style={{ background: '#e9ecef', border: '1px solid #ced4da', borderRadius: '4px', padding: '4px 8px', fontSize: '10px', cursor: 'pointer', color: '#495057' }}>+ Comercio</button>
              </div>
            </div>
            <textarea 
              ref={textareaRef}
              value={plantillas[plantillaActiva] || ''} 
              onChange={(e) => setPlantillas({...plantillas, [plantillaActiva]: e.target.value})} 
              rows="4" 
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ced4da', fontSize: '12px', outline: 'none', resize: 'vertical' }} 
              placeholder="Ejemplo: ¡Hola {cliente}! Ya tenemos el {producto} en stock."
            />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={handleGuardarPlantillas} 
              className="btn-primary" 
              style={{ background: '#f8f9fa', color: '#2b8a3e', border: '1px solid #2b8a3e', width: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
            >
              <Check size={18} /> Guardar Cambios
            </button>

            <button 
              onClick={handleEnviarWhatsApp} 
              className="btn-primary" 
              style={{ background: '#25D366', color: '#fff', border: 'none', width: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
            >
              <MessageCircle size={18} /> Enviar por WhatsApp
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}

export default SettingsView;