import uuid
from datetime import datetime, timezone, date
import enum
from sqlalchemy import Column, String, DateTime, Date, Integer, Float, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from backend.database import Base
from backend.utils.types import SafeJSON


class BatchStatus(str, enum.Enum):
    RELEASED = "RELEASED"
    HOLD = "HOLD"
    QUARANTINED = "QUARANTINED"
    RECALLED = "RECALLED"
    DESTROYED = "DESTROYED"
    CLOSED = "CLOSED"


class Product(Base):
    __tablename__ = "products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    product_code = Column(String(100), nullable=False)
    name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    shelf_life_days = Column(Integer, nullable=True)
    allergen_profile = Column(SafeJSON, default=list, nullable=False)  # list of allergen strings
    status = Column(String(50), default="ACTIVE", nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    batches = relationship("Batch", back_populates="product", cascade="all, delete-orphan")


class Batch(Base):
    __tablename__ = "batches"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    supplier_id = Column(UUID(as_uuid=True), ForeignKey("suppliers.id", ondelete="SET NULL"), nullable=True, index=True)
    batch_number = Column(String(100), nullable=False, index=True)
    manufacturing_date = Column(Date, nullable=False)
    expiry_date = Column(Date, nullable=False)
    status = Column(SQLEnum(BatchStatus, name="batch_status_enum", native_enum=False), default=BatchStatus.HOLD, nullable=False)
    risk_score = Column(Float, default=0.0, nullable=False)
    risk_level = Column(String(50), default="LOW", nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    product = relationship("Product", back_populates="batches")
    supplier = relationship("Supplier")
