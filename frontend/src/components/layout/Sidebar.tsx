import React from 'react';
import {
  LayoutDashboard,
  UploadCloud,
  Layers,
  AlertTriangle,
  CheckSquare,
  FileText,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  X
} from 'lucide-react';
import type { NavTab } from '../../types';
import { useUser } from '../../context/UserContext';
import { NAV_LABELS } from '../../constants/metrics';
import logoImg from '../../assets/logo.png';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  reviewQueueCount?: number;
  exceptionsCount?: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  reviewQueueCount = 0,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile
}) => {
  const { currentUser, logout } = useUser();

  if (!currentUser) return null;

  const allNavItems: { id: NavTab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'dashboard', label: NAV_LABELS.DASHBOARD, icon: LayoutDashboard },
    { id: 'upload', label: NAV_LABELS.UPLOAD, icon: UploadCloud },
    { id: 'reconciliation', label: NAV_LABELS.RECONCILIATION, icon: Layers },
    { id: 'exceptions', label: NAV_LABELS.EXCEPTIONS, icon: AlertTriangle },
    { id: 'review', label: NAV_LABELS.REVIEW_QUEUE, icon: CheckSquare, badge: reviewQueueCount },
    { id: 'audit', label: NAV_LABELS.AUDIT_LOGS, icon: FileText }
  ];

  // Dynamically filter navigation items based on the active role's permissions
  const navItems = allNavItems.filter((item) => currentUser.allowedTabs.includes(item.id));

  const renderNavItems = (collapsed: boolean) => (
    <nav className={`flex flex-col ${collapsed ? 'items-center' : 'items-start'} space-y-1 px-2 py-1.5`}>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;

        if (collapsed) {
          return (
            <div key={item.id} className="relative group/nav flex justify-center">
              <button
                onClick={() => onSelectTab(item.id)}
                aria-label={item.label}
                className={`relative w-10 h-10 flex items-center justify-center rounded-lg transition-all cursor-pointer ${
                  isActive
                    ? 'neu-nav-active text-blue-700 dark:text-blue-400 font-bold'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:neu-extruded-sm'
                }`}
              >
                <Icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`} />

                {/* Compact Notification Pip on Icon */}
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`absolute -top-1 -right-1 min-w-3.5 h-3.5 px-1 flex items-center justify-center text-[8px] font-black rounded-full shadow-sm text-white ${
                      item.id === 'exceptions'
                        ? 'bg-amber-500'
                        : item.id === 'review'
                        ? 'bg-purple-600'
                        : 'bg-blue-600'
                    }`}
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </button>

              {/* Floating Right Tooltip */}
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg neu-extruded-sm bg-[#e8edf5] dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-bold border border-white/80 dark:border-white/10 shadow-lg pointer-events-none opacity-0 group-hover/nav:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50 flex items-center gap-2">
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`neu-inset-pill px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
                      item.id === 'exceptions'
                        ? 'text-amber-600 dark:text-amber-400'
                        : item.id === 'review'
                        ? 'text-purple-600 dark:text-purple-400'
                        : 'text-blue-600 dark:text-blue-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
            </div>
          );
        }

        return (
          <button
            key={item.id}
            onClick={() => {
              onSelectTab(item.id);
              onCloseMobile?.();
            }}
            className={`w-fit max-w-full inline-flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              isActive
                ? 'neu-nav-active text-blue-700 dark:text-blue-400 font-bold'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:neu-extruded-sm'
            }`}
          >
            <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`} />
            <span className="truncate text-xs sm:text-sm">{item.label}</span>
            {item.badge !== undefined && item.badge > 0 && (
              <span
                className={`neu-inset-pill px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                  item.id === 'exceptions'
                    ? 'text-amber-600 dark:text-amber-400'
                    : item.id === 'review'
                    ? 'text-purple-600 dark:text-purple-400'
                    : 'text-blue-600 dark:text-blue-400'
                }`}
              >
                {item.badge}
              </span>
            )}
            {isActive && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0" />}
          </button>
        );
      })}
    </nav>
  );

  const renderProfileArea = (collapsed: boolean) => {
    if (collapsed) {
      return (
        <div className="p-2 border-t border-slate-300/40 dark:border-slate-800 flex flex-col items-center gap-1.5">
          {/* Avatar with Tooltip */}
          <div className="relative group/profile">
            <div
              className={`w-9 h-9 rounded-lg neu-inset-subtle border border-white/60 dark:border-white/10 flex items-center justify-center text-xs font-extrabold cursor-pointer ${
                currentUser.roleCategory === 'Maker'
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-blue-600 dark:text-blue-400'
              }`}
            >
              {currentUser.initials}
            </div>
            <div className="absolute left-full ml-3 bottom-0 px-2.5 py-1.5 rounded-lg neu-extruded-sm bg-[#e8edf5] dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs border border-white/80 dark:border-white/10 shadow-lg pointer-events-none opacity-0 group-hover/profile:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50">
              <p className="font-bold">{currentUser.name}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                {currentUser.roleTitle} ({currentUser.roleCategory})
              </p>
            </div>
          </div>

          {/* Logout Button with Tooltip */}
          <div className="relative group/logout">
            <button
              onClick={logout}
              aria-label="Log out and switch profile"
              className="neu-extruded-btn w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md neu-extruded-sm bg-[#e8edf5] dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-bold border border-white/80 dark:border-white/10 shadow-lg pointer-events-none opacity-0 group-hover/logout:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50">
              Log out
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="p-2 border-t border-slate-300/40 dark:border-slate-800">
        <div className="neu-extruded-sm p-1.5 px-2 rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-2 overflow-hidden">
            <div
              className={`w-7 h-7 rounded-full neu-inset-subtle border border-white/60 dark:border-white/10 shrink-0 flex items-center justify-center text-[11px] font-extrabold ${
                currentUser.roleCategory === 'Maker'
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-blue-600 dark:text-blue-400'
              }`}
            >
              {currentUser.initials}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate leading-tight">
                {currentUser.name}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">
                {currentUser.roleTitle}
              </p>
            </div>
          </div>

          <button
            onClick={logout}
            title="Log out and switch profile"
            className="neu-extruded-btn p-1.5 rounded-md text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition shrink-0 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop / Tablet Persistent Adaptive Sidebar */}
      <aside
        className={`${
          isCollapsed ? 'w-[72px]' : 'w-56'
        } hidden md:flex bg-[#e8edf5] dark:bg-slate-900 border-r border-slate-300/60 dark:border-slate-800 flex-col justify-between shrink-0 select-none transition-[width] duration-300 ease-in-out`}
      >
        <div>
          {/* Brand Header with ChatGPT-style Logo Hover Toggle */}
          <div className="h-13 sm:h-14 px-3 border-b border-slate-300/40 dark:border-slate-800 flex items-center">
            {isCollapsed ? (
              // Collapsed Header: Centered Logo with Open Tooltip
              <div className="w-full flex items-center justify-center">
                <button
                  onClick={onToggleCollapse}
                  aria-label="Open sidebar"
                  className="relative group/logo w-9 h-9 flex items-center justify-center cursor-pointer rounded-lg transition-all"
                >
                  <img
                    src={logoImg}
                    alt="SettleIQ Logo"
                    className="h-7 w-auto object-contain transition-opacity duration-200 group-hover/logo:opacity-0"
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/logo:opacity-100 transition-opacity duration-200 text-slate-700 dark:text-slate-200 neu-extruded-sm rounded-lg">
                    <PanelLeftOpen className="h-4 w-4" />
                  </div>

                  {/* Hover Tooltip */}
                  <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg neu-extruded-sm bg-[#e8edf5] dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-bold border border-white/80 dark:border-white/10 shadow-lg pointer-events-none opacity-0 group-hover/logo:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50">
                    Open sidebar
                  </div>
                </button>
              </div>
            ) : (
              // Expanded Header: Logo Button with Close Tooltip + Wordmark
              <div className="w-full flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <button
                    onClick={onToggleCollapse}
                    aria-label="Close sidebar"
                    className="relative group/logo w-8 h-8 flex items-center justify-center cursor-pointer rounded-lg transition-all shrink-0"
                  >
                    <img
                      src={logoImg}
                      alt="SettleIQ Logo"
                      className="h-7 w-auto object-contain transition-opacity duration-200 group-hover/logo:opacity-0"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/logo:opacity-100 transition-opacity duration-200 text-slate-700 dark:text-slate-200 neu-extruded-sm rounded-lg">
                      <PanelLeftClose className="h-4 w-4" />
                    </div>

                    {/* Hover Tooltip */}
                    <div className="absolute top-full mt-2 left-0 px-2.5 py-1 rounded-lg neu-extruded-sm bg-[#e8edf5] dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-bold border border-white/80 dark:border-white/10 shadow-lg pointer-events-none opacity-0 group-hover/logo:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50">
                      Close sidebar
                    </div>
                  </button>

                  <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-[#E6E6E6] leading-tight select-none truncate">
                    Settle
                    <span className="bg-gradient-to-r from-[#007ADE] to-[#01A8D9] bg-clip-text text-transparent font-black">
                      IQ
                    </span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Menu */}
          {renderNavItems(isCollapsed)}
        </div>

        {/* User Card & Logout Button */}
        {renderProfileArea(isCollapsed)}
      </aside>

      {/* Mobile Off-Canvas Drawer & Overlay (< md screens) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm transition-opacity"
            aria-hidden="true"
          />

          {/* Off-Canvas Drawer */}
          <aside className="relative w-60 bg-[#e8edf5] dark:bg-slate-900 border-r border-slate-300/60 dark:border-slate-800 flex flex-col justify-between shadow-2xl z-10 h-full select-none animate-in slide-in-from-left duration-200">
            <div>
              {/* Drawer Header */}
              <div className="h-13 sm:h-14 px-3 border-b border-slate-300/40 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <img src={logoImg} alt="SettleIQ Logo" className="h-7 w-auto object-contain shrink-0" />
                  <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-[#E6E6E6]">
                    Settle
                    <span className="bg-gradient-to-r from-[#007ADE] to-[#01A8D9] bg-clip-text text-transparent font-black">
                      IQ
                    </span>
                  </span>
                </div>
                <button
                  onClick={onCloseMobile}
                  aria-label="Close navigation menu"
                  className="neu-extruded-btn p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Navigation Menu */}
              {renderNavItems(false)}
            </div>

            {/* Profile Area */}
            {renderProfileArea(false)}
          </aside>
        </div>
      )}
    </>
  );
};
