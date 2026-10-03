import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Product, ProductVariant, Review, Seller } from '../types';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/db';
import { formatUGX, calculateDiscount, formatDate } from '../utils/formatters';
import { ProductSellerChatModal } from './ProductSellerChatModal';
import {
  ArrowLeft,
  Search,
  ShoppingCart,
  Heart,
  Share2,
  Star,
  Zap,
  Store,
  ShieldCheck,
  Truck,
  RotateCcw,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  MessageSquare,
  Sparkles,
  Lock,
  Clock,
  Package,
  Check,
  AlertCircle,
  X,
  Plus,
  Minus,
  ExternalLink,
  MapPin,
  Send,
} from 'lucide-react';

interface ProductDetailPageProps {
  product: Product;
  onBack: () => void;
  onOpenCart: () => void;
  onBuyNow: (product: Product, selectedVariant?: ProductVariant, quantity?: number) => void;
  onViewSeller?: (sellerId: string) => void;
  onOpenSearch?: () => void;
  allProducts?: Product[];
  onSelectProduct?: (prod: Product) => void;
}

interface DeliveryZoneOption {
  id: string;
  name: string;
  feeUGX: number;
  timeEstimate: string;
  expressAvailable: boolean;
}

const UGANDA_DELIVERY_ZONES: DeliveryZoneOption[] = [
  { id: 'kla_central', name: 'Kampala Central (City Centre, Kololo, Nakasero)', feeUGX: 3000, timeEstimate: 'Today, 2–4 Hours', expressAvailable: true },
  { id: 'kla_nakawa', name: 'Nakawa Division (Bugolobi, Ntinda, Kyambogo)', feeUGX: 3500, timeEstimate: 'Today, 2–4 Hours', expressAvailable: true },
  { id: 'kla_makindye', name: 'Makindye & Kansanga (Ggaba, Muyenga, Kibuli)', feeUGX: 3500, timeEstimate: 'Today, 3–5 Hours', expressAvailable: true },
  { id: 'kla_kawempe', name: 'Kawempe & Bwaise (Kalerwe, Kisaasi)', feeUGX: 4000, timeEstimate: 'Today, 3–5 Hours', expressAvailable: true },
  { id: 'kla_rubaga', name: 'Rubaga & Mengo (Natete, Lungujja, Kasubi)', feeUGX: 4000, timeEstimate: 'Today, 3–5 Hours', expressAvailable: true },
  { id: 'wakiso_kira', name: 'Wakiso / Kira Municipality (Najjera, Kiwatule)', feeUGX: 4500, timeEstimate: 'Same Day, 3–5 Hours', expressAvailable: true },
  { id: 'wakiso_entebbe', name: 'Entebbe Town & Airport Corridor', feeUGX: 6000, timeEstimate: 'Same Day, 4–6 Hours', expressAvailable: false },
  { id: 'mukono_town', name: 'Mukono Town & Seeta Corridor', feeUGX: 5500, timeEstimate: 'Same Day, 4–6 Hours', expressAvailable: false },
  { id: 'jinja_city', name: 'Jinja City & Eastern Corridor', feeUGX: 8000, timeEstimate: 'Next Day Delivery', expressAvailable: false },
  { id: 'busia_border', name: 'Busia Border Customs Zone', feeUGX: 7500, timeEstimate: 'Next Day Delivery', expressAvailable: false },
  { id: 'mbarara_city', name: 'Mbarara City & Western Hub', feeUGX: 10000, timeEstimate: '24–48 Hours', expressAvailable: false },
  { id: 'gulu_city', name: 'Gulu City & Northern Hub', feeUGX: 12000, timeEstimate: '24–48 Hours', expressAvailable: false },
];

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  product,
  onBack,
  onOpenCart,
  onBuyNow,
  onViewSeller,
  onOpenSearch,
  allProducts = [],
  onSelectProduct,
}) => {
  const { addToCart, totalItemsCount } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { currentUser } = useAuth();

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedZone, setSelectedZone] = useState<DeliveryZoneOption>(UGANDA_DELIVERY_ZONES[0]);
  const [quantity, setQuantity] = useState(1);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isSellerChatOpen, setIsSellerChatOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [addedToast, setAddedToast] = useState(false);

  // Accordion state
  const [openAccordion, setOpenAccordion] = useState<string | null>('specs');

  // Reviews and Seller data
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [seller, setSeller] = useState<Seller | null>(null);

  // New Review form state
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  const images = useMemo(() => {
    if (product.images && product.images.length > 0) return product.images;
    return ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80'];
  }, [product.images]);

  // Default first variant if variants exist
  useEffect(() => {
    if (product.variants && product.variants.length > 0) {
      setSelectedVariant(product.variants[0]);
    } else {
      setSelectedVariant(null);
    }
    setActiveImageIndex(0);
    setQuantity(1);
  }, [product.id, product.variants]);

  // Load reviews & seller info
  useEffect(() => {
    let isMounted = true;
    const loadDetails = async () => {
      setLoadingReviews(true);
      try {
        const [revs, sellerData] = await Promise.all([
          dbService.getReviews(product.id),
          dbService.getSellerById(product.sellerId),
        ]);
        if (isMounted) {
          setReviews(revs);
          setSeller(sellerData);
        }
      } catch (e) {
        console.warn('PDP load reviews note:', e);
      } finally {
        if (isMounted) setLoadingReviews(false);
      }
    };
    loadDetails();
    return () => {
      isMounted = false;
    };
  }, [product.id, product.sellerId]);

  // Calculated pricing with variant price offset
  const baseListingPrice = product.priceUGX;
  const currentPriceUGX = selectedVariant
    ? baseListingPrice + (selectedVariant.additionalPrice || 0)
    : baseListingPrice;

  const currentOriginalPriceUGX = product.originalPriceUGX
    ? selectedVariant
      ? product.originalPriceUGX + (selectedVariant.additionalPrice || 0)
      : product.originalPriceUGX
    : Math.round(currentPriceUGX * 1.15);

  const discountPercent = calculateDiscount(currentPriceUGX, currentOriginalPriceUGX);

  const currentStock = selectedVariant
    ? selectedVariant.stockQuantity
    : product.stockQuantity;

  const isWished = isInWishlist(product.id);

  // Handle Share (Web Share API with fallback to copy link)
  const handleShare = async () => {
    const shareData = {
      title: `${product.title} | SwiftCart Uganda`,
      text: `Buy ${product.title} for ${formatUGX(currentPriceUGX)} with MoMo Escrow Protection on SwiftCart Uganda.`,
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // Ignored if cancelled
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleAddToCart = () => {
    addToCart(product, selectedVariant || undefined, quantity);
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 2500);
  };

  const handleBuyNow = () => {
    onBuyNow(product, selectedVariant || undefined, quantity);
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUser) return;

    setSubmittingReview(true);
    const newRev: Review = {
      id: `rev_${Date.now()}`,
      productId: product.id,
      buyerId: currentUser.id,
      buyerName: currentUser.name,
      rating: newRating,
      comment: newComment.trim(),
      verifiedPurchase: true,
      createdAt: new Date().toISOString(),
    };

    await dbService.addReview(newRev);
    setReviews((prev) => [newRev, ...prev]);
    setNewComment('');
    setSubmittingReview(false);
    setReviewSuccess(true);
    setTimeout(() => setReviewSuccess(false), 3500);
  };

  const similarProducts = useMemo(() => {
    return allProducts
      .filter((p) => p.id !== product.id && p.category === product.category)
      .slice(0, 4);
  }, [allProducts, product.id, product.category]);

  const toggleAccordion = (id: string) => {
    setOpenAccordion(openAccordion === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-28 sm:pb-16 transition-colors duration-200">
      {/* ========================================================= */}
      {/* 1. STICKY TOP COMPACT HEADER */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between gap-2">
          {/* Back button */}
          <button
            onClick={onBack}
            className="p-2 -ml-1 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1"
            title="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-xs font-bold hidden sm:inline">Back</span>
          </button>

          {/* Center Brand / Category Breadcrumb */}
          <div className="flex-1 truncate text-center px-2">
            <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 truncate block">
              {product.title}
            </span>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-1">
            {onOpenSearch && (
              <button
                onClick={onOpenSearch}
                className="p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Search Marketplace"
              >
                <Search className="w-5 h-5" />
              </button>
            )}

            <button
              onClick={handleShare}
              className="p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer relative"
              title="Share product link"
            >
              <Share2 className="w-5 h-5" />
              {copiedLink && (
                <span className="absolute -bottom-7 right-0 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg whitespace-nowrap animate-in fade-in">
                  Link Copied!
                </span>
              )}
            </button>

            <button
              onClick={() => toggleWishlist(product)}
              className="p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={isWished ? 'Saved to Wishlist' : 'Add to Wishlist'}
            >
              <Heart
                className={`w-5 h-5 transition-colors ${
                  isWished ? 'fill-rose-500 text-rose-500' : ''
                }`}
              />
            </button>

            <button
              onClick={onOpenCart}
              className="p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer relative"
              title="View Cart"
            >
              <ShoppingCart className="w-5 h-5" />
              {totalItemsCount > 0 && (
                <span className="absolute 1 top-1 right-1 w-4 h-4 bg-orange-600 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-xs">
                  {totalItemsCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Added to Cart Notification Toast */}
      {addedToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl border border-slate-700 text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Added to your cart!</span>
          <button onClick={onOpenCart} className="underline text-orange-400 ml-1">
            View Cart
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* MAIN CONTENT CONTAINER (MOBILE-FIRST) */}
      {/* ========================================================= */}
      <main className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-6 space-y-4 sm:space-y-6">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 overflow-x-auto no-scrollbar">
          <button onClick={onBack} className="hover:text-orange-600 transition-colors whitespace-nowrap">
            Home
          </button>
          <ChevronRight className="w-3.5 h-3.5 shrink-0 text-slate-400" />
          <span className="whitespace-nowrap font-medium text-slate-700 dark:text-slate-300">
            {product.category}
          </span>
          {product.brand && (
            <>
              <ChevronRight className="w-3.5 h-3.5 shrink-0 text-slate-400" />
              <span className="whitespace-nowrap font-bold text-orange-600 dark:text-orange-400">
                {product.brand}
              </span>
            </>
          )}
        </nav>

        {/* 2-Column Responsive Layout on Desktop, 1-Column on Mobile */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-8">
          {/* ========================================================= */}
          {/* LEFT: MEDIA GALLERY & TOUCH CAROUSEL (7 cols) */}
          {/* ========================================================= */}
          <div className="md:col-span-7 space-y-3">
            {/* Primary Carousel Image */}
            <div
              onClick={() => setIsLightboxOpen(true)}
              className="relative aspect-square sm:aspect-4/3 w-full rounded-3xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs cursor-zoom-in group"
            >
              <img
                src={images[activeImageIndex]}
                alt={product.title}
                className="w-full h-full object-contain p-2 sm:p-4 group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80';
                }}
              />

              {/* Floating Badges */}
              <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start pointer-events-none">
                {discountPercent && (
                  <span className="bg-orange-600 text-white text-xs font-black px-2.5 py-1 rounded-xl shadow-md">
                    -{discountPercent}% OFF
                  </span>
                )}
                {product.isExpressDelivery && (
                  <span className="bg-amber-400 text-slate-900 text-[11px] font-extrabold px-2.5 py-1 rounded-xl flex items-center gap-1 shadow-md">
                    <Zap className="w-3 h-3 fill-slate-900" /> ⚡ Express Delivery
                  </span>
                )}
              </div>

              {/* Pagination Badge indicator */}
              <div className="absolute bottom-3 right-3 bg-slate-950/70 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-full border border-white/10 shadow-md">
                {activeImageIndex + 1} / {images.length}
              </div>

              {/* Tap to Zoom hint */}
              <div className="absolute bottom-3 left-3 bg-slate-950/60 backdrop-blur-xs text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                🔍 Tap to expand
              </div>
            </div>

            {/* Thumbnail Navigation Row */}
            {images.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 shrink-0 bg-white dark:bg-slate-900 transition-all cursor-pointer ${
                      activeImageIndex === idx
                        ? 'border-orange-600 ring-2 ring-orange-500/30'
                        : 'border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* RIGHT: DETAILS, PRICING, VARIANTS, & DELIVERY (5 cols) */}
          {/* ========================================================= */}
          <div className="md:col-span-5 space-y-4">
            {/* Title & Brand */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/60 px-2 py-0.5 rounded-md border border-orange-200 dark:border-orange-900/60">
                  {product.category}
                </span>
                {product.brand && (
                  <span className="text-xs font-bold text-slate-500">
                    Brand: <strong>{product.brand}</strong>
                  </span>
                )}
              </div>

              <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white leading-snug">
                {product.title}
              </h1>

              {/* Rating & Social Proof */}
              <div className="flex items-center gap-3 text-xs pt-0.5">
                <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-900 font-black">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>{product.rating?.toFixed(1) || '4.9'}</span>
                </div>
                <button
                  onClick={() => toggleAccordion('reviews')}
                  className="text-slate-500 hover:text-orange-600 underline font-medium cursor-pointer"
                >
                  ({reviews.length || product.reviewCount || 12} customer reviews)
                </button>
              </div>
            </div>

            {/* Price & Urgency Box */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-baseline gap-2.5">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  {formatUGX(currentPriceUGX)}
                </span>
                {currentOriginalPriceUGX > currentPriceUGX && (
                  <span className="text-sm font-semibold text-slate-400 line-through">
                    {formatUGX(currentOriginalPriceUGX)}
                  </span>
                )}
              </div>

              {/* Stock Urgency Chip */}
              {currentStock <= 5 && currentStock > 0 ? (
                <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 text-xs font-extrabold flex items-center gap-1.5 animate-pulse">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Only {currentStock} units left in stock! Order soon.</span>
                </div>
              ) : currentStock === 0 ? (
                <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Temporarily Out of Stock</span>
                </div>
              ) : (
                <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>In Stock ({currentStock} available in Uganda warehouse)</span>
                </div>
              )}
            </div>

            {/* Verified Seller Origin Card */}
            <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-600 flex items-center justify-center text-white font-bold shrink-0">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-slate-900 dark:text-white truncate max-w-[170px]">
                      {product.sellerStoreName}
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-[9px] font-black flex items-center gap-0.5">
                      <ShieldCheck className="w-2.5 h-2.5" /> Verified
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Location: {product.sellerDistrict || 'Kampala Central'} • ★ {seller?.rating?.toFixed(1) || '4.9'}
                  </span>
                </div>
              </div>

              {onViewSeller && (
                <button
                  onClick={() => onViewSeller(product.sellerId)}
                  className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-orange-600 text-[11px] font-bold border border-slate-200 dark:border-slate-700 transition-colors shrink-0 cursor-pointer"
                >
                  Visit Store
                </button>
              )}
            </div>

            {/* ========================================================= */}
            {/* VARIANT SELECTORS (COLORS / SIZES / STORAGE) */}
            {/* ========================================================= */}
            {product.variants && product.variants.length > 0 && (
              <div className="space-y-2.5 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-slate-900 dark:text-white">
                    Select Option / Variant:
                  </span>
                  {selectedVariant && (
                    <span className="text-orange-600 dark:text-orange-400 font-bold">
                      {selectedVariant.variantName}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {product.variants.map((v) => {
                    const isSelected = selectedVariant?.id === v.id;
                    const isOutOfStock = v.stockQuantity === 0;

                    return (
                      <button
                        key={v.id}
                        type="button"
                        disabled={isOutOfStock}
                        onClick={() => setSelectedVariant(v)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-start gap-0.5 ${
                          isSelected
                            ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                            : isOutOfStock
                            ? 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 border-slate-200 dark:border-slate-800 line-through cursor-not-allowed opacity-50'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-orange-500'
                        }`}
                      >
                        <span>{v.variantName}</span>
                        <span className={`text-[10px] ${isSelected ? 'text-orange-100' : 'text-slate-400'}`}>
                          {v.additionalPrice > 0 ? `+${formatUGX(v.additionalPrice)}` : 'Base Price'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity Selector */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs text-xs">
              <span className="font-bold text-slate-900 dark:text-white">Quantity</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 disabled:opacity-30 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold hover:bg-slate-200 cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-8 text-center font-black text-sm text-slate-900 dark:text-white">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(currentStock || 10, q + 1))}
                  disabled={quantity >= (currentStock || 10)}
                  className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 disabled:opacity-30 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold hover:bg-slate-200 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* ========================================================= */}
            {/* UPFRONT DELIVERY ESTIMATOR (UGANDAN ZONES) */}
            {/* ========================================================= */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white">
                  <Truck className="w-4 h-4 text-orange-600" />
                  <span>Delivery Estimate to Your Location</span>
                </div>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                  Direct Dispatch
                </span>
              </div>

              {/* Delivery Zone Select */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Destination District / Area
                </label>
                <select
                  value={selectedZone.id}
                  onChange={(e) => {
                    const found = UGANDA_DELIVERY_ZONES.find((z) => z.id === e.target.value);
                    if (found) setSelectedZone(found);
                  }}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-hidden cursor-pointer"
                >
                  {UGANDA_DELIVERY_ZONES.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic Rates & Timing */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-orange-600" />
                    <span>Est. Arrival: <strong>{selectedZone.timeEstimate}</strong></span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Dispatched with verified 4-digit Handover OTP</p>
                </div>
                <div className="text-right">
                  <span className="font-black text-sm text-slate-900 dark:text-white">
                    {formatUGX(selectedZone.feeUGX)}
                  </span>
                  <span className="text-[9px] text-slate-400 block">Shipping fee</span>
                </div>
              </div>
            </div>

            {/* ========================================================= */}
            {/* ESCROW TRUST & BUYER PROTECTION CARD */}
            {/* ========================================================= */}
            <div className="p-4 rounded-2xl bg-linear-to-br from-slate-900 to-slate-800 text-white shadow-lg space-y-2.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="font-extrabold text-xs tracking-wide">SwiftCart Buyer Shield Guaranteed</span>
              </div>
              <ul className="space-y-1.5 text-[11px] text-slate-300">
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>MoMo Escrow Protection:</strong> Funds remain securely held until you inspect and give the 4-digit OTP to the courier.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>7-Day Free Returns:</strong> Full refund if the product is damaged or not as described.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>100% Genuine Guaranteed:</strong> Sourced from vetted Ugandan verified shops.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* COLLAPSIBLE INFORMATION ACCORDIONS */}
        {/* ========================================================= */}
        <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          {/* 1. KEY SPECIFICATIONS */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => toggleAccordion('specs')}
              className="w-full p-4 flex items-center justify-between text-left font-extrabold text-sm text-slate-900 dark:text-white cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <span>Product Specifications & Details</span>
              {openAccordion === 'specs' ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {openAccordion === 'specs' && (
              <div className="p-4 pt-0 border-t border-slate-100 dark:border-slate-800 space-y-3 text-xs">
                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                  {product.description || 'No description provided.'}
                </p>

                {product.specifications && product.specifications.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                    {product.specifications.map((spec, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-between text-xs"
                      >
                        <span className="text-slate-500">{spec.name}</span>
                        <span className="font-bold text-slate-900 dark:text-white text-right">{spec.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. WHAT'S IN THE BOX */}
          {product.whatsInTheBox && (
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
              <button
                type="button"
                onClick={() => toggleAccordion('box')}
                className="w-full p-4 flex items-center justify-between text-left font-extrabold text-sm text-slate-900 dark:text-white cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <span>Package Contents (What's in the Box)</span>
                {openAccordion === 'box' ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>
              {openAccordion === 'box' && (
                <div className="p-4 pt-0 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200/60 dark:border-amber-900/40 flex items-start gap-2">
                    <Package className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                    <span>{product.whatsInTheBox}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. CUSTOMER REVIEWS & RATINGS */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => toggleAccordion('reviews')}
              className="w-full p-4 flex items-center justify-between text-left font-extrabold text-sm text-slate-900 dark:text-white cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <span>Customer Reviews ({reviews.length})</span>
              {openAccordion === 'reviews' ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {openAccordion === 'reviews' && (
              <div className="p-4 pt-0 border-t border-slate-100 dark:border-slate-800 space-y-4 text-xs">
                {/* Reviews List */}
                {reviews.length > 0 ? (
                  <div className="space-y-3">
                    {reviews.map((rev) => (
                      <div key={rev.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white">{rev.buyerName}</span>
                          <div className="flex items-center text-amber-400">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3 h-3 ${i < rev.rating ? 'fill-amber-400' : 'text-slate-300'}`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 text-xs">{rev.comment}</p>
                        <span className="text-[10px] text-slate-400 block">{formatDate(rev.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 py-2">No reviews yet for this product. Be the first to review!</p>
                )}

                {/* Submit Review Form */}
                {currentUser ? (
                  <form onSubmit={handleAddReview} className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl space-y-3">
                    <span className="font-bold text-slate-900 dark:text-white block">Write a Product Review</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewRating(star)}
                          className="p-1 cursor-pointer"
                        >
                          <Star className={`w-5 h-5 ${star <= newRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                        </button>
                      ))}
                    </div>
                    <textarea
                      rows={2}
                      required
                      placeholder="Share your experience with the item quality, delivery, and authenticity..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-hidden"
                    />
                    <button
                      type="submit"
                      disabled={submittingReview || !newComment.trim()}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{submittingReview ? 'Posting...' : 'Post Review'}</span>
                    </button>
                    {reviewSuccess && (
                      <span className="text-xs font-bold text-emerald-600 block">Thank you! Your review is posted.</span>
                    )}
                  </form>
                ) : (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-center text-slate-500">
                    Sign in to leave a verified purchase review.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* SIMILAR PRODUCTS CAROUSEL SHELF */}
        {/* ========================================================= */}
        {similarProducts.length > 0 && (
          <div className="space-y-3 pt-6 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                Similar Products You May Like
              </h3>
              <span className="text-xs text-orange-600 font-bold">{product.category}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {similarProducts.map((p) => (
                <div
                  key={p.id}
                  onClick={() => onSelectProduct ? onSelectProduct(p) : null}
                  className="p-2.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-orange-500 transition-all cursor-pointer space-y-2 group"
                >
                  <div className="aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <img
                      src={p.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=300&q=80'}
                      alt={p.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">{p.title}</h4>
                    <span className="font-black text-xs text-orange-600 dark:text-orange-400 block mt-0.5">
                      {formatUGX(p.priceUGX)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* FULLSCREEN LIGHTBOX MODAL (TAP-TO-EXPAND IMAGE) */}
      {/* ========================================================= */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-70 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 animate-in fade-in">
          <div className="flex items-center justify-between text-white">
            <span className="text-xs font-bold font-mono">
              {activeImageIndex + 1} / {images.length}
            </span>
            <button
              onClick={() => setIsLightboxOpen(false)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center p-2">
            <img
              src={images[activeImageIndex]}
              alt={product.title}
              className="max-h-[80vh] max-w-full object-contain rounded-2xl"
            />
          </div>

          <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImageIndex(idx)}
                className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                  activeImageIndex === idx ? 'border-orange-500 scale-105' : 'border-transparent opacity-50'
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* IN-APP DIRECT BUYER-TO-SELLER SAFETY CHAT DRAWER */}
      {/* ========================================================= */}
      <ProductSellerChatModal
        isOpen={isSellerChatOpen}
        onClose={() => setIsSellerChatOpen(false)}
        product={product}
        selectedVariant={selectedVariant}
        seller={seller}
      />

      {/* ========================================================= */}
      {/* STICKY BOTTOM ACTION BAR (THUMB-ZONE NAVIGATION) */}
      {/* ========================================================= */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-2xl p-2.5 sm:p-3">
        <div className="max-w-4xl mx-auto flex items-center gap-2 sm:gap-3">
          {/* 1. Chat Button */}
          <button
            type="button"
            onClick={() => setIsSellerChatOpen(true)}
            className="p-3 sm:px-4 sm:py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex flex-col sm:flex-row items-center justify-center gap-1 transition-colors cursor-pointer shrink-0"
            title="Chat with Verified Seller"
          >
            <MessageSquare className="w-5 h-5 text-orange-600 shrink-0" />
            <span className="text-[10px] sm:text-xs font-extrabold">Chat Seller</span>
          </button>

          {/* 2. Add to Cart Button */}
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={currentStock === 0}
            className="flex-1 py-3 px-3 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-black text-xs sm:text-sm shadow-md transition-all active:scale-[0.98] disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Add to Cart</span>
          </button>

          {/* 3. Buy Now Button */}
          <button
            type="button"
            onClick={handleBuyNow}
            disabled={currentStock === 0}
            className="flex-1 py-3 px-3 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs sm:text-sm shadow-lg transition-all active:scale-[0.98] disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Zap className="w-4 h-4 fill-white" />
            <span>Buy Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};
