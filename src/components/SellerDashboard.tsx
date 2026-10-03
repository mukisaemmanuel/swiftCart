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
  ProductVariant,
  ProductSpecification,
  ProductStatus,
} from '../types';
import { formatUGX, formatDate } from '../utils/formatters';
import { compressImage } from '../utils/imageCompressor';
import { calculateListingPrice, DEFAULT_SHIPPING_CONTRIBUTION_UGX } from '../utils/pricingCalculator';
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
  Layers,
  Check,
  ListPlus,
  Tag,
  Calculator,
  Info,
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
  const [dispatchPhase, setDispatchPhase] = useState<'FORM' | 'VERIFY_OTP' | 'SUCCESS'>('FORM');
  const [isSubmittingDispatch, setIsSubmittingDispatch] = useState(false);
  const [isSimulatedSmsVisible, setIsSimulatedSmsVisible] = useState(false);
  const [riderForm, setRiderForm] = useState({
    riderName: '',
    riderNIN: '',
    riderPhone: '',
    plateNumber: '',
    stageOrCompany: 'Kampala SafeBoda / Swift Courier',
    riderPhotoUrl: '',
    notes: '',
  });
  const [generatedOTP, setGeneratedOTP] = useState<string>('');
  const [otpInput, setOtpInput] = useState<string>('');
  const [otpError, setOtpError] = useState<string | null>(null);

  // POD (Proof of Delivery) Modal State
  const [isPodModalOpen, setIsPodModalOpen] = useState(false);
  const [selectedOrderForPod, setSelectedOrderForPod] = useState<Order | null>(null);
  const [podInput, setPodInput] = useState<string>('');
  const [podError, setPodError] = useState<string | null>(null);
  const [isSubmittingPod, setIsSubmittingPod] = useState(false);

  // Product Catalog Moderation & Filter State
  const [productStatusFilter, setProductStatusFilter] = useState<'ALL' | 'APPROVED' | 'UNDER_REVIEW' | 'REJECTED' | 'DRAFT'>('ALL');
  const [productSearch, setProductSearch] = useState('');
  const [isProductDrawerOpen, setIsProductDrawerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCompressingImages, setIsCompressingImages] = useState(false);
  const [manualUrlInput, setManualUrlInput] = useState('');
  const [showManualUrl, setShowManualUrl] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic Product Form State
  const [productForm, setProductForm] = useState<{
    id?: string;
    title: string;
    brand: string;
    category: ProductCategory;
    basePriceUGX: number; // Net seller payout
    description: string;
    whatsInTheBox: string;
    specifications: ProductSpecification[];
    variants: ProductVariant[];
    stockQuantity: number;
    images: string[];
    isExpressDelivery: boolean;
  }>({
    title: '',
    brand: '',
    category: 'Phones & Tablets',
    basePriceUGX: 0,
    description: '',
    whatsInTheBox: '',
    specifications: [
      { name: 'Warranty', value: '12 Months Official' },
      { name: 'Condition', value: 'Brand New (Factory Sealed)' },
    ],
    variants: [],
    stockQuantity: 10,
    images: [],
    isExpressDelivery: false,
  });

  // Dynamic Live Pricing Breakdown
  const livePricing = useMemo(() => {
    return calculateListingPrice(productForm.basePriceUGX, productForm.category, DEFAULT_SHIPPING_CONTRIBUTION_UGX);
  }, [productForm.basePriceUGX, productForm.category]);

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
  const pendingFulfillmentOrders = useMemo(() => orders.filter((o) => o.status === 'Pending' || o.status === 'Confirmed' || o.status === 'Ready_For_Pickup'), [orders]);
  const inTransitCount = useMemo(() => orders.filter((o) => o.status === 'Shipped' || o.status === 'In_Transit').length, [orders]);
  const availableWalletBalanceUGX = useMemo(() => {
    const delivered = orders.filter((o) => o.status === 'Delivered');
    return delivered.reduce((sum, o) => sum + Math.round(o.totalUGX * 0.88), 0);
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (orderStatusFilter === 'ALL') return true;
      if (orderStatusFilter === 'PENDING') return o.status === 'Pending' || o.status === 'Confirmed';
      if (orderStatusFilter === 'READY') return o.status === 'Ready_For_Pickup';
      if (orderStatusFilter === 'SHIPPED') return o.status === 'Shipped' || o.status === 'In_Transit';
      if (orderStatusFilter === 'DELIVERED') return o.status === 'Delivered';
      return true;
    });
  }, [orders, orderStatusFilter]);

  // Open Handover Dispatch Modal (Phase 5 Anti-Theft Protocol)
  const handleOpenDispatchModal = (order: Order) => {
    setSelectedOrderForDispatch(order);
    setDispatchPhase('FORM');
    setRiderForm({
      riderName: order.riderDetails?.riderName || '',
      riderNIN: order.riderDetails?.riderNIN || '',
      riderPhone: order.riderDetails?.riderPhone || '',
      plateNumber: order.riderDetails?.plateNumber || '',
      stageOrCompany: order.riderDetails?.stageOrCompany || 'Kampala SafeBoda / Swift Courier Hub',
      riderPhotoUrl: order.riderDetails?.riderPhotoUrl || '',
      notes: '',
    });
    setGeneratedOTP(order.riderDetails?.handoverOTP || '');
    setOtpInput('');
    setOtpError(null);
    setIsSimulatedSmsVisible(false);
    setIsRiderModalOpen(true);
  };

  // Step 1: Submit Rider KYC & Generate Handover OTP
  const handleGenerateHandoverOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForDispatch || !currentSeller) return;
    setOtpError(null);

    // Strict Anti-Theft Validation
    if (!riderForm.riderName.trim() || riderForm.riderName.trim().length < 3) {
      setOtpError('Please enter the courier’s full legal name (at least 3 characters).');
      return;
    }
    if (!riderForm.riderNIN.trim() || riderForm.riderNIN.trim().length < 8) {
      setOtpError('Please enter a valid Uganda National ID Number (NIN, e.g. CM88129032X01).');
      return;
    }
    if (!riderForm.riderPhone.trim() || riderForm.riderPhone.replace(/\D/g, '').length < 9) {
      setOtpError('Please enter an active Ugandan mobile phone number (e.g. 0776 123456).');
      return;
    }
    if (!riderForm.plateNumber.trim() || riderForm.plateNumber.trim().length < 5) {
      setOtpError('Please enter a valid vehicle/boda registration number plate (e.g. UFA 123X).');
      return;
    }
    if (!riderForm.stageOrCompany.trim()) {
      setOtpError('Please specify the courier operating stage, SACCO, or logistics company.');
      return;
    }

    setIsSubmittingDispatch(true);
    try {
      const dispatch = await dbService.createOrderDispatch({
        orderId: selectedOrderForDispatch.id,
        sellerId: currentSeller.id,
        sellerStoreName: currentSeller.storeName,
        riderName: riderForm.riderName,
        riderNIN: riderForm.riderNIN,
        riderPhone: riderForm.riderPhone,
        riderPlateNumber: riderForm.plateNumber,
        riderStageOrCompany: riderForm.stageOrCompany,
        riderPhotoUrl: riderForm.riderPhotoUrl,
        notes: riderForm.notes,
      });

      setGeneratedOTP(dispatch.handoverOtp);
      setDispatchPhase('VERIFY_OTP');
      setIsSimulatedSmsVisible(true);
      await loadData();
    } catch (err: any) {
      setOtpError(err?.message || 'Failed to register dispatch. Please try again.');
    } finally {
      setIsSubmittingDispatch(false);
    }
  };

  // Step 2: Confirm Handover OTP & Transfer Custody
  const handleVerifyHandoverOtp = async () => {
    if (!selectedOrderForDispatch) return;
    if (!otpInput.trim() || otpInput.trim().length !== 4) {
      setOtpError('Please enter the full 4-digit code provided by the rider.');
      return;
    }

    setIsSubmittingDispatch(true);
    setOtpError(null);
    try {
      const res = await dbService.verifyHandoverOtp(selectedOrderForDispatch.id, otpInput.trim());
      if (res.success) {
        setDispatchPhase('SUCCESS');
        triggerSuccess(`Order ${selectedOrderForDispatch.id} successfully handed over to ${riderForm.riderName}! Status is now IN TRANSIT.`);
        await loadData();
      } else {
        setOtpError(res.message || 'Incorrect 4-digit code. Please verify with the rider.');
      }
    } catch (err: any) {
      setOtpError(err?.message || 'Failed to verify handover OTP.');
    } finally {
      setIsSubmittingDispatch(false);
    }
  };

  // Open Proof-of-Delivery Modal
  const handleOpenPodModal = (order: Order) => {
    setSelectedOrderForPod(order);
    setPodInput('');
    setPodError(null);
    setIsPodModalOpen(true);
  };

  // Confirm Buyer POD OTP & Release Escrow
  const handleVerifyPodOtp = async () => {
    if (!selectedOrderForPod) return;
    if (!podInput.trim() || podInput.trim().length !== 4) {
      setPodError('Please enter the 4-digit security code received from the buyer.');
      return;
    }

    setIsSubmittingPod(true);
    setPodError(null);
    try {
      const res = await dbService.verifyPodOtp(selectedOrderForPod.id, podInput.trim(), {
        id: currentSeller?.id || 'seller',
        name: currentSeller?.storeName || 'Merchant',
        role: 'SELLER',
      });

      if (res.success) {
        setIsPodModalOpen(false);
        setSelectedOrderForPod(null);
        triggerSuccess(`🎉 Order ${selectedOrderForPod.id} verified and marked Delivered! Escrow funds released to your wallet.`);
        await loadData();
      } else {
        setPodError(res.message || 'Invalid POD code. Please check with the buyer.');
      }
    } catch (err: any) {
      setPodError(err?.message || 'Failed to verify POD code.');
    } finally {
      setIsSubmittingPod(false);
    }
  };

  // Rider Snapshot Photo Upload with Compression
  const handleRiderPhotoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) return;

    try {
      const compressedDataUrl = await compressImage(file, {
        maxDimension: 800,
        quality: 0.8,
        preferredMimeType: 'image/webp',
      });
      setRiderForm((prev) => ({ ...prev, riderPhotoUrl: compressedDataUrl }));
    } catch (err) {
      console.warn('Rider photo compression note:', err);
    }
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
      triggerSuccess(`⚡ Auto-compressed ${compressedUrls.length} photo(s) to WebP!`);
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

  const handleSetPrimaryImage = (index: number) => {
    setProductForm((prev) => {
      const newImages = [...prev.images];
      const selected = newImages.splice(index, 1)[0];
      return {
        ...prev,
        images: [selected, ...newImages],
      };
    });
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

  // Specification Helpers
  const handleAddSpec = (name: string = '', value: string = '') => {
    setProductForm((prev) => ({
      ...prev,
      specifications: [...prev.specifications, { name, value }],
    }));
  };

  const handleRemoveSpec = (index: number) => {
    setProductForm((prev) => ({
      ...prev,
      specifications: prev.specifications.filter((_, i) => i !== index),
    }));
  };

  const handleUpdateSpec = (index: number, field: 'name' | 'value', val: string) => {
    setProductForm((prev) => {
      const copy = [...prev.specifications];
      copy[index] = { ...copy[index], [field]: val };
      return { ...prev, specifications: copy };
    });
  };

  // Variant Helpers
  const handleAddVariant = () => {
    const newVariant: ProductVariant = {
      id: `var_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      variantName: '',
      sku: `SKU-${Date.now().toString().slice(-4)}`,
      additionalPrice: 0,
      stockQuantity: 5,
    };
    setProductForm((prev) => ({
      ...prev,
      variants: [...prev.variants, newVariant],
    }));
  };

  const handleRemoveVariant = (variantId: string) => {
    setProductForm((prev) => ({
      ...prev,
      variants: prev.variants.filter((v) => v.id !== variantId),
    }));
  };

  const handleUpdateVariant = (variantId: string, field: keyof ProductVariant, val: any) => {
    setProductForm((prev) => ({
      ...prev,
      variants: prev.variants.map((v) => (v.id === variantId ? { ...v, [field]: val } : v)),
    }));
  };

  // Save Product (Create or Edit with Gated Catalog Review)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSeller) return;

    if (!productForm.title.trim()) {
      alert('Please enter a product title.');
      return;
    }
    if (productForm.basePriceUGX <= 0) {
      alert('Please enter your desired base net payout in UGX.');
      return;
    }

    const finalImages =
      productForm.images.length > 0
        ? productForm.images
        : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80'];

    const calculatedPrice = livePricing.listingPriceUGX;

    const payload: Partial<Product> & { title: string; category: ProductCategory; priceUGX: number } = {
      ...(editingProduct ? { id: editingProduct.id } : {}),
      title: productForm.title.trim(),
      brand: productForm.brand.trim(),
      category: productForm.category,
      basePriceUGX: productForm.basePriceUGX,
      priceUGX: calculatedPrice,
      calculatedListingPriceUGX: calculatedPrice,
      shippingContributionUGX: livePricing.shippingContributionUGX,
      commissionRate: livePricing.commissionRate,
      description: productForm.description.trim(),
      whatsInTheBox: productForm.whatsInTheBox.trim(),
      specifications: productForm.specifications.filter((s) => s.name.trim() && s.value.trim()),
      variants: productForm.variants.filter((v) => v.variantName.trim()),
      stockQuantity: productForm.stockQuantity,
      images: finalImages,
      isExpressDelivery: productForm.isExpressDelivery,
    };

    await dbService.submitProductForReview(payload, currentSeller);
    triggerSuccess(
      editingProduct
        ? `Product "${productForm.title}" updated and submitted for Admin QC re-check!`
        : `Product "${productForm.title}" submitted! It will appear on store once approved by Admin QC.`
    );

    setIsProductDrawerOpen(false);
    setEditingProduct(null);
    setProductForm({
      title: '',
      brand: '',
      category: 'Phones & Tablets',
      basePriceUGX: 0,
      description: '',
      whatsInTheBox: '',
      specifications: [
        { name: 'Warranty', value: '12 Months Official' },
        { name: 'Condition', value: 'Brand New (Factory Sealed)' },
      ],
      variants: [],
      stockQuantity: 10,
      images: [],
      isExpressDelivery: false,
    });
    await loadData();
  };

  const handleOpenNewProduct = () => {
    setEditingProduct(null);
    setProductForm({
      title: '',
      brand: '',
      category: 'Phones & Tablets',
      basePriceUGX: 0,
      description: '',
      whatsInTheBox: '',
      specifications: [
        { name: 'Warranty', value: '12 Months Official' },
        { name: 'Condition', value: 'Brand New (Factory Sealed)' },
      ],
      variants: [],
      stockQuantity: 10,
      images: [],
      isExpressDelivery: false,
    });
    setIsProductDrawerOpen(true);
  };

  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    const existingBase = prod.basePriceUGX || Math.round(prod.priceUGX * (1 - (prod.commissionRate || 0.12)));
    setProductForm({
      id: prod.id,
      title: prod.title,
      brand: prod.brand || '',
      category: prod.category,
      basePriceUGX: existingBase,
      description: prod.description,
      whatsInTheBox: prod.whatsInTheBox || '',
      specifications: prod.specifications && prod.specifications.length > 0 ? prod.specifications : [
        { name: 'Warranty', value: '12 Months Official' },
        { name: 'Condition', value: 'Brand New (Factory Sealed)' },
      ],
      variants: prod.variants || [],
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
              onClick={handleOpenNewProduct}
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
                { id: 'ALL', label: 'All Orders' },
                { id: 'PENDING', label: 'Pending & Confirmed' },
                { id: 'READY', label: 'Ready for Pickup' },
                { id: 'SHIPPED', label: 'In Transit' },
                { id: 'DELIVERED', label: 'Delivered' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setOrderStatusFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    orderStatusFilter === tab.id
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
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
                    <div>
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white">{ord.id}</span>
                      <span className="text-[10px] text-slate-400 block">{formatDate(ord.createdAt)}</span>
                    </div>
                    <span
                      className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                        ord.status === 'Delivered'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          : ord.status === 'Shipped' || ord.status === 'In_Transit'
                          ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300'
                          : ord.status === 'Ready_For_Pickup'
                          ? 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300'
                          : 'bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300'
                      }`}
                    >
                      {ord.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="text-xs space-y-1 text-slate-600 dark:text-slate-300">
                    <p>Buyer: <strong>{ord.buyerName}</strong> ({ord.buyerPhone})</p>
                    <p>Delivery: <strong>{ord.deliveryAddress?.district}, {ord.deliveryAddress?.streetAddress}</strong></p>
                    <p>Total Value: <strong className="text-slate-900 dark:text-white">{formatUGX(ord.totalUGX)}</strong></p>
                  </div>

                  {/* Chain of Custody Assigned Rider Card */}
                  {ord.riderDetails && (
                    <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 rounded-xl border border-amber-200/80 dark:border-amber-900/60 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1 text-[11px]">
                          <Truck className="w-3.5 h-3.5 text-orange-600" />
                          <span>Assigned Courier (Anti-Theft CoC)</span>
                        </span>
                        {ord.riderDetails.isOTPVerified ? (
                          <span className="text-[9px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                            <Check className="w-3 h-3" /> Handover Verified
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 px-1.5 py-0.2 rounded-full">
                            OTP Handover Pending
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-700 dark:text-slate-300">
                        <span>{ord.riderDetails.riderName} ({ord.riderDetails.plateNumber})</span>
                        <span className="text-slate-400 font-mono text-[10px]">{ord.riderDetails.riderNIN}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center justify-between">
                        <span>{ord.riderDetails.stageOrCompany || 'SafeBoda Kampala'}</span>
                        <span className="text-slate-600 dark:text-slate-300 font-semibold">Tel: {ord.riderDetails.riderPhone}</span>
                      </div>
                    </div>
                  )}

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

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2">
                  {ord.status === 'Pending' || ord.status === 'Confirmed' ? (
                    <button
                      onClick={() => handleOpenDispatchModal(ord)}
                      className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Truck className="w-4 h-4" />
                      <span>Dispatch to Courier / Boda (Verify Identity)</span>
                    </button>
                  ) : ord.status === 'Ready_For_Pickup' ? (
                    <button
                      onClick={() => handleOpenDispatchModal(ord)}
                      className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Complete Rider Handover OTP</span>
                    </button>
                  ) : ord.status === 'Shipped' || ord.status === 'In_Transit' ? (
                    <div className="w-full flex items-center gap-2">
                      <button
                        onClick={() => handleOpenPodModal(ord)}
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Confirm Buyer POD OTP (Release Escrow)</span>
                      </button>
                    </div>
                  ) : (
                    <div className="w-full p-2 text-center text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Delivered & Escrow Settled to Wallet</span>
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
          {/* Status Filter & Search Header */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
              {(
                [
                  { id: 'ALL', label: 'All Listings', count: products.length },
                  { id: 'APPROVED', label: 'Live on Store', count: products.filter((p) => p.status === 'APPROVED' || !p.status).length, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60' },
                  { id: 'UNDER_REVIEW', label: 'Under QC Review', count: products.filter((p) => p.status === 'UNDER_REVIEW').length, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/60' },
                  { id: 'REJECTED', label: 'Needs Fix', count: products.filter((p) => p.status === 'REJECTED').length, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/60' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setProductStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    productStatusFilter === tab.id
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${productStatusFilter === tab.id ? 'bg-white/20 text-white' : tab.color || 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="relative min-w-[240px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search catalog by title, brand..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-hidden"
              />
            </div>
          </div>

          {/* Rejected Products Action Banner if any exist */}
          {products.some((p) => p.status === 'REJECTED') && productStatusFilter !== 'APPROVED' && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-900/60 space-y-2">
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Action Required: You have listings flagged by Operations QC</span>
              </div>
              <p className="text-[11px] text-rose-600/90 dark:text-rose-400/90">
                Please review the feedback reason from our moderation desk, edit your specifications or photos, and resubmit for immediate review.
              </p>
            </div>
          )}

          {/* Product Catalog Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="p-3.5">Product & Details</th>
                    <th className="p-3.5">Category & Brand</th>
                    <th className="p-3.5">Desired Net Payout</th>
                    <th className="p-3.5">Buyer Listing Price</th>
                    <th className="p-3.5">Inventory</th>
                    <th className="p-3.5">Moderation Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {products
                    .filter((p) => {
                      const currentStatus = p.status || 'APPROVED';
                      const matchesStatus =
                        productStatusFilter === 'ALL'
                          ? true
                          : productStatusFilter === 'APPROVED'
                          ? currentStatus === 'APPROVED'
                          : currentStatus === productStatusFilter;
                      const q = productSearch.toLowerCase();
                      const matchesSearch =
                        !q ||
                        p.title.toLowerCase().includes(q) ||
                        (p.brand && p.brand.toLowerCase().includes(q)) ||
                        p.category.toLowerCase().includes(q);
                      return matchesStatus && matchesSearch;
                    })
                    .map((p) => {
                      const status = p.status || 'APPROVED';
                      const netPayout = p.basePriceUGX || Math.round(p.priceUGX * 0.88);

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-3.5 flex items-center gap-3">
                            <div className="relative w-11 h-11 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0">
                              <img
                                src={p.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=150&q=80'}
                                alt={p.title}
                                className="w-full h-full object-cover"
                              />
                              {p.images && p.images.length > 1 && (
                                <span className="absolute bottom-0 right-0 bg-slate-900/80 text-white text-[8px] font-black px-1 rounded-tl">
                                  +{p.images.length - 1}
                                </span>
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <span>{p.title}</span>
                                {p.isExpressDelivery && (
                                  <span className="text-[9px] font-black bg-orange-100 dark:bg-orange-950/80 text-orange-600 px-1.5 py-0.2 rounded">
                                    ⚡ Express
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                                {p.variants && p.variants.length > 0 && (
                                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                                    {p.variants.length} Variants
                                  </span>
                                )}
                                {p.specifications && p.specifications.length > 0 && (
                                  <span>{p.specifications.length} Specs</span>
                                )}
                              </div>
                              {p.rejectionReason && status === 'REJECTED' && (
                                <div className="mt-1 text-[10px] text-rose-600 bg-rose-50 dark:bg-rose-950/60 p-1 rounded font-bold border border-rose-200 dark:border-rose-900">
                                  QC Note: {p.rejectionReason}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <div className="text-slate-800 dark:text-slate-200 font-bold">{p.category}</div>
                            <div className="text-[10px] text-slate-400">{p.brand || 'Unbranded / Generic'}</div>
                          </td>
                          <td className="p-3.5 text-emerald-600 dark:text-emerald-400 font-bold">
                            {formatUGX(netPayout)}
                          </td>
                          <td className="p-3.5 font-black text-slate-900 dark:text-white">
                            {formatUGX(p.priceUGX)}
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black ${
                                p.stockQuantity <= 3
                                  ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {p.stockQuantity <= 3 ? `LOW (${p.stockQuantity})` : `${p.stockQuantity} In Stock`}
                            </span>
                          </td>
                          <td className="p-3.5">
                            {status === 'APPROVED' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 className="w-3 h-3" /> Live on Store
                              </span>
                            ) : status === 'UNDER_REVIEW' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                <Clock className="w-3 h-3" /> Under QC Review
                              </span>
                            ) : status === 'REJECTED' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                                <AlertCircle className="w-3 h-3" /> Fix & Resubmit
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                Draft
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-right space-x-1.5">
                            <button
                              onClick={() => handleOpenEditProduct(p)}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 cursor-pointer"
                              title="Edit / Resubmit Listing"
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
                      );
                    })}
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
      {/* PHASE 5: RIDER CUSTODY & ANTI-THEFT HANDOVER MODAL */}
      {/* ========================================================= */}
      {isRiderModalOpen && selectedOrderForDispatch && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-950/80 text-orange-600 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                    Delivery Rider Verification & Handover
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Anti-Theft Chain-of-Custody (CoC) Protocol • Package {selectedOrderForDispatch.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsRiderModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step Progress Tracker */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div
                className={`p-2 rounded-xl border transition-all ${
                  dispatchPhase === 'FORM'
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 font-bold'
                    : 'border-slate-200 dark:border-slate-800 text-slate-400 bg-slate-50 dark:bg-slate-800/40'
                }`}
              >
                1. Rider Identity
              </div>
              <div
                className={`p-2 rounded-xl border transition-all ${
                  dispatchPhase === 'VERIFY_OTP'
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 font-bold'
                    : 'border-slate-200 dark:border-slate-800 text-slate-400 bg-slate-50 dark:bg-slate-800/40'
                }`}
              >
                2. Handshake 1 OTP
              </div>
              <div
                className={`p-2 rounded-xl border transition-all ${
                  dispatchPhase === 'SUCCESS'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold'
                    : 'border-slate-200 dark:border-slate-800 text-slate-400 bg-slate-50 dark:bg-slate-800/40'
                }`}
              >
                3. Custody Locked
              </div>
            </div>

            {/* Error Message */}
            {otpError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-2xl text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{otpError}</span>
              </div>
            )}

            {/* PHASE 1: RIDER KYC & VEHICLE REGISTRATION */}
            {dispatchPhase === 'FORM' && (
              <form onSubmit={handleGenerateHandoverOtp} className="space-y-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
                  <div className="font-bold text-slate-900 dark:text-white mb-0.5">Physical Custody Transfer Rules:</div>
                  Before handing the parcel to any courier or boda rider, record their National ID (NIN), phone, and plate number to legally bind them to this parcel.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      Rider Full Legal Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Katende"
                      value={riderForm.riderName}
                      onChange={(e) => setRiderForm({ ...riderForm, riderName: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-hidden focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      Motorcycle / Vehicle Plate Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. UFA 123X"
                      value={riderForm.plateNumber}
                      onChange={(e) => setRiderForm({ ...riderForm, plateNumber: e.target.value.toUpperCase() })}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-black text-slate-900 dark:text-white outline-hidden uppercase focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      National ID Number (NIN) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. CM88129032X01"
                      value={riderForm.riderNIN}
                      onChange={(e) => setRiderForm({ ...riderForm, riderNIN: e.target.value.toUpperCase() })}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white outline-hidden uppercase focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      Rider Mobile Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 0776155353"
                      value={riderForm.riderPhone}
                      onChange={(e) => setRiderForm({ ...riderForm, riderPhone: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-hidden focus:border-orange-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      Operating Stage, Boda SACCO, or Courier Company <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. SafeBoda Kampala, Tugende Riders SACCO, Bolt Courier"
                      value={riderForm.stageOrCompany}
                      onChange={(e) => setRiderForm({ ...riderForm, stageOrCompany: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-hidden focus:border-orange-500"
                    />
                  </div>
                </div>

                {/* Optional Rider / ID Photo Capture */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-orange-600" />
                      <span>Quick Rider Photo / National ID Snapshot</span>
                    </span>
                    <span className="text-[10px] text-slate-400">Optional Anti-Theft Evidence</span>
                  </div>

                  <input
                    type="file"
                    ref={riderPhotoInputRef}
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handleRiderPhotoUpload(e.target.files)}
                    className="hidden"
                  />

                  {riderForm.riderPhotoUrl ? (
                    <div className="flex items-center gap-3">
                      <img
                        src={riderForm.riderPhotoUrl}
                        alt="Rider Snapshot"
                        className="w-16 h-16 rounded-xl object-cover border border-emerald-500"
                      />
                      <div>
                        <span className="text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Photo Attached
                        </span>
                        <button
                          type="button"
                          onClick={() => setRiderForm((prev) => ({ ...prev, riderPhotoUrl: '' }))}
                          className="text-[11px] text-rose-500 hover:underline mt-0.5 block"
                        >
                          Remove Photo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => riderPhotoInputRef.current?.click()}
                      className="w-full py-2 px-3 border border-dashed border-slate-300 dark:border-slate-600 hover:border-orange-500 rounded-xl text-slate-600 dark:text-slate-300 font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Take Photo with Camera / Upload Snapshot</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsRiderModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingDispatch}
                    className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 active:scale-[0.98] disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-2"
                  >
                    {isSubmittingDispatch ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Generating Handover OTP...</span>
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4" />
                        <span>Generate Handover OTP & Alert Rider</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* PHASE 2: HANDSHAKE 1 OTP VERIFICATION */}
            {dispatchPhase === 'VERIFY_OTP' && (
              <div className="space-y-4">
                {/* Simulated SMS Alert Banner */}
                {isSimulatedSmsVisible && (
                  <div className="p-3.5 bg-slate-900 text-white rounded-2xl shadow-xl border border-slate-700 text-xs space-y-1.5 animate-in slide-in-from-top-3">
                    <div className="flex items-center justify-between text-[11px] text-amber-400 font-mono font-bold">
                      <span>📱 SIMULATED SMS SENT TO {riderForm.riderPhone}</span>
                      <span className="text-[10px] text-slate-400">Instant SMS API</span>
                    </div>
                    <p className="text-slate-200 text-xs leading-relaxed font-sans">
                      "SwiftCart Dispatch: Courier <strong>{riderForm.riderName}</strong>, your 4-digit Handover OTP for Package <strong>{selectedOrderForDispatch.id}</strong> ({selectedOrderForDispatch.sellerStoreName}) is <strong className="text-amber-300 font-mono text-sm tracking-widest font-black">{generatedOTP}</strong>. Provide this code to the merchant to receive the package."
                    </p>
                  </div>
                )}

                <div className="p-4 bg-orange-50 dark:bg-orange-950/40 rounded-2xl border border-orange-200 dark:border-orange-800 space-y-3 text-center">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-orange-700 dark:text-orange-400">
                      Handshake 1 • Confirm Rider OTP
                    </span>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                      Ask rider <strong>{riderForm.riderName}</strong> ({riderForm.plateNumber}) for the 4-digit code sent to their phone:
                    </p>
                  </div>

                  <div className="max-w-xs mx-auto">
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="• • • •"
                      value={otpInput}
                      onChange={(e) => {
                        setOtpInput(e.target.value.replace(/\D/g, ''));
                        setOtpError(null);
                      }}
                      className="w-full p-3 text-center text-2xl font-mono font-black rounded-2xl bg-white dark:bg-slate-800 border-2 border-orange-400 dark:border-orange-600 text-slate-900 dark:text-white outline-hidden tracking-[0.4em] shadow-inner"
                    />
                  </div>

                  <div className="text-[11px] text-slate-400">
                    Expected OTP (for testing / offline verification): <strong className="font-mono text-orange-600 dark:text-orange-400">{generatedOTP}</strong>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setDispatchPhase('FORM')}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    ← Edit Rider Details
                  </button>
                  <button
                    type="button"
                    disabled={isSubmittingDispatch || otpInput.length !== 4}
                    onClick={handleVerifyHandoverOtp}
                    className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 active:scale-[0.98] disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-2"
                  >
                    {isSubmittingDispatch ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying Custody...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Verify OTP & Lock Custody</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* PHASE 3: CUSTODY LOCKED SUCCESS RECEIPT */}
            {dispatchPhase === 'SUCCESS' && (
              <div className="space-y-4 text-center py-2">
                <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-black text-base text-slate-900 dark:text-white">
                    Physical Custody Successfully Transferred!
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Order <strong>{selectedOrderForDispatch.id}</strong> is now legally locked to courier <strong>{riderForm.riderName}</strong> ({riderForm.plateNumber}) and marked <strong>IN TRANSIT</strong>.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-left text-xs space-y-2 max-w-md mx-auto">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Assigned Courier:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{riderForm.riderName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Motorcycle Plate:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{riderForm.plateNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Rider NIN:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{riderForm.riderNIN}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Handshake 1 Verified At:</span>
                    <span className="font-semibold text-emerald-600">{new Date().toLocaleTimeString()}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsRiderModalOpen(false)}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Done & View Order in Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* PHASE 5: BUYER PROOF OF DELIVERY (POD) OTP MODAL */}
      {/* ========================================================= */}
      {isPodModalOpen && selectedOrderForPod && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Confirm Proof of Delivery (POD)
                </h3>
              </div>
              <button
                onClick={() => setIsPodModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              When the buyer inspects the delivered package, they release their 4-digit security code. Entering this code marks the order as <strong>DELIVERED</strong> and releases escrow payout to your wallet.
            </p>

            {podError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-2xl text-xs text-rose-700 dark:text-rose-300">
                {podError}
              </div>
            )}

            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-3 text-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                Enter Buyer 4-Digit POD Code
              </span>

              <div className="max-w-xs mx-auto">
                <input
                  type="text"
                  maxLength={4}
                  placeholder="• • • •"
                  value={podInput}
                  onChange={(e) => {
                    setPodInput(e.target.value.replace(/\D/g, ''));
                    setPodError(null);
                  }}
                  className="w-full p-3 text-center text-2xl font-mono font-black rounded-2xl bg-white dark:bg-slate-800 border-2 border-emerald-400 dark:border-emerald-600 text-slate-900 dark:text-white outline-hidden tracking-[0.4em] shadow-inner"
                />
              </div>

              <div className="text-[11px] text-slate-400">
                Order Value to be Released: <strong className="text-emerald-600 font-black">{formatUGX(selectedOrderForPod.totalUGX)}</strong>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsPodModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingPod || podInput.length !== 4}
                onClick={handleVerifyPodOtp}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-2"
              >
                {isSubmittingPod ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Releasing Escrow...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verify POD & Release Escrow</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VENDOR PRODUCT CREATION & CATALOG MODERATION STUDIO MODAL */}
      {/* ========================================================= */}
      {isProductDrawerOpen && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[94vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Package className="w-5 h-5 text-orange-600" />
                  <span>{editingProduct ? 'Edit Product & Re-submit QC' : 'New Vendor Listing Studio'}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  All listings are moderated by Operations QC before publishing to public shoppers.
                </p>
              </div>
              <button
                onClick={() => setIsProductDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body with Scroll */}
            <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              {/* SECTION 1: BASIC INFORMATION */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-xs uppercase tracking-wider">
                  <span className="w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-600 flex items-center justify-center text-[10px]">1</span>
                  <span>Basic Details & Classification</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Product Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apple iPhone 15 Pro Max (256GB Titanium)"
                      value={productForm.title}
                      onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-hidden"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Brand / Manufacturer</label>
                      <input
                        type="text"
                        placeholder="e.g. Apple, Samsung, Sony, Generic"
                        value={productForm.brand}
                        onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Product Description *</label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Highlight main features, authentic specifications, and warranty coverage..."
                      value={productForm.description}
                      onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">What's in the Box?</label>
                    <input
                      type="text"
                      placeholder="e.g. 1x Smartphone, 1x USB-C Cable, 1x SIM Ejector, 1x User Manual"
                      value={productForm.whatsInTheBox}
                      onChange={(e) => setProductForm({ ...productForm, whatsInTheBox: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: BULLET SPECIFICATIONS BUILDER */}
              <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-xs uppercase tracking-wider">
                    <span className="w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-600 flex items-center justify-center text-[10px]">2</span>
                    <span>Bullet Specifications (Accordion / Key-Value)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddSpec()}
                    className="px-2.5 py-1 rounded-lg bg-orange-50 dark:bg-orange-950/60 text-orange-600 font-bold text-[11px] flex items-center gap-1 hover:bg-orange-100 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Add Spec Row
                  </button>
                </div>

                {/* Quick Add Presets */}
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] text-slate-400 font-bold">Quick Presets:</span>
                  {[
                    { name: 'RAM', value: '8GB' },
                    { name: 'Storage', value: '256GB' },
                    { name: 'Battery', value: '5000 mAh' },
                    { name: 'Screen Size', value: '6.7 Inch OLED' },
                    { name: 'Warranty', value: '1 Year Warranty' },
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleAddSpec(preset.name, preset.value)}
                      className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold hover:bg-orange-50 hover:text-orange-600 transition-colors"
                    >
                      +{preset.name}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  {(productForm.specifications || []).map((spec, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Feature (e.g. RAM, Battery)"
                        value={spec.name}
                        onChange={(e) => handleUpdateSpec(idx, 'name', e.target.value)}
                        className="w-1/3 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                      />
                      <input
                        type="text"
                        placeholder="Value (e.g. 12GB LPDDR5X, 5000mAh)"
                        value={spec.value}
                        onChange={(e) => handleUpdateSpec(idx, 'value', e.target.value)}
                        className="flex-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveSpec(idx)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 3: VARIANT BUILDER MATRIX */}
              <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-xs uppercase tracking-wider">
                      <span className="w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-600 flex items-center justify-center text-[10px]">3</span>
                      <span>Product Variants (Colors, Sizes, Capacities)</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Add variant combinations with independent SKU numbers and stock counts.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddVariant}
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 font-bold text-[11px] flex items-center gap-1 hover:bg-indigo-100 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Add Variant
                  </button>
                </div>

                {(productForm.variants || []).length > 0 ? (
                  <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3 space-y-2 border border-slate-200/80 dark:border-slate-700">
                    {(productForm.variants || []).map((variant) => (
                      <div key={variant.id} className="grid grid-cols-12 gap-2 items-center bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                        <div className="col-span-4">
                          <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Variant Name</label>
                          <input
                            type="text"
                            placeholder="e.g. 256GB - Titanium"
                            value={variant.variantName}
                            onChange={(e) => handleUpdateVariant(variant.id, 'variantName', e.target.value)}
                            className="w-full p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Custom SKU</label>
                          <input
                            type="text"
                            value={variant.sku}
                            onChange={(e) => handleUpdateVariant(variant.id, 'sku', e.target.value)}
                            className="w-full p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Price Offset</label>
                          <input
                            type="number"
                            placeholder="+0 UGX"
                            value={variant.additionalPrice || ''}
                            onChange={(e) => handleUpdateVariant(variant.id, 'additionalPrice', Number(e.target.value))}
                            className="w-full p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Inventory</label>
                          <input
                            type="number"
                            min={0}
                            value={variant.stockQuantity}
                            onChange={(e) => handleUpdateVariant(variant.id, 'stockQuantity', Number(e.target.value))}
                            className="w-full p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                          />
                        </div>
                        <div className="col-span-1 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveVariant(variant.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-[11px] text-slate-400">
                    No variants added. Base product stock will be used.
                  </div>
                )}
              </div>

              {/* SECTION 4: IMAGE UPLOADER WITH WEBP COMPRESSION */}
              <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-xs uppercase tracking-wider">
                    <span className="w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-600 flex items-center justify-center text-[10px]">4</span>
                    <span>Product Photography ({(productForm.images || []).length}/5)</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    ⚡ Auto-Compressed to WebP
                  </span>
                </div>

                {/* Dropzone */}
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
                      <Loader2 className="w-7 h-7 animate-spin" />
                      <span className="font-bold text-xs">Converting & optimizing photos to WebP...</span>
                    </div>
                  ) : (
                    <div className="space-y-1.5 flex flex-col items-center">
                      <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Camera className="w-5 h-5" />
                      </div>
                      <p className="font-bold text-xs text-slate-800 dark:text-slate-200">
                        Upload high-resolution photos (Up to 5)
                      </p>
                      <p className="text-[11px] text-slate-400">
                        PNG, JPG, WebP • Auto-optimized for instant zero-lag page load
                      </p>
                    </div>
                  )}
                </div>

                {/* Photos Grid */}
                {(productForm.images || []).length > 0 && (
                  <div className="grid grid-cols-5 gap-2.5 pt-1">
                    {(productForm.images || []).map((imgUrl, idx) => (
                      <div key={idx} className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 h-24 group bg-slate-900">
                        <img src={imgUrl} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="absolute top-1 right-1 p-1 rounded-full bg-slate-950/80 text-white hover:bg-rose-600 transition-colors"
                          title="Remove photo"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        {idx === 0 ? (
                          <span className="absolute bottom-1 left-1 text-[9px] font-black bg-orange-600 text-white px-1.5 py-0.2 rounded shadow-xs">
                            Primary
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSetPrimaryImage(idx)}
                            className="absolute bottom-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-black bg-slate-900/90 text-white px-1.5 py-0.2 rounded"
                          >
                            Set Cover
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 5: TRANSPARENT PRICING & ECONOMICS CALCULATOR */}
              <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-xs uppercase tracking-wider">
                  <span className="w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-600 flex items-center justify-center text-[10px]">5</span>
                  <span>Pricing Engine & Platform Economics</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      Target Net Seller Payout (UGX) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">UGX</span>
                      <input
                        type="number"
                        required
                        min={1000}
                        step={500}
                        placeholder="e.g. 1500000"
                        value={productForm.basePriceUGX || ''}
                        onChange={(e) => setProductForm({ ...productForm, basePriceUGX: Number(e.target.value) })}
                        className="w-full pl-12 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-900 dark:text-white outline-hidden"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      The net amount you will receive per sale upon delivery confirmation.
                    </p>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      Base Stock Quantity *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={productForm.stockQuantity}
                      onChange={(e) => setProductForm({ ...productForm, stockQuantity: Number(e.target.value) })}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-hidden"
                    />
                  </div>
                </div>

                {/* Live Formula Economics Card */}
                <div className="bg-slate-900 text-slate-200 rounded-2xl p-4 space-y-3 border border-slate-800">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-[11px] font-bold text-orange-400 flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5" /> Automated Formula Breakdown
                    </span>
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                      Category Commission: {livePricing.commissionRatePercent}%
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Your Desired Payout:</span>
                      <span className="font-bold text-emerald-400">{formatUGX(livePricing.basePriceUGX)}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block">Shipping Contribution:</span>
                      <span className="font-bold text-slate-300">{formatUGX(livePricing.shippingContributionUGX)}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block">Platform Commission:</span>
                      <span className="font-bold text-orange-400">{formatUGX(livePricing.commissionAmountUGX)}</span>
                    </div>

                    <div className="bg-orange-950/80 border border-orange-800/80 p-2 rounded-xl text-right">
                      <span className="text-[9px] text-orange-300 font-bold block uppercase">Customer Pays</span>
                      <span className="font-black text-sm text-white">{formatUGX(livePricing.listingPriceUGX)}</span>
                    </div>
                  </div>
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
              </div>

              {/* Modal Footer Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                  <span>Product enters Operations QC queue upon submission.</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsProductDrawerOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCompressingImages || !productForm.title || productForm.basePriceUGX <= 0}
                    className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-1.5"
                  >
                    {isCompressingImages && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{editingProduct ? 'Update & Re-Submit QC' : 'Submit for Catalog Review'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
