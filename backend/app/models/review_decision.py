import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Float, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database.base import Base
from app.models.enums import DecisionOutcome

class ReviewDecision(Base):
    __tablename__ = "review_decisions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    exception_id = Column(String(36), ForeignKey("exceptions.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    recommended_action = Column(String(64), nullable=True)
    decision_outcome = Column(SQLEnum(DecisionOutcome), nullable=False)
    confidence = Column(Float, nullable=True)
    decided_by = Column(String(64), default="SYSTEM", nullable=False)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    exception = relationship("ExceptionRecord", back_populates="decision")
