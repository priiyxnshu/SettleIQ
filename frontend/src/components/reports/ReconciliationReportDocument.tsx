/**
 * SettleIQ Printable Reconciliation Report Document
 *
 * Institutional document template rendering executive reconciliation reports.
 * Formats report metadata, financial totals, exception breakdowns, AI executive narratives,
 * key audit findings, and formal Maker-Checker sign-off blocks matching the PDF layout.
 */

import React from 'react';
import type { ReconciliationReportData } from '../../types';

interface ReconciliationReportDocumentProps {
  reportData: ReconciliationReportData;
}

/**
 * Visual document component displaying styled reconciliation reports for preview and print.
 */
export const ReconciliationReportDocument: React.FC<ReconciliationReportDocumentProps> = ({ reportData }) => {
  const formatDate = (isoStr?: string) => {
    if (!isoStr) return 'N/A';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      });
    } catch {
      return isoStr;
    }
  };

  const formattedExpected = (reportData.metrics.expected_amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const formattedSettled = (reportData.metrics.settled_amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const diffAmt = reportData.metrics.difference_amount || 0;
  const formattedDiff = Math.abs(diffAmt).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return (
    <div className="bg-white text-slate-900 font-sans p-6 sm:p-10 rounded-xl shadow-lg border border-slate-200 space-y-6 max-w-3xl mx-auto print:shadow-none print:border-none print:p-0">
      {/* 1. Document Header */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Settle<span className="text-blue-600">IQ</span>
            </h1>
            <p className="text-xs font-bold tracking-widest uppercase text-blue-600 mt-0.5">
              AI-Assisted Reconciliation Report
            </p>
          </div>
          <div className="text-left sm:text-right text-xs text-slate-500 space-y-1">
            <p><span className="font-semibold text-slate-700">Report ID:</span> <span className="font-mono">{reportData.report_id}</span></p>
            <p><span className="font-semibold text-slate-700">Date:</span> {formatDate(reportData.generated_at)}</p>
          </div>
        </div>

        {/* Metadata Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Batch / Run ID</span>
            <p className="font-mono font-bold text-slate-900 mt-0.5">{reportData.run_id.slice(0, 12).toUpperCase()}</p>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Batch Reference</span>
            <p className="font-bold text-slate-900 mt-0.5">{reportData.batch_reference || 'N/A'}</p>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</span>
            <p className="font-bold text-blue-600 mt-0.5">{reportData.run_status}</p>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Volume</span>
            <p className="font-bold text-slate-900 mt-0.5">{reportData.metrics.total_transactions.toLocaleString()} Records</p>
          </div>
        </div>
      </div>

      {/* 2. Executive Summary */}
      <div className="space-y-2">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-l-2 border-blue-600 pl-2">
          1. Executive Summary
        </h2>
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-700 leading-relaxed">
          {reportData.narrative.executive_summary}
        </div>
      </div>

      {/* 3. Financial Reconciliation Metrics */}
      <div className="space-y-2">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-l-2 border-blue-600 pl-2">
          2. Financial Reconciliation Metrics
        </h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-bold border-b border-slate-800">
                <th className="py-2.5 px-3.5">Metric Description</th>
                <th className="py-2.5 px-3.5">Reconciliation Value</th>
                <th className="py-2.5 px-3.5 hidden sm:table-cell">Scope / Benchmark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              <tr className="bg-white">
                <td className="py-2 px-3.5 font-bold text-slate-900">Total Transactions Processed</td>
                <td className="py-2 px-3.5 font-semibold">{reportData.metrics.total_transactions.toLocaleString()}</td>
                <td className="py-2 px-3.5 text-slate-500 hidden sm:table-cell">100% Ingestion Volume</td>
              </tr>
              <tr className="bg-slate-50/50">
                <td className="py-2 px-3.5 font-bold text-slate-900">Total Expected Gross Amount</td>
                <td className="py-2 px-3.5 font-semibold font-mono">₹{formattedExpected}</td>
                <td className="py-2 px-3.5 text-slate-500 hidden sm:table-cell">Internal Ledger / Payment Records</td>
              </tr>
              <tr className="bg-white">
                <td className="py-2 px-3.5 font-bold text-slate-900">Total Verified Settled Amount</td>
                <td className="py-2 px-3.5 font-semibold font-mono">₹{formattedSettled}</td>
                <td className="py-2 px-3.5 text-slate-500 hidden sm:table-cell">Bank & Gateway Settlements</td>
              </tr>
              <tr className="bg-slate-50/50">
                <td className="py-2 px-3.5 font-bold text-slate-900">Net Settlement Discrepancy</td>
                <td className={`py-2 px-3.5 font-black font-mono ${Math.abs(diffAmt) > 0.01 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {diffAmt < 0 ? `-₹${formattedDiff}` : `₹${formattedDiff}`}
                </td>
                <td className="py-2 px-3.5 text-slate-500 hidden sm:table-cell">Variance (Expected - Settled)</td>
              </tr>
              <tr className="bg-white">
                <td className="py-2 px-3.5 font-bold text-slate-900">Clean Matched Transactions</td>
                <td className="py-2 px-3.5 font-semibold text-emerald-600">
                  {reportData.metrics.matched_count.toLocaleString()} ({reportData.metrics.match_rate}%)
                </td>
                <td className="py-2 px-3.5 text-slate-500 hidden sm:table-cell">Zero discrepancy, 1-to-1 match</td>
              </tr>
              <tr className="bg-slate-50/50">
                <td className="py-2 px-3.5 font-bold text-slate-900">Exceptions Flagged</td>
                <td className="py-2 px-3.5 font-semibold text-amber-600">{reportData.metrics.exceptions_count.toLocaleString()}</td>
                <td className="py-2 px-3.5 text-slate-500 hidden sm:table-cell">Discrepancies identified by engine</td>
              </tr>
              <tr className="bg-white">
                <td className="py-2 px-3.5 font-bold text-slate-900">Automated Guardrail Resolutions</td>
                <td className="py-2 px-3.5 font-semibold">{reportData.metrics.auto_resolved_count.toLocaleString()} ({reportData.metrics.auto_resolution_rate}%)</td>
                <td className="py-2 px-3.5 text-slate-500 hidden sm:table-cell">Resolved via deterministic rules</td>
              </tr>
              <tr className="bg-slate-50/50">
                <td className="py-2 px-3.5 font-bold text-slate-900">Human-Approved Resolutions</td>
                <td className="py-2 px-3.5 font-semibold">{reportData.metrics.human_approved_count.toLocaleString()}</td>
                <td className="py-2 px-3.5 text-slate-500 hidden sm:table-cell">Authorized via Maker-Checker queue</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Exception Classification & Resolution Summary */}
      <div className="space-y-2">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-l-2 border-blue-600 pl-2">
          3. Exception Classification & Resolution Summary
        </h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-blue-600 text-white font-bold border-b border-blue-700">
                <th className="py-2.5 px-3.5">Category</th>
                <th className="py-2.5 px-3.5">Flagged Count</th>
                <th className="py-2.5 px-3.5 hidden sm:table-cell">Resolution Method</th>
                <th className="py-2.5 px-3.5">Audit Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              <tr className="bg-white">
                <td className="py-2 px-3.5 font-bold text-slate-900">Amount Mismatch</td>
                <td className="py-2 px-3.5 font-mono">{reportData.exception_breakdown.AMOUNT_MISMATCH || 0}</td>
                <td className="py-2 px-3.5 text-slate-500 hidden sm:table-cell">Fee Deductions & Variances</td>
                <td className="py-2 px-3.5 font-medium">Auto-resolved / Verified</td>
              </tr>
              <tr className="bg-slate-50/50">
                <td className="py-2 px-3.5 font-bold text-slate-900">Missing Settlement Record</td>
                <td className="py-2 px-3.5 font-mono">{reportData.exception_breakdown.MISSING_SETTLEMENT || 0}</td>
                <td className="py-2 px-3.5 text-slate-500 hidden sm:table-cell">Unsettled Transactions</td>
                <td className="py-2 px-3.5 font-medium">Queued for Review</td>
              </tr>
              <tr className="bg-white">
                <td className="py-2 px-3.5 font-bold text-slate-900">Duplicate Settlement Record</td>
                <td className="py-2 px-3.5 font-mono">{reportData.exception_breakdown.DUPLICATE || 0}</td>
                <td className="py-2 px-3.5 text-slate-500 hidden sm:table-cell">Multi-Settlement Conflict</td>
                <td className="py-2 px-3.5 font-medium">Queued for Review</td>
              </tr>
              <tr className="bg-slate-50/50">
                <td className="py-2 px-3.5 font-bold text-slate-900">Order Reference Mismatch</td>
                <td className="py-2 px-3.5 font-mono">{reportData.exception_breakdown.REFERENCE_MISMATCH || 0}</td>
                <td className="py-2 px-3.5 text-slate-500 hidden sm:table-cell">Correlation / Order ID Match</td>
                <td className="py-2 px-3.5 font-medium">Auto-resolved / Guardrail</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Key Operational Findings */}
      <div className="space-y-2">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-l-2 border-blue-600 pl-2">
          4. Key Operational Findings
        </h2>
        <ul className="space-y-1.5 bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-xs sm:text-sm text-slate-700">
          {reportData.narrative.key_findings.map((finding, idx) => (
            <li key={idx} className="flex items-start space-x-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>{finding}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 6. Final Reconciliation Outcome */}
      <div className="space-y-2 pt-1">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-l-2 border-blue-600 pl-2">
          5. Final Reconciliation Outcome
        </h2>
        <div className="space-y-2 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <p>{reportData.narrative.reconciliation_outcome}</p>
          <p className="font-medium text-slate-600">{reportData.narrative.conclusion}</p>
        </div>
      </div>

      {/* Document Footer */}
      <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400">
        <span>Confidential — For Internal & Stakeholder Reconciliation Review Only</span>
        <span>Page 1 of 1</span>
      </div>
    </div>
  );
};
