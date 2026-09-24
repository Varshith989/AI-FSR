import uuid
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import RegulatoryDocument, RegulatoryClause, User
from backend.auth.dependencies import get_current_user
from backend.compliance.service import ComplianceService
from backend.utils.tenancy import TenantBypassScope

router = APIRouter(tags=["Regulatory Intelligence & RAG"])


class ComplianceQueryRequest(BaseModel):
    question: str
    product_id: Optional[uuid.UUID] = None
    language: str = "en"


class SourceItem(BaseModel):
    document: str
    section: str
    clause: str
    effective_date: str


class ComplianceQueryResponse(BaseModel):
    answer: str
    confidence: float
    sources: List[SourceItem]
    requires_human_review: bool


@router.get("/regulations")
def list_regulations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all official FSSAI regulatory documents."""
    with TenantBypassScope():
        return db.query(RegulatoryDocument).all()


@router.get("/regulations/search")
def search_regulations(
    q: str = Query(..., min_length=2),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Full-text search across FSSAI clauses and headings."""
    service = ComplianceService(db, current_user)
    return service.retrieve_relevant_clauses(q, limit=10)


@router.get("/regulations/updates")
def get_regulatory_updates(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List recently published or amended FSSAI regulations."""
    with TenantBypassScope():
        recent = db.query(RegulatoryDocument).order_by(RegulatoryDocument.created_at.desc()).limit(5).all()
        return [
            {
                "id": str(r.id),
                "title": r.title,
                "document_type": r.document_type,
                "version": r.version,
                "effective_date": str(r.effective_date),
                "authority": r.authority
            }
            for r in recent
        ]


@router.get("/regulations/{doc_id}")
def get_regulation(
    doc_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve details of a single regulatory document."""
    with TenantBypassScope():
        doc = db.query(RegulatoryDocument).filter(RegulatoryDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Regulatory document not found")
    return doc


@router.get("/regulations/{doc_id}/clauses")
def get_regulation_clauses(
    doc_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all clauses under a specific regulation."""
    with TenantBypassScope():
        clauses = db.query(RegulatoryClause).filter(RegulatoryClause.document_id == doc_id).all()
    return clauses


@router.post("/compliance/query", response_model=ComplianceQueryResponse)
def query_compliance(
    payload: ComplianceQueryRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Guarded Regulatory RAG Assistant (§5.4 & §7).
    Answers queries backed by authoritative FSSAI citations and statutory effective dates.
    """
    service = ComplianceService(db, current_user)
    response = service.answer_query(
        question=payload.question,
        product_id=payload.product_id,
        language=payload.language
    )
    return response
