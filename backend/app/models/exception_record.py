import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Float, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database.base import Base
from app.models.enums import ExceptionType, ExceptionStatus

class ExceptionRecord(Base):
    __tablename__ = "exceptions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    reconciliation_run_id = Column(String(36), ForeignKey("reconciliation_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    source_reference = Column(String(64), index=True, nullable=True)
    exception_type = Column(SQLEnum(ExceptionType), nullable=False)
    status = Column(SQLEnum(ExceptionStatus), default=ExceptionStatus.OPEN, nullable=False)
    severity = Column(String(32), default="MEDIUM", nullable=False)
    detected_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    reconciliation_run = relationship("ReconciliationRun", back_populates="exceptions")
    evidence = relationship("ExceptionEvidence", back_populates="exception", cascade="all, delete-orphan")
    decision = relationship("ReviewDecision", back_populates="exception", uselist=False, cascade="all, delete-orphan")


class ExceptionEvidence(Base):
    __tablename__ = "exception_evidence"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    exception_id = Column(String(36), ForeignKey("exceptions.id", ondelete="CASCADE"), nullable=False, index=True)
    evidence_type = Column(String(64), nullable=False)
    evidence_summary = Column(Text, nullable=False)
    confidence = Column(Float, nullable=True)
    raw_payload = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    exception = relationship("ExceptionRecord", back_populates="evidence")
