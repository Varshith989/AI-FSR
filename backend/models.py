"""
Central registry of all SafeFood AI SQLAlchemy models.
Exposes all 18 core domain entities for Alembic migrations, database initialization, and service access.
"""

from backend.database import Base
from backend.auth.models import UserRole, Organization, User
from backend.compliance.models import RegulatoryDocument, RegulatoryClause
from backend.documents.models import Document, DocumentAnalysis
from backend.audits.models import FindingSeverity, Site, Audit, AuditFinding, CAPAAction
from backend.suppliers.models import Supplier
from backend.batches.models import BatchStatus, Product, Batch
from backend.recall.models import RecallPrediction, RecallEvent
from backend.logs.models import AIModelVersion, AIPrediction, AIAuditLog
from backend.labels.models import LabelValidation

__all__ = [
    "Base",
    "UserRole",
    "FindingSeverity",
    "BatchStatus",
    "Organization",
    "User",
    "Site",
    "Product",
    "Supplier",
    "Batch",
    "RegulatoryDocument",
    "RegulatoryClause",
    "Document",
    "DocumentAnalysis",
    "Audit",
    "AuditFinding",
    "CAPAAction",
    "RecallPrediction",
    "RecallEvent",
    "AIModelVersion",
    "AIPrediction",
    "AIAuditLog",
    "LabelValidation",
]
