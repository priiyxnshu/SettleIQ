/**
 * SettleIQ Frontend API Client Service
 *
 * Central HTTP client module for all backend REST communications.
 * Encapsulates endpoints for health status, dashboard statistics, multi-CSV ingestion,
 * reconciliation engine execution, guardrail evaluation, AI investigations,
 * human review submissions, audit trail querying, and executive report/PDF generation.
 */

import type {
  HealthStatus,
  DashboardStats,
  UploadResponse,
  UploadHistoryResponse,
  ReconcileResponse,
  BatchEvaluationSummary,
  ExceptionListItem,
  ExceptionDetailResponse,
  EvidencePackage,
  AIInvestigationResult,
  DecisionResponse,
  HumanReviewRequest,
  HumanReviewResponse,
  AuditLogItem,
  ReconciliationReportData
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Generic response handler that unwraps JSON payloads and standardizes HTTP error messages.
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorDetail = `Request failed with status ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson.detail) {
        if (typeof errJson.detail === 'string') {
          errorDetail = errJson.detail;
        } else if (errJson.detail.message) {
          errorDetail = errJson.detail.message;
        } else {
          errorDetail = JSON.stringify(errJson.detail);
        }
      }
    } catch {
      // Ignore JSON parse errors
    }
    throw new Error(errorDetail);
  }
  return response.json();
}

/**
 * Query backend operational health status and database connectivity.
 */
export async function checkBackendHealth(): Promise<HealthStatus> {
  const res = await fetch(`${API_BASE}/health`, {
    headers: { 'Accept': 'application/json' }
  });
  return handleResponse<HealthStatus>(res);
}

/**
 * Fetch high-level reconciliation KPIs, transaction volumes, and exception distribution.
 */
export async function getDashboardMetrics(): Promise<DashboardStats> {
  const res = await fetch(`${API_BASE}/dashboard`, {
    headers: { 'Accept': 'application/json' }
  });
  return handleResponse<DashboardStats>(res);
}

/**
 * Upload Payments, Settlements, and Fees CSV files for schema validation and staging.
 */
export async function uploadFinancialData(
  payments: File,
  settlements: File,
  fees: File
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('payments_file', payments);
  formData.append('settlements_file', settlements);
  formData.append('fees_file', fees);

  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData
  });
  return handleResponse<UploadResponse>(res);
}

/**
 * Query recent file upload and batch ingestion history.
 */
export async function getUploadHistory(limit: number = 5): Promise<UploadHistoryResponse> {
  const res = await fetch(`${API_BASE}/upload/history?limit=${limit}`, {
    headers: { 'Accept': 'application/json' }
  });
  return handleResponse<UploadHistoryResponse>(res);
}

/**
 * Trigger the 5-rule deterministic reconciliation engine for a specific run.
 */
export async function runReconciliation(reconciliation_run_id: string): Promise<ReconcileResponse> {
  const res = await fetch(`${API_BASE}/reconcile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ reconciliation_run_id })
  });
  return handleResponse<ReconcileResponse>(res);
}

/**
 * Batch-evaluate all exceptions in a reconciliation run against the 5 guardrail safety checks.
 */
export async function evaluateRunGuardrails(reconciliation_run_id: string): Promise<BatchEvaluationSummary> {
  const res = await fetch(`${API_BASE}/reconciliation/${reconciliation_run_id}/evaluate-all`, {
    method: 'POST',
    headers: { 'Accept': 'application/json' }
  });
  return handleResponse<BatchEvaluationSummary>(res);
}

/**
 * Query and filter reconciliation exceptions with pagination.
 */
export async function getExceptions(params?: {
  reconciliation_run_id?: string;
  exception_type?: string;
  status?: string;
  skip?: number;
  limit?: number;
}): Promise<{ total: number; items: ExceptionListItem[] }> {
  const searchParams = new URLSearchParams();
  if (params?.reconciliation_run_id) searchParams.append('reconciliation_run_id', params.reconciliation_run_id);
  if (params?.exception_type) searchParams.append('exception_type', params.exception_type);
  if (params?.status) searchParams.append('status', params.status);
  if (params?.skip !== undefined) searchParams.append('skip', params.skip.toString());
  if (params?.limit !== undefined) searchParams.append('limit', params.limit.toString());

  const queryString = searchParams.toString();
  const url = `${API_BASE}/exceptions${queryString ? `?${queryString}` : ''}`;
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  return handleResponse<{ total: number; items: ExceptionListItem[] }>(res);
}

/**
 * Retrieve correlated exception details including payment, settlements, fees, and decisions.
 */
export async function getExceptionDetail(id: string): Promise<ExceptionDetailResponse> {
  const res = await fetch(`${API_BASE}/exceptions/${id}`, {
    headers: { 'Accept': 'application/json' }
  });
  return handleResponse<ExceptionDetailResponse>(res);
}

/**
 * Fetch the structured EvidencePackage containing source records and calculated financial facts.
 */
export async function getExceptionEvidence(id: string): Promise<EvidencePackage> {
  const res = await fetch(`${API_BASE}/exceptions/${id}/evidence`, {
    headers: { 'Accept': 'application/json' }
  });
  return handleResponse<EvidencePackage>(res);
}

/**
 * Trigger an AI root-cause analysis investigation for a specific exception.
 */
export async function investigateException(id: string): Promise<AIInvestigationResult> {
  const res = await fetch(`${API_BASE}/exceptions/${id}/investigate`, {
    method: 'POST',
    headers: { 'Accept': 'application/json' }
  });
  return handleResponse<AIInvestigationResult>(res);
}

/**
 * Evaluate an exception against the 5 deterministic guardrail safety gates.
 */
export async function evaluateExceptionGuardrails(id: string): Promise<DecisionResponse> {
  const res = await fetch(`${API_BASE}/exceptions/${id}/evaluate`, {
    method: 'POST',
    headers: { 'Accept': 'application/json' }
  });
  return handleResponse<DecisionResponse>(res);
}

/**
 * Submit a human reviewer Maker-Checker decision (APPROVE, REJECT, KEEP_UNRESOLVED).
 */
export async function submitHumanReview(
  id: string,
  review: HumanReviewRequest
): Promise<HumanReviewResponse> {
  const res = await fetch(`${API_BASE}/exceptions/${id}/review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(review)
  });
  return handleResponse<HumanReviewResponse>(res);
}

/**
 * Query paginated immutable audit logs with optional filtering by action or entity.
 */
export async function getAuditLogs(params?: {
  action_type?: string;
  entity_type?: string;
  entity_id?: string;
  skip?: number;
  limit?: number;
}): Promise<{ total: number; items: AuditLogItem[] }> {
  const searchParams = new URLSearchParams();
  if (params?.action_type) searchParams.append('action_type', params.action_type);
  if (params?.entity_type) searchParams.append('entity_type', params.entity_type);
  if (params?.entity_id) searchParams.append('entity_id', params.entity_id);
  if (params?.skip !== undefined) searchParams.append('skip', params.skip.toString());
  if (params?.limit !== undefined) searchParams.append('limit', params.limit.toString());

  const queryString = searchParams.toString();
  const url = `${API_BASE}/audit${queryString ? `?${queryString}` : ''}`;
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  return handleResponse<{ total: number; items: AuditLogItem[] }>(res);
}

/**
 * Fetch the chronological audit trail for a specific exception record.
 */
export async function getExceptionAuditTrail(id: string): Promise<AuditLogItem[]> {
  const res = await fetch(`${API_BASE}/exceptions/${id}/audit`, {
    headers: { 'Accept': 'application/json' }
  });
  return handleResponse<AuditLogItem[]>(res);
}

/**
 * Trigger compilation of an executive reconciliation report for a given run.
 */
export async function generateReport(
  runId?: string,
  generatedBy?: string
): Promise<ReconciliationReportData> {
  const params = new URLSearchParams();
  if (runId) params.append('run_id', runId);
  if (generatedBy) params.append('generated_by', generatedBy);

  const queryString = params.toString();
  const url = `${API_BASE}/reports/generate${queryString ? `?${queryString}` : ''}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Accept': 'application/json' }
  });
  return handleResponse<ReconciliationReportData>(res);
}

/**
 * Fetch existing report data and narrative commentary for a run.
 */
export async function getReportData(runId: string): Promise<ReconciliationReportData> {
  const res = await fetch(`${API_BASE}/reports/${runId}`, {
    headers: { 'Accept': 'application/json' }
  });
  return handleResponse<ReconciliationReportData>(res);
}

/**
 * Download the generated executive report as a binary PDF document blob.
 */
export async function downloadReportPdf(runId: string): Promise<Blob> {
  const res = await fetch(`${API_BASE}/reports/${runId}/pdf`);
  if (!res.ok) {
    let errorDetail = `Failed to download PDF (status ${res.status})`;
    try {
      const errJson = await res.json();
      if (errJson.detail) errorDetail = errJson.detail;
    } catch {
      // ignore
    }
    throw new Error(errorDetail);
  }
  return res.blob();
}

