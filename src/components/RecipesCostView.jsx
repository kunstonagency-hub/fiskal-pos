import React, { useState, useEffect } from "react";
import {
  ChefHat,
  Plus,
  Trash2,
  Edit2,
  DollarSign,
  TrendingUp,
  Scale,
  Package,
  AlertCircle,
  CheckCircle,
  BarChart3,
  Award,
  X,
  RefreshCw,
} from "lucide-react";
import { supabase } from "../supabase";

// Vista de recetas y costos.
export default function RecipesCostView({
  currentStoreId,
  products,
  fetchProducts,
  bcvRate,
  currentUserRole,
}) {
  const [activeSubTab, setActiveSubTab] = useState("recipes"); 

  // ==========================================
  // ESTADOS: MATERIA PRIMA (INSUMOS)
  // ==========================================
  const [rawMaterials, setRawMaterials] = useState([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [matName, setMatName] = useState("");
  const [matQty, setMatQty] = useState("");
  const [matUnit, setMatUnit] = useState("kg"); 
  const [matCost, setMatCost] = useState("");

  // ==========================================
  // ESTADOS: RECETAS / ESCANDALLO
  // ==========================================
  const [selectedProductId, setSelectedProductId] = useState("");
  const [recipeItems, setRecipeItems] = useState([]);
  const [loadingRecipe, setLoadingRecipe] = useState(false);

  const [editingRecipeItem, setEditingRecipeItem] = useState(null);
  const [selectedMatId, setSelectedMatId] = useState("");
  const [portionQty, setPortionQty] = useState("");
  const [savingItem, setSavingItem] = useState(false);

  // ==========================================
  // ESTADOS: PESTAÑA 3 (VENTAS Y GANANCIAS)
  // ==========================================
  const [salesMetrics, setSalesMetrics] = useState([]);
  const [totalRevenueAll, setTotalRevenueAll] = useState(0);
  const [totalCostAll, setTotalCostAll] = useState(0);
  const [totalNetProfitAll, setTotalNetProfitAll] = useState(0);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  useEffect(() => {
    if (currentStoreId) fetchRawMaterials();
  }, [currentStoreId]);

  const fetchRawMaterials = async () => {
    setLoadingMaterials(true);
    try {
      const { data, error } = await supabase
        .from("raw_materials")
        .select("*")
        .eq("store_id", String(currentStoreId))
        .order("name", { ascending: true });
      if (!error && data) setRawMaterials(data);
    } catch (e) {
      console.error("Error cargando insumos:", e);
    } finally {
      setLoadingMaterials(false);
    }
  };

  useEffect(() => {
    if (selectedProductId && currentStoreId) {
      fetchRecipeForProduct(selectedProductId);
    } else {
      setRecipeItems([]);
    }
    cancelEditRecipeItem();
  }, [selectedProductId, currentStoreId]);

  const fetchRecipeForProduct = async (prodId) => {
    setLoadingRecipe(true);
    try {
      const { data, error } = await supabase
        .from("recipe_items")
        .select("*, raw_materials(*)")
        .eq("product_id", prodId)
        .eq("store_id", String(currentStoreId));
      if (!error && data) setRecipeItems(data);
    } catch (e) {
      console.error("Error cargando receta:", e);
    } finally {
      setLoadingRecipe(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === "sales_analytics" && currentStoreId) {
      calculateSalesAndProfits();
    }
  }, [activeSubTab, currentStoreId, products]);

  const calculateSalesAndProfits = async () => {
    setLoadingMetrics(true);
    try {
      const { data: completedSales, error } = await supabase
        .from("sales")
        .select("items, total_usd, status")
        .eq("store_id", String(currentStoreId))
        .eq("status", "completed");

      if (error) throw error;

      const productMap = {};
      (products || []).forEach((p) => {
        productMap[p.id] = {
          id: p.id,
          name: p.name,
          category: p.category || "General",
          price: Number(p.price || 0),
          cost: Number(p.cost || 0),
          unitsSold: 0,
          totalRevenue: 0,
          totalCost: 0,
          netProfit: 0,
          marginPercent: 0,
        };
      });

      (completedSales || []).forEach((sale) => {
        let items = sale.items;
        if (typeof items === "string") {
          try {
            items = JSON.parse(items);
          } catch (e) {
            items = [];
          }
        }
        if (Array.isArray(items)) {
          items.forEach((item) => {
            if (item && item.id && productMap[item.id]) {
              const qty = Number(item.quantity || 1);
              const price = Number(item.price || productMap[item.id].price);
              const cost = productMap[item.id].cost;

              productMap[item.id].unitsSold += qty;
              productMap[item.id].totalRevenue += price * qty;
              productMap[item.id].totalCost += cost * qty;
            }
          });
        }
      });

      let sumRev = 0;
      let sumCost = 0;

      const results = Object.values(productMap)
        .map((p) => {
          p.netProfit = p.totalRevenue - p.totalCost;
          p.marginPercent =
            p.totalRevenue > 0 ? (p.netProfit / p.totalRevenue) * 100 : 0;
          sumRev += p.totalRevenue;
          sumCost += p.totalCost;
          return p;
        })
        .sort((a, b) => b.totalRevenue - a.totalRevenue);

      setSalesMetrics(results);
      setTotalRevenueAll(sumRev);
      setTotalCostAll(sumCost);
      setTotalNetProfitAll(sumRev - sumCost);
    } catch (err) {
      console.error("Error calculando ventas y ganancias:", err);
    } finally {
      setLoadingMetrics(false);
    }
  };

  const handleSaveRawMaterial = async (e) => {
    e.preventDefault();
    if (!matName.trim() || !matQty || !matCost || !currentStoreId) return;

    const qty = parseFloat(matQty);
    const cost = parseFloat(matCost);
    if (qty <= 0 || cost <= 0)
      return alert("Cantidad y costo deben ser mayores a 0");

    let baseUnit = "unidad";
    let baseQty = qty;

    if (matUnit === "kg") {
      baseUnit = "g";
      baseQty = qty * 1000;
    } else if (matUnit === "g") {
      baseUnit = "g";
      baseQty = qty;
    } else if (matUnit === "l") {
      baseUnit = "ml";
      baseQty = qty * 1000;
    } else if (matUnit === "ml") {
      baseUnit = "ml";
      baseQty = qty;
    }

    const costPerBaseUnit = cost / baseQty;

    try {
      if (editingMaterial) {
        const { error } = await supabase
          .from("raw_materials")
          .update({
            name: matName.trim(),
            purchase_quantity: qty,
            purchase_unit: matUnit,
            purchase_cost: cost,
            cost_per_base_unit: costPerBaseUnit,
            base_unit: baseUnit,
          })
          .eq("id", editingMaterial.id);

        if (error) throw error;
        alert("¡Insumo actualizado exitosamente!");
      } else {
        const { error } = await supabase.from("raw_materials").insert([
          {
            store_id: String(currentStoreId),
            name: matName.trim(),
            purchase_quantity: qty,
            purchase_unit: matUnit,
            purchase_cost: cost,
            cost_per_base_unit: costPerBaseUnit,
            base_unit: baseUnit,
          },
        ]);

        if (error) throw error;
        alert("¡Insumo registrado exitosamente!");
      }

      cancelEditMaterial();
      fetchRawMaterials();
      if (selectedProductId) fetchRecipeForProduct(selectedProductId);
    } catch (err) {
      alert("Error guardando insumo: " + err.message);
    }
  };

  const startEditMaterial = (m) => {
    setEditingMaterial(m);
    setMatName(m.name || "");
    setMatQty(m.purchase_quantity ? m.purchase_quantity.toString() : "");
    setMatUnit(m.purchase_unit || "kg");
    setMatCost(m.purchase_cost ? m.purchase_cost.toString() : "");
  };

  const cancelEditMaterial = () => {
    setEditingMaterial(null);
    setMatName("");
    setMatQty("");
    setMatCost("");
    setMatUnit("kg");
  };

  const handleDeleteRawMaterial = async (id) => {
    if (
      !window.confirm(
        "¿Seguro que deseas eliminar este insumo? Se quitará de las recetas que lo usen.",
      )
    )
      return;
    try {
      await supabase.from("raw_materials").delete().eq("id", id);
      fetchRawMaterials();
      if (selectedProductId) fetchRecipeForProduct(selectedProductId);
    } catch (e) {
      alert("Error eliminando: " + e.message);
    }
  };

  const handleSaveRecipeItem = async (e) => {
    e.preventDefault();
    if (!selectedProductId || !selectedMatId || !portionQty) return;

    const pQty = parseFloat(portionQty);
    if (pQty <= 0) return alert("Ingresa una cantidad de porción válida");

    const material = rawMaterials.find((m) => m.id === selectedMatId);
    if (!material) return;

    setSavingItem(true);
    try {
      if (editingRecipeItem) {
        const { error } = await supabase
          .from("recipe_items")
          .update({
            raw_material_id: selectedMatId,
            portion_quantity: pQty,
            portion_unit: material.base_unit,
          })
          .eq("id", editingRecipeItem.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("recipe_items").insert([
          {
            store_id: String(currentStoreId),
            product_id: selectedProductId,
            raw_material_id: selectedMatId,
            portion_quantity: pQty,
            portion_unit: material.base_unit,
          },
        ]);

        if (error) throw error;
      }

      cancelEditRecipeItem();
      fetchRecipeForProduct(selectedProductId);
    } catch (err) {
      alert("Error guardando ingrediente: " + err.message);
    } finally {
      setSavingItem(false);
    }
  };

  const startEditRecipeItem = (item) => {
    setEditingRecipeItem(item);
    setSelectedMatId(item.raw_material_id || "");
    setPortionQty(
      item.portion_quantity ? item.portion_quantity.toString() : "",
    );
  };

  const cancelEditRecipeItem = () => {
    setEditingRecipeItem(null);
    setSelectedMatId("");
    setPortionQty("");
  };

  const handleDeleteRecipeItem = async (itemId) => {
    try {
      await supabase.from("recipe_items").delete().eq("id", itemId);
      fetchRecipeForProduct(selectedProductId);
      if (editingRecipeItem && editingRecipeItem.id === itemId)
        cancelEditRecipeItem();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSyncCostToProduct = async (totalCalculatedCost) => {
    if (!selectedProductId) return;
    try {
      const { error } = await supabase
        .from("products")
        .update({ cost: parseFloat(totalCalculatedCost.toFixed(2)) })
        .eq("id", selectedProductId)
        .eq("store_id", currentStoreId);

      if (error) throw error;

      if (typeof fetchProducts === "function") fetchProducts(currentStoreId);
      alert(
        `¡Costo de $${totalCalculatedCost.toFixed(2)} guardado exitosamente en el Menú!`,
      );
    } catch (e) {
      alert("Error sincronizando costo: " + e.message);
    }
  };

  if (currentUserRole !== "owner") {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "60px 20px",
          background: "#fff",
          borderRadius: "12px",
          border: "1px solid #fee2e2",
          maxWidth: "600px",
          margin: "40px auto",
        }}
      >
        <AlertCircle
          size={48}
          color="#dc2626"
          style={{ margin: "0 auto 12px auto" }}
        />
        <h3 style={{ color: "#dc2626", margin: "0 0 8px 0", fontSize: "20px" }}>
          Acceso Restringido
        </h3>
        <p style={{ color: "#6b7280", fontSize: "14px", margin: 0 }}>
          Esta sección de costos, recetas y rentabilidad está reservada
          exclusivamente para el Propietario (Owner) del comercio.
        </p>
      </div>
    );
  }

  const currentDish = (products || []).find(
    (p) => String(p.id) === String(selectedProductId),
  );
  const sellingPrice = currentDish ? Number(currentDish.price || 0) : 0;

  const totalRecipeCost = recipeItems.reduce((sum, item) => {
    const unitCost = item.raw_materials?.cost_per_base_unit || 0;
    return sum + Number(item.portion_quantity) * Number(unitCost);
  }, 0);

  const profitMargin = sellingPrice - totalRecipeCost;
  const foodCostPercent =
    sellingPrice > 0 ? (totalRecipeCost / sellingPrice) * 100 : 0;
  const marginPercent =
    sellingPrice > 0 ? (profitMargin / sellingPrice) * 100 : 0;

  return (
    <>
      {/* 
        ========================================================================
        BLOQUE DE ESTILOS PARA LA NUEVA CLASE .cost-table
        Garantiza un diseño limpio en Desktop y un formato Tarjeta perfecto en Celular,
        evitando mezclas con estilos viejos (fiskal-table).
        ========================================================================
      */}
      <style>{`
        .responsive-grid {
          display: grid;
          grid-template-columns: 1.2fr 1.8fr;
          gap: 24px;
          align-items: start;
        }
        .responsive-input-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 8px;
          align-items: flex-end;
        }
        .responsive-materials-grid {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 8px;
        }
        .tabs-container {
          display: flex;
          gap: 6px;
          background: #f3f4f6;
          padding: 4px;
          border-radius: 8px;
          flex-wrap: wrap;
        }
        .tabs-container button {
          padding: 8px 14px;
          border-radius: 6px;
          border: none;
          font-size: 12px;
          font-weight: bold;
          cursor: pointer;
        }

        /* DISEÑO DE TABLAS PERSONALIZADO PARA COSTOS Y RECETAS */
        .cost-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .cost-table th {
          background: #f8fafc;
          padding: 12px;
          text-align: left;
          font-weight: 800;
          color: #475569;
          border-bottom: 2px solid #e2e8f0;
        }
        .cost-table td {
          padding: 12px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }

        /* MEDIA QUERIES PARA CELULARES */
        @media (max-width: 768px) {
          .responsive-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .responsive-input-grid {
            grid-template-columns: 1fr;
            gap: 12px;
            align-items: stretch;
          }
          .responsive-materials-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          .tabs-container {
            flex-direction: column;
            width: 100%;
          }
          .tabs-container button {
            width: 100%;
            text-align: center;
            padding: 12px !important;
            font-size: 13px !important;
          }
          .mobile-card-padding {
            padding: 16px !important;
          }
          
          /* TRANSFORMACIÓN MÁGICA DE TABLA A TARJETAS */
          .cost-table thead {
            display: none; /* Oculta los encabezados tradicionales */
          }
          .cost-table tr {
            display: flex;
            flex-direction: column;
            background: #fff;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            margin-bottom: 16px;
            padding: 12px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.02);
          }
          .cost-table td {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px dashed #e2e8f0;
            text-align: right;
          }
          .cost-table td:last-child {
            border-bottom: none;
            padding-bottom: 0;
          }
          .cost-table td::before {
            content: attr(data-label); /* TOMA EL NOMBRE CORRECTO DE LA ETIQUETA HTML */
            font-weight: 800;
            color: #64748b;
            text-transform: uppercase;
            font-size: 11px;
            text-align: left;
            margin-right: 10px;
          }
          .action-cell {
             justify-content: flex-end !important;
          }
        }
      `}</style>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: "22px",
                fontWeight: "900",
                color: "#111827",
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <ChefHat size={26} color="#16a34a" /> Control de Recetas, Costos y
              Rentabilidad
            </h2>
            <p
              style={{ fontSize: "13px", color: "#6b7280", margin: "4px 0 0 0" }}
            >
              Escandallo por plato, compras de materia prima y balance de
              ganancias reales.
            </p>
          </div>

          <div className="tabs-container">
            <button
              onClick={() => setActiveSubTab("recipes")}
              style={{
                background: activeSubTab === "recipes" ? "#111827" : "transparent",
                color: activeSubTab === "recipes" ? "#fff" : "#4b5563",
              }}
            >
              📋 Ficha Técnica de Platos
            </button>

            <button
              onClick={() => setActiveSubTab("materials")}
              style={{
                background: activeSubTab === "materials" ? "#111827" : "transparent",
                color: activeSubTab === "materials" ? "#fff" : "#4b5563",
              }}
            >
              📦 Almacén de Insumos ({rawMaterials.length})
            </button>

            <button
              onClick={() => setActiveSubTab("sales_analytics")}
              style={{
                background: activeSubTab === "sales_analytics" ? "#16a34a" : "transparent",
                color: activeSubTab === "sales_analytics" ? "#fff" : "#16a34a",
              }}
            >
              📊 Ventas & Ganancias por Plato
            </button>
          </div>
        </div>

        {/* VISTA 1: RECETAS */}
        {activeSubTab === "recipes" && (
          <div className="responsive-grid">
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div className="product-form-card mobile-card-padding" style={{ padding: "20px" }}>
                <label
                  style={{
                    fontSize: "11px",
                    fontWeight: "800",
                    color: "#6b7280",
                    textTransform: "uppercase",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Selecciona el Platillo a Costear
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "6px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                    fontWeight: "bold",
                    outline: "none",
                  }}
                >
                  <option value="">-- Elige un platillo de tu menú --</option>
                  {(products || [])
                    .filter((p) => p.category !== "Por Peso")
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (PVP: ${Number(p.price).toFixed(2)})
                      </option>
                    ))}
                </select>
              </div>

              {selectedProductId && (
                <div
                  className="product-form-card mobile-card-padding"
                  style={{
                    padding: "20px",
                    border: editingRecipeItem
                      ? "2px solid #16a34a"
                      : "1px solid #e5e7eb",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "12px",
                    }}
                  >
                    <h4
                      style={{
                        margin: 0,
                        fontSize: "14px",
                        fontWeight: "800",
                        color: "#111827",
                      }}
                    >
                      {editingRecipeItem
                        ? "✏️ Editando Porción de Ingrediente"
                        : "+ Agregar Insumo a la Receta"}
                    </h4>
                    {editingRecipeItem && (
                      <button
                        onClick={cancelEditRecipeItem}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#6b7280",
                          fontSize: "12px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "2px",
                        }}
                      >
                        <X size={14} /> Cancelar
                      </button>
                    )}
                  </div>

                  {rawMaterials.length === 0 ? (
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#e05d5d",
                        background: "#fff5f5",
                        padding: "10px",
                        borderRadius: "6px",
                        border: "1px solid #ffc9c9",
                      }}
                    >
                      ⚠️ No tienes insumos registrados en el almacén. Ve a la
                      pestaña <strong>"Almacén de Insumos"</strong> para agregar
                      tu queso, carne, pan, etc.
                    </p>
                  ) : (
                    <form
                      onSubmit={handleSaveRecipeItem}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                      }}
                    >
                      <div>
                        <label
                          style={{
                            fontSize: "11px",
                            fontWeight: "700",
                            color: "#4b5563",
                            display: "block",
                            marginBottom: "4px",
                          }}
                        >
                          Insumo
                        </label>
                        <select
                          value={selectedMatId}
                          onChange={(e) => setSelectedMatId(e.target.value)}
                          required
                          disabled={!!editingRecipeItem}
                          style={{
                            width: "100%",
                            padding: "8px 10px",
                            borderRadius: "6px",
                            border: "1px solid #d1d5db",
                            fontSize: "13px",
                            background: editingRecipeItem ? "#f3f4f6" : "#fff",
                          }}
                        >
                          <option value="">Selecciona un insumo...</option>
                          {rawMaterials.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ($
                              {(
                                Number(m.cost_per_base_unit) *
                                (m.base_unit === "g" || m.base_unit === "ml"
                                  ? 100
                                  : 1)
                              ).toFixed(3)}{" "}
                              /{" "}
                              {m.base_unit === "g"
                                ? "100g"
                                : m.base_unit === "ml"
                                  ? "100ml"
                                  : "ud"}
                              )
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="responsive-input-grid">
                        <div>
                          <label
                            style={{
                              fontSize: "11px",
                              fontWeight: "700",
                              color: "#4b5563",
                              display: "block",
                              marginBottom: "4px",
                            }}
                          >
                            Porción (
                            {rawMaterials.find((m) => m.id === selectedMatId)
                              ?.base_unit || "g/ml/ud"}
                            )
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Ej. 20"
                            value={portionQty}
                            onChange={(e) => setPortionQty(e.target.value)}
                            required
                            style={{
                              width: "100%",
                              padding: "8px 10px",
                              borderRadius: "6px",
                              border: "1px solid #d1d5db",
                              fontSize: "13px",
                            }}
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={savingItem}
                          style={{
                            padding: "10px 12px",
                            background: editingRecipeItem ? "#16a34a" : "#111827",
                            color: "#fff",
                            border: "none",
                            borderRadius: "6px",
                            fontWeight: "bold",
                            fontSize: "13px",
                            cursor: "pointer",
                            width: "100%"
                          }}
                        >
                          {savingItem
                            ? "..."
                            : editingRecipeItem
                              ? "Actualizar"
                              : "+ Agregar"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {selectedProductId && currentDish ? (
                <>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                      gap: "12px",
                    }}
                  >
                    <div
                      style={{
                        background: "#fff",
                        padding: "14px",
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "10px",
                          color: "#6b7280",
                          fontWeight: "800",
                          textTransform: "uppercase",
                        }}
                      >
                        PVP (Venta)
                      </span>
                      <div
                        style={{
                          fontSize: "20px",
                          fontWeight: "900",
                          color: "#111827",
                          marginTop: "4px",
                        }}
                      >
                        ${sellingPrice.toFixed(2)}
                      </div>
                    </div>

                    <div
                      style={{
                        background: "#fff",
                        padding: "14px",
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "10px",
                          color: "#6b7280",
                          fontWeight: "800",
                          textTransform: "uppercase",
                        }}
                      >
                        Costo Receta
                      </span>
                      <div
                        style={{
                          fontSize: "20px",
                          fontWeight: "900",
                          color:
                            totalRecipeCost > sellingPrice
                              ? "#e05d5d"
                              : "#111827",
                          marginTop: "4px",
                        }}
                      >
                        ${totalRecipeCost.toFixed(2)}
                      </div>
                    </div>

                    <div
                      style={{
                        background: "#fff",
                        padding: "14px",
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "10px",
                          color: "#16a34a",
                          fontWeight: "800",
                          textTransform: "uppercase",
                        }}
                      >
                        Ganancia Neta
                      </span>
                      <div
                        style={{
                          fontSize: "20px",
                          fontWeight: "900",
                          color: profitMargin > 0 ? "#16a34a" : "#e05d5d",
                          marginTop: "4px",
                        }}
                      >
                        ${profitMargin.toFixed(2)}
                      </div>
                      <span
                        style={{
                          fontSize: "10px",
                          color: "#16a34a",
                          fontWeight: "bold",
                        }}
                      >
                        {marginPercent.toFixed(1)}% margen
                      </span>
                    </div>

                    <div
                      style={{
                        background: "#f8fafc",
                        padding: "14px",
                        borderRadius: "8px",
                        border: `2px solid ${foodCostPercent <= 35 ? "#16a34a" : foodCostPercent <= 45 ? "#f59e0b" : "#e05d5d"}`,
                      }}
                    >
                      <span
                        style={{
                          fontSize: "10px",
                          color: "#111827",
                          fontWeight: "800",
                          textTransform: "uppercase",
                        }}
                      >
                        Food Cost
                      </span>
                      <div
                        style={{
                          fontSize: "20px",
                          fontWeight: "900",
                          color:
                            foodCostPercent <= 35
                              ? "#16a34a"
                              : foodCostPercent <= 45
                                ? "#f59e0b"
                                : "#e05d5d",
                          marginTop: "4px",
                        }}
                      >
                        {foodCostPercent.toFixed(1)}%
                      </div>
                      <span style={{ fontSize: "10px", color: "#6b7280" }}>
                        {foodCostPercent <= 35
                          ? "✓ Saludable"
                          : foodCostPercent <= 45
                            ? "⚠️ Regular"
                            : "🚨 Costo Alto"}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSyncCostToProduct(totalRecipeCost)}
                    style={{
                      background: "#16a34a",
                      color: "#fff",
                      border: "none",
                      padding: "12px",
                      borderRadius: "8px",
                      fontWeight: "bold",
                      fontSize: "13px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      boxShadow: "0 2px 6px rgba(22, 163, 74, 0.3)",
                      width: "100%"
                    }}
                  >
                    <CheckCircle size={16} /> Guardar este Costo ($
                    {totalRecipeCost.toFixed(2)}) en el Menú de Fiskal
                  </button>

                  <div className="product-list-card mobile-card-padding" style={{ padding: "20px" }}>
                    <h4
                      style={{
                        margin: "0 0 12px 0",
                        fontSize: "15px",
                        fontWeight: "800",
                        color: "#111827",
                      }}
                    >
                      Desglose de Ingredientes del Plato ({recipeItems.length})
                    </h4>

                    {recipeItems.length === 0 ? (
                      <p
                        style={{
                          fontSize: "13px",
                          color: "#9ca3af",
                          textAlign: "center",
                          padding: "20px 0",
                        }}
                      >
                        Este plato no tiene ingredientes agregados. Usa el
                        formulario para armar la receta.
                      </p>
                    ) : (
                      <div style={{ width: "100%" }}>
                        <table className="cost-table">
                          <thead>
                            <tr>
                              <th>Insumo</th>
                              <th>Porción</th>
                              <th style={{ textAlign: "right" }}>
                                Costo Porción
                              </th>
                              <th style={{ textAlign: "center" }}>Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {recipeItems.map((item) => {
                              const itemCost =
                                Number(item.portion_quantity) *
                                Number(
                                  item.raw_materials?.cost_per_base_unit || 0,
                                );
                              const isBeingEdited =
                                editingRecipeItem?.id === item.id;

                              return (
                                <tr
                                  key={item.id}
                                  style={{
                                    background: isBeingEdited
                                      ? "#f0fdf4"
                                      : "transparent",
                                  }}
                                >
                                  <td data-label="Insumo">
                                    <strong>
                                      {item.raw_materials?.name || "Insumo"}
                                    </strong>
                                  </td>
                                  <td data-label="Porción">
                                    {item.portion_quantity} {item.portion_unit}
                                  </td>
                                  <td data-label="Costo de Porción"
                                    style={{
                                      fontWeight: "bold",
                                      color: "#111827",
                                    }}
                                  >
                                    ${itemCost.toFixed(3)}
                                  </td>
                                  <td data-label="Acciones" className="action-cell">
                                    <div style={{ display: "flex", gap: "8px" }}>
                                      <button
                                        onClick={() => startEditRecipeItem(item)}
                                        style={{
                                          background: "#f3f4f6",
                                          border: "1px solid #d1d5db",
                                          color: "#111827",
                                          padding: "4px 8px",
                                          borderRadius: "4px",
                                          cursor: "pointer",
                                        }}
                                        title="Editar Porción"
                                      >
                                        <Edit2 size={13} />
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleDeleteRecipeItem(item.id)
                                        }
                                        style={{
                                          background: "#fee2e2",
                                          border: "1px solid #fecaca",
                                          color: "#e05d5d",
                                          cursor: "pointer",
                                          padding: "4px 8px",
                                          borderRadius: "4px",
                                        }}
                                        title="Quitar de receta"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    padding: "60px 20px",
                    background: "#fff",
                    borderRadius: "12px",
                    border: "1px dashed #cbd5e1",
                  }}
                >
                  <ChefHat
                    size={48}
                    color="#cbd5e1"
                    style={{ marginBottom: "12px" }}
                  />
                  <h3 style={{ color: "#0f172a", margin: "0 0 6px 0" }}>
                    Selecciona un Platillo
                  </h3>
                  <p style={{ color: "#6b7280", fontSize: "13px", margin: 0 }}>
                    Elige una hamburguesa, perro caliente o plato a la izquierda
                    para ver su costo exacto y margen de ganancia.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VISTA 2: ALMACÉN */}
        {activeSubTab === "materials" && (
          <div className="responsive-grid">
            <div
              className="product-form-card mobile-card-padding"
              style={{
                padding: "24px",
                border: editingMaterial
                  ? "2px solid #16a34a"
                  : "1px solid #e5e7eb",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: "16px",
                    fontWeight: "800",
                    color: "#111827",
                  }}
                >
                  {editingMaterial
                    ? `✏️ Editando: ${editingMaterial.name}`
                    : "+ Registrar Compra de Insumo"}
                </h3>
                {editingMaterial && (
                  <button
                    onClick={cancelEditMaterial}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#6b7280",
                      fontSize: "12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <X size={14} /> Cancelar
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveRawMaterial} className="fiskal-form">
                <div className="form-group">
                  <label>Nombre del Insumo</label>
                  <input
                    type="text"
                    placeholder="Ej. Queso Cheddar en Bloque, Pan, Tocineta"
                    value={matName}
                    onChange={(e) => setMatName(e.target.value)}
                    required
                  />
                </div>

                <div className="responsive-materials-grid">
                  <div className="form-group">
                    <label>Cantidad Comprada</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Ej. 10"
                      value={matQty}
                      onChange={(e) => setMatQty(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Unidad</label>
                    <select
                      value={matUnit}
                      onChange={(e) => setMatUnit(e.target.value)}
                      style={{
                        padding: "10px",
                        borderRadius: "6px",
                        border: "1px solid #ced4da",
                        fontSize: "13px",
                      }}
                    >
                      <option value="kg">Kilogramos (Kg)</option>
                      <option value="g">Gramos (g)</option>
                      <option value="l">Litros (L)</option>
                      <option value="ml">Mililitros (ml)</option>
                      <option value="unidad">Unidades / Piezas</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: "12px" }}>
                  <label>Costo Total Pagado ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ej. 50.00"
                    value={matCost}
                    onChange={(e) => setMatCost(e.target.value)}
                    required
                  />
                </div>

                {parseFloat(matQty) > 0 && parseFloat(matCost) > 0 && (
                  <div
                    style={{
                      background: "#f0fdf4",
                      padding: "10px 12px",
                      borderRadius: "6px",
                      border: "1px solid #bbf7d0",
                      fontSize: "12px",
                      color: "#16a34a",
                      marginTop: "12px"
                    }}
                  >
                    Costo unitario base:{" "}
                    <strong>
                      $
                      {(
                        parseFloat(matCost) /
                        (matUnit === "kg" || matUnit === "l"
                          ? parseFloat(matQty) * 1000
                          : parseFloat(matQty))
                      ).toFixed(4)}
                    </strong>{" "}
                    por{" "}
                    {matUnit === "kg" || matUnit === "g"
                      ? "gramo"
                      : matUnit === "l" || matUnit === "ml"
                        ? "ml"
                        : "unidad"}
                    .
                  </div>
                )}

                <div style={{ display: "flex", gap: "8px", marginTop: "16px", flexWrap: "wrap" }}>
                  {editingMaterial && (
                    <button
                      type="button"
                      onClick={cancelEditMaterial}
                      className="btn-secondary"
                      style={{ flex: 1, minWidth: "120px" }}
                    >
                      Cancelar
                    </button>
                  )}
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{
                      flex: 2,
                      minWidth: "160px",
                      background: editingMaterial ? "#16a34a" : "#111827",
                      color: "#fff",
                      padding: "12px",
                      borderRadius: "6px",
                      fontWeight: "bold",
                      cursor: "pointer",
                    }}
                  >
                    {editingMaterial
                      ? "Actualizar Insumo"
                      : "+ Guardar en Almacén"}
                  </button>
                </div>
              </form>
            </div>

            <div className="product-list-card mobile-card-padding" style={{ padding: "24px" }}>
              <h3
                style={{
                  margin: "0 0 16px 0",
                  fontSize: "16px",
                  fontWeight: "800",
                  color: "#111827",
                }}
              >
                Insumos Disponibles ({rawMaterials.length})
              </h3>

              {rawMaterials.length === 0 ? (
                <p
                  style={{
                    color: "#6b7280",
                    fontSize: "13px",
                    textAlign: "center",
                    padding: "40px 0",
                  }}
                >
                  No tienes insumos registrados. Registra tu primera compra en el
                  formulario.
                </p>
              ) : (
                <div style={{ width: "100%" }}>
                  <table className="cost-table">
                    <thead>
                      <tr>
                        <th>Insumo</th>
                        <th>Compra</th>
                        <th>Costo Total</th>
                        <th>Costo unitario</th>
                        <th style={{ textAlign: "center" }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rawMaterials.map((m) => (
                        <tr key={m.id}>
                          <td data-label="Insumo">
                            <strong>{m.name}</strong>
                          </td>
                          <td data-label="Cantidad">
                            {m.purchase_quantity} {m.purchase_unit}
                          </td>
                          <td data-label="Costo Total Pagado">
                            <strong>${Number(m.purchase_cost).toFixed(2)}</strong>
                          </td>
                          <td data-label="Costo Unitario (Base)">
                            <span
                              style={{ color: "#16a34a", fontWeight: "bold" }}
                            >
                              ${Number(m.cost_per_base_unit).toFixed(4)} /{" "}
                              {m.base_unit}
                            </span>
                          </td>
                          <td data-label="Acciones" className="action-cell">
                            <div style={{ display: "flex", gap: "8px" }}>
                              <button
                                onClick={() => startEditMaterial(m)}
                                style={{
                                  background: "#f3f4f6",
                                  border: "1px solid #d1d5db",
                                  color: "#111827",
                                  padding: "6px 10px",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                }}
                                title="Editar Insumo"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteRawMaterial(m.id)}
                                style={{
                                  background: "#fee2e2",
                                  border: "1px solid #fecaca",
                                  color: "#e05d5d",
                                  cursor: "pointer",
                                  padding: "6px 10px",
                                  borderRadius: "4px"
                                }}
                                title="Eliminar Insumo"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VISTA 3: RENDIMIENTO Y VENTAS */}
        {activeSubTab === "sales_analytics" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "16px",
              }}
            >
              <div
                className="product-form-card mobile-card-padding"
                style={{ padding: "20px", borderLeft: "4px solid #111827" }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    color: "#6b7280",
                    fontWeight: "800",
                    textTransform: "uppercase",
                  }}
                >
                  Ingresos Totales en Platos
                </span>
                <h2
                  style={{
                    fontSize: "26px",
                    fontWeight: "900",
                    color: "#111827",
                    marginTop: "8px",
                  }}
                >
                  ${totalRevenueAll.toFixed(2)}
                </h2>
              </div>

              <div
                className="product-form-card mobile-card-padding"
                style={{ padding: "20px", borderLeft: "4px solid #e05d5d" }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    color: "#6b7280",
                    fontWeight: "800",
                    textTransform: "uppercase",
                  }}
                >
                  Costo Insumos Invertido
                </span>
                <h2
                  style={{
                    fontSize: "26px",
                    fontWeight: "900",
                    color: "#e05d5d",
                    marginTop: "8px",
                  }}
                >
                  ${totalCostAll.toFixed(2)}
                </h2>
              </div>

              <div
                className="product-form-card mobile-card-padding"
                style={{
                  padding: "20px",
                  borderLeft: "4px solid #16a34a",
                  background: "#f8fff9",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    color: "#16a34a",
                    fontWeight: "800",
                    textTransform: "uppercase",
                  }}
                >
                  Ganancia Neta Real
                </span>
                <h2
                  style={{
                    fontSize: "26px",
                    fontWeight: "900",
                    color: "#16a34a",
                    marginTop: "8px",
                  }}
                >
                  ${totalNetProfitAll.toFixed(2)}
                </h2>
                <span
                  style={{
                    fontSize: "11px",
                    color: "#16a34a",
                    fontWeight: "bold",
                  }}
                >
                  Margen global:{" "}
                  {totalRevenueAll > 0
                    ? ((totalNetProfitAll / totalRevenueAll) * 100).toFixed(1)
                    : "0"}
                  %
                </span>
              </div>
            </div>

            <div className="product-list-card mobile-card-padding" style={{ padding: "24px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "16px",
                      fontWeight: "800",
                      color: "#111827",
                    }}
                  >
                    Rendimiento y Margen por Platillo ({salesMetrics.length})
                  </h3>
                  <p
                    style={{
                      margin: "4px 0 0 0",
                      fontSize: "12px",
                      color: "#6b7280",
                    }}
                  >
                    Calculado cruzando las unidades vendidas en facturas contra el
                    costo real de tu receta.
                  </p>
                </div>

                <button
                  onClick={calculateSalesAndProfits}
                  disabled={loadingMetrics}
                  style={{
                    background: "#f3f4f6",
                    border: "1px solid #d1d5db",
                    padding: "10px 16px",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    width: "100%", 
                    maxWidth: "300px",
                    justifyContent: "center"
                  }}
                >
                  <RefreshCw
                    size={16}
                    className={loadingMetrics ? "spinning" : ""}
                  />{" "}
                  Actualizar Balances
                </button>
              </div>

              {loadingMetrics ? (
                <p
                  style={{
                    textAlign: "center",
                    padding: "40px",
                    color: "#6b7280",
                  }}
                >
                  Calculando ventas y consumo de insumos...
                </p>
              ) : salesMetrics.length === 0 ? (
                <p
                  style={{
                    color: "#6b7280",
                    fontSize: "13px",
                    textAlign: "center",
                    padding: "40px 0",
                  }}
                >
                  No hay ventas registradas aún.
                </p>
              ) : (
                <div style={{ width: "100%" }}>
                  <table className="cost-table">
                    <thead>
                      <tr>
                        <th>Platillo / Menú</th>
                        <th style={{ textAlign: "center" }}>Uds Vendidas</th>
                        <th>PVP Venta</th>
                        <th>Costo Real</th>
                        <th>Total Facturado</th>
                        <th>Inversión Insumos</th>
                        <th style={{ color: "#16a34a" }}>Ganancia Neta</th>
                        <th style={{ textAlign: "center" }}>Margen %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesMetrics.map((item) => (
                        <tr key={item.id}>
                          <td data-label="Platillo / Menú">
                            <strong>{item.name}</strong>
                            <br />
                            <span style={{ fontSize: "11px", color: "#6b7280" }}>
                              {item.category}
                            </span>
                          </td>
                          <td data-label="Unidades Vendidas">
                            <span
                              style={{
                                background: "#f3f4f6",
                                padding: "3px 8px",
                                borderRadius: "10px",
                                fontWeight: "bold",
                                fontSize: "12px",
                              }}
                            >
                              {item.unitsSold} ud.
                            </span>
                          </td>
                          <td data-label="Precio Venta (PVP)">${item.price.toFixed(2)}</td>
                          <td data-label="Costo de Preparación">
                            <span
                              style={{
                                color: item.cost === 0 ? "#9ca3af" : "#111827",
                                fontStyle: item.cost === 0 ? "italic" : "normal",
                              }}
                            >
                              {item.cost > 0
                                ? `$${item.cost.toFixed(2)}`
                                : "Sin costear"}
                            </span>
                          </td>
                          <td data-label="Ingresos Totales (Facturados)">
                            <strong>${item.totalRevenue.toFixed(2)}</strong>
                          </td>
                          <td data-label="Inversión en Insumos" style={{ color: "#e05d5d" }}>
                            -${item.totalCost.toFixed(2)}
                          </td>
                          <td data-label="Ganancia Neta Obtenida">
                            <strong
                              style={{
                                color: item.netProfit > 0 ? "#16a34a" : "#111827",
                                fontSize: "14px",
                              }}
                            >
                              ${item.netProfit.toFixed(2)}
                            </strong>
                          </td>
                          <td data-label="Margen de Rentabilidad">
                            <span
                              style={{
                                background:
                                  item.marginPercent >= 60
                                    ? "#dcfce7"
                                    : item.marginPercent >= 40
                                      ? "#fef3c7"
                                      : "#fee2e2",
                                color:
                                  item.marginPercent >= 60
                                    ? "#16a34a"
                                    : item.marginPercent >= 40
                                      ? "#d97706"
                                      : "#dc2626",
                                padding: "3px 8px",
                                borderRadius: "6px",
                                fontSize: "11px",
                                fontWeight: "bold",
                              }}
                            >
                              {item.totalRevenue > 0
                                ? `${item.marginPercent.toFixed(1)}%`
                                : "0%"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}