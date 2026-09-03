import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  AlertOctagon,
  Clock,
  Layers,
  ArrowRight,
  UploadCloud,
  CheckCircle2,
  RotateCw,
  History,
  FileText,
  FileSpreadsheet,
  Sparkles
} from 'lucide-react';
import type { DashboardStats, ExceptionListItem, UploadHistoryItem } from '../../types';
import { useUser } from '../../context/UserContext';
import { StatCard } from '../common/StatCard';
import { FinancialKpiCards } from '../common/FinancialKpiCards';
import { ExceptionTypeBadge, StatusBadge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { getUploadHistory } from '../../services/api';
import { METRIC_LABELS } from '../../constants/metrics';

interface DashboardViewProps {
  stats: DashboardStats | null;
  loading?: boolean;
  onNavigate: (tab: any) => void;
  onSelectException: (id: string) => void;
}

interface FlattenedFileEntry {
  id: string;
  filename: string;
  fileType: 'payments' | 'settlements' | 'fees';
  uploadedAt: string;
  status: string;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  onNavigate,
  onSelectException
}) => {
  const { currentUser } = useUser();
  const [recentUploads, setRecentUploads] = useState<FlattenedFileEntry[]>([]);
  const [loadingUploads, setLoadingUploads] = useState(false);

  const fetchRecentUploads = async () => {
    setLoadingUploads(true);
    try {
      const res = await getUploadHistory(1);
      if (res && res.items && res.items.length > 0) {
        const latestBatch: UploadHistoryItem = res.items[0];
        const timestamp = latestBatch.uploaded_at || new Date().toISOString();
        const files: FlattenedFileEntry[] = [
          {
            id: `${latestBatch.reconciliation_run_id}-payments`,
            filename: latestBatch.payments_filename || 'payments.csv',
            fileType: 'payments',
            uploadedAt: timestamp,
            status: 'Uploaded'
          },
          {
            id: `${latestBatch.reconciliation_run_id}-settlements`,
            filename: latestBatch.settlements_filename || 'settlements.csv',
            fileType: 'settlements',
            uploadedAt: timestamp,
            status: 'Uploaded'
          },
          {
            id: `${latestBatch.reconciliation_run_id}-fees`,
            filename: latestBatch.fees_filename || 'fees.csv',
            fileType: 'fees',
            uploadedAt: timestamp,
            status: 'Uploaded'
          }
        ];
        setRecentUploads(files);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard upload history:', err);
    } finally {
      setLoadingUploads(false);
    }
  };

  useEffect(() => {
    fetchRecentUploads();
  }, [stats?.latest_run_id]);

  if (!currentUser) return null;

  const isAnalyst = currentUser.role === 'OPERATIONS_ANALYST';
  const isManager = currentUser.role === 'RECONCILIATION_MANAGER';

  if (!stats || !stats.has_data) {
    return (
      <div className="space-y-6">
        <EmptyState
          icon={UploadCloud}
          title="No Reconciliation Data Found"
          description={
            isAnalyst
              ? "Upload payment, settlement, and fee batches to start deterministic reconciliation."
              : "No active reconciliation run found. Waiting for Operations Analyst to upload and initiate batch."
          }
          actionText={isAnalyst ? "Upload Initial Batch" : undefined}
          onAction={isAnalyst ? () => onNavigate('upload') : undefined}
        />
      </div>
    );
  }

  // Format percentages cleanly (e.g. 82% or 10.5%)
  const formatPct = (val: number, total: number) => {
    if (total <= 0) return '0%';
    const pct = (val / total) * 100;
    return `${pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(1)}%`;
  };

  const total = stats.total_processed;
  const matched = stats.matched_count;
  const underReview = stats.human_review_count;
  const autoResolved = stats.auto_resolved_count;
  const exceptionsTotal = stats.exceptions_count;
  const openExceptions = Math.max(0, exceptionsTotal - (underReview + autoResolved));

  // Top KPI Card Percentages
  const underReviewKpiPct = exceptionsTotal > 0
    ? Math.round((underReview / exceptionsTotal) * 100)
    : 0;

  const exceptionsKpiPct = total > 0
    ? Math.round((exceptionsTotal / total) * 100)
    : 0;

  // Donut Chart SVG Calculation (Enlarged & Prominent)
  const r = 62;
  const C = 2 * Math.PI * r; // ~389.557
  const sliceSum = matched + underReview + autoResolved + openExceptions;

  const donutSlices = [
    { name: 'Matched', count: matched, color: '#10B981' }, // Emerald-500
    { name: 'Exceptions', count: openExceptions, color: '#F59E0B' }, // Amber-500
    { name: 'Sent for Review', count: underReview, color: '#8B5CF6' }, // Purple-500
    { name: 'Auto-resolved', count: autoResolved, color: '#64748B' } // Slate-500
  ].filter((s) => s.count > 0);

  let cumulativeOffset = 0;

  const formatTimestamp = (dateStr?: string) => {
    if (!dateStr) return 'Just now';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'Recently';
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* 4 KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          label={METRIC_LABELS.TOTAL_RECORDS}
          value={stats.total_processed}
          subtext="Payments processed"
          icon={Layers}
          colorTheme="blue"
        />
        <StatCard
          label={METRIC_LABELS.MATCHED}
          value={stats.matched_count}
          subtext="Successfully reconciled"
          icon={FileCheck2}
          badge={{ text: `${stats.match_rate}%`, variant: 'success' }}
          colorTheme="green"
        />
        <StatCard
          label={METRIC_LABELS.EXCEPTIONS}
          value={stats.exceptions_count}
          subtext="Requires attention"
          icon={AlertOctagon}
          badge={{ text: `${exceptionsKpiPct}%`, variant: 'warning' }}
          colorTheme="amber"
        />
        <StatCard
          label={METRIC_LABELS.UNDER_REVIEW}
          value={stats.human_review_count}
          subtext="In review queue"
          icon={Clock}
          badge={{ text: `${underReviewKpiPct}%`, variant: 'purple' }}
          colorTheme="purple"
        />
      </div>

      {/* Financial KPI Cards */}
      <FinancialKpiCards
        expectedAmount={stats.expected_amount ?? 0}
        settledAmount={stats.settled_amount ?? 0}
        differenceAmount={stats.difference_amount ?? 0}
      />

      {/* Middle Section: 2 Side-by-Side Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Left Card: Latest Reconciliation Run + Embedded Recent Uploads */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between h-full">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <RotateCw className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Latest Reconciliation Run</h3>
              </div>
              {isAnalyst && (
                <button
                  onClick={() => onNavigate('upload')}
                  className="inline-flex items-center space-x-1.5 text-xs font-bold px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm cursor-pointer"
                >
                  <UploadCloud className="h-3.5 w-3.5" />
                  <span>Upload Next Batch</span>
                </button>
              )}
              {isManager && (
                <button
                  onClick={() => onNavigate('reconciliation')}
                  className="inline-flex items-center space-x-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 transition cursor-pointer"
                >
                  <span>View Results</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* 2-Column Content: Run Info on Left, Recent Uploads on Right */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-5">
              {/* Left Column: Essential Run Details */}
              <div className="space-y-4">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Batch ID
                  </span>
                  {/* Interactive Truncated Batch ID with Hover Popover */}
                  <div className="relative group inline-block max-w-[170px] mt-1">
                    <p className="text-xs font-mono font-bold text-blue-600 truncate cursor-pointer hover:text-blue-700 transition">
                      {stats.latest_run_id}
                    </p>
                    {/* Hover Tooltip revealing complete ID */}
                    <div className="absolute left-0 top-full mt-1.5 hidden group-hover:flex items-center z-30 bg-slate-900 text-slate-100 px-3 py-1.5 rounded-lg shadow-xl border border-slate-700 text-[11px] font-mono whitespace-nowrap animate-in fade-in duration-150 pointer-events-none select-all">
                      <span>{stats.latest_run_id}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Status
                  </span>
                  <div className="mt-1">
                    <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span>{stats.run_status || 'Completed'}</span>
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Completed On
                  </span>
                  <p className="text-xs font-medium text-slate-700 mt-1">
                    {formatTimestamp(stats.completed_at || stats.started_at)}
                  </p>
                </div>
              </div>

              {/* Right Column: Embedded Recent Uploads (3 Files) */}
              <div className="bg-slate-50/60 rounded-xl p-3.5 border border-slate-100">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 mb-1">
                  <div className="flex items-center space-x-1.5">
                    <History className="h-3.5 w-3.5 text-slate-600" />
                    <span className="text-xs font-bold text-slate-800">Recent Uploads</span>
                  </div>
                  <button
                    onClick={fetchRecentUploads}
                    disabled={loadingUploads}
                    title="Refresh uploads"
                    className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  >
                    <RotateCw className={`h-3 w-3 ${loadingUploads ? 'animate-spin text-blue-600' : ''}`} />
                  </button>
                </div>

                {recentUploads.length === 0 ? (
                  <div className="py-4 text-center text-[11px] text-slate-400">
                    No uploads available.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {recentUploads.map((file) => (
                      <div key={file.id} className="py-2 flex items-center justify-between">
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div
                            className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                              file.fileType === 'payments'
                                ? 'bg-blue-50 text-blue-600 border border-blue-100'
                                : file.fileType === 'settlements'
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                : 'bg-purple-50 text-purple-600 border border-purple-100'
                            }`}
                          >
                            {file.fileType === 'settlements' ? (
                              <FileSpreadsheet className="h-3.5 w-3.5" />
                            ) : (
                              <FileText className="h-3.5 w-3.5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-slate-800 truncate max-w-[90px]">
                              {file.filename}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium truncate">
                              {formatTimestamp(file.uploadedAt)}
                            </p>
                          </div>
                        </div>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                          {file.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Card: Dynamic Donut Chart & Reconciliation Breakdown */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between h-full">
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              {/* Left Side: Prominent SVG Donut Chart */}
              <div className="sm:col-span-7 flex justify-center items-center relative py-1">
                <svg width="170" height="170" viewBox="0 0 160 160" className="transform -rotate-90">
                  {/* Background Track Circle */}
                  <circle
                    cx="80"
                    cy="80"
                    r={r}
                    fill="transparent"
                    stroke="#F1F5F9"
                    strokeWidth="16"
                  />

                  {/* Mutually Exclusive Colored Slices */}
                  {sliceSum > 0 &&
                    donutSlices.map((slice, idx) => {
                      const strokeLength = (slice.count / sliceSum) * C;
                      const dashArray = `${strokeLength} ${C - strokeLength}`;
                      const dashOffset = -cumulativeOffset;
                      cumulativeOffset += strokeLength;

                      return (
                        <circle
                          key={idx}
                          cx="80"
                          cy="80"
                          r={r}
                          fill="transparent"
                          stroke={slice.color}
                          strokeWidth="16"
                          strokeDasharray={dashArray}
                          strokeDashoffset={dashOffset}
                          className="transition-all duration-700 ease-out"
                        />
                      );
                    })}
                </svg>

                {/* Center Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
                    {stats.match_rate}%
                  </span>
                  <span className="text-xs font-bold text-slate-400 -mt-0.5">Matched</span>
                </div>
              </div>

              {/* Right Side: Compact Legend */}
              <div className="sm:col-span-5 space-y-2.5 text-xs pl-0.5">
                {/* 1. Matched */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 min-w-0">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="font-semibold text-slate-700 truncate">{METRIC_LABELS.MATCHED}</span>
                  </div>
                  <span className="font-mono font-bold text-slate-900 ml-2 shrink-0">
                    {matched} ({formatPct(matched, total)})
                  </span>
                </div>

                {/* 2. Exceptions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 min-w-0">
                    <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                    <span className="font-semibold text-slate-700 truncate">{METRIC_LABELS.EXCEPTIONS}</span>
                  </div>
                  <span className="font-mono font-bold text-slate-900 ml-2 shrink-0">
                    {exceptionsTotal} ({formatPct(exceptionsTotal, total)})
                  </span>
                </div>

                {/* 3. Sent for Review */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 min-w-0">
                    <span className="h-2 w-2 rounded-full bg-purple-500 shrink-0" />
                    <span className="font-semibold text-slate-700 truncate">{METRIC_LABELS.SENT_FOR_REVIEW}</span>
                  </div>
                  <span className="font-mono font-bold text-slate-900 ml-2 shrink-0">
                    {underReview} ({formatPct(underReview, total)})
                  </span>
                </div>

                {/* 4. Auto-resolved */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 min-w-0">
                    <span className="h-2 w-2 rounded-full bg-slate-500 shrink-0" />
                    <span className="font-semibold text-slate-700 truncate">{METRIC_LABELS.AUTO_RESOLVED}</span>
                  </div>
                  <span className="font-mono font-bold text-slate-900 ml-2 shrink-0">
                    {autoResolved} ({formatPct(autoResolved, total)})
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Callout Banner (Subtle & Compact) */}
            <div className="mt-3.5 px-3 py-2 rounded-lg bg-blue-50/50 border border-blue-100/70 flex items-center space-x-2 text-[11px] text-slate-600 font-medium">
              <Sparkles className="h-3.5 w-3.5 text-blue-500 shrink-0" />
              <span>
                {autoResolved > 0
                  ? `${autoResolved} exceptions were auto-resolved by AI with high confidence.`
                  : stats.matched_count > 0
                  ? `Reconciliation completed with ${stats.matched_count} successfully matched records.`
                  : 'Reconciliation overview and exceptions summary.'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Exceptions Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Exceptions</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isManager
                ? 'Flagged financial discrepancies ready for investigation and guardrail review'
                : 'Operational summary of discrepancies flagged during reconciliation'}
            </p>
          </div>
          {isManager && (
            <button
              onClick={() => onNavigate('exceptions')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center space-x-1 cursor-pointer"
            >
              <span>View All Exceptions</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200/80 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-6">Exception ID</th>
                <th className="py-3.5 px-6">Type</th>
                <th className="py-3.5 px-6">Payment Reference</th>
                <th className="py-3.5 px-6 text-right">Amount</th>
                <th className="py-3.5 px-6 text-center">Status</th>
                {isManager && <th className="py-3.5 px-6 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {stats.recent_exceptions.length === 0 ? (
                <tr>
                  <td colSpan={isManager ? 6 : 5} className="py-8 text-center text-slate-500">
                    No exceptions in this batch. All records matched cleanly!
                  </td>
                </tr>
              ) : (
                stats.recent_exceptions.map((exc: ExceptionListItem) => (
                  <tr key={exc.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-4 px-6 font-mono font-bold text-slate-900">{exc.id}</td>
                    <td className="py-4 px-6">
                      <ExceptionTypeBadge type={exc.exception_type} />
                    </td>
                    <td className="py-4 px-6 font-mono text-slate-600">{exc.source_reference || 'N/A'}</td>
                    <td className="py-4 px-6 text-right font-mono font-bold text-slate-900">
                      ₹{exc.payment_amount ? exc.payment_amount.toFixed(2) : '--'}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <StatusBadge status={exc.status} decision={exc.decision} />
                    </td>
                    {isManager && (
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => onSelectException(exc.id)}
                          className="px-3 py-1 rounded-lg text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 transition cursor-pointer whitespace-nowrap"
                        >
                          Verify Details
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

