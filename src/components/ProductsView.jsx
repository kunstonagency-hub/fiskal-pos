import React, { useState } from "react";
import {
  Image as ImageIcon,
  Package,
  QrCode,
  Edit2,
  Trash2,
  Copy,
  Camera,
  Search,
} from "lucide-react";

// Vista de gestión del catálogo.
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
  productChoices, // <-- NUEVO
  setProductChoices, // <-- NUEVO
  currentStoreKronoEnabled,
  showInKrono,
  setShowInKrono,
  kronoPrice,
  setKronoPrice,
  resetProductForm,
  loading,
  setShowPrintCatalog,
  handleOpenLabel,
  onStartCameraScanner,
  sellByPack,
  setSellByPack,
  unitsPerPack,
  setUnitsPerPack,
  packPrice,
  setPackPrice,
  sellByBulk,
  setSellByBulk,
  unitsPerBulk,
  setUnitsPerBulk,
  variantGroup,
  setVariantGroup,
  variantLabel,
  setVariantLabel,
  tallasCategories = [],
  tallasList = [],
  setTallasList,
  addTallasCategory,
}) {
  const [addedUnits, setAddedUnits] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [loadByBulkNow, setLoadByBulkNow] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = currentStoreType === "restaurant" ? 9999 : 50;
  const [bulkCount, setBulkCount] = useState("");

  // ESTADOS INTERNOS PARA OPCIONES MÚLTIPLES (CHOICES)
  const [newChoiceGroupName, setNewChoiceGroupName] = useState("");
  const [newChoiceLimit, setNewChoiceLimit] = useState(1);
  const [newChoiceOptions, setNewChoiceOptions] = useState("");

  const handleAddChoiceGroup = () => {
    if (!newChoiceGroupName.trim() || !newChoiceOptions.trim()) {
      alert("Debes ponerle nombre al grupo y agregar al menos una opción.");
      return;
    }
    const limit = parseInt(newChoiceLimit, 10);
    if (isNaN(limit) || limit < 1) {
      alert("El límite debe ser al menos 1.");
      return;
    }

    const optionsArray = newChoiceOptions.split(",").map(s => s.trim()).filter(Boolean);
    if (optionsArray.length === 0) {
      alert("Debes agregar opciones válidas separadas por coma.");
      return;
    }

    const newGroup = {
      name: newChoiceGroupName.trim(),
      limit: limit,
      options: optionsArray
    };

    setProductChoices([...(productChoices || []), newGroup]);
    
    setNewChoiceGroupName("");
    setNewChoiceLimit(1);
    setNewChoiceOptions("");
  };

  const handleRemoveChoiceGroup = (idx) => {
    const updated = [...(productChoices || [])];
    updated.splice(idx, 1);
    setProductChoices(updated);
  };

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
    setNewChoiceGroupName("");
    setNewChoiceLimit(1);
    setNewChoiceOptions("");
    resetProductForm();
    setLoadByBulkNow(false);
    setBulkCount("");
  };

  const filteredProducts = products.filter((prod) => {
    const term = searchTerm.toLowerCase();
    const matchName = prod.name?.toLowerCase().includes(term);
    const matchBarcode = prod.barcode?.toLowerCase().includes(term);
    return matchName || matchBarcode;
  });

  // Resetear a la página 1 cada vez que cambia la búsqueda
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Calcular el slice de productos a mostrar
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedProducts = filteredProducts.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

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
               <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                
                <label
                  style={{
                    background: "#e9ecef",
                    color: "#212529",
                    padding: "8px 12px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    border: "1px solid #ced4da"
                  }}
                >
                  <ImageIcon size={14} /> Galería
                  <input
                    name="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    style={{ display: "none" }}
                  />
                </label>

                <label
                  style={{
                    background: "#212529",
                    color: "#fff",
                    padding: "8px 12px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    border: "none"
                  }}
                >
                  <Camera size={14} /> Cámara
                  <input
                    name="image"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageSelect}
                    style={{ display: "none" }}
                  />
                </label>

              </div>
            </div>
          </div>

          <div className="form-group">

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
                const val = e.target.value;
                if (val === "OTRA") {
                  setCategory("");
                } else if (val === "NUEVA_CON_TALLAS") {
                  const nombre = window.prompt(
                    "¿Cómo se llama la categoría con tallas? (Ej: Ropa, Zapatos, Gorras)"
                  );
                  if (nombre && nombre.trim()) {
                    addTallasCategory(nombre);
                    setCategory(nombre.trim());
                    // Inicializar 1 talla por defecto
                    setTallasList([{ label: "S", quantity: 0 }]);
                  }
                } else {
                  setCategory(val);
                  if (val === "Por Peso") setProductModifiers(["kg"]);
                  // Si elegimos una categoría que ya es de tallas, inicializar la lista si está vacía
                  if (
                    tallasCategories.includes(val) &&
                    tallasList.length === 0
                  ) {
                    setTallasList([{ label: "S", quantity: 0 }]);
                  }
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
              {currentStoreType !== "restaurant" && (
                <option
                  value="NUEVA_CON_TALLAS"
                  style={{ fontWeight: "bold", color: "#16a34a" }}
                >
                  + Crear categoría con tallas (Ropa, Zapatos...)
                </option>
              )}
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
                onClick={() => onStartCameraScanner('form')}
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

        {/* 📦 Stock / Reabastecer — visible si NO es tallas o si estamos editando */}
        {(!tallasCategories.includes(category) || editingProduct) && (
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
                    marginBottom: "8px",
                    textTransform: "uppercase",
                  }}
                >
                  📦 Reabastecer (Entrada de mercancía)
                </span>

                {/* 🍪 Checkbox único: ¿Cargar por bulto? */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: sellByBulk ? "12px" : "10px",
                    paddingBottom: sellByBulk ? "12px" : "10px",
                    borderBottom: "1px dashed #86efac",
                  }}
                >
                  <input
                    type="checkbox"
                    id="sellByBulk"
                    checked={sellByBulk}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setSellByBulk(checked);
                      if (!checked) {
                        setBulkCount("");
                        setAddedUnits("");
                        setStock(
                          editingProduct ? Number(editingProduct.stock || 0) : 0
                        );
                      }
                    }}
                    style={{ width: "16px", height: "16px", cursor: "pointer" }}
                  />
                  <label
                    htmlFor="sellByBulk"
                    style={{
                      margin: 0,
                      cursor: "pointer",
                      fontWeight: "700",
                      fontSize: "13px",
                      color: "#166534",
                    }}
                  >
                    📥 Cargar inventario por BULTO
                  </label>
                </div>

                {/* Modo BULTO: unidades por bulto + cantidad de bultos */}
                {sellByBulk && (
                  <>
                    <div style={{ marginBottom: "12px" }}>
                      <label
                        style={{
                          fontSize: "11px",
                          color: "#166534",
                          fontWeight: "700",
                          display: "block",
                          marginBottom: "4px",
                        }}
                      >
                        Unidades por bulto (caja)
                      </label>
                      <input
                        type="number"
                        min="2"
                        value={unitsPerBulk}
                        onChange={(e) => setUnitsPerBulk(e.target.value)}
                        placeholder="Ej. 72"
                        style={{
                          width: "100%",
                          padding: "8px 10px",
                          fontSize: "13px",
                          borderRadius: "4px",
                          border: "1px solid #86efac",
                          outline: "none",
                          boxSizing: "border-box",
                          background: "#fff",
                        }}
                      />
                      <span
                        style={{
                          fontSize: "10px",
                          color: "#64748b",
                          display: "block",
                          marginTop: "4px",
                        }}
                      >
                        💡 Ej: si 1 bulto trae 48 galletas, escribe 48. Se guarda para próximas reposiciones.
                      </span>
                    </div>

                    <div>
                      <label
                        style={{
                          fontSize: "11px",
                          color: "#166534",
                          fontWeight: "700",
                          display: "block",
                          marginBottom: "4px",
                        }}
                      >
                        Cantidad de bultos que llegaron
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={bulkCount}
                        onChange={(e) => {
                          const val = e.target.value;
                          setBulkCount(val);
                          const count = parseInt(val, 10) || 0;
                          const perBulk = parseInt(unitsPerBulk) || 0;
                          const total = count * perBulk;
                          setAddedUnits(total > 0 ? String(total) : "");
                          if (editingProduct) {
                            const baseStock = parseInt(
                              editingProduct.stock || 0,
                              10
                            );
                            setStock(baseStock + total);
                          }
                        }}
                        placeholder="Ej. 5 bultos"
                        style={{
                          width: "100%",
                          padding: "8px 10px",
                          fontSize: "13px",
                          borderRadius: "4px",
                          border: "1px solid #86efac",
                          outline: "none",
                          boxSizing: "border-box",
                          background: "#fff",
                        }}
                      />
                      {bulkCount && unitsPerBulk && (
                        <span
                          style={{
                            fontSize: "11px",
                            color: "#16a34a",
                            fontWeight: "bold",
                            display: "block",
                            marginTop: "6px",
                          }}
                        >
                          ✅ {bulkCount} bultos × {unitsPerBulk} uds ={" "}
                          {parseInt(bulkCount) * parseInt(unitsPerBulk)} uds
                          agregadas al stock
                        </span>
                      )}
                    </div>
                  </>
                )}

                {/* Modo UNIDADES (default, cuando bulto está apagado) */}
                {!sellByBulk && (
                  <>
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
                        placeholder="Ej. 24 (unidades que llegaron)"
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
                      Escribe cuántas unidades llegaron y se sumarán automáticamente.
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        )}

          {/* 📐 SECCIÓN: TALLAS (solo si la categoría es de tallas) */}
          {currentStoreType !== "restaurant" &&
            tallasCategories.includes(category) &&
            !editingProduct && (
            <div
              className="form-group"
              style={{
                background: "#eff6ff",
                padding: "14px",
                borderRadius: "8px",
                border: "1px solid #bfdbfe",
                marginBottom: "16px",
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              <label
                style={{
                  fontWeight: "800",
                  color: "#1d4ed8",
                  marginBottom: "10px",
                  display: "block",
                  fontSize: "12px",
                  textTransform: "uppercase",
                }}
              >
                📐 Tallas del Producto
              </label>

              <div style={{ marginBottom: "12px" }}>
                <label
                  style={{
                    fontSize: "11px",
                    color: "#1e40af",
                    fontWeight: "700",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  ¿Cuántas tallas?
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={tallasList.length}
                  onChange={(e) => {
                    const n = Math.max(1, parseInt(e.target.value) || 1);
                    const current = [...tallasList];
                    if (n > current.length) {
                      for (let i = current.length; i < n; i++) {
                        current.push({ label: "", quantity: 0 });
                      }
                    } else {
                      current.splice(n);
                    }
                    setTallasList(current);
                  }}
                  style={{
                    width: "100px",
                    padding: "8px",
                    fontSize: "14px",
                    fontWeight: "bold",
                    borderRadius: "4px",
                    border: "1px solid #93c5fd",
                    outline: "none",
                    textAlign: "center",
                  }}
                />
              </div>

              <div
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                {tallasList.map((t, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr auto",
                      gap: "8px",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <label
                        style={{
                          fontSize: "10px",
                          color: "#1e40af",
                          fontWeight: "700",
                          display: "block",
                          marginBottom: "2px",
                        }}
                      >
                        Etiqueta {idx + 1}
                      </label>
                      <input
                        type="text"
                        value={t.label}
                        onChange={(e) => {
                          const updated = [...tallasList];
                          updated[idx] = { ...updated[idx], label: e.target.value };
                          setTallasList(updated);
                        }}
                        placeholder="Ej: S, M, L, XL, 38, 40"
                        style={{
                          width: "100%",
                          padding: "8px",
                          fontSize: "13px",
                          borderRadius: "4px",
                          border: "1px solid #93c5fd",
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          fontSize: "10px",
                          color: "#1e40af",
                          fontWeight: "700",
                          display: "block",
                          marginBottom: "2px",
                        }}
                      >
                        Cantidad
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={t.quantity}
                        onChange={(e) => {
                          const updated = [...tallasList];
                          updated[idx] = {
                            ...updated[idx],
                            quantity: parseInt(e.target.value) || 0,
                          };
                          setTallasList(updated);
                        }}
                        placeholder="0"
                        style={{
                          width: "100%",
                          padding: "8px",
                          fontSize: "13px",
                          borderRadius: "4px",
                          border: "1px solid #93c5fd",
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (tallasList.length <= 1) return;
                        setTallasList(tallasList.filter((_, i) => i !== idx));
                      }}
                      title="Eliminar esta talla"
                      style={{
                        marginTop: "16px",
                        background: "#fee2e2",
                        color: "#dc2626",
                        border: "1px solid #fca5a5",
                        borderRadius: "4px",
                        padding: "8px 10px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "bold",
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <div
                style={{
                  marginTop: "12px",
                  paddingTop: "10px",
                  borderTop: "1px dashed #93c5fd",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{ fontSize: "12px", color: "#1e40af", fontWeight: "700" }}
                >
                  📦 Stock total:
                </span>
                <strong
                  style={{ fontSize: "18px", color: "#1d4ed8", fontWeight: "900" }}
                >
                  {tallasList.reduce((sum, t) => sum + (t.quantity || 0), 0)} uds
                </strong>
              </div>
            </div>
          )}


          

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

          {/* 👖 SECCIÓN: VARIANTES (Tallas / Colores) */}
          {false && (
          <div
            style={{
              background: "#eff6ff",
              padding: "14px",
              borderRadius: "8px",
              border: "1px solid #bfdbfe",
              marginBottom: "16px",
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            <label
              style={{
                fontWeight: "800",
                color: "#1d4ed8",
                marginBottom: "10px",
                display: "block",
                fontSize: "12px",
                textTransform: "uppercase",
              }}
            >
              👖 Variantes (Opcional) — Tallas, Colores, etc.
            </label>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px",
              }}
            >
              <div>
                <label
                  style={{
                    fontSize: "11px",
                    color: "#1e40af",
                    fontWeight: "700",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  Grupo
                </label>
                <input
                  type="text"
                  value={variantGroup}
                  onChange={(e) => setVariantGroup(e.target.value)}
                  placeholder="Ej. Jean Levis"
                  style={{
                    width: "100%",
                    padding: "8px",
                    fontSize: "13px",
                    borderRadius: "4px",
                    border: "1px solid #93c5fd",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: "11px",
                    color: "#1e40af",
                    fontWeight: "700",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  Variante
                </label>
                <input
                  type="text"
                  value={variantLabel}
                  onChange={(e) => setVariantLabel(e.target.value)}
                  placeholder="Ej. Talla M"
                  style={{
                    width: "100%",
                    padding: "8px",
                    fontSize: "13px",
                    borderRadius: "4px",
                    border: "1px solid #93c5fd",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            <span
              style={{
                fontSize: "11px",
                color: "#1e40af",
                display: "block",
                marginTop: "8px",
                lineHeight: "1.5",
              }}
            >
              💡 Crea 4 productos separados (uno por talla) con el **mismo Grupo**.
              En el POS se verán como 1 sola tarjeta. Ej: "Jean Levis" con 4 variantes
              (S, M, L, XL).
            </span>
          </div>
          )}


          {/* 🍪 SECCIÓN: PRESENTACIONES (PAQUETE / BULTO) */}
          <div
            style={{
              background: "#f0fdf4",
              padding: "14px",
              borderRadius: "8px",
              border: "1px solid #bbf7d0",
              marginBottom: "16px",
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            <label
              style={{
                fontWeight: "800",
                color: "#16a34a",
                marginBottom: "10px",
                display: "block",
                fontSize: "12px",
                textTransform: "uppercase",
              }}
            >
              📦 Presentaciones (Opcional)
            </label>

            {/* --- Vender por PAQUETE --- */}
            <div
              style={{
                marginBottom: "12px",
                padding: "10px",
                background: "#ffffff",
                borderRadius: "6px",
                border: "1px solid #bbf7d0",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="checkbox"
                  id="sellByPack"
                  checked={sellByPack}
                  onChange={(e) => setSellByPack(e.target.checked)}
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                />
                <label
                  htmlFor="sellByPack"
                  style={{
                    margin: 0,
                    cursor: "pointer",
                    fontWeight: "700",
                    fontSize: "13px",
                    color: "#166534",
                  }}
                >
                  🛒 Vender también por PAQUETE
                </label>
              </div>

              {sellByPack && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "8px",
                    marginTop: "10px",
                  }}
                >
                  <div>
                    <label
                      style={{
                        fontSize: "11px",
                        color: "#166534",
                        fontWeight: "700",
                        display: "block",
                        marginBottom: "4px",
                      }}
                    >
                      Unidades por paquete
                    </label>
                    <input
                      type="number"
                      min="2"
                      value={unitsPerPack}
                      onChange={(e) => setUnitsPerPack(e.target.value)}
                      placeholder="Ej. 6"
                      style={{
                        width: "100%",
                        padding: "8px",
                        fontSize: "13px",
                        borderRadius: "4px",
                        border: "1px solid #86efac",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: "11px",
                        color: "#166534",
                        fontWeight: "700",
                        display: "block",
                        marginBottom: "4px",
                      }}
                    >
                      Precio del paquete ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={packPrice}
                      onChange={(e) => setPackPrice(e.target.value)}
                      placeholder={`Ej. ${price ? (parseFloat(price) * (parseInt(unitsPerPack) || 1)).toFixed(2) : "3.00"}`}
                      style={{
                        width: "100%",
                        padding: "8px",
                        fontSize: "13px",
                        borderRadius: "4px",
                        border: "1px solid #86efac",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>
              )}

              {sellByPack &&
                unitsPerPack &&
                packPrice &&
                price &&
                parseFloat(packPrice) <
                  parseFloat(price) * parseInt(unitsPerPack) && (
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#16a34a",
                      fontWeight: "bold",
                      display: "block",
                      marginTop: "6px",
                    }}
                  >
                    ⭐ Ahorro por paquete: $
                    {(
                      parseFloat(price) * parseInt(unitsPerPack) -
                      parseFloat(packPrice)
                    ).toFixed(2)}
                  </span>
                )}
            </div>
            

            
          </div>

          {/* NUEVA SECCIÓN: GRUPOS DE OPCIONES OBLIGATORIAS (EJ. ELIGE 3 PROTEÍNAS) */}
          {currentStoreType === "restaurant" && (
            <div
              className="form-group"
              style={{
                background: "#f0fdf4", 
                padding: "14px",
                borderRadius: "8px",
                border: "1px solid #bbf7d0",
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
                ☑️ 3. Opciones Múltiples (Ej. Elige 3 Proteínas)
              </label>
              
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
                <input
                  type="text"
                  placeholder="Nombre del Grupo (Ej. Proteínas)"
                  value={newChoiceGroupName}
                  onChange={(e) => setNewChoiceGroupName(e.target.value)}
                  style={{ flex: "2 1 150px", padding: "8px", fontSize: "12px", borderRadius: "4px", border: "1px solid #ced4da", outline: "none" }}
                />
                <input
                  type="number"
                  placeholder="Límite (Ej. 3)"
                  title="Cantidad máxima que el cliente puede elegir"
                  value={newChoiceLimit}
                  onChange={(e) => setNewChoiceLimit(e.target.value)}
                  style={{ flex: "1 1 80px", padding: "8px", fontSize: "12px", borderRadius: "4px", border: "1px solid #ced4da", outline: "none" }}
                />
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
                <input
                  type="text"
                  placeholder="Opciones (Separadas por coma: Carne, Pollo, Cerdo)"
                  value={newChoiceOptions}
                  onChange={(e) => setNewChoiceOptions(e.target.value)}
                  style={{ flex: "1 1 200px", padding: "8px", fontSize: "12px", borderRadius: "4px", border: "1px solid #ced4da", outline: "none" }}
                />
                <button
                  type="button"
                  onClick={handleAddChoiceGroup}
                  style={{ background: "#16a34a", color: "#fff", border: "none", padding: "8px 12px", borderRadius: "4px", fontSize: "12px", cursor: "pointer", fontWeight: "bold", whiteSpace: "nowrap" }}
                >
                  + Crear Grupo
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {(productChoices || []).length === 0 ? (
                  <span style={{ fontSize: "11px", color: "#166534", fontStyle: "italic" }}>No hay grupos de opciones configurados.</span>
                ) : (
                  productChoices.map((group, idx) => (
                    <div key={idx} style={{ background: "#fff", padding: "8px", borderRadius: "6px", border: "1px solid #86efac", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <strong style={{ fontSize: "12px", color: "#15803d", display: "block" }}>{group.name} (Límite: {group.limit})</strong>
                        <span style={{ fontSize: "11px", color: "#16a34a" }}>{group.options.join(", ")}</span>
                      </div>
                      <button type="button" onClick={() => handleRemoveChoiceGroup(idx)} style={{ background: "none", border: "none", color: "#e05d5d", fontSize: "16px", cursor: "pointer", fontWeight: "bold", padding: "0 6px" }}>×</button>
                    </div>
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
            Inventario Registrado ({filteredProducts.length})
          </h3>
          <button
            className="btn-secondary"
            onClick={() => setShowPrintCatalog(true)}
            style={{ fontSize: "12px", padding: "6px 12px" }}
          >
            🖨️ Imprimir Catálogo
          </button>
        </div>

        <div style={{ marginBottom: "16px", position: "relative", width: "100%", display: "flex", alignItems: "center" }}>
          <Search size={18} style={{ position: "absolute", left: "10px", color: "#6c757d", zIndex: 2 }} />
          <input
            type="text"
            placeholder="Buscar por nombre o escanear código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 40px 10px 36px", 
              borderRadius: "6px",
              border: "1px solid #ced4da",
              boxSizing: "border-box",
              fontSize: "14px",
              background: "#fff",
              outline: "none"
            }}
          />
          <button
            type="button"
            onClick={() => onStartCameraScanner('search')} 
            title="Escanear Código para Buscar"
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
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="5" className="empty-text">
                    {searchTerm !== "" ? "No se encontraron coincidencias." : "No hay productos registrados."}
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((prod) => (
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
                          title="Duplicar Producto"
                          aria-label="Duplicar producto"
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
                          aria-label="Ver etiqueta QR del producto"
                        >
                          <QrCode size={16} />
                        </button>
                        <button type="button" className="btn-icon-edit" onClick={() => requestAdminAuth('edit', prod)} title="Editar" aria-label="Editar producto"><Edit2 size={16} /></button>
                        <button type="button" className="btn-icon-danger" onClick={() => requestAdminAuth('delete', prod)} title="Eliminar" aria-label="Eliminar producto"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
                {/* Controles de paginación */}
        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "8px",
              marginTop: "20px",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                padding: "8px 14px",
                borderRadius: "6px",
                border: "1px solid #ced4da",
                background: currentPage === 1 ? "#f1f3f5" : "#fff",
                color: currentPage === 1 ? "#adb5bd" : "#212529",
                fontWeight: "700",
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
                fontSize: "13px",
              }}
            >
              ← Anterior
            </button>

            {(() => {
              const pages = [];
              const maxVisible = 5;
              let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
              let end = Math.min(totalPages, start + maxVisible - 1);
              if (end - start + 1 < maxVisible) {
                start = Math.max(1, end - maxVisible + 1);
              }
              for (let i = start; i <= end; i++) pages.push(i);
              return pages.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setCurrentPage(p)}
                  style={{
                    minWidth: "36px",
                    height: "36px",
                    borderRadius: "6px",
                    border:
                      p === currentPage
                        ? "1px solid #111827"
                        : "1px solid #ced4da",
                    background: p === currentPage ? "#111827" : "#fff",
                    color: p === currentPage ? "#fff" : "#212529",
                    fontWeight: "700",
                    cursor: "pointer",
                    fontSize: "13px",
                  }}
                >
                  {p}
                </button>
              ));
            })()}

            <button
              type="button"
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
              disabled={currentPage === totalPages}
              style={{
                padding: "8px 14px",
                borderRadius: "6px",
                border: "1px solid #ced4da",
                background: currentPage === totalPages ? "#f1f3f5" : "#fff",
                color: currentPage === totalPages ? "#adb5bd" : "#212529",
                fontWeight: "700",
                cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                fontSize: "13px",
              }}
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProductsView;