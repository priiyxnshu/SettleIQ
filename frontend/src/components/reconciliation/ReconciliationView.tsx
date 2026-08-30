import React, { useState } from 'react';
import {
  Layers,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Clock
} from 'lucide-react';
import type { DashboardStats, BatchEvaluationSummary } from '../../types';
import { evaluateRunGuardrails } from '../../services/api';
import { StatCard } from '../common/StatCard';

interface ReconciliationViewProps {
  stats: DashboardStats | null;
  onNavigate: (tab: any) => void;
  onRefresh: () => void;
}

export const ReconciliationView: React.FC<ReconciliationViewProps> = ({
  stats,
  onNavigate,
  onRefresh
}) => {
  const [evaluating, setEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<BatchEvaluationSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunBatchAI = async () => {
    if (!stats?.latest_run_id) return;
    setEvaluating(true);
    setError(null);
    try {
      const res = await evaluateRunGuardrails(stats.latest_run_id);
      setEvalResult(res);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Batch AI evaluation failed');
    } finally {
      setEvaluating(false);
    }
  };

  if (!stats || !stats.has_data) {
    return (
      <div className="text-center py-16">
        <Layers className="h-10 w-10 text-slate-600 mx-auto mb-3" />
        <h3 className="text-base font-bold text-white">No Reconciliation Results</h3>
        <p className="text-xs text-slate-400 mt-1 mb-4">Please upload a financial dataset and trigger reconciliation.</p>
        <button
          onClick={() => onNavigate('upload')}
          className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition"
        >
          Go to Upload
        </button>
      </div>
    );
  }

  const breakdownItems = [
    { label: 'Amount Mismatch', count: stats.breakdown['AMOUNT_MISMATCH'] || 0, color: 'bg-amber-500', text: 'text-amber-400' },
    { label: 'Missing Settlement', count: stats.breakdown['MISSING_SETTLEMENT'] || 0, color: 'bg-rose-500', text: 'text-rose-400' },
    { label: 'Duplicate Settlement', count: stats.breakdown['DUPLICATE'] || 0, color: 'bg-orange-500', text: 'text-orange-400' },
    { label: 'Reference Mismatch', count: stats.breakdown['REFERENCE_MISMATCH'] || 0, color: 'bg-sky-500', text: 'text-sky-400' },
    { label: 'Unknown Anomaly', count: stats.breakdown['UNKNOWN'] || 0, color: 'bg-purple-500', text: 'text-purple-400' }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Reconciliation Run</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {stats.run_status || 'COMPLETED'}
            </span>
          </div>
          <h2 className="text-xl font-bold font-mono text-white">{stats.latest_run_id}</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Total {stats.total_processed} payment transactions reconciled deterministically against processor batches.
          </p>
        </div>

        {/* Action Button: Batch AI & Guardrails */}
        <button
          onClick={handleRunBatchAI}
          disabled={evaluating}
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition shadow-lg shadow-indigo-600/20"
        >
          {evaluating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Evaluating Guardrails...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 text-indigo-300" />
              <span>Run AI Investigation & Guardrails</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
          {error}
        </div>
      )}

      {evalResult && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>
              Batch Evaluation Complete: <strong>{evalResult.auto_resolved_count}</strong> auto-resolved by guardrails, <strong>{evalResult.human_review_count}</strong> routed to operator review queue.
            </span>
          </div>
          <button
            onClick={() => onNavigate('review')}
            className="px-3 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-semibold transition"
          >
            Open Review Queue
          </button>
        </div>
      )}

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Records"
          value={stats.total_processed}
          subtext="Payments ingested"
          icon={Layers}
        />
        <StatCard
          label="Matched Cleanly"
          value={stats.matched_count}
          subtext={`${stats.match_rate}% deterministic parity`}
          icon={CheckCircle2}
          badge={{ text: `${stats.match_rate}%`, variant: 'success' }}
        />
        <StatCard
          label="Exceptions Found"
          value={stats.exceptions_count}
          subtext="Flagged for investigation"
          icon={AlertTriangle}
          badge={{ text: 'Actionable', variant: 'warning' }}
        />
        <StatCard
          label="In Human Review"
          value={stats.human_review_count}
          subtext="Operator review queue"
          icon={Clock}
          badge={{ text: `${stats.human_review_count} cases`, variant: 'info' }}
        />
      </div>

      {/* Canonical Exceptions Distribution */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white">Canonical Exceptions Distribution</h3>
            <p className="text-xs text-slate-400 mt-0.5">Categorization based on strict deterministic precedence rules</p>
          </div>
          <button
            onClick={() => onNavigate('exceptions')}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
          >
            <span>View Exception Table</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="space-y-4">
          {breakdownItems.map((item) => {
            const percentage = stats.exceptions_count > 0 
              ? Math.round((item.count / stats.exceptions_count) * 100) 
              : 0;

            return (
              <div key={item.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-semibold ${item.text}`}>{item.label}</span>
                  <div className="space-x-2 font-mono">
                    <span className="text-slate-400">{item.count} items</span>
                    <span className="font-bold text-white">({percentage}%)</span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                  <div
                    className={`h-full rounded-full ${item.color} transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
