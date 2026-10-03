import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeProvider } from './context/ThemeContext';
import { dbService } from './services/db';
import { Product, ProductCategory, Seller, UserRole } from './types';
import { SEED_PRODUCTS, SEED_SELLERS } from './data/seedData';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { BannerCarousel } from './components/BannerCarousel';
import { CategoryBar } from './components/CategoryBar';
import { ProductCard } from './components/ProductCard';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { OrderTrackingView } from './components/OrderTrackingView';
import { WishlistView } from './components/WishlistView';
import { SellerDashboard } from './components/SellerDashboard';
import { AdminPanel } from './components/AdminPanel';
import { SuperAdminPanel } from './components/SuperAdminPanel';
import { RouteGuard } from './components/RouteGuard';
import { ApplyToSellModal } from './components/ApplyToSellModal';
import { SellerInquiryPage } from './components/SellerInquiryPage';
import { SellerRegisterGatedPage } from './components/SellerRegisterGatedPage';
import { ProductDetailPage } from './components/ProductDetailPage';
import { AuthModal } from './components/AuthModal';
import { DemoSwitcherModal } from './components/DemoSwitcherModal';
import { NotificationModal } from './components/NotificationModal';
import { GeminiChatModal } from './components/GeminiChatModal';
import { GeminiLiveVoiceModal } from './components/GeminiLiveVoiceModal';
import { initAutoRefreshOnDeploy } from './utils/autoRefresh';
import {
  Zap,
  ShieldCheck,
  Truck,
  RotateCcw,
  Sparkles,
  Store,
  ArrowRight,
  Filter,
  Mic,
  FileCheck2,
  Building2,
  Lock,
} from 'lucide-react';

export type AppView =
  | 'storefront'
  | 'product_detail'
  | 'seller'
  | 'seller_register'
  | 'admin'
  | 'admin_applications'
  | 'admin_kyc'
  | 'admin_qc'
  | 'superadmin'
  | 'orders'
  | 'wishlist'
  | 'sell';

function pathToView(pathname: string): AppView {
  const clean = pathname.toLowerCase().replace(/\/$/, '');
  if (clean.startsWith('/product/') || clean.startsWith('/p/')) return 'product_detail';
  if (clean.startsWith('/seller/register')) return 'seller_register';
  if (clean.startsWith('/seller')) return 'seller';
  if (clean.startsWith('/superadmin')) return 'superadmin';
  if (clean.startsWith('/admin/seller-applications')) return 'admin_applications';
  if (clean.startsWith('/admin/kyc-approvals')) return 'admin_kyc';
  if (clean.startsWith('/admin/products/pending') || clean.startsWith('/admin/qc')) return 'admin_qc';
  if (clean.startsWith('/admin')) return 'admin';
  if (clean.startsWith('/orders')) return 'orders';
  if (clean.startsWith('/wishlist')) return 'wishlist';
  if (clean === '/sell') return 'sell';
  return 'storefront';
}

function viewToPath(view: AppView, selectedProduct?: Product | null): string {
  switch (view) {
    case 'product_detail':
      return selectedProduct ? `/product/${selectedProduct.slug || selectedProduct.id}` : '/';
    case 'seller':
      return '/seller/dashboard';
    case 'seller_register':
      return '/seller/register';
    case 'admin':
      return '/admin';
    case 'admin_applications':
      return '/admin/seller-applications';
    case 'admin_kyc':
      return '/admin/kyc-approvals';
    case 'admin_qc':
      return '/admin/products/pending';
    case 'superadmin':
      return '/superadmin';
    case 'orders':
      return '/orders';
    case 'wishlist':
      return '/wishlist';
    case 'sell':
      return '/sell';
    case 'storefront':
    default:
      return '/';
  }
}

function MarketplaceApp() {
  const { currentUser, isSeller } = useAuth();
  const { addToCart, setIsCartOpen } = useCart();

  // Navigation view: 'storefront' | 'seller' | 'admin' | 'superadmin' | 'orders' | 'wishlist' | 'sell'
  const [currentView, setCurrentView] = useState<AppView>(() => pathToView(window.location.pathname));

  // Products & Sellers (initialized with seed data for instant, zero-delay rendering)
  const [products, setProducts] = useState<Product[]>(SEED_PRODUCTS);
  const [sellers, setSellers] = useState<Seller[]>(SEED_SELLERS);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
  const [expressOnly, setExpressOnly] = useState(false);
  const [loading, setLoading] = useState(false);

  // Modals
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authDefaultRole, setAuthDefaultRole] = useState<'buyer' | 'seller'>('buyer');
  const [isDemoSwitcherOpen, setIsDemoSwitcherOpen] = useState(false);
  const [isApplyToSellOpen, setIsApplyToSellOpen] = useState(false);
  const [trackingOrderId, setTrackingOrderId] = useState<string | undefined>(undefined);
  const [isGeminiChatOpen, setIsGeminiChatOpen] = useState(false);
  const [isGeminiVoiceOpen, setIsGeminiVoiceOpen] = useState(false);

  // Navigation handler with browser URL sync
  const handleNavigate = useCallback((view: AppView, prod?: Product | null) => {
    setCurrentView(view);
    if (prod) setSelectedProduct(prod);
    const newPath = viewToPath(view, prod || selectedProduct);
    if (window.location.pathname !== newPath) {
      window.history.pushState({ view }, '', newPath);
    }
    if (view === 'sell') {
      setIsApplyToSellOpen(true);
    } else {
      setIsApplyToSellOpen(false);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [selectedProduct]);

  const handleOpenProductDetail = useCallback((prod: Product) => {
    setSelectedProduct(prod);
    setCurrentView('product_detail');
    const newPath = `/product/${prod.slug || prod.id}`;
    if (window.location.pathname !== newPath) {
      window.history.pushState({ view: 'product_detail' }, '', newPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    // 1. Listen for browser Back/Forward navigation
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase().replace(/\/$/, '');
      const view = pathToView(window.location.pathname);
      setCurrentView(view);
      if (view === 'product_detail') {
        const slugOrId = path.replace(/^\/(product|p)\//, '');
        const found =
          products.find((p) => (p.slug || '').toLowerCase() === slugOrId || p.id.toLowerCase() === slugOrId) ||
          SEED_PRODUCTS.find((p) => (p.slug || '').toLowerCase() === slugOrId || p.id.toLowerCase() === slugOrId);
        if (found) setSelectedProduct(found);
      }
      if (view === 'sell') {
        setIsApplyToSellOpen(true);
      } else {
        setIsApplyToSellOpen(false);
      }
    };
    window.addEventListener('popstate', handlePopState);

    // 2. Automatic reload when new build or code update is deployed to Firebase Hosting
    const cleanupAutoRefresh = initAutoRefreshOnDeploy(30000);

    // 3. Real-time automatic data synchronization from Cloud Firestore
    let unsubProducts: (() => void) | null = null;
    let unsubSellers: (() => void) | null = null;

    const setupLiveMarketplace = async () => {
      try {
        dbService.initDatabase();

        // Initial fetch
        const [prods, sllrs] = await Promise.all([
          dbService.getProducts(),
          dbService.getSellers(),
        ]);
        if (prods && prods.length > 0) setProducts(prods);
        if (sllrs && sllrs.length > 0) setSellers(sllrs);

        // Check if initial URL is a Product Detail Page
        const initialPath = window.location.pathname.toLowerCase().replace(/\/$/, '');
        if (initialPath.startsWith('/product/') || initialPath.startsWith('/p/')) {
          const slugOrId = initialPath.replace(/^\/(product|p)\//, '');
          const all = prods && prods.length > 0 ? prods : SEED_PRODUCTS;
          const matched = all.find(
            (p) => (p.slug || '').toLowerCase() === slugOrId || p.id.toLowerCase() === slugOrId
          );
          if (matched) {
            setSelectedProduct(matched);
            setCurrentView('product_detail');
          }
        }

        // Real-time live listener for products
        unsubProducts = dbService.subscribeToProducts((liveProds) => {
          if (liveProds && liveProds.length > 0) {
            setProducts(liveProds);
          }
        });

        // Real-time live listener for sellers
        unsubSellers = dbService.subscribeToSellers((liveSellers) => {
          if (liveSellers && liveSellers.length > 0) {
            setSellers(liveSellers);
          }
        });
      } catch (err) {
        console.warn('Marketplace initial data sync note:', err);
      } finally {
        setLoading(false);
      }
    };

    setupLiveMarketplace();

    // Check URL parameters for Pesapal payment callback redirect
    const params = new URLSearchParams(window.location.search);
    const orderTrackingId = params.get('OrderTrackingId') || params.get('orderTrackingId');
    const orderRef = params.get('OrderMerchantReference') || params.get('orderMerchantReference');
    const path = window.location.pathname.toLowerCase().replace(/\/$/, '');

    if (orderTrackingId || path.startsWith('/orders')) {
      handleNavigate('orders');
      if (orderRef) {
        setTrackingOrderId(orderRef);
      } else if (orderTrackingId) {
        setTrackingOrderId(orderTrackingId);
      }
      if (orderTrackingId) {
        dbService.updateOrderPaymentStatus(orderRef || orderTrackingId, 'paid');
      }
    } else if (path === '/sell') {
      setIsApplyToSellOpen(true);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
      cleanupAutoRefresh();
      if (unsubProducts) unsubProducts();
      if (unsubSellers) unsubSellers();
    };
  }, [handleNavigate, products]);

  // Filter products by Category, Seller, Search Query, Express status, and Moderation Status
  const filteredProducts = products.filter((p) => {
    // Only approved products are shown on public buyer catalog (seed items default to APPROVED)
    if (p.status && p.status !== 'APPROVED') return false;
    if (selectedCategory && p.category !== selectedCategory) return false;
    if (selectedSellerId && p.sellerId !== selectedSellerId) return false;
    if (expressOnly && !p.isExpressDelivery) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (p.title || p.name || '').toLowerCase().includes(q);
      const matchDesc = (p.description || '').toLowerCase().includes(q);
      const matchCategory = (p.category || '').toLowerCase().includes(q);
      const matchSeller = (p.sellerStoreName || '').toLowerCase().includes(q);
      return matchTitle || matchDesc || matchCategory || matchSeller;
    }
    return true;
  });

  const handleOrderSuccess = (masterOrderId: string) => {
    setTrackingOrderId(masterOrderId);
    handleNavigate('orders');
  };

  const handleOpenSellerInquiry = () => {
    if (isSeller) {
      handleNavigate('seller');
    } else {
      setIsApplyToSellOpen(true);
    }
  };

  const getQueryToken = () => {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams(window.location.search);
    return params.get('token') || '';
  };

  const isPortalView =
    currentView === 'product_detail' ||
    currentView === 'seller' ||
    currentView === 'seller_register' ||
    currentView === 'admin' ||
    currentView === 'admin_applications' ||
    currentView === 'admin_kyc' ||
    currentView === 'admin_qc' ||
    currentView === 'superadmin' ||
    currentView === 'sell';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col selection:bg-orange-500 selection:text-white transition-colors duration-200 w-full max-w-full overflow-x-hidden relative">
      {/* Consumer Header: Completely Omitted on Seller, Admin, and Super Admin Portals */}
      {!isPortalView && (
        <Header
          currentCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenAuth={() => {
            setAuthDefaultRole('buyer');
            setIsAuthOpen(true);
          }}
          onOpenDemoSwitcher={() => setIsDemoSwitcherOpen(true)}
          onOpenApplyToSell={() => setIsApplyToSellOpen(true)}
          currentView={currentView}
          onNavigate={handleNavigate}
          onOpenGeminiChat={() => setIsGeminiChatOpen(true)}
          onOpenLiveVoice={() => setIsGeminiVoiceOpen(true)}
        />
      )}

      {/* Main Content Area */}
      <main className={`flex-1 w-full max-w-full overflow-x-hidden ${isPortalView ? '' : 'pb-20 md:pb-8'}`}>
        {currentView === 'storefront' && (
          <div className="max-w-7xl mx-auto px-2.5 sm:px-4 py-4 sm:py-6 w-full max-w-full">
            {/* Top Carousel Banner */}
            <BannerCarousel
              onSelectCategory={(cat) => {
                setSelectedCategory(cat);
                window.scrollTo({ top: 380, behavior: 'smooth' });
              }}
              onOpenSellerOnboarding={handleOpenSellerInquiry}
            />

            {/* Ugandan Value Props Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-5 sm:mb-6">
              <div className="bg-white dark:bg-slate-900 p-2.5 sm:p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-2.5 sm:gap-3 transition-colors min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 sm:w-5 sm:h-5 fill-orange-600 dark:fill-orange-400" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-[11px] sm:text-xs font-bold text-slate-900 dark:text-white truncate">Swift Express</h4>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">Fast Doorstep Delivery</p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-2.5 sm:p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-2.5 sm:gap-3 transition-colors min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-[11px] sm:text-xs font-bold text-slate-900 dark:text-white truncate">Verified Sellers</h4>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">KYC & URSB audited</p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-2.5 sm:p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-2.5 sm:gap-3 transition-colors min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-[11px] sm:text-xs font-bold text-slate-900 dark:text-white truncate">Instant MoMo Escrow</h4>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">MTN & Airtel Protection</p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-2.5 sm:p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-2.5 sm:gap-3 transition-colors min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-[11px] sm:text-xs font-bold text-slate-900 dark:text-white truncate">Easy Returns</h4>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">7 days protection</p>
                </div>
              </div>
            </div>

            {/* Categories Pills */}
            <CategoryBar
              selectedCategory={selectedCategory}
              onSelectCategory={(cat) => {
                setSelectedCategory(cat);
                setSelectedSellerId(null);
              }}
            />

            {/* Filter Bar & Options */}
            <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs mb-5 space-y-3 transition-colors w-full max-w-full overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 shrink-0">
                    <Filter className="w-3.5 h-3.5" /> Options:
                  </span>

                  <button
                    onClick={() => setExpressOnly(!expressOnly)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors shrink-0 flex items-center gap-1 ${
                      expressOnly
                        ? 'bg-amber-400 text-slate-900'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Zap className="w-3 h-3 fill-slate-900" /> Swift Express Only
                  </button>

                  {selectedSellerId && (
                    <span className="px-3 py-1 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 shrink-0">
                      <Store className="w-3 h-3" />
                      Store: {sellers.find((s) => s.id === selectedSellerId)?.storeName}
                      <button
                        onClick={() => setSelectedSellerId(null)}
                        className="ml-1 text-slate-950 dark:text-slate-100 hover:text-red-700 font-bold"
                      >
                        ✕
                      </button>
                    </span>
                  )}

                  {selectedCategory && (
                    <span className="px-3 py-1 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 shrink-0">
                      {selectedCategory}
                      <button
                        onClick={() => setSelectedCategory(null)}
                        className="ml-1 text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white font-bold"
                      >
                        ✕
                      </button>
                    </span>
                  )}
                </div>

                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                  Showing <strong>{filteredProducts.length}</strong> products
                </div>
              </div>
            </div>

            {/* Featured Sellers Ribbon */}
            {!selectedSellerId && !selectedCategory && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Store className="w-4 h-4 text-orange-600" />
                    Top Verified Stores
                  </h3>
                  <span className="text-xs text-orange-600 dark:text-orange-400 font-semibold cursor-pointer">
                    View all sellers
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {sellers
                    .filter((s) => s.status === 'approved')
                    .slice(0, 4)
                    .map((seller) => (
                      <button
                        key={seller.id}
                        onClick={() => setSelectedSellerId(seller.id)}
                        className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-orange-500 dark:hover:border-orange-500 hover:shadow-md transition-all text-left group"
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src={seller.logoUrl}
                            alt=""
                            className="w-9 h-9 rounded-xl object-cover border border-slate-100 dark:border-slate-800 group-hover:scale-105 transition-transform"
                          />
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {seller.storeName}
                            </h4>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                              {seller.district}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Products Grid */}
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl h-72 animate-pulse p-4 border border-slate-200 dark:border-slate-800"></div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center max-w-md mx-auto my-8">
                <Store className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No products found</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
                  Try clearing your filters or searching for another term.
                </p>
                <button
                  onClick={() => {
                    setSelectedCategory(null);
                    setSelectedSellerId(null);
                    setSearchQuery('');
                    setExpressOnly(false);
                  }}
                  className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onOpenDetail={handleOpenProductDetail}
                    onFilterSeller={(sId) => setSelectedSellerId(sId)}
                  />
                ))}
              </div>
            )}

            {/* Apply to Sell Gateway Ribbon (Inquiry Only - No public self-registration) */}
            <div className="mt-10 sm:mt-12 rounded-2xl sm:rounded-3xl bg-linear-to-r from-slate-900 via-slate-800 to-orange-950 p-5 sm:p-10 text-white shadow-xl relative overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center relative z-10">
                <div className="space-y-3 max-w-xl">
                  <span className="text-[11px] font-black uppercase tracking-wider text-orange-400 bg-orange-950/60 px-2.5 py-0.5 rounded-full border border-orange-700/50 inline-block">
                    Verified Merchant Program
                  </span>
                  <h3 className="text-xl sm:text-3xl font-black leading-snug">
                    Grow Your Business Across Uganda on SwiftCart
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Join vetted merchant partners across Kampala, Entebbe, Jinja, Mbarara & Gulu. Enjoy automated MoMo escrow payouts, multi-vendor cart fulfillment, and Swift Express logistics.
                  </p>
                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <button
                      onClick={handleOpenSellerInquiry}
                      className="px-5 sm:px-6 py-2.5 sm:py-3 bg-orange-600 hover:bg-orange-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                    >
                      <FileCheck2 className="w-4 h-4" />
                      <span>Apply to Sell (Vetted Gateway)</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <span className="text-[11px] text-slate-400">KYC & URSB validation required</span>
                  </div>
                </div>

                <div className="flex justify-center md:justify-end">
                  <div className="relative w-full max-w-[240px] sm:max-w-xs h-36 sm:h-48 md:h-56 rounded-2xl overflow-hidden shadow-xl border-2 border-white/10 bg-slate-800/80">
                    <img
                      src="https://images.unsplash.com/photo-1556742049-0a67c5574f73?auto=format&fit=crop&w=600&q=80"
                      alt="Verified Ugandan Merchant Storefront"
                      className="w-full h-full object-cover opacity-85"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-slate-950/90 via-slate-950/30 to-transparent flex flex-col justify-end p-3">
                      <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                        <Store className="w-3.5 h-3.5" /> 100% Vetted Merchant Network
                      </span>
                      <span className="text-[10px] text-slate-300">Protected Escrow & Instant Settlements</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile-First Product Detail Page (/product/:slug) */}
        {currentView === 'product_detail' && selectedProduct && (
          <ProductDetailPage
            product={selectedProduct}
            onBack={() => handleNavigate('storefront')}
            onOpenCart={() => setIsCartOpen(true)}
            onBuyNow={(prod, variant, qty) => {
              addToCart(prod, variant, qty || 1, false);
              setIsCartOpen(false);
              setIsCheckoutOpen(true);
            }}
            onViewSeller={(sellerId) => {
              setSelectedSellerId(sellerId);
              handleNavigate('storefront');
            }}
            onOpenSearch={() => {
              handleNavigate('storefront');
            }}
            allProducts={products}
            onSelectProduct={handleOpenProductDetail}
          />
        )}

        {/* Wishlist View */}
        {currentView === 'wishlist' && (
          <WishlistView
            onBackToShopping={() => handleNavigate('storefront')}
            onOpenProduct={handleOpenProductDetail}
          />
        )}

        {/* Public Seller Inquiry Gateway (/sell) */}
        {currentView === 'sell' && (
          <SellerInquiryPage
            onBackToShopping={() => handleNavigate('storefront')}
            onNavigateToLogin={() => {
              setAuthDefaultRole('seller');
              setIsAuthOpen(true);
            }}
          />
        )}

        {/* Gated Seller Registration & KYC Page (/seller/register?token=...) */}
        {currentView === 'seller_register' && (
          <SellerRegisterGatedPage
            token={getQueryToken()}
            onSuccessNavigate={() => handleNavigate('seller')}
            onBackToShopping={() => handleNavigate('storefront')}
          />
        )}

        {/* Guarded Seller Portal (/seller/*) */}
        {currentView === 'seller' && (
          <RouteGuard
            allowedRoles={['SELLER', 'SUPER_ADMIN']}
            portalName="Seller Merchant Portal"
            portalPath="/seller/dashboard"
            onOpenAuth={() => {
              setAuthDefaultRole('seller');
              setIsAuthOpen(true);
            }}
            onOpenDemoSwitcher={() => setIsDemoSwitcherOpen(true)}
            onBackToHome={() => handleNavigate('storefront')}
          >
            <SellerDashboard onBackToShopping={() => handleNavigate('storefront')} />
          </RouteGuard>
        )}

        {/* Guarded Operations Admin Portal (/admin, /admin/seller-applications, /admin/kyc-approvals, /admin/products/pending) */}
        {(currentView === 'admin' ||
          currentView === 'admin_applications' ||
          currentView === 'admin_kyc' ||
          currentView === 'admin_qc') && (
          <RouteGuard
            allowedRoles={['ADMIN', 'SUPER_ADMIN']}
            portalName="Operations Admin Portal"
            portalPath="/admin"
            onOpenAuth={() => {
              setAuthDefaultRole('buyer');
              setIsAuthOpen(true);
            }}
            onOpenDemoSwitcher={() => setIsDemoSwitcherOpen(true)}
            onBackToHome={() => handleNavigate('storefront')}
          >
            <AdminPanel
              initialTab={
                currentView === 'admin_applications'
                  ? 'leads'
                  : currentView === 'admin_kyc'
                  ? 'kyc'
                  : currentView === 'admin_qc'
                  ? 'qc'
                  : 'triage'
              }
              onBackToShopping={() => handleNavigate('storefront')}
            />
          </RouteGuard>
        )}

        {/* Guarded Super Admin Executive Portal (/superadmin/*) */}
        {currentView === 'superadmin' && (
          <RouteGuard
            allowedRoles={['SUPER_ADMIN']}
            portalName="Super Admin Executive Governance Portal"
            portalPath="/superadmin"
            onOpenAuth={() => {
              setAuthDefaultRole('buyer');
              setIsAuthOpen(true);
            }}
            onOpenDemoSwitcher={() => setIsDemoSwitcherOpen(true)}
            onBackToHome={() => handleNavigate('storefront')}
          >
            <SuperAdminPanel
              onBackToShopping={() => handleNavigate('storefront')}
              onNavigateToOpsAdmin={() => handleNavigate('admin')}
            />
          </RouteGuard>
        )}

        {/* Orders View */}
        {currentView === 'orders' && (
          <OrderTrackingView
            onBackToShopping={() => handleNavigate('storefront')}
            selectedOrderId={trackingOrderId}
            onOpenAuth={() => {
              setAuthDefaultRole('buyer');
              setIsAuthOpen(true);
            }}
          />
        )}
      </main>

      {/* Consumer Footer & Navigation Controls: Completely Omitted on Seller, Admin, and Super Admin Portals */}
      {!isPortalView && (
        <>
          {/* Footer */}
          <footer className="bg-slate-900 text-slate-400 text-xs border-t border-slate-800 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-1.5 text-white font-extrabold text-lg mb-2">
              <Zap className="w-5 h-5 text-orange-500 fill-orange-500" />
              <span>SwiftCart.ug</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Uganda's trusted multi-vendor marketplace connecting verified local sellers with buyers nationwide.
            </p>
          </div>

          <div>
            <h4 className="text-white font-bold mb-3 uppercase text-[11px] tracking-wider">
              Payment Methods
            </h4>
            <ul className="space-y-1.5 text-slate-400">
              <li>• MTN Mobile Money (MoMo)</li>
              <li>• Airtel Money</li>
              <li>• Instant MoMo Escrow (MTN & Airtel)</li>
              <li>• Instant USSD Push API</li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-3 uppercase text-[11px] tracking-wider">
              Popular Categories
            </h4>
            <ul className="space-y-1.5 text-slate-400">
              <li>• Smartphones & Tablets</li>
              <li>• Campus Laptops & IT Accessories</li>
              <li>• Farm Fresh Produce & Harvest</li>
              <li>• African Kitenge Fashion</li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-3 uppercase text-[11px] tracking-wider">
              Seller Center & Inquiries
            </h4>
            <p className="text-xs mb-3 text-slate-400">
              Are you a shop owner or merchant in Uganda? Apply to sell and get verified on SwiftCart.
            </p>
            <button
              onClick={handleOpenSellerInquiry}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Apply to Sell</span>
            </button>
          </div>
        </div>

        <div className="border-t border-slate-800 py-4 text-center text-[11px] text-slate-500">
          © 2026 SwiftCart Uganda. All rights reserved. Role-Based Access Control (RBAC) Enforced.
        </div>
      </footer>

      {/* Floating Gemini AI Assistant Widget */}
      <div className="fixed bottom-16 md:bottom-6 right-2.5 sm:right-6 z-30 flex items-center gap-1.5 sm:gap-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-1 sm:p-1.5 shadow-2xl border border-slate-800 flex items-center gap-1 sm:gap-1.5">
          <button
            onClick={() => setIsGeminiChatOpen(true)}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md transition-all group cursor-pointer"
            title="Chat with SwiftCart Gemini AI"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span className="font-extrabold tracking-wide">Gemini AI</span>
            <span className="hidden sm:inline text-[10px] bg-orange-700 px-1.5 py-0.2 rounded-md font-semibold text-orange-200">
              Search Grounded
            </span>
          </button>

          <button
            onClick={() => setIsGeminiVoiceOpen(true)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-white transition-colors cursor-pointer"
            title="Start Live Voice (gemini-3.8-live)"
          >
            <Mic className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Gemini AI Modals */}
      <GeminiChatModal
        isOpen={isGeminiChatOpen}
        onClose={() => setIsGeminiChatOpen(false)}
        onOpenLiveVoice={() => setIsGeminiVoiceOpen(true)}
      />

      <GeminiLiveVoiceModal
        isOpen={isGeminiVoiceOpen}
        onClose={() => setIsGeminiVoiceOpen(false)}
        onOpenTextChat={() => setIsGeminiChatOpen(true)}
      />

      {/* Mobile Bottom Navigation */}
      <BottomNav
        currentView={currentView}
        onNavigate={handleNavigate}
        onOpenSellerRegistration={handleOpenSellerInquiry}
      />
    </>
  )}

      {/* Modals */}
      {currentView !== 'product_detail' && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onViewSeller={(sId) => {
            setSelectedProduct(null);
            setSelectedSellerId(sId);
            handleNavigate('storefront');
          }}
        />
      )}

      <CartDrawer
        onOpenCheckout={() => setIsCheckoutOpen(true)}
        onExploreProducts={() => handleNavigate('storefront')}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onOrderSuccess={handleOrderSuccess}
        onOpenAuth={() => {
          setAuthDefaultRole('buyer');
          setIsAuthOpen(true);
        }}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        defaultRole={authDefaultRole}
        onOpenApplyToSell={() => setIsApplyToSellOpen(true)}
        onAuthSuccess={(role) => {
          const upper = (role || '').toUpperCase();
          if (upper === 'SUPER_ADMIN') {
            handleNavigate('superadmin');
          } else if (upper === 'ADMIN') {
            handleNavigate('admin');
          } else if (upper === 'SELLER') {
            handleNavigate('seller');
          } else {
            handleNavigate('storefront');
          }
        }}
      />

      <DemoSwitcherModal
        isOpen={isDemoSwitcherOpen}
        onClose={() => setIsDemoSwitcherOpen(false)}
        onSelectRole={(role) => {
          const upper = (role || '').toUpperCase();
          if (upper === 'SUPER_ADMIN') {
            handleNavigate('superadmin');
          } else if (upper === 'ADMIN') {
            handleNavigate('admin');
          } else if (upper === 'SELLER') {
            handleNavigate('seller');
          } else {
            handleNavigate('storefront');
          }
        }}
      />

      <ApplyToSellModal
        isOpen={isApplyToSellOpen && currentView !== 'seller_register' && !isPortalView}
        onClose={() => {
          setIsApplyToSellOpen(false);
          if (currentView === 'sell') {
            handleNavigate('storefront');
          }
        }}
      />

      <NotificationModal
        onNavigateToOrder={(orderId) => {
          setTrackingOrderId(orderId);
          handleNavigate('orders');
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <NotificationProvider>
              <MarketplaceApp />
            </NotificationProvider>
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
