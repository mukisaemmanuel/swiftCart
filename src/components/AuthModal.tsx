import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/db';
import { UGANDA_DISTRICTS } from '../data/seedData';
import { UserRole } from '../types';
import { X, Lock, Mail, Phone, User as UserIcon, Store, MapPin, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  defaultRole?: 'buyer' | 'seller';
  onAuthSuccess?: (role: UserRole) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  defaultRole = 'buyer',
  onAuthSuccess,
}) => {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [role, setRole] = useState<'buyer' | 'seller'>(defaultRole);

  // Form states
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [storeName, setStoreName] = useState('');
  const [district, setDistrict] = useState(UGANDA_DISTRICTS[0]);
  const [address, setAddress] = useState('');
  const [bio, setBio] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    const res = await login(emailOrPhone, password);
    setSubmitting(false);

    if (res.success) {
      const users = await dbService.getUsers();
      const cleanSearch = emailOrPhone.trim().toLowerCase();
      const currentUid = auth.currentUser?.uid;
      const foundUser = users.find(
        (u) =>
          (currentUid && u.id === currentUid) ||
          u.email.toLowerCase() === cleanSearch ||
          u.phone.replace(/[\s+-]/g, '') === cleanSearch.replace(/[\s+-]/g, '')
      );
      if (foundUser && onAuthSuccess) {
        onAuthSuccess(foundUser.role);
      } else if (onAuthSuccess) {
        onAuthSuccess('buyer');
      }
      onClose();
    } else {
      setErrorMsg(res.message || 'Login failed. Please check your credentials.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    if (role === 'seller' && !storeName.trim()) {
      setErrorMsg('Store Name is required for seller onboarding.');
      setSubmitting(false);
      return;
    }

    const res = await register({
      name,
      email,
      phone,
      role,
      password,
      storeName: role === 'seller' ? storeName : undefined,
      district: role === 'seller' ? district : undefined,
      address: role === 'seller' ? address : undefined,
      bio: role === 'seller' ? bio : undefined,
    });

    setSubmitting(false);
    if (res.success) {
      if (onAuthSuccess) {
        onAuthSuccess(role);
      }
      onClose();
    } else {
      setErrorMsg(res.message || 'Registration failed.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 my-8">
        {/* Header */}
        <div className="bg-linear-to-r from-orange-600 to-amber-600 p-5 text-white flex justify-between items-center">
          <div>
            <span className="text-xs uppercase tracking-wider font-semibold text-orange-200 bg-orange-700/40 px-2 py-0.5 rounded-full">
              SwiftCart Uganda
            </span>
            <h3 className="text-xl font-bold mt-1">
              {isLogin ? 'Sign In to Your Account' : 'Create SwiftCart Account'}
            </h3>
            <p className="text-xs text-orange-100">
              {isLogin
                ? 'Shop thousands of items with fast delivery in Uganda'
                : 'Join buyers and top merchants across Uganda'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
          <button
            type="button"
            onClick={() => {
              setIsLogin(true);
              setErrorMsg(null);
            }}
            className={`flex-1 py-3 text-sm font-semibold text-center border-b-2 transition-colors ${
              isLogin
                ? 'border-orange-600 text-orange-600 dark:text-orange-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsLogin(false);
              setErrorMsg(null);
            }}
            className={`flex-1 py-3 text-sm font-semibold text-center border-b-2 transition-colors ${
              !isLogin
                ? 'border-orange-600 text-orange-600 dark:text-orange-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Register
          </button>
        </div>

        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {isLogin ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email or Phone Number
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    required
                    value={emailOrPhone}
                    onChange={(e) => setEmailOrPhone(e.target.value)}
                    placeholder="grace.k@example.com or +256772123456"
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white dark:focus:bg-slate-800 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white dark:focus:bg-slate-800 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.99] disabled:opacity-50"
              >
                {submitting ? 'Signing in...' : 'Sign In'}
              </button>

              <div className="pt-2 text-center">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Want to test quickly? Use the{' '}
                  <span className="text-orange-600 dark:text-orange-400 font-semibold cursor-pointer underline">
                    Quick Persona Switcher
                  </span>{' '}
                  on top.
                </span>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  I want to register as:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('buyer')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      role === 'buyer'
                        ? 'border-orange-600 bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <UserIcon className="w-4 h-4" /> Buyer (Shopper)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('seller')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      role === 'seller'
                        ? 'border-orange-600 bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Store className="w-4 h-4" /> Merchant / Seller
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name / Contact Person
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Patrick Ssenyonga"
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white dark:focus:bg-slate-800 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="patrick@example.com"
                      className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white dark:focus:bg-slate-800 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Uganda Phone (MTN/Airtel)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0772 123456"
                      className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white dark:focus:bg-slate-800 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white dark:focus:bg-slate-800 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
              </div>

              {/* Seller specific fields */}
              {role === 'seller' && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3 bg-orange-50/50 dark:bg-orange-950/30 p-3 rounded-xl border border-orange-200/50 dark:border-orange-800/40">
                  <div className="flex items-center gap-1.5 text-orange-800 dark:text-orange-300 text-xs font-bold">
                    <Store className="w-4 h-4" /> Store & Business Information
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Store Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder="e.g. Busia Tech & Gadgets"
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Primary District
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <select
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                      >
                        {UGANDA_DISTRICTS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Physical Shop / Warehouse Address
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. Customs Way, Busia Town"
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Store Bio / Description
                    </label>
                    <textarea
                      rows={2}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell customers what products you specialize in..."
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.99] disabled:opacity-50"
              >
                {submitting
                  ? 'Creating account...'
                  : role === 'seller'
                  ? 'Complete Seller Registration'
                  : 'Create Buyer Account'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
