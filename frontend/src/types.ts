export type ExceptionType = 
  | 'AMOUNT_MISMATCH'
  | 'MISSING_SETTLEMENT'
  | 'DUPLICATE'
  | 'REFERENCE_MISMATCH'
  | 'UNKNOWN';

export type ExceptionStatus = 
  | 'OPEN'
  | 'INVESTIGATING'
  | 'AUTO_RESOLVED'
  | 'HUMAN_REVIEW';

export type DecisionOutcome = 
  | 'AUTO_RESOLVE'
  | 'HUMAN_REVIEW'
  | 'APPROVED'
  | 'REJECTED';

export type AuditAction = 
  | 'FILE_UPLOADED'
  | 'RECONCILIATION_STARTED'
  | 'RECONCILIATION_COMPLETED'
  | 'EXCEPTION_CREATED'
  | 'AI_INVESTIGATION_COMPLETED'
  | 'AUTO_RESOLVED'
  | 'SENT_TO_REVIEW'
  | 'HUMAN_APPROVED'
  | 'HUMAN_REJECTED';

export type NavTab = 'dashboard' | 'upload' | 'reconciliation' | 'exceptions' | 'review' | 'audit';

export type UserRole = 'OPERATIONS_ANALYST' | 'RECONCILIATION_MANAGER';

export interface DemoUser {
  id: string;
  name: string;
  role: UserRole;
  roleTitle: string;
  roleCategory: 'Maker' | 'Checker';
  initials: string;
  allowedTabs: NavTab[];
  description: string;
}

export interface HealthStatus {
  status: string;
  service: string;
  version: string;
  environment: string;
}

export interface PaymentDetail {
  id: string;
  payment_id: string;
  order_id?: string;
  payment_amount: number;
  payment_date?: string;
  payment_status: string;
  customer_reference?: string;
  currency: string;
}

export interface SettlementDetail {
  id: string;
  settlement_id: string;
  payment_id?: string;
  settlement_amount: number;
  settlement_date?: string;
  settlement_status: string;
  settlement_reference?: string;
  settlement_batch_id?: string;
  currency: string;
}

export interface FeeDetail {
  id: string;
  fee_id: string;
  payment_id?: string;
  fee_amount: number;
  fee_type: string;
  fee_date?: string;
}

export interface ReviewDecisionDetail {
  id: string;
  recommended_action?: string;
  decision_outcome: DecisionOutcome;
  confidence?: number;
  decided_by: string;
  reason?: string;
  created_at: string;
}

export interface ExceptionListItem {
  id: string;
  reconciliation_run_id: string;
  source_reference?: string;
  exception_type: ExceptionType;
  status: ExceptionStatus;
  severity: string;
  detected_at: string;
  payment_amount?: number;
  customer_reference?: string;
}

export interface ExceptionDetailResponse {
  id: string;
  reconciliation_run_id: string;
  source_reference?: string;
  exception_type: ExceptionType;
  status: ExceptionStatus;
  severity: string;
  detected_at: string;
  payment?: PaymentDetail;
  settlements: SettlementDetail[];
  fees: FeeDetail[];
  decision?: ReviewDecisionDetail;
}

export interface CalculatedFinancialFacts {
  payment_amount: number;
  total_settled_amount: number;
  total_fee_amount: number;
  discrepancy_amount: number;
  settlement_count: number;
  fee_count: number;
  has_alternative_reference: boolean;
  is_negative_fee: boolean;
  is_pending_settlement: boolean;
  evidence_ids: string[];
}

export interface EvidencePackage {
  exception_id: string;
  reconciliation_run_id: string;
  source_reference?: string;
  exception_type: ExceptionType;
  status: ExceptionStatus;
  severity: string;
  detected_at: string;
  financial_records: {
    payment?: PaymentDetail;
    settlements: SettlementDetail[];
    fees: FeeDetail[];
  };
  calculated_facts: CalculatedFinancialFacts;
}

export interface AIInvestigationResult {
  exception_id: string;
  exception_type: ExceptionType;
  root_cause: string;
  confidence: number;
  recommended_action: string;
  explanation: string;
  evidence_ids: string[];
  model_used?: string;
  is_fallback: boolean;
}

export interface GuardrailChecks {
  recommendation_valid: boolean;
  confidence_passed: boolean;
  evidence_grounded: boolean;
  known_rule_satisfied: boolean;
  sanity_passed: boolean;
}

export interface DecisionResponse {
  exception_id: string;
  decision_outcome: DecisionOutcome;
  recommended_action: string;
  confidence: number;
  decided_by: string;
  reason: string;
  checks: GuardrailChecks;
}

export interface BatchEvaluationSummary {
  reconciliation_run_id: string;
  total_exceptions: number;
  auto_resolved_count: number;
  human_review_count: number;
  decisions: DecisionResponse[];
}

export interface HumanReviewRequest {
  action: 'APPROVE' | 'REJECT' | 'KEEP_UNRESOLVED';
  notes?: string;
  reviewed_by?: string;
}

export interface HumanReviewResponse {
  exception_id: string;
  action_taken: string;
  new_status: ExceptionStatus;
  decision_outcome: DecisionOutcome;
  decided_by: string;
  notes?: string;
  timestamp: string;
}

export interface AuditLogItem {
  id: string;
  user_id?: string;
  action_type: AuditAction;
  entity_type: string;
  entity_id: string;
  details?: any;
  created_at: string;
}

export interface DashboardStats {
  has_data: boolean;
  latest_run_id?: string;
  run_status?: string;
  started_at?: string;
  completed_at?: string;
  total_processed: number;
  matched_count: number;
  exceptions_count: number;
  auto_resolved_count: number;
  human_review_count: number;
  match_rate: number;
  auto_resolution_rate: number;
  breakdown: Record<string, number>;
  recent_exceptions: ExceptionListItem[];
}

export interface FileSummary {
  file_name: string;
  record_count: number;
  status: string;
}

export interface ValidationErrorDetail {
  file_name: string;
  row_number?: number;
  field?: string;
  message: string;
}

export interface UploadResponse {
  success: boolean;
  reconciliation_run_id: string;
  message: string;
  summary: {
    payments_count: number;
    settlements_count: number;
    fees_count: number;
  };
  files: FileSummary[];
  validation_errors: ValidationErrorDetail[];
}

export interface ReconcileResponse {
  reconciliation_run_id: string;
  status: string;
  total_records: number;
  matched_records: number;
  exceptions_count: number;
  match_rate: number;
  breakdown: {
    AMOUNT_MISMATCH: number;
    MISSING_SETTLEMENT: number;
    DUPLICATE: number;
    REFERENCE_MISMATCH: number;
    UNKNOWN: number;
  };
}
