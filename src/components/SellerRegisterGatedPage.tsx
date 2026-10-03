import React, { useState, useEffect, useRef } from 'react';
import { dbService } from '../services/db';
import { SellerApplication, SellerInviteToken, SellerKYCDocuments } from '../types';
import { compressImage } from '../utils/imageCompressor';
import {
  Lock,
  ShieldCheck,
  ShieldAlert,
  Store,
  Upload,
  Camera,
  CheckCircle2,
  FileCheck2,
  Phone,
  Building2,
  Eye,
  EyeOff,
  Clock,
  ArrowRight,
  Loader2,
  X,
  AlertTriangle,
  ChevronLeft,
} from 'lucide-react';

interface SellerRegisterGatedPageProps {
  token: string;
  onSuccessNavigate?: () => void;
  onBackToShopping?: () => void;
}

const UGANDA_BANKS = [
  'Stanbic Bank Uganda',
  'Centenary Bank',
  'Absa Bank Uganda',
  'Equity Bank Uganda',
  'Standard Chartered Uganda',
  'dfcu Bank',
  'PostBank Uganda',
  'KCB Bank Uganda',
];

export const SellerRegisterGatedPage: React.FC<SellerRegisterGatedPageProps> = ({
  token,
  onSuccessNavigate,
  onBackToShopping,
}) => {
  const [isValidating, setIsValidating] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<SellerInviteToken | null>(null);
  const [applicationData, setApplicationData] = useState<SellerApplication | null>(null);

  // Form State
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [entityType, setEntityType] = useState<'sole_proprietorship' | 'registered_company' | 'individual'>('sole_proprietorship');
  const [ninNumber, setNinNumber] = useState('');
  const [tinNumber, setTinNumber] = useState('');

  const [payoutType, setPayoutType] = useState<'momo' | 'airtel' | 'bank'>('momo');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankName, setBankName] = useState(UGANDA_BANKS[0]);

  // Uploaded Document Images (Data URLs compressed)
  const [nationalIdUrl, setNationalIdUrl] = useState<string>('');
  const [nationalIdBackUrl, setNationalIdBackUrl] = useState<string>('');
  const [businessCertUrl, setBusinessCertUrl] = useState<string>('');
  const [proofOfFinancialUrl, setProofOfFinancialUrl] = useState<string>('');

  const [compressingField, setCompressingField] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const idFrontRef = useRef<HTMLInputElement>(null);
  const idBackRef = useRef<HTMLInputElement>(null);
  const certRef = useRef<HTMLInputElement>(null);
  const financialProofRef = useRef<HTMLInputElement>(null);

  // 1. Token Validation on Mount
  useEffect(() => {
    let isMounted = true;
    const validateToken = async () => {
      setIsValidating(true);
      try {
        const res = await dbService.validateSellerInviteToken(token);
        if (!isMounted) return;
        if (!res.valid) {
          setValidationError(res.reason || 'Invalid or expired invitation token.');
        } else {
          setInviteData(res.invite || null);
          setApplicationData(res.application || null);
          if (res.application) {
            setAccountName(res.application.shop_name || res.application.storeName);
            setAccountNumber(res.application.phone_number || res.application.phone);
          }
        }
      } catch (err: any) {
        if (isMounted) setValidationError(err?.message || 'Failed to validate invitation token.');
      } finally {
        if (isMounted) setIsValidating(false);
      }
    };

    validateToken();
    return () => {
      isMounted = false;
    };
  }, [token]);

  // Image Upload Handler with Instant Auto-Compression
  const handleFileUpload = async (
    files: FileList | null,
    field: 'idFront' | 'idBack' | 'cert' | 'financial'
  ) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    try {
      setCompressingField(field);
      // Auto-compress high-resolution camera scan to lightweight WebP/JPEG
      const compressedDataUrl = await compressImage(file, {
        maxWidth: 1600,
        maxHeight: 1600,
        quality: 0.85,
        targetMaxKBOptional: 300,
      });

      if (field === 'idFront') setNationalIdUrl(compressedDataUrl);
      if (field === 'idBack') setNationalIdBackUrl(compressedDataUrl);
      if (field === 'cert') setBusinessCertUrl(compressedDataUrl);
      if (field === 'financial') setProofOfFinancialUrl(compressedDataUrl);
    } catch (err: any) {
      console.error('Image compression failed:', err);
      setFormError('Failed to process image file. Please upload a standard JPEG or PNG.');
    } finally {
      setCompressingField(null);
    }
  };

  // Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (password.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }
    if (!ninNumber.trim() || ninNumber.trim().length < 8) {
      setFormError('Please enter a valid Ugandan National ID Number (NIN) or Passport Number.');
      return;
    }
    if (!accountName.trim() || !accountNumber.trim()) {
      setFormError('Please complete your payout account details for escrow settlement.');
      return;
    }
    if (!nationalIdUrl) {
      setFormError('Please upload a clear photo/scan of the front of your National ID.');
      return;
    }
    if (!proofOfFinancialUrl) {
      setFormError('Please upload proof of financial account (MoMo statement header or bank letterhead).');
      return;
    }

    try {
      setIsSubmitting(true);
      const kycData: SellerKYCDocuments = {
        nationalIdUrl,
        nationalIdBackUrl: nationalIdBackUrl || undefined,
        businessCertUrl: businessCertUrl || undefined,
        proofOfFinancialUrl,
        ninNumber: ninNumber.trim().toUpperCase(),
        tinNumber: tinNumber.trim() || undefined,
        entityType,
        payoutType,
        accountName: accountName.trim(),
        accountNumber: accountNumber.trim(),
        bankName: payoutType === 'bank' ? bankName : undefined,
      };

      await dbService.submitSellerRegistrationKYC(token, {
        password,
        kyc: kycData,
      });

      setSubmitSuccess(true);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to submit registration documents.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1. VALIDATING TOKEN STATE
  if (isValidating) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 text-orange-500 animate-spin mx-auto" />
          <h2 className="text-lg font-bold">Verifying Registration Token...</h2>
          <p className="text-xs text-slate-400">Validating single-use cryptographic security key.</p>
        </div>
      </div>
    );
  }

  // 2. INVALID / EXPIRED TOKEN STATE (SECURITY ACCESS GATE)
  if (validationError || !inviteData) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <div className="max-w-md w-full bg-slate-900 rounded-3xl border border-rose-500/30 p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-black uppercase tracking-widest text-rose-400 bg-rose-950/80 px-3 py-1 rounded-full border border-rose-900">
              Access Restricted
            </span>
            <h1 className="text-2xl font-black text-white">Invalid or Expired Invite Token</h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              {validationError || 'This registration token is invalid, expired, or has already been used to provision a merchant account.'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-left space-y-2 text-slate-400">
            <p className="font-bold text-white flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-orange-500" />
              <span>48-Hour Security Policy</span>
            </p>
            <p className="leading-relaxed">
              For marketplace integrity, merchant invitation links expire automatically after 48 hours and can only be used once.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <a
              href="/sell"
              className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-md transition-colors"
            >
              <span>Submit New Seller Inquiry</span>
              <ArrowRight className="w-4 h-4" />
            </a>

            <a
              href="tel:+256776155353"
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <Phone className="w-4 h-4 text-orange-400" />
              <span>Contact Operations Desk (0776155353)</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // 3. SUCCESS STATE
  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <div className="max-w-lg w-full bg-slate-900 rounded-3xl border border-emerald-500/30 p-8 sm:p-10 text-center space-y-6 shadow-2xl animate-in fade-in zoom-in-95">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-inner">
            <FileCheck2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-800">
              KYC Documents Received
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Verification Under Review</h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
              Application submitted for <strong className="text-orange-400">{inviteData.storeName}</strong>. Operations is reviewing your documents (Estimated: 2–24 hours).
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-left space-y-2.5 text-slate-300">
            <h4 className="font-bold text-white text-[11px] uppercase tracking-wider">Compliance Audit Process:</h4>
            <div className="space-y-2 text-[11px]">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Single-use token redeemed and secured</span>
              </div>
              <div className="flex items-center gap-2 text-amber-400 font-semibold">
                <Clock className="w-4 h-4 shrink-0" />
                <span>NIN & URSB document inspection in progress</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Store className="w-4 h-4 shrink-0" />
                <span>Storefront activation within 24 hours</span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => {
                if (onSuccessNavigate) onSuccessNavigate();
                else window.location.href = '/seller/dashboard';
              }}
              className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-lg transition-colors cursor-pointer"
            >
              Proceed to Merchant Dashboard Overview
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. REGISTRATION & KYC UPLOAD FORM
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBackToShopping && (
            <button
              onClick={onBackToShopping}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1 text-xs font-bold cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Storefront</span>
            </button>
          )}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-600 flex items-center justify-center font-black text-white text-sm">
              S
            </div>
            <div>
              <span className="font-extrabold text-sm text-white">SwiftCart</span>
              <span className="text-[10px] font-bold text-emerald-400 ml-1.5 uppercase">Secure Gated Onboarding</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-900 px-3 py-1 rounded-xl border border-slate-800">
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span>48h Token: {token.slice(0, 10)}...</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-10">
        <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl p-6 sm:p-10 space-y-8">
          {/* Header Title */}
          <div className="border-b border-slate-800 pb-5 space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verified Onboarding Invitation</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Complete Seller Account & KYC Verification
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Registering authorized store: <strong className="text-white">{inviteData.storeName}</strong> ({inviteData.phone})
            </p>
          </div>

          {formError && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8 text-xs">
            {/* 1. Account Credentials & Security */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
                <Lock className="w-4 h-4 text-orange-500" />
                <span>1. Merchant Account Security</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Store Legal Name (Verified)</label>
                  <input
                    type="text"
                    disabled
                    value={inviteData.storeName}
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-slate-400 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Official Mobile Line (Verified)</label>
                  <input
                    type="text"
                    disabled
                    value={inviteData.phone}
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono font-bold text-slate-400 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Create Password *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Minimum 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white outline-hidden focus:border-orange-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Confirm Password *</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white outline-hidden focus:border-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* 2. Legal Entity & Tax Identification */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
                <Building2 className="w-4 h-4 text-orange-500" />
                <span>2. Legal Business Entity & Tax ID</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'sole_proprietorship', label: 'Sole Proprietor', desc: 'Individual Business Owner' },
                  { id: 'registered_company', label: 'Registered Company', desc: 'URSB Incorporated / Limited' },
                  { id: 'individual', label: 'Artisan / Individual', desc: 'Personal Seller' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setEntityType(item.id as any)}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      entityType === item.id
                        ? 'bg-orange-500/10 border-orange-500 text-white'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span className="block font-bold text-xs text-white">{item.label}</span>
                    <span className="text-[10px] text-slate-400">{item.desc}</span>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">National ID (NIN) / Passport *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CM84021948X99"
                    value={ninNumber}
                    onChange={(e) => setNinNumber(e.target.value.toUpperCase())}
                    className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-white outline-hidden focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">URA Tax Identification Number (TIN)</label>
                  <input
                    type="text"
                    placeholder="e.g. 1004928371 (Optional for sole traders)"
                    value={tinNumber}
                    onChange={(e) => setTinNumber(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs font-mono text-white outline-hidden focus:border-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* 3. Escrow Settlement Payout Account */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
                <Store className="w-4 h-4 text-orange-500" />
                <span>3. Escrow Payout Channel (Tuesday Auto-Disbursements)</span>
              </h3>

              <div className="flex items-center gap-2">
                {(['momo', 'airtel', 'bank'] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPayoutType(method)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      payoutType === method
                        ? 'bg-orange-600 text-white shadow-md'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {method === 'momo' ? 'MTN Mobile Money' : method === 'airtel' ? 'Airtel Money' : 'Bank EFT Transfer'}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {payoutType === 'bank' && (
                  <div className="sm:col-span-2">
                    <label className="block text-slate-300 font-bold mb-1">Commercial Bank *</label>
                    <select
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-white outline-hidden focus:border-orange-500 cursor-pointer"
                    >
                      {UGANDA_BANKS.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Account Holder Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Must match legal registration"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white outline-hidden focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    {payoutType === 'bank' ? 'Bank Account Number *' : 'Registered MoMo Phone Number *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={payoutType === 'bank' ? 'e.g. 9030018274921' : 'e.g. 0776155353'}
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-white outline-hidden focus:border-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* 4. Document Scans & Auto-Compression Uploads */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Upload className="w-4 h-4 text-orange-500" />
                  <span>4. Identity Verification Documents</span>
                </h3>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800">
                  ⚡ Auto-Compressed
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* National ID Front */}
                <div className="space-y-1.5">
                  <label className="block text-slate-300 font-bold">National ID (Front Scan / Photo) *</label>
                  <input
                    ref={idFrontRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files, 'idFront')}
                  />
                  <div
                    onClick={() => idFrontRef.current?.click()}
                    className="p-4 border-2 border-dashed border-slate-700 hover:border-orange-500 rounded-2xl bg-slate-800/50 flex flex-col items-center justify-center text-center cursor-pointer transition-colors min-h-[140px] relative overflow-hidden"
                  >
                    {compressingField === 'idFront' ? (
                      <div className="flex flex-col items-center gap-2 text-orange-400">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span className="text-[11px] font-bold">Compressing ID scan...</span>
                      </div>
                    ) : nationalIdUrl ? (
                      <div className="w-full h-full relative group">
                        <img src={nationalIdUrl} alt="National ID Front" className="w-full h-28 object-cover rounded-xl" />
                        <span className="absolute bottom-1 right-1 text-[9px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded">
                          Uploaded ✓
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Camera className="w-6 h-6 text-slate-400 mx-auto" />
                        <p className="font-bold text-xs text-slate-300">Click to upload ID front</p>
                        <p className="text-[10px] text-slate-500">Camera photo or PDF scan</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Proof of Financial Account */}
                <div className="space-y-1.5">
                  <label className="block text-slate-300 font-bold">MoMo Statement / Bank Proof *</label>
                  <input
                    ref={financialProofRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files, 'financial')}
                  />
                  <div
                    onClick={() => financialProofRef.current?.click()}
                    className="p-4 border-2 border-dashed border-slate-700 hover:border-orange-500 rounded-2xl bg-slate-800/50 flex flex-col items-center justify-center text-center cursor-pointer transition-colors min-h-[140px] relative overflow-hidden"
                  >
                    {compressingField === 'financial' ? (
                      <div className="flex flex-col items-center gap-2 text-orange-400">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span className="text-[11px] font-bold">Compressing statement...</span>
                      </div>
                    ) : proofOfFinancialUrl ? (
                      <div className="w-full h-full relative group">
                        <img src={proofOfFinancialUrl} alt="Proof of Account" className="w-full h-28 object-cover rounded-xl" />
                        <span className="absolute bottom-1 right-1 text-[9px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded">
                          Uploaded ✓
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Camera className="w-6 h-6 text-slate-400 mx-auto" />
                        <p className="font-bold text-xs text-slate-300">Upload MoMo / Bank statement header</p>
                        <p className="text-[10px] text-slate-500">Shows account name & telephone number</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Optional: URSB Business Certificate */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-slate-300 font-bold">URSB Business Registration Certificate (Optional)</label>
                  <input
                    ref={certRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files, 'cert')}
                  />
                  <div
                    onClick={() => certRef.current?.click()}
                    className="p-3.5 border border-dashed border-slate-700 hover:border-orange-500 rounded-2xl bg-slate-800/30 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Building2 className="w-5 h-5 text-slate-400" />
                      <div className="text-left">
                        <p className="font-bold text-xs text-slate-300">
                          {businessCertUrl ? 'Certificate Uploaded ✓' : 'Upload URSB Certificate (if company)'}
                        </p>
                        <p className="text-[10px] text-slate-500">Helps fast-track verification to Top Verified Store badge</p>
                      </div>
                    </div>
                    {businessCertUrl && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setBusinessCertUrl('');
                        }}
                        className="p-1 rounded-full bg-slate-700 text-slate-300 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Submission Button */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <button
                type="submit"
                disabled={isSubmitting || !!compressingField}
                className="w-full py-4 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-extrabold text-sm rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Submitting KYC Verification Packet...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Submit Documents & Finalize Registration</span>
                  </>
                )}
              </button>

              <p className="text-[11px] text-center text-slate-500">
                By submitting, you confirm that all provided documents and tax identifiers are legally authentic under the Laws of Uganda.
              </p>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};
