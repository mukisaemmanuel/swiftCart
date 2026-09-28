import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, CartItem, SellerPackage } from '../types';

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
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
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(LS_CART_KEY, JSON.stringify(items));
  }, [items]);

  const addToCart = (product: Product, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setItems([]);
  };

  // Group items by seller for multi-vendor package breakdown
  const packageMap = new Map<string, { sellerStoreName: string; items: CartItem[] }>();

  for (const item of items) {
    const sellerId = item.product.sellerId;
    if (!packageMap.has(sellerId)) {
      packageMap.set(sellerId, {
        sellerStoreName: item.product.sellerStoreName,
        items: [],
      });
    }
    packageMap.get(sellerId)!.items.push(item);
  }

  const sellerPackages: SellerPackage[] = Array.from(packageMap.entries()).map(
    ([sellerId, data]) => {
      const subtotalUGX = data.items.reduce(
        (acc, it) => acc + it.product.priceUGX * it.quantity,
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

  const totalItemsCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalProductsAmountUGX = items.reduce(
    (sum, item) => sum + item.product.priceUGX * item.quantity,
    0
  );
  const totalDeliveryFeeUGX = sellerPackages.reduce(
    (sum, pkg) => sum + pkg.deliveryFeeUGX,
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
