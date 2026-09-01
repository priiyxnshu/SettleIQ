import React from 'react';
import type { ExceptionType, ExceptionStatus, AuditAction } from '../../types';

export const ExceptionTypeBadge: React.FC<{ type: ExceptionType; className?: string }> = ({ type, className = '' }) => {
  const styles: Record<ExceptionType, string> = {
    AMOUNT_MISMATCH: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    MISSING_SETTLEMENT: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    DUPLICATE: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    REFERENCE_MISMATCH: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    UNKNOWN: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
  };

  const labels: Record<ExceptionType, string> = {
    AMOUNT_MISMATCH: 'Amount Mismatch',
    MISSING_SETTLEMENT: 'Missing Settlement',
    DUPLICATE: 'Duplicate Record',
    REFERENCE_MISMATCH: 'Ref Mismatch',
    UNKNOWN: 'Unknown Anomaly'
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border font-mono ${styles[type] || 'bg-slate-800 text-slate-300 border-slate-700'} ${className}`}>
      {labels[type] || type}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: ExceptionStatus; className?: string }> = ({ status, className = '' }) => {
  const styles: Record<ExceptionStatus, string> = {
    OPEN: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    INVESTIGATING: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    AUTO_RESOLVED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    HUMAN_REVIEW: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
  };

  const labels: Record<ExceptionStatus, string> = {
    OPEN: 'Open',
    INVESTIGATING: 'Investigating',
    AUTO_RESOLVED: 'Auto-Resolved',
    HUMAN_REVIEW: 'Human Review'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[status] || 'bg-slate-800 text-slate-300 border-slate-700'} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${status === 'AUTO_RESOLVED' ? 'bg-emerald-400' : status === 'HUMAN_REVIEW' ? 'bg-indigo-400' : 'bg-amber-400'}`} />
      {labels[status] || status}
    </span>
  );
};

export const ActionBadge: React.FC<{ action: AuditAction; className?: string }> = ({ action, className = '' }) => {
  const color = 
    action.includes('APPROVED') || action.includes('AUTO_RESOLVED') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
    action.includes('REJECTED') ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
    action.includes('REVIEW') ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
    'bg-slate-800 text-slate-300 border-slate-700';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium border ${color} ${className}`}>
      {action}
    </span>
  );
};
