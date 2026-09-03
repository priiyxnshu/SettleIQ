import React from 'react';
import type { ExceptionType, ExceptionStatus, AuditAction, ReviewDecisionDetail } from '../../types';

export const ExceptionTypeBadge: React.FC<{ type: ExceptionType; className?: string }> = ({ type, className = '' }) => {
  const styles: Record<ExceptionType, string> = {
    AMOUNT_MISMATCH: 'bg-amber-50 text-amber-700 border-amber-200',
    MISSING_SETTLEMENT: 'bg-rose-50 text-rose-700 border-rose-200',
    DUPLICATE: 'bg-orange-50 text-orange-700 border-orange-200',
    REFERENCE_MISMATCH: 'bg-sky-50 text-sky-700 border-sky-200',
    UNKNOWN: 'bg-purple-50 text-purple-700 border-purple-200'
  };

  const labels: Record<ExceptionType, string> = {
    AMOUNT_MISMATCH: 'Amount Mismatch',
    MISSING_SETTLEMENT: 'Missing Settlement',
    DUPLICATE: 'Duplicate Record',
    REFERENCE_MISMATCH: 'Ref Mismatch',
    UNKNOWN: 'Unknown'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${styles[type] || 'bg-slate-100 text-slate-700 border-slate-200'} ${className}`}>
      {labels[type] || type}
    </span>
  );
};

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
    style = 'bg-rose-50 text-rose-700 border-rose-200';
    dotColor = 'bg-rose-500';
  } else if (isHumanApproved) {
    label = 'Human Approved';
    style = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    dotColor = 'bg-emerald-500';
  } else if (status === 'AUTO_RESOLVED') {
    label = 'Auto-Resolved';
    style = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    dotColor = 'bg-emerald-500';
  } else if (status === 'HUMAN_REVIEW') {
    label = 'Needs Review';
    style = 'bg-purple-50 text-purple-700 border-purple-200';
    dotColor = 'bg-purple-500';
  } else if (status === 'INVESTIGATING') {
    label = 'Investigating';
    style = 'bg-blue-50 text-blue-700 border-blue-200';
    dotColor = 'bg-blue-500';
  } else {
    label = 'Awaiting Investigation';
    style = 'bg-amber-50 text-amber-700 border-amber-200';
    dotColor = 'bg-amber-500';
  }

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${style} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${dotColor}`} />
      {label}
    </span>
  );
};

export const ActionBadge: React.FC<{ action: AuditAction; className?: string }> = ({ action, className = '' }) => {
  const color = 
    action.includes('APPROVED') || action.includes('AUTO_RESOLVED') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
    action.includes('REJECTED') ? 'bg-rose-50 text-rose-700 border-rose-200' :
    action.includes('REVIEW') ? 'bg-purple-50 text-purple-700 border-purple-200' :
    'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border font-mono ${color} ${className}`}>
      {action}
    </span>
  );
};
