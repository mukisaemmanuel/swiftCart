import React from 'react';
import { Store, X, ShieldCheck, Phone, Mail, MessageSquare, ExternalLink, Building2, CheckCircle2, ArrowRight } from 'lucide-react';

interface ApplyToSellModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const ADMIN_WHATSAPP_NUMBER = '256776155353';
const ADMIN_PHONE_NUMBER = '+256776155353';
const ADMIN_EMAIL = 'admin@swiftcart.ug';

const WHATSAPP_PREFILLED_MSG = encodeURIComponent(
  'Hello SwiftCart Super Admin, I am a business owner/merchant in Uganda interested in selling on SwiftCart. Kindly send me the official merchant onboarding and KYC registration form.'
);

export const ApplyToSellModal: React.FC<ApplyToSellModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleOpenWhatsApp = () => {
    window.open(`https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${WHATSAPP_PREFILLED_MSG}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-300 dark:border-slate-800 my-6 flex flex-col">
        {/* Header */}
        <div className="bg-linear-to-r from-orange-600 via-amber-600 to-amber-700 p-5 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shadow-inner">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-black tracking-wider bg-white/25 px-2 py-0.5 rounded-full text-white">
                Merchant Onboarding Desk
              </span>
              <h3 className="text-base sm:text-lg font-black mt-0.5 text-white">Apply to Sell on SwiftCart</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 text-xs bg-slate-50/50 dark:bg-slate-900">
          {/* Vetting Notice */}
          <div className="p-4 bg-amber-500/10 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 rounded-2xl text-slate-900 dark:text-slate-100 space-y-1.5">
            <div className="flex items-center gap-2 font-black text-amber-700 dark:text-amber-400 text-xs">
              <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Direct Admin Vetting & Onboarding</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300 font-medium">
              To protect Ugandan shoppers and maintain verified merchant authenticity, merchant onboarding is handled directly through our Administration Desk. Contact our administration below on <strong>0776155353</strong> to receive the official onboarding packet.
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
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <div className="text-[11px] font-bold text-emerald-100">Super Admin WhatsApp Desk</div>
                  <div className="text-sm font-black text-white">Chat on WhatsApp (0776155353)</div>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-white group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Direct Phone Call Button */}
            <a
              href={`tel:${ADMIN_PHONE_NUMBER}`}
              className="w-full py-3.5 px-4 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded-2xl flex items-center justify-between font-bold transition-colors shadow-2xs"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-200/60 dark:bg-amber-900/60 flex items-center justify-center text-amber-800 dark:text-amber-300 shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="block text-[10px] uppercase font-black text-amber-700 dark:text-amber-400">Administration Direct Line</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">Call 0776155353</span>
                </div>
              </div>
              <span className="text-[10px] bg-amber-200 dark:bg-amber-900 px-2 py-0.5 rounded-full text-amber-900 dark:text-amber-200 font-extrabold">
                Direct Call
              </span>
            </a>
          </div>

          {/* 3 Step Workflow Card */}
          <div className="bg-slate-100 dark:bg-slate-800/90 p-4 sm:p-4.5 rounded-2xl border border-slate-300 dark:border-slate-700 space-y-3 shadow-inner">
            <h4 className="font-black text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>📋</span>
              <span>How Merchant Onboarding Works:</span>
            </h4>
            <div className="space-y-2.5 text-xs text-slate-800 dark:text-slate-200">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-orange-600 text-white flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5 shadow-xs">
                  1
                </span>
                <span className="leading-snug">
                  Reach out to the admin on <strong className="text-orange-600 dark:text-orange-400 font-bold">0776155353</strong> via WhatsApp or Phone Call.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-orange-600 text-white flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5 shadow-xs">
                  2
                </span>
                <span className="leading-snug">
                  The administration desk verifies your store catalog and sends you the official registration packet.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-orange-600 text-white flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5 shadow-xs">
                  3
                </span>
                <span className="leading-snug">
                  Get provisioned with verified merchant credentials and start listing products on SwiftCart!
                </span>
              </div>
            </div>
          </div>

          {/* Email / Office footer */}
          <div className="pt-1 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-600 dark:text-slate-400 font-medium">
            <div className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-orange-500" />
              <span>Email: <a href={`mailto:${ADMIN_EMAIL}`} className="underline font-bold text-slate-900 dark:text-slate-200 hover:text-orange-600 dark:hover:text-orange-400">{ADMIN_EMAIL}</a></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-orange-500" />
              <span>Kampala Road, Nakasero, Kampala</span>
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-extrabold rounded-2xl transition-all cursor-pointer text-xs shadow-xs"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
};
