import React, { useState, useEffect, useRef } from 'react';
import {
  CheckSquare,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Loader2,
  ChevronRight,
  UserCheck,
  Info,
  AlertCircle
} from 'lucide-react';
import type { ExceptionListItem, ExceptionDetailResponse } from '../../types';
import { getExceptions, getExceptionDetail, submitHumanReview } from '../../services/api';
import { useUser } from '../../context/UserContext';
import { ExceptionTypeBadge } from '../common/Badge';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';

const formatCurrency = (val?: number | null): string => {
  const num = typeof val === 'number' ? val : 0;
  const isNegative = num < 0;
  const absFormatted = Math.abs(num).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `${isNegative ? '-' : ''}₹${absFormatted}`;
};

const getWhyNeedsReviewExplanation = (detail: ExceptionDetailResponse): string => {
  if (detail.decision && detail.decision.decided_by !== 'SYSTEM' && detail.decision.reason) {
    return detail.decision.reason;
  }

  const pAmt = detail.payment?.payment_amount ?? 0;
  const sList = detail.settlements || [];
  const fList = detail.fees || [];
  const sCount = sList.length;
  const totalSettled = sList.reduce((sum, s) => sum + s.settlement_amount, 0);
  const totalFees = fList.reduce((sum, f) => sum + f.fee_amount, 0);
  const netVariance = Math.round((pAmt - (totalSettled + totalFees)) * 100) / 100;
  const hasPendingSettlement = sList.some(s => s.settlement_status === 'PENDING');
  const hasNegativeFee = fList.some(f => f.fee_amount < 0);

  if (hasPendingSettlement && hasNegativeFee) {
    const negFee = fList.find(f => f.fee_amount < 0)?.fee_amount;
    return `Anomalous transaction conditions detected: settlement is still pending and includes an invalid negative fee (${formatCurrency(negFee)}), requiring operator investigation.`;
  }
  if (hasPendingSettlement) {
    return 'The processor settlement record is currently pending and funds have not cleared, requiring operator verification before resolution.';
  }
  if (hasNegativeFee) {
    const negFee = fList.find(f => f.fee_amount < 0)?.fee_amount;
    return `An invalid negative fee amount (${formatCurrency(negFee)}) was recorded by the gateway, requiring operator adjustment.`;
  }

  switch (detail.exception_type) {
    case 'MISSING_SETTLEMENT':
      return `No matching settlement record was received from the processor for this ${formatCurrency(pAmt)} payment, leaving the full amount unaccounted for.`;

    case 'DUPLICATE':
      return `${sCount} settlement records totaling ${formatCurrency(totalSettled)} were linked to this ${formatCurrency(pAmt)} payment, indicating potential duplicate processor payout.`;

    case 'AMOUNT_MISMATCH': {
      const absDiff = Math.abs(netVariance);
      if (absDiff > 0.01) {
        return `A net difference of ${formatCurrency(absDiff)} remains between the payment (${formatCurrency(pAmt)}) and settled funds (${formatCurrency(totalSettled)}) that is not explained by recorded fees (${formatCurrency(totalFees)}).`;
      }
      return `Settlement amount (${formatCurrency(totalSettled)}) differs from payment amount (${formatCurrency(pAmt)}) and requires operator sign-off.`;
    }

    case 'REFERENCE_MISMATCH':
      if (Math.abs(netVariance) > 0.01) {
        return `Alternate order reference was identified but carries an unresolved financial variance of ${formatCurrency(Math.abs(netVariance))}.`;
      }
      return 'The payment reference could not be automatically confirmed against processor reports and requires manual reference verification.';

    case 'UNKNOWN':
    default:
      if (Math.abs(netVariance) > 0.01) {
        return `Unreconciled variance of ${formatCurrency(Math.abs(netVariance))} with irregular transaction parameters requires manual inspection by the Manager.`;
      }
      return 'Transaction records contain irregular parameters that could not be deterministically resolved and require human review.';
  }
};

interface ReviewQueueViewProps {
  onRefreshParent: () => void;
  onSelectException: (id: string) => void;
  runId?: string;
}

export const ReviewQueueView: React.FC<ReviewQueueViewProps> = ({
  onRefreshParent,
  onSelectException,
  runId
}) => {
  const { currentUser } = useUser();
  const [queueItems, setQueueItems] = useState<ExceptionListItem[]>([]);
  const [selectedExcId, setSelectedExcId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<ExceptionDetailResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [reviewNotes, setReviewNotes] = useState('');
  const [operatorName, setOperatorName] = useState(currentUser?.name || 'Reconciliation Manager');
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);

  const [confirmAction, setConfirmAction] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(msg);
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (currentUser) {
      setOperatorName(currentUser.name);
    }
  }, [currentUser]);

  const fetchQueue = async () => {
    setLoading(true);
    setActionErrorMessage(null);
    try {
      const res = await getExceptions({
        reconciliation_run_id: runId,
        status: 'HUMAN_REVIEW',
        limit: 500
      });
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
  }, [runId]);

  useEffect(() => {
    if (!selectedExcId) {
      setSelectedDetail(null);
      return;
    }

    const loadDetail = async () => {
      setDetailLoading(true);
      try {
        const det = await getExceptionDetail(selectedExcId);
        setSelectedDetail(det);
      } catch (err: any) {
        setActionErrorMessage(err.message || 'Failed to load details');
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
    try {
      await submitHumanReview(selectedExcId, {
        action,
        notes: reviewNotes.trim() || undefined,
        reviewed_by: operatorName
      });

      const toastLabels = {
        APPROVE: 'Exception approved.',
        REJECT: 'Exception rejected.',
        KEEP_UNRESOLVED: 'Exception kept pending.'
      };

      showToast(toastLabels[action]);
      setReviewNotes('');
      onRefreshParent();
      await fetchQueue();
      if (action === 'KEEP_UNRESOLVED') {
        try {
          const updatedDetail = await getExceptionDetail(selectedExcId);
          setSelectedDetail(updatedDetail);
        } catch {
          // ignore
        }
      }
    } catch (err: any) {
      setActionErrorMessage(err.message || 'Review action failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="space-y-3.5 animate-in fade-in duration-200">
      {/* Top Status & Reviewer Bar - Aligned to the Right */}
      <div className="flex items-center justify-end gap-2.5">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100/90 text-amber-950 border border-amber-300 shadow-2xs">
          {queueItems.length} Reviews Pending
        </span>

        <div className="flex items-center space-x-1.5 text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 px-3 py-1 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <UserCheck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          <span>Reviewer: <strong className="text-slate-900 dark:text-slate-100">{currentUser.name}</strong></span>
        </div>
      </div>

      {/* Top-Center Floating Success Toast */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center space-x-2.5 bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-slate-800 dark:text-slate-100 px-4 py-2 rounded-xl shadow-lg shadow-slate-900/10 dark:shadow-slate-950/50 text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-200 pointer-events-none">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {actionErrorMessage && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-200 text-xs flex items-center space-x-2">
          <XCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left: Queue List */}
          <div className="lg:col-span-4 neu-extruded rounded-2xl overflow-hidden divide-y divide-slate-300/40 dark:divide-slate-800 max-h-[640px] overflow-y-auto">
            {queueItems.map((item) => {
              const isSelected = selectedExcId === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedExcId(item.id)}
                  className={`w-full text-left py-2.5 px-3.5 transition flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/70 dark:bg-blue-950/50 border-l-4 border-blue-600 text-slate-900 dark:text-slate-100'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="space-y-0.5 overflow-hidden pr-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100 truncate">{item.id}</span>
                      <ExceptionTypeBadge type={item.exception_type} />
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                      Ref: {item.source_reference || 'N/A'} • ₹{item.payment_amount ? item.payment_amount.toFixed(2) : '--'}
                    </p>
                  </div>
                  <ChevronRight className={`h-4 w-4 shrink-0 ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`} />
                </button>
              );
            })}
          </div>

          {/* Right: Inspection & Decision Workspace */}
          <div className="lg:col-span-8 neu-extruded rounded-2xl p-6 space-y-4">
            {detailLoading || !selectedDetail ? (
              <LoadingSpinner message="Loading exception review workspace..." />
            ) : (
              <>
                {/* Workspace Header */}
                <div className="flex items-center justify-between border-b border-slate-300/60 dark:border-slate-800 pb-3">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Exception Review</span>
                    <h3 className="text-base font-bold font-mono text-slate-900 dark:text-slate-100 mt-0.5">{selectedDetail.id}</h3>
                  </div>
                  <div className="flex items-center space-x-3">
                    <ExceptionTypeBadge type={selectedDetail.exception_type} />
                    <button
                      onClick={() => onSelectException(selectedDetail.id)}
                      className="inline-flex items-center space-x-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline underline-offset-2 ml-1 cursor-pointer"
                    >
                      <span>Verify Details</span>
                    </button>
                  </div>
                </div>

                {/* Financial Summary Box */}
                <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl neu-inset-subtle border border-white/60 dark:border-white/10 font-mono text-xs">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Payment</span>
                    <span className="text-slate-900 dark:text-slate-100 font-bold text-sm">
                      ₹{selectedDetail.payment ? selectedDetail.payment.payment_amount.toFixed(2) : '0.00'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Settlement</span>
                    <span className="text-slate-900 dark:text-slate-100 font-bold text-sm">
                      ₹{selectedDetail.settlements.reduce((sum, s) => sum + s.settlement_amount, 0).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Fees</span>
                    <span className="text-slate-900 dark:text-slate-100 font-bold text-sm">
                      ₹{selectedDetail.fees.reduce((sum, f) => sum + f.fee_amount, 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Why this needs review */}
                <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 text-xs space-y-1">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider text-[11px]">Why this needs review</span>
                    <div className="relative group inline-flex items-center">
                      <Info className="h-3.5 w-3.5 text-amber-800/70 dark:text-amber-400 hover:text-amber-950 dark:hover:text-amber-200 cursor-help transition shrink-0" />
                      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:flex flex-col z-30 w-56 p-2 rounded-lg bg-slate-900 border border-slate-700/90 shadow-2xl text-[11px] font-normal text-slate-200 pointer-events-none leading-relaxed text-center animate-in fade-in duration-150">
                        To verify this exception, click Verify Details to review the supporting evidence.
                      </div>
                    </div>
                  </div>
                  <p className="text-amber-900 dark:text-amber-200/90 leading-relaxed font-normal">
                    {getWhyNeedsReviewExplanation(selectedDetail)}
                  </p>
                </div>

                {/* Operator Actions Form */}
                <div className="space-y-3 pt-1 border-t border-slate-300/40 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                      <MessageSquare className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Review Notes (optional)</span>
                    </label>
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="text-slate-500 dark:text-slate-400">Signing as:</span>
                      <input
                        type="text"
                        value={operatorName}
                        onChange={(e) => setOperatorName(e.target.value)}
                        className="neu-inset-subtle border border-white/60 dark:border-white/10 rounded-lg px-2 py-0.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none font-semibold"
                      />
                    </div>
                  </div>

                  <textarea
                    rows={2}
                    placeholder="Add notes about your review decision..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    className="w-full neu-inset-subtle border border-white/60 dark:border-white/10 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
                  />

                  {/* 3 Explicit Action Buttons */}
                  <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleReviewAction('KEEP_UNRESOLVED')}
                      disabled={submitting}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-2xs transition disabled:opacity-50 cursor-pointer"
                    >
                      Keep Pending
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmAction('REJECT')}
                      disabled={submitting}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100/80 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 shadow-2xs transition disabled:opacity-50 cursor-pointer"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmAction('APPROVE')}
                      disabled={submitting}
                      className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                      {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      <span>Approve & Resolve</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Reject / Approve */}
      {confirmAction && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => !submitting && setConfirmAction(null)}
        >
          <div 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start space-x-3.5">
              <div className={`p-2.5 rounded-full shrink-0 ${
                confirmAction === 'REJECT' 
                  ? 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-400' 
                  : 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400'
              }`}>
                {confirmAction === 'REJECT' ? (
                  <AlertCircle className="h-5 w-5" />
                ) : (
                  <CheckCircle2 className="h-5 w-5" />
                )}
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {confirmAction === 'REJECT' ? 'Reject Exception' : 'Approve & Resolve'}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {confirmAction === 'REJECT'
                    ? 'Are you sure you want to reject this exception?'
                    : 'Are you sure you want to approve and resolve this exception?'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                disabled={submitting}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-2xs transition disabled:opacity-50 cursor-pointer"
              >
                No
              </button>
              <button
                type="button"
                onClick={() => {
                  const action = confirmAction;
                  setConfirmAction(null);
                  handleReviewAction(action);
                }}
                disabled={submitting}
                className={`px-4 py-1.5 rounded-xl text-xs font-semibold text-white shadow-sm transition disabled:opacity-50 cursor-pointer ${
                  confirmAction === 'REJECT'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {confirmAction === 'REJECT' ? 'Yes, Reject' : 'Yes, Approve & Resolve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
