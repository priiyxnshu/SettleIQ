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
  RotateCw,
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
    try {
      const res = await uploadFinancialData(paymentsFile, settlementsFile, feesFile);
      setUploadResult(res);
      await fetchHistory(); // Await history refresh immediately
    } catch (err: any) {
      setErrorMessage(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleStartReconciliation = async () => {
    if (!uploadResult?.reconciliation_run_id) return;
    setReconciling(true);
    setErrorMessage(null);
    try {
      const res = await runReconciliation(uploadResult.reconciliation_run_id);
      onReconciliationCompleted(res.reconciliation_run_id);
    } catch (err: any) {
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
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-2">
          <div className="flex items-center space-x-2.5">
            <History className="h-4 w-4 text-slate-800 dark:text-slate-200" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Recent Uploads</h3>
          </div>
          <button
            onClick={fetchHistory}
            disabled={loadingHistory}
            title="Refresh upload history"
            className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition border border-transparent hover:border-slate-200 dark:hover:border-slate-700 cursor-pointer"
          >
            <RotateCw className={`h-3.5 w-3.5 ${loadingHistory ? 'animate-spin text-blue-600 dark:text-blue-400' : ''}`} />
          </button>
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
          className={`border rounded-2xl p-6 shadow-sm transition-all duration-200 flex flex-col justify-between ${
            isDraggingPayments
              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-blue-200 dark:ring-blue-800 shadow-md scale-[1.01]'
              : paymentsFile 
                ? 'border-blue-300 dark:border-blue-800 ring-1 ring-blue-100 dark:ring-blue-900/50 bg-white dark:bg-slate-900' 
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-4 pointer-events-none">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                1. PAYMENTS
              </span>
              <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${
                paymentsFile ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60' : 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/60'
              }`}>
                {paymentsFile ? <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" /> : <FileSpreadsheet className="h-4 w-4" />}
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 font-medium h-8 pointer-events-none">
              Internal order payments from core gateway/ledger.
            </p>

            {/* Inner Dropzone / Browse Target */}
            <label className={`min-h-[140px] flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all duration-150 group ${
              isDraggingPayments
                ? 'bg-blue-100/50 dark:bg-blue-950/40 border-blue-500'
                : paymentsFile 
                  ? 'bg-blue-50/30 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800/80' 
                  : 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700 hover:border-blue-400 hover:bg-blue-50/20 dark:hover:bg-slate-800'
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
          className={`border rounded-2xl p-6 shadow-sm transition-all duration-200 flex flex-col justify-between ${
            isDraggingSettlements
              ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-200 dark:ring-emerald-800 shadow-md scale-[1.01]'
              : settlementsFile 
                ? 'border-emerald-300 dark:border-emerald-800 ring-1 ring-emerald-100 dark:ring-emerald-900/50 bg-white dark:bg-slate-900' 
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-4 pointer-events-none">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                2. SETTLEMENTS
              </span>
              <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${
                settlementsFile ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60' : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/60'
              }`}>
                {settlementsFile ? <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> : <FileSpreadsheet className="h-4 w-4" />}
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 font-medium h-8 pointer-events-none">
              Processor net settlement reports from payment gateway.
            </p>

            {/* Inner Dropzone / Browse Target */}
            <label className={`min-h-[140px] flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all duration-150 group ${
              isDraggingSettlements
                ? 'bg-emerald-100/50 dark:bg-emerald-950/40 border-emerald-500'
                : settlementsFile 
                  ? 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/80' 
                  : 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700 hover:border-emerald-400 hover:bg-emerald-50/20 dark:hover:bg-slate-800'
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
          className={`border rounded-2xl p-6 shadow-sm transition-all duration-200 flex flex-col justify-between ${
            isDraggingFees
              ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 ring-2 ring-amber-200 dark:ring-amber-800 shadow-md scale-[1.01]'
              : feesFile 
                ? 'border-amber-300 dark:border-amber-800 ring-1 ring-amber-100 dark:ring-amber-900/50 bg-white dark:bg-slate-900' 
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-4 pointer-events-none">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                3. FEES
              </span>
              <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${
                feesFile ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60' : 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800/60'
              }`}>
                {feesFile ? <CheckCircle2 className="h-4 w-4 text-amber-600 dark:text-amber-400" /> : <FileSpreadsheet className="h-4 w-4" />}
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 font-medium h-8 pointer-events-none">
              Processing fees, MDR, and interchange fee breakdowns.
            </p>

            {/* Inner Dropzone / Browse Target */}
            <label className={`min-h-[140px] flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all duration-150 group ${
              isDraggingFees
                ? 'bg-amber-100/50 dark:bg-amber-950/40 border-amber-500'
                : feesFile 
                  ? 'bg-amber-50/30 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/80' 
                  : 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700 hover:border-amber-400 hover:bg-amber-50/20 dark:hover:bg-slate-800'
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
                <span>Validate Files</span>
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
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center space-x-3 pb-5 border-b border-slate-100 dark:border-slate-800">
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Files Uploaded Successfully</h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Batch validated and ready for reconciliation</p>
                  </div>
                </div>

                {/* 3 Metric Cards */}
                <div className="grid grid-cols-3 gap-3 pt-5">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold block truncate">
                      Payments Ingested
                    </span>
                    <p className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-1 font-mono">
                      {uploadResult.summary.payments_count}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold block truncate">
                      Settlements Ingested
                    </span>
                    <p className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-1 font-mono">
                      {uploadResult.summary.settlements_count}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold block truncate">
                      Fee Records
                    </span>
                    <p className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-1 font-mono">
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
              onClick={handleStartReconciliation}
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
    </div>
  );
};

