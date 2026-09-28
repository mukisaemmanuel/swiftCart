import React, { useState, useEffect } from 'react';
import { Product, Review } from '../types';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/db';
import { formatUGX, calculateDiscount, formatDate } from '../utils/formatters';
import {
  X,
  Star,
  Zap,
  ShoppingBag,
  Heart,
  Truck,
  ShieldCheck,
  Store,
  CheckCircle2,
  Share2,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onViewSeller?: (sellerId: string) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onViewSeller,
}) => {
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { currentUser } = useAuth();

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // Review Form
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  // Seller profile info
  const [sellerVerified, setSellerVerified] = useState(false);

  useEffect(() => {
    if (!product) return;
    setActiveImageIndex(0);
    setQuantity(1);
    setReviewSuccess(false);

    const loadReviewsAndSeller = async () => {
      setLoadingReviews(true);
      const revs = await dbService.getReviews(product.id);
      setReviews(revs);

      const seller = await dbService.getSellerById(product.sellerId);
      if (seller) {
        setSellerVerified(seller.isVerified);
      }
      setLoadingReviews(false);
    };

    loadReviewsAndSeller();
  }, [product?.id]);

  if (!product) return null;

  const isWished = isInWishlist(product.id);
  const discount = calculateDiscount(product.priceUGX, product.originalPriceUGX);

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
    setTimeout(() => setReviewSuccess(false), 3000);
  };

  const images = product.images && product.images.length > 0
    ? product.images
    : ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 my-4 flex flex-col max-h-[92vh] transition-colors duration-200">
        {/* Top bar */}
        <div className="p-3.5 px-5 bg-slate-900 dark:bg-slate-950 text-white flex justify-between items-center shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span>Marketplace</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-orange-400 font-semibold">{product.category}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {/* Left: Gallery */}
            <div className="space-y-3">
              {/* Main Image */}
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 group">
                <img
                  src={images[activeImageIndex]}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />

                {discount && (
                  <div className="absolute top-3 left-3 bg-orange-600 text-white text-xs font-black px-2.5 py-1 rounded-lg shadow-sm">
                    -{discount}% OFF
                  </div>
                )}

                <button
                  onClick={() => toggleWishlist(product)}
                  className={`absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center transition-transform active:scale-90 shadow-md ${
                    isWished
                      ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400'
                      : 'bg-white/90 dark:bg-slate-850/90 text-slate-400 hover:text-rose-500 hover:bg-white dark:hover:bg-slate-800'
                  }`}
                  title={isWished ? 'Saved to Wishlist' : 'Add to Wishlist'}
                >
                  <Heart className={`w-5 h-5 ${isWished ? 'fill-rose-500 text-rose-500 dark:fill-rose-400 dark:text-rose-400' : ''}`} />
                </button>
              </div>

              {/* Thumbnails (Up to 4 images) */}
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                        activeImageIndex === idx
                          ? 'border-orange-600 ring-2 ring-orange-500/20'
                          : 'border-slate-200 dark:border-slate-700 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Details & Buying */}
            <div className="flex flex-col justify-between space-y-4">
              <div>
                {/* Seller & Verification */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <button
                    onClick={() => {
                      if (onViewSeller) onViewSeller(product.sellerId);
                    }}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                  >
                    <Store className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    <span>Store: <strong>{product.sellerStoreName}</strong></span>
                    {sellerVerified && (
                      <span className="flex items-center text-[10px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold px-1.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                        <ShieldCheck className="w-3 h-3 mr-0.5" /> Verified
                      </span>
                    )}
                  </button>
                </div>

                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white leading-snug">
                  {product.title}
                </h1>

                {/* Rating & Review summary */}
                <div className="flex items-center gap-3 mt-2.5">
                  <div className="flex items-center text-amber-500">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span className="text-sm font-bold text-slate-900 dark:text-white ml-1">
                      {product.rating > 0 ? product.rating.toFixed(1) : '5.0'}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                    {reviews.length} Verified {reviews.length === 1 ? 'Rating' : 'Ratings'}
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                    {product.stockQuantity > 0 ? `In Stock (${product.stockQuantity})` : 'Out of Stock'}
                  </span>
                </div>

                {/* Price block */}
                <div className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                  <div className="flex items-baseline gap-3">
                    <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                      {formatUGX(product.priceUGX)}
                    </span>
                    {product.originalPriceUGX && product.originalPriceUGX > product.priceUGX && (
                      <span className="text-sm text-slate-400 dark:text-slate-500 line-through">
                        {formatUGX(product.originalPriceUGX)}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    All prices in Ugandan Shillings (UGX). Inclusive of marketplace VAT.
                  </p>
                </div>

                {/* Delivery Perks */}
                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300 bg-orange-50/50 dark:bg-orange-950/30 p-2.5 rounded-xl border border-orange-200/50 dark:border-orange-800/50">
                    <Truck className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-orange-950 dark:text-orange-200">
                          {product.isExpressDelivery ? '⚡ Swift Express Delivery' : 'Standard Delivery'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                        Swift doorstep delivery across Uganda within 24-48 hours.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 p-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Return Policy: 7 days free returns on eligible defective items nationwide.</span>
                  </div>
                </div>

                {/* Description */}
                <div className="mt-4">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-1">
                    Product Overview
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                    {product.description}
                  </p>
                </div>
              </div>

              {/* Quantity Stepper & Actions */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Quantity</span>
                  <div className="flex items-center border border-slate-300 dark:border-slate-600 rounded-xl overflow-hidden bg-white dark:bg-slate-800">
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                      className="px-3 py-1 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30"
                    >
                      -
                    </button>
                    <span className="px-3 py-1 text-xs font-bold text-slate-800 dark:text-slate-100">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity((q) => Math.min(product.stockQuantity, q + 1))}
                      disabled={quantity >= product.stockQuantity}
                      className="px-3 py-1 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      addToCart(product, quantity);
                      onClose();
                    }}
                    disabled={product.stockQuantity === 0}
                    className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 active:scale-[0.98] disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Add {quantity} to Cart • {formatUGX(product.priceUGX * quantity)}</span>
                  </button>

                  <button
                    onClick={() => toggleWishlist(product)}
                    className={`p-3 rounded-xl border transition-colors flex items-center justify-center ${
                      isWished
                        ? 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                    title={isWished ? 'In Wishlist' : 'Add to Wishlist'}
                  >
                    <Heart className={`w-5 h-5 ${isWished ? 'fill-rose-500' : ''}`} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Reviews & Ratings Section */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-orange-600 dark:text-orange-400" /> Customer Ratings & Reviews
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Real feedback from buyers across Uganda
                </p>
              </div>
            </div>

            {/* Write a Review Form */}
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 mb-6">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">Write a Product Review</h4>
              {reviewSuccess && (
                <div className="mb-3 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="w-4 h-4" /> Review submitted and rating updated!
                </div>
              )}
              <form onSubmit={handleAddReview} className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Your Rating:</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewRating(star)}
                        className="text-amber-400 hover:scale-110 transition-transform p-0.5"
                      >
                        <Star
                          className={`w-5 h-5 ${
                            newRating >= star ? 'fill-amber-400' : 'text-slate-300 dark:text-slate-600'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <textarea
                    rows={2}
                    required
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Share your experience (quality, packaging, delivery speed)..."
                    className="w-full p-2.5 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    Posting as <strong>{currentUser?.name || 'Verified Buyer'}</strong>
                  </span>
                  <button
                    type="submit"
                    disabled={submittingReview || !newComment.trim()}
                    className="py-1.5 px-4 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50"
                  >
                    {submittingReview ? 'Submitting...' : 'Post Review'}
                  </button>
                </div>
              </form>
            </div>

            {/* Reviews List */}
            {reviews.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">
                No reviews yet. Be the first to review this product!
              </p>
            ) : (
              <div className="space-y-3">
                {reviews.map((rev) => (
                  <div key={rev.id} className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/80">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{rev.buyerName}</span>
                        {rev.verifiedPurchase && (
                          <span className="text-[10px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded font-semibold flex items-center gap-0.5 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Verified Purchase
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        {formatDate(rev.createdAt)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 my-1.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${
                            rev.rating >= s
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-200 dark:text-slate-700'
                          }`}
                        />
                      ))}
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{rev.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
