import uuid
from datetime import datetime, timezone
import enum
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from backend.database import Base


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    ORG_ADMIN = "ORG_ADMIN"
    FOOD_SAFETY_MANAGER = "FOOD_SAFETY_MANAGER"
    QA_MANAGER = "QA_MANAGER"
    AUDITOR = "AUDITOR"
    QA_ANALYST = "QA_ANALYST"
    PRODUCTION_MANAGER = "PRODUCTION_MANAGER"
    SUPPLIER = "SUPPLIER"
    VIEWER = "VIEWER"


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    legal_name = Column(String(255), nullable=True)
    industry_type = Column(String(100), nullable=True)  # e.g. Manufacturer, Cloud Kitchen, Retailer
    fssai_license_no = Column(String(50), nullable=True)
    gstin = Column(String(50), nullable=True)
    country = Column(String(50), default="IN", nullable=False)
    status = Column(String(50), default="ACTIVE", nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    users = relationship("User", back_populates="organization", cascade="all, delete-orphan")


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(50), nullable=True)
    role = Column(SQLEnum(UserRole, name="user_role_enum", native_enum=False), nullable=False, default=UserRole.VIEWER)
    password_hash = Column(String(255), nullable=False)
    status = Column(String(50), default="ACTIVE", nullable=False)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    organization = relationship("Organization", back_populates="users")
