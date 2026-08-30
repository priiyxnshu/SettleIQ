import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database.base import Base
from app.models.enums import RunStatus

class ReconciliationRun(Base):
    __tablename__ = "reconciliation_runs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    created_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    status = Column(SQLEnum(RunStatus), default=RunStatus.CREATED, nullable=False)
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="reconciliation_runs")
    payments = relationship("PaymentRecord", back_populates="reconciliation_run", cascade="all, delete-orphan")
    settlements = relationship("SettlementRecord", back_populates="reconciliation_run", cascade="all, delete-orphan")
    fees = relationship("FeeRecord", back_populates="reconciliation_run", cascade="all, delete-orphan")
    exceptions = relationship("ExceptionRecord", back_populates="reconciliation_run", cascade="all, delete-orphan")
