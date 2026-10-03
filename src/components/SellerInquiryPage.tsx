import React, { useState } from 'react';
import { dbService } from '../services/db';
import { ProductCategory } from '../types';
import {
  Store,
  ShieldCheck,
  Phone,
  Mail,
  MessageSquare,
  ArrowRight,
  CheckCircle2,
  Building2,
  MapPin,
  Package,
  Sparkles,
  ExternalLink,
  ChevronLeft,
} from 'lucide-react';

interface SellerInquiryPageProps {
  onBackToShopping: () => void;
  onNavigateToLogin?: () => void;
}

const CATEGORIES: ProductCategory[] = [
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

const UGANDA_DISTRICTS = [
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

const ADMIN_PHONE = '+256776155353';
const ADMIN_WHATSAPP = '256776155353';
const WHATSAPP_PREFILLED = encodeURIComponent(
  'Hello SwiftCart Super Admin, I am applying to become a verified seller on SwiftCart Uganda. Kindly assist me with the onboarding invitation.'
);

export const SellerInquiryPage: React.FC<SellerInquiryPageProps> = ({
  onBackToShopping,
  onNavigateToLogin,
}) => {
  const [formData, setFormData] = useState({
    applicantName: '',
    storeName: '',
    phone: '',
    email: '',
    category: 'Phones & Tablets' as ProductCategory,
    district: 'Kampala (Central)',
    address: '',
    description: '',
  });

  const [loading, setLoading] = useState(false);
  const [submittedAppId, setSubmittedAppId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.applicantName.trim() || !formData.storeName.trim()) {
      setError('Please provide your legal name and business/shop name.');
      return;
    }
    if (!formData.phone.trim() || formData.phone.length < 9) {
      setError('Please enter a valid active Ugandan telephone number.');
      return;
    }

    try {
      setLoading(true);
      const cleanedPhone = formData.phone.startsWith('+256')
        ? formData.phone
        : formData.phone.startsWith('0')
        ? `+256${formData.phone.slice(1)}`
        : `+256${formData.phone}`;

      const created = await dbService.submitSellerApplication({
        applicantName: formData.applicantName.trim(),
        storeName: formData.storeName.trim(),
        phone: cleanedPhone,
        email: formData.email.trim() || `${formData.storeName.toLowerCase().replace(/\s+/g, '')}@merchant.ug`,
        category: formData.category,
        businessType: `${formData.category} Retail`,
        district: formData.district,
        address: formData.address.trim() || `${formData.district}, Uganda`,
        description: formData.description.trim(),
      });

      setSubmittedAppId(created.id);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // SUCCESS CONFIRMATION RECEIPT
  if (submittedAppId) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between p-4 sm:p-8">
        <div className="max-w-2xl mx-auto w-full pt-6 sm:pt-12 pb-8">
          <div className="bg-slate-800/90 rounded-3xl border border-slate-700 shadow-2xl p-6 sm:p-10 space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-800">
                Inquiry Received • Ref #{submittedAppId.slice(-6)}
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Seller Inquiry Submitted!
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
                Thank you for applying to sell on SwiftCart Uganda. Our Operations Administration Desk has received your store details for <strong className="text-orange-400">{formData.storeName}</strong>.
              </p>
            </div>

            {/* Next Steps Card */}
            <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-700/80 text-left space-y-3.5 text-xs text-slate-300">
              <h3 className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-400" />
                <span>What Happens Next?</span>
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-orange-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <p>Our operations officer reviews your category (<strong className="text-white">{formData.category}</strong>) and store profile.</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-orange-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <p>You will receive a <strong>single-use 48-hour secure registration invite link</strong> via WhatsApp / SMS on <strong className="text-emerald-400">{formData.phone}</strong>.</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-orange-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <p>Upload your National ID (NIN) & MTN MoMo/Bank payout details to complete KYC and activate your storefront.</p>
                </div>
              </div>
            </div>

            {/* Direct Admin Desk Contacts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <a
                href={`https://wa.me/${ADMIN_WHATSAPP}?text=${WHATSAPP_PREFILLED}`}
                target="_blank"
                rel="noreferrer"
                className="p-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-colors cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Chat Admin on WhatsApp (0776155353)</span>
              </a>

              <a
                href={`tel:${ADMIN_PHONE}`}
                className="p-3.5 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <Phone className="w-4 h-4 text-orange-400" />
                <span>Call Admin Desk (0776155353)</span>
              </a>
            </div>

            <div className="pt-4 border-t border-slate-700 flex items-center justify-between">
              <button
                onClick={onBackToShopping}
                className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1.5 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Return to Marketplace</span>
              </button>

              {onNavigateToLogin && (
                <button
                  onClick={onNavigateToLogin}
                  className="text-xs font-bold text-orange-400 hover:underline cursor-pointer"
                >
                  Already have an account? Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Top Header Strip */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToShopping}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Marketplace</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-600 flex items-center justify-center font-black text-white text-sm shadow-md">
              S
            </div>
            <div>
              <span className="font-extrabold text-sm text-white tracking-tight">SwiftCart</span>
              <span className="text-[10px] font-bold text-orange-400 ml-1.5 uppercase tracking-wider">Merchant Desk</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={`tel:${ADMIN_PHONE}`}
            className="hidden sm:flex items-center gap-1.5 text-xs text-slate-300 hover:text-orange-400 font-bold"
          >
            <Phone className="w-3.5 h-3.5 text-orange-500" />
            <span>Hotline: 0776155353</span>
          </a>
          {onNavigateToLogin && (
            <button
              onClick={onNavigateToLogin}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
            >
              Seller Login
            </button>
          )}
        </div>
      </header>

      {/* Main Intake Layout */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Value Proposition & Onboarding Trust */}
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Uganda Merchant Gateway</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              Grow Your Business Across Uganda on SwiftCart
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Reach hundreds of thousands of active buyers in Kampala, Wakiso, Mukono, Jinja, Busia, and all 135+ districts with guaranteed Tuesday MTN MoMo payouts and rider courier fulfillment.
            </p>
          </div>

          {/* 3 Pillars */}
          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="text-xs space-y-1">
                <h4 className="font-bold text-white">Guaranteed Escrow Protection</h4>
                <p className="text-slate-400 leading-relaxed">Buyer funds are held in secure escrow. You get paid in full automatically every Tuesday via MTN/Airtel MoMo or Bank EFT.</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center shrink-0">
                <Store className="w-5 h-5" />
              </div>
              <div className="text-xs space-y-1">
                <h4 className="font-bold text-white">Gated & Verified Marketplace</h4>
                <p className="text-slate-400 leading-relaxed">Every merchant undergoes KYC vetting, protecting authentic stores against counterfeiters and price-undercutting bots.</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="text-xs space-y-1">
                <h4 className="font-bold text-white">Direct Admin Support (0776155353)</h4>
                <p className="text-slate-400 leading-relaxed">Get dedicated onboarding assistance from our Kampala headquarters on Nakasero Road.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Public Intake Form */}
        <div className="lg:col-span-7 bg-slate-900/90 rounded-3xl border border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-lg sm:text-xl font-black text-white">Apply to Open Your Store</h2>
            <p className="text-xs text-slate-400 mt-1">
              Submit your shop details below. Our administration will review and generate your single-use registration invite.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Full Legal Name & Store Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Full Legal Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Isaac Kato"
                  value={formData.applicantName}
                  onChange={(e) => setFormData({ ...formData, applicantName: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder:text-slate-500 outline-hidden focus:border-orange-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Business / Shop Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kampala Tech Hub"
                  value={formData.storeName}
                  onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder:text-slate-500 outline-hidden focus:border-orange-500 transition-colors"
                />
              </div>
            </div>

            {/* Phone Number & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Active Phone Number (MSISDN) *
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    placeholder="0776155353 or +256..."
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder:text-slate-500 outline-hidden focus:border-orange-500 transition-colors"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">Your 48h invite token will be sent here via SMS/WhatsApp.</span>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Business Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g. info@kampalatech.ug"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder:text-slate-500 outline-hidden focus:border-orange-500 transition-colors"
                />
              </div>
            </div>

            {/* Category & District */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Primary Product Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as ProductCategory })}
                  className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-white outline-hidden focus:border-orange-500 transition-colors cursor-pointer"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Physical District / Region *
                </label>
                <select
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-white outline-hidden focus:border-orange-500 transition-colors cursor-pointer"
                >
                  {UGANDA_DISTRICTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Physical Address */}
            <div>
              <label className="block text-slate-300 font-bold mb-1">
                Physical Location & Street Address *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Lugogo Bypass, Plot 18, Block B, Kampala"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder:text-slate-500 outline-hidden focus:border-orange-500 transition-colors"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-slate-300 font-bold mb-1">
                Brief Business & Catalog Description *
              </label>
              <textarea
                rows={3}
                required
                placeholder="Tell us what products you sell, your approximate inventory size, and existing distribution channels..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder:text-slate-500 outline-hidden focus:border-orange-500 transition-colors"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-extrabold text-sm rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                {loading ? (
                  <span>Submitting Inquiry...</span>
                ) : (
                  <>
                    <span>Submit Seller Application</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 px-4 text-center text-xs text-slate-500">
        SwiftCart Uganda • Verified Merchant Network & Escrow Logistics • Kampala, Uganda
      </footer>
    </div>
  );
};
