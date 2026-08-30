import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ShieldCheck,
  FileSpreadsheet,
  History,
  Loader2
} from 'lucide-react';
import type {
  ExceptionDetailResponse,
  EvidencePackage,
  AIInvestigationResult,
  AuditLogItem
} from '../../types';
import {
  getExceptionDetail,
  getExceptionEvidence,
  investigateException,
  evaluateExceptionGuardrails,
  getExceptionAuditTrail
} from '../../services/api';
import { Modal } from '../common/Modal';
import { ExceptionTypeBadge, StatusBadge, ActionBadge } from '../common/Badge';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface ExceptionDetailModalProps {
  exceptionId: string | null;
  onClose: () => void;
  onRefreshParent?: () => void;
}

export const ExceptionDetailModal: React.FC<ExceptionDetailModalProps> = ({
  exceptionId,
  onClose,
  onRefreshParent
}) => {
  const [activeTab, setActiveTab] = useState<'evidence' | 'ai' | 'audit'>('evidence');
  const [detail, setDetail] = useState<ExceptionDetailResponse | null>(null);
  const [evidence, setEvidence] = useState<EvidencePackage | null>(null);
  const [aiResult, setAiResult] = useState<AIInvestigationResult | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [investigating, setInvestigating] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!exceptionId) return;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [det, ev, logs] = await Promise.all([
          getExceptionDetail(exceptionId),
          getExceptionEvidence(exceptionId),
          getExceptionAuditTrail(exceptionId)
        ]);
        setDetail(det);
        setEvidence(ev);
        setAuditLogs(logs);
      } catch (err: any) {
        setError(err.message || 'Failed to load exception details');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [exceptionId]);

  const handleRunInvestigation = async () => {
    if (!exceptionId) return;
    setInvestigating(true);
    setError(null);
    try {
      const res = await investigateException(exceptionId);
      setAiResult(res);
    } catch (err: any) {
      setError(err.message || 'AI investigation failed');
    } finally {
      setInvestigating(false);
    }
  };

  const handleEvaluateGuardrails = async () => {
    if (!exceptionId) return;
    setEvaluating(true);
    setError(null);
    try {
      await evaluateExceptionGuardrails(exceptionId);
      // Reload detail and audit logs to show newly persisted decision
      const [updatedDet, updatedLogs] = await Promise.all([
        getExceptionDetail(exceptionId),
        getExceptionAuditTrail(exceptionId)
      ]);
      setDetail(updatedDet);
      setAuditLogs(updatedLogs);
      if (onRefreshParent) onRefreshParent();
    } catch (err: any) {
      setError(err.message || 'Guardrail evaluation failed');
    } finally {
      setEvaluating(false);
    }
  };

  if (!exceptionId) return null;

  return (
    <Modal
      isOpen={Boolean(exceptionId)}
      onClose={onClose}
      title={`Exception Details — ${exceptionId}`}
      subtitle="Correlated financial evidence, calculated facts, and AI investigation"
      maxWidth="max-w-5xl"
    >
      {loading ? (
        <LoadingSpinner message="Loading exception context and evidence..." />
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
          {error}
        </div>
      ) : detail && evidence ? (
        <div className="space-y-6">
          {/* Header Overview Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <ExceptionTypeBadge type={detail.exception_type} />
              <StatusBadge status={detail.status} />
              <span className="text-xs text-slate-400 font-mono">Run: {detail.reconciliation_run_id}</span>
            </div>

            <div className="flex items-center space-x-6 text-xs">
              <div>
                <span className="text-slate-500 block uppercase font-semibold text-[10px]">Payment Amount</span>
                <span className="text-white font-mono font-bold text-sm">
                  ₹{evidence.calculated_facts.payment_amount.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block uppercase font-semibold text-[10px]">Total Settled</span>
                <span className="text-white font-mono font-bold text-sm">
                  ₹{evidence.calculated_facts.total_settled_amount.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block uppercase font-semibold text-[10px]">Total Fees</span>
                <span className="text-white font-mono font-bold text-sm">
                  ₹{evidence.calculated_facts.total_fee_amount.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block uppercase font-semibold text-[10px]">Net Discrepancy</span>
                <span className={`font-mono font-bold text-sm ${
                  Math.abs(evidence.calculated_facts.discrepancy_amount) > 0.01 ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  ₹{evidence.calculated_facts.discrepancy_amount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-800 space-x-6 text-xs">
            <button
              onClick={() => setActiveTab('evidence')}
              className={`pb-3 font-semibold transition border-b-2 flex items-center space-x-2 ${
                activeTab === 'evidence'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Financial Records & Facts</span>
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`pb-3 font-semibold transition border-b-2 flex items-center space-x-2 ${
                activeTab === 'ai'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              <span>AI Investigation & Guardrails</span>
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`pb-3 font-semibold transition border-b-2 flex items-center space-x-2 ${
                activeTab === 'audit'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="h-4 w-4" />
              <span>Audit Trail ({auditLogs.length})</span>
            </button>
          </div>

          {/* Tab 1: Financial Records & Facts */}
          {activeTab === 'evidence' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Raw Records Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Payment Record */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3">1. Payment Record</span>
                  {detail.payment ? (
                    <div className="space-y-2 text-xs font-mono">
                      <div><span className="text-slate-500">ID:</span> <span className="text-white">{detail.payment.payment_id}</span></div>
                      <div><span className="text-slate-500">Order:</span> <span className="text-white">{detail.payment.order_id || 'N/A'}</span></div>
                      <div><span className="text-slate-500">Amount:</span> <span className="text-indigo-300 font-bold">₹{detail.payment.payment_amount.toFixed(2)}</span></div>
                      <div><span className="text-slate-500">Status:</span> <span className="text-emerald-400">{detail.payment.payment_status}</span></div>
                      <div><span className="text-slate-500">Customer:</span> <span className="text-slate-300">{detail.payment.customer_reference || 'N/A'}</span></div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">No direct payment record found</p>
                  )}
                </div>

                {/* Settlement Record(s) */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3">
                    2. Settlement Record(s) ({detail.settlements.length})
                  </span>
                  {detail.settlements.length > 0 ? (
                    <div className="space-y-3">
                      {detail.settlements.map((s, idx) => (
                        <div key={s.id || idx} className="space-y-1 text-xs font-mono border-b border-slate-800/80 pb-2 last:border-0 last:pb-0">
                          <div><span className="text-slate-500">ID:</span> <span className="text-white">{s.settlement_id}</span></div>
                          <div><span className="text-slate-500">Settled:</span> <span className="text-indigo-300 font-bold">₹{s.settlement_amount.toFixed(2)}</span></div>
                          <div><span className="text-slate-500">Ref:</span> <span className="text-slate-400">{s.settlement_reference || 'N/A'}</span></div>
                          <div><span className="text-slate-500">Status:</span> <span className="text-emerald-400">{s.settlement_status}</span></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-rose-400/80 italic">Zero matching settlements recorded in processor batch</p>
                  )}
                </div>

                {/* Fee Record(s) */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3">
                    3. Fee Record(s) ({detail.fees.length})
                  </span>
                  {detail.fees.length > 0 ? (
                    <div className="space-y-3">
                      {detail.fees.map((f, idx) => (
                        <div key={f.id || idx} className="space-y-1 text-xs font-mono border-b border-slate-800/80 pb-2 last:border-0 last:pb-0">
                          <div><span className="text-slate-500">ID:</span> <span className="text-white">{f.fee_id}</span></div>
                          <div><span className="text-slate-500">Fee Amount:</span> <span className="text-amber-400 font-bold">₹{f.fee_amount.toFixed(2)}</span></div>
                          <div><span className="text-slate-500">Type:</span> <span className="text-slate-400">{f.fee_type}</span></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">No fee record attached</p>
                  )}
                </div>
              </div>

              {/* Verified Deterministic Facts */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Deterministic Evidence Grounding</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                  <div>
                    <span className="text-slate-500 block">Formula</span>
                    <span className="text-white font-semibold">P - (S + F)</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Discrepancy</span>
                    <span className="text-amber-400 font-semibold">₹{evidence.calculated_facts.discrepancy_amount.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Alt Reference Key</span>
                    <span className="text-white">{evidence.calculated_facts.has_alternative_reference ? 'Yes (SR_...)' : 'No'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Verified Evidence IDs</span>
                    <span className="text-indigo-400">{evidence.calculated_facts.evidence_ids.join(', ')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: AI Investigation & Guardrails */}
          {activeTab === 'ai' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Trigger AI Investigation Button */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/20">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                    <Sparkles className="h-4 w-4 text-indigo-400" />
                    <span>AI Financial Investigator</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Analyzes structured evidence package without modifying database records.
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleRunInvestigation}
                    disabled={investigating}
                    className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition shadow-sm"
                  >
                    {investigating ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Investigating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Run AI Investigation</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleEvaluateGuardrails}
                    disabled={evaluating}
                    className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white transition shadow-sm"
                  >
                    {evaluating ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Evaluating...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>Evaluate Guardrails</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* AI Investigation Output Card */}
              {aiResult && (
                <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">AI Investigation Findings</span>
                    <span className="text-xs font-mono text-slate-400">Model: {aiResult.model_used || 'gemini'}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-slate-500 block uppercase font-semibold">Identified Root Cause</span>
                      <span className="text-white font-mono font-bold mt-1 block">{aiResult.root_cause}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block uppercase font-semibold">AI Confidence</span>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${aiResult.confidence >= 0.90 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                            style={{ width: `${Math.round(aiResult.confidence * 100)}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold text-white">{Math.round(aiResult.confidence * 100)}%</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500 block uppercase font-semibold">Advisory Recommendation</span>
                      <span className={`font-semibold mt-1 inline-block ${
                        aiResult.recommended_action === 'AUTO_RESOLVE' ? 'text-emerald-400' : 'text-indigo-400'
                      }`}>
                        {aiResult.recommended_action}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500 block uppercase font-semibold text-xs mb-1">Explanation</span>
                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-800">
                      {aiResult.explanation}
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-500 block uppercase font-semibold text-xs mb-1">Grounded Evidence IDs</span>
                    <div className="flex flex-wrap gap-2">
                      {aiResult.evidence_ids.map((id) => (
                        <span key={id} className="px-2 py-0.5 rounded text-xs font-mono bg-slate-950 text-indigo-300 border border-slate-800">
                          {id}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Guardrail Decision & Persisted Context Card */}
              {detail.decision && (
                <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-1.5">
                      <ShieldCheck className="h-4 w-4" />
                      <span>Persisted Decision Context</span>
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Decided by: <strong>{detail.decision.decided_by}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-slate-500 block uppercase font-semibold">Decision Outcome</span>
                      <span className="text-white font-mono font-bold mt-1 block">{detail.decision.decision_outcome}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block uppercase font-semibold">Recorded Confidence</span>
                      <span className="text-white font-mono font-bold mt-1 block">
                        {detail.decision.confidence ? `${Math.round(detail.decision.confidence * 100)}%` : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block uppercase font-semibold">AI Recommendation</span>
                      <span className="text-slate-300 font-mono mt-1 block">{detail.decision.recommended_action || 'N/A'}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500 block uppercase font-semibold text-xs mb-1">Decision Rationale</span>
                    <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800">
                      {detail.decision.reason}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Chronological Audit Trail */}
          {activeTab === 'audit' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Exception Lifecycle Timeline</h4>
              {auditLogs.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">No specific audit entries recorded for this exception yet.</p>
              ) : (
                <div className="relative border-l border-slate-800 ml-4 pl-6 space-y-6">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="relative group">
                      {/* Timeline Dot */}
                      <div className="absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full bg-slate-900 border-2 border-indigo-500" />
                      <div className="flex items-center space-x-3">
                        <ActionBadge action={log.action_type} />
                        <span className="text-xs text-slate-500 font-mono">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      {log.details && (
                        <div className="mt-2 text-xs text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono">
                          {typeof log.details === 'object' ? JSON.stringify(log.details, null, 2) : log.details}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}
    </Modal>
  );
};
