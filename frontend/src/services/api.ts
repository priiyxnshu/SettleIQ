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
  AuditLogItem
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

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

export async function checkBackendHealth(): Promise<HealthStatus> {
  const res = await fetch(`${API_BASE}/health`, {
    headers: { 'Accept': 'application/json' }
  });
  return handleResponse<HealthStatus>(res);
}

export async function getDashboardMetrics(): Promise<DashboardStats> {
  const res = await fetch(`${API_BASE}/dashboard`, {
    headers: { 'Accept': 'application/json' }
  });
  return handleResponse<DashboardStats>(res);
}

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

export async function getUploadHistory(limit: number = 5): Promise<UploadHistoryResponse> {
  const res = await fetch(`${API_BASE}/upload/history?limit=${limit}`, {
    headers: { 'Accept': 'application/json' }
  });
  return handleResponse<UploadHistoryResponse>(res);
}

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

export async function evaluateRunGuardrails(reconciliation_run_id: string): Promise<BatchEvaluationSummary> {
  const res = await fetch(`${API_BASE}/reconciliation/${reconciliation_run_id}/evaluate-all`, {
    method: 'POST',
    headers: { 'Accept': 'application/json' }
  });
  return handleResponse<BatchEvaluationSummary>(res);
}

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

export async function getExceptionDetail(id: string): Promise<ExceptionDetailResponse> {
  const res = await fetch(`${API_BASE}/exceptions/${id}`, {
    headers: { 'Accept': 'application/json' }
  });
  return handleResponse<ExceptionDetailResponse>(res);
}

export async function getExceptionEvidence(id: string): Promise<EvidencePackage> {
  const res = await fetch(`${API_BASE}/exceptions/${id}/evidence`, {
    headers: { 'Accept': 'application/json' }
  });
  return handleResponse<EvidencePackage>(res);
}

export async function investigateException(id: string): Promise<AIInvestigationResult> {
  const res = await fetch(`${API_BASE}/exceptions/${id}/investigate`, {
    method: 'POST',
    headers: { 'Accept': 'application/json' }
  });
  return handleResponse<AIInvestigationResult>(res);
}

export async function evaluateExceptionGuardrails(id: string): Promise<DecisionResponse> {
  const res = await fetch(`${API_BASE}/exceptions/${id}/evaluate`, {
    method: 'POST',
    headers: { 'Accept': 'application/json' }
  });
  return handleResponse<DecisionResponse>(res);
}

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

export async function getExceptionAuditTrail(id: string): Promise<AuditLogItem[]> {
  const res = await fetch(`${API_BASE}/exceptions/${id}/audit`, {
    headers: { 'Accept': 'application/json' }
  });
  return handleResponse<AuditLogItem[]>(res);
}
