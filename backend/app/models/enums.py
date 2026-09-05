"""
SettleIQ Domain Enumerations Module.

Defines canonical enum types representing the core domain states, file categories,
exception classifications, resolution outcomes, and immutable audit action types
used throughout the database models, API schemas, and business services.
"""

import enum


class UploadFileType(str, enum.Enum):
    """File type classification for multi-file ingestion."""
    PAYMENTS = "PAYMENTS"
    SETTLEMENTS = "SETTLEMENTS"
    FEES = "FEES"


class UploadStatus(str, enum.Enum):
    """Validation and persistence status of an uploaded file."""
    UPLOADED = "UPLOADED"
    VALIDATED = "VALIDATED"
    FAILED = "FAILED"


class RunStatus(str, enum.Enum):
    """Lifecycle execution status of a reconciliation run."""
    CREATED = "CREATED"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class ExceptionType(str, enum.Enum):
    """Classification taxonomy for detected reconciliation anomalies."""
    AMOUNT_MISMATCH = "AMOUNT_MISMATCH"
    MISSING_SETTLEMENT = "MISSING_SETTLEMENT"
    DUPLICATE = "DUPLICATE"
    REFERENCE_MISMATCH = "REFERENCE_MISMATCH"
    UNKNOWN = "UNKNOWN"


class ExceptionStatus(str, enum.Enum):
    """Workflow disposition status of an exception record."""
    OPEN = "OPEN"
    INVESTIGATING = "INVESTIGATING"
    AUTO_RESOLVED = "AUTO_RESOLVED"
    HUMAN_REVIEW = "HUMAN_REVIEW"
    REJECTED = "REJECTED"


class DecisionOutcome(str, enum.Enum):
    """Resolution decision outcome issued by guardrails or human reviewer."""
    AUTO_RESOLVE = "AUTO_RESOLVE"
    HUMAN_REVIEW = "HUMAN_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class AuditAction(str, enum.Enum):
    """Canonical event types logged to the immutable audit trail."""
    FILE_UPLOADED = "FILE_UPLOADED"
    RECONCILIATION_STARTED = "RECONCILIATION_STARTED"
    RECONCILIATION_COMPLETED = "RECONCILIATION_COMPLETED"
    EXCEPTION_CREATED = "EXCEPTION_CREATED"
    AI_INVESTIGATION_COMPLETED = "AI_INVESTIGATION_COMPLETED"
    AUTO_RESOLVED = "AUTO_RESOLVED"
    SENT_TO_REVIEW = "SENT_TO_REVIEW"
    HUMAN_APPROVED = "HUMAN_APPROVED"
    HUMAN_REJECTED = "HUMAN_REJECTED"

