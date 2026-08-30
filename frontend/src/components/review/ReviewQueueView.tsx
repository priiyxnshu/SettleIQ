import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  CheckCircle2,
  XCircle,
  MessageSquare,
  RefreshCw,
  Loader2,
  ChevronRight
} from 'lucide-react';
import type { ExceptionListItem, ExceptionDetailResponse } from '../../types';
import { getExceptions, getExceptionDetail, submitHumanReview } from '../../services/api';
import { ExceptionTypeBadge } from '../common/Badge';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';

interface ReviewQueueViewProps {
  onRefreshParent: () => void;
  onSelectException: (id: string) => void;
}

export const ReviewQueueView: React.FC<ReviewQueueViewProps> = ({
  onRefreshParent,
  onSelectException
}) => {
  const [queueItems, setQueueItems] = useState<ExceptionListItem[]>([]);
  const [selectedExcId, setSelectedExcId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<ExceptionDetailResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [reviewNotes, setReviewNotes] = useState('');
  const [operatorName, setOperatorName] = useState('Finance Operator');
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);

  const fetchQueue = async () => {
    setLoading(true);
    setActionErrorMessage(null);
    try {
      const res = await getExceptions({ status: 'HUMAN_REVIEW', limit: 100 });
      setQueueItems(res.items);
      if (res.items.length > 0) {
        if (!selectedExcId || !res.items.some(i => i.id === selectedExcId)) {
          setSelectedExcId(res.items[0].id);
        }
      } else {
        setSelectedExcId(null);
        setSelectedDetail(null);
      }
    } catch (err: any) {
      setActionErrorMessage(err.message || 'Failed to load review queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  useEffect(() => {
    if (!selectedExcId) return;

    const loadDetail = async () => {
      setDetailLoading(true);
      setActionErrorMessage(null);
      setActionSuccessMessage(null);
      try {
        const det = await getExceptionDetail(selectedExcId);
        setSelectedDetail(det);
      } catch (err: any) {
        setActionErrorMessage(err.message || 'Failed to load item detail');
      } finally {
        setDetailLoading(false);
      }
    };

    loadDetail();
  }, [selectedExcId]);

  const handleReviewAction = async (action: 'APPROVE' | 'REJECT' | 'KEEP_UNRESOLVED') => {
    if (!selectedExcId) return;
    setSubmitting(true);
    setActionErrorMessage(null);
    setActionSuccessMessage(null);
    try {
      const res = await submitHumanReview(selectedExcId, {
        action,
        notes: reviewNotes.trim() || undefined,
        reviewed_by: operatorName
      });

      const actionLabels = {
        APPROVE: 'Approved and resolved exception',
        REJECT: 'Rejected recommendation and retained in review',
        KEEP_UNRESOLVED: 'Saved deferred notes'
      };

      setActionSuccessMessage(`${actionLabels[action]} (Decision: ${res.decision_outcome})`);
      setReviewNotes('');
      onRefreshParent();
      fetchQueue();
    } catch (err: any) {
      setActionErrorMessage(err.message || 'Review action failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-bold text-white tracking-tight">Human Review Queue</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-mono">
              {queueItems.length} Pending
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Review uncertain or flagged exceptions routed by the Guardrail Engine.
          </p>
        </div>

        <button
          onClick={fetchQueue}
          className="flex items-center space-x-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {actionSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center space-x-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {actionErrorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2">
          <XCircle className="h-4 w-4 shrink-0" />
          <span>{actionErrorMessage}</span>
        </div>
      )}

      {loading ? (
        <LoadingSpinner message="Fetching operator review queue..." />
      ) : queueItems.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="Review Queue is Empty"
          description="All exceptions have either been deterministically resolved or handled by operators."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Queue List */}
          <div className="lg:col-span-4 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-sm divide-y divide-slate-800/60 max-h-[700px] overflow-y-auto">
            {queueItems.map((item) => {
              const isSelected = selectedExcId === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedExcId(item.id)}
                  className={`w-full text-left p-4 transition flex items-center justify-between ${
                    isSelected
                      ? 'bg-indigo-600/15 border-l-4 border-indigo-500'
                      : 'hover:bg-slate-900/40'
                  }`}
                >
                  <div className="space-y-1 overflow-hidden pr-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-bold text-white truncate">{item.id}</span>
                      <ExceptionTypeBadge type={item.exception_type} />
                    </div>
                    <p className="text-xs text-slate-400 font-mono truncate">
                      Ref: {item.source_reference || 'N/A'} • ₹{item.payment_amount ? item.payment_amount.toFixed(2) : '--'}
                    </p>
                  </div>
                  <ChevronRight className={`h-4 w-4 text-slate-500 ${isSelected ? 'text-indigo-400' : ''}`} />
                </button>
              );
            })}
          </div>

          {/* Right: Inspection & Decision Workspace */}
          <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
            {detailLoading || !selectedDetail ? (
              <LoadingSpinner message="Loading exception review workspace..." />
            ) : (
              <>
                {/* Workspace Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reviewing Case</span>
                    <h3 className="text-lg font-bold font-mono text-white mt-0.5">{selectedDetail.id}</h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    <ExceptionTypeBadge type={selectedDetail.exception_type} />
                    <button
                      onClick={() => onSelectException(selectedDetail.id)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-medium underline underline-offset-2 ml-2"
                    >
                      Inspect Evidence Modal
                    </button>
                  </div>
                </div>

                {/* Financial Summary Box */}
                <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs">
                  <div>
                    <span className="text-slate-500 block">Payment Amount</span>
                    <span className="text-white font-bold text-sm">
                      ₹{selectedDetail.payment ? selectedDetail.payment.payment_amount.toFixed(2) : '0.00'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Total Settled</span>
                    <span className="text-white font-bold text-sm">
                      ₹{selectedDetail.settlements.reduce((sum, s) => sum + s.settlement_amount, 0).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Total Fees</span>
                    <span className="text-white font-bold text-sm">
                      ₹{selectedDetail.fees.reduce((sum, f) => sum + f.fee_amount, 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Guardrail Context & AI Note */}
                {selectedDetail.decision && (
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-1.5">
                    <span className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">Guardrail Routing Rationale</span>
                    <p className="text-slate-300 font-mono">{selectedDetail.decision.reason}</p>
                  </div>
                )}

                {/* Operator Actions Form */}
                <div className="space-y-4 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                      <MessageSquare className="h-3.5 w-3.5 text-indigo-400" />
                      <span>Operator Review Notes (Optional)</span>
                    </label>
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="text-slate-500">Operator:</span>
                      <input
                        type="text"
                        value={operatorName}
                        onChange={(e) => setOperatorName(e.target.value)}
                        className="bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <textarea
                    rows={3}
                    placeholder="Enter resolution notes, justification, or escalation reason..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-800 rounded-lg p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />

                  {/* 3 Explicit Action Buttons */}
                  <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                    <button
                      onClick={() => handleReviewAction('KEEP_UNRESOLVED')}
                      disabled={submitting}
                      className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition"
                    >
                      Keep Unresolved
                    </button>
                    <button
                      onClick={() => handleReviewAction('REJECT')}
                      disabled={submitting}
                      className="px-4 py-2 rounded-lg text-xs font-semibold bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 transition"
                    >
                      Reject Resolution
                    </button>
                    <button
                      onClick={() => handleReviewAction('APPROVE')}
                      disabled={submitting}
                      className="inline-flex items-center space-x-1.5 px-5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm"
                    >
                      {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      <span>Approve Resolution</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
