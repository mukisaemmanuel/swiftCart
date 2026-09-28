import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useNotifications } from '../context/NotificationContext';
import { ProductCategory } from '../types';
import { ThemeToggle } from './ThemeToggle';
import {
  ShoppingBag,
  Search,
  Store,
  Shield,
  User,
  Zap,
  MapPin,
  ChevronDown,
  LogOut,
  Package,
  Sparkles,
  Heart,
  Bell,
  Mic,
} from 'lucide-react';

interface HeaderProps {
  currentCategory: string | null;
  onSelectCategory: (cat: ProductCategory | null) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenAuth: () => void;
  onOpenDemoSwitcher: () => void;
  currentView: 'storefront' | 'seller' | 'admin' | 'orders' | 'wishlist';
  onNavigate: (view: 'storefront' | 'seller' | 'admin' | 'orders' | 'wishlist') => void;
  onOpenGeminiChat?: () => void;
  onOpenLiveVoice?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onOpenAuth,
  onOpenDemoSwitcher,
  currentView,
  onNavigate,
  onOpenGeminiChat,
  onOpenLiveVoice,
}) => {
  const { currentUser, currentSeller, logout } = useAuth();
  const { totalItemsCount, setIsCartOpen } = useCart();
  const { wishlistCount } = useWishlist();
  const { unreadCount, setIsOpen: setIsNotifOpen } = useNotifications();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs transition-colors duration-200">
      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-3 md:gap-6">
          {/* Logo */}
          <button
            onClick={() => onNavigate('storefront')}
            className="flex items-center gap-2 group text-left shrink-0"
          >
            <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
              <Zap className="w-6 h-6 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Swift<span className="text-orange-600 dark:text-orange-500">Cart</span>
                </span>
                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 rounded-md">
                  UG
                </span>
              </div>
              <p className="text-[10px] text-slate-600 dark:text-slate-400 hidden sm:block font-medium">
                Uganda's Multi-Vendor Marketplace
              </p>
            </div>
          </button>

          {/* Search bar */}
          <div className="flex-1 max-w-2xl relative">
            <div className="relative flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search products, tech, groceries, brands, sellers..."
                className="w-full pl-10 pr-10 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 focus:bg-white dark:focus:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 border border-slate-300/80 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5" />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Right Navigation */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Gemini AI Assistant Button */}
            {onOpenGeminiChat && (
              <div className="flex items-center gap-1 bg-orange-50 dark:bg-orange-950/40 border border-orange-200/80 dark:border-orange-800/60 rounded-xl p-0.5 shadow-2xs">
                <button
                  onClick={onOpenGeminiChat}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-orange-950 dark:text-orange-200 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors"
                  title="Open Gemini AI Chat Assistant"
                >
                  <Sparkles className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                  <span className="hidden sm:inline">Ask AI</span>
                </button>

                {onOpenLiveVoice && (
                  <button
                    onClick={onOpenLiveVoice}
                    className="p-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white transition-colors"
                    title="Start Live Voice (gemini-3.8-live)"
                  >
                    <Mic className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Dark/Light Theme Toggle */}
            <ThemeToggle size="md" />

            {/* Wishlist Link */}
            <button
              onClick={() => onNavigate('wishlist')}
              className={`p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-bold transition-colors relative flex items-center gap-1.5 ${
                currentView === 'wishlist'
                  ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
              }`}
              title="Saved Items"
            >
              <Heart className={`w-4 h-4 ${currentView === 'wishlist' ? 'fill-rose-500 text-rose-500' : 'text-slate-600 dark:text-slate-400'}`} />
              <span className="hidden lg:inline">Wishlist</span>
              {wishlistCount > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                  {wishlistCount}
                </span>
              )}
            </button>

            {/* Notification Bell */}
            <button
              onClick={() => setIsNotifOpen(true)}
              className="p-2 sm:px-2.5 sm:py-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors relative"
              title="Notifications"
            >
              <Bell className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Seller link */}
            {currentUser?.role === 'seller' ? (
              <button
                onClick={() => onNavigate('seller')}
                className={`hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  currentView === 'seller'
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/40 border border-orange-200 dark:border-orange-800'
                }`}
              >
                <Store className="w-4 h-4" />
                <span>Seller Center</span>
                {currentSeller?.status === 'pending' && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                )}
              </button>
            ) : (
              <button
                onClick={() => {
                  if (!currentUser || currentUser.role !== 'seller') {
                    onOpenAuth();
                  } else {
                    onNavigate('seller');
                  }
                }}
                className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-800 transition-colors"
              >
                <Store className="w-4 h-4" />
                <span>Sell on SwiftCart</span>
              </button>
            )}

            {/* Admin link */}
            {currentUser?.role === 'admin' && (
              <button
                onClick={() => onNavigate('admin')}
                className={`hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  currentView === 'admin'
                    ? 'bg-purple-700 text-white'
                    : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 border border-purple-200 dark:border-purple-800'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Admin</span>
              </button>
            )}

            {/* Orders link */}
            <button
              onClick={() => onNavigate('orders')}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                currentView === 'orders'
                  ? 'bg-slate-900 dark:bg-orange-600 text-white'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Orders</span>
            </button>

            {/* User Account / Auth Actions */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                >
                  <img
                    src={currentUser.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser.name)}`}
                    alt={currentUser.name}
                    className="w-7 h-7 rounded-full object-cover border border-slate-300 dark:border-slate-600 bg-slate-100"
                  />
                  <div className="hidden lg:block text-left">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate max-w-[90px]">
                      {currentUser.name.split(' ')[0]}
                    </div>
                    <div className="text-[10px] text-orange-600 dark:text-orange-400 font-semibold uppercase">
                      {currentUser.role}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Signed in as</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {currentUser.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{currentUser.email}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        Role: {currentUser.role}
                      </span>
                    </div>

                    <div className="p-1">
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          onOpenDemoSwitcher();
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/40 rounded-xl flex items-center gap-2"
                      >
                        <Sparkles className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                        Switch Demo Persona
                      </button>

                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          onNavigate('wishlist');
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl flex items-center gap-2"
                      >
                        <Heart className="w-4 h-4 text-rose-500" />
                        My Wishlist ({wishlistCount})
                      </button>

                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          onNavigate('orders');
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl flex items-center gap-2"
                      >
                        <Package className="w-4 h-4 text-slate-500" />
                        My Orders & Tracking
                      </button>

                      {currentUser.role === 'seller' ? (
                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            onNavigate('seller');
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl flex items-center gap-2"
                        >
                          <Store className="w-4 h-4 text-slate-500" />
                          Seller Dashboard
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            onOpenAuth();
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl flex items-center gap-2"
                        >
                          <Store className="w-4 h-4 text-slate-500" />
                          Register as Seller
                        </button>
                      )}

                      {currentUser.role === 'admin' && (
                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            onNavigate('admin');
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-xl flex items-center gap-2"
                        >
                          <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          Admin Oversight
                        </button>
                      )}

                      <div className="border-t border-slate-100 dark:border-slate-800 my-1"></div>

                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          onOpenAuth();
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl flex items-center gap-2"
                      >
                        <User className="w-4 h-4 text-slate-500" />
                        Switch / Register Account
                      </button>

                      <button
                        onClick={async () => {
                          setUserMenuOpen(false);
                          await logout();
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4 text-red-500" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Persona Switcher icon button */}
                <button
                  onClick={onOpenDemoSwitcher}
                  className="p-2 sm:px-2.5 sm:py-2 rounded-xl text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 dark:hover:bg-orange-900/50 border border-orange-200/80 dark:border-orange-800/60 transition-colors flex items-center gap-1.5"
                  title="Demo Accounts / Persona Switcher"
                >
                  <Sparkles className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  <span className="hidden xl:inline text-xs font-bold">Demo Switcher</span>
                </button>

                {/* Prominent Sign In Button */}
                <button
                  onClick={onOpenAuth}
                  className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-extrabold shadow-sm transition-all active:scale-95"
                >
                  <User className="w-4 h-4" />
                  <span>Sign In</span>
                </button>
              </div>
            )}

            {/* Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold transition-all flex items-center gap-2 shadow-sm"
            >
              <ShoppingBag className="w-5 h-5" />
              <span className="hidden sm:inline text-xs font-bold">Cart</span>
              {totalItemsCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-slate-900 text-[11px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-xs">
                  {totalItemsCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
