import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  ChevronDown,
  ChevronRight,
  UserCheck,
  Server,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Code,
  MessageSquare
} from 'lucide-react';
import type { AuditLogItem } from '../../types';
import { getAuditLogs } from '../../services/api';
import { ActionBadge } from '../common/Badge';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedAction, setSelectedAction] = useState<string>('ALL');
  const [searchEntity, setSearchEntity] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [showRawJsonMap, setShowRawJsonMap] = useState<Record<string, boolean>>({});

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { limit: 150 };
      if (selectedAction !== 'ALL') params.action_type = selectedAction;
      if (searchEntity.trim()) params.entity_id = searchEntity.trim();

      const res = await getAuditLogs(params);
      setLogs(res.items);
    } catch (err: any) {
      setError(err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedAction]);

  const auditActions: { id: string; label: string }[] = [
    { id: 'ALL', label: 'All Actions' },
    { id: 'FILE_UPLOADED', label: 'File Uploaded' },
    { id: 'RECONCILIATION_COMPLETED', label: 'Reconciliation Completed' },
    { id: 'AUTO_RESOLVED', label: 'Auto-Resolved' },
    { id: 'SENT_TO_REVIEW', label: 'Sent to Review' },
    { id: 'HUMAN_APPROVED', label: 'Human Approved' },
    { id: 'HUMAN_REJECTED', label: 'Human Rejected' }
  ];

  const getPerformedBy = (log: AuditLogItem): string => {
    if (log.details && typeof log.details === 'object' && log.details.decided_by) {
      return String(log.details.decided_by);
    }
    if (log.user_id) {
      return log.user_id;
    }
    return 'System';
  };

  const toggleRawJson = (id: string) => {
    setShowRawJsonMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredLogs = logs.filter((log) => {
    if (!searchEntity.trim()) return true;
    const q = searchEntity.toLowerCase();
    const performedBy = getPerformedBy(log).toLowerCase();
    return (
      log.entity_id.toLowerCase().includes(q) ||
      performedBy.includes(q) ||
      log.action_type.toLowerCase().includes(q)
    );
  });

  const renderStructuredDetails = (log: AuditLogItem) => {
    const d = log.details;
    if (!d || typeof d !== 'object') {
      return (
        <div className="text-xs text-slate-600 italic">
          {String(d || 'No additional details recorded for this event.')}
        </div>
      );
    }

    // 1. HUMAN_APPROVED / HUMAN_REJECTED / SENT_TO_REVIEW (human action)
    if (
      log.action_type === 'HUMAN_APPROVED' ||
      log.action_type === 'HUMAN_REJECTED' ||
      d.action === 'KEEP_UNRESOLVED'
    ) {
      const isApproved = log.action_type === 'HUMAN_APPROVED';
      const isRejected = log.action_type === 'HUMAN_REJECTED';

      return (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Reviewer</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{d.decided_by || 'Unknown Reviewer'}</span>
            </div>

            <div className="bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Decision Outcome</span>
              <span
                className={`font-semibold ${
                  isApproved
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : isRejected
                    ? 'text-rose-700 dark:text-rose-400'
                    : 'text-purple-700 dark:text-purple-400'
                }`}
              >
                {d.decision_outcome || d.action || 'REVIEWED'}
              </span>
            </div>

            {d.new_status && (
              <div className="bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">New Status</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{d.new_status}</span>
              </div>
            )}
          </div>

          {d.notes && (
            <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-2xs flex items-start space-x-2.5">
              <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Reviewer Notes</span>
                <p className="text-xs text-slate-800 dark:text-slate-200 font-medium">{d.notes}</p>
              </div>
            </div>
          )}
        </div>
      );
    }

    // 2. AUTO_RESOLVED or SENT_TO_REVIEW (Guardrails)
    if (d.reason || d.checks) {
      const isResolved = log.action_type === 'AUTO_RESOLVED';
      const checks = d.checks || {};
      const checkNames: Record<string, string> = {
        recommendation_valid: 'Recommendation Valid',
        confidence_passed: 'Confidence >= 90%',
        evidence_grounded: 'Evidence Grounded',
        known_rule_satisfied: 'Known Policy Rule Satisfied',
        sanity_passed: 'Financial Sanity Check'
      };

      return (
        <div className="space-y-3">
          {d.reason && (
            <div
              className={`p-3 rounded-xl border flex items-start space-x-2.5 ${
                isResolved
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950 dark:bg-emerald-950/40 dark:border-emerald-800/60 dark:text-emerald-200'
                  : 'bg-amber-50/70 border-amber-200 text-amber-950 dark:bg-amber-950/40 dark:border-amber-800/60 dark:text-amber-200'
              }`}
            >
              {isResolved ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="text-xs space-y-0.5">
                <span className="text-[10px] uppercase font-bold opacity-75 block">System Evaluation Rationale</span>
                <p className="font-medium leading-relaxed">{d.reason}</p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 text-xs">
            {d.confidence !== undefined && (
              <div className="bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">AI Confidence</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {typeof d.confidence === 'number' ? `${(d.confidence * 100).toFixed(0)}%` : d.confidence}
                </span>
              </div>
            )}

            {d.ai_recommendation && (
              <div className="bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Recommendation</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{d.ai_recommendation}</span>
              </div>
            )}
          </div>

          {Object.keys(checks).length > 0 && (
            <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-2xs space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Deterministic Guardrail Rules</span>
              <div className="flex flex-wrap gap-2">
                {Object.entries(checks).map(([key, val]) => (
                  <span
                    key={key}
                    className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                      val
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60'
                        : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60'
                    }`}
                  >
                    {val ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    <span>{checkNames[key] || key}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    // 3. FILE_UPLOADED
    if (log.action_type === 'FILE_UPLOADED' || d.payments_count !== undefined) {
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Payments Ingested</span>
              <span className="text-base font-bold text-slate-900 dark:text-slate-100">{d.payments_count ?? '—'}</span>
            </div>
            <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Settlements Ingested</span>
              <span className="text-base font-bold text-slate-900 dark:text-slate-100">{d.settlements_count ?? '—'}</span>
            </div>
            <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Fee Records</span>
              <span className="text-base font-bold text-slate-900 dark:text-slate-100">{d.fees_count ?? '—'}</span>
            </div>
          </div>

          {Array.isArray(d.files) && d.files.length > 0 && (
            <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-2xs flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Uploaded Files:</span>
              {d.files.map((f: string, i: number) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 font-mono text-[11px] border border-slate-200 dark:border-slate-600"
                >
                  {f}
                </span>
              ))}
            </div>
          )}
        </div>
      );
    }

    // 4. RECONCILIATION_COMPLETED
    if (log.action_type === 'RECONCILIATION_COMPLETED' || d.match_rate !== undefined) {
      const breakdown = d.breakdown || {};
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Match Rate</span>
              <span className="text-base font-bold text-blue-600 dark:text-blue-400">{d.match_rate ?? '—'}</span>
            </div>
            <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Total Records</span>
              <span className="text-base font-bold text-slate-900 dark:text-slate-100">{d.total_records ?? '—'}</span>
            </div>
            <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Matched</span>
              <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">{d.matched_records ?? '—'}</span>
            </div>
            <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Exceptions Flagged</span>
              <span className="text-base font-bold text-amber-600 dark:text-amber-400">{d.exceptions_count ?? '—'}</span>
            </div>
          </div>

          {Object.keys(breakdown).length > 0 && (
            <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-2xs space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Exception Distribution</span>
              <div className="flex flex-wrap gap-2">
                {Object.entries(breakdown).map(([type, count]) => (
                  <span
                    key={type}
                    className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                  >
                    <span>{type}:</span>
                    <strong className="text-slate-900 dark:text-slate-100">{String(count)}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    // 5. Generic / Fallback key-value presentation
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
        {Object.entries(d).map(([key, value]) => {
          if (value === null || value === undefined) return null;
          return (
            <div key={key} className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs text-xs">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">
                {key.replace(/_/g, ' ')}
              </span>
              <span className="font-semibold text-slate-900 dark:text-slate-100 truncate block">
                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Filters Bar - Compact */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl px-3 py-1.5 shadow-2xs">
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-2.5">
          <div className="relative w-full xl:w-72 shrink-0">
            <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Entity, Action, or Performed By..."
              value={searchEntity}
              onChange={(e) => setSearchEntity(e.target.value)}
              className="w-full bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 focus:ring-1 focus:ring-blue-500 transition"
            />
          </div>

          {/* Action Filter Pills */}
          <div className="flex items-center space-x-1.5 overflow-x-auto py-0.5">
            {auditActions.map((a) => (
              <button
                key={a.id}
                onClick={() => setSelectedAction(a.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  selectedAction === a.id
                    ? 'bg-blue-600 text-white shadow-2xs border border-blue-600'
                    : 'bg-slate-50 hover:bg-slate-100/80 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Audit Logs Table Card - Contained Vertical Scroll */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs flex flex-col">
        {loading ? (
          <LoadingSpinner message="Loading audit trail..." />
        ) : error ? (
          <div className="p-8 text-center text-xs font-medium text-rose-600 dark:text-rose-400">{error}</div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={FileText}
              title="No Audit Logs Found"
              description="No audit records matched the selected filter criteria."
            />
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-230px)] min-h-[300px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/95 dark:bg-slate-800/90 sticky top-0 z-10 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200/80 dark:border-slate-800 uppercase tracking-wider text-[11px] backdrop-blur-xs">
                <tr>
                  <th className="py-3 px-5">Timestamp</th>
                  <th className="py-3 px-5">Action</th>
                  <th className="py-3 px-5">Exception / Entity</th>
                  <th className="py-3 px-5">Performed By</th>
                  <th className="py-3 px-5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {filteredLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  const performedBy = getPerformedBy(log);

                  return (
                    <React.Fragment key={log.id}>
                      <tr className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition ${isExpanded ? 'bg-slate-50/50 dark:bg-slate-800/30' : ''}`}>
                        <td className="py-3.5 px-5 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap text-xs">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-5 whitespace-nowrap">
                          <ActionBadge action={log.action_type} />
                        </td>
                        <td className="py-3.5 px-5 font-mono text-slate-900 dark:text-slate-100 whitespace-nowrap text-xs">
                          <span className="text-slate-400 dark:text-slate-500 font-sans text-[10px] mr-1.5 uppercase font-bold tracking-wider">
                            {log.entity_type}
                          </span>
                          {log.entity_id}
                        </td>
                        <td className="py-3.5 px-5 text-xs whitespace-nowrap">
                          <div className="flex items-center space-x-1.5">
                            {performedBy === 'System' ? (
                              <span className="inline-flex items-center text-slate-500 dark:text-slate-400">
                                <Server className="h-3.5 w-3.5 mr-1 text-slate-400 dark:text-slate-500" />
                                System
                              </span>
                            ) : (
                              <span className="inline-flex items-center font-semibold text-slate-900 dark:text-slate-100">
                                <UserCheck className="h-3.5 w-3.5 mr-1 text-blue-600 dark:text-blue-400" />
                                {performedBy}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border shadow-2xs transition inline-flex items-center space-x-1 cursor-pointer ${
                              isExpanded
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700'
                                : 'bg-white hover:bg-slate-50 dark:bg-slate-800/80 dark:hover:bg-slate-700 dark:text-slate-300 text-slate-700 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <span>{isExpanded ? 'Hide' : 'Inspect'}</span>
                            {isExpanded ? (
                              <ChevronDown className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Structured Audit Details Drawer */}
                      {isExpanded && (
                        <tr className="bg-slate-50/60 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800">
                          <td colSpan={5} className="py-4 px-6">
                            <div className="bg-slate-50/80 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-3">
                              {/* Structured Presentation */}
                              {renderStructuredDetails(log)}

                              {/* Secondary Collapsible Raw JSON Option */}
                              <div className="pt-2 flex items-center justify-end border-t border-slate-200/60 dark:border-slate-800">
                                <button
                                  type="button"
                                  onClick={() => toggleRawJson(log.id)}
                                  className="inline-flex items-center space-x-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
                                >
                                  <Code className="h-3 w-3" />
                                  <span>{showRawJsonMap[log.id] ? 'Hide Raw JSON' : 'View Raw JSON'}</span>
                                </button>
                              </div>

                              {showRawJsonMap[log.id] && (
                                <div className="bg-slate-900 text-slate-200 p-3.5 rounded-xl font-mono text-[11px] overflow-x-auto border border-slate-800 animate-in fade-in duration-150">
                                  <pre>
                                    {typeof log.details === 'object'
                                      ? JSON.stringify(log.details, null, 2)
                                      : log.details || 'No details'}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
