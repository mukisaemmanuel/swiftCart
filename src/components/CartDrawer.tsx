import React from 'react';
import { useCart } from '../context/CartContext';
import { formatUGX } from '../utils/formatters';
import {
  X,
  ShoppingBag,
  Trash2,
  Store,
  Truck,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface CartDrawerProps {
  onOpenCheckout: () => void;
  onExploreProducts: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  onOpenCheckout,
  onExploreProducts,
}) => {
  const {
    items,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeFromCart,
    clearCart,
    sellerPackages,
    totalProductsAmountUGX,
    totalDeliveryFeeUGX,
    grandTotalUGX,
    totalItemsCount,
  } = useCart();

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-4 sm:pl-10">
        <div className="w-screen max-w-[calc(100vw-1rem)] sm:max-w-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xl flex flex-col transition-colors duration-200">
          {/* Header */}
          <div className="p-4 bg-slate-900 dark:bg-slate-950 text-white flex justify-between items-center shrink-0 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-orange-500" />
              <h2 className="text-base font-bold">Shopping Cart ({totalItemsCount})</h2>
            </div>
            <div className="flex items-center gap-2">
              {items.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs text-slate-400 hover:text-rose-400 transition-colors mr-2"
                >
                  Clear All
                </button>
              )}
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Multi-Vendor Cart Banner */}
          {sellerPackages.length > 1 && (
            <div className="bg-orange-50 dark:bg-orange-950/40 border-b border-orange-200 dark:border-orange-800/60 px-4 py-2.5 text-xs text-orange-950 dark:text-orange-200 flex items-center gap-2">
              <Store className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0" />
              <div>
                <strong>Multi-Vendor Order:</strong> Items will be split into{' '}
                <strong>{sellerPackages.length} packages</strong> fulfilled directly by each seller.
              </div>
            </div>
          )}

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {items.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="w-16 h-16 rounded-full bg-orange-50 dark:bg-orange-950/50 text-orange-500 mx-auto flex items-center justify-center mb-3">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-white text-base">Your cart is empty</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                  Browse products from Busia & Busitema Tech Hub, Sibanga Agro, and local Eastern Uganda sellers.
                </p>
                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    onExploreProducts();
                  }}
                  className="mt-6 px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                >
                  Start Shopping
                </button>
              </div>
            ) : (
              sellerPackages.map((pkg, idx) => (
                <div
                  key={pkg.sellerId}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50/50 dark:bg-slate-800/60 shadow-xs"
                >
                  {/* Seller Package Header */}
                  <div className="p-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300 text-[10px] font-black flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                        <Store className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                        <span className="truncate max-w-[170px]">{pkg.sellerStoreName}</span>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      Delivery: {formatUGX(pkg.deliveryFeeUGX)}
                    </span>
                  </div>

                  {/* Items in this package */}
                  <div className="p-3 space-y-3 divide-y divide-slate-100 dark:divide-slate-800">
                    {pkg.items.map(({ product, quantity }) => (
                      <div key={product.id} className="pt-3 first:pt-0 flex gap-3">
                        <img
                          src={product.images?.[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=200&q=80'}
                          alt={product.title}
                          className="w-16 h-16 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0 bg-white dark:bg-slate-800"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=200&q=80';
                          }}
                        />

                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                              {product.title}
                            </h4>
                            <div className="text-xs font-extrabold text-slate-900 dark:text-white mt-0.5">
                              {formatUGX(product.priceUGX)}
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-2">
                            {/* Stepper */}
                            <div className="flex items-center border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 overflow-hidden">
                              <button
                                onClick={() => updateQuantity(product.id, quantity - 1)}
                                className="px-2 py-0.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                              >
                                -
                              </button>
                              <span className="px-2 py-0.5 text-xs font-bold text-slate-900 dark:text-slate-100">
                                {quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(product.id, quantity + 1)}
                                disabled={quantity >= product.stockQuantity}
                                className="px-2 py-0.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40"
                              >
                                +
                              </button>
                            </div>

                            <button
                              onClick={() => removeFromCart(product.id)}
                              className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 transition-colors"
                              title="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Package subtotal */}
                  <div className="p-2.5 bg-slate-100/70 dark:bg-slate-800/70 border-t border-slate-200 dark:border-slate-700 text-xs flex justify-between font-medium text-slate-700 dark:text-slate-300">
                    <span>Package Total:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{formatUGX(pkg.totalUGX)}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer & Checkout */}
          {items.length > 0 && (
            <div className="p-4 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 space-y-3 shrink-0">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Items Subtotal:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatUGX(totalProductsAmountUGX)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Truck className="w-3 h-3 text-slate-400" />
                    Delivery ({sellerPackages.length} {sellerPackages.length === 1 ? 'package' : 'packages'}):
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatUGX(totalDeliveryFeeUGX)}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between text-sm font-extrabold text-slate-900 dark:text-white">
                  <span>Total Amount:</span>
                  <span className="text-orange-600 dark:text-orange-400 text-base">{formatUGX(grandTotalUGX)}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsCartOpen(false);
                  onOpenCheckout();
                }}
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Instant MoMo Escrow (MTN & Airtel)</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
