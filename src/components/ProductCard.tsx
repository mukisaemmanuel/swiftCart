import React from 'react';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { formatUGX, calculateDiscount } from '../utils/formatters';
import { Star, Zap, ShoppingBag, Heart, Store } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onOpenDetail: (product: Product) => void;
  onFilterSeller?: (sellerId: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onOpenDetail,
  onFilterSeller,
}) => {
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const isWished = isInWishlist(product.id);
  const discount = calculateDiscount(product.priceUGX, product.originalPriceUGX);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col group relative">
      {/* Thumbnail area */}
      <div
        className="relative aspect-square bg-slate-100 dark:bg-slate-800 cursor-pointer overflow-hidden"
        onClick={() => onOpenDetail(product)}
      >
        <img
          src={product.images[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80'}
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start">
          {discount && (
            <span className="bg-orange-600 text-white text-[11px] font-black px-2 py-0.5 rounded-md shadow-xs">
              -{discount}%
            </span>
          )}
          {product.isExpressDelivery && (
            <span className="bg-amber-400 text-slate-900 text-[10px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
              <Zap className="w-3 h-3 fill-slate-900" /> Express
            </span>
          )}
        </div>

        {/* Wishlist toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(product);
          }}
          className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center transition-transform active:scale-90 shadow-xs ${
            isWished
              ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400'
              : 'bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs text-slate-400 hover:text-rose-500 hover:bg-white dark:hover:bg-slate-700'
          }`}
          title={isWished ? 'Remove from wishlist' : 'Save to wishlist'}
        >
          <Heart className={`w-4 h-4 ${isWished ? 'fill-rose-500 text-rose-500 dark:fill-rose-400 dark:text-rose-400' : ''}`} />
        </button>

        {product.stockQuantity <= 5 && product.stockQuantity > 0 && (
          <div className="absolute bottom-2 left-2 right-2 bg-amber-950/80 backdrop-blur-xs text-amber-200 text-[10px] font-bold py-1 px-2 rounded-lg text-center">
            Only {product.stockQuantity} left in stock!
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3.5 flex-1 flex flex-col justify-between">
        <div>
          {/* Seller Tag */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onFilterSeller) onFilterSeller(product.sellerId);
              }}
              className="flex items-center gap-1 hover:text-orange-600 dark:hover:text-orange-400 transition-colors truncate max-w-[70%]"
            >
              <Store className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
              <span className="truncate">{product.sellerStoreName}</span>
            </button>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">{product.sellerDistrict || 'Uganda'}</span>
          </div>

          {/* Title */}
          <h3
            onClick={() => onOpenDetail(product)}
            className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 line-clamp-2 hover:text-orange-600 dark:hover:text-orange-400 cursor-pointer transition-colors leading-snug"
          >
            {product.title}
          </h3>

          {/* Rating */}
          <div className="flex items-center gap-1.5 mt-2">
            <div className="flex items-center text-amber-500">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 ml-1">
                {product.rating > 0 ? product.rating.toFixed(1) : '5.0'}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              ({product.reviewCount || 0})
            </span>
          </div>

          {/* Price */}
          <div className="mt-2.5 flex items-baseline gap-2 flex-wrap">
            <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
              {formatUGX(product.priceUGX)}
            </span>
            {product.originalPriceUGX && product.originalPriceUGX > product.priceUGX && (
              <span className="text-[11px] text-slate-400 dark:text-slate-500 line-through">
                {formatUGX(product.originalPriceUGX)}
              </span>
            )}
          </div>
        </div>

        {/* Add to Cart button */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => addToCart(product)}
            disabled={product.stockQuantity === 0}
            className="w-full py-2 bg-orange-600 hover:bg-orange-700 active:scale-[0.98] disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>{product.stockQuantity === 0 ? 'Out of Stock' : 'Add to Cart'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
