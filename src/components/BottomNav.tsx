import React from 'react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import {
  Home,
  Heart,
  Package,
  Store,
  ShoppingBag,
  Shield,
} from 'lucide-react';

interface BottomNavProps {
  currentView: 'storefront' | 'seller' | 'admin' | 'orders' | 'wishlist';
  onNavigate: (view: 'storefront' | 'seller' | 'admin' | 'orders' | 'wishlist') => void;
  onOpenSellerRegistration?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentView,
  onNavigate,
}) => {
  const { totalItemsCount, setIsCartOpen } = useCart();
  const { wishlistCount } = useWishlist();
  const { currentUser } = useAuth();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 py-1 px-1.5 md:hidden shadow-lg safe-bottom transition-colors duration-200">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {/* Home */}
        <button
          onClick={() => onNavigate('storefront')}
          className={`flex flex-col items-center py-1 px-2 text-[10px] font-bold transition-colors ${
            currentView === 'storefront' ? 'text-orange-600 dark:text-orange-500' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span>Home</span>
        </button>

        {/* Wishlist */}
        <button
          onClick={() => onNavigate('wishlist')}
          className={`flex flex-col items-center py-1 px-2 text-[10px] font-bold transition-colors relative ${
            currentView === 'wishlist' ? 'text-orange-600 dark:text-orange-500' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Heart className={`w-5 h-5 mb-0.5 ${currentView === 'wishlist' ? 'fill-orange-600 dark:fill-orange-500' : ''}`} />
          <span>Saved</span>
          {wishlistCount > 0 && (
            <span className="absolute top-0 right-1.5 bg-rose-500 text-white text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center">
              {wishlistCount}
            </span>
          )}
        </button>

        {/* Sell / Seller Center / Admin */}
        {/* Seller Center (authenticated sellers) or Admin Oversight */}
        {currentUser?.role === 'admin' ? (
          <button
            onClick={() => onNavigate('admin')}
            className={`flex flex-col items-center py-1 px-2 text-[10px] font-bold transition-colors ${
              currentView === 'admin' ? 'text-purple-600 dark:text-purple-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Shield className="w-5 h-5 mb-0.5" />
            <span>Admin</span>
          </button>
        ) : currentUser?.role === 'seller' ? (
          <button
            onClick={() => onNavigate('seller')}
            className={`flex flex-col items-center py-1 px-2 text-[10px] font-bold transition-colors ${
              currentView === 'seller' ? 'text-orange-600 dark:text-orange-500' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Store className="w-5 h-5 mb-0.5" />
            <span>Seller</span>
          </button>
        ) : null}

        {/* Orders */}
        <button
          onClick={() => onNavigate('orders')}
          className={`flex flex-col items-center py-1 px-2 text-[10px] font-bold transition-colors ${
            currentView === 'orders' ? 'text-orange-600 dark:text-orange-500' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Package className="w-5 h-5 mb-0.5" />
          <span>Orders</span>
        </button>

        {/* Cart */}
        <button
          onClick={() => setIsCartOpen(true)}
          className="flex flex-col items-center py-1 px-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 relative"
        >
          <ShoppingBag className="w-5 h-5 mb-0.5" />
          <span>Cart</span>
          {totalItemsCount > 0 && (
            <span className="absolute top-0 right-1.5 bg-orange-600 text-white text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center">
              {totalItemsCount}
            </span>
          )}
        </button>
      </div>
    </nav>
  );
};
