import React from 'react';
import {
  FileCheck2,
  AlertOctagon,
  Clock,
  Layers,
  Percent,
  Cpu,
  ArrowRight,
  UploadCloud
} from 'lucide-react';
import type { DashboardStats, ExceptionListItem } from '../../types';
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
  if (!stats || !stats.has_data) {
    return (
      <div className="space-y-6">
        <EmptyState
          icon={UploadCloud}
          title="No Reconciliation Data Found"
          description="Upload payment, settlement, and fee batches to start deterministic reconciliation and AI-assisted exception resolution."
          actionText="Upload Initial Batch"
          onAction={() => onNavigate('upload')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* 6 Key Operational Metric Cards */}
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
          badge={{ text: 'Action Needed', variant: 'warning' }}
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
          <button
            onClick={() => onNavigate('reconciliation')}
            className="inline-flex items-center space-x-2 text-xs font-semibold px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 transition"
          >
            <span>View Full Run</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onNavigate('upload')}
            className="inline-flex items-center space-x-2 text-xs font-semibold px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm"
          >
            <UploadCloud className="h-3.5 w-3.5" />
            <span>Upload New Batch</span>
          </button>
        </div>
      </div>

      {/* Recent Exceptions Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Recent Exceptions</h3>
            <p className="text-xs text-slate-400 mt-0.5">Latest financial discrepancies requiring attention or verification</p>
          </div>
          <button
            onClick={() => onNavigate('exceptions')}
            className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
          >
            <span>View All ({stats.exceptions_count})</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
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
                <th className="py-3 px-6 text-right">Action</th>
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
                      <button
                        onClick={() => onSelectException(exc.id)}
                        className="px-2.5 py-1 rounded text-xs font-medium text-indigo-400 hover:text-white hover:bg-indigo-600/20 border border-indigo-500/30 transition"
                      >
                        Inspect
                      </button>
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
