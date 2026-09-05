/**
 * SettleIQ Report Preview Modal
 *
 * Full-screen modal rendering an exact digital facsimile of the generated reconciliation report
 * before export. Encapsulates interactive preview controls and immediate PDF download trigger.
 */

import React from 'react';
import { X, Download, Loader2, FileText } from 'lucide-react';
import type { ReconciliationReportData } from '../../types';
import { ReconciliationReportDocument } from './ReconciliationReportDocument';

interface ReportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportData: ReconciliationReportData;
  onDownload: () => void;
  isDownloading: boolean;
}

/**
 * Modal dialog displaying the print-ready ReconciliationReportDocument.
 */
export const ReportPreviewModal: React.FC<ReportPreviewModalProps> = ({
  isOpen,
  onClose,
  reportData,
  onDownload,
  isDownloading
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-slate-100 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
                Report Document Preview
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Official document format matching PDF output
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onDownload}
              disabled={isDownloading}
              className="neu-btn-primary px-3.5 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
            >
              {isDownloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span>Download PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
              aria-label="Close preview"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body - Scrollable Document View */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200/60 dark:bg-slate-950 space-y-6">
          <ReconciliationReportDocument reportData={reportData} />
        </div>
      </div>
    </div>
  );
};
