/**
 * SettleIQ Status & Category Badges
 *
 * Provides standardized indicator pills for exception anomaly types, lifecycle statuses
 * (distinguishing between AI Auto-Resolved and Human Approved), and audit log event codes.
 */

import React from 'react';
import type { ExceptionType, ExceptionStatus, AuditAction, ReviewDecisionDetail } from '../../types';

/**
 * Visual badge for exception categories (Amount Mismatch, Missing Settlement, Duplicate, Ref Mismatch).
 */
export const ExceptionTypeBadge: React.FC<{ type: ExceptionType; className?: string }> = ({ type, className = '' }) => {
  const styles: Record<ExceptionType, string> = {
    AMOUNT_MISMATCH: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60',
    MISSING_SETTLEMENT: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60',
    DUPLICATE: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800/60',
    REFERENCE_MISMATCH: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/60',
    UNKNOWN: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/60'
  };

  const labels: Record<ExceptionType, string> = {
    AMOUNT_MISMATCH: 'Amount Mismatch',
    MISSING_SETTLEMENT: 'Missing Settlement',
    DUPLICATE: 'Duplicate Record',
    REFERENCE_MISMATCH: 'Ref Mismatch',
    UNKNOWN: 'Unknown'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${styles[type] || 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'} ${className}`}>
      {labels[type] || type}
    </span>
  );
};

/**
 * Status indicator badge reflecting AI auto-resolution vs explicit human approval and rejection.
 */
export const StatusBadge: React.FC<{
  status: ExceptionStatus;
  decision?: ReviewDecisionDetail | null;
  className?: string;
}> = ({ status, decision, className = '' }) => {
  const isHumanApproved =
    status === 'AUTO_RESOLVED' &&
    decision?.decision_outcome === 'APPROVED';

  const isRejected = status === 'REJECTED' || decision?.decision_outcome === 'REJECTED';

  let label: string;
  let style: string;
  let dotColor: string;

  if (isRejected) {
    label = 'Rejected / Disputed';
    style = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60';
    dotColor = 'bg-rose-500';
  } else if (isHumanApproved) {
    label = 'Human Approved';
    style = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60';
    dotColor = 'bg-emerald-500';
  } else if (status === 'AUTO_RESOLVED') {
    label = 'Auto-Resolved';
    style = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60';
    dotColor = 'bg-emerald-500';
  } else if (status === 'HUMAN_REVIEW') {
    label = 'Needs Review';
    style = 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/60';
    dotColor = 'bg-purple-500';
  } else if (status === 'INVESTIGATING') {
    label = 'Investigating';
    style = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60';
    dotColor = 'bg-blue-500';
  } else {
    label = 'Awaiting Investigation';
    style = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60';
    dotColor = 'bg-amber-500';
  }

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${style} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${dotColor}`} />
      {label}
    </span>
  );
};

/**
 * Badge for audit actions with contextual colors based on outcome severity.
 */
export const ActionBadge: React.FC<{ action: AuditAction; className?: string }> = ({ action, className = '' }) => {
  const color = 
    action.includes('APPROVED') || action.includes('AUTO_RESOLVED') ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60' :
    action.includes('REJECTED') ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60' :
    action.includes('REVIEW') ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/60' :
    'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border font-mono ${color} ${className}`}>
      {action}
    </span>
  );
};
