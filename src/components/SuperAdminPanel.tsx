import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { User, UserRole, UserStatus, SellerApplication, AuditLog, PlatformFinancialMetrics, Order } from '../types';
import { formatUGX, formatDate } from '../utils/formatters';
import {
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  DollarSign,
  Users,
  Building2,
  FileCheck,
  Activity,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  UserX,
  UserCheck,
  Lock,
  Search,
  ExternalLink,
  Phone,
  Mail,
  Clock,
  Sparkles,
  Shield,
  Layers,
} from 'lucide-react';

interface SuperAdminPanelProps {
  onBackToShopping: () => void;
  onNavigateToOpsAdmin?: () => void;
}

export const SuperAdminPanel: React.FC<SuperAdminPanelProps> = ({
  onBackToShopping,
  onNavigateToOpsAdmin,
}) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'financials' | 'users' | 'applications' | 'audit'>('financials');
  const [metrics, setMetrics] = useState<PlatformFinancialMetrics | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [applications, setApplications] = useState<SellerApplication[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [met, usr, app, logs, ord] = await Promise.all([
        dbService.getPlatformFinancialMetrics(),
        dbService.getUsers(),
        dbService.getSellerApplications(),
        dbService.getAuditLogs(),
        dbService.getOrders(),
      ]);
      setMetrics(met);
      setUsers(usr);
      setApplications(app);
      setAuditLogs(logs);
      setOrders(ord);
    } catch (e) {
      console.error('SuperAdmin loadData error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const triggerSuccess = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 3500);
  };

  const handleUpdateUserRole = async (targetUser: User, newRole: UserRole) => {
    if (!currentUser) return;
    if (targetUser.id === currentUser.id && newRole !== 'SUPER_ADMIN') {
      alert('You cannot demote your own Super Admin account.');
      return;
    }

    if (window.confirm(`Are you sure you want to change ${targetUser.name}'s role to ${newRole}?`)) {
      await dbService.updateUserRoleAndStatus(
        targetUser.id,
        newRole,
        targetUser.status || 'ACTIVE',
        { id: currentUser.id, name: currentUser.name, role: currentUser.role }
      );
      triggerSuccess(`Updated ${targetUser.name} to ${newRole} role.`);
      await loadData();
    }
  };

  const handleToggleUserStatus = async (targetUser: User) => {
    if (!currentUser) return;
    if (targetUser.id === currentUser.id) {
      alert('You cannot suspend your own account.');
      return;
    }

    const nextStatus: UserStatus = targetUser.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    if (window.confirm(`Are you sure you want to set ${targetUser.name}'s status to ${nextStatus}?`)) {
      await dbService.updateUserRoleAndStatus(
        targetUser.id,
        targetUser.role,
        nextStatus,
        { id: currentUser.id, name: currentUser.name, role: currentUser.role }
      );
      triggerSuccess(`${targetUser.name} status updated to ${nextStatus}.`);
      await loadData();
    }
  };

  const handleReviewApplication = async (appId: string, status: 'APPROVED' | 'REJECTED') => {
    if (!currentUser) return;
    const notes = prompt(`Enter review notes for this application (${status}):`, status === 'APPROVED' ? 'Approved by Executive Office' : 'Rejected.');
    if (notes === null) return;

    await dbService.reviewSellerApplication(
      appId,
      status,
      notes,
      { id: currentUser.id, name: currentUser.name, role: currentUser.role }
    );
    triggerSuccess(`Application ${status.toLowerCase()} successfully.`);
    await loadData();
  };

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'ALL' && (u.role || '').toUpperCase() !== roleFilter) return false;
    if (userSearch.trim()) {
      const q = userSearch.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 w-full max-w-full space-y-6">
      {/* Top Banner */}
      <div className="bg-linear-to-r from-slate-950 via-purple-950 to-slate-900 text-white rounded-3xl p-5 sm:p-8 shadow-2xl border border-purple-800/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300 shadow-inner">
              <Shield className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-2xl font-black">Super Admin Executive Portal</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-400/20 text-purple-300 border border-purple-400/40">
                  Level 4 • Executive Auditor
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Platform Governance, Financial Escrow Oversight, and Administrative RBAC Security
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {onNavigateToOpsAdmin && (
              <button
                onClick={onNavigateToOpsAdmin}
                className="px-4 py-2.5 bg-purple-600/80 hover:bg-purple-600 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Layers className="w-4 h-4" />
                <span>Operations Admin Portal</span>
              </button>
            )}

            <button
              onClick={onBackToShopping}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-slate-200 font-bold text-xs rounded-xl border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Storefront</span>
            </button>
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {actionSuccess && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('financials')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'financials'
              ? 'bg-purple-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Escrow & Financial Ledger</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'users'
              ? 'bg-purple-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Role & RBAC Manager ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('applications')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'applications'
              ? 'bg-purple-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>Merchant Inquiries ({applications.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'audit'
              ? 'bg-purple-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Executive Audit Trail ({auditLogs.length})</span>
        </button>
      </div>

      {/* Tab 1: Escrow & Financial Ledger */}
      {activeTab === 'financials' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Gross Platform GMV</span>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {formatUGX(metrics?.totalGrossVolumeUGX || 0)}
              </div>
              <p className="text-[10px] text-emerald-500 font-bold">100% Verified Transactions</p>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Escrow Held</span>
              <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">
                {formatUGX(metrics?.totalEscrowHeldUGX || 0)}
              </div>
              <p className="text-[10px] text-slate-400">Locked until doorstep delivery</p>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Settled Merchant Payouts</span>
              <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {formatUGX(metrics?.totalSettledPayoutsUGX || 0)}
              </div>
              <p className="text-[10px] text-slate-400">Dispatched via MoMo & Airtel</p>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Platform 5% Commission</span>
              <div className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400">
                {formatUGX(metrics?.platformCommissionsUGX || 0)}
              </div>
              <p className="text-[10px] text-purple-500 font-bold">Earned SwiftCart Revenue</p>
            </div>
          </div>

          {/* Payment Method Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl space-y-1.5">
              <div className="flex justify-between items-center text-xs font-bold text-yellow-700 dark:text-yellow-400">
                <span>📱 MTN MoMo Volume</span>
                <span>{metrics?.totalGrossVolumeUGX ? Math.round(((metrics?.momoVolumeUGX || 0) / metrics.totalGrossVolumeUGX) * 100) : 0}%</span>
              </div>
              <div className="text-lg font-black text-slate-900 dark:text-white">
                {formatUGX(metrics?.momoVolumeUGX || 0)}
              </div>
            </div>

            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl space-y-1.5">
              <div className="flex justify-between items-center text-xs font-bold text-red-700 dark:text-red-400">
                <span>📶 Airtel Money Volume</span>
                <span>{metrics?.totalGrossVolumeUGX ? Math.round(((metrics?.airtelVolumeUGX || 0) / metrics.totalGrossVolumeUGX) * 100) : 0}%</span>
              </div>
              <div className="text-lg font-black text-slate-900 dark:text-white">
                {formatUGX(metrics?.airtelVolumeUGX || 0)}
              </div>
            </div>

            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl space-y-1.5">
              <div className="flex justify-between items-center text-xs font-bold text-blue-700 dark:text-blue-400">
                <span>💳 Card & Bank Volume</span>
                <span>{metrics?.totalGrossVolumeUGX ? Math.round(((metrics?.cardVolumeUGX || 0) / metrics.totalGrossVolumeUGX) * 100) : 0}%</span>
              </div>
              <div className="text-lg font-black text-slate-900 dark:text-white">
                {formatUGX(metrics?.cardVolumeUGX || 0)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: User Role & Governance Manager */}
      {activeTab === 'users' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm space-y-4 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search user name, email, phone..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              />
            </div>

            <div className="flex gap-2">
              {['ALL', 'BUYER', 'SELLER', 'ADMIN', 'SUPER_ADMIN'].map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    roleFilter === r
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase font-black text-[10px]">
                <tr>
                  <th className="p-3">User</th>
                  <th className="p-3">Contact</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">RBAC Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredUsers.map((u) => {
                  const roleUpper = (u.role || '').toUpperCase();
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-3 flex items-center gap-2.5">
                        <img
                          src={u.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${u.name}`}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover border"
                        />
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">{u.name}</div>
                          <div className="text-[10px] text-slate-400">ID: {u.id}</div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div>{u.email}</div>
                        <div className="text-[10px] text-slate-400">{u.phone}</div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase border ${
                            roleUpper === 'SUPER_ADMIN'
                              ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-300'
                              : roleUpper === 'ADMIN'
                              ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-300'
                              : roleUpper === 'SELLER'
                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300'
                          }`}
                        >
                          {roleUpper}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                            u.status === 'SUSPENDED'
                              ? 'bg-red-100 text-red-700'
                              : u.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {u.status || 'ACTIVE'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {roleUpper !== 'SUPER_ADMIN' && (
                            <>
                              {roleUpper !== 'ADMIN' ? (
                                <button
                                  onClick={() => handleUpdateUserRole(u, 'ADMIN')}
                                  className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 font-bold rounded-lg border border-blue-200 dark:border-blue-800 cursor-pointer"
                                  title="Promote to Operations Admin"
                                >
                                  + Promote to Admin
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleUpdateUserRole(u, 'BUYER')}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
                                  title="Demote from Admin"
                                >
                                  Demote to Buyer
                                </button>
                              )}

                              <button
                                onClick={() => handleToggleUserStatus(u)}
                                className={`px-2.5 py-1 font-bold rounded-lg border cursor-pointer ${
                                  u.status === 'SUSPENDED'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                    : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                                }`}
                              >
                                {u.status === 'SUSPENDED' ? 'Reactivate' : 'Suspend'}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Merchant Inquiries & Applications */}
      {activeTab === 'applications' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm p-4 sm:p-6 space-y-4">
          <h3 className="font-black text-sm">Prospective Merchant Applications (/sell Inquiry Gateway)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {applications.map((app) => (
              <div
                key={app.id}
                className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850/60 space-y-3"
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{app.storeName}</h4>
                    <p className="text-[11px] text-slate-500">{app.applicantName} • {app.district}</p>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase border ${
                      app.status === 'APPROVED'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : app.status === 'REJECTED'
                        ? 'bg-red-100 text-red-800 border-red-300'
                        : 'bg-amber-100 text-amber-800 border-amber-300'
                    }`}
                  >
                    {app.status}
                  </span>
                </div>

                <div className="text-xs space-y-1 text-slate-600 dark:text-slate-300">
                  <div><strong>Category:</strong> {app.businessType}</div>
                  <div><strong>Address:</strong> {app.address}</div>
                  <div><strong>Contact:</strong> {app.phone} | {app.email}</div>
                  {app.description && (
                    <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border text-[11px] italic">
                      "{app.description}"
                    </div>
                  )}
                  {app.reviewNotes && (
                    <div className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">
                      Notes: {app.reviewNotes}
                    </div>
                  )}
                </div>

                {app.status === 'PENDING' && (
                  <div className="pt-2 flex items-center gap-2">
                    <button
                      onClick={() => handleReviewApplication(app.id, 'APPROVED')}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      Approve Merchant
                    </button>
                    <button
                      onClick={() => handleReviewApplication(app.id, 'REJECTED')}
                      className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Executive Audit Trail */}
      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm p-4 sm:p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-black text-sm">Immutable Executive Audit Trail</h3>
            <span className="text-[11px] text-slate-400 font-mono">Real-time Timestamped</span>
          </div>

          <div className="space-y-3">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-purple-600 dark:text-purple-400 text-[11px]">
                      [{log.action}]
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{log.actorName}</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {log.actorRole}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px]">{log.details}</p>
                </div>

                <div className="text-[10px] font-mono text-slate-400 shrink-0">
                  {formatDate(log.timestamp)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
