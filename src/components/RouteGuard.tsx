import React from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { ShieldAlert, Lock, ArrowLeft, UserCheck, Sparkles, Clock, AlertTriangle, HelpCircle } from 'lucide-react';

interface RouteGuardProps {
  allowedRoles: UserRole[];
  portalName: string;
  portalPath: string;
  onOpenAuth: () => void;
  onOpenDemoSwitcher: () => void;
  onBackToHome: () => void;
  children: React.ReactNode;
}

export const RouteGuard: React.FC<RouteGuardProps> = ({
  allowedRoles,
  portalName,
  portalPath,
  onOpenAuth,
  onOpenDemoSwitcher,
  onBackToHome,
  children,
}) => {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Verifying Portal Security Credentials...
        </p>
      </div>
    );
  }

  // 1. Unauthenticated Visitor
  if (!currentUser) {
    return (
      <div className="max-w-xl mx-auto my-10 sm:my-16 p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-300 dark:border-slate-800 shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center mx-auto text-rose-600 dark:text-rose-400 shadow-inner">
          <Lock className="w-8 h-8 sm:w-10 sm:h-10" />
        </div>

        <div className="space-y-2">
          <span className="inline-block text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            HTTP 403 • Authentication Required
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            Access to {portalName} Is Restricted
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-md mx-auto font-medium">
            You must sign in with an authenticated account that has permissions to access{' '}
            <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-rose-600 dark:text-rose-400 font-bold font-mono">
              {portalPath}
            </code>
            .
          </p>
        </div>

        <div className="p-4 bg-slate-100 dark:bg-slate-800/90 rounded-2xl border border-slate-300 dark:border-slate-700 text-left space-y-2 text-xs shadow-inner">
          <div className="font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
            <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
            <span>Required Role Access:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {allowedRoles.map((role) => (
              <span
                key={role}
                className="px-3 py-1 rounded-lg bg-orange-600 text-white font-mono font-black text-xs shadow-xs tracking-wider"
              >
                {role.toUpperCase()}
              </span>
            ))}
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onOpenAuth}
            className="w-full sm:w-auto px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Sign In / Log In</span>
          </button>

          <button
            onClick={onOpenDemoSwitcher}
            className="w-full sm:w-auto px-5 py-3 bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs sm:text-sm rounded-xl border border-slate-700 shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Switch Demo Persona</span>
          </button>

          <button
            onClick={onBackToHome}
            className="w-full sm:w-auto px-5 py-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-slate-300 dark:border-slate-700"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Storefront</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. Account Status Check (Suspended / Pending)
  if (currentUser.status === 'SUSPENDED') {
    return (
      <div className="max-w-xl mx-auto my-10 sm:my-16 p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-3xl border border-red-300 dark:border-red-900 shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-red-100 dark:bg-red-950 flex items-center justify-center mx-auto text-red-600">
          <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10" />
        </div>
        <div className="space-y-2">
          <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800">
            Account Suspended
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            Access Has Been Suspended
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">
            Your account ({currentUser.email}) has been temporarily suspended by SwiftCart Administration.
          </p>
        </div>
        <button
          onClick={onBackToHome}
          className="px-6 py-3 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
        >
          Return to Marketplace
        </button>
      </div>
    );
  }

  // 3. Role Authorization Check
  const currentRoleNormalized = (currentUser.role || '').toUpperCase();
  const normalizedAllowed = allowedRoles.map((r) => r.toUpperCase());
  const hasPermission = normalizedAllowed.includes(currentRoleNormalized);

  if (!hasPermission) {
    return (
      <div className="max-w-xl mx-auto my-10 sm:my-16 p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-3xl border border-amber-300 dark:border-amber-900/50 shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/50 flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400 shadow-inner">
          <ShieldAlert className="w-8 h-8 sm:w-10 sm:h-10" />
        </div>

        <div className="space-y-2">
          <span className="inline-block text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            HTTP 403 • Forbidden Access
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            Insufficient Permissions
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-md mx-auto font-medium">
            You are signed in as <strong className="text-slate-900 dark:text-white font-bold">{currentUser.name}</strong> with role{' '}
            <span className="px-2 py-0.5 rounded bg-orange-100 dark:bg-orange-950/80 font-mono font-bold text-orange-700 dark:text-orange-400 border border-orange-300 dark:border-orange-800">
              {currentRoleNormalized}
            </span>
            . Access to <code className="font-mono text-slate-800 dark:text-slate-200 font-bold">{portalPath}</code> is reserved strictly for{' '}
            <strong>{normalizedAllowed.join(' or ')}</strong>.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onOpenDemoSwitcher}
            className="w-full sm:w-auto px-5 py-3 bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <UserCheck className="w-4 h-4" />
            <span>Switch to Authorized Account</span>
          </button>

          <button
            onClick={onBackToHome}
            className="w-full sm:w-auto px-5 py-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-slate-300 dark:border-slate-700"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Marketplace</span>
          </button>
        </div>
      </div>
    );
  }

  // 4. Pending Merchant Check
  if (currentRoleNormalized === 'SELLER' && currentUser.status === 'PENDING') {
    return (
      <div className="max-w-xl mx-auto my-10 sm:my-16 p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-3xl border border-amber-300 dark:border-amber-800 shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-amber-100 dark:bg-amber-950 flex items-center justify-center mx-auto text-amber-600">
          <Clock className="w-8 h-8 sm:w-10 sm:h-10 animate-pulse" />
        </div>
        <div className="space-y-2">
          <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            Store Registration Pending
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            Merchant Account Under Review
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto font-medium">
            Hello {currentUser.name}, your merchant store application is currently undergoing KYC review by SwiftCart Operations. You will receive an SMS/in-app alert once approved.
          </p>
        </div>
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onOpenDemoSwitcher}
            className="px-5 py-2.5 bg-orange-600 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            Switch to Active Store (David / Sarah)
          </button>
          <button
            onClick={onBackToHome}
            className="px-5 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl text-xs font-bold cursor-pointer border border-slate-300 dark:border-slate-700"
          >
            Browse Marketplace
          </button>
        </div>
      </div>
    );
  }

  // Authorization Granted
  return <>{children}</>;
};
