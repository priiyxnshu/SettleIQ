import React from 'react';
import {
  LayoutDashboard,
  UploadCloud,
  Layers,
  AlertTriangle,
  CheckSquare,
  FileText,
  ShieldCheck,
  LogOut
} from 'lucide-react';
import type { NavTab } from '../../types';
import { useUser } from '../../context/UserContext';

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
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'upload', label: 'Upload Data', icon: UploadCloud },
    { id: 'reconciliation', label: 'Reconciliation', icon: Layers },
    { id: 'exceptions', label: 'Exceptions', icon: AlertTriangle },
    { id: 'review', label: 'Review Queue', icon: CheckSquare, badge: reviewQueueCount },
    { id: 'audit', label: 'Audit Logs', icon: FileText }
  ];

  // Dynamically filter navigation items based on the active role's permissions
  const navItems = allNavItems.filter((item) => currentUser.allowedTabs.includes(item.id));

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col justify-between shrink-0 select-none">
      <div>
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
          <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/30">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white leading-tight">SettleIQ</h1>
            <p className="text-xs text-slate-400 font-medium">Reconciliation MVP</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-4 space-y-1.5">
          <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>{currentUser.roleCategory} Navigation</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
              currentUser.roleCategory === 'Maker'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'
            }`}>
              {currentUser.roleCategory}
            </span>
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`h-4 w-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    isActive 
                      ? 'bg-indigo-500 text-white' 
                      : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
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
      <div className="p-4 border-t border-slate-800 bg-slate-950/80">
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div className={`h-8 w-8 rounded-lg border shrink-0 flex items-center justify-center text-xs font-bold ${
              currentUser.roleCategory === 'Maker'
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
            }`}>
              {currentUser.initials}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
              <p className="text-[10px] text-slate-400 truncate">{currentUser.roleTitle}</p>
            </div>
          </div>

          <button
            onClick={logout}
            title="Log out and switch profile"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition shrink-0"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
