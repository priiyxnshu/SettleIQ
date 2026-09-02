import React from 'react';
import type { ExceptionType, ExceptionStatus, AuditAction } from '../../types';

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

export const StatusBadge: React.FC<{ status: ExceptionStatus; className?: string }> = ({ status, className = '' }) => {
  const styles: Record<ExceptionStatus, string> = {
    OPEN: 'bg-amber-50 text-amber-700 border-amber-200',
    INVESTIGATING: 'bg-blue-50 text-blue-700 border-blue-200',
    AUTO_RESOLVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    HUMAN_REVIEW: 'bg-purple-50 text-purple-700 border-purple-200'
  };

  const labels: Record<ExceptionStatus, string> = {
    OPEN: 'Awaiting Investigation',
    INVESTIGATING: 'Investigating',
    AUTO_RESOLVED: 'Auto-Resolved',
    HUMAN_REVIEW: 'Needs Review'
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${styles[status] || 'bg-slate-100 text-slate-700 border-slate-200'} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${
        status === 'AUTO_RESOLVED' 
          ? 'bg-emerald-500' 
          : status === 'HUMAN_REVIEW' 
            ? 'bg-purple-500' 
            : status === 'INVESTIGATING'
              ? 'bg-blue-500'
              : 'bg-amber-500'
      }`} />
      {labels[status] || status}
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
