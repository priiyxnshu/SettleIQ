import uuid
from sqlalchemy import Column, String, Numeric, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database.base import Base

class PaymentRecord(Base):
    __tablename__ = "payment_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    reconciliation_run_id = Column(String(36), ForeignKey("reconciliation_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    payment_id = Column(String(64), index=True, nullable=False)
    order_id = Column(String(64), index=True, nullable=True)
    payment_amount = Column(Numeric(12, 2), nullable=False)
    payment_date = Column(DateTime, nullable=True)
    payment_status = Column(String(32), default="SUCCESS", nullable=False)
    customer_reference = Column(String(64), nullable=True)
    currency = Column(String(10), default="INR", nullable=False)
    raw_data = Column(Text, nullable=True)

    # Relationships
    reconciliation_run = relationship("ReconciliationRun", back_populates="payments")


class SettlementRecord(Base):
    __tablename__ = "settlement_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    reconciliation_run_id = Column(String(36), ForeignKey("reconciliation_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    settlement_id = Column(String(64), index=True, nullable=False)
    payment_id = Column(String(64), index=True, nullable=True)
    settlement_amount = Column(Numeric(12, 2), nullable=False)
    settlement_date = Column(DateTime, nullable=True)
    settlement_status = Column(String(32), default="SETTLED", nullable=False)
    settlement_reference = Column(String(64), index=True, nullable=True)
    settlement_batch_id = Column(String(64), nullable=True)
    currency = Column(String(10), default="INR", nullable=False)
    raw_data = Column(Text, nullable=True)

    # Relationships
    reconciliation_run = relationship("ReconciliationRun", back_populates="settlements")


class FeeRecord(Base):
    __tablename__ = "fee_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    reconciliation_run_id = Column(String(36), ForeignKey("reconciliation_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    fee_id = Column(String(64), index=True, nullable=False)
    payment_id = Column(String(64), index=True, nullable=True)
    fee_amount = Column(Numeric(12, 2), nullable=False)
    fee_type = Column(String(64), default="PROCESSING_FEE", nullable=False)
    fee_date = Column(DateTime, nullable=True)
    raw_data = Column(Text, nullable=True)

    # Relationships
    reconciliation_run = relationship("ReconciliationRun", back_populates="fees")
