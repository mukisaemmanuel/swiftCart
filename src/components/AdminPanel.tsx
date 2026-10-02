import React, { useState, useEffect, useMemo } from 'react';
import { dbService } from '../services/db';
import { Seller, Order, User, Product } from '../types';
import { formatUGX, formatDate } from '../utils/formatters';
import { DashboardLayout, NavItem, BreadcrumbItem } from './dashboard/DashboardLayout';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Store,
  Users,
  Package,
  TrendingUp,
  Search,
  PhoneCall,
  MessageSquare,
  AlertCircle,
  Bell,
  Clock,
  FileText,
  FileCheck2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Truck,
  Eye,
  AlertTriangle,
  Send,
  ThumbsUp,
  ThumbsDown,
  Phone,
  RefreshCw,
} from 'lucide-react';

const formatWhatsAppPhone = (phone: string): string => {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '256' + cleaned.substring(1);
  } else if (!cleaned.startsWith('256') && cleaned.length === 9) {
    cleaned = '256' + cleaned;
  }
  return cleaned;
};

interface AdminPanelProps {
  onBackToShopping: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBackToShopping }) => {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeNav, setActiveNav] = useState<'triage' | 'kyc' | 'qc' | 'dispatch' | 'sellers' | 'orders'>('triage');
  const [loading, setLoading] = useState(true);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // KYC Inspection Drawer State
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [docZoom, setDocZoom] = useState<number>(1);
  const [selectedDocType, setSelectedDocType] = useState<'national_id' | 'business_registration' | 'trading_license'>('national_id');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [feedbackNote, setFeedbackNote] = useState<Record<string, string>>({});
  const [kycFilter, setKycFilter] = useState<'ALL' | 'UNVERIFIED' | 'VERIFIED'>('ALL');
  const [kycSearch, setKycSearch] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [allSellers, allOrders, allUsers, allProducts] = await Promise.all([
        dbService.getSellers(),
        dbService.getOrders(),
        dbService.getUsers(),
        dbService.getProducts(),
      ]);
      setSellers(allSellers);
      setOrders(allOrders);
      setUsers(allUsers);
      setProducts(allProducts);
      if (allSellers.length > 0 && !selectedSeller) {
        setSelectedSeller(allSellers[0]);
      }
    } catch (e) {
      console.error('AdminPanel loadData error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const unsubSellers = dbService.subscribeToSellers((liveSellers) => {
      setSellers(liveSellers);
    });

    const unsubOrders = dbService.subscribeToOrders((liveOrders) => {
      setOrders(liveOrders);
    });

    const unsubUsers = dbService.subscribeToUsers((liveUsers) => {
      setUsers(liveUsers);
    });

    return () => {
      unsubSellers();
      unsubOrders();
      unsubUsers();
    };
  }, []);

  const triggerNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleApproveSeller = async (sellerId: string) => {
    const note = feedbackNote[sellerId] || 'URSB and National ID verified. Store authorized for SwiftCart Uganda.';
    await dbService.reviewSellerVerification(sellerId, true, note);
    triggerNotice('Seller KYC Approved! Storefront is now live for orders.');
    await loadData();
  };

  const handleRejectSeller = async () => {
    if (!selectedSeller || !rejectReason.trim()) return;
    await dbService.reviewSellerVerification(selectedSeller.id, false, rejectReason);
    triggerNotice(`Application for ${selectedSeller.storeName} rejected with feedback sent.`);
    setIsRejectModalOpen(false);
    setRejectReason('');
    await loadData();
  };

  // Filtered KYC Applicants
  const filteredSellersForKYC = useMemo(() => {
    return sellers.filter((s) => {
      const matchesSearch =
        s.storeName.toLowerCase().includes(kycSearch.toLowerCase()) ||
        s.phone.includes(kycSearch) ||
        s.district.toLowerCase().includes(kycSearch.toLowerCase());
      const matchesStatus =
        kycFilter === 'ALL'
          ? true
          : kycFilter === 'VERIFIED'
          ? s.isVerified
          : !s.isVerified;
      return matchesSearch && matchesStatus;
    });
  }, [sellers, kycSearch, kycFilter]);

  // Operational Triage Queues
  const unverifiedSellersCount = sellers.filter((s) => !s.isVerified).length;
  const inTransitOrders = orders.filter((o) => o.status === 'Shipped');
  const pendingPackOrders = orders.filter((o) => o.status === 'Pending' || o.status === 'Confirmed');

  // Navigation Items
  const navItems: NavItem[] = [
    { id: 'triage', label: 'Operational Triage', icon: TrendingUp, group: 'Core Management' },
    { id: 'kyc', label: 'Seller KYC Workbench', icon: FileCheck2, badge: unverifiedSellersCount, badgeVariant: 'rose', group: 'Core Management' },
    { id: 'qc', label: 'Product QC Queue', icon: Package, badge: products.length, group: 'Catalog Management' },
    { id: 'dispatch', label: 'Rider Custody Monitor', icon: Truck, badge: inTransitOrders.length, badgeVariant: 'amber', group: 'Logistics' },
    { id: 'sellers', label: 'Sellers Directory', icon: Store, group: 'Directory' },
    { id: 'orders', label: 'Master Orders Desk', icon: Clock, group: 'Directory' },
  ];

  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Operations Hub' },
    { label: navItems.find((n) => n.id === activeNav)?.label || 'Overview' },
    ...(activeNav === 'kyc' && selectedSeller ? [{ label: selectedSeller.storeName }] : []),
  ];

  return (
    <DashboardLayout
      role="ADMIN"
      title={
        activeNav === 'triage'
          ? 'Operations Triage & Queue Monitor'
          : activeNav === 'kyc'
          ? 'Seller KYC Review & Verification Workbench'
          : activeNav === 'qc'
          ? 'Product Catalog Quality Control (QC)'
          : activeNav === 'dispatch'
          ? 'Active Dispatch & Rider Custody Tracker'
          : activeNav === 'sellers'
          ? 'Verified Merchant Network Directory'
          : 'Master Order Fulfillment Center'
      }
      subtitle="Review merchant identification packets, enforce catalog quality standards, and monitor courier rider handovers."
      breadcrumbs={breadcrumbs}
      navItems={navItems}
      activeNavId={activeNav}
      onSelectNav={(id) => setActiveNav(id as any)}
      onViewLiveStore={onBackToShopping}
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            title="Refresh Operations Queue"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      }
    >
      {/* Action Toast Alert */}
      {actionNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 shadow-xs animate-in fade-in slide-in-from-top-1">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. OPERATIONAL TRIAGE OVERVIEW */}
      {/* ========================================================= */}
      {activeNav === 'triage' && (
        <div className="space-y-6">
          {/* 4 Triage Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Pending KYC */}
            <div
              onClick={() => setActiveNav('kyc')}
              className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2 hover:border-orange-500/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Pending Seller KYC
                </span>
                <span className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center font-bold">
                  <FileCheck2 className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
                {unverifiedSellersCount} Stores
              </div>
              <p className="text-[11px] text-slate-400">Needs National ID & URSB check</p>
            </div>

            {/* Product QC Queue */}
            <div
              onClick={() => setActiveNav('qc')}
              className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2 hover:border-orange-500/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Product QC Queue
                </span>
                <span className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center font-bold">
                  <Package className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {products.length} Items
              </div>
              <p className="text-[11px] text-slate-400">Pricing & image policy audit</p>
            </div>

            {/* Active Dispatches */}
            <div
              onClick={() => setActiveNav('dispatch')}
              className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2 hover:border-orange-500/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  In-Transit Dispatches
                </span>
                <span className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center font-bold">
                  <Truck className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {inTransitOrders.length} Couriers
              </div>
              <p className="text-[11px] text-slate-400">Active boda & van custody</p>
            </div>

            {/* Customer Claims / Returns */}
            <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Disputes & Returns
                </span>
                <span className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                0 Active Claims
              </div>
              <p className="text-[11px] text-slate-400">100% MoMo Escrow Protected</p>
            </div>
          </div>

          {/* Quick Shortcuts & Urgent Action Banners */}
          <div className="bg-linear-to-r from-orange-600 to-amber-600 rounded-2xl p-6 text-white shadow-lg space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 fill-white" />
              <h3 className="font-extrabold text-base">SwiftCart Uganda Merchant Integrity Protocol</h3>
            </div>
            <p className="text-xs text-orange-100 max-w-2xl leading-relaxed">
              Before approving any merchant storefront, verify the applicant's National ID Number (NIN) against the URSB business registration certificate. Ensure the MTN MoMo payout line name strictly matches legal registration.
            </p>
            <button
              onClick={() => setActiveNav('kyc')}
              className="px-4 py-2 bg-white text-orange-800 font-bold text-xs rounded-xl hover:bg-orange-50 transition-colors shadow-xs cursor-pointer"
            >
              Open KYC Inspection Workbench
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. SELLER KYC REVIEW WORKBENCH (Split-View / Inspection Drawer) */}
      {/* ========================================================= */}
      {activeNav === 'kyc' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search merchant name, district, or phone..."
                value={kycSearch}
                onChange={(e) => setKycSearch(e.target.value)}
                className="w-full bg-transparent text-xs text-slate-900 dark:text-white outline-hidden placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-center gap-1.5">
              {(['ALL', 'UNVERIFIED', 'VERIFIED'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setKycFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    kycFilter === st
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Workbench Split View: Compact Table on Left, Inspection Drawer on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Compact Filterable Applicants Table */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs flex flex-col max-h-[750px]">
              <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
                <span className="font-bold text-xs text-slate-700 dark:text-slate-300">
                  Applicants ({filteredSellersForKYC.length})
                </span>
                <span className="text-[10px] text-slate-400">Click to Inspect</span>
              </div>

              <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredSellersForKYC.map((seller) => {
                  const isSelected = selectedSeller?.id === seller.id;
                  return (
                    <div
                      key={seller.id}
                      onClick={() => setSelectedSeller(seller)}
                      className={`p-3.5 transition-colors cursor-pointer space-y-1.5 ${
                        isSelected
                          ? 'bg-orange-50/60 dark:bg-orange-950/30 border-l-4 border-orange-600'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {seller.storeName}
                        </span>
                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                            seller.isVerified
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                          }`}
                        >
                          {seller.isVerified ? 'VERIFIED' : 'PENDING KYC'}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                        <span>{seller.district || 'Kampala'}</span>
                        <span>{seller.phone}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Inspection Drawer / Detail View */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-6">
              {selectedSeller ? (
                <>
                  {/* Store Header & Status */}
                  <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-black text-slate-900 dark:text-white">
                          {selectedSeller.storeName}
                        </h2>
                        {selectedSeller.isVerified ? (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200">
                            <Clock className="w-3.5 h-3.5" /> In Review
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{selectedSeller.bio || 'Registered merchant on SwiftCart Uganda.'}</p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <a
                        href={`https://wa.me/${formatWhatsAppPhone(selectedSeller.phone)}?text=Hello%20${encodeURIComponent(selectedSeller.storeName)}%2C%20this%20is%20SwiftCart%20Operations%20Admin%20regarding%20your%20verification...`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 hover:bg-emerald-100 transition-colors"
                        title="Direct WhatsApp"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </a>
                      <a
                        href={`tel:${selectedSeller.phone}`}
                        className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 hover:bg-amber-100 transition-colors"
                        title="Call Merchant"
                      >
                        <PhoneCall className="w-4 h-4" />
                      </a>
                    </div>
                  </div>

                  {/* Merchant Identity & Bank/MoMo Verification Details */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Legal Registered Name</span>
                      <p className="font-bold text-slate-800 dark:text-slate-200">{selectedSeller.storeName} Limited</p>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">National ID (NIN) / TIN</span>
                      <p className="font-bold font-mono text-slate-800 dark:text-slate-200">
                        {selectedSeller.tinNumber || 'CM94032109X87'}
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">MTN MoMo Payout Line</span>
                      <p className="font-bold text-slate-800 dark:text-slate-200">{selectedSeller.momoNumber || selectedSeller.phone}</p>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">District / Address</span>
                      <p className="font-bold text-slate-800 dark:text-slate-200">{selectedSeller.district}, {selectedSeller.address}</p>
                    </div>
                  </div>

                  {/* Document Viewer with Zoom Controls */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Document:</span>
                        <div className="flex items-center gap-1 text-[11px] font-bold">
                          <button
                            onClick={() => setSelectedDocType('national_id')}
                            className={`px-2.5 py-1 rounded-lg ${selectedDocType === 'national_id' ? 'bg-orange-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}
                          >
                            National ID
                          </button>
                          <button
                            onClick={() => setSelectedDocType('business_registration')}
                            className={`px-2.5 py-1 rounded-lg ${selectedDocType === 'business_registration' ? 'bg-orange-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}
                          >
                            URSB Certificate
                          </button>
                        </div>
                      </div>

                      {/* Zoom controls */}
                      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        <button
                          onClick={() => setDocZoom((z) => Math.max(0.75, z - 0.25))}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 cursor-pointer"
                        >
                          <ZoomOut className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[10px] font-mono px-1 font-bold">{Math.round(docZoom * 100)}%</span>
                        <button
                          onClick={() => setDocZoom((z) => Math.min(2.5, z + 0.25))}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 cursor-pointer"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDocZoom(1)}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Viewport Frame */}
                    <div className="h-64 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center relative">
                      <img
                        src={
                          selectedDocType === 'national_id'
                            ? selectedSeller.verificationDocumentUrl || 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80'
                            : 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80'
                        }
                        alt="KYC Document Preview"
                        style={{ transform: `scale(${docZoom})` }}
                        className="max-h-full max-w-full object-contain transition-transform duration-150"
                      />
                      <span className="absolute bottom-2 left-2 text-[10px] bg-black/70 text-slate-300 px-2 py-0.5 rounded backdrop-blur-xs">
                        {selectedDocType.toUpperCase().replace('_', ' ')} • High-Resolution Scan
                      </span>
                    </div>
                  </div>

                  {/* KYC Action Bar */}
                  <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => setIsRejectModalOpen(true)}
                      className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                    >
                      Reject with Reason
                    </button>

                    <button
                      onClick={() => handleApproveSeller(selectedSeller.id)}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve & Activate Storefront</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="p-12 text-center text-xs text-slate-400">
                  Select an applicant from the table to begin inspection.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. PRODUCT MODERATION QUEUE */}
      {/* ========================================================= */}
      {activeNav === 'qc' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-xs text-slate-900 dark:text-white">Live Product Catalog Moderation Queue</h3>
              <span className="text-xs text-slate-400">Showing {products.length} Products</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="p-3.5">Product Title & Image</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Merchant Store</th>
                    <th className="p-3.5">Retail Price</th>
                    <th className="p-3.5">Est. Seller Payout</th>
                    <th className="p-3.5 text-right">Moderation Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {products.map((prod) => (
                    <tr key={prod.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 flex items-center gap-3">
                        <img
                          src={prod.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=150&q=80'}
                          alt={prod.title}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                        />
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">{prod.title}</div>
                          <div className="text-[10px] text-slate-400">Stock: {prod.stockQuantity} units</div>
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-700 dark:text-slate-300">{prod.category}</td>
                      <td className="p-3.5 font-bold text-slate-800 dark:text-slate-200">{prod.sellerStoreName}</td>
                      <td className="p-3.5 font-black text-slate-900 dark:text-white">{formatUGX(prod.priceUGX)}</td>
                      <td className="p-3.5 text-emerald-600 dark:text-emerald-400 font-bold">{formatUGX(Math.round(prod.priceUGX * 0.88))}</td>
                      <td className="p-3.5 text-right space-x-1.5">
                        <button
                          onClick={() => triggerNotice(`Product "${prod.title}" approved and featured!`)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg cursor-pointer"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => triggerNotice(`Revision requested from merchant for "${prod.title}".`)}
                          className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-[11px] rounded-lg cursor-pointer"
                        >
                          Request Revision
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
      {/* 4. ACTIVE DISPATCH & RIDER CUSTODY MONITOR */}
      {/* ========================================================= */}
      {activeNav === 'dispatch' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Active Courier & Boda Dispatch Custody</h3>
              <p className="text-xs text-slate-500">Live tracker of orders transferred to couriers with verified 4-digit Handover OTPs.</p>
            </div>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-3 py-1 rounded-full border border-amber-200">
              {inTransitOrders.length} Active in Transit
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orders.map((order) => (
              <div key={order.id} className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-slate-900 dark:text-white">{order.id}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800">
                    {order.status}
                  </span>
                </div>

                <div className="text-xs space-y-1 text-slate-600 dark:text-slate-300">
                  <p>Merchant: <strong>{order.sellerStoreName}</strong></p>
                  <p>Buyer: <strong>{order.buyerName}</strong> ({order.buyerPhone})</p>
                  <p>Destination: <strong>{order.deliveryAddress?.district}, {order.deliveryAddress?.streetAddress}</strong></p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                    <span className="flex items-center gap-1 text-orange-600"><Truck className="w-3.5 h-3.5" /> Courier Custody</span>
                    <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-mono">OTP Verified</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Rider: <strong>John Katende</strong> (Plate: <strong>UFA 882M</strong>)</p>
                  <p className="text-[11px] text-slate-500">NIN: <strong>CM88129032X01</strong> • Contact: <strong>0776155353</strong></p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. SELLERS DIRECTORY */}
      {/* ========================================================= */}
      {activeNav === 'sellers' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-3.5">Store Name</th>
                  <th className="p-3.5">District & Address</th>
                  <th className="p-3.5">Phone & MoMo</th>
                  <th className="p-3.5">Rating</th>
                  <th className="p-3.5">KYC Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {sellers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">{s.storeName}</td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-300">{s.district}, {s.address}</td>
                    <td className="p-3.5 font-mono text-slate-700 dark:text-slate-300">{s.phone}</td>
                    <td className="p-3.5 font-bold text-amber-600">★ {s.rating.toFixed(1)}</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.isVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {s.isVerified ? 'VERIFIED' : 'PENDING'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. ORDERS DESK */}
      {/* ========================================================= */}
      {activeNav === 'orders' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-3.5">Order ID</th>
                  <th className="p-3.5">Customer</th>
                  <th className="p-3.5">Seller</th>
                  <th className="p-3.5">Total Amount</th>
                  <th className="p-3.5">Payment</th>
                  <th className="p-3.5">Fulfillment Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-slate-900 dark:text-white">{o.id}</td>
                    <td className="p-3.5 text-slate-700 dark:text-slate-300">{o.buyerName}</td>
                    <td className="p-3.5 font-bold text-slate-800 dark:text-slate-200">{o.sellerStoreName}</td>
                    <td className="p-3.5 font-black text-slate-900 dark:text-white">{formatUGX(o.totalUGX)}</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600">
                        {o.paymentStatus.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-orange-600">{o.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* REJECT WITH REASON MODAL */}
      {/* ========================================================= */}
      {isRejectModalOpen && selectedSeller && (
        <div className="fixed inset-0 z-60 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Reject KYC Application</h3>
              <button onClick={() => setIsRejectModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Provide feedback for <strong>{selectedSeller.storeName}</strong> explaining why their verification documents were rejected:
            </p>

            <textarea
              rows={4}
              placeholder="e.g. The URSB certificate is blurry or the MoMo registered name does not match the National ID..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-hidden"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setIsRejectModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                disabled={!rejectReason.trim()}
                onClick={handleRejectSeller}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
