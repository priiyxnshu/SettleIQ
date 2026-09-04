import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  CheckCircle2,
  X
} from 'lucide-react';
import type { ExceptionListItem } from '../../types';
import { getExceptions } from '../../services/api';
import { ExceptionTypeBadge, StatusBadge } from '../common/Badge';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';

interface ExceptionsViewProps {
  onSelectException: (id: string) => void;
  runId?: string;
  refreshKey?: number;
  isInvestigated?: boolean;
}

const PAGE_SIZE = 10;

export const ExceptionsView: React.FC<ExceptionsViewProps> = ({
  onSelectException,
  runId,
  refreshKey,
  isInvestigated
}) => {
  const [exceptions, setExceptions] = useState<ExceptionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [typeOpen, setTypeOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  const typeDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(e.target as Node)) {
        setTypeOpen(false);
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setStatusOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchExceptions = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { limit: 500 };
      if (runId) params.reconciliation_run_id = runId;
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
  }, [runId, refreshKey, selectedType, selectedStatus]);

  // Reset to first page when run, search, or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [runId, searchQuery, selectedType, selectedStatus]);

  const filteredExceptions = exceptions.filter((exc) => {
    // Dynamic status filtering for HUMAN_APPROVED vs AUTO_RESOLVED
    if (selectedStatus === 'HUMAN_APPROVED') {
      const isApproved =
        exc.status === 'AUTO_RESOLVED' &&
        exc.decision?.decision_outcome === 'APPROVED';
      if (!isApproved) return false;
    } else if (selectedStatus === 'AUTO_RESOLVED') {
      const isAuto =
        exc.status === 'AUTO_RESOLVED' &&
        exc.decision?.decision_outcome !== 'APPROVED';
      if (!isAuto) return false;
    }

    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      exc.id.toLowerCase().includes(query) ||
      (exc.source_reference && exc.source_reference.toLowerCase().includes(query)) ||
      (exc.customer_reference && exc.customer_reference.toLowerCase().includes(query))
    );
  });

  // Pagination calculation
  const totalItems = filteredExceptions.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalItems);
  const paginatedExceptions = filteredExceptions.slice(startIndex, endIndex);

  // Canonical Types (remain independent from status)
  const canonicalTypes: { id: string; label: string }[] = [
    { id: 'ALL', label: 'All Types' },
    { id: 'AMOUNT_MISMATCH', label: 'Amount Mismatch' },
    { id: 'MISSING_SETTLEMENT', label: 'Missing Settlement' },
    { id: 'DUPLICATE', label: 'Duplicate' },
    { id: 'REFERENCE_MISMATCH', label: 'Reference Mismatch' },
    { id: 'UNKNOWN', label: 'Unknown' }
  ];

  // Determine if the batch has undergone AI Investigation & Guardrails
  const isBatchInvestigated = isInvestigated !== undefined
    ? isInvestigated
    : exceptions.some((e) => e.status === 'HUMAN_REVIEW' || e.status === 'AUTO_RESOLVED' || e.status === 'REJECTED');

  // Dynamic status filters based on lifecycle:
  // Before AI Investigation: All Statuses | Awaiting Investigation
  // After AI Investigation: All Statuses | Needs Review | Human Approved | Auto-Resolved | Rejected / Disputed
  const statusFilters: { id: string; label: string }[] = isBatchInvestigated
    ? [
        { id: 'ALL', label: 'All Statuses' },
        { id: 'HUMAN_REVIEW', label: 'Needs Review' },
        { id: 'HUMAN_APPROVED', label: 'Human Approved' },
        { id: 'AUTO_RESOLVED', label: 'Auto-Resolved' },
        { id: 'REJECTED', label: 'Rejected / Disputed' }
      ]
    : [
        { id: 'ALL', label: 'All Statuses' },
        { id: 'OPEN', label: 'Awaiting Investigation' }
      ];

  const currentTypeLabel = canonicalTypes.find((t) => t.id === selectedType)?.label || 'All Types';
  const currentStatusOption = statusFilters.find((s) => s.id === selectedStatus);
  const currentStatusLabel = currentStatusOption
    ? (selectedStatus === 'ALL' ? 'All' : currentStatusOption.label)
    : 'All';

  // Automatically reset status if the active filter is invalid under the current lifecycle
  useEffect(() => {
    if (selectedStatus !== 'ALL' && !statusFilters.some((s) => s.id === selectedStatus)) {
      setSelectedStatus('ALL');
    }
  }, [isBatchInvestigated, statusFilters, selectedStatus]);

  const hasActiveFilters = selectedType !== 'ALL' || selectedStatus !== 'ALL' || searchQuery.trim() !== '';

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Compact Horizontal Filters Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="h-4 w-4 absolute left-3.5 top-2.5 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search by Exception ID or Payment Reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50/50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 transition"
            />
          </div>

          {/* Compact Dropdown Controls */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* Type Dropdown */}
            <div className="relative" ref={typeDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setTypeOpen((prev) => !prev);
                  setStatusOpen(false);
                }}
                className={`inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer select-none ${
                  selectedType !== 'ALL'
                    ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/80 shadow-2xs'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700/60 shadow-2xs'
                }`}
              >
                <span className="text-slate-500 dark:text-slate-400 font-normal">Type:</span>
                <span>{selectedType === 'ALL' ? 'All' : currentTypeLabel}</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-150 ${typeOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`} />
              </button>

              {typeOpen && (
                <div className="absolute right-0 sm:left-0 sm:right-auto mt-1.5 w-48 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-lg dark:shadow-2xl py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
                  {canonicalTypes.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setSelectedType(t.id);
                        setTypeOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 text-xs transition cursor-pointer flex items-center justify-between ${
                        selectedType === t.id
                          ? 'bg-blue-50 text-blue-700 font-bold dark:bg-blue-950/60 dark:text-blue-300'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium'
                      }`}
                    >
                      <span>{t.label}</span>
                      {selectedType === t.id && <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Status Dropdown */}
            <div className="relative" ref={statusDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setStatusOpen((prev) => !prev);
                  setTypeOpen(false);
                }}
                className={`inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer select-none ${
                  selectedStatus !== 'ALL'
                    ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/80 shadow-2xs'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700/60 shadow-2xs'
                }`}
              >
                <span className="text-slate-500 dark:text-slate-400 font-normal">Status:</span>
                <span>{selectedStatus === 'ALL' ? 'All' : currentStatusLabel}</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-150 ${statusOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`} />
              </button>

              {statusOpen && (
                <div className="absolute right-0 mt-1.5 w-44 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-lg dark:shadow-2xl py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
                  {statusFilters.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setSelectedStatus(s.id);
                        setStatusOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 text-xs transition cursor-pointer flex items-center justify-between ${
                        selectedStatus === s.id
                          ? 'bg-blue-50 text-blue-700 font-bold dark:bg-blue-950/60 dark:text-blue-300'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium'
                      }`}
                    >
                      <span>{s.label}</span>
                      {selectedStatus === s.id && <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Clear Filters (visible when active) */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setSelectedType('ALL');
                  setSelectedStatus('ALL');
                  setSearchQuery('');
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Reset all filters"
              >
                <X className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                <span>Clear Filters</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Exception Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16">
            <LoadingSpinner message="Fetching exceptions..." />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-rose-500">{error}</div>
        ) : filteredExceptions.length === 0 ? (
          <div className="py-16">
            {selectedStatus === 'AUTO_RESOLVED' ? (
              <div className="text-center py-10 px-4 animate-in fade-in duration-200">
                <div className="inline-flex p-3.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60 mb-3 shadow-xs">
                  <CheckCircle2 className="h-6 w-6 stroke-[2]" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Auto-Resolved Exceptions</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
                  No exceptions in this reconciliation have been automatically resolved.
                </p>
              </div>
            ) : (
              <EmptyState
                icon={AlertTriangle}
                title="No Matching Exceptions Found"
                description="No exceptions matched the selected filter criteria."
              />
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200/80 dark:border-slate-800 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3.5 px-6">Exception ID</th>
                    <th className="py-3.5 px-6">Type</th>
                    <th className="py-3.5 px-6">Source Reference</th>
                    <th className="py-3.5 px-6 text-right">Payment Amount</th>
                    <th className="py-3.5 px-6 text-center">Status</th>
                    <th className="py-3.5 px-6">Detected At</th>
                    <th className="py-3.5 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {paginatedExceptions.map((exc) => (
                    <tr key={exc.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition">
                      <td className="py-3.5 px-6 font-mono font-bold text-slate-900 dark:text-slate-100">{exc.id}</td>
                      <td className="py-3.5 px-6">
                        <ExceptionTypeBadge type={exc.exception_type} />
                      </td>
                      <td className="py-3.5 px-6 font-mono text-slate-600 dark:text-slate-400">{exc.source_reference || 'N/A'}</td>
                      <td className="py-3.5 px-6 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        ₹{exc.payment_amount ? exc.payment_amount.toFixed(2) : '--'}
                      </td>
                      <td className="py-3.5 px-6 text-center">
                        <StatusBadge status={exc.status} decision={exc.decision} />
                      </td>
                      <td className="py-3.5 px-6 text-slate-500 dark:text-slate-400 font-medium">
                        {new Date(exc.detected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <button
                          onClick={() => onSelectException(exc.id)}
                          className="px-3 py-1 rounded-lg text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 dark:text-blue-300 dark:border-blue-800/60 transition cursor-pointer whitespace-nowrap"
                        >
                          Verify Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Showing <span className="font-bold text-slate-900 dark:text-slate-100">{totalItems > 0 ? startIndex + 1 : 0}</span>–<span className="font-bold text-slate-900 dark:text-slate-100">{endIndex}</span> of <span className="font-bold text-slate-900 dark:text-slate-100">{totalItems}</span> exceptions
              </div>

              {totalPages > 1 && (
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer shadow-2xs"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <span>Previous</span>
                  </button>

                  {/* Numbered Page Buttons */}
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`h-8 w-8 rounded-lg text-xs font-bold transition cursor-pointer ${
                          currentPage === page
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer shadow-2xs"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
