import uuid
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Audit, AuditFinding, FindingSeverity, User, UserRole
from backend.auth.dependencies import get_current_user, require_roles
from backend.audits.service import AuditService

router = APIRouter(prefix="/audits", tags=["Audit Management"])


class AuditCreate(BaseModel):
    site_id: Optional[uuid.UUID] = None
    audit_type: str = "Internal FSSAI Schedule 4 Inspection"
    scheduled_date: Optional[datetime] = None


class FindingCreate(BaseModel):
    clause_id: Optional[uuid.UUID] = None
    severity: FindingSeverity = FindingSeverity.MEDIUM
    finding: str = Field(..., min_length=5)
    evidence: Optional[str] = None


class AuditResponse(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    site_id: Optional[uuid.UUID] = None
    audit_type: str
    auditor_id: Optional[uuid.UUID] = None
    status: str
    score: Optional[float] = None
    scheduled_date: Optional[datetime] = None
    completed_date: Optional[datetime] = None

    class Config:
        from_attributes = True


class FindingResponse(BaseModel):
    id: uuid.UUID
    audit_id: uuid.UUID
    clause_id: Optional[uuid.UUID] = None
    severity: str
    finding: str
    evidence: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("", response_model=AuditResponse, status_code=status.HTTP_201_CREATED)
def create_audit(
    payload: AuditCreate,
    current_user: User = Depends(require_roles(UserRole.AUDITOR, UserRole.QA_MANAGER, UserRole.ORG_ADMIN)),
    db: Session = Depends(get_db)
):
    """Schedule or initialize a digital audit inspection."""
    audit = Audit(
        id=uuid.uuid4(),
        organization_id=current_user.organization_id,
        site_id=payload.site_id,
        audit_type=payload.audit_type,
        auditor_id=current_user.id,
        scheduled_date=payload.scheduled_date or datetime.now(timezone.utc),
        status="SCHEDULED"
    )
    db.add(audit)
    db.commit()
    db.refresh(audit)
    return audit


@router.get("", response_model=List[AuditResponse])
def list_audits(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List audits for current tenant."""
    return db.query(Audit).all()


@router.get("/{audit_id}", response_model=AuditResponse)
def get_audit(
    audit_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get audit details."""
    audit = db.query(Audit).filter(Audit.id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Audit not found")
    return audit


@router.post("/{audit_id}/start", response_model=AuditResponse)
def start_audit(
    audit_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.AUDITOR, UserRole.QA_MANAGER)),
    db: Session = Depends(get_db)
):
    """Mark an audit in-progress."""
    audit = db.query(Audit).filter(Audit.id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Audit not found")
    audit.status = "IN_PROGRESS"
    db.commit()
    db.refresh(audit)
    return audit


@router.post("/{audit_id}/findings", response_model=FindingResponse, status_code=status.HTTP_201_CREATED)
def record_finding(
    audit_id: uuid.UUID,
    payload: FindingCreate,
    current_user: User = Depends(require_roles(UserRole.AUDITOR, UserRole.QA_MANAGER)),
    db: Session = Depends(get_db)
):
    """Record an inspection non-conformance finding with evidence link."""
    audit = db.query(Audit).filter(Audit.id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Audit not found")

    finding = AuditFinding(
        id=uuid.uuid4(),
        audit_id=audit.id,
        clause_id=payload.clause_id,
        severity=payload.severity,
        finding=payload.finding,
        evidence=payload.evidence,
        status="OPEN"
    )
    db.add(finding)
    db.commit()
    db.refresh(finding)
    return finding


@router.post("/{audit_id}/complete", response_model=AuditResponse)
def complete_audit_endpoint(
    audit_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.AUDITOR, UserRole.QA_MANAGER)),
    db: Session = Depends(get_db)
):
    """Complete an audit and compute score."""
    service = AuditService(db, current_user)
    try:
        completed = service.complete_audit(audit_id)
        return completed
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.get("/{audit_id}/report")
def get_audit_report(
    audit_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate structured audit inspection report."""
    service = AuditService(db, current_user)
    try:
        return service.generate_report(audit_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
