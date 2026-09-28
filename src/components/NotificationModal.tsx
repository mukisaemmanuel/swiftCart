import React, { useState } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { formatDate } from '../utils/formatters';
import {
  Bell,
  X,
  CheckCircle,
  Truck,
  ShoppingBag,
  ShieldCheck,
  Settings,
  BellRing,
  Check,
} from 'lucide-react';

interface NotificationModalProps {
  onNavigateToOrder?: (orderId: string) => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({ onNavigateToOrder }) => {
  const {
    notifications,
    unreadCount,
    isOpen,
    setIsOpen,
    markAsRead,
    markAllAsRead,
    requestPushPermission,
    pushPermissionStatus,
    preferences,
    updatePreferences,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState<'notifications' | 'preferences'>('notifications');

  if (!isOpen) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'order_status':
        return <Truck className="w-5 h-5 text-orange-600" />;
      case 'new_order':
        return <ShoppingBag className="w-5 h-5 text-emerald-600" />;
      case 'seller_verification':
        return <ShieldCheck className="w-5 h-5 text-purple-600" />;
      default:
        return <Bell className="w-5 h-5 text-blue-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh] transition-colors duration-200">
        {/* Header */}
        <div className="bg-slate-900 dark:bg-slate-950 p-4 text-white flex justify-between items-center border-b border-slate-800">
          <div className="flex items-center gap-2">
            <BellRing className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-base">Alerts & Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-orange-600 text-white">
                {unreadCount} new
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setActiveTab(activeTab === 'notifications' ? 'preferences' : 'notifications')
              }
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                activeTab === 'preferences'
                  ? 'bg-orange-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              title="Notification Settings"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-full text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Browser Push Permission Banner */}
        {pushPermissionStatus !== 'granted' && pushPermissionStatus !== 'unsupported' && (
          <div className="bg-orange-50 dark:bg-orange-950/40 border-b border-orange-200 dark:border-orange-800/60 p-3 flex items-center justify-between gap-2 text-xs">
            <div className="text-orange-900 dark:text-orange-200 font-medium">
              Enable real-time push alerts for order tracking & sales on your device.
            </div>
            <button
              onClick={requestPushPermission}
              className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg shrink-0 transition-colors shadow-xs"
            >
              Enable Push
            </button>
          </div>
        )}

        {/* Content Tabs */}
        {activeTab === 'notifications' ? (
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 p-2">
            <div className="flex justify-between items-center px-3 py-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span>Recent Activity</span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-orange-600 dark:text-orange-400 hover:underline font-bold flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" /> Mark all as read
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                <Bell className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">No notifications yet</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  You'll receive live notifications when your order is placed, shipped, or delivered.
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    markAsRead(n.id);
                    if (n.orderId && onNavigateToOrder) {
                      setIsOpen(false);
                      onNavigateToOrder(n.orderId);
                    }
                  }}
                  className={`p-3.5 rounded-xl transition-all cursor-pointer flex gap-3 ${
                    !n.read ? 'bg-orange-50/60 dark:bg-orange-950/30 hover:bg-orange-50 dark:hover:bg-orange-950/50' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 shadow-xs border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4
                        className={`text-xs truncate ${
                          !n.read ? 'font-bold text-slate-900 dark:text-white' : 'font-semibold text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {n.title}
                      </h4>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-orange-600 shrink-0"></span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed line-clamp-2">
                      {n.message}
                    </p>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-1">
                      {formatDate(n.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="p-5 space-y-4 flex-1 overflow-y-auto">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Push & In-App Preferences</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Customize what notifications you receive across your SwiftCart devices.
            </p>

            <div className="space-y-3 pt-2">
              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Order Tracking Updates</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Receive alerts when order is confirmed, dispatched & delivered
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.orderUpdates}
                  onChange={(e) =>
                    updatePreferences({ ...preferences, orderUpdates: e.target.checked })
                  }
                  className="w-4 h-4 accent-orange-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">New Order Alerts (Sellers)</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Instant alerts when a buyer purchases from your store
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.sellerNewOrders}
                  onChange={(e) =>
                    updatePreferences({ ...preferences, sellerNewOrders: e.target.checked })
                  }
                  className="w-4 h-4 accent-orange-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Deals & Busia Area Promos</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Flash discounts, electronics week, and MoMo cashback promotions
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.promotions}
                  onChange={(e) =>
                    updatePreferences({ ...preferences, promotions: e.target.checked })
                  }
                  className="w-4 h-4 accent-orange-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Device Web Push</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Receive notifications even when browser tab is inactive
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.pushEnabled}
                  onChange={(e) => {
                    const enabled = e.target.checked;
                    updatePreferences({ ...preferences, pushEnabled: enabled });
                    if (enabled) {
                      requestPushPermission();
                    }
                  }}
                  className="w-4 h-4 accent-orange-600 rounded"
                />
              </label>
            </div>
          </div>
        )}

        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
          <span>Powered by SwiftCart Messaging</span>
          <button
            onClick={() => setIsOpen(false)}
            className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
