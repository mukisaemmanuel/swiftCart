import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useNotifications } from '../context/NotificationContext';
import { ProductCategory } from '../types';
import { ThemeToggle } from './ThemeToggle';
import {
  Menu,
  X,
  Search,
  ShoppingBag,
  Store,
  Shield,
  User,
  Zap,
  ChevronDown,
  LogOut,
  Package,
  Heart,
  Bell,
  Phone,
  Tag,
  ChevronRight,
} from 'lucide-react';

interface HeaderProps {
  currentCategory?: string | null;
  onSelectCategory?: (cat: ProductCategory | null) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenAuth: () => void;
  onOpenDemoSwitcher?: () => void;
  onOpenApplyToSell?: () => void;
  currentView: 'storefront' | 'seller' | 'admin' | 'superadmin' | 'orders' | 'wishlist' | 'sell';
  onNavigate: (view: 'storefront' | 'seller' | 'admin' | 'superadmin' | 'orders' | 'wishlist' | 'sell') => void;
  onOpenGeminiChat?: () => void;
  onOpenLiveVoice?: () => void;
}

const CATEGORY_LIST: ProductCategory[] = [
  'Phones & Tablets',
  'Electronics & Audio',
  'Supermarket & Groceries',
  'Fashion & Apparel',
  'Home & Appliances',
  'Health & Beauty',
  'Computing & IT',
  'Sports & Outdoors',
];

export const Header: React.FC<HeaderProps> = ({
  currentCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  onOpenAuth,
  onOpenDemoSwitcher,
  onOpenApplyToSell,
  currentView,
  onNavigate,
  onOpenGeminiChat,
  onOpenLiveVoice,
}) => {
  const { currentUser, currentSeller, logout, isBuyer, isSeller, isAdmin, isSuperAdmin } = useAuth();
  const { totalItemsCount, setIsCartOpen } = useCart();
  const { wishlistCount } = useWishlist();
  const { unreadCount, setIsOpen: setIsNotifOpen } = useNotifications();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full max-w-full bg-slate-900 border-b border-slate-800 px-2.5 sm:px-4 py-2 sm:py-2.5 shadow-md overflow-x-clip transition-colors duration-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-1.5 sm:gap-4 md:gap-6 w-full">
          {/* Left: Mobile Hamburger & Brand Logo */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 min-w-0">
            {/* Hamburger Button (strictly mobile < 768px) */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors focus:outline-hidden cursor-pointer shrink-0"
              aria-label="Open mobile menu"
            >
              <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            {/* Logo */}
            <button
              onClick={() => onNavigate('storefront')}
              className="flex items-center gap-1.5 sm:gap-2 group text-left shrink-0 cursor-pointer select-none"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-linear-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform shrink-0">
                <Zap className="w-4 h-4 sm:w-5 sm:h-5 fill-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-base sm:text-xl md:text-2xl font-extrabold tracking-tight text-white leading-none">
                    Swift<span className="text-orange-500">Cart</span>
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-extrabold uppercase px-1 sm:px-1.5 py-0.2 bg-orange-950/80 border border-orange-800/80 text-orange-400 rounded-md shrink-0">
                    UG
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 hidden sm:block font-medium">
                  Uganda's Multi-Vendor Marketplace
                </p>
              </div>
            </button>
          </div>

          {/* Center: Desktop Live Search Bar (>= 768px) */}
          <div className="hidden md:flex flex-1 max-w-2xl relative items-center">
            <div className="relative flex items-center w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search products, tech, groceries, brands, sellers..."
                className="w-full pl-10 pr-20 py-2 bg-slate-800 hover:bg-slate-750 focus:bg-slate-800 text-sm text-slate-100 border border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all placeholder:text-slate-400"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5" />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-12 text-xs text-slate-400 hover:text-white font-bold p-1 cursor-pointer"
                  title="Clear search"
                >
                  ✕
                </button>
              )}
              <button
                onClick={() => onNavigate('storefront')}
                className="absolute right-1 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Search</span>
              </button>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Mobile Search Toggle (< 768px) */}
            <button
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className="md:hidden p-1.5 sm:p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              aria-label="Toggle search"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Dark/Light Theme Toggle */}
            <ThemeToggle size="md" />

            {/* Desktop Wishlist Link (>= 768px) */}
            <button
              onClick={() => onNavigate('wishlist')}
              className={`hidden md:flex p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-bold transition-colors relative items-center gap-1.5 cursor-pointer ${
                currentView === 'wishlist'
                  ? 'bg-rose-950/60 text-rose-400 border border-rose-800'
                  : 'text-slate-300 hover:bg-slate-800 border border-slate-700'
              }`}
              title="Saved Items"
            >
              <Heart className={`w-4 h-4 ${currentView === 'wishlist' ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`} />
              <span className="hidden lg:inline">Wishlist</span>
              {wishlistCount > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                  {wishlistCount}
                </span>
              )}
            </button>

            {/* Desktop Notification Bell (>= 768px) */}
            <button
              onClick={() => setIsNotifOpen(true)}
              className="hidden md:flex p-2 sm:px-2.5 sm:py-2 rounded-xl text-slate-300 hover:bg-slate-800 border border-slate-700 transition-colors relative cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4 text-slate-400" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Prominent Seller Center Button (Desktop) */}
            {currentUser?.role === 'seller' && (
              <button
                onClick={() => onNavigate('seller')}
                className={`hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  currentView === 'seller'
                    ? 'bg-orange-600 text-white shadow-md ring-2 ring-orange-400'
                    : 'bg-orange-950/60 hover:bg-orange-900/60 text-orange-300 border border-orange-800 shadow-2xs'
                }`}
                title="Go to Seller Center"
              >
                <Store className="w-4 h-4" />
                <span>Seller Center</span>
                {currentSeller?.status === 'pending' && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="Store verification pending"></span>
                )}
              </button>
            )}

            {/* Prominent Admin Oversight Button (Desktop) */}
            {currentUser?.role === 'admin' && (
              <button
                onClick={() => onNavigate('admin')}
                className={`hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  currentView === 'admin'
                    ? 'bg-purple-700 text-white shadow-md ring-2 ring-purple-400'
                    : 'bg-purple-950/80 hover:bg-purple-900/80 text-purple-200 border border-purple-700 shadow-2xs'
                }`}
                title="SwiftCart Admin Management"
              >
                <Shield className="w-4 h-4" />
                <span>Admin</span>
              </button>
            )}

            {/* Orders link (Desktop) */}
            <button
              onClick={() => onNavigate('orders')}
              className={`hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                currentView === 'orders'
                  ? 'bg-orange-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 border border-slate-700'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Orders</span>
            </button>

            {/* User Account / Auth Actions (Desktop) */}
            <div className="hidden md:block">
              {currentUser ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-2 rounded-xl border border-slate-700 hover:bg-slate-800 transition-colors text-left cursor-pointer"
                  >
                    <img
                      src={currentUser.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser.name)}`}
                      alt={currentUser.name}
                      className="w-7 h-7 rounded-full object-cover border border-slate-600 bg-slate-700"
                    />
                    <div className="hidden lg:block text-left">
                      <div className="text-xs font-bold text-slate-100 truncate max-w-[90px]">
                        {currentUser.name.split(' ')[0]}
                      </div>
                      <div className="text-[10px] text-orange-400 font-semibold uppercase">
                        {currentUser.role}
                      </div>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-slate-900 rounded-2xl shadow-xl border border-slate-800 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="px-4 py-2.5 border-b border-slate-800">
                        <p className="text-xs text-slate-400">Signed in as</p>
                        <p className="text-sm font-bold text-white truncate">
                          {currentUser.name}
                        </p>
                        <p className="text-xs text-slate-400 truncate">{currentUser.email}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300">
                          Role: {currentUser.role}
                        </span>
                      </div>

                      <div className="p-1">
                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            onNavigate('wishlist');
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 rounded-xl flex items-center gap-2 cursor-pointer"
                        >
                          <Heart className="w-4 h-4 text-rose-500" />
                          My Wishlist ({wishlistCount})
                        </button>

                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            onNavigate('orders');
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 rounded-xl flex items-center gap-2 cursor-pointer"
                        >
                          <Package className="w-4 h-4 text-slate-400" />
                          My Orders & Tracking
                        </button>

                        {isSeller && (
                          <button
                            onClick={() => {
                              setUserMenuOpen(false);
                              onNavigate('seller');
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-semibold text-orange-300 hover:bg-orange-950/40 rounded-xl flex items-center gap-2 cursor-pointer"
                          >
                            <Store className="w-4 h-4 text-orange-400" />
                            Seller Portal (/seller)
                          </button>
                        )}

                        {isBuyer && !isSeller && !isAdmin && !isSuperAdmin && (
                          <button
                            onClick={() => {
                              setUserMenuOpen(false);
                              if (onOpenApplyToSell) onOpenApplyToSell();
                              else onNavigate('sell');
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 rounded-xl flex items-center gap-2 cursor-pointer"
                          >
                            <Store className="w-4 h-4 text-slate-400" />
                            Apply to Sell on SwiftCart
                          </button>
                        )}

                        {isAdmin && (
                          <button
                            onClick={() => {
                              setUserMenuOpen(false);
                              onNavigate('admin');
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-semibold text-blue-300 hover:bg-blue-950/40 rounded-xl flex items-center gap-2 cursor-pointer"
                          >
                            <Shield className="w-4 h-4 text-blue-400" />
                            Operations Admin (/admin)
                          </button>
                        )}

                        {isSuperAdmin && (
                          <button
                            onClick={() => {
                              setUserMenuOpen(false);
                              onNavigate('superadmin');
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-semibold text-purple-300 hover:bg-purple-950/40 rounded-xl flex items-center gap-2 cursor-pointer"
                          >
                            <span className="text-xs">👑</span>
                            Super Admin Executive (/superadmin)
                          </button>
                        )}

                        <div className="border-t border-slate-800 my-1"></div>

                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            onOpenAuth();
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 rounded-xl flex items-center gap-2 cursor-pointer"
                        >
                          <User className="w-4 h-4 text-slate-400" />
                          Switch / Register Account
                        </button>

                        <button
                          onClick={async () => {
                            setUserMenuOpen(false);
                            await logout();
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-950/40 rounded-xl flex items-center gap-2 cursor-pointer"
                        >
                          <LogOut className="w-4 h-4 text-red-500" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={onOpenAuth}
                  className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-extrabold shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  <User className="w-4 h-4" />
                  <span>Sign In</span>
                </button>
              )}
            </div>

            {/* Cart Button (Always visible on mobile & desktop) */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-1.5 sm:p-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold transition-all flex items-center gap-1.5 sm:gap-2 shadow-sm shrink-0 cursor-pointer"
              aria-label="Shopping Cart"
            >
              <ShoppingBag className="w-5 h-5" />
              <span className="hidden sm:inline text-xs font-bold">Cart</span>
              {totalItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-900 text-[10px] sm:text-[11px] font-black w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-xs">
                  {totalItemsCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Expandable Search Row (< 768px) */}
        {mobileSearchOpen && (
          <div className="md:hidden mt-2.5 pt-2 border-t border-slate-800 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="relative flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search products, brands, groceries..."
                autoFocus
                className="w-full pl-9 pr-9 py-2 bg-slate-800 text-sm text-white border border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500 placeholder:text-slate-400"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3" />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-2.5 text-xs text-slate-400 hover:text-white font-bold p-1 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Mobile Slide-Out Drawer Sheet (md:hidden) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop overlay */}
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
            aria-hidden="true"
          />

          {/* Drawer panel */}
          <aside className="fixed top-0 bottom-0 left-0 w-72 max-w-[80vw] bg-slate-900 text-white z-50 p-5 flex flex-col justify-between shadow-2xl overflow-y-auto no-scrollbar animate-in slide-in-from-left duration-200">
            <div className="space-y-4">
              {/* Header: Logo + Close Button */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-linear-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-sm">
                    <Zap className="w-4 h-4 fill-white" />
                  </div>
                  <span className="text-lg font-black tracking-tight text-white">
                    Swift<span className="text-orange-500">Cart</span>
                    <span className="ml-1 text-[9px] font-extrabold uppercase px-1 py-0.5 bg-orange-950 border border-orange-800 text-orange-400 rounded">
                      UG
                    </span>
                  </span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User Greeting Card */}
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80">
                {currentUser ? (
                  <div className="flex items-center gap-3">
                    <img
                      src={currentUser.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser.name)}`}
                      alt={currentUser.name}
                      className="w-10 h-10 rounded-full object-cover border border-slate-600 bg-slate-700"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-400">Welcome,</p>
                      <p className="text-sm font-bold text-white truncate">{currentUser.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-orange-950/80 text-orange-400 border border-orange-800/60">
                          {currentUser.role}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-slate-400">Welcome, Guest</p>
                    <p className="text-sm font-bold text-white mt-0.5">Shop & Save with SwiftCart</p>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onOpenAuth();
                      }}
                      className="mt-2.5 w-full py-1.5 px-3 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Sign In / Register</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Search input in Drawer */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search products..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-800 text-xs text-white border border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500 placeholder:text-slate-400"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>

              {/* Navigation Links */}
              <nav className="space-y-1">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate('orders');
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    currentView === 'orders' ? 'bg-orange-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Package className="w-4 h-4 text-orange-400" />
                    <span>Orders & Tracking</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate('wishlist');
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    currentView === 'wishlist' ? 'bg-orange-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Heart className="w-4 h-4 text-rose-400" />
                    <span>Wishlist</span>
                  </div>
                  {wishlistCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                      {wishlistCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setIsNotifOpen(true);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Bell className="w-4 h-4 text-amber-400" />
                    <span>Notifications</span>
                  </div>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-orange-600 text-white text-[10px] font-bold">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Categories Collapsible */}
                <div className="pt-1">
                  <button
                    onClick={() => setCategoriesExpanded(!categoriesExpanded)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Tag className="w-4 h-4 text-cyan-400" />
                      <span>Categories</span>
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${categoriesExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  {categoriesExpanded && (
                    <div className="mt-1 pl-4 pr-1 py-1 space-y-1 bg-slate-800/40 rounded-xl border border-slate-800">
                      {CATEGORY_LIST.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => {
                            onSelectCategory?.(cat);
                            onNavigate('storefront');
                            setMobileMenuOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer ${
                            currentCategory === cat ? 'text-orange-400 font-bold bg-slate-800' : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <span>{cat}</span>
                          <ChevronRight className="w-3 h-3 text-slate-600" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Support / WhatsApp */}
                <a
                  href="https://wa.me/256700000000?text=Hello%20SwiftCart%20Support"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Phone className="w-4 h-4 text-emerald-400" />
                    <span>Support / WhatsApp</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono">+256 UG</span>
                </a>
              </nav>

              {/* Context Actions: Seller / Admin / Super Admin / Apply to Sell */}
              <div className="pt-2 border-t border-slate-800 space-y-1.5">
                {isSeller && (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onNavigate('seller');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold bg-orange-950/80 border border-orange-800 text-orange-300 hover:bg-orange-900/80 transition-colors cursor-pointer"
                  >
                    <Store className="w-4 h-4 text-orange-400" />
                    <span>Seller Portal (/seller)</span>
                  </button>
                )}

                {isBuyer && !isSeller && !isAdmin && !isSuperAdmin && (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      if (onOpenApplyToSell) onOpenApplyToSell();
                      else onNavigate('sell');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-750 transition-colors cursor-pointer"
                  >
                    <Store className="w-4 h-4 text-slate-400" />
                    <span>Apply to Sell on SwiftCart</span>
                  </button>
                )}

                {isAdmin && (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onNavigate('admin');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold bg-blue-950/80 border border-blue-800 text-blue-300 hover:bg-blue-900/80 transition-colors cursor-pointer"
                  >
                    <Shield className="w-4 h-4 text-blue-400" />
                    <span>Operations Admin (/admin)</span>
                  </button>
                )}

                {isSuperAdmin && (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onNavigate('superadmin');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold bg-purple-950/80 border border-purple-800 text-purple-300 hover:bg-purple-900/80 transition-colors cursor-pointer"
                  >
                    <span className="text-xs">👑</span>
                    <span>Super Admin Executive (/superadmin)</span>
                  </button>
                )}
              </div>
            </div>

            {/* Drawer Footer Auth Action */}
            <div className="pt-4 border-t border-slate-800 mt-4">
              {currentUser ? (
                <button
                  onClick={async () => {
                    setMobileMenuOpen(false);
                    await logout();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-red-400 hover:text-red-300 bg-red-950/40 hover:bg-red-950/70 border border-red-900/60 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 transition-colors shadow-sm cursor-pointer"
                >
                  <User className="w-4 h-4" />
                  <span>Sign In / Register</span>
                </button>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
};
