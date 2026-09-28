import React from 'react';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { formatUGX } from '../utils/formatters';
import { Heart, ShoppingBag, Trash2, ArrowLeft, Zap, Store } from 'lucide-react';
import { Product } from '../types';

interface WishlistViewProps {
  onBackToShopping: () => void;
  onOpenProduct: (product: Product) => void;
}

export const WishlistView: React.FC<WishlistViewProps> = ({
  onBackToShopping,
  onOpenProduct,
}) => {
  const { wishlistProducts, removeFromWishlist, wishlistCount } = useWishlist();
  const { addToCart } = useCart();

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Top Breadcrumb & Title */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={onBackToShopping}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Marketplace
          </button>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <Heart className="w-5 h-5 fill-rose-600 dark:fill-rose-400" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">My Wishlist</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {wishlistCount} {wishlistCount === 1 ? 'item' : 'items'} saved for later
              </p>
            </div>
          </div>
        </div>
      </div>

      {wishlistProducts.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center max-w-md mx-auto my-8 shadow-xs">
          <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-500 dark:text-rose-400 mx-auto flex items-center justify-center mb-4">
            <Heart className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Your wishlist is empty</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
            Explore thousands of products across electronics, groceries, and fashion and click the heart icon to save your favorites!
          </p>
          <button
            onClick={onBackToShopping}
            className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.99]"
          >
            Explore Top Deals
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {wishlistProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col group"
            >
              {/* Image banner */}
              <div
                className="relative aspect-4/3 bg-slate-100 dark:bg-slate-800 cursor-pointer overflow-hidden"
                onClick={() => onOpenProduct(product)}
              >
                <img
                  src={product.images[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80'}
                  alt={product.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {product.isExpressDelivery && (
                  <div className="absolute top-2.5 left-2.5 bg-amber-400 text-slate-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                    <Zap className="w-3 h-3 fill-slate-900" /> Swift Express
                  </div>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromWishlist(product.id);
                  }}
                  className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-xs text-slate-400 hover:text-rose-600 hover:bg-white dark:hover:bg-slate-700 flex items-center justify-center transition-all shadow-xs"
                  title="Remove from wishlist"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Product Info */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                    <Store className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    <span className="truncate">{product.sellerStoreName}</span>
                  </div>

                  <h3
                    onClick={() => onOpenProduct(product)}
                    className="font-bold text-sm text-slate-900 dark:text-slate-100 line-clamp-2 hover:text-orange-600 dark:hover:text-orange-400 cursor-pointer transition-colors"
                  >
                    {product.title}
                  </h3>

                  <div className="mt-2.5 flex items-baseline gap-2">
                    <span className="text-base font-extrabold text-slate-900 dark:text-white">
                      {formatUGX(product.priceUGX)}
                    </span>
                    {product.originalPriceUGX && product.originalPriceUGX > product.priceUGX && (
                      <span className="text-xs text-slate-400 dark:text-slate-500 line-through">
                        {formatUGX(product.originalPriceUGX)}
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex items-center gap-2 text-xs">
                    {product.stockQuantity > 0 ? (
                      <span className="text-emerald-700 dark:text-emerald-400 font-semibold text-[11px] bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                        In Stock ({product.stockQuantity})
                      </span>
                    ) : (
                      <span className="text-red-700 dark:text-red-400 font-semibold text-[11px] bg-red-50 dark:bg-red-950/60 px-2 py-0.5 rounded">
                        Out of Stock
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                  <button
                    onClick={() => addToCart(product)}
                    disabled={product.stockQuantity === 0}
                    className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5"
                  >
                    <ShoppingBag className="w-4 h-4" /> Add to Cart
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
