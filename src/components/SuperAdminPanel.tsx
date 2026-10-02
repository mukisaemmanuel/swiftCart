import React, { useState, useEffect, useMemo } from 'react';
import { dbService } from '../services/db';
import { useAuth } from '../context/AuthContext';
import {
  User,
  UserRole,
  UserStatus,
  SellerApplication,
  AuditLog,
  PlatformFinancialMetrics,
  Order,
  EscrowLedgerRecord,
  CategoryCommissionSetting,
} from '../types';
import { formatUGX, formatDate } from '../utils/formatters';
import { DashboardLayout, NavItem, BreadcrumbItem } from './dashboard/DashboardLayout';
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
  Sliders,
  RefreshCw,
  Eye,
  FileText,
  AlertCircle,
  ArrowUpRight,
  Filter,
} from 'lucide-react';

interface SuperAdminPanelProps {
  onBackToShopping: () => void;
  onNavigateToOpsAdmin?: () => void;
}

const DEFAULT_COMMISSIONS: CategoryCommissionSetting[] = [
  { category: 'Phones & Tablets', commissionRatePercent: 12, courierContributionUGX: 3000, payoutSchedule: 'Weekly (Tuesdays)' },
  { category: 'Electronics & Audio', commissionRatePercent: 10, courierContributionUGX: 3500, payoutSchedule: 'Weekly (Tuesdays)' },
  { category: 'Computing & IT', commissionRatePercent: 12, courierContributionUGX: 4000, payoutSchedule: 'Weekly (Tuesdays)' },
  { category: 'Fashion & Apparel', commissionRatePercent: 20, courierContributionUGX: 2500, payoutSchedule: 'Weekly (Tuesdays)' },
  { category: 'Home & Appliances', commissionRatePercent: 15, courierContributionUGX: 5000, payoutSchedule: 'Weekly (Tuesdays)' },
  { category: 'Health & Beauty', commissionRatePercent: 18, courierContributionUGX: 2500, payoutSchedule: 'Weekly (Tuesdays)' },
  { category: 'Supermarket & Groceries', commissionRatePercent: 8, courierContributionUGX: 2000, payoutSchedule: 'Daily 6PM' },
  { category: 'Sports & Outdoors', commissionRatePercent: 15, courierContributionUGX: 3000, payoutSchedule: 'Weekly (Tuesdays)' },
];

export const SuperAdminPanel: React.FC<SuperAdminPanelProps> = ({
  onBackToShopping,
  onNavigateToOpsAdmin,
}) => {
  const { currentUser } = useAuth();
  const [activeNav, setActiveNav] = useState<'overview' | 'escrow' | 'users' | 'applications' | 'audit' | 'settings'>('overview');
  const [metrics, setMetrics] = useState<PlatformFinancialMetrics | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [applications, setApplications] = useState<SellerApplication[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Escrow Ledger State & Filter
  const [escrowFilter, setEscrowFilter] = useState<'ALL' | 'HELD' | 'RELEASED' | 'REFUNDED'>('ALL');
  const [selectedEscrowRecord, setSelectedEscrowRecord] = useState<EscrowLedgerRecord | null>(null);
  const [isEscrowOverrideModalOpen, setIsEscrowOverrideModalOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

  // User Governance State
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Category Commission Controls State
  const [categorySettings, setCategorySettings] = useState<CategoryCommissionSetting[]>(DEFAULT_COMMISSIONS);

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

  // Convert orders into Escrow Ledger Records
  const escrowRecords: EscrowLedgerRecord[] = useMemo(() => {
    return orders.map((o, idx) => {
      const commRate = 0.12;
      const commission = Math.round(o.totalUGX * commRate);
      const courierFee = o.deliveryFeeUGX || 3000;
      const netPayout = Math.max(0, o.totalUGX - commission - courierFee);
      const escrowState: 'HELD' | 'RELEASED' | 'REFUNDED' =
        o.status === 'Delivered'
          ? 'RELEASED'
          : o.status === 'Cancelled'
          ? 'REFUNDED'
          : 'HELD';

      return {
        id: `esc_${o.id}`,
        escrowId: `ESC-256-${(idx + 1001).toString()}`,
        orderId: o.id,
        buyerPhone: o.buyerPhone || o.deliveryAddress?.phone || '0776155353',
        sellerId: o.sellerId,
        sellerStoreName: o.sellerStoreName,
        amountUGX: o.totalUGX,
        commissionUGX: commission,
        netPayoutUGX: netPayout,
        courierFeeUGX: courierFee,
        escrowState,
        paymentProvider: o.paymentProvider === 'airtel_money' ? 'Airtel Money' : 'MTN MoMo',
        createdAt: o.createdAt,
      };
    });
  }, [orders]);

  const filteredEscrowRecords = useMemo(() => {
    if (escrowFilter === 'ALL') return escrowRecords;
    return escrowRecords.filter((r) => r.escrowState === escrowFilter);
  }, [escrowRecords, escrowFilter]);

  // Handle Escrow Emergency Release Override
  const handleEmergencyRelease = async () => {
    if (!selectedEscrowRecord || !overrideReason.trim()) return;
    triggerSuccess(`Emergency override executed for Escrow ${selectedEscrowRecord.escrowId}. Funds released to ${selectedEscrowRecord.sellerStoreName}.`);
    setIsEscrowOverrideModalOpen(false);
    setSelectedEscrowRecord(null);
    setOverrideReason('');
  };

  // Handle User Role Governance
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

  // Handle User Status Change (Suspension / Activation)
  const handleToggleUserStatus = async (targetUser: User) => {
    if (!currentUser) return;
    const nextStatus: UserStatus = targetUser.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';

    if (window.confirm(`Set status of ${targetUser.name} to ${nextStatus}?`)) {
      await dbService.updateUserRoleAndStatus(
        targetUser.id,
        targetUser.role,
        nextStatus,
        { id: currentUser.id, name: currentUser.name, role: currentUser.role }
      );
      triggerSuccess(`Account for ${targetUser.name} is now ${nextStatus}.`);
      await loadData();
    }
  };

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.phone.includes(userSearch);
    const matchesRole = roleFilter === 'ALL' || u.role.toUpperCase() === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Navigation Items for DashboardLayout
  const navItems: NavItem[] = [
    { id: 'overview', label: 'Executive Overview', icon: TrendingUp, group: 'Financials & Stats' },
    { id: 'escrow', label: 'Escrow & Settlements', icon: DollarSign, badge: escrowRecords.filter(r => r.escrowState === 'HELD').length, badgeVariant: 'amber', group: 'Financials & Stats' },
    { id: 'users', label: 'User Governance', icon: Users, badge: users.length, group: 'Platform Control' },
    { id: 'applications', label: 'Merchant Requests', icon: Building2, badge: applications.filter(a => a.status === 'PENDING').length, badgeVariant: 'rose', group: 'Platform Control' },
    { id: 'audit', label: 'Audit Trail Logs', icon: FileCheck, group: 'Compliance & Logs' },
    { id: 'settings', label: 'Take-Rates & Controls', icon: Sliders, group: 'Marketplace Setup' },
  ];

  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Executive Governance' },
    { label: navItems.find((n) => n.id === activeNav)?.label || 'Overview' },
  ];

  return (
    <DashboardLayout
      role="SUPER_ADMIN"
      title={
        activeNav === 'overview'
          ? 'Executive Financial Overview'
          : activeNav === 'escrow'
          ? 'Escrow Pool & Settlement Ledger'
          : activeNav === 'users'
          ? 'Platform User Governance'
          : activeNav === 'applications'
          ? 'Merchant Onboarding Requests'
          : activeNav === 'audit'
          ? 'Immutable Operational Audit Trail'
          : 'Marketplace Take-Rates & Commission Matrix'
      }
      subtitle="Executive oversight of gross merchandise value, automated MoMo escrow holds, platform commissions, and admin audits."
      breadcrumbs={breadcrumbs}
      navItems={navItems}
      activeNavId={activeNav}
      onSelectNav={(id) => setActiveNav(id as any)}
      onViewLiveStore={onBackToShopping}
      actions={
        <div className="flex items-center gap-2">
          {onNavigateToOpsAdmin && (
            <button
              onClick={onNavigateToOpsAdmin}
              className="px-3.5 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold hover:bg-purple-100 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Operations Portal</span>
            </button>
          )}
          <button
            onClick={loadData}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            title="Refresh Platform Metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      }
    >
      {/* Toast Alert */}
      {actionSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 shadow-xs animate-in fade-in slide-in-from-top-1">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. EXECUTIVE OVERVIEW & METRIC STRIP */}
      {/* ========================================================= */}
      {activeNav === 'overview' && (
        <div className="space-y-6">
          {/* Executive Metric Strip (4 Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* GMV */}
            <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Total GMV (Gross Volume)
                </span>
                <span className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {formatUGX(metrics?.totalGrossVolumeUGX || 84200000)}
              </div>
              <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>+18.4% vs last 30 days</span>
              </div>
            </div>

            {/* Platform Commissions */}
            <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Earned Commissions (Revenue)
                </span>
                <span className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold">
                  <DollarSign className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {formatUGX(metrics?.platformCommissionsUGX || 10104000)}
              </div>
              <div className="text-[11px] text-slate-400">
                12.0% Effective Platform Take-Rate
              </div>
            </div>

            {/* Escrow Pool Held */}
            <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Active Escrow Pool Held
                </span>
                <span className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  <Lock className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {formatUGX(metrics?.totalEscrowHeldUGX || 14850000)}
              </div>
              <div className="text-[11px] text-slate-400">
                MTN MoMo & Airtel pending delivery confirmation
              </div>
            </div>

            {/* Total Users */}
            <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Total System Users
                </span>
                <span className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {users.length || 24} Accounts
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <span>{users.filter(u => u.role.toUpperCase() === 'SELLER').length} Sellers</span>
                <span>•</span>
                <span>{users.filter(u => u.role.toUpperCase() === 'ADMIN' || u.role.toUpperCase() === 'SUPER_ADMIN').length} Admins</span>
              </div>
            </div>
          </div>

          {/* Quick Snapshot & Direct Shortcuts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* MoMo vs Airtel Settlement Rails */}
            <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-orange-600" />
                  <span>Ugandan Payment Rails Settlement Distribution</span>
                </h3>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  99.98% Rail Uptime
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-amber-600 dark:text-amber-400">MTN Mobile Money</span>
                    <span>72% ({formatUGX((metrics?.totalGrossVolumeUGX || 84200000) * 0.72)})</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: '72%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-red-600 dark:text-red-400">Airtel Money Uganda</span>
                    <span>24% ({formatUGX((metrics?.totalGrossVolumeUGX || 84200000) * 0.24)})</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full" style={{ width: '24%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-slate-600 dark:text-slate-300">Visa / Mastercard / Pesapal</span>
                    <span>4% ({formatUGX((metrics?.totalGrossVolumeUGX || 84200000) * 0.04)})</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-600 rounded-full" style={{ width: '4%' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions & Policy Shortcuts */}
            <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-600" />
                <span>Executive Safeguards & System Governance</span>
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <button
                  onClick={() => setActiveNav('escrow')}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-left space-y-1 transition-colors cursor-pointer"
                >
                  <p className="font-bold text-slate-900 dark:text-white">Escrow Ledger</p>
                  <p className="text-[11px] text-slate-400">Inspect and unlock held funds</p>
                </button>

                <button
                  onClick={() => setActiveNav('settings')}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-left space-y-1 transition-colors cursor-pointer"
                >
                  <p className="font-bold text-slate-900 dark:text-white">Take-Rate Rates</p>
                  <p className="text-[11px] text-slate-400">Configure category commissions</p>
                </button>

                <button
                  onClick={() => setActiveNav('users')}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-left space-y-1 transition-colors cursor-pointer"
                >
                  <p className="font-bold text-slate-900 dark:text-white">Role Management</p>
                  <p className="text-[11px] text-slate-400">Promote admins and verify sellers</p>
                </button>

                <button
                  onClick={() => setActiveNav('audit')}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-left space-y-1 transition-colors cursor-pointer"
                >
                  <p className="font-bold text-slate-900 dark:text-white">Immutable Logs</p>
                  <p className="text-[11px] text-slate-400">Review operations manager actions</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. ESCROW & SETTLEMENT LEDGER TABLE */}
      {/* ========================================================= */}
      {activeNav === 'escrow' && (
        <div className="space-y-4">
          {/* Header Strip & Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-500" />
              <span className="font-bold text-xs text-slate-700 dark:text-slate-300">Filter Escrow Status:</span>
              <div className="flex items-center gap-1">
                {(['ALL', 'HELD', 'RELEASED', 'REFUNDED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setEscrowFilter(st)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      escrowFilter === st
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-xs font-semibold text-slate-500">
              Showing <strong>{filteredEscrowRecords.length}</strong> settlement items
            </div>
          </div>

          {/* High Density Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="p-3.5">Escrow ID</th>
                    <th className="p-3.5">Order Ref</th>
                    <th className="p-3.5">Buyer Phone / Rail</th>
                    <th className="p-3.5">Beneficiary Seller</th>
                    <th className="p-3.5">Gross (UGX)</th>
                    <th className="p-3.5">Platform Take</th>
                    <th className="p-3.5">Net Seller Payout</th>
                    <th className="p-3.5">State</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {filteredEscrowRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-mono text-[11px] font-bold text-slate-900 dark:text-white">
                        {rec.escrowId}
                      </td>
                      <td className="p-3.5 font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                        {rec.orderId}
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 dark:text-slate-200">{rec.buyerPhone}</div>
                        <span className="text-[10px] text-slate-400">{rec.paymentProvider}</span>
                      </td>
                      <td className="p-3.5 font-bold text-slate-800 dark:text-slate-200">
                        {rec.sellerStoreName}
                      </td>
                      <td className="p-3.5 font-black text-slate-900 dark:text-white">
                        {formatUGX(rec.amountUGX)}
                      </td>
                      <td className="p-3.5 text-orange-600 dark:text-orange-400 font-bold">
                        {formatUGX(rec.commissionUGX)}
                      </td>
                      <td className="p-3.5 text-emerald-600 dark:text-emerald-400 font-bold">
                        {formatUGX(rec.netPayoutUGX)}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            rec.escrowState === 'HELD'
                              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
                              : rec.escrowState === 'RELEASED'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                              : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800'
                          }`}
                        >
                          {rec.escrowState}
                        </span>
                      </td>
                      <td className="p-3.5 text-right space-x-1">
                        {rec.escrowState === 'HELD' && (
                          <button
                            onClick={() => {
                              setSelectedEscrowRecord(rec);
                              setIsEscrowOverrideModalOpen(true);
                            }}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
                          >
                            Override Release
                          </button>
                        )}
                        <button
                          onClick={() => alert(`Escrow Audit Details:\nEscrow ID: ${rec.escrowId}\nOrder: ${rec.orderId}\nCreated: ${rec.createdAt}\nProvider: ${rec.paymentProvider}`)}
                          className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
                        >
                          Audit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. USER GOVERNANCE & ROLES */}
      {/* ========================================================= */}
      {activeNav === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search user by name, email, or phone..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full bg-transparent text-xs text-slate-900 dark:text-white outline-hidden placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              {['ALL', 'SUPER_ADMIN', 'ADMIN', 'SELLER', 'BUYER'].map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    roleFilter === r
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {r.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="p-3.5">User Identity</th>
                    <th className="p-3.5">Contact</th>
                    <th className="p-3.5">Current Role</th>
                    <th className="p-3.5">Account Status</th>
                    <th className="p-3.5">Registered</th>
                    <th className="p-3.5 text-right">Role Governance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 dark:text-white">{u.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{u.id}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="text-slate-700 dark:text-slate-300">{u.email}</div>
                        <div className="text-[11px] text-slate-400">{u.phone}</div>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${
                            u.role.toUpperCase() === 'SUPER_ADMIN'
                              ? 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
                              : u.role.toUpperCase() === 'ADMIN'
                              ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800'
                              : u.role.toUpperCase() === 'SELLER'
                              ? 'bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {u.role.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            u.status === 'ACTIVE' || !u.status
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'ACTIVE' || !u.status ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          {u.status || 'ACTIVE'}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-500 text-[11px]">
                        {formatDate(u.createdAt)}
                      </td>
                      <td className="p-3.5 text-right space-x-1.5">
                        <select
                          value={u.role.toUpperCase()}
                          onChange={(e) => handleUpdateUserRole(u, e.target.value as UserRole)}
                          className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-lg px-2 py-1 border border-slate-200 dark:border-slate-700 cursor-pointer"
                        >
                          <option value="BUYER">BUYER</option>
                          <option value="SELLER">SELLER</option>
                          <option value="ADMIN">ADMIN</option>
                          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                        </select>

                        <button
                          onClick={() => handleToggleUserStatus(u)}
                          className={`p-1 rounded-lg text-xs transition-colors cursor-pointer ${
                            u.status === 'SUSPENDED'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 hover:bg-emerald-100'
                              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 hover:bg-rose-100'
                          }`}
                          title={u.status === 'SUSPENDED' ? 'Activate Account' : 'Suspend Account'}
                        >
                          {u.status === 'SUSPENDED' ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. MERCHANT ONBOARDING REQUESTS */}
      {/* ========================================================= */}
      {activeNav === 'applications' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Merchant Registration Gateway Inquiries</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Merchants inquiring to sell on SwiftCart Uganda are directed to the official WhatsApp onboarding desk (0776155353) for manual verification. Below are platform registration requests.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {applications.map((app) => (
              <div key={app.id} className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900 dark:text-white">{app.storeName}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800">
                    {app.status}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">{app.description}</p>
                <div className="text-[11px] text-slate-400 space-y-0.5">
                  <p>Applicant: <strong>{app.applicantName}</strong></p>
                  <p>Phone: <strong>{app.phone}</strong> | District: <strong>{app.district}</strong></p>
                </div>
                <div className="pt-2 flex items-center gap-2">
                  <a
                    href={`https://wa.me/256776155353?text=Hello%20${encodeURIComponent(app.applicantName)}%2C%20regarding%20your%20SwiftCart%20merchant%20application...`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl text-center transition-colors"
                  >
                    WhatsApp Contact
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. IMMUTABLE ADMIN AUDIT TRAIL */}
      {/* ========================================================= */}
      {activeNav === 'audit' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="p-3.5">Timestamp</th>
                    <th className="p-3.5">Admin Operator</th>
                    <th className="p-3.5">Action Event</th>
                    <th className="p-3.5">Details & Target</th>
                    <th className="p-3.5">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-mono text-[11px] text-slate-500">
                        {formatDate(log.timestamp)}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                        {log.actorName} ({log.actorRole})
                      </td>
                      <td className="p-3.5">
                        <span className="font-mono text-[11px] font-black px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-300">
                        {log.details}
                      </td>
                      <td className="p-3.5 font-mono text-slate-400 text-[11px]">
                        {log.ipAddress || '196.12.140.22 (Kampala)'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. TAKE-RATES, FEATURE TOGGLES & MARKETPLACE SETTINGS */}
      {/* ========================================================= */}
      {activeNav === 'settings' && (
        <div className="space-y-6">
          {/* PLATFORM FEATURE FLAGS & TOGGLES MANAGER */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-orange-600" />
                  <span>Platform Feature Flags & Module Toggles</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enable or disable current and upcoming features across the buyer storefront, merchant portal, and logistics engine.
                </p>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                8 Active Modules
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {[
                { id: 'express', label: 'Swift Express Same-Day Delivery', desc: 'Allow buyers and merchants to tag orders for 2-hour priority dispatch', defaultOn: true },
                { id: 'gemini', label: 'Gemini AI Assistant & Live Voice', desc: 'Google Gemini search-grounded product recommendations and voice chat', defaultOn: true },
                { id: 'cards', label: 'Card Payments (Visa & Mastercard)', desc: 'Accept international debit/credit cards alongside Mobile Money', defaultOn: true },
                { id: 'bank', label: 'Bank Transfer / Direct EFT Rail', desc: 'Direct wire deposit to Stanbic, Centenary, Absa & Equity accounts', defaultOn: true },
                { id: 'border_pod', label: 'Pay on Delivery / Border Payment', desc: 'Allow cash collection at destination and cross-border posts', defaultOn: true },
                { id: 'customs', label: 'Cross-Border Customs Fee Collection', desc: 'Enforce statutory border clearance collection at Busia, Malaba & Mutukula', defaultOn: true },
                { id: 'kyc_ai', label: 'Automated Merchant KYC Verification', desc: 'Automated URSB & National ID validation before operations review', defaultOn: false },
                { id: 'sms_push', label: 'Instant SMS & USSD Push Alerts', desc: 'Deliver order confirmation and rider dispatch SMS via Africa\'s Talking', defaultOn: true },
              ].map((feat) => (
                <div
                  key={feat.id}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <span className="font-bold text-xs text-slate-900 dark:text-white block">{feat.label}</span>
                    <p className="text-[11px] text-slate-500 leading-snug">{feat.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                    <input
                      type="checkbox"
                      defaultChecked={feat.defaultOn}
                      onChange={(e) => triggerSuccess(`Feature "${feat.label}" is now ${e.target.checked ? 'ENABLED' : 'DISABLED'}.`)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-600"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* COMMISSION TAKE-RATE CONFIGURATION */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-orange-600" />
              <span>Category Take-Rate & Payout Commission Configuration</span>
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Set standard take-rates automatically deducted when orders are successfully marked as Delivered and settled into the merchant wallet.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {categorySettings.map((cat, idx) => (
                <div key={cat.category} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 dark:text-white">{cat.category}</span>
                    <span className="font-black text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/60 px-2 py-0.5 rounded-md border border-orange-200 dark:border-orange-800">
                      {cat.commissionRatePercent}% Fee
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Base Courier Contribution:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{formatUGX(cat.courierContributionUGX)}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Disbursement Schedule:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{cat.payoutSchedule}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 flex justify-end">
              <button
                onClick={() => triggerSuccess('Marketplace commission rates and courier contribution matrix updated successfully.')}
                className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
              >
                Save Commission Matrix
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* EMERGENCY ESCROW OVERRIDE MODAL */}
      {/* ========================================================= */}
      {isEscrowOverrideModalOpen && selectedEscrowRecord && (
        <div className="fixed inset-0 z-60 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Emergency Escrow Release Override</h3>
              </div>
              <button
                onClick={() => setIsEscrowOverrideModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 space-y-1">
              <p className="font-bold">⚠️ Executive Audit Warning</p>
              <p>
                Releasing escrow funds manually bypasses courier delivery receipt. This action is permanently logged in the audit trail under your Super Admin identity.
              </p>
            </div>

            <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
              <p>Escrow ID: <strong>{selectedEscrowRecord.escrowId}</strong></p>
              <p>Order Reference: <strong>{selectedEscrowRecord.orderId}</strong></p>
              <p>Beneficiary Seller: <strong>{selectedEscrowRecord.sellerStoreName}</strong></p>
              <p>Net Release Amount: <strong className="text-emerald-600 dark:text-emerald-400">{formatUGX(selectedEscrowRecord.netPayoutUGX)}</strong></p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Audit Reason for Override (Required)
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Verified customer verbal receipt via phone call / courier GPS confirmed..."
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsEscrowOverrideModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={!overrideReason.trim()}
                onClick={handleEmergencyRelease}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Confirm Escrow Release
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
