import React from 'react';
import { Image as ImageIcon, Package, QrCode, Edit2, Trash2 } from 'lucide-react';

function ProductsView({
  editingProduct,
  currentStoreType,
  handleUpdateProduct,
  handleAddProduct,
  imagePreview,
  handleImageSelect,
  name,
  setName,
  barcode,
  setBarcode,
  price,
  setPrice,
  stock,
  setStock,
  category,
  setCategory,
  products,
  productModifiers,
  setProductModifiers,
  newModifierText,
  setNewModifierText,
  addProductModifierTag,
  removeProductModifierTag,
  currentStoreKronoEnabled,
  showInKrono,
  setShowInKrono,
  kronoPrice,
  setKronoPrice,
  resetProductForm,
  loading,
  setShowPrintCatalog,
  handleOpenLabel,
  handleStartEditProduct,
  handleDeleteProduct
}) {
  return (
    <div className="products-layout">
      <div className="product-form-card">
        <h3>{editingProduct ? `Editando: ${editingProduct.name}` : `Agregar Nuevo ${currentStoreType === 'restaurant' ? 'Platillo / Ítem' : 'Producto'}`}</h3>
        <form onSubmit={editingProduct ? handleUpdateProduct : handleAddProduct} className="fiskal-form">
          <div className="form-group">
            <label>Fotografía {currentStoreType === 'restaurant' ? 'del Platillo' : 'del Producto'}</label>
            <div style={{ border: '2px dashed #ced4da', padding: '16px', textAlign: 'center', borderRadius: '6px', background: '#f8f9fa' }}>
              {imagePreview ? (
                <div style={{ marginBottom: '10px' }}>
                  <img src={imagePreview} alt="Vista previa" style={{ maxHeight: '100px', objectFit: 'cover', borderRadius: '4px' }} />
                </div>
              ) : (
                <div style={{ marginBottom: '10px', color: '#6c757d' }}>
                  <ImageIcon size={32} style={{ margin: '0 auto 6px auto', display: 'block' }} />
                  <span style={{ fontSize: '12px' }}>Sube una foto</span>
                </div>
              )}
              <input type="file" accept="image/*" capture="environment" onChange={handleImageSelect} style={{ fontSize: '12px', width: '100%' }} />
            </div>
          </div>

          <div className="form-group">
            <label>Nombre {currentStoreType === 'restaurant' ? 'del Platillo' : 'del Producto'}</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder={currentStoreType === 'restaurant' ? "Ej. Hamburguesa Doble" : "Ej. Harina PAN"} />
          </div>
          <div className="form-group">
            <label>Código de Barras / SKU</label>
            <input type="text" value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="SKU-001" />
          </div>
          <div className="form-group">
            <label>Precio de Venta ($ USD)</label>
            <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required placeholder="0.00" />
          </div>
          <div className="form-group">
            <label>Stock (Unidades)</label>
            <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} required placeholder="0" />
          </div>
          <div className="form-group">
            <label>Categoría</label>
            <select 
              value={
                ['General', 'Por Peso', ...products.map(p => (p.category || '').trim())].includes(category) 
                  ? category 
                  : 'OTRA'
              } 
              onChange={(e) => {
                if (e.target.value === 'OTRA') {
                  setCategory(''); 
                } else {
                  setCategory(e.target.value);
                  if(e.target.value === 'Por Peso') setProductModifiers(['kg']); 
                }
              }} 
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ced4da', fontSize: '13px', marginBottom: category === 'Por Peso' || !['General', 'Por Peso', ...products.map(p => (p.category || '').trim())].includes(category) ? '8px' : '0' }}
            >
              <option value="General">General</option>
              {currentStoreType !== 'restaurant' && <option value="Por Peso">Por Peso (Balanza)</option>}
              
              {[...new Set(products.map(p => (p.category || '').trim()).filter(c => c && c !== 'General' && c !== 'Por Peso'))].map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
              
              <option value="OTRA" style={{ fontWeight: 'bold', color: '#1c7ed6' }}>+ Crear nueva categoría...</option>
            </select>

            {!['General', 'Por Peso', ...products.map(p => (p.category || '').trim())].includes(category) && (
              <input 
                type="text" 
                value={category} 
                onChange={(e) => setCategory(e.target.value)} 
                placeholder="Escribe el nombre de la nueva categoría..." 
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #1c7ed6', fontSize: '13px', background: '#e7f5ff', marginTop: '8px' }}
                autoFocus
              />
            )}
          </div>

          {category === 'Por Peso' && currentStoreType !== 'restaurant' && (
            <div className="form-group" style={{ background: '#e7f5ff', padding: '12px', borderRadius: '6px', border: '1px solid #74c0fc', marginBottom: '16px', marginTop: '12px' }}>
              <label style={{ color: '#1971c2', fontWeight: 'bold' }}>Unidad de Medida Base</label>
              <select 
                value={productModifiers[0] || 'kg'} 
                onChange={(e) => setProductModifiers([e.target.value])}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '13px' }}
              >
                <option value="kg">Kilogramos (Kg)</option>
                <option value="g">Gramos (g)</option>
              </select>
              <span style={{ fontSize: '11px', color: '#495057', display: 'block', marginTop: '6px' }}>
                El precio de venta que colocaste arriba será el costo por cada 1 {productModifiers[0] || 'kg'} exacto de este producto.
              </span>
            </div>
          )}

          {/* ETIQUETAS DINÁMICAS (MODO RESTAURANTE) */}
          {currentStoreType === 'restaurant' && (
            <div className="form-group" style={{ background: '#f8f9fa', padding: '12px', borderRadius: '6px', border: '1px solid #ced4da', marginBottom: '16px' }}>
              <label style={{ fontWeight: 'bold', color: '#2b8a3e', marginBottom: '6px', display: 'block', fontSize: '13px' }}>
                Etiquetas de Modificación (Ingredientes)
              </label>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                <input 
                  type="text" 
                  value={newModifierText} 
                  onChange={(e) => setNewModifierText(e.target.value)} 
                  placeholder="Ej. Cebolla, Queso, Salsas..." 
                  style={{ flex: 1, padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #ced4da' }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addProductModifierTag(); } }}
                />
                <button 
                  type="button" 
                  onClick={addProductModifierTag} 
                  style={{ background: '#2b8a3e', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  + Añadir etiqueta
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {productModifiers.map((mod, idx) => (
                  <span key={idx} style={{ background: '#e9ecef', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #dee2e6' }}>
                    {mod}
                    <button 
                      type="button" 
                      onClick={() => removeProductModifierTag(mod)} 
                      style={{ background: 'none', border: 'none', color: '#fa5252', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', padding: 0, lineHeight: 1 }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* INTEGRACIÓN KRONO MARKET */}
          {currentStoreKronoEnabled && (
            <div className="form-group" style={{ background: showInKrono ? '#ecfdf5' : '#f8fafc', padding: '12px', borderRadius: '6px', border: showInKrono ? '1px solid #10b981' : '1px solid #e2e8f0', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: showInKrono ? '12px' : '0' }}>
                <input type="checkbox" id="showInKrono" checked={showInKrono} onChange={(e) => setShowInKrono(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                <label htmlFor="showInKrono" style={{ margin: 0, cursor: 'pointer', fontWeight: 'bold', color: '#0f766e' }}>
                  🛒 Publicar en Krono Market (App de Delivery)
                </label>
              </div>
              {showInKrono && (
                <div style={{ marginLeft: '24px' }}>
                  <label style={{ fontSize: '12px', color: '#475569', marginBottom: '4px', display: 'block' }}>Precio Preferencial en Krono ($ USD) - Opcional</label>
                  <input type="number" step="0.01" value={kronoPrice} onChange={(e) => setKronoPrice(e.target.value)} placeholder="Ej. 4.50 (Deja vacío para usar precio normal)" style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            {editingProduct && (
              <button type="button" className="btn-secondary" onClick={resetProductForm} style={{ flex: 1 }}>Cancelar</button>
            )}
            <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 2 }}>
              <Package size={18} /> {loading ? 'Guardando...' : (editingProduct ? 'Actualizar' : 'Guardar')}
            </button>
          </div>
        </form>
      </div>

      <div className="product-list-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ margin: 0 }}>Inventario Registrado ({products.length})</h3>
          <button className="btn-secondary" onClick={() => setShowPrintCatalog(true)} style={{ fontSize: '12px', padding: '6px 12px' }}>🖨️ Imprimir Catálogo</button>
        </div>
        <div className="table-responsive">
          <table className="fiskal-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Precio / Costo</th>
                <th>Categoría</th>
                <th>Stock</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr><td colSpan="5" className="empty-text">No hay productos registrados.</td></tr>
              ) : (
                products.map((prod) => (
                  <tr key={prod.id}>
                    <td>
                      <strong>{prod.name}</strong><br/>
                      <span style={{ fontSize: '11px', color: '#6c757d' }}>{prod.barcode ? `SKU: ${prod.barcode}` : 'Sin SKU'}</span>
                      {prod.show_in_krono && <span style={{ marginLeft: '6px', fontSize: '10px', background: '#ecfdf5', color: '#10b981', padding: '2px 6px', borderRadius: '4px', border: '1px solid #10b981' }}>🛒 Krono</span>}
                    </td>
                    <td>
                      <strong>${prod.price.toFixed(2)}</strong><br/>
                      <span style={{ fontSize: '11px', color: '#6c757d' }}>Costo: ${prod.cost ? prod.cost.toFixed(2) : '0.00'}</span>
                    </td>
                    <td><span style={{ background: '#f8f9fa', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', border: '1px solid #dee2e6' }}>{prod.category || 'General'}</span></td>
                    <td>
                      <span style={{ fontWeight: 'bold', color: prod.stock <= 5 ? '#fa5252' : '#212529' }}>
                        {prod.stock !== undefined ? prod.stock : 0}
                      </span>
                    </td>
                    <td className="action-cell">
                      <div className="action-buttons" style={{ justifyContent: 'center' }}>
                        <button className="btn-icon-primary" onClick={() => handleOpenLabel(prod)} title="Ver Etiqueta QR"><QrCode size={16} /></button>
                        <button className="btn-icon-edit" onClick={() => handleStartEditProduct(prod)} title="Editar"><Edit2 size={16} /></button>
                        <button className="btn-icon-danger" onClick={() => handleDeleteProduct(prod.id)} title="Eliminar"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default ProductsView;