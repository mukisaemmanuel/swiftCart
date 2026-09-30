import React, { useState, useEffect, useRef } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/db';
import { Product, Order, ProductCategory, VerificationDocumentType, Seller } from '../types';
import { formatUGX, formatDate } from '../utils/formatters';
import { UGANDA_DISTRICTS } from '../data/seedData';
import { SellerAnalyticsCharts } from './SellerAnalyticsCharts';
import {
  Store,
  Package,
  Plus,
  Trash2,
  Edit3,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Phone,
  Upload,
  Heart,
  FileText,
  AlertCircle,
  Truck,
  ArrowLeft,
  X,
  ExternalLink,
  Camera,
  Image as ImageIcon,
  Loader2,
  MapPin,
  ShieldAlert,
  CreditCard,
} from 'lucide-react';
import { compressImage } from '../utils/imageCompressor';

// Asynchronous upload helper
const uploadImageFile = async (file: File): Promise<string> => {
  try {
    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '');
    const storageRef = ref(storage, `products/${Date.now()}_${cleanName}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  } catch (storageErr) {
    console.warn(
      'Firebase Storage upload failed or unconfigured, falling back to 1600px HD Canvas compressed Base64:',
      storageErr
    );
    return await compressImage(file);
  }
};


interface SellerDashboardProps {
  onBackToShopping: () => void;
}

export const SellerDashboard: React.FC<SellerDashboardProps> = ({ onBackToShopping }) => {
  const { currentSeller, verifySellerPhone, updateSellerProfile, currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders' | 'verification' | 'profile'>('overview');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [wishlistCounts, setWishlistCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Phone OTP verification modal / state
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSuccess, setOtpSuccess] = useState(false);

  // Product Add / Edit modal
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodTitle, setProdTitle] = useState('');
  const [prodCategory, setProdCategory] = useState<ProductCategory>('Phones & Tablets');
  const [prodDescription, setProdDescription] = useState('');
  const [prodPriceUGX, setProdPriceUGX] = useState<number>(50000);
  const [prodOriginalPriceUGX, setProdOriginalPriceUGX] = useState<number>(65000);
  const [prodStock, setProdStock] = useState<number>(10);
  const [prodExpress, setProdExpress] = useState(true);
  const [prodImages, setProdImages] = useState<string[]>([]);
  const [imageInputUrl, setImageInputUrl] = useState('');
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingImages(true);
    try {
      const fileList = Array.from(files) as File[];
      const uploadPromises = fileList.map((file: File) => uploadImageFile(file));
      const uploadedUrls = await Promise.all(uploadPromises);
      setProdImages((prev) => {
        const combined = [...prev, ...uploadedUrls];
        return combined.slice(0, 4);
      });
    } catch (err) {
      console.error('Failed to upload image files:', err);
    } finally {
      setIsUploadingImages(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAddUrlImage = () => {
    if (!imageInputUrl.trim()) return;
    setProdImages((prev) => {
      const combined = [...prev, imageInputUrl.trim()];
      return combined.slice(0, 4);
    });
    setImageInputUrl('');
  };

  const handleRemoveImage = (index: number) => {
    setProdImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Document Verification form
  const [docType, setDocType] = useState<VerificationDocumentType>('business_registration');
  const [docUrl, setDocUrl] = useState('');
  const [docNotes, setDocNotes] = useState('');
  const [docSuccess, setDocSuccess] = useState(false);

  // Profile editing
  const [storeName, setStoreName] = useState(currentSeller?.storeName || '');
  const [district, setDistrict] = useState(currentSeller?.district || UGANDA_DISTRICTS[0]);
  const [address, setAddress] = useState(currentSeller?.address || '');
  const [bio, setBio] = useState(currentSeller?.bio || '');
  const [momoNumber, setMomoNumber] = useState(currentSeller?.momoNumber || '');
  const [momoNetwork, setMomoNetwork] = useState<'MTN' | 'Airtel'>(currentSeller?.momoNetwork || 'MTN');

  const loadData = async () => {
    if (!currentSeller) return;
    setLoading(true);
    const allProds = await dbService.getProducts();
    const myProds = allProds.filter((p) => p.sellerId === currentSeller.id);
    setProducts(myProds);

    const allOrders = await dbService.getOrders();
    const myOrders = allOrders.filter((o) => o.sellerId === currentSeller.id);
    setOrders(myOrders);

    const wishMetrics = await dbService.getSellerWishlistMetrics(currentSeller.id);
    setWishlistCounts(wishMetrics);

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [currentSeller?.id]);

  if (!currentSeller) {
    return (
      <div className="max-w-md mx-auto p-8 text-center my-12 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <Store className="w-12 h-12 text-orange-600 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800">Seller Account Required</h2>
        <p className="text-xs text-slate-500 mt-1 mb-4">
          Please register as a seller or switch to a seller persona using the persona switcher.
        </p>
        <button
          onClick={onBackToShopping}
          className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-md"
        >
          Return to Marketplace
        </button>
      </div>
    );
  }

  const handleVerifyPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError(null);
    const ok = await verifySellerPhone(otpCode);
    if (ok) {
      setOtpSuccess(true);
      setTimeout(() => setOtpSuccess(false), 3000);
    } else {
      setOtpError('Invalid code. Enter 6 digits (e.g. 123456) to verify.');
    }
  };

  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setProdTitle('');
    setProdCategory('Phones & Tablets');
    setProdDescription('');
    setProdPriceUGX(150000);
    setProdOriginalPriceUGX(180000);
    setProdStock(15);
    setProdExpress(true);
    setProdImages([]);
    setImageInputUrl('');
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setProdTitle(prod.title);
    setProdCategory(prod.category);
    setProdDescription(prod.description);
    setProdPriceUGX(prod.priceUGX);
    setProdOriginalPriceUGX(prod.originalPriceUGX || prod.priceUGX);
    setProdStock(prod.stockQuantity);
    setProdExpress(!!prod.isExpressDelivery);
    setProdImages(prod.images.length > 0 ? prod.images : []);
    setImageInputUrl('');
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodTitle.trim()) return;

    const cleanImages = prodImages.filter((img) => img.trim().length > 0);
    if (cleanImages.length === 0) {
      cleanImages.push('https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80');
    }

    const newProd: Product = {
      id: editingProduct ? editingProduct.id : `prod_${Date.now()}`,
      sellerId: currentSeller.id,
      sellerStoreName: currentSeller.storeName,
      sellerDistrict: currentSeller.district,
      title: prodTitle.trim(),
      slug: prodTitle.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      category: prodCategory,
      description: prodDescription.trim(),
      priceUGX: Number(prodPriceUGX),
      originalPriceUGX: prodOriginalPriceUGX ? Number(prodOriginalPriceUGX) : undefined,
      stockQuantity: Number(prodStock),
      images: cleanImages.slice(0, 4), // max 4 images
      rating: editingProduct ? editingProduct.rating : 5.0,
      reviewCount: editingProduct ? editingProduct.reviewCount : 0,
      isExpressDelivery: prodExpress,
      createdAt: editingProduct ? editingProduct.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await dbService.saveProduct(newProd);
    setIsProductModalOpen(false);
    await loadData();
  };

  const handleDeleteProduct = async (productId: string) => {
    if (window.confirm('Are you sure you want to delete this product listing?')) {
      await dbService.deleteProduct(productId);
      await loadData();
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    await dbService.updateOrderStatus(orderId, newStatus, `Seller marked order as ${newStatus}.`);
    await loadData();
  };

  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docUrl.trim()) return;

    await dbService.submitSellerVerification(currentSeller.id, docUrl, docType, docNotes);
    setDocSuccess(true);
    setTimeout(() => setDocSuccess(false), 3000);
    await loadData();
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSellerProfile({
      storeName,
      district,
      address,
      bio,
      momoNumber,
      momoNetwork,
    });
    alert('Store profile updated successfully!');
    await loadData();
  };

  // Metrics
  const totalSalesUGX = orders.reduce((sum, o) => sum + o.totalUGX, 0);
  const pendingOrdersCount = orders.filter((o) => o.status === 'Pending').length;
  const totalWishlistSaves = Object.values(wishlistCounts).reduce<number>((a: number, b: number) => a + b, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Top Banner / Store Header */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden mb-6">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <img
              src={currentSeller.logoUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=200&q=80'}
              alt={currentSeller.storeName}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-white/20 shrink-0"
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black">{currentSeller.storeName}</h1>
                {currentSeller.isVerified ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2.5 py-0.5 rounded-full">
                    <ShieldCheck className="w-3.5 h-3.5" /> Verified Store
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 px-2.5 py-0.5 rounded-full">
                    <Clock className="w-3.5 h-3.5" /> Unverified Seller
                  </span>
                )}
                {currentSeller.status === 'pending' && (
                  <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase">
                    Admin Approval Pending
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {currentSeller.district} • MoMo Payout: {currentSeller.momoNetwork || 'MTN'} (
                {currentSeller.momoNumber || currentSeller.phone})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onBackToShopping}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" /> View Storefront
            </button>
            <button
              onClick={handleOpenAddProduct}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Product
            </button>
          </div>
        </div>
      </div>

      {/* Guided Verification Banner for Unverified Sellers */}
      {!currentSeller.isVerified && (
        <div className="mb-6 p-5 sm:p-6 rounded-3xl bg-linear-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-slate-900 border-2 border-amber-300 dark:border-amber-700/80 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-amber-200 dark:border-amber-800/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Merchant KYC & Verification Checklist</span>
                  <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                    Action Required
                  </span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  Complete these 3 steps to earn the verified merchant badge and activate automatic MoMo order settlements.
                </p>
              </div>
            </div>

            {!currentSeller.verificationDocumentUrl ? (
              <button
                onClick={() => setActiveTab('verification')}
                className="px-4 py-2.5 bg-linear-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Upload National ID / Business License Now</span>
              </button>
            ) : (
              <button
                onClick={() => setActiveTab('verification')}
                className="px-4 py-2 bg-white dark:bg-slate-800 text-amber-800 dark:text-amber-300 font-bold text-xs rounded-xl border border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-slate-750 transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
              >
                <FileText className="w-4 h-4 text-amber-600" />
                <span>View Submitted Documents</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Step 1: Phone Verification */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  1. Phone Verified
                </span>
                {currentSeller.isPhoneVerified ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                    <AlertCircle className="w-3.5 h-3.5" /> Verify Phone Number
                  </span>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {currentSeller.phone || 'No phone registered'}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Required for SMS alerts on new customer orders.
                </p>
              </div>

              {!currentSeller.isPhoneVerified && (
                <form onSubmit={handleVerifyPhone} className="mt-2.5 flex items-center gap-1.5">
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="OTP (e.g. 123456)"
                    className="flex-1 px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-amber-300 dark:border-amber-700 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-colors shrink-0 cursor-pointer"
                  >
                    Verify
                  </button>
                </form>
              )}
            </div>

            {/* Step 2: MoMo Payout Line */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-855 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  2. MoMo Payout Line
                </span>
                {currentSeller.momoNumber ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Configured
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                    <AlertCircle className="w-3.5 h-3.5" /> Missing Line
                  </span>
                )}
              </div>

              <div>
                {currentSeller.momoNumber ? (
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {currentSeller.momoNetwork || 'MTN'} MoMo: {currentSeller.momoNumber}
                  </p>
                ) : (
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                    No Payout Line Registered
                  </p>
                )}
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Direct automated disbursements on order delivery.
                </p>
              </div>

              {!currentSeller.momoNumber ? (
                <button
                  onClick={() => setActiveTab('profile')}
                  className="mt-2.5 w-full py-1.5 px-3 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-bold text-xs rounded-lg border border-amber-200 dark:border-amber-800 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Add Payout Phone</span>
                </button>
              ) : (
                <div className="mt-2.5 text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ready for payouts
                </div>
              )}
            </div>

            {/* Step 3: KYC Identity Upload */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  3. KYC Identity Upload
                </span>
                {currentSeller.isVerified ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                  </span>
                ) : currentSeller.verificationDocumentUrl ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/70 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-700">
                    <Clock className="w-3.5 h-3.5" /> Under Review
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/60 px-2 py-0.5 rounded-full border border-red-200 dark:border-red-800">
                    <AlertCircle className="w-3.5 h-3.5" /> Pending Upload
                  </span>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {currentSeller.verificationDocumentUrl
                    ? (currentSeller.verificationDocumentType?.replace('_', ' ') || 'Document Uploaded')
                    : 'National ID or Business License'}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {currentSeller.verificationDocumentUrl
                    ? 'Compliance team is reviewing your documents.'
                    : 'URSB registration, KCCA permit or NIRA ID.'}
                </p>
              </div>

              <button
                onClick={() => setActiveTab('verification')}
                className="mt-2.5 w-full py-1.5 px-3 bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/50 dark:hover:bg-orange-900/50 text-orange-700 dark:text-orange-300 font-bold text-xs rounded-lg border border-orange-200 dark:border-orange-800 transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{currentSeller.verificationDocumentUrl ? 'Update Document' : 'Upload Document'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {otpSuccess && (
        <div className="mb-6 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> Phone verified successfully!
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6 overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'overview'
              ? 'border-orange-600 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <TrendingUp className="w-4 h-4" /> Store Overview & Analytics
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'products'
              ? 'border-orange-600 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <Package className="w-4 h-4" /> Product Catalog ({products.length})
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'orders'
              ? 'border-orange-600 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <Truck className="w-4 h-4" /> Orders ({orders.length})
          {pendingOrdersCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-orange-600 animate-pulse"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('verification')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'verification'
              ? 'border-orange-600 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4" /> Store Verification
          {currentSeller.isVerified && (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'profile'
              ? 'border-orange-600 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <Store className="w-4 h-4" /> Store Settings
        </button>
      </div>

      {/* Tab 1: Overview with Recharts Charts & Analytics */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Recharts Analytics: Daily Sales, Top Products, Revenue Trends, and Payment Insights */}
          <SellerAnalyticsCharts
            orders={orders}
            products={products}
            sellerStoreName={currentSeller.storeName}
            sellerDistrict={currentSeller.district}
          />

          {/* Wishlist Popularity Table */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-600 fill-rose-600" /> Product Wishlist Popularity
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Monitor which of your products are saved to buyer wishlists across Busia, Busitema, Jinja & Busoga to optimize inventory and flash sales.
            </p>

            <div className="divide-y divide-slate-100">
              {products.map((p) => {
                const count = wishlistCounts[p.id] || 0;
                return (
                  <div key={p.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={p.images[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=150&q=80'}
                        alt=""
                        className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                      />
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{p.title}</h4>
                        <div className="text-[11px] text-slate-500">{formatUGX(p.priceUGX)} • {p.category}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200 flex items-center gap-1">
                        <Heart className="w-3 h-3 fill-rose-600" /> {count} {count === 1 ? 'save' : 'saves'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Products Catalog */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-slate-900">Your Product Listings</h3>
              <p className="text-xs text-slate-500">
                Manage UGX pricing, categories, stock, and photos
              </p>
            </div>
            <button
              onClick={handleOpenAddProduct}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Product
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs flex flex-col justify-between"
              >
                <div className="p-4">
                  <div className="flex gap-3">
                    <img
                      src={p.images[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=200&q=80'}
                      alt=""
                      className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-orange-600 uppercase bg-orange-50 px-2 py-0.5 rounded">
                        {p.category}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-2 mt-1">
                        {p.title}
                      </h4>
                      <div className="text-sm font-black text-slate-900 mt-1">
                        {formatUGX(p.priceUGX)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>Stock: <strong className="text-slate-800">{p.stockQuantity}</strong></span>
                    <span className="flex items-center gap-1 text-rose-600 font-semibold text-[11px]">
                      <Heart className="w-3 h-3 fill-rose-600" /> {wishlistCounts[p.id] || 0} wishlists
                    </span>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex gap-2">
                  <button
                    onClick={() => handleOpenEditProduct(p)}
                    className="flex-1 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-lg border border-slate-200 transition-colors flex items-center justify-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(p.id)}
                    className="p-1.5 bg-white hover:bg-red-50 text-red-600 rounded-lg border border-slate-200 transition-colors"
                    title="Delete product"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Store Orders */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-slate-900">Orders for {currentSeller.storeName}</h3>
          <p className="text-xs text-slate-500">
            Fulfill and update shipping status for customer orders. Updating status notifies the buyer instantly!
          </p>

          {orders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-400">
              No orders received yet for this store.
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-900">{ord.id}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            ord.status === 'Delivered'
                              ? 'bg-emerald-100 text-emerald-800'
                              : ord.status === 'Shipped'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {ord.status}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Placed on {formatDate(ord.createdAt)} by <strong>{ord.buyerName}</strong>
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-extrabold text-slate-900">
                        {formatUGX(ord.totalUGX)}
                      </div>
                      <div className="text-[10px] font-bold text-slate-500">
                        Payment: {ord.paymentMethod.toUpperCase()} ({ord.paymentStatus})
                      </div>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="space-y-2">
                    {ord.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs">
                        <span className="text-slate-800">
                          {it.quantity}x {it.title}
                        </span>
                        <span className="font-bold text-slate-900">
                          {formatUGX(it.priceUGX * it.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Delivery destination */}
                  <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-bold text-slate-800">Delivery Address:</div>
                      {ord.deliveryAddress.gpsCoordinates && (
                        <a
                          href={`https://maps.google.com/?q=${ord.deliveryAddress.gpsCoordinates.latitude ?? ord.deliveryAddress.gpsCoordinates.lat},${ord.deliveryAddress.gpsCoordinates.longitude ?? ord.deliveryAddress.gpsCoordinates.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg border border-emerald-200 transition-colors text-[11px] shadow-2xs"
                          title="Open direct Google Maps GPS navigation pin"
                        >
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Open Delivery Pin on Google Maps</span>
                          <ExternalLink className="w-3 h-3 text-emerald-500 shrink-0" />
                        </a>
                      )}
                    </div>
                    <p className="text-slate-600">{ord.deliveryAddress.fullName} • {ord.deliveryAddress.phone}</p>
                    <p className="text-slate-500">{ord.deliveryAddress.streetAddress}, {ord.deliveryAddress.divisionOrTown}, {ord.deliveryAddress.district}</p>
                    {ord.deliveryAddress.notes && (
                      <p className="text-slate-500 italic mt-0.5">Notes: {ord.deliveryAddress.notes}</p>
                    )}
                  </div>

                  {/* Status Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-600">Update Status:</span>
                    <button
                      onClick={() => handleUpdateOrderStatus(ord.id, 'Confirmed')}
                      disabled={ord.status !== 'Pending'}
                      className="px-3 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs rounded-lg border border-purple-200 disabled:opacity-40 transition-colors"
                    >
                      Confirm Order
                    </button>
                    <button
                      onClick={() => handleUpdateOrderStatus(ord.id, 'Shipped')}
                      disabled={ord.status === 'Shipped' || ord.status === 'Delivered'}
                      className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-lg border border-blue-200 disabled:opacity-40 transition-colors"
                    >
                      Mark Shipped
                    </button>
                    <button
                      onClick={() => handleUpdateOrderStatus(ord.id, 'Delivered')}
                      disabled={ord.status === 'Delivered'}
                      className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-lg border border-emerald-200 disabled:opacity-40 transition-colors"
                    >
                      Mark Delivered
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Seller Verification System */}
      {activeTab === 'verification' && (
        <div className="max-w-2xl bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-orange-600" />
                Seller Verification & KYC Compliance
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Upload your official Ugandan business or national identity documentation to receive the
                verified merchant badge and boost buyer trust.
              </p>
            </div>
            {currentSeller.isVerified ? (
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold shrink-0 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Verified
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold shrink-0">
                Pending Verification
              </span>
            )}
          </div>

          {currentSeller.verificationDocumentUrl && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="font-bold text-slate-800">Current Submitted Document:</div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 capitalize">
                  Type: {currentSeller.verificationDocumentType?.replace('_', ' ')}
                </span>
                <a
                  href={currentSeller.verificationDocumentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-orange-600 hover:underline flex items-center gap-1 font-bold"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> View Uploaded Document
                </a>
              </div>
              {currentSeller.verificationNotes && (
                <p className="text-slate-500 italic mt-1">{currentSeller.verificationNotes}</p>
              )}
            </div>
          )}

          {docSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Document uploaded and sent to SwiftCart Compliance Team!
            </div>
          )}

          <form onSubmit={handleSubmitVerification} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Document Type *
              </label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as VerificationDocumentType)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500"
              >
                <option value="business_registration">URSB Business Registration / Certificate</option>
                <option value="trading_license">KCCA / Municipal Trading License</option>
                <option value="national_id">National ID (NIRA Uganda)</option>
                <option value="passport">Ugandan Passport</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Document Scanned URL or File Link *
              </label>
              <input
                type="url"
                required
                value={docUrl}
                onChange={(e) => setDocUrl(e.target.value)}
                placeholder="https://example.com/ursb-cert-scan.jpg"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500"
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setDocUrl('https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80')
                  }
                  className="text-[11px] text-orange-600 bg-orange-50 hover:bg-orange-100 px-2.5 py-1 rounded-lg border border-orange-200 transition-colors font-medium"
                >
                  Use Sample URSB Certificate
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setDocUrl('https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80')
                  }
                  className="text-[11px] text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors font-medium"
                >
                  Use Sample National ID Scan
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Additional Notes / Registration Number
              </label>
              <textarea
                rows={2}
                value={docNotes}
                onChange={(e) => setDocNotes(e.target.value)}
                placeholder="e.g. URSB Registration Number 800200034..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" /> Submit Documents for Verification
            </button>
          </form>
        </div>
      )}

      {/* Tab 5: Store Profile Settings */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="max-w-xl bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900">Store Profile & Payout Settings</h3>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Store Name</label>
            <input
              type="text"
              required
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">District</label>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500"
            >
              {UGANDA_DISTRICTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Physical Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Store Bio</label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 mb-2">Mobile Money Payout Account</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-600 mb-1">Network</label>
                <select
                  value={momoNetwork}
                  onChange={(e) => setMomoNetwork(e.target.value as 'MTN' | 'Airtel')}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="MTN">MTN MoMo</option>
                  <option value="Airtel">Airtel Money</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-1">MoMo Phone Number</label>
                <input
                  type="tel"
                  value={momoNumber}
                  onChange={(e) => setMomoNumber(e.target.value)}
                  placeholder="0772 123456"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
          >
            Save Store Profile
          </button>
        </form>
      )}

      {/* Add / Edit Product Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden border border-slate-200 my-6 flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm">
                {editingProduct ? 'Edit Product Listing' : 'Add New Product Listing'}
              </h3>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Product Title *</label>
                <input
                  type="text"
                  required
                  value={prodTitle}
                  onChange={(e) => setProdTitle(e.target.value)}
                  placeholder="e.g. Samsung Galaxy A55 5G (8GB RAM, 256GB)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value as ProductCategory)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="Phones & Tablets">Phones & Tablets</option>
                    <option value="Electronics & Audio">Electronics & Audio</option>
                    <option value="Supermarket & Groceries">Supermarket & Groceries</option>
                    <option value="Fashion & Apparel">Fashion & Apparel</option>
                    <option value="Home & Appliances">Home & Appliances</option>
                    <option value="Health & Beauty">Health & Beauty</option>
                    <option value="Computing & IT">Computing & IT</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Stock Quantity *</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={prodStock}
                    onChange={(e) => setProdStock(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Price (UGX) *</label>
                  <input
                    type="number"
                    min={1000}
                    step={500}
                    required
                    value={prodPriceUGX}
                    onChange={(e) => setProdPriceUGX(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Original Price (UGX, for discount badge)</label>
                  <input
                    type="number"
                    min={1000}
                    step={500}
                    value={prodOriginalPriceUGX}
                    onChange={(e) => setProdOriginalPriceUGX(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Product Description *</label>
                <textarea
                  rows={3}
                  required
                  value={prodDescription}
                  onChange={(e) => setProdDescription(e.target.value)}
                  placeholder="Key features, specs, warranty in Uganda..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              {/* Up to 4 Images: Hybrid File Upload & URL Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold text-slate-700">
                    Product Photos ({prodImages.length}/4) *
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Upload from Camera, Gallery, or enter Image URL
                  </span>
                </div>

                {/* Upload Buttons */}
                <div className="flex flex-wrap gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    multiple
                    onChange={handleFilesSelected}
                    className="hidden"
                  />

                  <button
                    type="button"
                    disabled={isUploadingImages || prodImages.length >= 4}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-xl font-bold transition-all disabled:opacity-50 text-xs"
                  >
                    {isUploadingImages ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
                        <span>Compressing & Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4 text-orange-600" />
                        <span>Upload Photos / Camera</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Direct Image URL input option */}
                {prodImages.length < 4 && (
                  <div className="flex gap-2 items-center pt-1">
                    <input
                      type="url"
                      value={imageInputUrl}
                      onChange={(e) => setImageInputUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddUrlImage();
                        }
                      }}
                      placeholder="Or paste an image web link (https://...)"
                      className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleAddUrlImage}
                      disabled={!imageInputUrl.trim()}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs disabled:opacity-40"
                    >
                      Add URL
                    </button>
                  </div>
                )}

                {/* Removable Image Preview Chips */}
                {prodImages.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                    {prodImages.map((imgUrl, idx) => (
                      <div
                        key={idx}
                        className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-xs"
                      >
                        <img
                          src={imgUrl}
                          alt={`Product preview ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-md transition-colors"
                            title="Remove image"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className="absolute top-1 left-1 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                          #{idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="expressDelivery"
                  checked={prodExpress}
                  onChange={(e) => setProdExpress(e.target.checked)}
                  className="accent-orange-600 rounded"
                />
                <label htmlFor="expressDelivery" className="font-semibold text-slate-700">
                  ⚡ Swift Express Eligible (Fast doorstep delivery across Uganda)
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-md"
                >
                  {editingProduct ? 'Save Changes' : 'Create Listing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
