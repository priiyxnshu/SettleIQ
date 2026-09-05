/**
 * SettleIQ Executive Reports Hub View
 *
 * Facilitates compilation, preview, and download of formal reconciliation reports.
 * Coordinates AI narrative generation with grounded metrics, provides in-browser
 * document preview, and triggers institutional PDF downloads signed off by the Checker.
 */

import React, { useState } from 'react';
import {
  FileBarChart,
  Download,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Layers,
  Check,
  Eye
} from 'lucide-react';
import type { NavTab, ReconciliationReportData } from '../../types';
import { useUser } from '../../context/UserContext';
import { generateReport, downloadReportPdf } from '../../services/api';
import { ReportPreviewModal } from './ReportPreviewModal';

interface ReportsViewProps {
  runId?: string;
  onNavigate?: (tab: NavTab) => void;
  onRefresh?: () => void;
}

const REPORT_STEPS = [
  'Preparing reconciliation data',
  'Generating report',
  'Formatting PDF'
];

/**
 * Report management interface for compiling and exporting audit-ready reconciliation summaries.
 */
export const ReportsView: React.FC<ReportsViewProps> = ({ runId, onNavigate }) => {
  const { currentUser } = useUser();
  const [reportData, setReportData] = useState<ReconciliationReportData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [progressPct, setProgressPct] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const handleGenerate = async () => {
    if (!runId) return;
    setErrorMessage(null);
    setIsGenerating(true);
    setActiveStepIndex(0);
    setProgressPct(20);

    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    try {
      const userSignoff = currentUser ? `${currentUser.name} (${currentUser.roleTitle})` : 'Yash Jain (Checker)';
      const apiPromise = generateReport(runId, userSignoff);

      // Step 1: Preparing reconciliation data (~1.8s)
      await delay(1800);
      setActiveStepIndex(1);
      setProgressPct(60);

      // Step 2: Generating report narrative (~2s)
      const [res] = await Promise.all([apiPromise, delay(2000)]);
      setActiveStepIndex(2);
      setProgressPct(90);

      // Step 3: Formatting PDF (~1.5s)
      await delay(1500);
      setProgressPct(100);
      await delay(300);

      setIsGenerating(false);
      setReportData(res);
      showToast('Report generated successfully');
    } catch (err: any) {
      setIsGenerating(false);
      setErrorMessage(err.message || 'Failed to generate reconciliation report');
    }
  };

  const handleDownload = async () => {
    if (!reportData) return;
    try {
      setIsDownloading(true);
      const blob = await downloadReportPdf(reportData.run_id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SettleIQ_Reconciliation_Report_${reportData.run_id.slice(0, 8).toUpperCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast('PDF downloaded successfully');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to download PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return 'N/A';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoStr;
    }
  };

  // --------------------------------------------------------------------------
  // EMPTY STATE (No active reconciliation run)
  // --------------------------------------------------------------------------
  if (!runId) {
    return (
      <div className="space-y-6">
        <div className="neu-extruded rounded-2xl p-8 sm:p-12 text-center max-w-xl mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200/60 dark:border-blue-800/40 flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400 neu-inset-subtle">
            <Layers className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              No Active Reconciliation Run
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Please upload transaction files and complete reconciliation to generate formal, AI-assisted stakeholder reports.
            </p>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('upload')}
              className="neu-btn-primary px-4 py-2 rounded-xl text-xs sm:text-sm font-bold inline-flex items-center gap-2 cursor-pointer"
            >
              <Layers className="h-4 w-4" />
              Go to Upload
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center space-x-2.5 px-4 py-2.5 rounded-xl bg-emerald-600 text-white shadow-xl animate-in slide-in-from-top duration-200">
          <Check className="h-4 w-4 shrink-0" />
          <span className="text-xs sm:text-sm font-bold tracking-tight">{toastMessage}</span>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-start space-x-3 text-rose-700 dark:text-rose-300">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm font-medium">
            <p className="font-bold">Error</p>
            <p>{errorMessage}</p>
          </div>
        </div>
      )}

      {/* =========================================================================
          STATE A: PRE-GENERATION CARD (Initial view when entering Reports)
          ========================================================================= */}
      {!reportData && (
        <div className="neu-extruded rounded-2xl p-6 sm:p-8 space-y-6 max-w-3xl">
          <div className="space-y-2 border-b border-slate-200/80 dark:border-slate-800 pb-5">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Ready to Generate
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                Batch ID: {runId.slice(0, 8).toUpperCase()}
              </span>
            </div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
              AI-Assisted Reconciliation Report
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Generate a formal executive report synthesizing verified financial reconciliation metrics, automated guardrail triage, and audit findings.
            </p>
          </div>

          <div>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="neu-btn-primary px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold inline-flex items-center gap-2 cursor-pointer shadow-md"
            >
              <Sparkles className="h-4 w-4" />
              Generate AI-Assisted Reconciliation Report
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          STATE B: COMPACT REPORT CARD (After report generation)
          ========================================================================= */}
      {reportData && (
        <div className="neu-extruded rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-w-4xl">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400 neu-inset-subtle shrink-0">
              <FileBarChart className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 leading-tight">
                AI-Assisted Reconciliation Report
              </h2>
              <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap font-medium">
                <span><strong className="text-slate-700 dark:text-slate-300">Batch ID:</strong> {reportData.batch_reference || `BATCH-${reportData.run_id.slice(0, 8).toUpperCase()}`}</span>
                <span>•</span>
                <span><strong className="text-slate-700 dark:text-slate-300">Generated:</strong> {formatDate(reportData.generated_at)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPreviewOpen(true)}
              className="neu-extruded-btn px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 inline-flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>Preview</span>
            </button>

            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="neu-btn-primary px-4 py-2 rounded-xl text-xs sm:text-sm font-bold inline-flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span>Download PDF</span>
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          GENERATION PROGRESS MODAL (Matches AI Investigation / Validation Style)
          ========================================================================= */}
      {isGenerating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Generating Reconciliation Report
              </h3>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Synthesizing reconciliation data, metrics, and audit trail...
              </p>
            </div>

            {/* Steps Vertical List */}
            <div className="space-y-2 bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 rounded-xl p-3.5">
              {REPORT_STEPS.map((stepLabel, idx) => {
                const isCompleted = idx < activeStepIndex;
                const isCurrent = idx === activeStepIndex;

                return (
                  <div
                    key={stepLabel}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-300 ${
                      isCurrent
                        ? 'bg-blue-50/90 dark:bg-blue-950/60 border border-blue-200/90 dark:border-blue-800/60 shadow-sm'
                        : isCompleted
                        ? 'bg-white/60 dark:bg-slate-800/60 border border-transparent'
                        : 'border border-transparent'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : isCurrent ? (
                      <Loader2 className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-spin shrink-0" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-slate-200 dark:border-slate-700 shrink-0 bg-white dark:bg-slate-800" />
                    )}

                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs font-semibold truncate ${
                          isCurrent
                            ? 'text-blue-700 dark:text-blue-300'
                            : isCompleted
                            ? 'text-slate-700 dark:text-slate-300'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {stepLabel}
                      </p>
                    </div>

                    {isCompleted && (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        Done
                      </span>
                    )}
                    {isCurrent && (
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 animate-pulse">
                        In progress...
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Smooth Animated Progress Bar */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <span>Progress</span>
                <span className="font-mono">{progressPct}%</span>
              </div>
              <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200/80 dark:border-slate-700 shadow-inner">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out shadow-sm"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          DOCUMENT PREVIEW MODAL
          ========================================================================= */}
      {reportData && isPreviewOpen && (
        <ReportPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          reportData={reportData}
          onDownload={handleDownload}
          isDownloading={isDownloading}
        />
      )}
    </div>
  );
};
