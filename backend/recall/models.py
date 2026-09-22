import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Float, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from backend.database import Base
from backend.utils.types import SafeJSON


class RecallPrediction(Base):
    __tablename__ = "recall_predictions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    batch_id = Column(UUID(as_uuid=True), ForeignKey("batches.id", ondelete="CASCADE"), nullable=False, index=True)
    model_version = Column(String(50), nullable=False)
    risk_probability = Column(Float, nullable=False)
    risk_level = Column(String(50), nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    confidence = Column(Float, nullable=False)
    reason_codes = Column(SafeJSON, default=list, nullable=False)  # e.g. [{"factor": "supplier_history", "weight": 0.31}]
    recommended_actions = Column(SafeJSON, default=list, nullable=False)
    predicted_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    batch = relationship("Batch")


class RecallEvent(Base):
    __tablename__ = "recall_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    batch_id = Column(UUID(as_uuid=True), ForeignKey("batches.id", ondelete="CASCADE"), nullable=False, index=True)
    reason = Column(Text, nullable=False)
    severity = Column(String(50), nullable=False)  # CLASS_I, CLASS_II, CLASS_III or CRITICAL, HIGH, MEDIUM
    status = Column(String(50), default="INITIATED", nullable=False)  # INITIATED, NOTIFIED, QUARANTINED, COMPLETED, CLOSED
    initiated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    closed_at = Column(DateTime(timezone=True), nullable=True)

    batch = relationship("Batch")
