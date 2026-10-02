import React from 'react';
import { useAuth } from '../context/AuthContext';
import { SEED_USERS } from '../data/seedData';
import { X, UserCheck, ShoppingBag, Store } from 'lucide-react';
import { UserRole } from '../types';

interface DemoSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRole?: (role: UserRole) => void;
}

export const DemoSwitcherModal: React.FC<DemoSwitcherModalProps> = ({ isOpen, onClose, onSelectRole }) => {
  const { currentUser, switchUser, isLiveAuth } = useAuth();

  if (!isOpen) return null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl max-w-[calc(100vw-1rem)] sm:max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 transition-colors duration-200 max-h-[90dvh] flex flex-col">
        <div className="bg-linear-to-r from-orange-600 via-purple-700 to-slate-900 p-5 text-white flex justify-between items-center shrink-0">
          <div>
            <span className="text-xs uppercase tracking-wider font-extrabold text-amber-200 bg-white/20 px-2.5 py-0.5 rounded-full">
              RBAC Persona Switcher
            </span>
            <h3 className="text-lg font-black mt-1">Switch User Account</h3>
            <p className="text-xs text-slate-200">
              Test Buyer, Seller, Operations Admin, and Super Admin flows with 1-click
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-2.5 overflow-y-auto">
          {isLiveAuth && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs space-y-1">
              <div className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span>🔥 Live Firebase Account Active</span>
              </div>
              <p className="text-emerald-700 dark:text-emerald-400">
                You are currently signed in as <strong>{currentUser?.name}</strong> ({currentUser?.email}) with role:{' '}
                <strong>{currentUser?.role?.toUpperCase()}</strong>.
              </p>
            </div>
          )}

          <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">Select a verified Ugandan persona or test as guest:</p>

          {/* Guest option */}
          <button
            onClick={async () => {
              await switchUser('guest');
              onSelectRole?.('BUYER');
              onClose();
            }}
            className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
              !currentUser
                ? 'border-orange-500 bg-orange-50/70 dark:bg-orange-950/40 ring-2 ring-orange-500/20'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-850'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-xs">
                👤
              </div>
              <div>
                <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-2">
                  Guest User (Signed Out)
                  {!currentUser && (
                    <span className="flex items-center text-xs text-orange-600 dark:text-orange-400 font-bold">
                      <UserCheck className="w-3.5 h-3.5 mr-0.5" /> Active
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Browse anonymously without permissions</div>
              </div>
            </div>

            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              Guest
            </span>
          </button>

          {SEED_USERS.map((user) => {
            const isActive = currentUser?.id === user.id;
            const roleUpper = (user.role || '').toUpperCase();

            let roleBadge = 'Buyer';
            let roleColor = 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800';
            let icon = <ShoppingBag className="w-4 h-4 text-blue-600 dark:text-blue-400" />;

            if (roleUpper === 'SUPER_ADMIN') {
              roleBadge = 'Super Admin';
              roleColor = 'bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800';
              icon = <span className="text-xs">👑</span>;
            } else if (roleUpper === 'ADMIN') {
              roleBadge = 'Operations Admin';
              roleColor = 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800';
              icon = <span className="text-xs">🛡️</span>;
            } else if (roleUpper === 'SELLER') {
              if (user.status === 'PENDING') {
                roleBadge = 'Seller (Pending KYC)';
                roleColor = 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800';
                icon = <Store className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
              } else {
                roleBadge = 'Seller (Active)';
                roleColor = 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
                icon = <Store className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
              }
            }

            return (
              <button
                key={user.id}
                onClick={async () => {
                  await switchUser(user.id);
                  onSelectRole?.(user.role);
                  onClose();
                }}
                className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                  isActive
                    ? 'border-orange-500 bg-orange-50/70 dark:bg-orange-950/40 ring-2 ring-orange-500/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-850'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={user.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`}
                      alt={user.name}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                    />
                    <div className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-white dark:bg-slate-800 shadow-xs flex items-center justify-center">
                      {icon}
                    </div>
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-2">
                      {user.name}
                      {isActive && (
                        <span className="flex items-center text-xs text-orange-600 dark:text-orange-400 font-bold">
                          <UserCheck className="w-3.5 h-3.5 mr-0.5" /> Active
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{user.email} • {user.phone}</div>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${roleColor}`}
                >
                  {roleBadge}
                </span>
              </button>
            );
          })}
        </div>

        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 text-center shrink-0">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Switch to <strong>Super Admin</strong> for executive control, or <strong>Grace</strong> to test buyer access restrictions.
          </p>
        </div>
      </div>
    </div>
  );
};
