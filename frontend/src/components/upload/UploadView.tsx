import React, { useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Play,
  FileCheck,
  Loader2
} from 'lucide-react';
import type { UploadResponse } from '../../types';
import { uploadFinancialData, runReconciliation } from '../../services/api';

interface UploadViewProps {
  onReconciliationCompleted: (runId: string) => void;
}

export const UploadView: React.FC<UploadViewProps> = ({
  onReconciliationCompleted
}) => {
  const [paymentsFile, setPaymentsFile] = useState<File | null>(null);
  const [settlementsFile, setSettlementsFile] = useState<File | null>(null);
  const [feesFile, setFeesFile] = useState<File | null>(null);

  const [uploading, setUploading] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Quick 1-click dataset loader
  const handleLoadSyntheticDataset = async (datasetName: 'development' | 'evaluation' | 'demo') => {
    setErrorMessage(null);
    setUploadResult(null);
    try {
      const resP = await fetch(`/data/${datasetName}/payments.csv`).catch(() => null);
      const resS = await fetch(`/data/${datasetName}/settlements.csv`).catch(() => null);
      const resF = await fetch(`/data/${datasetName}/fees.csv`).catch(() => null);

      if (resP && resS && resF && resP.ok && resS.ok && resF.ok) {
        const blobP = await resP.blob();
        const blobS = await resS.blob();
        const blobF = await resF.blob();
        setPaymentsFile(new File([blobP], 'payments.csv', { type: 'text/csv' }));
        setSettlementsFile(new File([blobS], 'settlements.csv', { type: 'text/csv' }));
        setFeesFile(new File([blobF], 'fees.csv', { type: 'text/csv' }));
      } else {
        // Fallback: Generate demo CSV files dynamically in-memory for instant 1-click testing
        const pContent = "payment_id,order_id,payment_amount,payment_date,payment_status,customer_reference,currency\nPAY_10001,ORD_50001,5000.00,2026-03-01T10:00:00Z,SUCCESS,CUST_101,INR\nPAY_10002,ORD_50002,2500.00,2026-03-01T10:15:00Z,SUCCESS,CUST_102,INR\nPAY_10003,ORD_50003,12000.00,2026-03-01T10:30:00Z,SUCCESS,CUST_103,INR\nPAY_10004,ORD_50004,3200.00,2026-03-01T10:45:00Z,SUCCESS,CUST_104,INR\nPAY_10005,ORD_50005,800.00,2026-03-01T11:00:00Z,SUCCESS,CUST_105,INR\nPAY_10006,ORD_50006,1500.00,2026-03-01T11:15:00Z,SUCCESS,CUST_106,INR\nPAY_10007,ORD_50007,4500.00,2026-03-01T11:30:00Z,SUCCESS,CUST_107,INR\nPAY_10008,ORD_50008,9800.00,2026-03-01T11:45:00Z,SUCCESS,CUST_108,INR";
        const sContent = "settlement_id,payment_id,settlement_amount,settlement_date,settlement_status,settlement_reference,settlement_batch_id,currency\nSET_70001,PAY_10001,4850.00,2026-03-02T12:00:00Z,SETTLED,REF_1,BATCH_01,INR\nSET_70002,PAY_10002,2425.00,2026-03-02T12:00:00Z,SETTLED,REF_2,BATCH_01,INR\nSET_70003,PAY_10003,11640.00,2026-03-02T12:00:00Z,SETTLED,REF_3,BATCH_01,INR\nSET_70004,PAY_10004,3000.00,2026-03-02T12:00:00Z,SETTLED,REF_4,BATCH_01,INR\nSET_70005,PAY_10005,776.00,2026-03-02T12:00:00Z,SETTLED,REF_5,BATCH_01,INR\nSET_70006,PAY_10006,1455.00,2026-03-02T12:00:00Z,SETTLED,REF_6,BATCH_01,INR\nSET_70007,,4365.00,2026-03-02T12:00:00Z,SETTLED,SR_ORD_50007,BATCH_01,INR\nSET_70008,PAY_10008,9506.00,2026-03-02T12:00:00Z,SETTLED,REF_8,BATCH_01,INR";
        const fContent = "fee_id,payment_id,fee_amount,fee_type,fee_date\nFEE_90001,PAY_10001,150.00,PERCENTAGE,2026-03-02T12:00:00Z\nFEE_90002,PAY_10002,75.00,PERCENTAGE,2026-03-02T12:00:00Z\nFEE_90003,PAY_10003,360.00,PERCENTAGE,2026-03-02T12:00:00Z\nFEE_90004,PAY_10004,96.00,PERCENTAGE,2026-03-02T12:00:00Z\nFEE_90005,PAY_10005,24.00,PERCENTAGE,2026-03-02T12:00:00Z\nFEE_90006,PAY_10006,45.00,PERCENTAGE,2026-03-02T12:00:00Z\nFEE_90007,PAY_10007,135.00,PERCENTAGE,2026-03-02T12:00:00Z\nFEE_90008,PAY_10008,294.00,PERCENTAGE,2026-03-02T12:00:00Z";

        setPaymentsFile(new File([pContent], 'payments.csv', { type: 'text/csv' }));
        setSettlementsFile(new File([sContent], 'settlements.csv', { type: 'text/csv' }));
        setFeesFile(new File([fContent], 'fees.csv', { type: 'text/csv' }));
      }
    } catch (err: any) {
      setErrorMessage(`Failed to load dataset: ${err.message}`);
    }
  };

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

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Upload Financial Batches</h2>
          <p className="text-xs text-slate-400 mt-1">
            Ingest Payments, Processor Settlements, and Fee schedules to run deterministic reconciliation.
          </p>
        </div>

        {/* Quick Demo Dataset Buttons */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400 font-medium">Quick Load:</span>
          <button
            onClick={() => handleLoadSyntheticDataset('development')}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-slate-800 transition"
          >
            Demo Batch (50)
          </button>
          <button
            onClick={() => handleLoadSyntheticDataset('evaluation')}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-slate-800 transition"
          >
            Benchmark (200)
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start space-x-3">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Validation or Ingestion Error</p>
            <p className="mt-0.5 text-rose-300/90">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* 3 Upload Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. Payments File */}
        <div className={`p-6 rounded-xl border transition-all ${
          paymentsFile ? 'bg-slate-900/40 border-indigo-500/40' : 'bg-slate-950 border-slate-800 hover:border-slate-700'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">1. Payments Batch</span>
            {paymentsFile ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <FileSpreadsheet className="h-4 w-4 text-slate-400" />}
          </div>
          <p className="text-xs text-slate-400 mb-4 h-8">Internal order payments from core gateway/ledger.</p>
          
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-lg p-5 cursor-pointer bg-slate-900/20 transition group">
            <UploadCloud className="h-6 w-6 text-slate-400 group-hover:text-indigo-400 mb-2 transition" />
            <span className="text-xs font-medium text-slate-300 group-hover:text-white truncate max-w-[200px]">
              {paymentsFile ? paymentsFile.name : 'Select payments.csv'}
            </span>
            <span className="text-[10px] text-slate-500 mt-1">Required headers: payment_id, amount</span>
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

        {/* 2. Settlements File */}
        <div className={`p-6 rounded-xl border transition-all ${
          settlementsFile ? 'bg-slate-900/40 border-indigo-500/40' : 'bg-slate-950 border-slate-800 hover:border-slate-700'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">2. Settlements Batch</span>
            {settlementsFile ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <FileSpreadsheet className="h-4 w-4 text-slate-400" />}
          </div>
          <p className="text-xs text-slate-400 mb-4 h-8">Processor net settlement reports from payment gateway.</p>
          
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-lg p-5 cursor-pointer bg-slate-900/20 transition group">
            <UploadCloud className="h-6 w-6 text-slate-400 group-hover:text-indigo-400 mb-2 transition" />
            <span className="text-xs font-medium text-slate-300 group-hover:text-white truncate max-w-[200px]">
              {settlementsFile ? settlementsFile.name : 'Select settlements.csv'}
            </span>
            <span className="text-[10px] text-slate-500 mt-1">Required: settlement_id, amount</span>
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

        {/* 3. Fees File */}
        <div className={`p-6 rounded-xl border transition-all ${
          feesFile ? 'bg-slate-900/40 border-indigo-500/40' : 'bg-slate-950 border-slate-800 hover:border-slate-700'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">3. Fee Schedule</span>
            {feesFile ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <FileSpreadsheet className="h-4 w-4 text-slate-400" />}
          </div>
          <p className="text-xs text-slate-400 mb-4 h-8">Processing fees, MDR, and interchange fee breakdowns.</p>
          
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-lg p-5 cursor-pointer bg-slate-900/20 transition group">
            <UploadCloud className="h-6 w-6 text-slate-400 group-hover:text-indigo-400 mb-2 transition" />
            <span className="text-xs font-medium text-slate-300 group-hover:text-white truncate max-w-[200px]">
              {feesFile ? feesFile.name : 'Select fees.csv'}
            </span>
            <span className="text-[10px] text-slate-500 mt-1">Required: fee_id, fee_amount</span>
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

      {/* Action Buttons & Ingestion Summary */}
      {!uploadResult ? (
        <div className="flex justify-end pt-4">
          <button
            onClick={handleUpload}
            disabled={!allFilesSelected || uploading}
            className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white transition shadow-lg shadow-indigo-600/20"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Validating & Ingesting...</span>
              </>
            ) : (
              <>
                <FileCheck className="h-4 w-4" />
                <span>Validate & Ingest Batch</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Batch Ingested Successfully</h3>
                <p className="text-xs text-slate-400 font-mono">Run ID: {uploadResult.reconciliation_run_id}</p>
              </div>
            </div>
            <button
              onClick={handleStartReconciliation}
              disabled={reconciling}
              className="inline-flex items-center space-x-2 px-5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-lg shadow-emerald-600/20"
            >
              {reconciling ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Reconciling...</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  <span>Start Reconciliation</span>
                </>
              )}
            </button>
          </div>

          {/* Files Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400 uppercase font-medium">Payments Ingested</span>
              <p className="text-xl font-bold text-white mt-1 font-mono">{uploadResult.summary.payments_count}</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400 uppercase font-medium">Settlements Ingested</span>
              <p className="text-xl font-bold text-white mt-1 font-mono">{uploadResult.summary.settlements_count}</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400 uppercase font-medium">Fee Records</span>
              <p className="text-xl font-bold text-white mt-1 font-mono">{uploadResult.summary.fees_count}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
