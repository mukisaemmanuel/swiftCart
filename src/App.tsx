import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeProvider } from './context/ThemeContext';
import { dbService } from './services/db';
import { Product, ProductCategory, Seller } from './types';
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
import { AuthModal } from './components/AuthModal';
import { DemoSwitcherModal } from './components/DemoSwitcherModal';
import { NotificationModal } from './components/NotificationModal';
import { GeminiChatModal } from './components/GeminiChatModal';
import { GeminiLiveVoiceModal } from './components/GeminiLiveVoiceModal';
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
} from 'lucide-react';

function MarketplaceApp() {
  const { currentUser } = useAuth();
  const { setIsCartOpen } = useCart();

  // Navigation view: 'storefront' | 'seller' | 'admin' | 'orders' | 'wishlist'
  const [currentView, setCurrentView] = useState<'storefront' | 'seller' | 'admin' | 'orders' | 'wishlist'>('storefront');

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
  const [trackingOrderId, setTrackingOrderId] = useState<string | undefined>(undefined);
  const [isGeminiChatOpen, setIsGeminiChatOpen] = useState(false);
  const [isGeminiVoiceOpen, setIsGeminiVoiceOpen] = useState(false);

  const loadMarketplaceData = async () => {
    try {
      await dbService.initDatabase();
      const [prods, sllrs] = await Promise.all([
        dbService.getProducts(),
        dbService.getSellers(),
      ]);
      if (prods && prods.length > 0) setProducts(prods);
      if (sllrs && sllrs.length > 0) setSellers(sllrs);
    } catch (err) {
      console.warn('Marketplace initial data sync note:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMarketplaceData();

    // Check URL parameters for Pesapal payment callback redirect
    const params = new URLSearchParams(window.location.search);
    const orderTrackingId = params.get('OrderTrackingId') || params.get('orderTrackingId');
    const orderRef = params.get('OrderMerchantReference') || params.get('orderMerchantReference');
    const path = window.location.pathname;

    if (orderTrackingId || path === '/orders') {
      setCurrentView('orders');
      if (orderRef) {
        setTrackingOrderId(orderRef);
      } else if (orderTrackingId) {
        setTrackingOrderId(orderTrackingId);
      }
      if (orderTrackingId) {
        dbService.updateOrderPaymentStatus(orderRef || orderTrackingId, 'paid');
      }
    }
  }, []);

  // Filter products by Category, Seller, Search Query, and Express status
  const filteredProducts = products.filter((p) => {
    if (selectedCategory && p.category !== selectedCategory) return false;
    if (selectedSellerId && p.sellerId !== selectedSellerId) return false;
    if (expressOnly && !p.isExpressDelivery) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchDesc = p.description.toLowerCase().includes(q);
      const matchCategory = p.category.toLowerCase().includes(q);
      const matchSeller = p.sellerStoreName.toLowerCase().includes(q);
      return matchTitle || matchDesc || matchCategory || matchSeller;
    }
    return true;
  });

  const handleOrderSuccess = (masterOrderId: string) => {
    setTrackingOrderId(masterOrderId);
    setCurrentView('orders');
  };

  const handleOpenSellerOnboarding = () => {
    if (currentUser?.role === 'seller') {
      setCurrentView('seller');
    } else {
      setAuthDefaultRole('seller');
      setIsAuthOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col selection:bg-orange-500 selection:text-white transition-colors duration-200">
      {/* Header */}
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
        currentView={currentView}
        onNavigate={setCurrentView}
        onOpenGeminiChat={() => setIsGeminiChatOpen(true)}
        onOpenLiveVoice={() => setIsGeminiVoiceOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16 md:pb-8">
        {currentView === 'storefront' && (
          <div className="max-w-7xl mx-auto px-4 py-6">
            {/* Top Carousel Banner */}
            <BannerCarousel
              onSelectCategory={(cat) => {
                setSelectedCategory(cat);
                window.scrollTo({ top: 380, behavior: 'smooth' });
              }}
              onOpenSellerOnboarding={handleOpenSellerOnboarding}
            />

            {/* Ugandan Value Props Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5 fill-orange-600 dark:fill-orange-400" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Swift Express</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Fast Doorstep Delivery</p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Verified Sellers</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">KYC & URSB audited</p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Instant MoMo Escrow</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Instant MoMo Escrow (MTN & Airtel)</p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Easy Returns</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">7 days protection</p>
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
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs mb-5 space-y-3 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
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
                  className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
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
                    onOpenDetail={setSelectedProduct}
                    onFilterSeller={(sId) => setSelectedSellerId(sId)}
                  />
                ))}
              </div>
            )}

            {/* Sell on SwiftCart Banner */}
            <div className="mt-12 rounded-3xl bg-linear-to-r from-slate-900 via-slate-800 to-orange-950 p-6 sm:p-10 text-white shadow-xl relative overflow-hidden">
              <div className="max-w-xl space-y-3 relative z-10">
                <span className="text-[11px] font-black uppercase tracking-wider text-orange-400 bg-orange-950/60 px-2.5 py-0.5 rounded-full border border-orange-700/50">
                  Merchant Network
                </span>
                <h3 className="text-xl sm:text-3xl font-black">
                  Grow Your Business Across Uganda on SwiftCart
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Join hundreds of verified sellers across Uganda. Enjoy automated MoMo payouts, split checkout fulfillment, and Swift Express logistics.
                </p>
                <div className="pt-2">
                  <button
                    onClick={handleOpenSellerOnboarding}
                    className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-2"
                  >
                    <span>Register Your Store Today</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentView === 'wishlist' && (
          <WishlistView
            onBackToShopping={() => setCurrentView('storefront')}
            onOpenProduct={setSelectedProduct}
          />
        )}

        {currentView === 'seller' && (
          <SellerDashboard onBackToShopping={() => setCurrentView('storefront')} />
        )}

        {currentView === 'admin' && (
          <AdminPanel onBackToShopping={() => setCurrentView('storefront')} />
        )}

        {currentView === 'orders' && (
          <OrderTrackingView
            onBackToShopping={() => setCurrentView('storefront')}
            selectedOrderId={trackingOrderId}
            onOpenAuth={() => {
              setAuthDefaultRole('buyer');
              setIsAuthOpen(true);
            }}
          />
        )}
      </main>

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
              Seller Center
            </h4>
            <p className="text-xs mb-3 text-slate-400">
              Are you a shop owner or merchant in Uganda? Start listing your products in minutes.
            </p>
            <button
              onClick={handleOpenSellerOnboarding}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs transition-colors"
            >
              Open Seller Account
            </button>
          </div>
        </div>

        <div className="border-t border-slate-800 py-4 text-center text-[11px] text-slate-500">
          © 2026 SwiftCart Uganda. All rights reserved. Built for Uganda & Nationwide.
        </div>
      </footer>

      {/* Floating Gemini AI Assistant Widget */}
      <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-40 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="bg-slate-900 text-white rounded-2xl p-1.5 shadow-2xl border border-slate-800 flex items-center gap-1.5">
          <button
            onClick={() => setIsGeminiChatOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md transition-all group"
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
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-white transition-colors"
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
        onNavigate={setCurrentView}
        onOpenSellerRegistration={handleOpenSellerOnboarding}
      />

      {/* Modals */}
      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onViewSeller={(sId) => {
          setSelectedProduct(null);
          setSelectedSellerId(sId);
          setCurrentView('storefront');
        }}
      />

      <CartDrawer
        onOpenCheckout={() => setIsCheckoutOpen(true)}
        onExploreProducts={() => setCurrentView('storefront')}
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
        onAuthSuccess={(role) => {
          if (role === 'seller') {
            setCurrentView('seller');
          } else if (role === 'admin') {
            setCurrentView('admin');
          } else {
            setCurrentView('storefront');
          }
        }}
      />

      <DemoSwitcherModal
        isOpen={isDemoSwitcherOpen}
        onClose={() => setIsDemoSwitcherOpen(false)}
        onSelectRole={(role) => {
          if (role === 'seller') {
            setCurrentView('seller');
          } else if (role === 'admin') {
            setCurrentView('admin');
          } else {
            setCurrentView('storefront');
          }
        }}
      />

      <NotificationModal
        onNavigateToOrder={(orderId) => {
          setTrackingOrderId(orderId);
          setCurrentView('orders');
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
