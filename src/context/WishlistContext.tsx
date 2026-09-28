import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { dbService } from '../services/db';
import { Product, WishlistItem } from '../types';

interface WishlistContextType {
  wishlistItems: WishlistItem[];
  wishlistProducts: Product[];
  isLoading: boolean;
  isInWishlist: (productId: string) => boolean;
  toggleWishlist: (product: Product) => Promise<boolean>;
  removeFromWishlist: (productId: string) => Promise<void>;
  refreshWishlist: () => Promise<void>;
  wishlistCount: number;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refreshWishlist = async () => {
    if (!currentUser) {
      setWishlistItems([]);
      setWishlistProducts([]);
      return;
    }
    setIsLoading(true);
    const items = await dbService.getWishlist(currentUser.id);
    setWishlistItems(items);

    const allProducts = await dbService.getProducts();
    const prods = items
      .map((item) => allProducts.find((p) => p.id === item.productId))
      .filter((p): p is Product => !!p);

    setWishlistProducts(prods);
    setIsLoading(false);
  };

  useEffect(() => {
    refreshWishlist();
  }, [currentUser?.id]);

  const isInWishlist = (productId: string) => {
    return wishlistItems.some((w) => w.productId === productId);
  };

  const toggleWishlist = async (product: Product): Promise<boolean> => {
    if (!currentUser) return false;

    if (isInWishlist(product.id)) {
      await dbService.removeFromWishlist(currentUser.id, product.id);
      setWishlistItems((prev) => prev.filter((w) => w.productId !== product.id));
      setWishlistProducts((prev) => prev.filter((p) => p.id !== product.id));
      return false;
    } else {
      const created = await dbService.addToWishlist(currentUser.id, product.id);
      setWishlistItems((prev) => [...prev, created]);
      setWishlistProducts((prev) => [product, ...prev]);
      return true;
    }
  };

  const removeFromWishlist = async (productId: string) => {
    if (!currentUser) return;
    await dbService.removeFromWishlist(currentUser.id, productId);
    setWishlistItems((prev) => prev.filter((w) => w.productId !== productId));
    setWishlistProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlistItems,
        wishlistProducts,
        isLoading,
        isInWishlist,
        toggleWishlist,
        removeFromWishlist,
        refreshWishlist,
        wishlistCount: wishlistItems.length,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
