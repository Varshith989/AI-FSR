import uuid
from datetime import datetime, timezone, date
from sqlalchemy import Column, String, DateTime, Date, Integer, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from backend.database import Base
from backend.utils.types import SafeVector


class RegulatoryDocument(Base):
    __tablename__ = "regulatory_documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    authority = Column(String(100), default="FSSAI", nullable=False)
    title = Column(String(500), nullable=False)
    document_type = Column(String(100), nullable=False)  # Act, Regulation, Amendment, Circular, Guidance
    version = Column(String(50), nullable=False)
    publication_date = Column(Date, nullable=True)
    effective_date = Column(Date, nullable=True)
    source_url = Column(String(1000), nullable=True)
    content_hash = Column(String(128), nullable=True)
    status = Column(String(50), default="ACTIVE", nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    clauses = relationship("RegulatoryClause", back_populates="document", cascade="all, delete-orphan")


class RegulatoryClause(Base):
    __tablename__ = "regulatory_clauses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("regulatory_documents.id", ondelete="CASCADE"), nullable=False, index=True)
    section = Column(String(100), nullable=True)
    clause = Column(String(100), nullable=False)
    heading = Column(String(500), nullable=True)
    content = Column(Text, nullable=False)
    page_number = Column(Integer, nullable=True)
    effective_from = Column(Date, nullable=True)
    effective_to = Column(Date, nullable=True)
    embedding = Column(SafeVector(1536), nullable=True)

    document = relationship("RegulatoryDocument", back_populates="clauses")
