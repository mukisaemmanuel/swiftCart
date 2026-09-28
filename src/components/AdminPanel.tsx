import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { Seller, Order, User } from '../types';
import { formatUGX, formatDate } from '../utils/formatters';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Store,
  Users,
  Package,
  TrendingUp,
  ArrowLeft,
  Search,
} from 'lucide-react';

interface AdminPanelProps {
  onBackToShopping: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBackToShopping }) => {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'verifications' | 'orders' | 'sellers' | 'users'>('verifications');
  const [loading, setLoading] = useState(true);
  const [feedbackNote, setFeedbackNote] = useState<Record<string, string>>({});

  const loadData = async () => {
    setLoading(true);
    const [allSellers, allOrders, allUsers] = await Promise.all([
      dbService.getSellers(),
      dbService.getOrders(),
      dbService.getUsers(),
    ]);
    setSellers(allSellers);
    setOrders(allOrders);
    setUsers(allUsers);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApproveSeller = async (sellerId: string) => {
    const note = feedbackNote[sellerId] || 'Document approved. Store verified for SwiftCart Uganda.';
    await dbService.reviewSellerVerification(sellerId, true, note);
    await loadData();
  };

  const handleRejectSeller = async (sellerId: string) => {
    const note = feedbackNote[sellerId] || 'Document rejected. Please provide clearer government registration.';
    await dbService.reviewSellerVerification(sellerId, false, note);
    await loadData();
  };

  const pendingVerifications = sellers.filter(
    (s) => s.status === 'pending' || !s.isVerified
  );

  const totalGMV = orders.reduce((sum, o) => sum + o.totalUGX, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="bg-purple-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-300 bg-purple-900/60 px-2.5 py-0.5 rounded-full">
                SwiftCart Operations
              </span>
              <span className="text-xs text-purple-200">Uganda Marketplace Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2">
              <ShieldCheck className="w-7 h-7 text-amber-400" />
              Administrative Oversight
            </h1>
            <p className="text-xs text-purple-200 mt-1">
              Verify merchant documents, monitor cross-vendor orders, and manage platform compliance.
            </p>
          </div>

          <button
            onClick={onBackToShopping}
            className="px-4 py-2 bg-purple-900 hover:bg-purple-800 text-purple-100 font-bold text-xs rounded-xl border border-purple-700 transition-colors flex items-center gap-1.5 self-start sm:self-auto"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Storefront
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Marketplace GMV
          </span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {formatUGX(totalGMV)}
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 block">
            Across {orders.length} orders
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Pending Merchant Approvals
          </span>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {pendingVerifications.length}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
            Awaiting document review
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Active Sellers
          </span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {sellers.filter((s) => s.status === 'approved').length}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
            In Busia, Busitema, Jinja & Busoga
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Registered Users
          </span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {users.length}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
            Buyers & merchants
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6 gap-2">
        <button
          onClick={() => setActiveTab('verifications')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'verifications'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Seller Document Review ({pendingVerifications.length})
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'orders'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <Package className="w-4 h-4" />
          All Orders ({orders.length})
        </button>

        <button
          onClick={() => setActiveTab('sellers')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'sellers'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <Store className="w-4 h-4" />
          Sellers Directory ({sellers.length})
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'users'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          Users ({users.length})
        </button>
      </div>

      {/* Tab: Verifications */}
      {activeTab === 'verifications' && (
        <div className="space-y-4">
          <div className="bg-purple-50 border border-purple-200 p-4 rounded-2xl text-xs text-purple-950">
            <strong>Verification Protocol:</strong> Inspect the merchant's submitted business registration or ID, confirm registration legitimacy, and approve or reject. Approval grants the merchant verified status and notifies them immediately.
          </div>

          {sellers.map((s) => (
            <div
              key={s.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={s.logoUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80'}
                    alt=""
                    className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-slate-900">{s.storeName}</h3>
                      {s.isVerified ? (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" /> Verified
                        </span>
                      ) : (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Pending Approval
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500">
                      {s.district} • Phone: {s.phone} • MoMo: {s.momoNetwork} ({s.momoNumber || s.phone})
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-500">
                  Registered: {formatDate(s.createdAt)}
                </div>
              </div>

              {/* Document Preview Box */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-slate-700 block">Submitted Documentation:</span>
                  <span className="text-slate-600 capitalize">
                    {s.verificationDocumentType
                      ? s.verificationDocumentType.replace('_', ' ')
                      : 'URSB Business Registration'}
                  </span>
                  {s.verificationNotes && (
                    <p className="text-slate-500 italic mt-0.5">{s.verificationNotes}</p>
                  )}
                </div>

                {s.verificationDocumentUrl ? (
                  <a
                    href={s.verificationDocumentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 shrink-0 transition-colors shadow-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-orange-600" />
                    Inspect Document
                  </a>
                ) : (
                  <span className="text-slate-400 italic">No document uploaded yet</span>
                )}
              </div>

              {/* Action row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <input
                  type="text"
                  placeholder="Optional review notes to merchant..."
                  value={feedbackNote[s.id] || ''}
                  onChange={(e) =>
                    setFeedbackNote({ ...feedbackNote, [s.id]: e.target.value })
                  }
                  className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl flex-1 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />

                <div className="flex gap-2">
                  <button
                    onClick={() => handleRejectSeller(s.id)}
                    className="px-4 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl border border-red-200 transition-colors flex items-center gap-1"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>
                  <button
                    onClick={() => handleApproveSeller(s.id)}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve & Verify Store
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Orders */}
      {activeTab === 'orders' && (
        <div className="space-y-3">
          <h3 className="font-bold text-sm text-slate-800">Marketplace Orders ({orders.length})</h3>
          <div className="space-y-3">
            {orders.map((ord) => (
              <div
                key={ord.id}
                className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{ord.id}</span>
                    <span className="font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800">
                      {ord.status}
                    </span>
                  </div>
                  <div className="text-slate-500 mt-1">
                    Buyer: {ord.buyerName} ({ord.buyerPhone}) • Store: <strong>{ord.sellerStoreName}</strong>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-black text-slate-900 text-sm">{formatUGX(ord.totalUGX)}</div>
                  <div className="text-[11px] text-slate-400 capitalize">
                    {ord.paymentMethod} • {ord.paymentStatus}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Sellers Directory */}
      {activeTab === 'sellers' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sellers.map((s) => (
            <div key={s.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-3 mb-2">
                <img src={s.logoUrl} alt="" className="w-10 h-10 rounded-xl object-cover border" />
                <div>
                  <h4 className="font-bold text-xs text-slate-900">{s.storeName}</h4>
                  <span className="text-[11px] text-slate-500">{s.district}</span>
                </div>
              </div>
              <p className="text-xs text-slate-600 line-clamp-2 mb-2">{s.bio}</p>
              <div className="text-[11px] text-slate-400">
                MoMo: {s.momoNetwork} ({s.momoNumber || s.phone})
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Users */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="p-3">User</th>
                <th className="p-3">Role</th>
                <th className="p-3">Phone</th>
                <th className="p-3">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="p-3">
                    <div className="font-bold text-slate-800">{u.name}</div>
                    <div className="text-slate-400 text-[11px]">{u.email}</div>
                  </td>
                  <td className="p-3">
                    <span className="font-bold uppercase text-[10px] px-2 py-0.5 rounded bg-slate-100">
                      {u.role}
                    </span>
                  </td>
                  <td className="p-3 text-slate-600">{u.phone}</td>
                  <td className="p-3 text-slate-400">{formatDate(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
