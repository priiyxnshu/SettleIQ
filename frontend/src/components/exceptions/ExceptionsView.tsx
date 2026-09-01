import React, { useState, useEffect } from 'react';
import {
  Search,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import type { ExceptionListItem } from '../../types';
import { getExceptions } from '../../services/api';
import { ExceptionTypeBadge, StatusBadge } from '../common/Badge';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';

interface ExceptionsViewProps {
  onSelectException: (id: string) => void;
}

export const ExceptionsView: React.FC<ExceptionsViewProps> = ({
  onSelectException
}) => {
  const [exceptions, setExceptions] = useState<ExceptionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchExceptions = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { limit: 200 };
      if (selectedType !== 'ALL') params.exception_type = selectedType;
      if (selectedStatus !== 'ALL') params.status = selectedStatus;

      const res = await getExceptions(params);
      setExceptions(res.items);
    } catch (err: any) {
      setError(err.message || 'Failed to load exceptions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExceptions();
  }, [selectedType, selectedStatus]);

  const filteredExceptions = exceptions.filter((exc) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      exc.id.toLowerCase().includes(query) ||
      (exc.source_reference && exc.source_reference.toLowerCase().includes(query)) ||
      (exc.customer_reference && exc.customer_reference.toLowerCase().includes(query))
    );
  });

  const canonicalTypes: { id: string; label: string }[] = [
    { id: 'ALL', label: 'All Types' },
    { id: 'AMOUNT_MISMATCH', label: 'Amount Mismatch' },
    { id: 'MISSING_SETTLEMENT', label: 'Missing Settlement' },
    { id: 'DUPLICATE', label: 'Duplicate' },
    { id: 'REFERENCE_MISMATCH', label: 'Ref Mismatch' },
    { id: 'UNKNOWN', label: 'Unknown' }
  ];

  const statusFilters: { id: string; label: string }[] = [
    { id: 'ALL', label: 'All Statuses' },
    { id: 'OPEN', label: 'Open' },
    { id: 'AUTO_RESOLVED', label: 'Auto-Resolved' },
    { id: 'HUMAN_REVIEW', label: 'Human Review' }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Reconciliation Exceptions</h2>
          <p className="text-xs text-slate-400 mt-1">
            Browse and inspect flagged anomalies across all reconciliation runs.
          </p>
        </div>
        <button
          onClick={fetchExceptions}
          className="flex items-center space-x-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          <span>Refresh List</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search by Exception ID or Payment Reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center space-x-1.5 overflow-x-auto">
            {statusFilters.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedStatus(s.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  selectedStatus === s.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Canonical Type Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pt-2 border-t border-slate-900">
          <span className="text-xs text-slate-500 font-medium mr-2">Type:</span>
          {canonicalTypes.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedType(t.id)}
              className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition ${
                selectedType === t.id
                  ? 'bg-slate-800 text-indigo-300 border border-indigo-500/40 font-semibold'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-300 border border-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Exception Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <LoadingSpinner message="Fetching exceptions..." />
        ) : error ? (
          <div className="p-8 text-center text-xs text-rose-400">{error}</div>
        ) : filteredExceptions.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={AlertTriangle}
              title="No Matching Exceptions Found"
              description="No exceptions matched the selected filter criteria."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/60 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-6">Exception ID</th>
                  <th className="py-3 px-6">Type</th>
                  <th className="py-3 px-6">Source Reference</th>
                  <th className="py-3 px-6 text-right">Payment Amount</th>
                  <th className="py-3 px-6 text-center">Status</th>
                  <th className="py-3 px-6">Detected At</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredExceptions.map((exc) => (
                  <tr key={exc.id} className="hover:bg-slate-900/30 transition">
                    <td className="py-3.5 px-6 font-mono font-medium text-white">{exc.id}</td>
                    <td className="py-3.5 px-6">
                      <ExceptionTypeBadge type={exc.exception_type} />
                    </td>
                    <td className="py-3.5 px-6 font-mono text-slate-400">{exc.source_reference || 'N/A'}</td>
                    <td className="py-3.5 px-6 text-right font-mono font-semibold text-white">
                      ₹{exc.payment_amount ? exc.payment_amount.toFixed(2) : '--'}
                    </td>
                    <td className="py-3.5 px-6 text-center">
                      <StatusBadge status={exc.status} />
                    </td>
                    <td className="py-3.5 px-6 text-slate-500">
                      {new Date(exc.detected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <button
                        onClick={() => onSelectException(exc.id)}
                        className="px-3 py-1 rounded text-xs font-semibold text-indigo-400 hover:text-white hover:bg-indigo-600/20 border border-indigo-500/30 transition"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
