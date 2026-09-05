/**
 * SettleIQ Multi-File Data Ingestion View
 *
 * Provides drag-and-drop and file-picker interfaces for uploading the three required
 * reconciliation datasets (Payments CSV, Settlements CSV, and Fees CSV).
 * Handles client-side validation, backend batch ingestion, animated progress tracking,
 * and immediate reconciliation launch capabilities.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Play,
  FileCheck,
  Loader2,
  History,
  FileText
} from 'lucide-react';
import type { UploadResponse, UploadHistoryItem } from '../../types';
import { uploadFinancialData, runReconciliation, getUploadHistory } from '../../services/api';

interface UploadViewProps {
  onReconciliationCompleted: (runId: string) => void;
}

interface FlattenedFileEntry {
  id: string;
  filename: string;
  fileType: 'payments' | 'settlements' | 'fees';
  uploadedAt: string;
  status: string;
}

/**
 * Data ingestion interface coordinating multi-file uploads and reconciliation initialization.
 */
export const UploadView: React.FC<UploadViewProps> = ({
  onReconciliationCompleted
}) => {
  const [paymentsFile, setPaymentsFile] = useState<File | null>(null);
  const [settlementsFile, setSettlementsFile] = useState<File | null>(null);
  const [feesFile, setFeesFile] = useState<File | null>(null);

  const [isDraggingPayments, setIsDraggingPayments] = useState(false);
  const [isDraggingSettlements, setIsDraggingSettlements] = useState(false);
  const [isDraggingFees, setIsDraggingFees] = useState(false);

  const paymentsDragCounter = useRef(0);
  const settlementsDragCounter = useRef(0);
  const feesDragCounter = useRef(0);

  const [uploading, setUploading] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const [showConfirmReconciliation, setShowConfirmReconciliation] = useState(false);
  const [progressModal, setProgressModal] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    steps: string[];
    currentStepIndex: number;
    progressPct: number;
  } | null>(null);

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const VALIDATION_STEPS = [
    'Validating file formats',
    'Checking transaction data',
    'Validating uploaded records'
  ];

  const RECONCILIATION_STEPS = [
    'Preparing transaction data',
    'Reconciling records',
    'Finalizing reconciliation'
  ];

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(msg);
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const [uploadHistory, setUploadHistory] = useState<UploadHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    setHistoryError(null);
    try {
      const res = await getUploadHistory(5);
      if (res && res.items) {
        setUploadHistory(res.items);
      }
    } catch (err: any) {
      console.error('Failed to fetch upload history:', err);
      setHistoryError(err.message || 'Could not load recent uploads');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleUpload = async () => {
    if (!paymentsFile || !settlementsFile || !feesFile) {
      setErrorMessage('Please select all 3 CSV files (Payments, Settlements, and Fees) before uploading.');
      return;
    }
    setUploading(true);
    setErrorMessage(null);
    setProgressModal({
      isOpen: true,
      title: 'Validating Financial Files',
      subtitle: 'Analyzing payments, settlements, and fee records',
      steps: VALIDATION_STEPS,
      currentStepIndex: 0,
      progressPct: 30
    });

    try {
      const apiPromise = uploadFinancialData(paymentsFile, settlementsFile, feesFile);

      // Step 0: Validating file formats
      await delay(320);
      setProgressModal((prev) => (prev ? { ...prev, currentStepIndex: 1, progressPct: 65 } : null));

      // Step 1: Checking transaction data
      await delay(350);
      setProgressModal((prev) => (prev ? { ...prev, currentStepIndex: 2, progressPct: 90 } : null));

      // Step 2: Validating uploaded records & await backend upload
      const [res] = await Promise.all([
        apiPromise,
        delay(330)
      ]);

      setProgressModal((prev) => (prev ? { ...prev, currentStepIndex: 3, progressPct: 100 } : null));
      await delay(150);

      // Close modal & show toast
      setProgressModal(null);
      showToast('Validation completed');
      setUploadResult(res);
      await fetchHistory(); // Await history refresh immediately
    } catch (err: any) {
      setProgressModal(null);
      setErrorMessage(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleStartReconciliationClick = () => {
    if (!uploadResult?.reconciliation_run_id) return;
    setShowConfirmReconciliation(true);
  };

  const executeReconciliation = async () => {
    if (!uploadResult?.reconciliation_run_id) return;
    setShowConfirmReconciliation(false);
    setReconciling(true);
    setErrorMessage(null);
    setProgressModal({
      isOpen: true,
      title: 'Reconciliation Underway',
      subtitle: 'Matching payments against settlement advice',
      steps: RECONCILIATION_STEPS,
      currentStepIndex: 0,
      progressPct: 30
    });

    try {
      const apiPromise = runReconciliation(uploadResult.reconciliation_run_id);

      // Step 0: Preparing transaction data
      await delay(320);
      setProgressModal((prev) => (prev ? { ...prev, currentStepIndex: 1, progressPct: 65 } : null));

      // Step 1: Reconciling records
      await delay(350);
      setProgressModal((prev) => (prev ? { ...prev, currentStepIndex: 2, progressPct: 90 } : null));

      // Step 2: Finalizing reconciliation & await backend run
      const [res] = await Promise.all([
        apiPromise,
        delay(330)
      ]);

      setProgressModal((prev) => (prev ? { ...prev, currentStepIndex: 3, progressPct: 100 } : null));
      await delay(150);

      // Close progress modal & show toast
      setProgressModal(null);
      showToast('Reconciliation completed');

      // Allow toast to be seen briefly before navigation
      await delay(900);
      onReconciliationCompleted(res.reconciliation_run_id);
    } catch (err: any) {
      setProgressModal(null);
      setErrorMessage(err.message || 'Reconciliation failed');
      setReconciling(false);
    }
  };

  const allFilesSelected = Boolean(paymentsFile && settlementsFile && feesFile);

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

  // Flatten batch history items into individual file entries (newest first)
  const flattenedFiles: FlattenedFileEntry[] = [];
  uploadHistory.forEach((batch) => {
    const timestamp = batch.uploaded_at || new Date().toISOString();
    flattenedFiles.push({
      id: `${batch.reconciliation_run_id}-payments`,
      filename: batch.payments_filename || 'payments.csv',
      fileType: 'payments',
      uploadedAt: timestamp,
      status: 'Uploaded'
    });
    flattenedFiles.push({
      id: `${batch.reconciliation_run_id}-settlements`,
      filename: batch.settlements_filename || 'settlements.csv',
      fileType: 'settlements',
      uploadedAt: timestamp,
      status: 'Uploaded'
    });
    flattenedFiles.push({
      id: `${batch.reconciliation_run_id}-fees`,
      filename: batch.fees_filename || 'fees.csv',
      fileType: 'fees',
      uploadedAt: timestamp,
      status: 'Uploaded'
    });
  });

  const displayedFiles = flattenedFiles.slice(0, 6);

  const renderRecentUploadsList = () => (
    <div className="neu-extruded rounded-2xl p-6 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-slate-300/60 dark:border-slate-800 mb-2">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg neu-extruded-sm flex items-center justify-center text-blue-600 dark:text-blue-400">
              <History className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Recent Uploads</h3>
          </div>
        </div>

        {loadingHistory && uploadHistory.length === 0 ? (
          <div className="py-8 text-center text-slate-400 dark:text-slate-500">
            <div className="inline-flex items-center space-x-2 text-xs">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
              <span>Loading recent uploads...</span>
            </div>
          </div>
        ) : historyError && uploadHistory.length === 0 ? (
          <div className="py-8 text-center text-xs text-rose-500 dark:text-rose-400">
            <p>{historyError}</p>
            <button
              onClick={fetchHistory}
              className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : displayedFiles.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
            No recent uploads found. Upload files above to get started.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {displayedFiles.map((file) => (
              <div key={file.id} className="py-3 flex items-center justify-between group">
                <div className="flex items-center space-x-3 min-w-0">
                  <div
                    className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                      file.fileType === 'payments'
                        ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-100/80 dark:border-blue-800/60'
                        : file.fileType === 'settlements'
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-100/80 dark:border-emerald-800/60'
                        : 'bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-100/80 dark:border-purple-800/60'
                    }`}
                  >
                    {file.fileType === 'settlements' ? (
                      <FileSpreadsheet className="h-4 w-4" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{file.filename}</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                      {formatTimestamp(file.uploadedAt)}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shrink-0 ml-3">
                  {file.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );


  return (
    <div 
      className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-200"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => e.preventDefault()}
    >
      {/* Error Message Banner */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs flex items-start space-x-3 shadow-sm">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-500 mt-0.5" />
          <div>
            <p className="font-bold text-rose-900 dark:text-rose-200">Validation or Upload Error</p>
            <p className="mt-0.5 text-rose-700 dark:text-rose-300">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* 3 Upload Cards with Outer-Card Drag & Drop */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. Payments File Card */}
        <div 
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            paymentsDragCounter.current += 1;
            if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
              setIsDraggingPayments(true);
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            paymentsDragCounter.current -= 1;
            if (paymentsDragCounter.current <= 0) {
              paymentsDragCounter.current = 0;
              setIsDraggingPayments(false);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            paymentsDragCounter.current = 0;
            setIsDraggingPayments(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              setPaymentsFile(e.dataTransfer.files[0]);
            }
          }}
          className={`neu-extruded rounded-2xl p-6 transition-all duration-200 flex flex-col justify-between ${
            isDraggingPayments
              ? 'ring-2 ring-blue-500 scale-[1.01]'
              : ''
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-4 pointer-events-none">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                1. PAYMENTS
              </span>
              <div className="w-8 h-8 rounded-xl neu-extruded-sm flex items-center justify-center text-blue-600 dark:text-blue-400">
                {paymentsFile ? <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> : <FileSpreadsheet className="h-4 w-4" />}
              </div>
            </div>

            {/* Inner Dropzone / Browse Target */}
            <label className={`min-h-[140px] flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all duration-150 group neu-inset-subtle ${
              isDraggingPayments
                ? 'border-blue-500'
                : paymentsFile 
                  ? 'border-blue-300 dark:border-blue-800/80' 
                  : 'border-slate-300 dark:border-slate-700 hover:border-blue-400'
            }`}>
              <UploadCloud className={`h-8 w-8 mb-2 transition ${
                isDraggingPayments || paymentsFile ? 'text-blue-600 dark:text-blue-400 scale-110' : 'text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400'
              }`} />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100 truncate max-w-[210px] text-center">
                {paymentsFile ? paymentsFile.name : 'payments.csv'}
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-1 text-center">
                {isDraggingPayments ? 'Drop file to assign' : paymentsFile ? 'Click or drop to replace' : 'Drag & drop CSV or click to browse'}
              </span>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) setPaymentsFile(e.target.files[0]);
                }}
              />
            </label>
          </div>
        </div>

        {/* 2. Settlements File Card */}
        <div 
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            settlementsDragCounter.current += 1;
            if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
              setIsDraggingSettlements(true);
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            settlementsDragCounter.current -= 1;
            if (settlementsDragCounter.current <= 0) {
              settlementsDragCounter.current = 0;
              setIsDraggingSettlements(false);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            settlementsDragCounter.current = 0;
            setIsDraggingSettlements(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              setSettlementsFile(e.dataTransfer.files[0]);
            }
          }}
          className={`neu-extruded rounded-2xl p-6 transition-all duration-200 flex flex-col justify-between ${
            isDraggingSettlements
              ? 'ring-2 ring-emerald-500 scale-[1.01]'
              : ''
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-4 pointer-events-none">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                2. SETTLEMENTS
              </span>
              <div className="w-8 h-8 rounded-xl neu-extruded-sm flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                {settlementsFile ? <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> : <FileSpreadsheet className="h-4 w-4" />}
              </div>
            </div>

            {/* Inner Dropzone / Browse Target */}
            <label className={`min-h-[140px] flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all duration-150 group neu-inset-subtle ${
              isDraggingSettlements
                ? 'border-emerald-500'
                : settlementsFile 
                  ? 'border-emerald-300 dark:border-emerald-800/80' 
                  : 'border-slate-300 dark:border-slate-700 hover:border-emerald-400'
            }`}>
              <UploadCloud className={`h-8 w-8 mb-2 transition ${
                isDraggingSettlements || settlementsFile ? 'text-emerald-600 dark:text-emerald-400 scale-110' : 'text-slate-400 dark:text-slate-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400'
              }`} />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100 truncate max-w-[210px] text-center">
                {settlementsFile ? settlementsFile.name : 'settlements.csv'}
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-1 text-center">
                {isDraggingSettlements ? 'Drop file to assign' : settlementsFile ? 'Click or drop to replace' : 'Drag & drop CSV or click to browse'}
              </span>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) setSettlementsFile(e.target.files[0]);
                }}
              />
            </label>
          </div>
        </div>

        {/* 3. Fees File Card */}
        <div 
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            feesDragCounter.current += 1;
            if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
              setIsDraggingFees(true);
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            feesDragCounter.current -= 1;
            if (feesDragCounter.current <= 0) {
              feesDragCounter.current = 0;
              setIsDraggingFees(false);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            feesDragCounter.current = 0;
            setIsDraggingFees(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              setFeesFile(e.dataTransfer.files[0]);
            }
          }}
          className={`neu-extruded rounded-2xl p-6 transition-all duration-200 flex flex-col justify-between ${
            isDraggingFees
              ? 'ring-2 ring-amber-500 scale-[1.01]'
              : ''
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-4 pointer-events-none">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                3. FEES
              </span>
              <div className="w-8 h-8 rounded-xl neu-extruded-sm flex items-center justify-center text-amber-500 dark:text-amber-400">
                {feesFile ? <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> : <FileSpreadsheet className="h-4 w-4" />}
              </div>
            </div>

            {/* Inner Dropzone / Browse Target */}
            <label className={`min-h-[140px] flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all duration-150 group neu-inset-subtle ${
              isDraggingFees
                ? 'border-amber-500'
                : feesFile 
                  ? 'border-amber-300 dark:border-amber-800/80' 
                  : 'border-slate-300 dark:border-slate-700 hover:border-amber-400'
            }`}>
              <UploadCloud className={`h-8 w-8 mb-2 transition ${
                isDraggingFees || feesFile ? 'text-amber-600 dark:text-amber-400 scale-110' : 'text-slate-400 dark:text-slate-500 group-hover:text-amber-600 dark:group-hover:text-amber-400'
              }`} />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100 truncate max-w-[210px] text-center">
                {feesFile ? feesFile.name : 'fees.csv'}
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-1 text-center">
                {isDraggingFees ? 'Drop file to assign' : feesFile ? 'Click or drop to replace' : 'Drag & drop CSV or click to browse'}
              </span>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) setFeesFile(e.target.files[0]);
                }}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Confirmation Checkbox & Primary Action Button (when not yet validated) */}
      {!uploadResult && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <label className="flex items-center space-x-3 cursor-pointer select-none group">
            <input
              type="checkbox"
              checked={isConfirmed}
              onChange={(e) => setIsConfirmed(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
            />
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition">
              I have carefully reviewed the files and they are ready for validation.
            </span>
          </label>

          <button
            onClick={handleUpload}
            disabled={!allFilesSelected || !isConfirmed || uploading}
            className="inline-flex items-center space-x-2 px-7 py-3 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 text-white transition-all shadow-sm shadow-blue-600/20 disabled:shadow-none cursor-pointer disabled:cursor-not-allowed shrink-0"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Validating Files...</span>
              </>
            ) : (
              <>
                <FileCheck className="h-4 w-4" />
                <span>Start Validation</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* DYNAMIC SECTION: Before vs After Validation */}
      {!uploadResult ? (
        /* Before Validation: Full Width Recent Uploads Card */
        <div className="w-full">{renderRecentUploadsList()}</div>
      ) : (
        /* After Validation: Side-by-Side Cards + Centered Reconciliation Button */
        <div className="space-y-8 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* Left Card: Files Uploaded Successfully */}
            <div className="neu-extruded rounded-2xl p-6 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center space-x-3 pb-5 border-b border-slate-300/60 dark:border-slate-800">
                  <div className="w-10 h-10 rounded-xl neu-extruded-sm flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Files Uploaded Successfully</h3>
                  </div>
                </div>

                {/* 3 Metric Cards */}
                <div className="grid grid-cols-3 gap-3 pt-5">
                  <div className="p-3.5 rounded-xl neu-inset-subtle border border-white/60 dark:border-white/10">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold block truncate">
                      Payments Ingested
                    </span>
                    <p className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-1 font-mono tabular-nums">
                      {uploadResult.summary.payments_count}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl neu-inset-subtle border border-white/60 dark:border-white/10">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold block truncate">
                      Settlements Ingested
                    </span>
                    <p className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-1 font-mono tabular-nums">
                      {uploadResult.summary.settlements_count}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl neu-inset-subtle border border-white/60 dark:border-white/10">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold block truncate">
                      Fee Records
                    </span>
                    <p className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-1 font-mono tabular-nums">
                      {uploadResult.summary.fees_count}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Card: Recent Uploads */}
            <div>{renderRecentUploadsList()}</div>
          </div>

          {/* Centered Start Reconciliation Action */}
          <div className="flex justify-center pt-2">
            <button
              onClick={handleStartReconciliationClick}
              disabled={reconciling}
              className="inline-flex items-center space-x-2.5 px-8 py-3.5 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition-all shadow-md shadow-blue-600/25 hover:shadow-lg hover:shadow-blue-600/30 cursor-pointer"
            >
              {reconciling ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Reconciling Batch...</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current" />
                  <span>Start Reconciliation</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Top-Center Floating Success Toast */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center space-x-2.5 bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-slate-800 dark:text-slate-100 px-4 py-2 rounded-xl shadow-lg shadow-slate-900/10 dark:shadow-slate-950/50 text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-200 pointer-events-none">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Confirmation Modal for Start Reconciliation */}
      {showConfirmReconciliation && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => !reconciling && setShowConfirmReconciliation(false)}
        >
          <div 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start space-x-3.5">
              <div className="p-2.5 rounded-full shrink-0 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 text-blue-600 dark:text-blue-400">
                <Play className="h-5 w-5 fill-current" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Start Reconciliation
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Are you sure you want to start reconciliation?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowConfirmReconciliation(false)}
                disabled={reconciling}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-2xs transition disabled:opacity-50 cursor-pointer"
              >
                No
              </button>
              <button
                type="button"
                onClick={executeReconciliation}
                disabled={reconciling}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold text-white shadow-sm transition disabled:opacity-50 cursor-pointer bg-blue-600 hover:bg-blue-700"
              >
                Yes, Start
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress Modal (Validation & Reconciliation) */}
      {progressModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {progressModal.title}
              </h3>
              {progressModal.subtitle && (
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {progressModal.subtitle}
                </p>
              )}
            </div>

            {/* Steps Vertical List with Active Step Highlight */}
            <div className="space-y-2 bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 rounded-xl p-3.5">
              {progressModal.steps.map((stepLabel, idx) => {
                const isCompleted = idx < progressModal.currentStepIndex;
                const isCurrent = idx === progressModal.currentStepIndex;

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

                    <span
                      className={`text-xs transition-colors ${
                        isCompleted
                          ? 'text-slate-800 dark:text-slate-200 font-semibold'
                          : isCurrent
                          ? 'text-blue-700 dark:text-blue-300 font-bold'
                          : 'text-slate-400 dark:text-slate-500 font-medium'
                      }`}
                    >
                      {stepLabel}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Progress Bar */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200/80 dark:border-slate-700 shadow-inner">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out shadow-sm"
                  style={{ width: `${progressModal.progressPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

