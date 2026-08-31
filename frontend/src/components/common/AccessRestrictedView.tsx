import React from 'react';
import { ShieldAlert, ArrowLeft, ArrowLeftRight } from 'lucide-react';
import { useUser } from '../../context/UserContext';
import type { NavTab } from '../../types';

interface AccessRestrictedViewProps {
  attemptedTab: NavTab;
  onGoHome: () => void;
}

export const AccessRestrictedView: React.FC<AccessRestrictedViewProps> = ({
  attemptedTab,
  onGoHome
}) => {
  const { currentUser, switchUser } = useUser();

  const requiredRole = attemptedTab === 'upload' 
    ? 'Operations Analyst (Maker)' 
    : 'Reconciliation Manager (Checker)';

  const targetUserKey = attemptedTab === 'upload' ? 'analyst' : 'manager';

  return (
    <div className="max-w-2xl mx-auto py-16 px-4 text-center space-y-6 animate-in fade-in duration-150">
      <div className="inline-flex p-4 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-2 shadow-lg shadow-amber-500/5">
        <ShieldAlert className="h-10 w-10" />
      </div>

      <div className="space-y-2">
        <h3 className="text-xl font-bold text-white tracking-tight">Access Restricted (RBAC)</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
          The <strong>{attemptedTab.toUpperCase()}</strong> section requires <strong>{requiredRole}</strong> permissions under the maker-checker financial security policy.
        </p>
      </div>

      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 max-w-md mx-auto space-y-2">
        <p className="text-[11px] text-slate-400">Current Active Identity:</p>
        <p className="font-bold text-white font-mono">{currentUser.name} ({currentUser.roleTitle})</p>
      </div>

      <div className="flex items-center justify-center space-x-3 pt-2">
        <button
          onClick={onGoHome}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Return to Dashboard</span>
        </button>

        <button
          onClick={() => switchUser(targetUserKey)}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm"
        >
          <ArrowLeftRight className="h-3.5 w-3.5" />
          <span>Switch to {requiredRole.split(' ')[0]}</span>
        </button>
      </div>
    </div>
  );
};
