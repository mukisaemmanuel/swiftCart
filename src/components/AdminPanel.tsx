import React, { useState, useEffect, useMemo } from 'react';
import { dbService } from '../services/db';
import {
  Seller,
  Order,
  User,
  Product,
  SellerApplication,
  SellerApplicationStatus,
  DirectSellerIntakeInput,
  ProductCategory,
} from '../types';
import { formatUGX, formatDate } from '../utils/formatters';
import { calculatePricing } from '../utils/pricingCalculator';
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
  Copy,
  Check,
  UserPlus,
  Mail,
  Building2,
  Sparkles,
  MapPin,
  FileSignature,
  Loader2,
  Tag,
  Calculator,
  Info,
  X,
  Layers,
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

const INTAKE_CATEGORIES: ProductCategory[] = [
  'Phones & Tablets',
  'Electronics & TV',
  'Fashion & Apparel',
  'Health & Beauty',
  'Home & Kitchen',
  'Groceries & Supermarket',
  'Solar & Power Solutions',
  'Computing & Accessories',
  'Baby, Kids & Toys',
  'Automotive & Hardware',
];

const INTAKE_DISTRICTS = [
  'Kampala (Central)',
  'Kampala (Nakawa)',
  'Kampala (Makindye)',
  'Kampala (Kawempe)',
  'Kampala (Rubaga)',
  'Wakiso (Entebbe / Kira / Nansana)',
  'Mukono',
  'Jinja',
  'Mbarara',
  'Gulu',
  'Mbale',
  'Busia (Border Commercial Hub)',
  'Masaka',
  'Fort Portal',
  'Arua',
  'Lira',
  'Kasese',
  'Other District',
];

interface AdminPanelProps {
  onBackToShopping: () => void;
  initialTab?: 'triage' | 'leads' | 'kyc' | 'qc' | 'dispatch' | 'sellers' | 'orders';
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBackToShopping, initialTab = 'triage' }) => {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [applications, setApplications] = useState<SellerApplication[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeNav, setActiveNav] = useState<'triage' | 'leads' | 'kyc' | 'qc' | 'dispatch' | 'sellers' | 'orders'>(initialTab);
  const [loading, setLoading] = useState(true);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Direct Seller Intake Modal State
  const [isDirectIntakeModalOpen, setIsDirectIntakeModalOpen] = useState(false);
  const [directIntakeForm, setDirectIntakeForm] = useState<DirectSellerIntakeInput>({
    fullName: '',
    shopName: '',
    phoneNumber: '',
    category: 'Phones & Tablets',
    location: 'Kampala (Central)',
    adminNotes: '',
  });
  const [isIntakeSubmitting, setIsIntakeSubmitting] = useState(false);
  const [intakeError, setIntakeError] = useState<string | null>(null);

  // Leads & Invite Token Modal State
  const [leadsSearch, setLeadsSearch] = useState('');
  const [leadsFilter, setLeadsFilter] = useState<string>('ALL');
  const [generatedInvite, setGeneratedInvite] = useState<{
    token: string;
    inviteUrl: string;
    expiresAt: string;
    storeName: string;
    fullName: string;
    phone: string;
    whatsappUrl: string;
  } | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // KYC Inspection Workbench State
  const [selectedAppForKYC, setSelectedAppForKYC] = useState<SellerApplication | null>(null);
  const [docZoom, setDocZoom] = useState<number>(1);
  const [selectedDocType, setSelectedDocType] = useState<'national_id' | 'national_id_back' | 'business_cert' | 'financial_proof'>('national_id');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [kycFilter, setKycFilter] = useState<'ALL' | 'DOCUMENTS_SUBMITTED' | 'APPROVED' | 'REJECTED'>('ALL');
  const [kycSearch, setKycSearch] = useState('');

  // Product Catalog QC Moderation State
  const [selectedProductForQC, setSelectedProductForQC] = useState<Product | null>(null);
  const [isQCModalOpen, setIsQCModalOpen] = useState(false);
  const [selectedProductImageIdx, setSelectedProductImageIdx] = useState<number>(0);
  const [isProductRejectModalOpen, setIsProductRejectModalOpen] = useState(false);
  const [productRejectReason, setProductRejectReason] = useState('');
  const [qcFilter, setQcFilter] = useState<'ALL' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED'>('ALL');
  const [qcSearch, setQcSearch] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [allSellers, allApps, allOrders, allUsers, allProducts] = await Promise.all([
        dbService.getSellers(),
        dbService.getSellerApplications(),
        dbService.getOrders(),
        dbService.getUsers(),
        dbService.getProducts(),
      ]);
      setSellers(allSellers);
      setApplications(allApps);
      setOrders(allOrders);
      setUsers(allUsers);
      setProducts(allProducts);

      // Default select first application with documents or pending
      if (allApps.length > 0 && !selectedAppForKYC) {
        const kycTarget = allApps.find((a) => a.status === 'DOCUMENTS_SUBMITTED') || allApps[0];
        setSelectedAppForKYC(kycTarget);
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

  // Direct Seller Intake Submit
  const handleDirectIntakeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIntakeError(null);

    if (!directIntakeForm.fullName.trim() || !directIntakeForm.shopName.trim()) {
      setIntakeError('Please provide merchant full name and shop name.');
      return;
    }
    if (!directIntakeForm.phoneNumber.trim() || directIntakeForm.phoneNumber.length < 9) {
      setIntakeError('Please enter a valid active Ugandan telephone number.');
      return;
    }

    try {
      setIsIntakeSubmitting(true);
      const res = await dbService.createDirectSellerIntake(directIntakeForm, {
        id: 'user_admin_1',
        name: 'Operations Admin',
        role: 'ADMIN',
      });

      setIsDirectIntakeModalOpen(false);
      setDirectIntakeForm({
        fullName: '',
        shopName: '',
        phoneNumber: '',
        category: 'Phones & Tablets',
        location: 'Kampala (Central)',
        adminNotes: '',
      });

      setGeneratedInvite({
        token: res.token,
        inviteUrl: res.inviteUrl,
        expiresAt: res.expiresAt,
        storeName: res.application.storeName,
        fullName: res.application.applicantName,
        phone: res.application.phone,
        whatsappUrl: res.whatsappUrl,
      });

      triggerNotice(`Direct intake created for "${res.application.storeName}"! WhatsApp invite ready.`);
      await loadData();
    } catch (err: any) {
      setIntakeError(err?.message || 'Failed to create direct intake record.');
    } finally {
      setIsIntakeSubmitting(false);
    }
  };

  // Generate 48h Invite Token for Existing Lead
  const handleGenerateInvite = async (app: SellerApplication) => {
    try {
      const res = await dbService.createSellerInvite(app.id, {
        id: 'user_admin_1',
        name: 'Operations Admin',
        role: 'ADMIN',
      });

      const sanitizedWhatsAppPhone = app.phone.replace(/[^0-9]/g, '');
      const prefilledMessage = `Hello ${app.applicantName}, thank you for contacting SwiftCart Uganda! Your merchant intake has been initiated for ${app.storeName}. Complete your official identity registration and payout verification (NIN, TIN & MoMo details) here: ${res.inviteUrl} . This link expires in 48 hours.`;
      const whatsappUrl = `https://wa.me/${sanitizedWhatsAppPhone}?text=${encodeURIComponent(prefilledMessage)}`;

      setGeneratedInvite({
        token: res.token,
        inviteUrl: res.inviteUrl,
        expiresAt: res.expiresAt,
        storeName: app.storeName,
        fullName: app.applicantName,
        phone: app.phone,
        whatsappUrl,
      });
      triggerNotice(`48h invite generated for "${app.storeName}"!`);
      await loadData();
    } catch (err: any) {
      triggerNotice(`Failed to generate invite: ${err?.message || 'Error'}`);
    }
  };

  // Copy Invite Link to Clipboard
  const handleCopyInviteLink = () => {
    if (!generatedInvite) return;
    navigator.clipboard.writeText(generatedInvite.inviteUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
    triggerNotice('Invitation URL copied to clipboard!');
  };

  // Approve Seller KYC
  const handleApproveKYC = async (appId: string) => {
    try {
      const res = await dbService.approveSellerKYC(appId, {
        id: 'user_admin_1',
        name: 'Operations Admin',
        role: 'ADMIN',
      });
      triggerNotice(`Seller KYC Approved! "${res.seller.storeName}" is now active on SwiftCart.`);
      await loadData();
    } catch (err: any) {
      triggerNotice(`Approval failed: ${err?.message || 'Error'}`);
    }
  };

  // Reject Seller KYC
  const handleRejectKYC = async () => {
    if (!selectedAppForKYC || !rejectReason.trim()) return;
    try {
      await dbService.rejectSellerKYC(selectedAppForKYC.id, rejectReason, {
        id: 'user_admin_1',
        name: 'Operations Admin',
        role: 'ADMIN',
      });
      triggerNotice(`KYC for ${selectedAppForKYC.storeName} rejected with feedback logged.`);
      setIsRejectModalOpen(false);
      setRejectReason('');
      await loadData();
    } catch (err: any) {
      triggerNotice(`Rejection failed: ${err?.message || 'Error'}`);
    }
  };

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return applications.filter((app) => {
      const applicantName = app.full_name || app.applicantName || '';
      const storeName = app.shop_name || app.storeName || '';
      const phone = app.phone_number || app.phone || '';
      const district = app.location || app.district || '';

      const matchesSearch =
        storeName.toLowerCase().includes(leadsSearch.toLowerCase()) ||
        applicantName.toLowerCase().includes(leadsSearch.toLowerCase()) ||
        phone.includes(leadsSearch) ||
        district.toLowerCase().includes(leadsSearch.toLowerCase());
      const matchesStatus = leadsFilter === 'ALL' ? true : app.status === leadsFilter;
      return matchesSearch && matchesStatus;
    });
  }, [applications, leadsSearch, leadsFilter]);

  // Filtered KYC Applications
  const filteredKYCApps = useMemo(() => {
    return applications.filter((app) => {
      const applicantName = app.full_name || app.applicantName || '';
      const storeName = app.shop_name || app.storeName || '';
      const phone = app.phone_number || app.phone || '';
      const district = app.location || app.district || '';

      const matchesSearch =
        storeName.toLowerCase().includes(kycSearch.toLowerCase()) ||
        applicantName.toLowerCase().includes(kycSearch.toLowerCase()) ||
        phone.includes(kycSearch) ||
        district.toLowerCase().includes(kycSearch.toLowerCase());
      const matchesStatus =
        kycFilter === 'ALL'
          ? true
          : kycFilter === 'DOCUMENTS_SUBMITTED'
          ? app.status === 'DOCUMENTS_SUBMITTED'
          : kycFilter === 'APPROVED'
          ? app.status === 'APPROVED' || app.status === 'VERIFIED'
          : app.status === 'REJECTED';
      return matchesSearch && matchesStatus;
    });
  }, [applications, kycSearch, kycFilter]);

  // Product QC Handlers
  const handleApproveProduct = async (product: Product) => {
    try {
      await dbService.reviewProductQC(
        { productId: product.id, approved: true },
        { id: 'user_admin_1', name: 'SwiftCart Operations Admin' }
      );
      triggerNotice(`Product "${product.title}" approved and published to buyer storefront!`);
      setIsQCModalOpen(false);
      setSelectedProductForQC(null);
      await loadData();
    } catch (e: any) {
      triggerNotice(`Approval failed: ${e?.message || e}`);
    }
  };

  const handleRejectProduct = async () => {
    if (!selectedProductForQC) return;
    if (!productRejectReason.trim()) {
      alert('Please enter a rejection explanation for the merchant.');
      return;
    }
    try {
      await dbService.reviewProductQC(
        {
          productId: selectedProductForQC.id,
          approved: false,
          rejectionReason: productRejectReason.trim(),
        },
        { id: 'user_admin_1', name: 'SwiftCart Operations Admin' }
      );
      triggerNotice(`Product "${selectedProductForQC.title}" rejected and feedback returned to merchant.`);
      setIsProductRejectModalOpen(false);
      setIsQCModalOpen(false);
      setSelectedProductForQC(null);
      setProductRejectReason('');
      await loadData();
    } catch (e: any) {
      triggerNotice(`Rejection failed: ${e?.message || e}`);
    }
  };

  const handleOpenQCModal = (product: Product) => {
    setSelectedProductForQC(product);
    setSelectedProductImageIdx(0);
    setIsQCModalOpen(true);
  };

  // Filtered QC Products
  const filteredQCProducts = useMemo(() => {
    return products.filter((prod) => {
      const currentStatus = prod.status || 'APPROVED';
      const matchesStatus =
        qcFilter === 'ALL'
          ? true
          : qcFilter === 'APPROVED'
          ? currentStatus === 'APPROVED'
          : currentStatus === qcFilter;

      const q = qcSearch.toLowerCase();
      const matchesSearch =
        !q ||
        prod.title.toLowerCase().includes(q) ||
        prod.sellerStoreName.toLowerCase().includes(q) ||
        (prod.brand && prod.brand.toLowerCase().includes(q)) ||
        prod.category.toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [products, qcFilter, qcSearch]);

  const pendingQCCount = useMemo(() => products.filter((p) => p.status === 'UNDER_REVIEW').length, [products]);
  const approvedQCCount = useMemo(() => products.filter((p) => p.status === 'APPROVED' || !p.status).length, [products]);
  const rejectedQCCount = useMemo(() => products.filter((p) => p.status === 'REJECTED').length, [products]);

  // Operational Triage Queues
  const pendingLeadsCount = applications.filter((a) => a.status === 'PENDING_REVIEW' || a.status === 'PENDING').length;
  const invitedLeadsCount = applications.filter((a) => a.status === 'INVITED').length;
  const pendingKYCCount = applications.filter((a) => a.status === 'DOCUMENTS_SUBMITTED').length;
  const inTransitOrders = orders.filter((o) => o.status === 'Shipped');

  // Navigation Items
  const navItems: NavItem[] = [
    { id: 'triage', label: 'Operational Triage', icon: TrendingUp, group: 'Core Management' },
    {
      id: 'leads',
      label: 'Seller Leads & 48h Invites',
      icon: UserPlus,
      badge: pendingLeadsCount + invitedLeadsCount,
      badgeVariant: 'amber',
      group: 'Core Management',
    },
    {
      id: 'kyc',
      label: 'Seller KYC Workbench',
      icon: FileCheck2,
      badge: pendingKYCCount,
      badgeVariant: 'rose',
      group: 'Core Management',
    },
    { id: 'qc', label: 'Product QC Queue', icon: Package, badge: pendingQCCount, badgeVariant: 'amber', group: 'Catalog Management' },
    { id: 'dispatch', label: 'Rider Custody Monitor', icon: Truck, badge: inTransitOrders.length, badgeVariant: 'amber', group: 'Logistics' },
    { id: 'sellers', label: 'Sellers Directory', icon: Store, group: 'Directory' },
    { id: 'orders', label: 'Master Orders Desk', icon: Clock, group: 'Directory' },
  ];

  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Operations Hub' },
    { label: navItems.find((n) => n.id === activeNav)?.label || 'Overview' },
    ...(activeNav === 'kyc' && selectedAppForKYC ? [{ label: selectedAppForKYC.storeName }] : []),
  ];

  return (
    <DashboardLayout
      role="ADMIN"
      title={
        activeNav === 'triage'
          ? 'Operations Triage & Queue Monitor'
          : activeNav === 'leads'
          ? 'Seller Applications & 48-Hour Invite Gateway'
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
      subtitle="Review merchant identification packets, generate 48h single-use registration invites, enforce catalog quality standards, and monitor courier rider handovers."
      breadcrumbs={breadcrumbs}
      navItems={navItems}
      activeNavId={activeNav}
      onSelectNav={(id) => setActiveNav(id as any)}
      onViewLiveStore={onBackToShopping}
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDirectIntakeModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Direct Seller Intake</span>
          </button>
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
            {/* New Inquiry Leads */}
            <div
              onClick={() => setActiveNav('leads')}
              className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2 hover:border-orange-500/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Active Inquiries & Invites
                </span>
                <span className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center font-bold">
                  <UserPlus className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {pendingLeadsCount + invitedLeadsCount} Leads
              </div>
              <p className="text-[11px] text-slate-400">{pendingLeadsCount} pending review • {invitedLeadsCount} invited (48h)</p>
            </div>

            {/* Pending KYC Documents */}
            <div
              onClick={() => setActiveNav('kyc')}
              className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2 hover:border-orange-500/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Submitted KYC Packets
                </span>
                <span className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center font-bold">
                  <FileCheck2 className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
                {pendingKYCCount} Packets
              </div>
              <p className="text-[11px] text-slate-400">National ID & financial proof inspection</p>
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
              <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
                {products.length} Products
              </div>
              <p className="text-[11px] text-slate-400">Active catalog compliance</p>
            </div>

            {/* Rider Custody in Transit */}
            <div
              onClick={() => setActiveNav('dispatch')}
              className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2 hover:border-orange-500/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Rider Custody (In Transit)
                </span>
                <span className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center font-bold">
                  <Truck className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                {inTransitOrders.length} Dispatches
              </div>
              <p className="text-[11px] text-slate-400">4-digit Handover OTP secured</p>
            </div>
          </div>

          {/* Quick Shortcuts & Urgent Action Banners */}
          <div className="bg-linear-to-r from-orange-600 to-amber-600 rounded-2xl p-6 text-white shadow-lg space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 fill-white" />
              <h3 className="font-extrabold text-base">SwiftCart Uganda Inbound Merchant Intake Desk</h3>
            </div>
            <p className="text-xs text-orange-100 max-w-2xl leading-relaxed">
              When prospective merchants call or WhatsApp our hotline (<strong>0776155353</strong>), click <strong>"+ Direct Seller Intake"</strong> to log their store details, generate a single-use 48-hour secure token, and dispatch a WhatsApp onboarding invitation.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => setIsDirectIntakeModalOpen(true)}
                className="px-4 py-2 bg-white text-orange-800 font-bold text-xs rounded-xl hover:bg-orange-50 transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Direct Seller Intake</span>
              </button>
              <button
                onClick={() => setActiveNav('leads')}
                className="px-4 py-2 bg-orange-700/80 text-white font-bold text-xs rounded-xl hover:bg-orange-800 transition-colors cursor-pointer"
              >
                View Leads Queue ({applications.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. SELLER LEADS QUEUE & 48-HOUR INVITE GATEWAY */}
      {/* ========================================================= */}
      {activeNav === 'leads' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search shop name, applicant, or phone..."
                value={leadsSearch}
                onChange={(e) => setLeadsSearch(e.target.value)}
                className="w-full bg-transparent text-xs text-slate-900 dark:text-white outline-hidden placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsDirectIntakeModalOpen(true)}
                className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Direct Intake</span>
              </button>

              <div className="flex items-center gap-1.5 overflow-x-auto">
                {[
                  { id: 'ALL', label: 'All Inquiries' },
                  { id: 'INVITED', label: 'Invited (48h Token)' },
                  { id: 'PENDING_REVIEW', label: 'Pending Review' },
                  { id: 'DOCUMENTS_SUBMITTED', label: 'Docs Submitted' },
                  { id: 'APPROVED', label: 'Approved' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setLeadsFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                      leadsFilter === tab.id
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Leads Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="p-3.5">Store / Business Name</th>
                    <th className="p-3.5">Applicant & Phone</th>
                    <th className="p-3.5">Category & District</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Date Logged</th>
                    <th className="p-3.5 text-right">Onboarding Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {filteredLeads.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 dark:text-white">{app.shop_name || app.storeName}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-xs">{app.description || app.admin_notes || app.adminNotes || 'Direct Intake'}</div>
                      </td>

                      <td className="p-3.5">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{app.full_name || app.applicantName}</div>
                        <div className="text-[11px] font-mono text-slate-500">{app.phone_number || app.phone}</div>
                      </td>

                      <td className="p-3.5">
                        <div className="text-slate-800 dark:text-slate-200 font-semibold">{app.category || app.businessType || 'Retail'}</div>
                        <div className="text-[11px] text-slate-400">{app.location || app.district}</div>
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            app.status === 'APPROVED' || app.status === 'VERIFIED'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              : app.status === 'DOCUMENTS_SUBMITTED'
                              ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                              : app.status === 'INVITED'
                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                              : app.status === 'REJECTED'
                              ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {app.status.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="p-3.5 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                        {formatDate(app.created_at || app.submittedAt)}
                      </td>

                      <td className="p-3.5 text-right space-x-1.5">
                        {app.status === 'PENDING_REVIEW' || app.status === 'PENDING' ? (
                          <button
                            onClick={() => handleGenerateInvite(app)}
                            className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-[11px] rounded-xl shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Approve & Generate Invite</span>
                          </button>
                        ) : app.status === 'INVITED' ? (
                          <button
                            onClick={() => {
                              const origin = window.location.origin;
                              const token = app.invite_token || app.inviteToken || '';
                              const inviteUrl = `${origin}/seller/register?token=${token}`;
                              const sanitizedWhatsAppPhone = (app.phone_number || app.phone).replace(/[^0-9]/g, '');
                              const prefilledMessage = `Hello ${app.full_name || app.applicantName}, thank you for contacting SwiftCart Uganda! Your merchant intake has been initiated for ${app.shop_name || app.storeName}. Complete your official identity registration and payout verification (NIN, TIN & MoMo details) here: ${inviteUrl} . This link expires in 48 hours.`;
                              const whatsappUrl = `https://wa.me/${sanitizedWhatsAppPhone}?text=${encodeURIComponent(prefilledMessage)}`;

                              setGeneratedInvite({
                                token,
                                inviteUrl,
                                expiresAt: app.token_expires_at || app.inviteExpiresAt || '',
                                storeName: app.shop_name || app.storeName,
                                fullName: app.full_name || app.applicantName,
                                phone: app.phone_number || app.phone,
                                whatsappUrl,
                              });
                            }}
                            className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-bold text-[11px] rounded-lg border border-amber-200 dark:border-amber-800 cursor-pointer inline-flex items-center gap-1"
                          >
                            <MessageSquare className="w-3 h-3 text-emerald-600" />
                            <span>Dispatch Invite (48h)</span>
                          </button>
                        ) : app.status === 'DOCUMENTS_SUBMITTED' ? (
                          <button
                            onClick={() => {
                              setSelectedAppForKYC(app);
                              setActiveNav('kyc');
                            }}
                            className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] rounded-lg cursor-pointer"
                          >
                            Inspect KYC Docs
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">Processed</span>
                        )}
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
      {/* 3. SELLER KYC REVIEW WORKBENCH (Side-by-Side Inspection) */}
      {/* ========================================================= */}
      {activeNav === 'kyc' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search applicant name, district, or NIN..."
                value={kycSearch}
                onChange={(e) => setKycSearch(e.target.value)}
                className="w-full bg-transparent text-xs text-slate-900 dark:text-white outline-hidden placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-center gap-1.5">
              {(['ALL', 'DOCUMENTS_SUBMITTED', 'APPROVED', 'REJECTED'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setKycFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    kycFilter === st
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Workbench Split View */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Compact Filterable Applicants Table */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs flex flex-col max-h-[750px]">
              <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
                <span className="font-bold text-xs text-slate-700 dark:text-slate-300">
                  KYC Packets ({filteredKYCApps.length})
                </span>
                <span className="text-[10px] text-slate-400">Click to Inspect</span>
              </div>

              <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredKYCApps.map((app) => {
                  const isSelected = selectedAppForKYC?.id === app.id;
                  return (
                    <div
                      key={app.id}
                      onClick={() => setSelectedAppForKYC(app)}
                      className={`p-3.5 transition-colors cursor-pointer space-y-1.5 ${
                        isSelected
                          ? 'bg-orange-50/60 dark:bg-orange-950/30 border-l-4 border-orange-600'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {app.shop_name || app.storeName}
                        </span>
                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                            app.status === 'APPROVED' || app.status === 'VERIFIED'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              : app.status === 'DOCUMENTS_SUBMITTED'
                              ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                              : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                          }`}
                        >
                          {app.status.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                        <span>{app.location || app.district}</span>
                        <span>{app.phone_number || app.phone}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Inspection Drawer / Detail View */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-6">
              {selectedAppForKYC ? (
                <>
                  {/* Store Header & Status */}
                  <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-black text-slate-900 dark:text-white">
                          {selectedAppForKYC.shop_name || selectedAppForKYC.storeName}
                        </h2>
                        {selectedAppForKYC.status === 'APPROVED' || selectedAppForKYC.status === 'VERIFIED' ? (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Verified Store
                          </span>
                        ) : selectedAppForKYC.status === 'DOCUMENTS_SUBMITTED' ? (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-purple-600 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-200">
                            <Clock className="w-3.5 h-3.5" /> Ready for Audit
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200">
                            <Clock className="w-3.5 h-3.5" /> {selectedAppForKYC.status}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Applicant: <strong>{selectedAppForKYC.full_name || selectedAppForKYC.applicantName}</strong> • {selectedAppForKYC.category || 'Retail'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <a
                        href={`https://wa.me/${formatWhatsAppPhone(selectedAppForKYC.phone_number || selectedAppForKYC.phone)}?text=Hello%20${encodeURIComponent(selectedAppForKYC.full_name || selectedAppForKYC.applicantName)}%2C%20this%20is%20SwiftCart%20Operations%20Admin%20regarding%20your%20KYC%20verification...`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 hover:bg-emerald-100 transition-colors"
                        title="Direct WhatsApp"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </a>
                      <a
                        href={`tel:${selectedAppForKYC.phone_number || selectedAppForKYC.phone}`}
                        className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 hover:bg-amber-100 transition-colors"
                        title="Call Applicant"
                      >
                        <PhoneCall className="w-4 h-4" />
                      </a>
                    </div>
                  </div>

                  {/* Merchant Identity & Bank/MoMo Verification Details */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">National ID Number (NIN)</span>
                      <p className="font-bold font-mono text-slate-800 dark:text-slate-200">
                        {selectedAppForKYC.kyc_documents?.ninNumber || selectedAppForKYC.kycDocuments?.ninNumber || 'CM84021948X99'}
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">URA Tax ID (TIN)</span>
                      <p className="font-bold font-mono text-slate-800 dark:text-slate-200">
                        {selectedAppForKYC.kyc_documents?.tinNumber || selectedAppForKYC.kycDocuments?.tinNumber || '1004928371 (Sole Proprietor)'}
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Escrow Settlement Account</span>
                      <p className="font-bold text-slate-800 dark:text-slate-200">
                        {selectedAppForKYC.kyc_documents?.accountName || selectedAppForKYC.kycDocuments?.accountName || selectedAppForKYC.storeName} (
                        {selectedAppForKYC.kyc_documents?.accountNumber || selectedAppForKYC.kycDocuments?.accountNumber || selectedAppForKYC.phone})
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">District & Physical Address</span>
                      <p className="font-bold text-slate-800 dark:text-slate-200">
                        {selectedAppForKYC.location || selectedAppForKYC.district}, {selectedAppForKYC.address}
                      </p>
                    </div>
                  </div>

                  {/* Document Viewer with Multi-Tab Zoom Controls */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Document:</span>
                        <div className="flex items-center gap-1 text-[11px] font-bold">
                          <button
                            onClick={() => setSelectedDocType('national_id')}
                            className={`px-2.5 py-1 rounded-lg ${selectedDocType === 'national_id' ? 'bg-orange-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}
                          >
                            ID Front
                          </button>
                          <button
                            onClick={() => setSelectedDocType('national_id_back')}
                            className={`px-2.5 py-1 rounded-lg ${selectedDocType === 'national_id_back' ? 'bg-orange-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}
                          >
                            ID Back
                          </button>
                          <button
                            onClick={() => setSelectedDocType('financial_proof')}
                            className={`px-2.5 py-1 rounded-lg ${selectedDocType === 'financial_proof' ? 'bg-orange-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}
                          >
                            MoMo Statement
                          </button>
                          <button
                            onClick={() => setSelectedDocType('business_cert')}
                            className={`px-2.5 py-1 rounded-lg ${selectedDocType === 'business_cert' ? 'bg-orange-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}
                          >
                            URSB Cert
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
                            ? selectedAppForKYC.kyc_documents?.nationalIdUrl || selectedAppForKYC.kycDocuments?.nationalIdUrl || 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80'
                            : selectedDocType === 'national_id_back'
                            ? selectedAppForKYC.kyc_documents?.nationalIdBackUrl || selectedAppForKYC.kycDocuments?.nationalIdBackUrl || selectedAppForKYC.kycDocuments?.nationalIdUrl || 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80'
                            : selectedDocType === 'financial_proof'
                            ? selectedAppForKYC.kyc_documents?.proofOfFinancialUrl || selectedAppForKYC.kycDocuments?.proofOfFinancialUrl || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80'
                            : selectedAppForKYC.kyc_documents?.businessCertUrl || selectedAppForKYC.kycDocuments?.businessCertUrl || 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80'
                        }
                        alt="KYC Document Preview"
                        style={{ transform: `scale(${docZoom})` }}
                        className="max-h-full max-w-full object-contain transition-transform duration-150"
                      />
                      <span className="absolute bottom-2 left-2 text-[10px] bg-black/70 text-slate-300 px-2 py-0.5 rounded backdrop-blur-xs">
                        {selectedDocType.toUpperCase().replace('_', ' ')} • Auto-Compressed High-Resolution Scan
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
                      onClick={() => handleApproveKYC(selectedAppForKYC.id)}
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
      {/* 4. PRODUCT CATALOG MODERATION QUEUE */}
      {/* ========================================================= */}
      {activeNav === 'qc' && (
        <div className="space-y-6">
          {/* Summary Metric Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Awaiting QC Review</span>
                <span className="w-7 h-7 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center font-bold">
                  <Clock className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{pendingQCCount}</div>
              <div className="text-[10px] text-slate-400">Gated from buyer storefront</div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Live Approved Listings</span>
                <span className="w-7 h-7 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">{approvedQCCount}</div>
              <div className="text-[10px] text-emerald-600 font-bold">Active in public search</div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Flagged / Rejected</span>
                <span className="w-7 h-7 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center font-bold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400">{rejectedQCCount}</div>
              <div className="text-[10px] text-slate-400">Feedback returned to seller</div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg. Listing Value</span>
                <span className="w-7 h-7 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center font-bold">
                  <Tag className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {products.length > 0
                  ? formatUGX(Math.round(products.reduce((s, p) => s + p.priceUGX, 0) / products.length))
                  : '0 UGX'}
              </div>
              <div className="text-[10px] text-slate-400">{products.length} total catalog items</div>
            </div>
          </div>

          {/* Filter Bar & Table Container */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
                {(
                  [
                    { id: 'ALL', label: 'All Items', count: products.length },
                    { id: 'UNDER_REVIEW', label: 'Needs Review', count: pendingQCCount, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/60' },
                    { id: 'APPROVED', label: 'Approved', count: approvedQCCount, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60' },
                    { id: 'REJECTED', label: 'Rejected', count: rejectedQCCount, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/60' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setQcFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                      qcFilter === tab.id
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${qcFilter === tab.id ? 'bg-white/20 text-white' : tab.color || 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              <div className="relative min-w-[260px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by title, store, brand..."
                  value={qcSearch}
                  onChange={(e) => setQcSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-hidden"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="p-3.5">Product & Photos</th>
                    <th className="p-3.5">Merchant Store</th>
                    <th className="p-3.5">Category & Brand</th>
                    <th className="p-3.5">Target Payout</th>
                    <th className="p-3.5">Buyer Price</th>
                    <th className="p-3.5">Variants & Stock</th>
                    <th className="p-3.5">QC Status</th>
                    <th className="p-3.5 text-right">Moderation Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {filteredQCProducts.length > 0 ? (
                    filteredQCProducts.map((prod) => {
                      const status = prod.status || 'APPROVED';
                      const netPayout = prod.basePriceUGX || Math.round(prod.priceUGX * 0.88);

                      return (
                        <tr key={prod.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-3.5 flex items-center gap-3">
                            <div className="relative w-11 h-11 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 bg-slate-100 dark:bg-slate-800">
                              <img
                                src={prod.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=150&q=80'}
                                alt={prod.title}
                                className="w-full h-full object-cover"
                              />
                              {prod.images && prod.images.length > 1 && (
                                <span className="absolute bottom-0 right-0 bg-slate-900/80 text-white text-[8px] font-black px-1 rounded-tl">
                                  +{prod.images.length - 1}
                                </span>
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white line-clamp-1">{prod.title}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                Submitted {formatDate(prod.createdAt)}
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <div className="font-bold text-slate-800 dark:text-slate-200">{prod.sellerStoreName}</div>
                            <div className="text-[10px] text-slate-400">{prod.sellerDistrict || 'Kampala'}</div>
                          </td>
                          <td className="p-3.5">
                            <div className="text-slate-800 dark:text-slate-200">{prod.category}</div>
                            <div className="text-[10px] text-slate-400">{prod.brand || 'Generic'}</div>
                          </td>
                          <td className="p-3.5 text-emerald-600 dark:text-emerald-400 font-bold">
                            {formatUGX(netPayout)}
                          </td>
                          <td className="p-3.5 font-black text-slate-900 dark:text-white">
                            {formatUGX(prod.priceUGX)}
                          </td>
                          <td className="p-3.5">
                            <div>
                              <span className="font-bold text-slate-800 dark:text-slate-200">{prod.stockQuantity} in stock</span>
                              {prod.variants && prod.variants.length > 0 && (
                                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 block font-bold">
                                  {prod.variants.length} Variants
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3.5">
                            {status === 'APPROVED' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 className="w-3 h-3" /> Approved
                              </span>
                            ) : status === 'UNDER_REVIEW' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 animate-pulse">
                                <Clock className="w-3 h-3" /> Needs QC
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                                <AlertTriangle className="w-3 h-3" /> Rejected
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-right space-x-1.5">
                            <button
                              onClick={() => handleOpenQCModal(prod)}
                              className="px-3 py-1.5 bg-slate-900 dark:bg-white hover:bg-orange-600 dark:hover:bg-orange-600 text-white dark:text-slate-900 dark:hover:text-white font-bold text-[11px] rounded-xl cursor-pointer transition-colors shadow-xs"
                            >
                              Inspect & Moderate
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-xs text-slate-400">
                        No products match the selected moderation filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. ACTIVE DISPATCH & RIDER CUSTODY MONITOR */}
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
      {/* 6. SELLERS DIRECTORY */}
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
      {/* 7. ORDERS DESK */}
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
      {/* DIRECT SELLER INTAKE MODAL ("+ Direct Seller Intake") */}
      {/* ========================================================= */}
      {isDirectIntakeModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    New Merchant Lead & Invite
                  </h3>
                  <p className="text-[11px] text-slate-400">Log incoming merchant call or WhatsApp inquiry</p>
                </div>
              </div>
              <button
                onClick={() => setIsDirectIntakeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {intakeError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{intakeError}</span>
              </div>
            )}

            <form onSubmit={handleDirectIntakeSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Merchant Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Nabakooza"
                  value={directIntakeForm.fullName}
                  onChange={(e) => setDirectIntakeForm({ ...directIntakeForm, fullName: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-hidden focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Proposed Store / Shop Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pearl Fashion House"
                  value={directIntakeForm.shopName}
                  onChange={(e) => setDirectIntakeForm({ ...directIntakeForm, shopName: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-hidden focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  WhatsApp / Mobile Number (E.164) *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 0776155353 or +256776155353"
                  value={directIntakeForm.phoneNumber}
                  onChange={(e) => setDirectIntakeForm({ ...directIntakeForm, phoneNumber: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white outline-hidden focus:border-orange-500"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Ugandan format (07... or +2567...)</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Primary Category *
                  </label>
                  <select
                    value={directIntakeForm.category}
                    onChange={(e) => setDirectIntakeForm({ ...directIntakeForm, category: e.target.value as ProductCategory })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-hidden focus:border-orange-500 cursor-pointer"
                  >
                    {INTAKE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Physical Location / City *
                  </label>
                  <select
                    value={directIntakeForm.location}
                    onChange={(e) => setDirectIntakeForm({ ...directIntakeForm, location: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-hidden focus:border-orange-500 cursor-pointer"
                  >
                    {INTAKE_DISTRICTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Admin Internal Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Inbound caller referred from WhatsApp hotline, verified physical shop in Ham Shopping Grounds..."
                  value={directIntakeForm.adminNotes}
                  onChange={(e) => setDirectIntakeForm({ ...directIntakeForm, adminNotes: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-hidden focus:border-orange-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDirectIntakeModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isIntakeSubmitting}
                  className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-1.5"
                >
                  {isIntakeSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating 48h Token...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Generate & Prepare Invite</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 48-HOUR SINGLE-USE INVITE DISPATCH MODAL */}
      {/* ========================================================= */}
      {generatedInvite && (
        <div className="fixed inset-0 z-60 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-orange-600" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Merchant Onboarding Invite Ready
                </h3>
              </div>
              <button
                onClick={() => setGeneratedInvite(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <p>
                A single-use, 48-hour secure token has been generated for <strong>{generatedInvite.storeName}</strong> ({generatedInvite.phone}).
              </p>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Expires in 48 hours • Single-use token</span>
              </p>
            </div>

            {/* Copyable Link Box */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Single-Use Registration URL</span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedInvite.inviteUrl}
                  className="flex-1 bg-transparent font-mono text-xs text-slate-900 dark:text-white outline-hidden select-all"
                />
                <button
                  onClick={handleCopyInviteLink}
                  className="px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Direct Send Buttons (WhatsApp Web / App Deep-link) */}
            <div className="space-y-2.5">
              <a
                href={generatedInvite.whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full p-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.99] cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 text-white" />
                <span>Send via WhatsApp</span>
              </a>

              <a
                href={`sms:${generatedInvite.phone}?body=${encodeURIComponent(
                  `SwiftCart Uganda: Your merchant invite for "${generatedInvite.storeName}" is ready. Complete registration here: ${generatedInvite.inviteUrl} . Valid 48h.`
                )}`}
                className="w-full p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-colors"
              >
                <Phone className="w-4 h-4 text-orange-500" />
                <span>Send via SMS</span>
              </a>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setGeneratedInvite(null)}
                className="px-5 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs rounded-xl cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* REJECT WITH REASON MODAL */}
      {/* ========================================================= */}
      {isRejectModalOpen && selectedAppForKYC && (
        <div className="fixed inset-0 z-60 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Reject KYC Application</h3>
              <button onClick={() => setIsRejectModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Provide feedback for <strong>{selectedAppForKYC.storeName}</strong> explaining why their verification documents were rejected:
            </p>

            <textarea
              rows={4}
              placeholder="e.g. The National ID scan is blurry or the MoMo registered name does not match the applicant identity..."
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
                onClick={handleRejectKYC}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* PRODUCT QC INSPECTION & MODERATION MODAL */}
      {/* ========================================================= */}
      {isQCModalOpen && selectedProductForQC && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6 p-6 sm:p-8">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400">
                    Product QC Review
                  </span>
                  <span className="text-xs text-slate-400 font-mono">ID: {selectedProductForQC.id}</span>
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {selectedProductForQC.title || selectedProductForQC.name}
                </h3>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>Category: <strong>{selectedProductForQC.category}</strong></span>
                  {selectedProductForQC.brand && <span>• Brand: <strong>{selectedProductForQC.brand}</strong></span>}
                  <span>• Seller: <strong className="font-mono">{selectedProductForQC.sellerId || 'Uganda Merchant'}</strong></span>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsQCModalOpen(false);
                  setSelectedProductForQC(null);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Visual Assets & Catalog Specs (7 cols) */}
              <div className="lg:col-span-7 space-y-5">
                {/* Image Gallery */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Product Visuals</span>
                  <div className="aspect-video w-full rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                    <img
                      src={selectedProductForQC.image}
                      alt={selectedProductForQC.title || selectedProductForQC.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  {selectedProductForQC.images && selectedProductForQC.images.length > 1 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {selectedProductForQC.images.map((img, idx) => (
                        <img
                          key={img.id || idx}
                          src={img.url}
                          alt="Thumbnail"
                          className="w-16 h-16 rounded-xl object-cover border-2 border-slate-200 dark:border-slate-700"
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-1.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Product Description</span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                    {selectedProductForQC.description || 'No description provided.'}
                  </p>
                </div>

                {/* Specifications List */}
                {selectedProductForQC.specifications && selectedProductForQC.specifications.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Technical Specifications</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedProductForQC.specifications.map((spec, i) => (
                        <div
                          key={spec.id || i}
                          className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs flex justify-between"
                        >
                          <span className="text-slate-400 font-medium">{spec.name}:</span>
                          <span className="text-slate-900 dark:text-white font-bold text-right">{spec.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* What's in the Box */}
                {selectedProductForQC.whatsInTheBox && (
                  <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/40 space-y-1">
                    <span className="text-[11px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">What's in the Box</span>
                    <p className="text-xs text-amber-900 dark:text-amber-200">{selectedProductForQC.whatsInTheBox}</p>
                  </div>
                )}

                {/* Variants Matrix */}
                {selectedProductForQC.variants && selectedProductForQC.variants.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">SKU Variants</span>
                    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 dark:bg-slate-800 text-[10px] uppercase font-bold text-slate-500">
                          <tr>
                            <th className="p-2.5">Variant</th>
                            <th className="p-2.5">SKU</th>
                            <th className="p-2.5">Price Offset</th>
                            <th className="p-2.5">Stock</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                          {selectedProductForQC.variants.map((v, idx) => (
                            <tr key={v.id || idx}>
                              <td className="p-2.5 font-bold text-slate-900 dark:text-white">{v.name}</td>
                              <td className="p-2.5 font-mono text-[11px] text-slate-500">{v.sku}</td>
                              <td className="p-2.5 text-slate-700 dark:text-slate-300">
                                {v.additionalPrice > 0 ? `+UGX ${v.additionalPrice.toLocaleString()}` : 'Base'}
                              </td>
                              <td className="p-2.5 font-bold text-slate-900 dark:text-white">{v.stock} units</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Economics & QC Decision (5 cols) */}
              <div className="lg:col-span-5 space-y-5">
                {/* Economics Breakdown */}
                {(() => {
                  const base = selectedProductForQC.basePriceUGX || (selectedProductForQC as any).basePrice || selectedProductForQC.priceUGX || (selectedProductForQC as any).price || 0;
                  const listingPrice = selectedProductForQC.priceUGX || (selectedProductForQC as any).price || 0;
                  const breakdown = calculatePricing(base, selectedProductForQC.category);
                  return (
                    <div className="p-5 rounded-2xl bg-linear-to-br from-slate-900 to-slate-800 text-white shadow-xl space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                          Pricing Breakdown
                        </span>
                        <Calculator className="w-4 h-4 text-orange-400" />
                      </div>

                      <div className="space-y-2.5 text-xs">
                        <div className="flex items-center justify-between text-slate-300">
                          <span>Net Seller Payout:</span>
                          <span className="font-bold text-white">UGX {base.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-300">
                          <span>Commission ({breakdown.commissionRatePercent}%):</span>
                          <span className="font-bold text-orange-400">+UGX {breakdown.commissionAmountUGX.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-300">
                          <span>Logistics Handling:</span>
                          <span className="font-bold text-blue-400">+UGX {breakdown.shippingContributionUGX.toLocaleString()}</span>
                        </div>
                        <div className="pt-2 border-t border-slate-700 flex items-center justify-between">
                          <span className="font-bold text-sm text-white">Public Listing Price:</span>
                          <span className="text-base font-black text-emerald-400">
                            UGX {listingPrice.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-400 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                        Formula: (Base + UGX 3,000) / (1 - {breakdown.commissionRatePercent}%) rounded to nearest UGX 500.
                      </div>
                    </div>
                  );
                })()}

                {/* Inspection Checklist */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Quality Audit Checklist</span>
                  <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" defaultChecked className="rounded accent-orange-600" />
                      <span>Clear product imagery without external contact watermarks</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" defaultChecked className="rounded accent-orange-600" />
                      <span>Compliant category & accurate brand attribution</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" defaultChecked className="rounded accent-orange-600" />
                      <span>Realistic inventory stock count & verified pricing</span>
                    </label>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2.5 pt-2">
                  <button
                    onClick={() => handleApproveProduct(selectedProductForQC.id)}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl shadow-lg transition-all active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve & Publish to Storefront</span>
                  </button>

                  <button
                    onClick={() => {
                      setRejectReason('');
                      setIsProductRejectModalOpen(true);
                    }}
                    className="w-full py-3 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-400 font-bold text-xs rounded-2xl border border-rose-200 dark:border-rose-900/60 transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject Listing with Feedback</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* PRODUCT REJECTION FEEDBACK MODAL */}
      {/* ========================================================= */}
      {isProductRejectModalOpen && selectedProductForQC && (
        <div className="fixed inset-0 z-70 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Reject Product Listing</h3>
              <button onClick={() => setIsProductRejectModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Provide actionable feedback for the seller explaining why <strong>{selectedProductForQC.title || selectedProductForQC.name}</strong> was not approved:
            </p>

            {/* Preset Rejection Reasons */}
            <div className="flex flex-wrap gap-1.5">
              {[
                'Blurry or Low-Res Images',
                'Counterfeit / Trademark Violation',
                'Price Exceeds Fair Market Value',
                'Missing or Inaccurate Specifications',
                'Prohibited / Regulated Item',
              ].map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setRejectReason(reason)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-orange-50 dark:hover:bg-orange-950/40 text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:text-orange-600 border border-slate-200 dark:border-slate-700 transition-colors"
                >
                  {reason}
                </button>
              ))}
            </div>

            <textarea
              rows={4}
              placeholder="Explain the required modifications for the seller to fix and resubmit..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-rose-500"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setIsProductRejectModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={!rejectReason.trim()}
                onClick={handleRejectProduct}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold shadow-md cursor-pointer transition-colors"
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
