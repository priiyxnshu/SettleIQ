import React, { useState } from 'react';
import {
  LayoutDashboard,
  UploadCloud,
  Layers,
  AlertTriangle,
  CheckSquare,
  FileText,
  ShieldCheck,
  UserCheck,
  ArrowLeftRight
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
  const { currentUser, switchUser, allUsers } = useUser();
  const [showUserDropdown, setShowUserDropdown] = useState(false);

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

      {/* Demo RBAC User Switcher Section */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/80 relative">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1">
            <UserCheck className="h-3 w-3" />
            <span>Active Demo Role</span>
          </span>
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 px-1.5 py-0.5 rounded hover:bg-slate-900 transition"
          >
            <ArrowLeftRight className="h-2.5 w-2.5" />
            <span>Switch Role</span>
          </button>
        </div>

        {/* User Card */}
        <div 
          onClick={() => setShowUserDropdown(!showUserDropdown)}
          className="flex items-center space-x-3 p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition"
        >
          <div className={`h-8 w-8 rounded-full border flex items-center justify-center text-xs font-bold ${
            currentUser.roleCategory === 'Maker'
              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
              : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
          }`}>
            {currentUser.initials}
          </div>
          <div className="overflow-hidden flex-1">
            <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
            <p className="text-[10px] text-slate-400 truncate">{currentUser.roleTitle}</p>
          </div>
        </div>

        {/* Dropdown Switcher */}
        {showUserDropdown && (
          <div className="absolute bottom-20 left-4 right-4 bg-slate-900 border border-slate-800 rounded-xl p-2 shadow-2xl z-30 space-y-1.5 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Select Demo User
            </div>
            {allUsers.map((user) => {
              const isSelected = user.id === currentUser.id;
              return (
                <button
                  key={user.id}
                  onClick={() => {
                    switchUser(user.id as 'analyst' | 'manager');
                    setShowUserDropdown(false);
                  }}
                  className={`w-full text-left p-2 rounded-lg text-xs transition flex items-center space-x-2.5 ${
                    isSelected
                      ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {user.initials}
                  </div>
                  <div className="overflow-hidden flex-1">
                    <div className="flex items-center justify-between">
                      <span className="truncate">{user.name}</span>
                      <span className={`text-[9px] px-1 rounded font-mono ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {user.roleCategory}
                      </span>
                    </div>
                    <p className={`text-[10px] truncate ${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>
                      {user.roleTitle}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
};
