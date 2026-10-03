import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, ProductVariant, CartItem, SellerPackage } from '../types';

interface CartContextType {
  items: CartItem[];
  addToCart: (
    product: Product,
    variantOrQuantity?: ProductVariant | number,
    quantityOrAutoOpen?: number | boolean,
    autoOpenDrawer?: boolean
  ) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  removeFromCart: (productId: string, variantId?: string) => void;
  clearCart: () => void;
  totalItemsCount: number;
  totalProductsAmountUGX: number;
  totalDeliveryFeeUGX: number;
  grandTotalUGX: number;
  sellerPackages: SellerPackage[];
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const LS_CART_KEY = 'swiftcart_cart_items_v1';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(LS_CART_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed)
        ? parsed.filter((it) => it && it.product && typeof it.product === 'object' && typeof it.quantity === 'number')
        : [];
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(LS_CART_KEY, JSON.stringify(items));
  }, [items]);

  const addToCart = (
    product: Product,
    variantOrQuantity?: ProductVariant | number,
    quantityOrAutoOpen?: number | boolean,
    autoOpenDrawer?: boolean
  ) => {
    if (!product || !product.id) return;

    let variant: ProductVariant | undefined = undefined;
    let quantity = 1;
    let openDrawer = true;

    if (typeof variantOrQuantity === 'number') {
      quantity = variantOrQuantity;
      if (typeof quantityOrAutoOpen === 'boolean') {
        openDrawer = quantityOrAutoOpen;
      }
    } else if (variantOrQuantity && typeof variantOrQuantity === 'object') {
      variant = variantOrQuantity;
      if (typeof quantityOrAutoOpen === 'number') {
        quantity = quantityOrAutoOpen;
      }
      if (typeof autoOpenDrawer === 'boolean') {
        openDrawer = autoOpenDrawer;
      }
    } else {
      if (typeof quantityOrAutoOpen === 'boolean') {
        openDrawer = quantityOrAutoOpen;
      }
    }

    const safeQty = isNaN(Number(quantity)) || Number(quantity) <= 0 ? 1 : Math.round(Number(quantity));

    // Calculate effective unit price with variant offset if any
    const unitPrice =
      variant && typeof variant.additionalPrice === 'number'
        ? (Number(product.priceUGX) || 0) + variant.additionalPrice
        : Number(product.priceUGX) || 0;

    const cartProduct: Product = {
      ...product,
      priceUGX: unitPrice,
    };

    setItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) =>
          item.product.id === product.id &&
          ((!item.selectedVariant && !variant) || item.selectedVariant?.id === variant?.id)
      );

      if (existingIndex > -1) {
        return prev.map((item, idx) =>
          idx === existingIndex
            ? { ...item, quantity: (Number(item.quantity) || 0) + safeQty }
            : item
        );
      }
      return [...prev, { product: cartProduct, quantity: safeQty, selectedVariant: variant }];
    });

    if (openDrawer) {
      setIsCartOpen(true);
    }
  };

  const updateQuantity = (productId: string, quantity: number, variantId?: string) => {
    const safeQty = Number(quantity);
    if (isNaN(safeQty) || safeQty <= 0) {
      removeFromCart(productId, variantId);
      return;
    }
    setItems((prev) =>
      prev.map((item) => {
        const matches =
          item.product.id === productId &&
          (!variantId || item.selectedVariant?.id === variantId);
        return matches ? { ...item, quantity: safeQty } : item;
      })
    );
  };

  const removeFromCart = (productId: string, variantId?: string) => {
    setItems((prev) =>
      prev.filter((item) => {
        if (item.product.id !== productId) return true;
        if (variantId && item.selectedVariant?.id !== variantId) return true;
        return false;
      })
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  // Group items by seller for multi-vendor package breakdown
  const packageMap = new Map<string, { sellerStoreName: string; items: CartItem[] }>();

  for (const item of items) {
    const sellerId = item.product.sellerId || 'unknown_seller';
    if (!packageMap.has(sellerId)) {
      packageMap.set(sellerId, {
        sellerStoreName: item.product.sellerStoreName || 'SwiftCart Merchant',
        items: [],
      });
    }
    packageMap.get(sellerId)!.items.push(item);
  }

  const sellerPackages: SellerPackage[] = Array.from(packageMap.entries()).map(
    ([sellerId, data]) => {
      const subtotalUGX = data.items.reduce(
        (acc, it) => acc + (Number(it.product.priceUGX) || 0) * (Number(it.quantity) || 1),
        0
      );
      // Flat standard local delivery per seller package in Uganda
      const deliveryFeeUGX = 5000;
      return {
        sellerId,
        sellerStoreName: data.sellerStoreName,
        items: data.items,
        subtotalUGX,
        deliveryFeeUGX,
        totalUGX: subtotalUGX + deliveryFeeUGX,
      };
    }
  );

  const totalItemsCount = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const totalProductsAmountUGX = items.reduce(
    (sum, item) => sum + (Number(item.product.priceUGX) || 0) * (Number(item.quantity) || 1),
    0
  );
  const totalDeliveryFeeUGX = sellerPackages.reduce(
    (sum, pkg) => sum + (Number(pkg.deliveryFeeUGX) || 0),
    0
  );
  const grandTotalUGX = totalProductsAmountUGX + totalDeliveryFeeUGX;

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        totalItemsCount,
        totalProductsAmountUGX,
        totalDeliveryFeeUGX,
        grandTotalUGX,
        sellerPackages,
        isCartOpen,
        setIsCartOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
