import React from 'react';
import {
  LayoutDashboard,
  UploadCloud,
  Layers,
  AlertTriangle,
  CheckSquare,
  FileText,
  LogOut
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
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  reviewQueueCount = 0
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

  return (
    <aside className="w-64 bg-[#e8edf5] dark:bg-slate-900 border-r border-slate-300/60 dark:border-slate-800 flex flex-col justify-between shrink-0 select-none">
      <div>
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-300/40 dark:border-slate-800 flex items-center space-x-3">
          <img src={logoImg} alt="SettleIQ Logo" className="h-8 w-auto object-contain shrink-0" />
          <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-[#E6E6E6] leading-tight">
            Settle<span className="bg-gradient-to-r from-[#007ADE] to-[#01A8D9] bg-clip-text text-transparent font-black">IQ</span>
          </span>
        </div>

        {/* Navigation Menu */}
        <nav className="p-4 space-y-2">
          <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Navigation
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'neu-nav-active text-blue-700 dark:text-blue-400 font-bold'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:neu-extruded-sm'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`h-4 w-4 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                <div className="flex items-center space-x-2">
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className={`neu-inset-pill px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                      item.id === 'exceptions'
                        ? 'text-amber-600 dark:text-amber-400'
                        : item.id === 'review'
                        ? 'text-purple-600 dark:text-purple-400'
                        : 'text-blue-600 dark:text-blue-400'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0" />}
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Active User Card & Logout Button */}
      <div className="p-4 border-t border-slate-300/40 dark:border-slate-800">
        <div className="neu-extruded-sm p-3 rounded-2xl flex items-center justify-between">
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div className={`w-10 h-10 rounded-full neu-inset-subtle border border-white/60 dark:border-white/10 shrink-0 flex items-center justify-center text-xs font-extrabold ${
              currentUser.roleCategory === 'Maker'
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-blue-600 dark:text-blue-400'
            }`}>
              {currentUser.initials}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate leading-tight">{currentUser.name}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">{currentUser.roleTitle}</p>
            </div>
          </div>

          <button
            onClick={logout}
            title="Log out and switch profile"
            className="neu-extruded-btn p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition shrink-0 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );

};
