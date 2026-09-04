import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  AlertOctagon,
  Clock,
  Layers,
  UploadCloud,
  CheckCircle2,
  RotateCw,
  Copy,
  Check
} from 'lucide-react';
import type { DashboardStats, UploadHistoryItem } from '../../types';
import { useUser } from '../../context/UserContext';
import { StatCard } from '../common/StatCard';
import { FinancialKpiCards } from '../common/FinancialKpiCards';
import { EmptyState } from '../common/EmptyState';
import { getUploadHistory } from '../../services/api';
import { METRIC_LABELS } from '../../constants/metrics';

interface DashboardViewProps {
  stats: DashboardStats | null;
  loading?: boolean;
  onNavigate: (tab: any) => void;
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
  onNavigate
}) => {
  const { currentUser } = useUser();
  const [recentUploads, setRecentUploads] = useState<FlattenedFileEntry[]>([]);
  const [loadingUploads, setLoadingUploads] = useState(false);
  const [copiedBatchId, setCopiedBatchId] = useState(false);

  const handleCopyBatchId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedBatchId(true);
    setTimeout(() => setCopiedBatchId(false), 2000);
  };

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

  // Top KPI Card Percentages
  const underReviewKpiPct = exceptionsTotal > 0
    ? Math.round((underReview / exceptionsTotal) * 100)
    : 0;

  const exceptionsKpiPct = total > 0
    ? Math.round((exceptionsTotal / total) * 100)
    : 0;

  // Multi-Ring Reconciliation Status Rings (Semantic Colors)
  const statusRings = [
    { name: METRIC_LABELS.MATCHED, count: matched, color: '#10B981', r: 58, strokeWidth: 5 },
    { name: METRIC_LABELS.EXCEPTIONS, count: exceptionsTotal, color: '#F59E0B', r: 50, strokeWidth: 5 },
    { name: METRIC_LABELS.SENT_FOR_REVIEW, count: underReview, color: '#8B5CF6', r: 42, strokeWidth: 5 },
    { name: METRIC_LABELS.AUTO_RESOLVED, count: autoResolved, color: '#64748B', r: 34, strokeWidth: 5 }
  ];

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
    <div className="space-y-3 sm:space-y-3.5 animate-in fade-in duration-200">
      {/* 4 KPI Cards Grid (Compact Single Viewport Top Row) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
        <StatCard
          label={METRIC_LABELS.TOTAL_RECORDS}
          value={stats.total_processed}
          icon={Layers}
          colorTheme="blue"
        />
        <StatCard
          label={METRIC_LABELS.MATCHED}
          value={stats.matched_count}
          icon={FileCheck2}
          badge={{ text: `${stats.match_rate}%`, variant: 'success' }}
          colorTheme="green"
        />
        <StatCard
          label={METRIC_LABELS.EXCEPTIONS}
          value={stats.exceptions_count}
          icon={AlertOctagon}
          badge={{ text: `${exceptionsKpiPct}%`, variant: 'warning' }}
          colorTheme="amber"
        />
        <StatCard
          label={METRIC_LABELS.UNDER_REVIEW}
          value={stats.human_review_count}
          icon={Clock}
          badge={{ text: `${underReviewKpiPct}%`, variant: 'purple' }}
          colorTheme="purple"
        />
      </div>

      {/* Middle Section: 2 Side-by-Side Cards (~60% of Viewport) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-3.5 items-stretch">
        {/* Left Card: Latest Reconciliation Run + Embedded Recent Uploads */}
        <article className="neu-extruded rounded-xl p-3.5 sm:p-4 flex flex-col justify-between h-full">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-300/60 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg neu-extruded-sm flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <RotateCw className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100">
                  Latest Reconciliation Run
                </h3>
              </div>
              {isAnalyst && (
                <button
                  onClick={() => onNavigate('upload')}
                  className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm cursor-pointer"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload Next Batch</span>
                </button>
              )}
              {isManager && (
                <button
                  onClick={() => onNavigate('reconciliation')}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 group cursor-pointer"
                >
                  <span>View Results</span>
                  <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                </button>
              )}
            </div>

            {/* 2-Column Content: Run Details on Left, Recent Uploads on Right */}
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Left Column: Metadata */}
              <div className="space-y-2.5">
                <div>
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Batch ID
                  </span>
                  <div className="neu-inset-subtle p-2 rounded-lg mt-1 flex items-center justify-between border border-white/40 dark:border-white/10">
                    <span
                      className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400 truncate max-w-[140px]"
                      title={stats.latest_run_id}
                    >
                      {stats.latest_run_id}
                    </span>
                    <button
                      onClick={() => handleCopyBatchId(stats.latest_run_id || '')}
                      aria-label="Copy Batch ID"
                      title="Copy Batch ID"
                      className="neu-extruded-btn p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                    >
                      {copiedBatchId ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Status
                  </span>
                  <div className="mt-1 flex items-center">
                    <span className="neu-extruded-sm px-2.5 py-0.5 rounded-full text-xs font-extrabold text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800/60">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>{stats.run_status || 'COMPLETED'}</span>
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Completed On
                  </span>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {formatTimestamp(stats.completed_at || stats.started_at)}
                  </p>
                </div>
              </div>

              {/* Right Column: Recent Uploads Box */}
              <div className="neu-inset-subtle p-2.5 rounded-xl border border-white/50 dark:border-white/10 space-y-1.5">
                <div className="flex items-center justify-between pb-1 border-b border-slate-300/50 dark:border-slate-800">
                  <span className="text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300">
                    Recent Uploads
                  </span>
                  <button
                    onClick={fetchRecentUploads}
                    disabled={loadingUploads}
                    title="Refresh uploads"
                    className="neu-extruded-btn p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${loadingUploads ? 'animate-spin text-blue-600' : ''}`} />
                  </button>
                </div>

                {recentUploads.length === 0 ? (
                  <div className="py-3 text-center text-[11px] text-slate-400 dark:text-slate-500">
                    No uploads available.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {recentUploads.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between bg-white/40 dark:bg-slate-900/40 p-1.5 rounded-lg text-xs"
                      >
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          <span
                            className={`w-5 h-5 rounded neu-extruded-sm flex items-center justify-center shrink-0 text-[9px] font-extrabold ${
                              file.fileType === 'payments'
                                ? 'text-blue-600 dark:text-blue-400'
                                : file.fileType === 'settlements'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-purple-600 dark:text-purple-400'
                            }`}
                          >
                            CSV
                          </span>
                          <div className="truncate">
                            <p className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[95px] text-[11px]">
                              {file.filename}
                            </p>
                            <p className="text-[9px] text-slate-500 dark:text-slate-400 truncate">
                              {formatTimestamp(file.uploadedAt)}
                            </p>
                          </div>
                        </div>
                        <span className="neu-inset-pill px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-700 dark:text-emerald-300 rounded shrink-0">
                          {file.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </article>

        {/* Right Card: Multi-Ring Reconciliation Overview & Breakdown */}
        <article className="neu-extruded rounded-xl p-3.5 sm:p-4 flex flex-col justify-between h-full">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-300/60 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg neu-extruded-sm flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <AlertOctagon className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100">
                  Exception Overview
                </h3>
              </div>
              <button
                onClick={() => onNavigate('exceptions')}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 group cursor-pointer"
              >
                <span>View All Exceptions</span>
                <span className="group-hover:translate-x-0.5 transition-transform">→</span>
              </button>
            </div>

            {/* Chart and Legend Body */}
            <div className="py-2.5 flex flex-col sm:flex-row items-center justify-around gap-4 sm:gap-5">
              {/* Neumorphic Multi-Ring Visualization */}
              <div className="relative w-32 h-32 sm:w-36 sm:h-36 flex items-center justify-center shrink-0">
                <svg
                  aria-label="Reconciliation status rings chart"
                  className="w-full h-full transform -rotate-90"
                  viewBox="0 0 140 140"
                >
                  {statusRings.map((ring, idx) => {
                    const C = 2 * Math.PI * ring.r;
                    const progress = total > 0 ? Math.min(1, Math.max(0, ring.count / total)) : 0;
                    const strokeLength = progress * C;

                    return (
                      <g key={idx}>
                        {/* Subtle Debossed Background Track */}
                        <circle
                          cx="70"
                          cy="70"
                          r={ring.r}
                          fill="transparent"
                          stroke="#dde5f0"
                          strokeWidth={ring.strokeWidth}
                          className="dark:stroke-slate-800/80"
                        />

                        {/* Semantic Status Colored Arc */}
                        {strokeLength > 0 && (
                          <circle
                            cx="70"
                            cy="70"
                            r={ring.r}
                            fill="transparent"
                            stroke={ring.color}
                            strokeWidth={ring.strokeWidth}
                            strokeDasharray={`${strokeLength} ${C - strokeLength}`}
                            strokeDashoffset={0}
                            strokeLinecap="round"
                            className="transition-all duration-700 ease-out"
                          />
                        )}
                      </g>
                    );
                  })}
                </svg>

                {/* Raised Center Dial */}
                <div className="absolute w-12 h-12 neu-extruded rounded-full flex flex-col items-center justify-center text-center shadow-inner">
                  <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 leading-tight font-mono tabular-nums">
                    {stats.match_rate}%
                  </span>
                  <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                    Matched
                  </span>
                </div>
              </div>

              {/* Legend Items List with Semantic Matching Colors */}
              <div className="w-full sm:w-auto space-y-1.5 text-xs font-semibold">
                <div className="flex items-center justify-between gap-4 py-0.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] shadow-sm shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300">{METRIC_LABELS.MATCHED}</span>
                  </div>
                  <div className="text-right font-mono tabular-nums">
                    <span className="font-extrabold text-slate-800 dark:text-slate-100">{matched}</span>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px] ml-1">
                      ({formatPct(matched, total)})
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 py-0.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] shadow-sm shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300">{METRIC_LABELS.EXCEPTIONS}</span>
                  </div>
                  <div className="text-right font-mono tabular-nums">
                    <span className="font-extrabold text-slate-800 dark:text-slate-100">{exceptionsTotal}</span>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px] ml-1">
                      ({formatPct(exceptionsTotal, total)})
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 py-0.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6] shadow-sm shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300">{METRIC_LABELS.SENT_FOR_REVIEW}</span>
                  </div>
                  <div className="text-right font-mono tabular-nums">
                    <span className="font-extrabold text-slate-800 dark:text-slate-100">{underReview}</span>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px] ml-1">
                      ({formatPct(underReview, total)})
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 py-0.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#64748B] shadow-sm shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300">{METRIC_LABELS.AUTO_RESOLVED}</span>
                  </div>
                  <div className="text-right font-mono tabular-nums">
                    <span className="font-extrabold text-slate-800 dark:text-slate-100">{autoResolved}</span>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px] ml-1">
                      ({formatPct(autoResolved, total)})
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom AI Confidence Banner (Debossed Well) */}
            <div className="neu-inset p-2 sm:p-2.5 rounded-xl flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 mt-2">
              <span className="text-blue-600 dark:text-blue-400 font-extrabold text-sm shrink-0">✦</span>
              <span className="truncate">
                {autoResolved > 0 ? (
                  <>
                    <strong className="text-slate-800 dark:text-slate-100 font-bold">
                      {autoResolved} exceptions
                    </strong>{' '}
                    were auto-resolved by AI with high confidence.
                  </>
                ) : stats.matched_count > 0 ? (
                  <>
                    Reconciliation completed with{' '}
                    <strong className="text-slate-800 dark:text-slate-100 font-bold">
                      {stats.matched_count} successfully matched
                    </strong>{' '}
                    records.
                  </>
                ) : (
                  'Reconciliation overview and exceptions summary.'
                )}
              </span>
            </div>
          </div>
        </article>
      </div>

      {/* Financial KPI Cards (~20% Bottom Row) */}
      <FinancialKpiCards
        expectedAmount={stats.expected_amount ?? 0}
        settledAmount={stats.settled_amount ?? 0}
        differenceAmount={stats.difference_amount ?? 0}
      />
    </div>
  );
};

