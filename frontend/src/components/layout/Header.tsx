import React from 'react';
import { RefreshCw, Activity, ArrowLeftRight } from 'lucide-react';
import type { HealthStatus } from '../../types';
import { useUser } from '../../context/UserContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
  health: HealthStatus | null;
  loading: boolean;
  onRefresh: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  health,
  loading,
  onRefresh
}) => {
  const { currentUser, switchUser } = useUser();

  const toggleUser = () => {
    const nextUser = currentUser.id === 'analyst' ? 'manager' : 'analyst';
    switchUser(nextUser);
  };

  return (
    <header className="h-16 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-8 flex items-center justify-between sticky top-0 z-20">
      <div>
        <h2 className="text-base font-bold text-white tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>

      <div className="flex items-center space-x-3">
        {/* Active Role & Quick Switcher Pill */}
        <button
          onClick={toggleUser}
          title="Click to toggle between Operations Analyst and Reconciliation Manager"
          className="flex items-center space-x-2 text-xs bg-slate-900 hover:bg-slate-850 px-3 py-1.5 rounded-lg border border-slate-800 transition group"
        >
          <div className={`h-2 w-2 rounded-full ${
            currentUser.roleCategory === 'Maker' ? 'bg-amber-400' : 'bg-indigo-400'
          }`} />
          <span className="text-slate-300 font-medium">
            <strong className="text-white">{currentUser.name}</strong> ({currentUser.roleTitle})
          </span>
          <span className="text-[10px] text-indigo-400 group-hover:text-indigo-300 font-mono font-semibold ml-1 flex items-center space-x-0.5">
            <ArrowLeftRight className="h-2.5 w-2.5" />
            <span>Switch</span>
          </span>
        </button>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center space-x-1.5 text-xs text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-800 transition disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          <span>Refresh</span>
        </button>

        {/* Backend Status */}
        <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
          <Activity className="h-3.5 w-3.5 text-indigo-400" />
          <div className={`h-2 w-2 rounded-full ${health?.status === 'healthy' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
          <span className="text-xs font-medium text-slate-300">
            {health?.status === 'healthy' ? 'API Online' : 'Offline'}
          </span>
        </div>
      </div>
    </header>
  );
};
