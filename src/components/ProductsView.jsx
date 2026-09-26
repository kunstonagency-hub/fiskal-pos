import React, { useState } from "react";
import {
  Image as ImageIcon,
  Package,
  QrCode,
  Edit2,
  Trash2,
  Copy,
  Camera, // <-- IMPORTAMOS EL ÍCONO DE LA CÁMARA
} from "lucide-react";

// Vista de gestión del catálogo.
// Este componente centraliza el alta, edición, duplicado, eliminación y reabastecimiento de productos,
// además de los modifiers, extras y opciones específicas para restaurante.
function ProductsView({
  requestAdminAuth,
  editingProduct,
  currentStoreType,
  handleUpdateProduct,
  handleAddProduct,
  handleDuplicateProduct,
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
  productExtras,
  setProductExtras,
  newExtraName,
  setNewExtraName,
  newExtraPrice,
  setNewExtraPrice,
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
  handleDeleteProduct,
  onStartCameraScanner, // <--- NUEVA PROPIEDAD PARA ABRIR LA CÁMARA
}) {
  const [addedUnits, setAddedUnits] = useState("");

  const handleAddUnitsChange = (val) => {
    setAddedUnits(val);

    if (val === "") {
      setStock(editingProduct ? Number(editingProduct.stock || 0) : 0);
      return;
    }

    const add = parseInt(val, 10) || 0;
    const baseStock = editingProduct
      ? parseInt(editingProduct.stock || 0, 10)
      : 0;

    setStock(baseStock + add);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();

    if (typeof stock === "string" && stock !== "") {
      setStock(Number(stock));
    }

    if (editingProduct) {
      handleUpdateProduct(e);
    } else {
      handleAddProduct(e);
    }

    setTimeout(() => {
      setAddedUnits("");
    }, 300);
  };

  const handleAddExtraTag = () => {
    if (!newExtraName.trim() || !newExtraPrice) return;
    const priceNum = parseFloat(newExtraPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      alert("Ingresa un precio válido para el adicional");
      return;
    }

    const exists = (productExtras || []).some(
      (e) => e.name.toLowerCase() === newExtraName.trim().toLowerCase(),
    );
    if (exists) {
      alert("Ya agregaste este extra a la lista");
      return;
    }

    setProductExtras([
      ...(productExtras || []),
      { name: newExtraName.trim(), price: priceNum },
    ]);
    setNewExtraName("");
    setNewExtraPrice("");
  };

  const handleRemoveExtraTag = (extraNameToRemove) => {
    setProductExtras(
      (productExtras || []).filter((e) => e.name !== extraNameToRemove),
    );
  };

  const customResetForm = () => {
    setAddedUnits("");
    resetProductForm();
  };

  return (
    <div
      className="products-layout"
      style={{ maxWidth: "100%", boxSizing: "border-box", overflowX: "hidden" }}
    >
      <div
        className="product-form-card"
        style={{ maxWidth: "100%", boxSizing: "border-box" }}
      >
        <h3>
          {editingProduct
            ? `Editando: ${editingProduct.name}`
            : name.includes("(Copia)")
              ? `Duplicando: ${name}`
              : `Agregar Nuevo ${currentStoreType === "restaurant" ? "Platillo / Ítem" : "Producto"}`}
        </h3>

        <form
          onSubmit={handleFormSubmit}
          className="fiskal-form"
          style={{ width: "100%", boxSizing: "border-box" }}
        >
          <div className="form-group">
            <label>
              Fotografía{" "}
              {currentStoreType === "restaurant"
                ? "del Platillo"
                : "del Producto"}
            </label>
            <div
              style={{
                border: "2px dashed #ced4da",
                padding: "16px",
                textAlign: "center",
                borderRadius: "6px",
                background: "#f8f9fa",
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              {imagePreview ? (
                <div style={{ marginBottom: "10px" }}>
                  <img
                    src={imagePreview}
                    alt="Vista previa"
                    style={{
                      maxHeight: "100px",
                      maxWidth: "100%",
                      objectFit: "cover",
                      borderRadius: "4px",
                    }}
                  />
                </div>
              ) : (
                <div style={{ marginBottom: "10px", color: "#6c757d" }}>
                  <ImageIcon
                    size={32}
                    style={{ margin: "0 auto 6px auto", display: "block" }}
                  />
                  <span style={{ fontSize: "12px" }}>Sube una foto</span>
                </div>
              )}
              <input
                name="image"
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                style={{
                  fontSize: "12px",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          <div className="form-group">
            <label>
              Nombre{" "}
              {currentStoreType === "restaurant"
                ? "del Platillo"
                : "del Producto"}
            </label>
            <input
              name="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder={
                currentStoreType === "restaurant"
                  ? "Ej. Hamburguesa Doble"
                  : "Ej. Harina PAN"
              }
              style={{ width: "100%", boxSizing: "border-box" }}
            />
          </div>
          
          {/* --- AQUÍ FUE MODIFICADO EL CAMPO DEL CÓDIGO DE BARRAS --- */}
          <div className="form-group">
            <label>Código de Barras / SKU (Autogenerado al duplicar)</label>
            <div style={{ position: "relative", width: "100%", display: "flex", alignItems: "center" }}>
              <QrCode size={16} style={{ position: "absolute", left: "10px", color: "#6c757d", zIndex: 2 }} />
              <input
                name="barcode"
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Escanea o escribe el código..."
                style={{ width: "100%", boxSizing: "border-box", paddingLeft: "34px", paddingRight: "40px" }}
              />
              <button
                type="button"
                onClick={onStartCameraScanner}
                title="Escanear Código de Barras"
                style={{
                  position: "absolute",
                  right: "4px",
                  background: "#212529",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  padding: "6px 8px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 2
                }}
              >
                <Camera size={15} />
              </button>
            </div>
          </div>
          {/* --------------------------------------------------------- */}

          <div className="form-group">
            <label>Precio de Venta ($ USD)</label>
            <input
              name="price"
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              placeholder="0.00"
              style={{ width: "100%", boxSizing: "border-box" }}
            />
          </div>

          <div className="form-group">
            <label>Stock (Unidades Totales)</label>
            <input
              name="stock"
              type="number"
              value={stock}
              onChange={(e) => {
                const val = e.target.value;
                setStock(val === "" ? "" : Number(val));
              }}
              required
              placeholder="0"
              style={{ width: "100%", boxSizing: "border-box" }}
            />

            {editingProduct && (
              <div
                style={{
                  background: "#f0fdf4",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #bbf7d0",
                  marginTop: "8px",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: "800",
                    color: "#16a34a",
                    display: "block",
                    marginBottom: "4px",
                    textTransform: "uppercase",
                  }}
                >
                  📦 Reabastecer (Entrada de mercancía)
                </span>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <input
                    name="addedUnits"
                    type="number"
                    value={addedUnits}
                    onChange={(e) => handleAddUnitsChange(e.target.value)}
                    placeholder="Ej. 24 (lo que llegó)"
                    style={{
                      flex: "1 1 120px",
                      minWidth: "0",
                      padding: "8px 10px",
                      fontSize: "13px",
                      borderRadius: "6px",
                      border: "1px solid #16a34a",
                      outline: "none",
                      background: "#fff",
                      boxSizing: "border-box",
                    }}
                  />
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#16a34a",
                      fontWeight: "bold",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {addedUnits
                      ? `Total: ${stock} ud.`
                      : `Actual: ${editingProduct.stock || 0}`}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "10px",
                    color: "#64748b",
                    display: "block",
                    marginTop: "4px",
                  }}
                >
                  Escribe cuántas unidades llegaron y se sumarán
                  automáticamente.
                </span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Categoría</label>
            <select
              name="category_select"
              value={
                [
                  "General",
                  "Por Peso",
                  ...products.map((p) => (p.category || "").trim()),
                ].includes(category)
                  ? category
                  : "OTRA"
              }
              onChange={(e) => {
                if (e.target.value === "OTRA") {
                  setCategory("");
                } else {
                  setCategory(e.target.value);
                  if (e.target.value === "Por Peso")
                    setProductModifiers(["kg"]);
                }
              }}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #ced4da",
                fontSize: "13px",
                marginBottom:
                  category === "Por Peso" ||
                  ![
                    "General",
                    "Por Peso",
                    ...products.map((p) => (p.category || "").trim()),
                  ].includes(category)
                    ? "8px"
                    : "0",
              }}
            >
              <option value="General">General</option>
              {currentStoreType !== "restaurant" && (
                <option value="Por Peso">Por Peso (Balanza)</option>
              )}

              {[
                ...new Set(
                  products
                    .map((p) => (p.category || "").trim())
                    .filter((c) => c && c !== "General" && c !== "Por Peso"),
                ),
              ].map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}

              <option
                value="OTRA"
                style={{ fontWeight: "bold", color: "#1c7ed6" }}
              >
                + Crear nueva categoría...
              </option>
            </select>

            {![
              "General",
              "Por Peso",
              ...products.map((p) => (p.category || "").trim()),
            ].includes(category) && (
              <input
                name="category_input"
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Escribe el nombre de la nueva categoría..."
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid #1c7ed6",
                  fontSize: "13px",
                  background: "#e7f5ff",
                  marginTop: "8px",
                }}
                autoFocus
              />
            )}
          </div>

          {category === "Por Peso" && currentStoreType !== "restaurant" && (
            <div
              className="form-group"
              style={{
                background: "#e7f5ff",
                padding: "12px",
                borderRadius: "6px",
                border: "1px solid #74c0fc",
                marginBottom: "16px",
                marginTop: "12px",
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              <label style={{ color: "#1971c2", fontWeight: "bold" }}>
                Unidad de Medida Base
              </label>
              <select
                name="measure_unit"
                value={productModifiers[0] || "kg"}
                onChange={(e) => setProductModifiers([e.target.value])}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "8px",
                  borderRadius: "4px",
                  border: "1px solid #ced4da",
                  fontSize: "13px",
                }}
              >
                <option value="kg">Kilogramos (Kg)</option>
                <option value="g">Gramos (g)</option>
              </select>
              <span
                style={{
                  fontSize: "11px",
                  color: "#495057",
                  display: "block",
                  marginTop: "6px",
                }}
              >
                El precio de venta que colocaste arriba será el costo por cada 1{" "}
                {productModifiers[0] || "kg"} exacto de este producto.
              </span>
            </div>
          )}

          {currentStoreType === "restaurant" && (
            <div
              className="form-group"
              style={{
                background: "#f8f9fa",
                padding: "14px",
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
                marginBottom: "16px",
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              <label
                style={{
                  fontWeight: "800",
                  color: "#111827",
                  marginBottom: "6px",
                  display: "block",
                  fontSize: "12px",
                  textTransform: "uppercase",
                }}
              >
                1. Ingredientes Base (Vienen incluidos "Con todo")
              </label>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "6px",
                  marginBottom: "8px",
                  width: "100%",
                }}
              >
                <input
                  name="base_ingredient"
                  type="text"
                  value={newModifierText}
                  onChange={(e) => setNewModifierText(e.target.value)}
                  placeholder="Ej. Cebolla, Papa, Salsas..."
                  style={{
                    flex: "1 1 120px",
                    minWidth: "0",
                    padding: "8px",
                    fontSize: "12px",
                    borderRadius: "4px",
                    border: "1px solid #ced4da",
                    boxSizing: "border-box",
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addProductModifierTag();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={addProductModifierTag}
                  style={{
                    background: "#111827",
                    color: "#fff",
                    border: "none",
                    padding: "8px 12px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    whiteSpace: "nowrap",
                  }}
                >
                  + Agregar
                </button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {productModifiers.map((mod, idx) => (
                  <span
                    key={idx}
                    style={{
                      background: "#e9ecef",
                      padding: "4px 8px",
                      borderRadius: "12px",
                      fontSize: "12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      border: "1px solid #dee2e6",
                      color: "#212529",
                    }}
                  >
                    {mod}
                    <button
                      type="button"
                      onClick={() => removeProductModifierTag(mod)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#e05d5d",
                        cursor: "pointer",
                        fontWeight: "bold",
                        fontSize: "13px",
                        padding: 0,
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {currentStoreType === "restaurant" && (
            <div
              className="form-group"
              style={{
                background: "#f9fafb",
                padding: "14px",
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
                marginBottom: "16px",
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              <label
                style={{
                  fontWeight: "800",
                  color: "#16a34a",
                  marginBottom: "6px",
                  display: "block",
                  fontSize: "12px",
                  textTransform: "uppercase",
                }}
              >
                ⭐ 2. Adicionales / Extras con Costo
              </label>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "6px",
                  marginBottom: "8px",
                  width: "100%",
                }}
              >
                <input
                  name="extra_name"
                  type="text"
                  value={newExtraName}
                  onChange={(e) => setNewExtraName(e.target.value)}
                  placeholder="Nombre: Ej. Huevo, Tocineta"
                  style={{
                    flex: "1 1 110px",
                    minWidth: "0",
                    padding: "8px",
                    fontSize: "12px",
                    borderRadius: "4px",
                    border: "1px solid #ced4da",
                    boxSizing: "border-box",
                  }}
                />
                <input
                  name="extra_price"
                  type="number"
                  step="0.01"
                  value={newExtraPrice}
                  onChange={(e) => setNewExtraPrice(e.target.value)}
                  placeholder="Precio ($)"
                  style={{
                    flex: "1 1 80px",
                    minWidth: "0",
                    padding: "8px",
                    fontSize: "12px",
                    borderRadius: "4px",
                    border: "1px solid #ced4da",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddExtraTag}
                  style={{
                    flex: "1 1 auto",
                    background: "#16a34a",
                    color: "#fff",
                    border: "none",
                    padding: "8px 12px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    whiteSpace: "nowrap",
                  }}
                >
                  + Añadir Extra
                </button>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {(productExtras || []).length === 0 ? (
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#9ca3af",
                      fontStyle: "italic",
                    }}
                  >
                    No hay extras configurados.
                  </span>
                ) : (
                  productExtras.map((ex, idx) => (
                    <span
                      key={idx}
                      style={{
                        background: "#ebfbee",
                        padding: "4px 10px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        border: "1px solid #b2f2bb",
                        color: "#16a34a",
                        fontWeight: "700",
                      }}
                    >
                      {ex.name}: +${Number(ex.price).toFixed(2)}
                      <button
                        type="button"
                        onClick={() => handleRemoveExtraTag(ex.name)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#e05d5d",
                          cursor: "pointer",
                          fontWeight: "bold",
                          fontSize: "14px",
                          padding: 0,
                          lineHeight: 1,
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>
          )}

          {currentStoreKronoEnabled && (
            <div
              className="form-group"
              style={{
                background: showInKrono ? "#ecfdf5" : "#f8fafc",
                padding: "12px",
                borderRadius: "6px",
                border: showInKrono ? "1px solid #10b981" : "1px solid #e2e8f0",
                marginBottom: "16px",
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: showInKrono ? "12px" : "0",
                }}
              >
                <input
                  name="showInKrono"
                  type="checkbox"
                  id="showInKrono"
                  checked={showInKrono}
                  onChange={(e) => setShowInKrono(e.target.checked)}
                  style={{
                    width: "16px",
                    height: "16px",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                />
                <label
                  htmlFor="showInKrono"
                  style={{
                    margin: 0,
                    cursor: "pointer",
                    fontWeight: "bold",
                    color: "#0f766e",
                    lineHeight: 1.2,
                  }}
                >
                  🛒 Publicar en Krono Market (App de Delivery)
                </label>
              </div>
              {showInKrono && (
                <div style={{ marginLeft: "24px" }}>
                  <label
                    style={{
                      fontSize: "12px",
                      color: "#475569",
                      marginBottom: "4px",
                      display: "block",
                    }}
                  >
                    Precio Preferencial en Krono ($ USD) - Opcional
                  </label>
                  <input
                    name="kronoPrice"
                    type="number"
                    step="0.01"
                    value={kronoPrice}
                    onChange={(e) => setKronoPrice(e.target.value)}
                    placeholder="Ej. 4.50 (Deja vacío para usar precio normal)"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "8px",
                      borderRadius: "4px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                    }}
                  />
                </div>
              )}
            </div>
          )}

          <div
            style={{
              display: "flex",
              gap: "8px",
              marginTop: "12px",
              width: "100%",
            }}
          >
            {(editingProduct || name.includes("(Copia)")) && (
              <button
                type="button"
                className="btn-secondary"
                onClick={customResetForm}
                style={{ flex: 1 }}
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 2,
                background: "#111827",
                color: "#fff",
                border: "none",
                fontWeight: "700",
                padding: "12px",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              <Package size={18} />{" "}
              {loading
                ? "Guardando..."
                : editingProduct
                  ? "Actualizar"
                  : "Guardar"}
            </button>
          </div>
        </form>
      </div>

      <div
        className="product-list-card"
        style={{
          maxWidth: "100%",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "14px",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <h3 style={{ margin: 0 }}>
            Inventario Registrado ({products.length})
          </h3>
          <button
            className="btn-secondary"
            onClick={() => setShowPrintCatalog(true)}
            style={{ fontSize: "12px", padding: "6px 12px" }}
          >
            🖨️ Imprimir Catálogo
          </button>
        </div>

        {/* Aquí blindamos la tabla para que haga scroll interno si es necesario y no rompa el contenedor */}
        <div
          className="table-responsive"
          style={{
            width: "100%",
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
            display: "block",
          }}
        >
          <table className="fiskal-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Precio / Costo</th>
                <th>Categoría</th>
                <th>Stock</th>
                <th style={{ textAlign: "center" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan="5" className="empty-text">
                    No hay productos registrados.
                  </td>
                </tr>
              ) : (
                products.map((prod) => (
                  <tr key={prod.id}>
                    <td>
                      <strong>{prod.name}</strong>
                      <br />
                      <span style={{ fontSize: "11px", color: "#6c757d" }}>
                        {prod.barcode ? `SKU: ${prod.barcode}` : "Sin SKU"}
                      </span>
                      {prod.show_in_krono && (
                        <span
                          style={{
                            marginLeft: "6px",
                            fontSize: "10px",
                            background: "#ecfdf5",
                            color: "#10b981",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            border: "1px solid #10b981",
                          }}
                        >
                          🛒 Krono
                        </span>
                      )}
                    </td>
                    <td>
                      <strong>${prod.price.toFixed(2)}</strong>
                      <br />
                      <span style={{ fontSize: "11px", color: "#6c757d" }}>
                        Costo: ${prod.cost ? prod.cost.toFixed(2) : "0.00"}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          background: "#f8f9fa",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          border: "1px solid #dee2e6",
                        }}
                      >
                        {prod.category || "General"}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontWeight: "bold",
                          color: prod.stock <= 5 ? "#fa5252" : "#212529",
                        }}
                      >
                        {prod.stock !== undefined ? prod.stock : 0}
                      </span>
                    </td>
                    <td className="action-cell">
                      {/* Flex wrap en los botones para que bajen en vez de estirar la tabla */}
                      <div
                        className="action-buttons"
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          justifyContent: "center",
                          gap: "6px",
                        }}
                      >
                        <button
                          className="btn-icon-primary"
                          onClick={() => handleDuplicateProduct(prod)}
                          title="Duplicar Platillo"
                          style={{
                            background: "#f8f9fa",
                            border: "1px solid #ced4da",
                            color: "#111827",
                          }}
                        >
                          <Copy size={16} />
                        </button>
                        <button
                          className="btn-icon-primary"
                          onClick={() => handleOpenLabel(prod)}
                          title="Ver Etiqueta QR"
                        >
                          <QrCode size={16} />
                        </button>
                        <button type="button" className="btn-icon-edit" onClick={() => requestAdminAuth('edit', prod)} title="Editar"><Edit2 size={16} /></button>
                        <button type="button" className="btn-icon-danger" onClick={() => requestAdminAuth('delete', prod)} title="Eliminar"><Trash2 size={16} /></button>
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