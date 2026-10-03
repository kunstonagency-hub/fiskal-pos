import { useState, useCallback, useMemo } from "react";

/**
 * useCart - Hook para manejar el carrito del POS.
 *
 * Responsabilidades:
 * - Estado del carrito (items)
 * - Operaciones: agregar, quitar, actualizar cantidad, vaciar
 * - Cálculos derivados: subtotal, impuestos, total USD y Bs
 *
 * IMPORTANTE: Las funciones de cobro (handleCheckoutSubmit, etc.)
 * siguen viviendo en App.jsx por ahora. Solo extraemos el manejo
 * del carrito y los cálculos puros.
 *
 * @param {Object} options
 * @param {Array} options.products - lista de productos (para validar stock)
 * @param {Object} options.currentShift - turno activo (si no hay, no se puede agregar)
 * @param {Function} options.onRequireOpenShift - callback cuando el cajero intenta
 *                                                vender sin turno abierto (para saltar a Caja)
 * @param {Boolean} options.currentStoreTaxEnabled - si la tienda usa IVA
 * @param {Number} options.currentStoreTaxRate - % de IVA (ej. 16)
 * @param {Boolean} options.currentStoreTaxInclusive - si el precio ya incluye IVA
 * @param {Number} options.bcvRate - tasa BCV para calcular total en Bs
 */
export function useCart({
  products = [],
  currentShift = null,
  onRequireOpenShift = null,
  currentStoreTaxEnabled = false,
  currentStoreTaxRate = 0,
  currentStoreTaxInclusive = false,
  bcvRate = 0,
}) {
  const [cart, setCart] = useState([]);

  // ============================================================
  // OPERACIONES DEL CARRITO
  // ============================================================

  const addToCart = useCallback(
    (product) => {
      // 1) Bloqueo si no hay turno abierto
      if (!currentShift) {
        alert("Debes abrir la caja / turno antes de procesar ventas.");
        if (onRequireOpenShift) onRequireOpenShift();
        return;
      }

      // 2) Validar stock disponible (contando paquetes como N unidades)
      const currentInCart = cart
        .filter((item) => item.id === product.id)
        .reduce(
          (sum, item) => sum + item.quantity * (item.unitsMultiplier || 1),
          0
        );

      if (product.stock !== undefined && currentInCart + 1 > product.stock) {
        alert(
          `No hay suficiente stock disponible para ${product.name}. Stock actual: ${product.stock}`
        );
        return;
      }

      // 3) Agregar o agrupar con un item existente NO enviado a cocina
      setCart((prevCart) => {
        const existing = prevCart.find(
          (item) => item.id === product.id && !item.stock_deducted
        );

        if (existing) {
          return prevCart.map((item) =>
            item.id === product.id && !item.stock_deducted
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
        }

        // Items ya enviados a cocina no se agrupan: se crea una línea nueva
        return [
          ...prevCart,
          {
            ...product,
            quantity: 1,
            cartItemId: `${product.id}_new_${Date.now()}`,
          },
        ];
      });
    },
    [cart, currentShift, onRequireOpenShift]
  );

  const removeFromCart = useCallback((targetKey) => {
    setCart((prev) =>
      prev.filter((item) => {
        const uniqueKey = item.cartItemId || item.id;
        return uniqueKey !== targetKey;
      })
    );
  }, []);

  const updateQuantity = useCallback(
    (targetKey, delta) => {
      setCart((prevCart) =>
        prevCart
          .map((item) => {
            const uniqueKey = item.cartItemId || item.id;

            if (uniqueKey === targetKey) {
              // Bloquear '+' si ya fue enviado a cocina
              if (item.stock_deducted && delta > 0) {
                alert(
                  "Este platillo ya fue enviado a la cocina. Si el cliente quiere otro igual, por favor agrégalo desde el menú para generar una comanda nueva."
                );
                return item;
              }

              const productInfo = products.find((p) => p.id === item.id);
              const newQty = item.quantity + delta;

              if (delta > 0 && productInfo && newQty > productInfo.stock) {
                alert(`Stock máximo alcanzado (${productInfo.stock} unidades).`);
                return item;
              }

              return newQty > 0 ? { ...item, quantity: newQty } : null;
            }
            return item;
          })
          .filter(Boolean)
      );
    },
    [products]
  );

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  // ============================================================
  // CÁLCULOS DERIVADOS (subtotal, IVA, total USD/Bs)
  // ============================================================

  const calculations = useMemo(() => {
    const rawCartSum = cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    let subtotalUSD = 0;
    let taxUSD = 0;
    let totalUSD = 0;

    if (currentStoreTaxEnabled) {
      if (currentStoreTaxInclusive) {
        totalUSD = rawCartSum;
        subtotalUSD = parseFloat(
          (totalUSD / (1 + currentStoreTaxRate / 100)).toFixed(2)
        );
        taxUSD = parseFloat((totalUSD - subtotalUSD).toFixed(2));
      } else {
        subtotalUSD = rawCartSum;
        taxUSD = parseFloat(
          (subtotalUSD * (currentStoreTaxRate / 100)).toFixed(2)
        );
        totalUSD = subtotalUSD + taxUSD;
      }
    } else {
      subtotalUSD = rawCartSum;
      taxUSD = 0;
      totalUSD = rawCartSum;
    }

    const totalBs = totalUSD * (bcvRate || 0);

    return {
      rawCartSum,
      cartSubtotalUSD: subtotalUSD,
      calculatedTaxUSD: taxUSD,
      calculatedTotalUSD: totalUSD,
      totalBs,
    };
  }, [
    cart,
    currentStoreTaxEnabled,
    currentStoreTaxRate,
    currentStoreTaxInclusive,
    bcvRate,
  ]);

  return {
    cart,
    setCart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    ...calculations,
  };
}