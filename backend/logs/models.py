import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Float, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from backend.database import Base
from backend.utils.types import SafeJSON


class AIModelVersion(Base):
    __tablename__ = "ai_model_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    model_name = Column(String(100), nullable=False)
    version = Column(String(50), nullable=False)
    provider = Column(String(100), nullable=False)  # Anthropic, OpenAI, Google Gemini, Local XGBoost
    purpose = Column(String(100), nullable=False)  # RAG, Recall Risk, Label OCR, Compliance Audit
    deployment_date = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    status = Column(String(50), default="ACTIVE", nullable=False)  # ACTIVE, RETIRED, CANDIDATE


class AIPrediction(Base):
    __tablename__ = "ai_predictions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    model_id = Column(UUID(as_uuid=True), ForeignKey("ai_model_versions.id", ondelete="SET NULL"), nullable=True, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    input_hash = Column(String(128), nullable=False, index=True)
    output = Column(SafeJSON, nullable=False)
    confidence = Column(Float, nullable=True)
    explanation = Column(SafeJSON, nullable=True)  # SHAP values, citation links, factor weights
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    model = relationship("AIModelVersion")


class AIAuditLog(Base):
    __tablename__ = "ai_audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    model_id = Column(UUID(as_uuid=True), ForeignKey("ai_model_versions.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(100), nullable=False)  # RAG_QUERY, LABEL_VALIDATION, RECALL_INFERENCE, SOP_GAP_ANALYSIS
    input_reference = Column(String(255), nullable=True)  # e.g. document_id, query_hash, batch_id
    output_reference = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User")
    model = relationship("AIModelVersion")
