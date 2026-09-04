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
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 flex flex-col justify-between shrink-0 select-none shadow-[1px_0_4px_rgba(0,0,0,0.02)] dark:shadow-none">
      <div>
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center space-x-3">
          <img src={logoImg} alt="SettleIQ Logo" className="h-8 w-auto object-contain" />
          <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
            SettleIQ
          </span>
        </div>

        {/* Navigation Menu */}
        <nav className="p-4 space-y-1">
          <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Navigation
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 font-bold shadow-sm dark:bg-blue-950/60 dark:text-blue-400'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`h-4 w-4 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    isActive 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 dark:border dark:border-blue-800/50'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Active User Card & Logout Button */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div className={`h-9 w-9 rounded-xl border shrink-0 flex items-center justify-center text-xs font-extrabold ${
              currentUser.roleCategory === 'Maker'
                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60'
                : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60'
            }`}>
              {currentUser.initials}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{currentUser.name}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">{currentUser.roleTitle}</p>
            </div>
          </div>

          <button
            onClick={logout}
            title="Log out and switch profile"
            className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition shrink-0 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );

};
