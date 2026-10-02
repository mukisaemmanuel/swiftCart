import React, { useState, useEffect, useMemo, useRef } from 'react';
import { dbService } from '../services/db';
import { useAuth } from '../context/AuthContext';
import {
  Product,
  ProductCategory,
  Seller,
  Order,
  OrderStatus,
  RiderHandoverDetails,
} from '../types';
import { formatUGX, formatDate } from '../utils/formatters';
import { compressImage } from '../utils/imageCompressor';
import { DashboardLayout, NavItem, BreadcrumbItem } from './dashboard/DashboardLayout';
import { SellerAnalyticsCharts } from './SellerAnalyticsCharts';
import {
  Store,
  Package,
  Clock,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  Upload,
  User,
  ShieldCheck,
  ChevronRight,
  Truck,
  ExternalLink,
  MessageCircle,
  HelpCircle,
  RefreshCw,
  Eye,
  AlertCircle,
  Shield,
  FileCheck2,
  Lock,
  Phone,
  Search,
  Sparkles,
  Camera,
  Image as ImageIcon,
  Loader2,
  X,
} from 'lucide-react';

interface SellerDashboardProps {
  onBackToShopping: () => void;
}

const CATEGORIES: ProductCategory[] = [
  'Phones & Tablets',
  'Electronics & Audio',
  'Supermarket & Groceries',
  'Fashion & Apparel',
  'Home & Appliances',
  'Health & Beauty',
  'Computing & IT',
  'Sports & Outdoors',
];

export const SellerDashboard: React.FC<SellerDashboardProps> = ({ onBackToShopping }) => {
  const { currentSeller, updateSellerProfile } = useAuth();

  const [activeNav, setActiveNav] = useState<'overview' | 'orders' | 'products' | 'wallet' | 'analytics' | 'kyc' | 'profile'>('overview');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Order Fulfillment Tab State
  const [orderStatusFilter, setOrderStatusFilter] = useState<'ALL' | 'PENDING' | 'READY' | 'SHIPPED' | 'DELIVERED'>('ALL');

  // Rider Handover Modal State
  const [selectedOrderForDispatch, setSelectedOrderForDispatch] = useState<Order | null>(null);
  const [isRiderModalOpen, setIsRiderModalOpen] = useState(false);
  const [riderForm, setRiderForm] = useState({
    riderName: '',
    riderNIN: '',
    riderPhone: '',
    plateNumber: '',
    stageOrCompany: 'Kampala SafeBoda / Swift Courier',
  });
  const [generatedOTP, setGeneratedOTP] = useState<string>('');
  const [otpInput, setOtpInput] = useState<string>('');
  const [otpError, setOtpError] = useState<string | null>(null);

  // Product Add / Edit Drawer State
  const [isProductDrawerOpen, setIsProductDrawerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCompressingImages, setIsCompressingImages] = useState(false);
  const [manualUrlInput, setManualUrlInput] = useState('');
  const [showManualUrl, setShowManualUrl] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [productForm, setProductForm] = useState({
    title: '',
    category: 'Phones & Tablets' as ProductCategory,
    priceUGX: 0,
    description: '',
    stockQuantity: 10,
    images: [] as string[],
    isExpressDelivery: false,
  });

  // Commission Live Calculation for Product Pricing (12% Take-Rate)
  const estimatedCommission = useMemo(() => Math.round((productForm.priceUGX || 0) * 0.12), [productForm.priceUGX]);
  const estimatedNetPayout = useMemo(() => Math.max(0, (productForm.priceUGX || 0) - estimatedCommission), [productForm.priceUGX, estimatedCommission]);

  const loadData = async () => {
    if (!currentSeller?.id) return;
    setLoading(true);
    try {
      const [allProds, allOrds] = await Promise.all([
        dbService.getProductsBySeller(currentSeller.id),
        dbService.getOrdersBySeller(currentSeller.id),
      ]);
      setProducts(allProds);
      setOrders(allOrds);
    } catch (e) {
      console.error('Seller loadData error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentSeller?.id]);

  const triggerSuccess = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 3500);
  };

  // Performance Summary Metrics
  const totalSalesUGX = useMemo(() => orders.reduce((sum, o) => sum + (o.paymentStatus === 'paid' ? o.totalUGX : 0), 0), [orders]);
  const pendingFulfillmentOrders = useMemo(() => orders.filter((o) => o.status === 'Pending' || o.status === 'Confirmed'), [orders]);
  const inTransitCount = useMemo(() => orders.filter((o) => o.status === 'Shipped').length, [orders]);
  const availableWalletBalanceUGX = useMemo(() => {
    const delivered = orders.filter((o) => o.status === 'Delivered');
    return delivered.reduce((sum, o) => sum + Math.round(o.totalUGX * 0.88), 0);
  }, [orders]);

  // Open Handover Dispatch Modal
  const handleOpenDispatchModal = (order: Order) => {
    setSelectedOrderForDispatch(order);
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOTP(code);
    setOtpInput('');
    setOtpError(null);
    setIsRiderModalOpen(true);
  };

  // Confirm Handover OTP & Update Order to SHIPPED (In Transit)
  const handleConfirmRiderHandover = async () => {
    if (!selectedOrderForDispatch) return;
    if (otpInput.trim() !== generatedOTP) {
      setOtpError('Invalid 4-digit code. Please verify the code displayed on screen with the rider.');
      return;
    }

    const handoverDetails: RiderHandoverDetails = {
      riderName: riderForm.riderName,
      riderNIN: riderForm.riderNIN,
      riderPhone: riderForm.riderPhone,
      plateNumber: riderForm.plateNumber,
      stageOrCompany: riderForm.stageOrCompany,
      handoverOTP: generatedOTP,
      isOTPVerified: true,
      dispatchedAt: new Date().toISOString(),
    };

    await dbService.updateOrderStatus(
      selectedOrderForDispatch.id,
      'Shipped',
      `Custody transferred to courier ${riderForm.riderName} (${riderForm.plateNumber}) with verified OTP.`
    );

    triggerSuccess(`Order ${selectedOrderForDispatch.id} successfully handed over to courier! Status is now In Transit.`);
    setIsRiderModalOpen(false);
    setSelectedOrderForDispatch(null);
    setRiderForm({
      riderName: '',
      riderNIN: '',
      riderPhone: '',
      plateNumber: '',
      stageOrCompany: 'Kampala SafeBoda / Swift Courier',
    });
    await loadData();
  };

  // Direct Image File Upload with Auto-Compression
  const handleImageFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsCompressingImages(true);

    try {
      const fileArray = Array.from(files);
      const compressedUrls: string[] = [];

      for (const file of fileArray) {
        if (file.type.startsWith('image/')) {
          const compressedDataUrl = await compressImage(file, {
            maxDimension: 1200,
            quality: 0.82,
            preferredMimeType: 'image/webp',
          });
          compressedUrls.push(compressedDataUrl);
        }
      }

      setProductForm((prev) => ({
        ...prev,
        images: [...prev.images, ...compressedUrls].slice(0, 5), // allow up to 5 photos
      }));
      triggerSuccess(`⚡ Auto-compressed ${compressedUrls.length} photo(s) for fast loading!`);
    } catch (err) {
      console.error('Image compression error:', err);
      alert('Failed to compress image file. Please try another photo.');
    } finally {
      setIsCompressingImages(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setProductForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, idx) => idx !== indexToRemove),
    }));
  };

  const handleAddManualUrl = () => {
    if (!manualUrlInput.trim()) return;
    setProductForm((prev) => ({
      ...prev,
      images: [...prev.images, manualUrlInput.trim()].slice(0, 5),
    }));
    setManualUrlInput('');
    setShowManualUrl(false);
  };

  // Save Product (Create or Edit)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSeller) return;

    const finalImages =
      productForm.images.length > 0
        ? productForm.images
        : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80'];

    if (editingProduct) {
      await dbService.updateProduct(editingProduct.id, {
        title: productForm.title,
        category: productForm.category,
        priceUGX: productForm.priceUGX,
        description: productForm.description,
        stockQuantity: productForm.stockQuantity,
        images: finalImages,
        isExpressDelivery: productForm.isExpressDelivery,
      });
      triggerSuccess(`Product "${productForm.title}" updated successfully.`);
    } else {
      await dbService.createProduct({
        sellerId: currentSeller.id,
        sellerStoreName: currentSeller.storeName,
        sellerDistrict: currentSeller.district,
        title: productForm.title,
        slug: productForm.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        category: productForm.category,
        priceUGX: productForm.priceUGX,
        description: productForm.description,
        stockQuantity: productForm.stockQuantity,
        images: finalImages,
        rating: 5.0,
        reviewCount: 0,
        isExpressDelivery: productForm.isExpressDelivery,
        isFeatured: false,
      });
      triggerSuccess(`New product "${productForm.title}" published to catalog.`);
    }

    setIsProductDrawerOpen(false);
    setEditingProduct(null);
    setProductForm({
      title: '',
      category: 'Phones & Tablets',
      priceUGX: 0,
      description: '',
      stockQuantity: 10,
      images: [],
      isExpressDelivery: false,
    });
    await loadData();
  };

  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setProductForm({
      title: prod.title,
      category: prod.category,
      priceUGX: prod.priceUGX,
      description: prod.description,
      stockQuantity: prod.stockQuantity,
      images: prod.images || [],
      isExpressDelivery: !!prod.isExpressDelivery,
    });
    setIsProductDrawerOpen(true);
  };

  const handleDeleteProduct = async (prodId: string) => {
    if (window.confirm('Are you sure you want to remove this product from your storefront?')) {
      await dbService.deleteProduct(prodId);
      triggerSuccess('Product removed from catalog.');
      await loadData();
    }
  };

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    if (orderStatusFilter === 'ALL') return orders;
    if (orderStatusFilter === 'PENDING') return orders.filter((o) => o.status === 'Pending' || o.status === 'Confirmed');
    if (orderStatusFilter === 'READY') return orders.filter((o) => o.status === 'Confirmed');
    if (orderStatusFilter === 'SHIPPED') return orders.filter((o) => o.status === 'Shipped');
    if (orderStatusFilter === 'DELIVERED') return orders.filter((o) => o.status === 'Delivered');
    return orders;
  }, [orders, orderStatusFilter]);

  // Navigation Items
  const navItems: NavItem[] = [
    { id: 'overview', label: 'Store Overview', icon: TrendingUp, group: 'Operations' },
    { id: 'orders', label: 'Fulfillment & Dispatch', icon: Package, badge: pendingFulfillmentOrders.length, badgeVariant: 'amber', group: 'Operations' },
    { id: 'products', label: 'Catalog & Inventory', icon: Store, badge: products.length, group: 'Products' },
    { id: 'wallet', label: 'Escrow Wallet & Payouts', icon: DollarSign, group: 'Financials' },
    { id: 'analytics', label: 'Sales & Wishlist Trends', icon: TrendingUp, group: 'Financials' },
    { id: 'kyc', label: 'Store Verification', icon: ShieldCheck, badge: currentSeller?.isVerified ? 'VERIFIED' : 'PENDING', badgeVariant: currentSeller?.isVerified ? 'emerald' : 'amber', group: 'Settings' },
  ];

  const breadcrumbs: BreadcrumbItem[] = [
    { label: currentSeller?.storeName || 'Merchant Studio' },
    { label: navItems.find((n) => n.id === activeNav)?.label || 'Overview' },
  ];

  if (!currentSeller) {
    return (
      <div className="max-w-md mx-auto p-8 text-center my-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <Store className="w-12 h-12 text-orange-600 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800 dark:text-white">Seller Account Required</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
          Please register as a seller or switch to a seller persona using the persona switcher.
        </p>
        <button
          onClick={onBackToShopping}
          className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
        >
          Return to Marketplace
        </button>
      </div>
    );
  }

  return (
    <DashboardLayout
      role="SELLER"
      title={
        activeNav === 'overview'
          ? `${currentSeller.storeName} — Operations Studio`
          : activeNav === 'orders'
          ? 'Order Fulfillment & Courier Dispatch'
          : activeNav === 'products'
          ? 'Product Catalog & Inventory Control'
          : activeNav === 'wallet'
          ? 'Escrow Settlement Wallet & Tuesday Payouts'
          : activeNav === 'analytics'
          ? 'Store Analytics & Wishlist Demand'
          : 'Merchant KYC Verification & URSB Compliance'
      }
      subtitle={`Verified merchant account: ${currentSeller.district || 'Uganda Central'} • Payout Line: ${currentSeller.momoNumber || currentSeller.phone}`}
      breadcrumbs={breadcrumbs}
      navItems={navItems}
      activeNavId={activeNav}
      onSelectNav={(id) => setActiveNav(id as any)}
      onViewLiveStore={onBackToShopping}
      actions={
        <div className="flex items-center gap-2">
          {activeNav === 'products' && (
            <button
              onClick={() => {
                setEditingProduct(null);
                setProductForm({
                  title: '',
                  category: 'Phones & Tablets',
                  priceUGX: 0,
                  description: '',
                  stockQuantity: 10,
                  images: [],
                  isExpressDelivery: false,
                });
                setIsProductDrawerOpen(true);
              }}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Product</span>
            </button>
          )}
          <button
            onClick={loadData}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            title="Refresh Merchant Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      }
    >
      {/* Action Toast Alert */}
      {actionSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 shadow-xs animate-in fade-in slide-in-from-top-1">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. STORE OVERVIEW & 4 PERFORMANCE METRIC CARDS */}
      {/* ========================================================= */}
      {activeNav === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Sales */}
            <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Total Sales</span>
                <span className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center font-bold">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">{formatUGX(totalSalesUGX)}</div>
              <div className="text-[11px] text-emerald-600 font-bold">{orders.length} Total Orders Received</div>
            </div>

            {/* Pending Fulfillment */}
            <div
              onClick={() => setActiveNav('orders')}
              className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2 hover:border-orange-500/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Needs Packaging / Dispatch</span>
                <span className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center font-bold">
                  <Package className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {pendingFulfillmentOrders.length} Orders
              </div>
              <div className="text-[11px] text-slate-400">Pack and generate Handover OTP</div>
            </div>

            {/* Cleared Wallet Balance */}
            <div
              onClick={() => setActiveNav('wallet')}
              className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2 hover:border-orange-500/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cleared Payout Balance</span>
                <span className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/60 text-orange-600 flex items-center justify-center font-bold">
                  <DollarSign className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {formatUGX(availableWalletBalanceUGX)}
              </div>
              <div className="text-[11px] text-slate-400">Auto-Disburses Tuesday 10AM (MoMo)</div>
            </div>

            {/* Merchant Score */}
            <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Merchant Score</span>
                <span className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center font-bold">
                  ★
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {currentSeller.rating?.toFixed(1) || '4.9'} / 5.0
              </div>
              <div className="text-[11px] text-emerald-600 font-bold">Top Verified Store Badge</div>
            </div>
          </div>

          {/* Quick Action Shortcuts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Package className="w-4 h-4 text-orange-600" />
                  <span>Immediate Action Orders</span>
                </h3>
                <button
                  onClick={() => setActiveNav('orders')}
                  className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline"
                >
                  View All ({orders.length})
                </button>
              </div>

              {pendingFulfillmentOrders.length > 0 ? (
                <div className="space-y-2">
                  {pendingFulfillmentOrders.slice(0, 3).map((ord) => (
                    <div
                      key={ord.id}
                      className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">{ord.id}</span>
                        <p className="text-[11px] text-slate-400">{ord.buyerName} • {formatUGX(ord.totalUGX)}</p>
                      </div>
                      <button
                        onClick={() => handleOpenDispatchModal(ord)}
                        className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-[11px] rounded-lg cursor-pointer"
                      >
                        Handover Courier
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-400">
                  All current orders are dispatched or fulfilled!
                </div>
              )}
            </div>

            <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Store className="w-4 h-4 text-orange-600" />
                  <span>Catalog Inventory Health</span>
                </h3>
                <button
                  onClick={() => setActiveNav('products')}
                  className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline"
                >
                  Manage ({products.length})
                </button>
              </div>

              <div className="space-y-2 text-xs">
                {products.slice(0, 3).map((p) => (
                  <div key={p.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">{p.title}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.stockQuantity <= 3 ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'}`}>
                      {p.stockQuantity} in stock
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. ORDER FULFILLMENT & RIDER DISPATCH WORKFLOW */}
      {/* ========================================================= */}
      {activeNav === 'orders' && (
        <div className="space-y-4">
          {/* Status Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {[
                { id: 'ALL', label: 'All Orders' },
                { id: 'PENDING', label: 'New (Pack Now)' },
                { id: 'SHIPPED', label: 'In Transit' },
                { id: 'DELIVERED', label: 'Delivered' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setOrderStatusFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    orderStatusFilter === tab.id
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <span className="text-xs font-semibold text-slate-500">
              Showing <strong>{filteredOrders.length}</strong> orders
            </span>
          </div>

          {/* Orders Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredOrders.map((ord) => (
              <div
                key={ord.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white">{ord.id}</span>
                    <span
                      className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                        ord.status === 'Delivered'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          : ord.status === 'Shipped'
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                          : 'bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300'
                      }`}
                    >
                      {ord.status}
                    </span>
                  </div>

                  <div className="text-xs space-y-1 text-slate-600 dark:text-slate-300">
                    <p>Buyer: <strong>{ord.buyerName}</strong> ({ord.buyerPhone})</p>
                    <p>Delivery: <strong>{ord.deliveryAddress?.district}, {ord.deliveryAddress?.streetAddress}</strong></p>
                    <p>Total Value: <strong className="text-slate-900 dark:text-white">{formatUGX(ord.totalUGX)}</strong></p>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Items in Package</span>
                    {ord.items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-[11px] text-slate-700 dark:text-slate-300">
                        <span>{item.title} (x{item.quantity})</span>
                        <span className="font-bold">{formatUGX(item.priceUGX * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  {ord.status === 'Pending' || ord.status === 'Confirmed' ? (
                    <button
                      onClick={() => handleOpenDispatchModal(ord)}
                      className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Truck className="w-4 h-4" />
                      <span>Handover to Courier (Verify OTP)</span>
                    </button>
                  ) : ord.status === 'Shipped' ? (
                    <div className="w-full p-2 text-center text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 rounded-xl">
                      Courier in transit to buyer
                    </div>
                  ) : (
                    <div className="w-full p-2 text-center text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl">
                      Delivered & Escrow Settled
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. PRODUCT CATALOG & INVENTORY MANAGER */}
      {/* ========================================================= */}
      {activeNav === 'products' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="p-3.5">Product</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Retail Price</th>
                    <th className="p-3.5">Estimated Net Payout</th>
                    <th className="p-3.5">Stock Level</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 flex items-center gap-3">
                        <img
                          src={p.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=150&q=80'}
                          alt={p.title}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                        />
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">{p.title}</div>
                          <div className="text-[10px] text-slate-400">{p.isExpressDelivery ? '⚡ Swift Express' : 'Standard Delivery'}</div>
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-700 dark:text-slate-300">{p.category}</td>
                      <td className="p-3.5 font-black text-slate-900 dark:text-white">{formatUGX(p.priceUGX)}</td>
                      <td className="p-3.5 text-emerald-600 dark:text-emerald-400 font-bold">{formatUGX(Math.round(p.priceUGX * 0.88))}</td>
                      <td className="p-3.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black ${
                            p.stockQuantity <= 3
                              ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400'
                              : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                          }`}
                        >
                          {p.stockQuantity <= 3 ? `LOW STOCK (${p.stockQuantity})` : `${p.stockQuantity} In Stock`}
                        </span>
                      </td>
                      <td className="p-3.5 text-right space-x-1.5">
                        <button
                          onClick={() => handleOpenEditProduct(p)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 cursor-pointer"
                          title="Edit Product"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-600 cursor-pointer"
                          title="Delete Product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. ESCROW WALLET & PAYOUT STATEMENT */}
      {/* ========================================================= */}
      {activeNav === 'wallet' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">MTN & Airtel MoMo Escrow Settlement Statement</h3>
                <p className="text-xs text-slate-500">Delivered orders are held in safe escrow and auto-disbursed weekly on Tuesdays.</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400">Next Scheduled Payout</span>
                <p className="font-black text-sm text-emerald-600">Tuesday, 10:00 AM EAT</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Gross Volume</span>
                <p className="text-lg font-black text-slate-900 dark:text-white mt-1">{formatUGX(totalSalesUGX)}</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Platform Take (12%)</span>
                <p className="text-lg font-black text-orange-600 mt-1">{formatUGX(Math.round(totalSalesUGX * 0.12))}</p>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">Net Disbursable</span>
                <p className="text-lg font-black text-emerald-700 dark:text-emerald-400 mt-1">{formatUGX(availableWalletBalanceUGX)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. ANALYTICS VIEW */}
      {/* ========================================================= */}
      {activeNav === 'analytics' && (
        <SellerAnalyticsCharts orders={orders} products={products} sellerId={currentSeller.id} />
      )}

      {/* ========================================================= */}
      {/* 6. STORE VERIFICATION */}
      {/* ========================================================= */}
      {activeNav === 'kyc' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-4 max-w-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Verified Merchant Status</h3>
              <p className="text-xs text-slate-500">Your store is approved and active for buyer orders across Uganda.</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Merchant Store:</span>
              <span className="font-bold text-slate-900 dark:text-white">{currentSeller.storeName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">URSB / TIN Registration:</span>
              <span className="font-bold font-mono text-slate-900 dark:text-white">{currentSeller.tinNumber || 'CM94032109X87'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">MoMo Payout Line:</span>
              <span className="font-bold text-emerald-600">{currentSeller.momoNumber || currentSeller.phone}</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* RIDER CUSTODY VERIFICATION & 4-DIGIT OTP MODAL */}
      {/* ========================================================= */}
      {isRiderModalOpen && selectedOrderForDispatch && (
        <div className="fixed inset-0 z-60 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-orange-600" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Courier Handover Verification</h3>
              </div>
              <button onClick={() => setIsRiderModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Capture the dispatch courier's identity before handing over the physical parcel. Provide the 4-digit code to legally transfer custody.
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Rider Legal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Katende"
                  value={riderForm.riderName}
                  onChange={(e) => setRiderForm({ ...riderForm, riderName: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Motorcycle Plate Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UFA 123X"
                  value={riderForm.plateNumber}
                  onChange={(e) => setRiderForm({ ...riderForm, plateNumber: e.target.value.toUpperCase() })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Rider NIN / Driving Permit *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CM88129032X01"
                  value={riderForm.riderNIN}
                  onChange={(e) => setRiderForm({ ...riderForm, riderNIN: e.target.value.toUpperCase() })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Active Phone Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 0776155353"
                  value={riderForm.riderPhone}
                  onChange={(e) => setRiderForm({ ...riderForm, riderPhone: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-hidden"
                />
              </div>
            </div>

            {/* 4-Digit Handover OTP Display & Verification Input */}
            <div className="p-4 bg-orange-50 dark:bg-orange-950/40 rounded-2xl border border-orange-200 dark:border-orange-800 space-y-3 text-center">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-orange-700 dark:text-orange-400">
                  Official Handover OTP Code
                </span>
                <div className="text-3xl font-black font-mono tracking-widest text-orange-600 dark:text-orange-400 my-1">
                  {generatedOTP}
                </div>
                <p className="text-[11px] text-slate-500">Confirm this code below after handing the package to the courier.</p>
              </div>

              <div className="max-w-xs mx-auto">
                <input
                  type="text"
                  maxLength={4}
                  placeholder="Enter 4-digit code"
                  value={otpInput}
                  onChange={(e) => {
                    setOtpInput(e.target.value);
                    setOtpError(null);
                  }}
                  className="w-full p-2.5 text-center text-lg font-mono font-black rounded-xl bg-white dark:bg-slate-800 border border-orange-300 dark:border-orange-700 text-slate-900 dark:text-white outline-hidden tracking-widest"
                />
                {otpError && <p className="text-[11px] font-bold text-rose-600 mt-1">{otpError}</p>}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsRiderModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={!riderForm.riderName || !riderForm.plateNumber || otpInput.length !== 4}
                onClick={handleConfirmRiderHandover}
                className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all"
              >
                Confirm Custody & Dispatch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* PRODUCT ADD / EDIT DRAWER WITH AUTO-COMPRESSION UPLOAD */}
      {/* ========================================================= */}
      {isProductDrawerOpen && (
        <div className="fixed inset-0 z-60 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {editingProduct ? 'Edit Product' : 'Add New Product to Store Catalog'}
              </h3>
              <button onClick={() => setIsProductDrawerOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Product Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Samsung Galaxy A55 5G (128GB)"
                  value={productForm.title}
                  onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Category *</label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value as ProductCategory })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-hidden cursor-pointer"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Retail Price (UGX) *</label>
                  <input
                    type="number"
                    required
                    min={1000}
                    step={500}
                    value={productForm.priceUGX || ''}
                    onChange={(e) => setProductForm({ ...productForm, priceUGX: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-hidden"
                  />
                </div>
              </div>

              {/* Commission Calculator Strip */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 text-[11px] space-y-1">
                <div className="flex justify-between text-slate-500">
                  <span>Platform Take-Rate (12%):</span>
                  <span className="font-bold text-orange-600">{formatUGX(estimatedCommission)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                  <span>Your Net Payout per Sale:</span>
                  <span className="text-emerald-600">{formatUGX(estimatedNetPayout)}</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Available Stock *</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={productForm.stockQuantity}
                  onChange={(e) => setProductForm({ ...productForm, stockQuantity: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-hidden"
                />
              </div>

              {/* DIRECT PRODUCT IMAGE UPLOADER WITH AUTO-COMPRESSION */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-700 dark:text-slate-300 font-bold">
                    Product Photos ({productForm.images.length}/5) *
                  </label>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    ⚡ Instant Auto-Compression
                  </span>
                </div>

                {/* Upload Trigger Dropzone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-5 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-orange-500 dark:hover:border-orange-500 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleImageFileUpload(e.target.files)}
                  />

                  {isCompressingImages ? (
                    <div className="flex flex-col items-center gap-2 text-orange-600">
                      <Loader2 className="w-8 h-8 animate-spin" />
                      <span className="font-bold text-xs">Compressing & optimizing photos...</span>
                    </div>
                  ) : (
                    <div className="space-y-1.5 flex flex-col items-center">
                      <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Camera className="w-5 h-5" />
                      </div>
                      <p className="font-bold text-xs text-slate-800 dark:text-slate-200">
                        Click to upload photos or take camera picture
                      </p>
                      <p className="text-[11px] text-slate-400">
                        JPEG, PNG, WebP up to 10MB • Auto-compressed for zero loading lag
                      </p>
                    </div>
                  )}
                </div>

                {/* Thumbnail Previews */}
                {productForm.images.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 pt-1">
                    {productForm.images.map((imgUrl, idx) => (
                      <div key={idx} className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 h-20 group">
                        <img src={imgUrl} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="absolute top-1 right-1 p-1 rounded-full bg-slate-950/80 text-white hover:bg-rose-600 transition-colors"
                          title="Remove photo"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        {idx === 0 && (
                          <span className="absolute bottom-1 left-1 text-[9px] font-black bg-orange-600 text-white px-1.5 py-0.2 rounded">
                            Cover
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Optional URL input toggle */}
                <div className="pt-1">
                  {!showManualUrl ? (
                    <button
                      type="button"
                      onClick={() => setShowManualUrl(true)}
                      className="text-[11px] text-slate-400 hover:text-orange-600 underline"
                    >
                      Or paste an external image link
                    </button>
                  ) : (
                    <div className="flex gap-1.5 items-center">
                      <input
                        type="url"
                        placeholder="https://..."
                        value={manualUrlInput}
                        onChange={(e) => setManualUrlInput(e.target.value)}
                        className="flex-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleAddManualUrl}
                        className="px-3 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl text-xs"
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Description *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Key features, specifications, and warranty details..."
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-hidden"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="expressDelivery"
                  checked={productForm.isExpressDelivery}
                  onChange={(e) => setProductForm({ ...productForm, isExpressDelivery: e.target.checked })}
                  className="rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
                />
                <label htmlFor="expressDelivery" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Eligible for Swift Express Same-Day Delivery
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsProductDrawerOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCompressingImages}
                  className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-1.5"
                >
                  {isCompressingImages && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingProduct ? 'Save Changes' : 'Publish Product'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
