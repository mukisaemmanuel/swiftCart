import React from 'react';
import { Store, X, ShieldCheck, Phone, Mail, MessageSquare, ExternalLink, Building2, CheckCircle2, ArrowRight } from 'lucide-react';

interface ApplyToSellModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const ADMIN_WHATSAPP_NUMBER = '256700123456';
const ADMIN_PHONE_MTN = '+256772123456';
const ADMIN_PHONE_AIRTEL = '+256700000001';
const ADMIN_EMAIL = 'admin@swiftcart.ug';

const WHATSAPP_PREFILLED_MSG = encodeURIComponent(
  'Hello SwiftCart Admin, I am a business owner/merchant in Uganda interested in selling on SwiftCart. Kindly send me the official merchant onboarding and KYC registration form.'
);

export const ApplyToSellModal: React.FC<ApplyToSellModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleOpenWhatsApp = () => {
    window.open(`https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${WHATSAPP_PREFILLED_MSG}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 my-6 flex flex-col">
        {/* Header */}
        <div className="bg-linear-to-r from-orange-600 via-amber-600 to-amber-700 p-5 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-black tracking-wider bg-white/20 px-2 py-0.5 rounded-full text-orange-100">
                Merchant Onboarding Desk
              </span>
              <h3 className="text-base sm:text-lg font-black mt-0.5">Apply to Sell on SwiftCart</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 text-xs">
          {/* Vetting Notice */}
          <div className="p-3.5 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/60 rounded-2xl text-orange-900 dark:text-orange-200 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-orange-800 dark:text-orange-300">
              <ShieldCheck className="w-4 h-4 text-orange-600 shrink-0" />
              <span>Direct Admin Vetting & Onboarding</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
              To protect Ugandan shoppers and maintain verified merchant authenticity, merchant onboarding is handled directly through our Administration Desk. Contact the admin below to discuss your business and receive the official onboarding packet.
            </p>
          </div>

          {/* Primary Action Buttons */}
          <div className="space-y-3">
            {/* WhatsApp Admin Button */}
            <button
              onClick={handleOpenWhatsApp}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-lg transition-all active:scale-[0.99] flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-white" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold opacity-90">Instant Admin WhatsApp Desk</div>
                  <div className="text-sm font-black">Chat on WhatsApp (+256 700 123 456)</div>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Direct Phone Call Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <a
                href={`tel:${ADMIN_PHONE_MTN}`}
                className="py-3 px-3.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800 rounded-2xl flex items-center gap-2 font-bold transition-colors"
              >
                <Phone className="w-4 h-4 text-amber-600" />
                <div className="text-left">
                  <span className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">MTN Merchant Line</span>
                  <span className="text-xs">{ADMIN_PHONE_MTN}</span>
                </div>
              </a>

              <a
                href={`tel:${ADMIN_PHONE_AIRTEL}`}
                className="py-3 px-3.5 bg-red-500/10 hover:bg-red-500/20 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-800 rounded-2xl flex items-center gap-2 font-bold transition-colors"
              >
                <Phone className="w-4 h-4 text-red-600" />
                <div className="text-left">
                  <span className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Airtel Merchant Line</span>
                  <span className="text-xs">{ADMIN_PHONE_AIRTEL}</span>
                </div>
              </a>
            </div>
          </div>

          {/* 3 Step Workflow */}
          <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
            <h4 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
              How Merchant Onboarding Works:
            </h4>
            <div className="space-y-2 text-[11px] text-slate-600 dark:text-slate-300">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-600 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
                <span>Reach out to the admin via <strong>WhatsApp</strong> or <strong>Phone Call</strong>.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-600 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
                <span>The administration desk verifies your store and sends you the official registration form.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-600 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</span>
                <span>Get provisioned with verified merchant credentials and start selling on SwiftCart!</span>
              </div>
            </div>
          </div>

          {/* Email / Office footer */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              <span>Email: <a href={`mailto:${ADMIN_EMAIL}`} className="underline font-semibold hover:text-orange-600">{ADMIN_EMAIL}</a></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              <span>Kampala Road, Nakasero, Kampala</span>
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition-all cursor-pointer text-xs"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
};
