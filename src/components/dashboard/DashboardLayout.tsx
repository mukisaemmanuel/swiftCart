import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { UserRole } from '../../types';
import {
  Zap,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  Bell,
  Sun,
  Moon,
  LogOut,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Store,
  CheckCircle2,
  Command,
  HelpCircle,
  Sparkles,
  ArrowRight,
  UserCheck,
} from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  badgeVariant?: 'default' | 'amber' | 'emerald' | 'rose';
  group?: string;
}

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

export interface DashboardLayoutProps {
  role: UserRole;
  title: string;
  subtitle?: string;
  breadcrumbs: BreadcrumbItem[];
  navItems: NavItem[];
  activeNavId: string;
  onSelectNav: (id: string) => void;
  actions?: React.ReactNode;
  onViewLiveStore: () => void;
  onOpenDemoSwitcher?: () => void;
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  role,
  title,
  subtitle,
  breadcrumbs,
  navItems,
  activeNavId,
  onSelectNav,
  actions,
  onViewLiveStore,
  onOpenDemoSwitcher,
  children,
}) => {
  const { currentUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Keyboard shortcut for Cmd/Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false);
        setIsNotificationsOpen(false);
        setIsProfileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const normalizedRole = (role || 'BUYER').toUpperCase();

  const roleMeta = useMemo(() => {
    switch (normalizedRole) {
      case 'SUPER_ADMIN':
        return {
          portalName: 'Executive Governance',
          tagColor: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-300 dark:border-red-800',
          icon: ShieldAlert,
        };
      case 'ADMIN':
        return {
          portalName: 'Operations Hub',
          tagColor: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-800',
          icon: ShieldCheck,
        };
      case 'SELLER':
      default:
        return {
          portalName: 'Merchant Studio',
          tagColor: 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-800',
          icon: Store,
        };
    }
  }, [normalizedRole]);

  // Grouped Navigation Items
  const groupedNav = useMemo(() => {
    const groups: { [key: string]: NavItem[] } = {};
    navItems.forEach((item) => {
      const g = item.group || 'Core Management';
      if (!groups[g]) groups[g] = [];
      groups[g].push(item);
    });
    return groups;
  }, [navItems]);

  // Filtered command palette items
  const filteredNavForCommand = useMemo(() => {
    if (!commandQuery.trim()) return navItems;
    const q = commandQuery.toLowerCase();
    return navItems.filter((i) => i.label.toLowerCase().includes(q));
  }, [navItems, commandQuery]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col antialiased selection:bg-orange-500 selection:text-white">
      {/* Mobile Drawer Backdrop */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Main Flex Wrapper */}
      <div className="flex flex-1 overflow-hidden min-h-screen">
        {/* ========================================================= */}
        {/* SIDEBAR (Desktop Persistent + Mobile Drawer) */}
        {/* ========================================================= */}
        <aside
          className={`fixed md:sticky top-0 z-50 h-screen shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200/90 dark:border-slate-800/90 flex flex-col justify-between transition-all duration-300 ease-in-out ${
            isMobileSidebarOpen
              ? 'translate-x-0 w-68 shadow-2xl'
              : '-translate-x-full md:translate-x-0'
          } ${
            isSidebarCollapsed ? 'md:w-18' : 'md:w-66'
          }`}
        >
          {/* Top Branding Section */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Zap className="w-5 h-5 fill-white" />
              </div>
              {!isSidebarCollapsed && (
                <div className="min-w-0 leading-tight">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white">
                      SwiftCart
                    </span>
                    <span
                      className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md border ${roleMeta.tagColor}`}
                    >
                      {normalizedRole.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 truncate">
                    {roleMeta.portalName}
                  </p>
                </div>
              )}
            </div>

            {/* Mobile Close Button */}
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white md:hidden cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav Items List */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin">
            {Object.entries(groupedNav).map(([groupTitle, items]) => (
              <div key={groupTitle} className="space-y-1">
                {!isSidebarCollapsed && (
                  <h4 className="px-2.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                    {groupTitle}
                  </h4>
                )}
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeNavId === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectNav(item.id);
                        setIsMobileSidebarOpen(false);
                      }}
                      title={isSidebarCollapsed ? item.label : undefined}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs transition-all cursor-pointer ${
                        isActive
                          ? 'bg-slate-900 dark:bg-orange-600 text-white shadow-xs font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-200'
                      } ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-between'}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                        {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                      </div>

                      {!isSidebarCollapsed && item.badge !== undefined && (
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                            item.badgeVariant === 'rose'
                              ? 'bg-rose-500 text-white'
                              : item.badgeVariant === 'amber'
                              ? 'bg-amber-400 text-slate-950 font-black'
                              : item.badgeVariant === 'emerald'
                              ? 'bg-emerald-500 text-white'
                              : isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Sidebar Bottom Section: User Snippet & Switcher */}
          <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
            {!isSidebarCollapsed ? (
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden">
                    {currentUser?.avatarUrl ? (
                      <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-full h-full object-cover" />
                    ) : (
                      currentUser?.name?.substring(0, 2).toUpperCase() || 'UG'
                    )}
                  </div>
                  <div className="min-w-0 leading-tight">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {currentUser?.name || 'Verified Operator'}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                      {currentUser?.email || 'operator@swiftcart.ug'}
                    </p>
                  </div>
                </div>

                {onOpenDemoSwitcher && (
                  <button
                    onClick={onOpenDemoSwitcher}
                    title="Switch Persona / Demo Role"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    <UserCheck className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex justify-center">
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center">
                  {currentUser?.name?.substring(0, 1).toUpperCase() || 'U'}
                </div>
              </div>
            )}

            {/* Systems Operational Indicator */}
            {!isSidebarCollapsed && (
              <div className="px-2 py-1 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Uganda Central Hub
                </span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">Online</span>
              </div>
            )}

            {/* Desktop Collapse Toggle */}
            <div className="hidden md:flex justify-end pt-1">
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-xs flex items-center gap-1"
                title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              >
                {isSidebarCollapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <div className="flex items-center gap-1 text-[11px] px-1 font-medium">
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Collapse</span>
                  </div>
                )}
              </button>
            </div>
          </div>
        </aside>

        {/* ========================================================= */}
        {/* MAIN BODY AREA (Topbar + Page Canvas) */}
        {/* ========================================================= */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* TOP APP HEADER (Height 60px) */}
          <header className="sticky top-0 z-30 h-15 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800/90 px-4 sm:px-6 flex items-center justify-between gap-4">
            {/* Left Header Area: Mobile Hamburger & Dynamic Breadcrumbs */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden cursor-pointer"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Breadcrumb Path */}
              <nav className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 overflow-hidden">
                <span className="font-bold text-slate-800 dark:text-slate-200">{roleMeta.portalName}</span>
                {breadcrumbs.map((crumb, idx) => (
                  <React.Fragment key={idx}>
                    <span className="text-slate-300 dark:text-slate-600">/</span>
                    <button
                      onClick={crumb.onClick}
                      disabled={!crumb.onClick}
                      className={`truncate ${
                        idx === breadcrumbs.length - 1
                          ? 'font-bold text-slate-900 dark:text-white'
                          : 'hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer'
                      }`}
                    >
                      {crumb.label}
                    </button>
                  </React.Fragment>
                ))}
              </nav>
            </div>

            {/* Right Header Controls: Command Palette, Notifications, Theme, Profile */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Command Palette Trigger */}
              <button
                onClick={() => setIsCommandPaletteOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white border border-slate-200/80 dark:border-slate-700/80 text-xs transition-colors cursor-pointer"
                title="Search records or run commands (Ctrl + K)"
              >
                <Search className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Quick Jump...</span>
                <kbd className="hidden md:inline text-[10px] font-mono bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600 text-slate-400 dark:text-slate-300">
                  Ctrl K
                </kbd>
              </button>

              {/* View Live Store Button */}
              <button
                onClick={onViewLiveStore}
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800/80 text-xs font-bold hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Live Storefront</span>
              </button>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
              </button>

              {/* Notification Drawer Trigger */}
              <div className="relative">
                <button
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative cursor-pointer"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-orange-500"></span>
                </button>

                {/* Notifications Dropdown */}
                {isNotificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-4 space-y-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-orange-600" />
                        <span className="font-bold text-xs text-slate-900 dark:text-white">Live Platform Alerts</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">Escrow & Dispatches</span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 dark:text-slate-200">MTN MoMo Escrow Inflow</span>
                          <span className="text-[10px] text-slate-400">2m ago</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">UGX 1,450,000 held safely pending buyer delivery receipt.</p>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 dark:text-slate-200">Merchant KYC Uploaded</span>
                          <span className="text-[10px] text-slate-400">14m ago</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Pearl Home & Electronics uploaded National ID & URSB for review.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Profile Menu Trigger */}
              <div className="relative">
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-2 p-1 pl-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-full bg-slate-900 dark:bg-orange-600 text-white font-bold text-xs flex items-center justify-center overflow-hidden">
                    {currentUser?.avatarUrl ? (
                      <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-full h-full object-cover" />
                    ) : (
                      currentUser?.name?.substring(0, 1).toUpperCase() || 'U'
                    )}
                  </div>
                </button>

                {/* Profile Dropdown */}
                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-2 space-y-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                      <p className="font-bold text-xs text-slate-900 dark:text-white truncate">{currentUser?.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{currentUser?.email}</p>
                    </div>

                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        onViewLiveStore();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      <span>View Live Storefront</span>
                    </button>

                    {onOpenDemoSwitcher && (
                      <button
                        onClick={() => {
                          setIsProfileOpen(false);
                          onOpenDemoSwitcher();
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                        <span>Switch Persona / Role</span>
                      </button>
                    )}

                    <div className="border-t border-slate-100 dark:border-slate-800 pt-1">
                      <button
                        onClick={() => {
                          setIsProfileOpen(false);
                          logout();
                          onViewLiveStore();
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* PAGE CONTENT CONTAINER */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
            {/* Standard Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    {subtitle}
                  </p>
                )}
              </div>

              {/* Right-aligned primary actions */}
              {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
            </div>

            {/* Render Dashboard View Body */}
            {children}
          </main>
        </div>
      </div>

      {/* ========================================================= */}
      {/* COMMAND PALETTE MODAL (Ctrl / Cmd + K) */}
      {/* ========================================================= */}
      {isCommandPaletteOpen && (
        <div className="fixed inset-0 z-60 bg-slate-950/60 backdrop-blur-xs flex items-start justify-center p-4 pt-20">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                autoFocus
                placeholder="Search views, orders, merchants, audit records..."
                value={commandQuery}
                onChange={(e) => setCommandQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white outline-hidden placeholder:text-slate-400"
              />
              <kbd className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">
                ESC
              </kbd>
            </div>

            <div className="max-h-72 overflow-y-auto p-2 space-y-1">
              <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Jump to Section
              </div>
              {filteredNavForCommand.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectNav(item.id);
                      setIsCommandPaletteOpen(false);
                      setCommandQuery('');
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 text-slate-400" />
                      <span className="font-semibold">{item.label}</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                );
              })}

              {filteredNavForCommand.length === 0 && (
                <div className="p-6 text-center text-xs text-slate-400">
                  No matching sections found for "{commandQuery}".
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
