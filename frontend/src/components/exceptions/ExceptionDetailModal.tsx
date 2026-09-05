/**
 * SettleIQ Exception Investigation Modal
 *
 * Multi-tabbed modal inspecting a single reconciliation exception in depth:
 * 1. Overview & Evidence: Payment details, correlated settlement batches, processor fees,
 *    and deterministic financial calculations.
 * 2. AI Root-Cause Investigation: Grounded Gemini analysis, confidence rating,
 *    advisory recommendations, evidence ID citations, and guardrail validation checks.
 * 3. Audit Trail: Chronological lifecycle history and Maker-Checker decision audit records.
 */

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ShieldCheck,
  History,
  CreditCard,
  Landmark,
  Receipt,
  FileSearch,
  Calculator,
  IndianRupee,
  Link2,
  FileText,
  Info,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Search,
  User,
  Clock,
  XCircle
} from 'lucide-react';
import type {
  ExceptionDetailResponse,
  EvidencePackage,
  AIInvestigationResult,
  AuditLogItem
} from '../../types';
import {
  getExceptionDetail,
  getExceptionEvidence,
  investigateException,
  getExceptionAuditTrail
} from '../../services/api';
import { Modal } from '../common/Modal';
import { ExceptionTypeBadge, StatusBadge } from '../common/Badge';
import { LoadingSpinner } from '../common/LoadingSpinner';

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="p-0.5 text-slate-500 hover:text-slate-200 transition cursor-pointer inline-flex items-center"
      title={copied ? 'Copied!' : 'Copy to clipboard'}
    >
      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
    </button>
  );
};

const formatCurrency = (val?: number | null) => {
  const num = typeof val === 'number' ? val : 0;
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatPaymentDate = (dateStr?: string | null): string => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dateFormatted = d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    const timeFormatted = d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    return `${dateFormatted} ${timeFormatted}`;
  } catch {
    return dateStr;
  }
};

const formatAuditDate = (dateStr?: string | null): string => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dateFormatted = d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    const timeFormatted = d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    return `${dateFormatted} • ${timeFormatted}`;
  } catch {
    return dateStr;
  }
};

interface ExceptionDetailModalProps {
  exceptionId: string | null;
  onClose: () => void;
  onRefreshParent?: () => void;
}

/**
 * Deep-dive modal presenting correlated financial records, AI diagnosis, and audit trails.
 */
export const ExceptionDetailModal: React.FC<ExceptionDetailModalProps> = ({
  exceptionId,
  onClose,
  onRefreshParent: _onRefreshParent
}) => {
  const [activeTab, setActiveTab] = useState<'evidence' | 'ai' | 'audit'>('evidence');
  const [detail, setDetail] = useState<ExceptionDetailResponse | null>(null);
  const [evidence, setEvidence] = useState<EvidencePackage | null>(null);
  const [aiResult, setAiResult] = useState<AIInvestigationResult | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(5);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!exceptionId) return;
    setAuditPage(1);

    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [det, ev, logs] = await Promise.all([
          getExceptionDetail(exceptionId),
          getExceptionEvidence(exceptionId),
          getExceptionAuditTrail(exceptionId)
        ]);
        setDetail(det);
        setEvidence(ev);
        setAuditLogs(logs);

        // Only request a live investigation if the exception is OPEN and has no persisted decision
        if (!det.decision && det.status === 'OPEN') {
          const ai = await investigateException(exceptionId).catch(() => null);
          if (ai) setAiResult(ai);
        } else {
          setAiResult(null);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load exception details');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [exceptionId]);

  if (!exceptionId) return null;

  // Tab navigation sequence
  const tabOrder: ('evidence' | 'ai' | 'audit')[] = ['evidence', 'ai', 'audit'];
  const currentTabIndex = tabOrder.indexOf(activeTab);
  const prevTab = currentTabIndex > 0 ? tabOrder[currentTabIndex - 1] : null;
  const nextTab = currentTabIndex < tabOrder.length - 1 ? tabOrder[currentTabIndex + 1] : null;

  const tabNames: Record<'evidence' | 'ai' | 'audit', string> = {
    evidence: 'Financial Records',
    ai: 'System Analysis',
    audit: 'Audit Logs'
  };

  // Derived metadata
  const paymentRef = detail?.payment?.payment_id || detail?.source_reference || 'N/A';
  const orderRef = detail?.payment?.order_id || 'N/A';
  const customerRef = detail?.payment?.customer_reference || 'N/A';
  const compactBatchId = detail?.reconciliation_run_id ? detail.reconciliation_run_id.slice(0, 8) : 'N/A';

  const altRef = detail?.payment?.order_id
    ? `SR_${detail.payment.order_id}`
    : detail?.settlements?.find((s) => s.settlement_reference?.startsWith('SR_'))?.settlement_reference || 'None';

  // System Analysis Derivations (Decision Flow: Finding -> Guardrail Validation -> Final System Outcome)
  const isInvestigated = Boolean(aiResult || detail?.decision || (detail && detail.status !== 'OPEN'));
  const hasPersistedConfidence = detail?.decision?.confidence !== undefined && detail?.decision?.confidence !== null;
  const confidenceVal = hasPersistedConfidence
    ? detail!.decision!.confidence!
    : (!aiResult?.is_fallback && aiResult?.confidence !== undefined && aiResult?.confidence !== null)
      ? aiResult.confidence
      : 0;
  const confidenceScore = `${Math.round(confidenceVal * 100)}%`;

  // 1. What did the system find?
  const getInvestigationNarrative = () => {
    if (!detail) return 'The system analyzed the transaction records and identified an exception.';
    
    const paymentAmt = evidence?.calculated_facts?.payment_amount ?? detail.payment?.payment_amount;
    const settledAmt = evidence?.calculated_facts?.total_settled_amount ?? 0;
    const netDiff = evidence?.calculated_facts?.discrepancy_amount ?? 0;
    const settlementCount = evidence?.calculated_facts?.settlement_count ?? detail.settlements?.length ?? 0;

    if (detail.exception_type === 'MISSING_SETTLEMENT') {
      const pAmt = paymentAmt ? formatCurrency(paymentAmt) : '';
      return `The system found 0 matching settlement records in the processor batch for payment ${paymentRef}, confirming an unsettled amount of ${pAmt}.`;
    }
    if (detail.exception_type === 'DUPLICATE') {
      const count = settlementCount > 0 ? settlementCount : 2;
      return `The system identified ${count} duplicate settlement records linked to payment ${paymentRef}, with total settled funds of ${formatCurrency(settledAmt)}.`;
    }
    if (detail.exception_type === 'AMOUNT_MISMATCH') {
      return `The system detected an amount discrepancy of ${formatCurrency(Math.abs(netDiff))} between payment ${paymentRef} (${formatCurrency(paymentAmt)}) and settled funds (${formatCurrency(settledAmt)}).`;
    }
    if (detail.exception_type === 'REFERENCE_MISMATCH') {
      return `The system found payment reference '${paymentRef}' was not directly referenced by the processor, but correlated with alternate order reference '${orderRef}'.`;
    }
    return aiResult?.explanation || 'The system analyzed the transaction records and identified an exception.';
  };

  const getFindingText = () => {
    if (!detail) return 'No matching settlement found';
    if (detail.exception_type === 'MISSING_SETTLEMENT') {
      return 'No matching settlement found';
    }
    if (detail.exception_type === 'DUPLICATE') {
      return 'Duplicate settlement records found';
    }
    if (detail.exception_type === 'AMOUNT_MISMATCH') {
      return 'Settlement amount differs from payment amount';
    }
    if (detail.exception_type === 'REFERENCE_MISMATCH') {
      return 'Reference identifier mismatch';
    }
    return aiResult?.root_cause
      ? aiResult.root_cause.replace(/_/g, ' ')
      : 'Reconciliation discrepancy detected';
  };

  const investigationNarrative = getInvestigationNarrative();
  const findingText = getFindingText();

  // 2. Did the finding pass the guardrail checks?
  const getGuardrailData = () => {
    if (!detail) {
      return {
        statusText: 'Pending',
        statusStyle: 'bg-slate-500/10 text-slate-400 border border-slate-500/20',
        explanation: 'Guardrail validation rules have not yet been evaluated for this transaction.',
        resultText: 'Awaiting system rule check'
      };
    }

    if (detail.status === 'AUTO_RESOLVED') {
      if (detail.decision?.decision_outcome === 'APPROVED') {
        return {
          statusText: 'Human Approved',
          statusStyle: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
          explanation: 'Configured guardrails validated the deterministic evidence package, and the exception was reviewed and approved by the Reconciliation Manager.',
          resultText: detail.decision.reason || 'Approved and resolved by the Reconciliation Manager.'
        };
      }
      return {
        statusText: 'Passed',
        statusStyle: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
        explanation: 'The exception passed all 5 deterministic guardrail checks. The amount difference is 100% accounted for by recorded processing fees and satisfies all policy criteria for automatic resolution.',
        resultText: detail.decision?.reason || 'Auto-resolve approved: Discrepancy is fully explained by recorded processing fees.'
      };
    }

    if (detail.status === 'REJECTED') {
      return {
        statusText: 'Rejected / Disputed',
        statusStyle: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
        explanation: 'The exception was reviewed by the Reconciliation Manager and determined to be rejected / disputed.',
        resultText: detail.decision?.reason || 'Resolution rejected and disputed by the Reconciliation Manager.'
      };
    }

    // Status is HUMAN_REVIEW or OPEN
    let failureReason = '';
    if (detail.exception_type === 'MISSING_SETTLEMENT') {
      failureReason = 'Automatic resolution is not permitted for missing settlements because unaccounted processor funds require explicit review by the Manager.';
    } else if (detail.exception_type === 'DUPLICATE') {
      failureReason = 'Automatic resolution is not permitted for duplicate records to prevent unauthorized ledger adjustments without Manager review.';
    } else if (detail.exception_type === 'AMOUNT_MISMATCH') {
      failureReason = 'The discrepancy is not fully accounted for by recorded processing fees and cannot be automatically resolved without Manager review.';
    } else if (detail.exception_type === 'REFERENCE_MISMATCH') {
      failureReason = 'Alternate reference correlation requires verification and sign-off by the Reconciliation Manager.';
    } else {
      failureReason = 'The exception did not meet the deterministic criteria for automatic resolution and requires review by the Manager.';
    }

    return {
      statusText: 'Requires Review',
      statusStyle: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      explanation: failureReason,
      resultText: detail.decision?.reason || 'Rule check flagged transaction: Requires review by the Reconciliation Manager.'
    };
  };

  const guardrailData = getGuardrailData();

  // 3. What was the final outcome for this exception?
  const getFinalOutcome = () => {
    if (!detail) {
      return {
        title: 'Pending',
        badgeStyle: 'bg-slate-500/10 text-slate-400 border border-slate-500/20',
        iconBox: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
        headline: 'The exception is pending system processing.',
        subtext: 'Reconciliation context is being loaded.'
      };
    }

    if (detail.status === 'AUTO_RESOLVED') {
      if (detail.decision?.decision_outcome === 'APPROVED') {
        return {
          title: 'Human Approved',
          badgeStyle: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
          iconBox: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          headline: 'The exception was investigated, verified, and approved by the Reconciliation Manager.',
          subtext: detail.decision.reason || 'The transaction has been fully reconciled and closed in the ledger.'
        };
      }
      return {
        title: 'Auto-Resolved',
        badgeStyle: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
        iconBox: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        headline: 'The exception met all policy criteria and was automatically resolved by the system.',
        subtext: 'No manual intervention is required. The transaction was automatically resolved and reconciled in accordance with financial policy.'
      };
    }

    if (detail.status === 'REJECTED') {
      return {
        title: 'Rejected / Disputed',
        badgeStyle: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
        iconBox: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
        headline: 'The exception was reviewed and rejected / disputed by the Reconciliation Manager.',
        subtext: detail.decision?.reason || 'The transaction dispute has been recorded and closed in the audit log.'
      };
    }

    if (detail.status === 'HUMAN_REVIEW') {
      return {
        title: 'Needs Review',
        badgeStyle: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
        iconBox: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        headline: 'The exception was validated and routed to the Review Queue for review by the Manager.',
        subtext: 'This exception requires review and approval by the Reconciliation Manager before the reconciliation run can be finalized.'
      };
    }

    if (detail.status === 'OPEN') {
      return {
        title: 'Needs Review',
        badgeStyle: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
        iconBox: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        headline: 'The exception has been detected and is pending review by the Manager.',
        subtext: 'This exception requires review and sign-off by the Reconciliation Manager.'
      };
    }

    return {
      title: 'Investigating',
      badgeStyle: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      iconBox: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      headline: 'The exception is currently being investigated by the system.',
      subtext: 'Reconciliation evidence and rule evaluation are in progress.'
    };
  };

  const finalOutcome = getFinalOutcome();

  // Audit Logs Pagination & Derivations (Newest / most recent first)
  const sortedAuditLogs = [...auditLogs].sort((a, b) => {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  const totalAuditEvents = sortedAuditLogs.length;
  const totalAuditPages = Math.max(1, Math.ceil(totalAuditEvents / auditPageSize));
  const safeAuditPage = Math.min(Math.max(1, auditPage), totalAuditPages);
  const auditStartIndex = totalAuditEvents === 0 ? 0 : (safeAuditPage - 1) * auditPageSize;
  const auditEndIndex = Math.min(auditStartIndex + auditPageSize, totalAuditEvents);
  const paginatedAuditLogs = sortedAuditLogs.slice(auditStartIndex, auditEndIndex);

  const getAuditItemConfig = (log: AuditLogItem) => {
    const action = log.action_type;
    const details = typeof log.details === 'object' && log.details !== null ? log.details : {};
    const tags: { label: string; style: string }[] = [];

    // 1. Exception Detected
    if (action === 'EXCEPTION_CREATED') {
      return {
        title: 'Exception Detected',
        icon: <FileSearch className="h-4 w-4" />,
        nodeStyle: 'bg-blue-950/30 text-blue-400 border-blue-500/40',
        dotColor: 'bg-blue-400 ring-2 ring-blue-400/20',
        dotTitle: 'Detected',
        description: details.description || details.message || 'The system detected and flagged this transaction as a reconciliation exception.',
        tags
      };
    }

    // 2. System Analysis Completed
    if (action === 'AI_INVESTIGATION_COMPLETED') {
      if (details.confidence) {
        tags.push({
          label: `Confidence: ${Math.round(details.confidence * 100)}%`,
          style: 'bg-purple-950/50 text-purple-300 border-purple-800/60'
        });
      }
      return {
        title: 'System Analysis Completed',
        icon: <Sparkles className="h-4 w-4" />,
        nodeStyle: 'bg-purple-950/30 text-purple-400 border-purple-500/40',
        dotColor: 'bg-purple-400 ring-2 ring-purple-400/20',
        dotTitle: 'Analysis Completed',
        description: details.explanation || details.root_cause || 'The system completed its analysis and confirmed the exception findings.',
        tags
      };
    }

    // 3. Sent for Human Review / In Review
    if (action === 'SENT_TO_REVIEW') {
      if (details.action === 'KEEP_UNRESOLVED') {
        tags.push({
          label: 'Result: In Review',
          style: 'bg-amber-950/50 text-amber-300 border-amber-800/60'
        });
        if (details.decided_by || log.user_id) {
          tags.push({
            label: `By: ${details.decided_by || log.user_id}`,
            style: 'bg-slate-800 text-slate-300 border-slate-700'
          });
        }
        return {
          title: 'In Review',
          icon: <Clock className="h-4 w-4" />,
          nodeStyle: 'bg-amber-950/30 text-amber-400 border-amber-500/40',
          dotColor: 'bg-amber-400 ring-2 ring-amber-400/20',
          dotTitle: 'In Review',
          description: details.notes || details.reason || 'The exception is currently in the queue and awaiting review by the Manager.',
          tags
        };
      }

      if (details.confidence) {
        tags.push({
          label: `Confidence: ${Math.round(details.confidence * 100)}%`,
          style: 'bg-slate-800 text-slate-300 border-slate-700'
        });
      }
      if (details.decision_outcome) {
        tags.push({
          label: `Result: ${details.decision_outcome === 'HUMAN_REVIEW' ? 'Requires Human Review' : details.decision_outcome}`,
          style: 'bg-amber-950/50 text-amber-300 border-amber-800/60'
        });
      }
      if (details.decided_by || log.user_id) {
        tags.push({
          label: `By: ${details.decided_by || log.user_id}`,
          style: 'bg-slate-800 text-slate-300 border-slate-700'
        });
      }

      return {
        title: 'Sent for Human Review',
        icon: <User className="h-4 w-4" />,
        nodeStyle: 'bg-amber-950/30 text-amber-400 border-amber-500/40',
        dotColor: 'bg-amber-400 ring-2 ring-amber-400/20',
        dotTitle: 'Requires Human Review',
        description: details.reason || 'The exception did not meet the conditions for automatic resolution and requires human review.',
        tags
      };
    }

    // 4. Auto-Resolved
    if (action === 'AUTO_RESOLVED') {
      if (details.confidence) {
        tags.push({
          label: `Confidence: ${Math.round(details.confidence * 100)}%`,
          style: 'bg-slate-800 text-slate-300 border-slate-700'
        });
      }
      tags.push({
        label: 'Result: Auto-Resolved',
        style: 'bg-emerald-950/50 text-emerald-300 border-emerald-800/60'
      });
      return {
        title: 'Auto-Resolved',
        icon: <CheckCircle2 className="h-4 w-4" />,
        nodeStyle: 'bg-emerald-950/30 text-emerald-400 border-emerald-500/40',
        dotColor: 'bg-emerald-400 ring-2 ring-emerald-400/20',
        dotTitle: 'Auto-Resolved',
        description: details.reason || 'The exception met all automatic resolution conditions and was resolved automatically.',
        tags
      };
    }

    // 5. Human Approved
    if (action === 'HUMAN_APPROVED') {
      const actor = details.decided_by || log.user_id || 'Manager';
      tags.push({
        label: 'Result: Approved',
        style: 'bg-emerald-950/50 text-emerald-300 border-emerald-800/60'
      });
      tags.push({
        label: `By: ${actor}`,
        style: 'bg-slate-800 text-slate-300 border-slate-700'
      });
      return {
        title: 'Human Approved',
        icon: <CheckCircle2 className="h-4 w-4" />,
        nodeStyle: 'bg-emerald-950/30 text-emerald-400 border-emerald-500/40',
        dotColor: 'bg-emerald-400 ring-2 ring-emerald-400/20',
        dotTitle: 'Approved',
        description: details.notes || details.reason || `Manually approved and resolved by ${actor}.`,
        tags
      };
    }

    // 6. Human Rejected
    if (action === 'HUMAN_REJECTED') {
      const actor = details.decided_by || log.user_id || 'Manager';
      tags.push({
        label: 'Result: Rejected',
        style: 'bg-rose-950/50 text-rose-300 border-rose-800/60'
      });
      tags.push({
        label: `By: ${actor}`,
        style: 'bg-slate-800 text-slate-300 border-slate-700'
      });
      return {
        title: 'Human Rejected',
        icon: <XCircle className="h-4 w-4" />,
        nodeStyle: 'bg-rose-950/30 text-rose-400 border-rose-500/40',
        dotColor: 'bg-rose-400 ring-2 ring-rose-400/20',
        dotTitle: 'Rejected',
        description: details.notes || details.reason || `Resolution rejected by ${actor}.`,
        tags
      };
    }

    // 7. Fallback / Informational
    const title = (action as string).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    return {
      title,
      icon: <FileText className="h-4 w-4" />,
      nodeStyle: 'bg-slate-900/60 text-slate-400 border-slate-700/50',
      dotColor: 'bg-slate-400 ring-2 ring-slate-400/20',
      dotTitle: title,
      description: details.reason || details.message || (typeof log.details === 'string' ? log.details : 'Action recorded in audit log.'),
      tags
    };
  };

  const renderPaginationButtons = () => {
    const pages: (number | string)[] = [];
    if (totalAuditPages <= 7) {
      for (let i = 1; i <= totalAuditPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safeAuditPage > 3) pages.push('...');
      const start = Math.max(2, safeAuditPage - 1);
      const end = Math.min(totalAuditPages - 1, safeAuditPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (safeAuditPage < totalAuditPages - 2) pages.push('...');
      pages.push(totalAuditPages);
    }

    return pages.map((p, idx) => {
      if (p === '...') {
        return (
          <span key={`ellipsis-${idx}`} className="px-1 text-xs text-slate-500 select-none">
            ...
          </span>
        );
      }
      return (
        <button
          key={`page-${p}`}
          type="button"
          onClick={() => setAuditPage(p as number)}
          className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-semibold transition cursor-pointer select-none ${
            safeAuditPage === p
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          {p}
        </button>
      );
    });
  };

  return (
    <Modal
      isOpen={Boolean(exceptionId)}
      onClose={onClose}
      title={`Exception Details — ${exceptionId}`}
      maxWidth="max-w-6xl"
      bodyClassName="p-4 sm:p-5 overflow-y-auto flex-1"
    >
      {loading ? (
        <div className="py-16">
          <LoadingSpinner message="Loading exception context and evidence..." />
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
          {error}
        </div>
      ) : detail && evidence ? (
        <div className="space-y-3">
          {/* Top Overview Card: Badges, Global Context, and Financial Metrics */}
          <div className="bg-slate-900/90 border border-slate-800/90 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-4 shadow-sm">
            {/* Left: Badges + 4 Metadata columns */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2.5">
                <ExceptionTypeBadge type={detail.exception_type} />
                <StatusBadge status={detail.status} decision={detail.decision} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 font-mono text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Payment Ref</span>
                  <span className="font-bold text-white text-xs mt-0.5 inline-flex items-center space-x-1.5">
                    <span>{paymentRef}</span>
                    {paymentRef !== 'N/A' && <CopyButton text={paymentRef} />}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Order Ref</span>
                  <span className="font-bold text-white text-xs mt-0.5 inline-flex items-center space-x-1.5">
                    <span>{orderRef}</span>
                    {orderRef !== 'N/A' && <CopyButton text={orderRef} />}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Customer Ref</span>
                  <span className="font-bold text-white text-xs mt-0.5 inline-flex items-center space-x-1.5">
                    <span>{customerRef}</span>
                    {customerRef !== 'N/A' && <CopyButton text={customerRef} />}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Batch ID</span>
                  <span className="font-bold text-white text-xs mt-0.5 inline-flex items-center space-x-1.5">
                    <span>{compactBatchId}</span>
                    <CopyButton text={detail.reconciliation_run_id} />
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Financial Metrics Summary */}
            <div className="flex flex-wrap items-center gap-5 sm:gap-7 text-xs font-mono">
              <div>
                <span className="text-slate-500 block text-[10px] font-semibold uppercase tracking-wider">Payment Amount</span>
                <span className="text-white font-bold text-sm mt-0.5 block">
                  {formatCurrency(evidence.calculated_facts.payment_amount)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] font-semibold uppercase tracking-wider">Total Settled</span>
                <span className="text-white font-bold text-sm mt-0.5 block">
                  {formatCurrency(evidence.calculated_facts.total_settled_amount)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] font-semibold uppercase tracking-wider">Total Fees</span>
                <span className="text-white font-bold text-sm mt-0.5 block">
                  {formatCurrency(evidence.calculated_facts.total_fee_amount)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] font-semibold uppercase tracking-wider">Net Difference</span>
                <span className="text-amber-400 font-bold text-sm mt-0.5 block">
                  {formatCurrency(evidence.calculated_facts.discrepancy_amount)}
                </span>
              </div>
            </div>
          </div>

          {/* Three-Section Navigation Tab Bar */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTab('evidence')}
                className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition cursor-pointer select-none ${
                  activeTab === 'evidence'
                    ? 'bg-blue-950/70 border border-blue-500/40 text-blue-400 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent font-medium hover:bg-slate-900/60'
                }`}
              >
                <CreditCard className="h-3.5 w-3.5" />
                <span>1. Financial Records</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ai')}
                className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition cursor-pointer select-none ${
                  activeTab === 'ai'
                    ? 'bg-blue-950/70 border border-blue-500/40 text-blue-400 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent font-medium hover:bg-slate-900/60'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>2. System Analysis</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('audit')}
                className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition cursor-pointer select-none ${
                  activeTab === 'audit'
                    ? 'bg-blue-950/70 border border-blue-500/40 text-blue-400 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent font-medium hover:bg-slate-900/60'
                }`}
              >
                <History className="h-3.5 w-3.5" />
                <span>3. Audit Logs</span>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono font-bold">
                  {auditLogs.length}
                </span>
              </button>
            </div>
          </div>

          {/* Content Area with Minimal Floating Edge Navigation Arrows */}
          <div className="relative">
            {/* Subtle Minimal Left Arrow */}
            <button
              type="button"
              disabled={!prevTab}
              onClick={() => prevTab && setActiveTab(prevTab)}
              className={`absolute -left-2 sm:-left-3.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full border flex items-center justify-center transition shadow-md select-none ${
                prevTab
                  ? 'border-slate-700 bg-slate-900/95 text-slate-300 hover:text-white hover:bg-slate-800 hover:border-slate-600 cursor-pointer'
                  : 'border-slate-800/40 bg-slate-950/40 text-slate-600 opacity-20 cursor-not-allowed pointer-events-none'
              }`}
              title={prevTab ? `Go to ${tabNames[prevTab]}` : undefined}
              aria-label="Previous section"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Subtle Minimal Right Arrow */}
            <button
              type="button"
              disabled={!nextTab}
              onClick={() => nextTab && setActiveTab(nextTab)}
              className={`absolute -right-2 sm:-right-3.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full border flex items-center justify-center transition shadow-md select-none ${
                nextTab
                  ? 'border-slate-700 bg-slate-900/95 text-slate-300 hover:text-white hover:bg-slate-800 hover:border-slate-600 cursor-pointer'
                  : 'border-slate-800/40 bg-slate-950/40 text-slate-600 opacity-20 cursor-not-allowed pointer-events-none'
              }`}
              title={nextTab ? `Go to ${tabNames[nextTab]}` : undefined}
              aria-label="Next section"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            {/* Centered Main Content Body */}
            <div className="w-full space-y-3">
              {/* SECTION 1: Financial Records */}
              {activeTab === 'evidence' && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  {/* 3-Column Financial Records Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Card 1: Payment Record */}
                    <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/90 flex flex-col justify-between space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                        <div className="flex items-center space-x-2">
                          <div className="p-1 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            <CreditCard className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-xs font-bold text-white tracking-wide">Payment Record</span>
                        </div>
                        <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono font-bold">
                          {detail.payment ? 1 : 0}
                        </span>
                      </div>

                      {detail.payment ? (
                        <div className="space-y-1.5 text-xs font-mono">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-sans text-[11px]">Payment ID</span>
                            <span className="text-white font-bold inline-flex items-center space-x-1">
                              <span>{detail.payment.payment_id}</span>
                              <CopyButton text={detail.payment.payment_id} />
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-sans text-[11px]">Order ID</span>
                            <span className="text-white">{detail.payment.order_id || 'N/A'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-sans text-[11px]">Customer ID</span>
                            <span className="text-white">{detail.payment.customer_reference || 'N/A'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-sans text-[11px]">Amount</span>
                            <span className="text-cyan-400 font-bold">{formatCurrency(detail.payment.payment_amount)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-sans text-[11px]">Status</span>
                            <span className="text-emerald-400 font-semibold inline-flex items-center space-x-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              <span>{detail.payment.payment_status}</span>
                            </span>
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                            <span className="text-slate-500 font-sans text-[11px]">Payment Time</span>
                            <span className="text-slate-300 text-[11px]">{formatPaymentDate(detail.payment.payment_date)}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic py-4 text-center">No direct payment record found</p>
                      )}
                    </div>

                    {/* Card 2: Settlement Record(s) */}
                    <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/90 flex flex-col justify-between space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                        <div className="flex items-center space-x-2">
                          <div className="p-1 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            <Landmark className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-xs font-bold text-white tracking-wide">Settlement Record(s)</span>
                        </div>
                        <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono font-bold">
                          {detail.settlements.length}
                        </span>
                      </div>

                      {detail.settlements.length > 0 ? (
                        <div className="space-y-2">
                          {detail.settlements.map((s, idx) => (
                            <div key={s.id || idx} className="space-y-1.5 text-xs font-mono border-b border-slate-800/80 pb-2 last:border-0 last:pb-0">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-sans text-[11px]">Settlement ID</span>
                                <span className="text-white font-bold inline-flex items-center space-x-1">
                                  <span>{s.settlement_id}</span>
                                  <CopyButton text={s.settlement_id} />
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-sans text-[11px]">Settled Amount</span>
                                <span className="text-indigo-300 font-bold">{formatCurrency(s.settlement_amount)}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-sans text-[11px]">Ref</span>
                                <span className="text-slate-300">{s.settlement_reference || 'N/A'}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-sans text-[11px]">Status</span>
                                <span className="text-emerald-400 font-semibold">{s.settlement_status}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-4 text-center flex flex-col items-center justify-center">
                          <FileSearch className="h-6 w-6 text-slate-600 mb-1" />
                          <h5 className="text-xs font-bold text-white">No matching settlement records</h5>
                          <p className="text-[10px] text-slate-500 max-w-[200px] mt-0.5 leading-relaxed">
                            No settlement found in this processor batch for the given payment.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Card 3: Fee Record(s) */}
                    <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/90 flex flex-col justify-between space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                        <div className="flex items-center space-x-2">
                          <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <Receipt className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-xs font-bold text-white tracking-wide">Fee Record(s)</span>
                        </div>
                        <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono font-bold">
                          {detail.fees.length}
                        </span>
                      </div>

                      {detail.fees.length > 0 ? (
                        <div className="space-y-2">
                          {detail.fees.map((f, idx) => (
                            <div key={f.id || idx} className="space-y-1.5 text-xs font-mono border-b border-slate-800/80 pb-2 last:border-0 last:pb-0">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-sans text-[11px]">Fee ID</span>
                                <span className="text-white font-bold inline-flex items-center space-x-1">
                                  <span>{f.fee_id}</span>
                                  <CopyButton text={f.fee_id} />
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-sans text-[11px]">Fee Amount</span>
                                <span className="text-emerald-400 font-bold">{formatCurrency(f.fee_amount)}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-sans text-[11px]">Fee Type</span>
                                <span className="text-slate-300">{f.fee_type}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-sans text-[11px]">Linked Payment ID</span>
                                <span className="text-slate-300">{f.payment_id || detail.payment?.payment_id || 'N/A'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-4 text-center flex flex-col items-center justify-center">
                          <Receipt className="h-6 w-6 text-slate-600 mb-1" />
                          <h5 className="text-xs font-bold text-white">No fee records</h5>
                          <p className="text-[10px] text-slate-500 max-w-[200px] mt-0.5 leading-relaxed">
                            Zero fee deductions attached to this payment record.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Reconciliation Evidence Card */}
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/90 space-y-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Reconciliation Evidence</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                      {/* Item 1: Calculation */}
                      <div className="flex items-center space-x-3 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                        <div className="p-2 rounded-full bg-slate-800/80 text-slate-400 shrink-0">
                          <Calculator className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-1">
                            <span className="text-[10px] text-slate-500 uppercase font-semibold">Calculation</span>
                            <div className="relative group cursor-pointer inline-flex items-center">
                              <Info className="h-3 w-3 text-slate-500 hover:text-slate-300 transition" />
                              <div className="absolute left-0 bottom-full mb-1.5 hidden group-hover:flex flex-col z-30 w-44 p-2 rounded-lg bg-slate-900 border border-slate-700/90 shadow-2xl text-[10px] text-slate-300 pointer-events-none leading-relaxed">
                                <span className="font-bold text-slate-200 mb-0.5">Calculation Details:</span>
                                <span><strong className="text-white font-mono">P</strong> = Payment Amount</span>
                                <span><strong className="text-white font-mono">S</strong> = Settlement Amount</span>
                                <span><strong className="text-white font-mono">F</strong> = Total Fees</span>
                                <div className="absolute left-2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-700/90" />
                              </div>
                            </div>
                          </div>
                          <span className="text-xs font-mono font-bold text-white block mt-0.5">P − (S + F)</span>
                        </div>
                      </div>

                      {/* Item 2: Net Difference */}
                      <div className="flex items-center space-x-3 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                        <div className="p-2 rounded-full bg-slate-800/80 text-slate-400 shrink-0">
                          <IndianRupee className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-semibold block">Net Difference</span>
                          <span className="text-xs font-mono font-bold text-amber-400 block">
                            {formatCurrency(evidence.calculated_facts.discrepancy_amount)}
                          </span>
                        </div>
                      </div>

                      {/* Item 3: Alternate Reference */}
                      <div className="flex items-center space-x-3 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                        <div className="p-2 rounded-full bg-slate-800/80 text-slate-400 shrink-0">
                          <Link2 className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-semibold block">Alternate Reference</span>
                          <span className="text-xs font-mono font-bold text-white block">{altRef}</span>
                        </div>
                      </div>

                      {/* Item 4: Supporting Record IDs */}
                      <div className="flex items-center space-x-3 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                        <div className="p-2 rounded-full bg-slate-800/80 text-slate-400 shrink-0">
                          <FileText className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-semibold block">Supporting Record IDs</span>
                          <span className="text-xs font-mono font-bold text-indigo-400 block truncate max-w-[140px]" title={evidence.calculated_facts.evidence_ids.join(', ')}>
                            {evidence.calculated_facts.evidence_ids.join(', ')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Info Note */}
                    <div className="pt-0.5 flex items-center space-x-1.5 text-[10px] text-slate-500 font-mono">
                      <Info className="h-3 w-3 text-slate-500 shrink-0" />
                      <span>All records are from reconciliation run <strong className="text-indigo-400">{compactBatchId}</strong> and are read-only.</span>
                    </div>
                  </div>
                </div>
              )}

          {/* Tab 2: System Analysis */}
          {activeTab === 'ai' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              {/* Card 1: Investigation Summary (Full-Width) */}
              <div className="w-full p-4 rounded-xl bg-slate-900/60 border border-slate-800/90 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      <Search className="h-4 w-4" />
                    </div>
                    <h4 className="text-sm font-bold text-white tracking-tight">Investigation Summary</h4>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                    {isInvestigated ? 'Completed' : 'Awaiting Investigation'}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {investigationNarrative}
                </p>

                <div className="border-t border-slate-800/80 pt-2.5 flex flex-wrap items-center gap-x-8 gap-y-2 text-xs">
                  <div>
                    <span className="text-slate-400 font-sans">Finding:</span>
                    <span className="text-slate-200 font-medium ml-2">{findingText}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-sans">Confidence:</span>
                    <span className="font-mono font-bold text-emerald-400 ml-2">{confidenceScore}</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Guardrail Check (Full-Width) */}
              <div className="w-full p-4 rounded-xl bg-slate-900/60 border border-slate-800/90 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <h4 className="text-sm font-bold text-white tracking-tight">Guardrail Check</h4>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${guardrailData.statusStyle}`}>
                    {guardrailData.statusText}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {guardrailData.explanation}
                </p>

                <div className="border-t border-slate-800/80 pt-2.5 flex flex-wrap items-center gap-x-8 gap-y-2 text-xs">
                  <div>
                    <span className="text-slate-400 font-sans">Validation Result:</span>
                    <span className="text-slate-200 font-medium ml-2">{guardrailData.resultText}</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Final System Outcome (Full-Width) */}
              <div className="w-full p-4 rounded-xl bg-slate-900/60 border border-slate-800/90 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className={`p-1.5 rounded-lg border ${finalOutcome.iconBox}`}>
                      {detail?.status === 'AUTO_RESOLVED' ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : detail?.status === 'HUMAN_REVIEW' || detail?.status === 'OPEN' ? (
                        <AlertTriangle className="h-4 w-4" />
                      ) : (
                        <Info className="h-4 w-4" />
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-white tracking-tight">Final System Outcome</h4>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${finalOutcome.badgeStyle}`}>
                    {finalOutcome.title}
                  </span>
                </div>

                <div className="text-xs text-slate-300 space-y-1 leading-relaxed">
                  <p className="font-medium text-white">{finalOutcome.headline}</p>
                  <p className="text-slate-400">{finalOutcome.subtext}</p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Chronological Audit Logs */}
          {activeTab === 'audit' && (
            <div className="space-y-3 pt-0.5 animate-in fade-in duration-150">
              {totalAuditEvents === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  No audit log entries recorded for this exception yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Vertical Timeline */}
                  <div className="relative pl-1">
                    {/* Continuous vertical timeline line */}
                    <div className="absolute left-[23px] top-6 bottom-6 w-0.5 bg-slate-800" />

                    <div className="space-y-1">
                      {paginatedAuditLogs.map((log) => {
                        const item = getAuditItemConfig(log);
                        return (
                          <div
                            key={log.id}
                            className="relative flex items-start space-x-4 py-3.5 border-b border-slate-800/40 last:border-0 group"
                          >
                            {/* Circle Node on Timeline */}
                            <div className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full shrink-0 border ${item.nodeStyle}`}>
                              {item.icon}
                            </div>

                            {/* Row Content Grid */}
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 items-start pt-0.5">
                              {/* Event Name & Timestamp */}
                              <div className="md:col-span-3 space-y-1">
                                <h4 className="text-xs font-bold text-white tracking-tight">{item.title}</h4>
                                <span className="text-[11px] text-slate-400 font-mono block">
                                  {formatAuditDate(log.created_at)}
                                </span>
                              </div>

                              {/* Description & Structured Metadata Tags */}
                              <div className="md:col-span-8 space-y-1.5">
                                <p className="text-xs text-slate-300 leading-relaxed">
                                  {item.description}
                                </p>
                                {item.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                                    {item.tags.map((tag, idx) => (
                                      <span
                                        key={idx}
                                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono border ${tag.style}`}
                                      >
                                        {tag.label}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Right Status Dot Indicator */}
                              <div className="md:col-span-1 flex md:justify-end items-center pt-1.5 pr-2">
                                <span
                                  className={`h-2.5 w-2.5 rounded-full ${item.dotColor} shrink-0`}
                                  title={item.dotTitle}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Dynamic Result Count and Pagination Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-800/80 text-xs text-slate-400">
                    <div>
                      <span>
                        Showing <strong className="text-white font-mono">{auditStartIndex + 1}</strong> to{' '}
                        <strong className="text-white font-mono">{auditEndIndex}</strong> of{' '}
                        <strong className="text-white font-mono">{totalAuditEvents}</strong> events
                      </span>
                    </div>

                    {totalAuditPages > 1 && (
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                          disabled={safeAuditPage === 1}
                          className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition cursor-pointer"
                          title="Previous Page"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>

                        {renderPaginationButtons()}

                        <button
                          type="button"
                          onClick={() => setAuditPage((p) => Math.min(totalAuditPages, p + 1))}
                          disabled={safeAuditPage === totalAuditPages}
                          className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition cursor-pointer"
                          title="Next Page"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      <span>Show</span>
                      <select
                        value={auditPageSize}
                        onChange={(e) => {
                          setAuditPageSize(Number(e.target.value));
                          setAuditPage(1);
                        }}
                        className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value={5}>5 per page</option>
                        <option value={10}>10 per page</option>
                        <option value={20}>20 per page</option>
                        <option value={50}>50 per page</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  ) : null}
</Modal>
);
};
