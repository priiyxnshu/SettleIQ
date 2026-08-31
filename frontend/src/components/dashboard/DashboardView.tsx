import React from 'react';
import {
  FileCheck2,
  AlertOctagon,
  Clock,
  Layers,
  Percent,
  Cpu,
  ArrowRight,
  UploadCloud,
  UserCheck
} from 'lucide-react';
import type { DashboardStats, ExceptionListItem } from '../../types';
import { useUser } from '../../context/UserContext';
import { StatCard } from '../common/StatCard';
import { ExceptionTypeBadge, StatusBadge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';

interface DashboardViewProps {
  stats: DashboardStats | null;
  loading?: boolean;
  onNavigate: (tab: any) => void;
  onSelectException: (id: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  onNavigate,
  onSelectException
}) => {
  const { currentUser } = useUser();

  if (!currentUser) return null;

  const isAnalyst = currentUser.role === 'OPERATIONS_ANALYST';
  const isManager = currentUser.role === 'RECONCILIATION_MANAGER';

  if (!stats || !stats.has_data) {
    return (
      <div className="space-y-6">
        <EmptyState
          icon={UploadCloud}
          title="No Reconciliation Data Found"
          description={
            isAnalyst
              ? "Upload payment, settlement, and fee batches to start deterministic reconciliation."
              : "No active reconciliation run found. Waiting for Operations Analyst to upload and initiate batch."
          }
          actionText={isAnalyst ? "Upload Initial Batch" : undefined}
          onAction={isAnalyst ? () => onNavigate('upload') : undefined}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Role Context Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${
            isAnalyst ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
          }`}>
            <UserCheck className="h-4 w-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-white">
              {currentUser.name} ({currentUser.roleTitle})
            </span>
            <p className="text-[11px] text-slate-400">
              {isAnalyst 
                ? "Maker Workspace: Ingest files, validate schemas, and trigger reconciliation."
                : "Checker Workspace: Review reconciliation outcomes, investigate exceptions, and approve resolutions."}
            </p>
          </div>
        </div>

        <span className={`text-xs px-2.5 py-1 rounded-full font-mono font-bold border ${
          isAnalyst 
            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
        }`}>
          Role: {currentUser.roleCategory}
        </span>
      </div>

      {/* Operational Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          label="Total Processed"
          value={stats.total_processed}
          subtext="Payment transactions"
          icon={Layers}
        />
        <StatCard
          label="Matched"
          value={stats.matched_count}
          subtext={`${stats.match_rate}% accuracy`}
          icon={FileCheck2}
          badge={{ text: `${stats.match_rate}%`, variant: 'success' }}
        />
        <StatCard
          label="Exceptions"
          value={stats.exceptions_count}
          subtext="Discrepancies flagged"
          icon={AlertOctagon}
          badge={{ text: isManager ? 'Review Needed' : 'Flagged', variant: 'warning' }}
        />
        <StatCard
          label="Auto-Resolved"
          value={stats.auto_resolved_count}
          subtext="By Guardrails & Ops"
          icon={Cpu}
          badge={{ text: `${stats.auto_resolution_rate}%`, variant: 'info' }}
        />
        <StatCard
          label="Review Queue"
          value={stats.human_review_count}
          subtext="Pending operator review"
          icon={Clock}
          badge={{ text: 'Active', variant: stats.human_review_count > 0 ? 'warning' : 'neutral' }}
        />
        <StatCard
          label="Match Rate"
          value={`${stats.match_rate}%`}
          subtext="Automated parity"
          icon={Percent}
        />
      </div>

      {/* Latest Run Banner */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Reconciliation Batch</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {stats.run_status || 'COMPLETED'}
            </span>
          </div>
          <p className="text-base font-mono font-bold text-white tracking-tight">{stats.latest_run_id}</p>
          <p className="text-xs text-slate-400">
            Completed on {stats.completed_at ? new Date(stats.completed_at).toLocaleString() : 'N/A'}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Operations Analyst sees Upload CTA */}
          {isAnalyst && (
            <button
              onClick={() => onNavigate('upload')}
              className="inline-flex items-center space-x-2 text-xs font-semibold px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm"
            >
              <UploadCloud className="h-3.5 w-3.5" />
              <span>Upload Next Batch</span>
            </button>
          )}

          {/* Reconciliation Manager sees View Full Run CTA */}
          {isManager && (
            <button
              onClick={() => onNavigate('reconciliation')}
              className="inline-flex items-center space-x-2 text-xs font-semibold px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 transition"
            >
              <span>View Full Run Breakdown</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Recent Exceptions Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Recent Exceptions Activity</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {isManager 
                ? "Flagged financial discrepancies ready for investigation and guardrail review"
                : "Operational summary of discrepancies flagged during reconciliation"}
            </p>
          </div>
          {isManager && (
            <button
              onClick={() => onNavigate('exceptions')}
              className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
            >
              <span>View All ({stats.exceptions_count})</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/60 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-6">Exception ID</th>
                <th className="py-3 px-6">Type</th>
                <th className="py-3 px-6">Payment Reference</th>
                <th className="py-3 px-6 text-right">Amount</th>
                <th className="py-3 px-6 text-center">Status</th>
                <th className="py-3 px-6 text-right">{isManager ? 'Action' : 'Scope'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {stats.recent_exceptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">No exceptions in this batch. All records matched cleanly!</td>
                </tr>
              ) : (
                stats.recent_exceptions.map((exc: ExceptionListItem) => (
                  <tr key={exc.id} className="hover:bg-slate-900/30 transition">
                    <td className="py-3.5 px-6 font-mono font-medium text-white">{exc.id}</td>
                    <td className="py-3.5 px-6">
                      <ExceptionTypeBadge type={exc.exception_type} />
                    </td>
                    <td className="py-3.5 px-6 font-mono text-slate-400">{exc.source_reference || 'N/A'}</td>
                    <td className="py-3.5 px-6 text-right font-mono font-semibold text-white">
                      ₹{exc.payment_amount ? exc.payment_amount.toFixed(2) : '--'}
                    </td>
                    <td className="py-3.5 px-6 text-center">
                      <StatusBadge status={exc.status} />
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      {isManager ? (
                        <button
                          onClick={() => onSelectException(exc.id)}
                          className="px-2.5 py-1 rounded text-xs font-medium text-indigo-400 hover:text-white hover:bg-indigo-600/20 border border-indigo-500/30 transition"
                        >
                          Inspect
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">
                          Manager Review
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
