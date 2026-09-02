import React, { useState } from 'react';
import {
  Layers,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Database,
  Check,
  X,
  Users
} from 'lucide-react';
import type { DashboardStats, BatchEvaluationSummary } from '../../types';
import { evaluateRunGuardrails } from '../../services/api';
import { METRIC_LABELS, NAV_LABELS } from '../../constants/metrics';

interface ReconciliationViewProps {
  stats: DashboardStats | null;
  onNavigate: (tab: any) => void;
  onRefresh: () => void;
}

const AI_INVESTIGATION_STEPS = [
  'Investigating exceptions',
  'Gathering relevant evidence',
  'Analyzing AI recommendations',
  'Checking guardrail rules'
];

export const ReconciliationView: React.FC<ReconciliationViewProps> = ({
  stats,
  onNavigate,
  onRefresh
}) => {
  const [evaluating, setEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<BatchEvaluationSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [modalState, setModalState] = useState<'hidden' | 'in_progress' | 'completed'>('hidden');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progressPct, setProgressPct] = useState(15);

  // --- [DEV ONLY: DEMO MODE STATE] ---
  // When ON, temporarily bypasses the completed-state lock on the action button for repeated demo testing
  const [demoMode, setDemoMode] = useState(false);
  // --- [END DEV ONLY: DEMO MODE STATE] ---

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // Determine if AI investigation has already been completed on the current batch (persisted in DB)
  const isAICompleted = !demoMode && (
    Boolean(evalResult) || Boolean(
      stats && stats.exceptions_count > 0 && (stats.auto_resolved_count + stats.human_review_count) > 0
    )
  );

  const handleRunBatchAI = async () => {
    if (!stats?.latest_run_id) return;
    setEvaluating(true);
    setError(null);
    setModalState('in_progress');
    setCurrentStepIndex(0);
    setProgressPct(15);

    try {
      // Start real backend evaluation request
      const apiPromise = evaluateRunGuardrails(stats.latest_run_id);

      // Step 0: Investigating exceptions
      await delay(950);
      setCurrentStepIndex(1);
      setProgressPct(40);

      // Step 1: Gathering relevant evidence
      await delay(950);
      setCurrentStepIndex(2);
      setProgressPct(68);

      // Step 2: Analyzing AI recommendations
      await delay(950);
      setCurrentStepIndex(3);
      setProgressPct(90);

      // Step 3: Checking guardrail rules & await backend completion
      const [res] = await Promise.all([
        apiPromise,
        delay(1000) // Minimum display time for step 3
      ]);

      // Step 4: Progress reaches 100%
      setCurrentStepIndex(4);
      setProgressPct(100);
      await delay(450);

      // Smoothly transition same modal into completion state
      setEvalResult(res);
      setModalState('completed');
      onRefresh();
    } catch (err: any) {
      setModalState('hidden');
      setError(err.message || 'Batch AI evaluation failed');
    } finally {
      setEvaluating(false);
    }
  };

  if (!stats || !stats.has_data) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl text-center py-16 p-6 shadow-sm">
        <Layers className="h-10 w-10 text-slate-400 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900">No Reconciliation Results</h3>
        <p className="text-xs text-slate-500 mt-1 mb-5">Please upload a financial dataset and trigger reconciliation to view results.</p>
        <button
          onClick={() => onNavigate('upload')}
          className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm cursor-pointer"
        >
          Go to Upload
        </button>
      </div>
    );
  }

  const formatTimestamp = (dateStr?: string) => {
    if (!dateStr) return 'Just now';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'Recently';
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return 'Recently';
    }
  };

  const breakdownItems = [
    { label: 'Amount Mismatch', count: stats.breakdown['AMOUNT_MISMATCH'] || 0, color: 'bg-amber-500' },
    { label: 'Missing Settlement', count: stats.breakdown['MISSING_SETTLEMENT'] || 0, color: 'bg-rose-500' },
    { label: 'Duplicate Settlement', count: stats.breakdown['DUPLICATE'] || 0, color: 'bg-orange-500' },
    { label: 'Reference Mismatch', count: stats.breakdown['REFERENCE_MISMATCH'] || 0, color: 'bg-sky-500' },
    { label: 'Unknown', count: stats.breakdown['UNKNOWN'] || 0, color: 'bg-purple-500' }
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 1. Compact Results Summary Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:px-6 sm:py-4 shadow-sm">
        {/* Header */}
        <div className="pb-3 border-b border-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Results Summary</h3>
        </div>

        {/* 2-Column Compact Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-3">
          {/* Left Column: Run Metadata */}
          <div className="space-y-3">
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Batch ID
              </span>
              <div className="relative group inline-block max-w-[240px] mt-0.5">
                <p className="text-xs font-mono font-bold text-blue-600 truncate cursor-pointer hover:text-blue-700 transition">
                  {stats.latest_run_id}
                </p>
                {/* Hover Tooltip revealing complete ID */}
                <div className="absolute left-0 top-full mt-1.5 hidden group-hover:flex items-center z-30 bg-slate-900 text-slate-100 px-3 py-1.5 rounded-lg shadow-xl border border-slate-700 text-[11px] font-mono whitespace-nowrap animate-in fade-in duration-150 pointer-events-none select-all">
                  <span>{stats.latest_run_id}</span>
                </div>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Completed On
              </span>
              <p className="text-xs font-medium text-slate-700 mt-0.5">
                {formatTimestamp(stats.completed_at || stats.started_at)}
              </p>
            </div>
          </div>

          {/* Right Column: 3 Summarized Reconciliation Metrics */}
          <div className="space-y-1.5 justify-center flex flex-col pl-0 md:pl-6 md:border-l md:border-slate-100">
            {/* 1. Payments Processed */}
            <div className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-slate-50/70 transition">
              <div className="flex items-center space-x-2.5">
                <div className="h-6 w-6 rounded-md bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                  <Database className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-semibold text-slate-700">{METRIC_LABELS.PAYMENTS_PROCESSED}</span>
              </div>
              <span className="text-sm font-bold text-slate-900 font-mono">
                {stats.total_processed}
              </span>
            </div>

            {/* 2. Successfully Matched */}
            <div className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-slate-50/70 transition">
              <div className="flex items-center space-x-2.5">
                <div className="h-6 w-6 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                  <Check className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-semibold text-slate-700">{METRIC_LABELS.SUCCESSFULLY_MATCHED}</span>
              </div>
              <span className="text-sm font-bold text-slate-900 font-mono">
                {stats.matched_count}
              </span>
            </div>

            {/* 3. Exceptions */}
            <div className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-slate-50/70 transition">
              <div className="flex items-center space-x-2.5">
                <div className="h-6 w-6 rounded-md bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-semibold text-slate-700">{METRIC_LABELS.EXCEPTIONS}</span>
              </div>
              <span className="text-sm font-bold text-slate-900 font-mono">
                {stats.exceptions_count}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Primary Focus: Exception Distribution Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 shadow-sm">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Exception Distribution</h3>
          </div>
          <button
            onClick={() => onNavigate('exceptions')}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center space-x-1 cursor-pointer"
          >
            <span>View Exception Table</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="space-y-4">
          {breakdownItems.map((item) => {
            const rawPct = stats.exceptions_count > 0 
              ? (item.count / stats.exceptions_count) * 100 
              : 0;
            const pctText = rawPct % 1 === 0 ? `${rawPct.toFixed(0)}%` : `${rawPct.toFixed(1)}%`;

            return (
              <div key={item.label} className="flex items-center gap-4 text-xs">
                {/* Category Label */}
                <span className="w-44 font-semibold text-slate-700 shrink-0 truncate">
                  {item.label}
                </span>

                {/* Horizontal Bar Chart Lane */}
                <div className="flex-1 h-7 bg-slate-50 border border-slate-200/70 rounded-[4px] overflow-hidden flex items-center p-0.5">
                  <div
                    className={`h-full rounded-[3px] ${item.color} transition-all duration-500 min-w-[3px]`}
                    style={{ width: `${rawPct}%` }}
                  />
                </div>

                {/* Values (Items & Dynamic Percentage) */}
                <div className="w-32 text-right font-mono text-xs shrink-0">
                  <span className="text-slate-400 font-medium">{item.count} items </span>
                  <span className="font-bold text-slate-900">({pctText})</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Chart Scale / Axis Guide */}
        <div className="flex items-center gap-4 text-[10px] font-mono text-slate-400 pt-4 mt-2 border-t border-slate-100">
          <span className="w-44 shrink-0" />
          <div className="flex-1 flex justify-between px-0.5">
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>
          <span className="w-32 shrink-0" />
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
          {error}
        </div>
      )}

      {/* 3. Centered Next Action: Run AI Investigation (or Completed State) */}
      <div className="flex flex-col items-center justify-center pt-2 pb-6 space-y-3">
        {isAICompleted ? (
          <button
            disabled
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-xs cursor-default select-none transition"
          >
            <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[2.5]" />
            <span>AI Investigation Completed</span>
          </button>
        ) : (
          <button
            onClick={handleRunBatchAI}
            disabled={evaluating}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition shadow-sm shadow-blue-600/20 cursor-pointer"
          >
            {evaluating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Investigating...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5 text-blue-200" />
                <span>Run AI Investigation</span>
              </>
            )}
          </button>
        )}

        {/* --- [DEV ONLY: DEMO MODE TOGGLE] - Can be deleted when no longer needed --- */}
        <div className="flex items-center space-x-2 pt-0.5">
          <button
            onClick={() => setDemoMode(!demoMode)}
            className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border transition cursor-pointer select-none ${
              demoMode
                ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-xs'
                : 'bg-slate-50 text-slate-400 border-slate-200/80 hover:text-slate-600 hover:bg-slate-100'
            }`}
            title="Toggle Demo Mode to allow re-running AI Investigation on processed batches"
          >
            <span className={`h-1.5 w-1.5 rounded-full ${demoMode ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'}`} />
            <span>Demo Mode: <strong>{demoMode ? 'ON (Re-run Enabled)' : 'OFF'}</strong></span>
          </button>
        </div>
        {/* --- [END DEV ONLY: DEMO MODE TOGGLE] --- */}
      </div>

      {/* AI Investigation Modal (In-Progress or Completed) */}
      {modalState !== 'hidden' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="bg-white border border-slate-200/90 rounded-2xl w-full max-w-lg p-7 sm:p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top-Right Close Button (visible in completed state) */}
            {modalState === 'completed' && (
              <button
                onClick={() => setModalState('hidden')}
                className="absolute top-6 right-6 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            )}

            {modalState === 'in_progress' ? (
              <>
                {/* In-Progress Header */}
                <div className="text-center space-y-1">
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                    AI Investigation Underway
                  </h3>
                  <p className="text-xs font-medium text-slate-500">
                    Reviewing {stats.exceptions_count} exceptions
                  </p>
                </div>

                {/* 4 Steps Vertical List with Active Step Highlight */}
                <div className="space-y-2 bg-slate-50/80 border border-slate-200/70 rounded-xl p-4">
                  {AI_INVESTIGATION_STEPS.map((stepLabel, idx) => {
                    const isCompleted = idx < currentStepIndex;
                    const isCurrent = idx === currentStepIndex;

                    return (
                      <div
                        key={stepLabel}
                        className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl transition-all duration-300 ${
                          isCurrent
                            ? 'bg-blue-50/90 border border-blue-200/90 shadow-sm'
                            : isCompleted
                            ? 'bg-white/60 border border-transparent'
                            : 'border border-transparent'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                        ) : isCurrent ? (
                          <Loader2 className="h-4.5 w-4.5 text-blue-600 animate-spin shrink-0" />
                        ) : (
                          <div className="h-4.5 w-4.5 rounded-full border-2 border-slate-200 shrink-0 bg-white" />
                        )}

                        <span
                          className={`text-xs transition-colors ${
                            isCompleted
                              ? 'text-slate-800 font-semibold'
                              : isCurrent
                              ? 'text-blue-700 font-bold'
                              : 'text-slate-400 font-medium'
                          }`}
                        >
                          {stepLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Noticeably Thicker Progress Bar Alone (No Text, No Percentage) */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/80 shadow-inner">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-700 ease-out shadow-sm"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              </>
            ) : evalResult ? (
              <>
                {/* Completed State Header */}
                <div className="text-center space-y-1">
                  <div className="h-12 w-12 rounded-2xl bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center mx-auto mb-3 shadow-sm">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                    AI Investigation Complete
                  </h3>
                  <p className="text-xs font-medium text-slate-500">
                    {evalResult.total_exceptions || stats.exceptions_count} exceptions analyzed
                  </p>
                </div>

                {/* Result Summary Breakdown */}
                <div className="space-y-3 bg-slate-50/80 border border-slate-200/70 rounded-xl p-4 sm:p-5">
                  <div className="flex items-center justify-between py-1">
                    <div className="flex items-center space-x-2.5">
                      <div className="h-7 w-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-semibold text-slate-700">Auto-resolved</span>
                    </div>
                    <span className="text-base font-bold font-mono text-emerald-700">
                      {evalResult.auto_resolved_count}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-t border-slate-200/60 pt-3">
                    <div className="flex items-center space-x-2.5">
                      <div className="h-7 w-7 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                        <Users className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-semibold text-slate-700">Need human review</span>
                    </div>
                    <span className="text-base font-bold font-mono text-rose-600">
                      {evalResult.human_review_count}
                    </span>
                  </div>
                </div>

                {/* Primary Action Button */}
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setModalState('hidden');
                      onNavigate('review');
                    }}
                    className="w-full py-3 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm cursor-pointer flex items-center justify-center space-x-2"
                  >
                    <span>Open {NAV_LABELS.REVIEW_QUEUE}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

