import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronRight
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

  const filteredLogs = logs.filter((log) => {
    if (!searchEntity.trim()) return true;
    const q = searchEntity.toLowerCase();
    return (
      log.entity_id.toLowerCase().includes(q) ||
      (log.user_id && log.user_id.toLowerCase().includes(q)) ||
      log.action_type.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">System & Human Audit Logs</h2>
          <p className="text-xs text-slate-400 mt-1">
            Immutable chronological audit records of every reconciliation, AI investigation, guardrail, and operator action.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center space-x-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search by Entity ID, Action, or Actor..."
              value={searchEntity}
              onChange={(e) => setSearchEntity(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <div className="flex items-center space-x-1.5 overflow-x-auto">
            {auditActions.map((a) => (
              <button
                key={a.id}
                onClick={() => setSelectedAction(a.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  selectedAction === a.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <LoadingSpinner message="Loading audit trail..." />
        ) : error ? (
          <div className="p-8 text-center text-xs text-rose-400">{error}</div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={FileText}
              title="No Audit Logs Found"
              description="No audit logs matched the selected filter criteria."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/60 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-6">Timestamp</th>
                  <th className="py-3 px-6">Action</th>
                  <th className="py-3 px-6">Entity</th>
                  <th className="py-3 px-6">Actor / User</th>
                  <th className="py-3 px-6 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  return (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-slate-900/30 transition">
                        <td className="py-3.5 px-6 font-mono text-slate-400 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-6 whitespace-nowrap">
                          <ActionBadge action={log.action_type} />
                        </td>
                        <td className="py-3.5 px-6 font-mono text-white whitespace-nowrap">
                          <span className="text-slate-500 font-sans text-[10px] mr-1.5 uppercase font-bold">{log.entity_type}</span>
                          {log.entity_id}
                        </td>
                        <td className="py-3.5 px-6 text-slate-400">
                          {log.user_id || 'System'}
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <button
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="px-2.5 py-1 rounded text-xs font-mono text-slate-400 hover:text-white bg-slate-900 border border-slate-800 transition inline-flex items-center space-x-1"
                          >
                            <span>{isExpanded ? 'Hide' : 'Inspect'}</span>
                            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-900/40">
                          <td colSpan={5} className="py-4 px-6 font-mono text-xs text-indigo-300">
                            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 overflow-x-auto">
                              <pre>{typeof log.details === 'object' ? JSON.stringify(log.details, null, 2) : log.details || 'No additional details logged'}</pre>
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
