import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/db';
import { Order, OrderStatus } from '../types';
import { formatUGX, formatDate, formatUgandaPhoneToInternational } from '../utils/formatters';
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  Store,
  CreditCard,
  Search,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Share2,
} from 'lucide-react';

interface OrderTrackingViewProps {
  onBackToShopping: () => void;
  selectedOrderId?: string;
  onOpenAuth?: () => void;
}

export const OrderTrackingView: React.FC<OrderTrackingViewProps> = ({
  onBackToShopping,
  selectedOrderId,
  onOpenAuth,
}) => {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState(selectedOrderId || '');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(selectedOrderId || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      if (!currentUser) {
        setOrders([]);
        setLoading(false);
        return;
      }
      const all = await dbService.getOrders();
      // Admin sees all marketplace orders, buyers see strictly their own orders
      if (currentUser.role === 'admin') {
        setOrders(all);
      } else {
        const userOrders = all.filter((o) => o.buyerId === currentUser.id);
        setOrders(userOrders);
      }
      setLoading(false);
    };

    fetchOrders();
  }, [currentUser?.id, currentUser?.role]);

  const filteredOrders = orders.filter((o) => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        o.id.toLowerCase().includes(q) ||
        o.masterOrderId.toLowerCase().includes(q) ||
        o.sellerStoreName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getStepIndex = (status: OrderStatus): number => {
    switch (status) {
      case 'Pending':
        return 1;
      case 'Confirmed':
        return 2;
      case 'Shipped':
        return 3;
      case 'Delivered':
        return 4;
      case 'Cancelled':
        return -1;
      default:
        return 1;
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <button
            onClick={onBackToShopping}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Store
          </button>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-orange-600 dark:text-orange-500" />
            <span>Order Tracking & History</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time status updates from Ugandan sellers & dispatch couriers
          </p>
        </div>

        {/* Search */}
        {currentUser && (
          <div className="relative max-w-xs w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Order ID (e.g. SWIFT-...)"
              className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
          </div>
        )}
      </div>

      {/* Guest unauthenticated view */}
      {!currentUser ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center max-w-md mx-auto shadow-xs my-8">
          <Package className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base">Sign In to Track Orders</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5 leading-relaxed">
            Please sign in to view your orders and track live deliveries across Uganda.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
            {onOpenAuth && (
              <button
                onClick={onOpenAuth}
                className="w-full sm:w-auto px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
              >
                Sign In
              </button>
            )}
            <button
              onClick={onBackToShopping}
              className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl transition-all"
            >
              Start Shopping
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-6 text-xs font-semibold">
            {['all', 'Pending', 'Confirmed', 'Shipped', 'Delivered'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3.5 py-1.5 rounded-full border transition-all shrink-0 ${
                  statusFilter === status
                    ? 'bg-slate-900 dark:bg-orange-600 text-white border-slate-900 dark:border-orange-600'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {status === 'all' ? 'All Orders' : status}
              </button>
            ))}
          </div>

          {/* Orders List */}
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-xs">Loading your orders...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center max-w-md mx-auto shadow-xs">
              <Package className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                {orders.length === 0 ? "You haven't placed any orders yet" : "No orders found"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
                {orders.length === 0
                  ? "Explore products from verified Ugandan sellers and place your first order today."
                  : "You don't have any orders matching the current filter."}
              </p>
              <button
                onClick={onBackToShopping}
                className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            <div className="space-y-4">
          {filteredOrders.map((order) => {
            const stepIdx = getStepIndex(order.status);
            const isExpanded = expandedOrderId === order.id;

            return (
              <div
                key={order.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              >
                {/* Header bar */}
                <div
                  onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                  className="p-4 bg-slate-50/80 dark:bg-slate-850/80 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 flex items-center justify-center font-bold text-xs shrink-0">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-white">{order.id}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            order.status === 'Delivered'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                              : order.status === 'Shipped'
                              ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                              : order.status === 'Confirmed'
                              ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300'
                              : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        <Store className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                        <span>Seller: <strong className="text-slate-700 dark:text-slate-300">{order.sellerStoreName}</strong></span>
                        <span>•</span>
                        <span>{formatDate(order.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="text-right">
                      <div className="text-sm font-black text-slate-900 dark:text-white">
                        {formatUGX(order.totalUGX)}
                      </div>
                      <div className="text-[11px] text-slate-400 capitalize">
                        {order.paymentMethod === 'cod' ? 'Cash on Delivery' : `${order.paymentProvider || 'Mobile Money'}`}
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Tracking Progress Stepper */}
                <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                  <div className="relative flex items-center justify-between max-w-xl mx-auto my-2">
                    {/* Progress Bar background */}
                    <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-1 bg-slate-200 dark:bg-slate-800 z-0"></div>
                    <div
                      className="absolute top-1/2 left-0 -translate-y-1/2 h-1 bg-orange-600 transition-all duration-500 z-0"
                      style={{
                        width:
                          stepIdx === 1
                            ? '10%'
                            : stepIdx === 2
                            ? '40%'
                            : stepIdx === 3
                            ? '75%'
                            : stepIdx === 4
                            ? '100%'
                            : '0%',
                      }}
                    ></div>

                    {/* Step 1: Placed */}
                    <div className="relative z-10 flex flex-col items-center">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          stepIdx >= 1
                            ? 'bg-orange-600 text-white'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        1
                      </div>
                      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 mt-1">Placed</span>
                    </div>

                    {/* Step 2: Confirmed */}
                    <div className="relative z-10 flex flex-col items-center">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          stepIdx >= 2
                            ? 'bg-orange-600 text-white'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        2
                      </div>
                      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 mt-1">Confirmed</span>
                    </div>

                    {/* Step 3: Shipped */}
                    <div className="relative z-10 flex flex-col items-center">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          stepIdx >= 3
                            ? 'bg-orange-600 text-white'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <Truck className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 mt-1">Shipped</span>
                    </div>

                    {/* Step 4: Delivered */}
                    <div className="relative z-10 flex flex-col items-center">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          stepIdx >= 4
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 mt-1">Delivered</span>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-950/40 space-y-4 text-xs">
                    {/* Items */}
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white mb-2">Package Items</h4>
                      <div className="space-y-2">
                        {order.items.map((item, i) => (
                          <div
                            key={i}
                            className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2.5">
                              <img
                                src={item.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=150&q=80'}
                                alt={item.title}
                                className="w-10 h-10 rounded-lg object-cover border border-slate-100 dark:border-slate-700"
                              />
                              <div>
                                <span className="font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{item.title}</span>
                                <span className="text-[11px] text-slate-400">Qty: {item.quantity}</span>
                              </div>
                            </div>
                            <span className="font-extrabold text-slate-900 dark:text-white">
                              {formatUGX(item.priceUGX * item.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Delivery & Timeline details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" /> Delivery Address
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 font-medium">{order.deliveryAddress.fullName}</p>
                        <p className="text-slate-500 dark:text-slate-400">{order.deliveryAddress.streetAddress}</p>
                        <p className="text-slate-500 dark:text-slate-400">
                          {order.deliveryAddress.divisionOrTown}, {order.deliveryAddress.district}
                        </p>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">Tel: {order.deliveryAddress.phone}</p>
                      </div>

                      <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" /> Tracking Log
                        </div>
                        <div className="space-y-1.5 max-h-32 overflow-y-auto">
                          {order.trackingHistory.map((h, i) => (
                            <div key={i} className="text-[11px] border-l-2 border-orange-500 pl-2">
                              <span className="font-bold text-slate-800 dark:text-slate-200">{h.status}: </span>
                              <span className="text-slate-600 dark:text-slate-300">{h.note} </span>
                              <span className="text-slate-400 text-[10px]">({formatDate(h.timestamp)})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* WhatsApp Actions */}
                    {(() => {
                      const itemTitle = order.items[0]?.title || 'Items';
                      const itemsSummary =
                        order.items.length > 1 ? `${itemTitle} (+${order.items.length - 1} more)` : itemTitle;
                      const addressStr = `${order.deliveryAddress.streetAddress}, ${order.deliveryAddress.divisionOrTown}, ${order.deliveryAddress.district}`;
                      
                      const cleanSellerPhone = formatUgandaPhoneToInternational(
                        order.sellerId === 'seller_kampala_tech'
                          ? '0782998877'
                          : order.sellerId === 'seller_pearl_home'
                          ? '0701445566'
                          : order.sellerId === 'seller_nakasero_fresh'
                          ? '0774556677'
                          : order.sellerId === 'seller_owino_trends'
                          ? '0752001122'
                          : '0782998877'
                      );

                      const cleanBuyerPhone = formatUgandaPhoneToInternational(
                        order.buyerPhone || order.deliveryAddress.phone
                      );

                      const sellerMsg = `Hello ${order.sellerStoreName}, I have placed order *${order.id}* for ${itemsSummary}. Total: UGX ${order.totalUGX.toLocaleString()}. Delivery to: ${addressStr}.`;
                      const sellerWhatsAppUrl = `https://wa.me/${cleanSellerPhone}?text=${encodeURIComponent(sellerMsg)}`;

                      const buyerReceiptText = `Hello ${order.buyerName}, your SwiftCart Uganda order receipt for package *${order.id}* (${order.sellerStoreName}): Total: UGX ${order.totalUGX.toLocaleString()}. Destination: ${addressStr}. Payment: ${order.paymentMethod.toUpperCase()} (${order.paymentStatus}). Current status: ${order.status}.`;
                      const buyerReceiptUrl = `https://wa.me/${cleanBuyerPhone}?text=${encodeURIComponent(buyerReceiptText)}`;

                      return (
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-2">
                          <a
                            href={sellerWhatsAppUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 min-w-[170px] px-3 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all text-xs shadow-xs"
                          >
                            <MessageCircle className="w-4 h-4" />
                            <span>Notify Seller via WhatsApp</span>
                          </a>

                          <a
                            href={buyerReceiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all text-xs"
                          >
                            <Share2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Send Receipt to Customer WhatsApp</span>
                          </a>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  )}
</div>
);
};
