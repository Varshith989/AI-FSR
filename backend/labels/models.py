import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from backend.database import Base
from backend.utils.types import SafeJSON


class LabelValidation(Base):
    __tablename__ = "label_validations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True, index=True)
    file_name = Column(String(255), nullable=False)
    raw_text = Column(Text, nullable=True)
    status = Column(String(50), default="UPLOADED", nullable=False)  # UPLOADED, EXTRACTED, VALIDATED
    extracted_data = Column(SafeJSON, nullable=True)
    score = Column(Integer, nullable=True)
    overall_status = Column(String(50), nullable=True)  # COMPLIANT, REVIEW_REQUIRED, NON_COMPLIANT
    issues = Column(SafeJSON, default=list, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
