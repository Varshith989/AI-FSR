import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Float, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from backend.database import Base


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    supplier_code = Column(String(100), nullable=False)
    name = Column(String(255), nullable=False)
    license_number = Column(String(100), nullable=True)  # FSSAI license / registration
    risk_score = Column(Float, default=0.0, nullable=False)
    health_score = Column(Float, default=100.0, nullable=False)
    status = Column(String(50), default="ACTIVE", nullable=False)  # ACTIVE, PENDING, SUSPENDED, BLACKLISTED
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
