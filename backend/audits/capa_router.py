import uuid
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import CAPAAction, AuditFinding, User, UserRole
from backend.auth.dependencies import get_current_user, require_roles

router = APIRouter(prefix="/capa", tags=["CAPA Management"])


class CAPACreate(BaseModel):
    finding_id: uuid.UUID
    action_type: str = "CORRECTIVE"  # CORRECTIVE or PREVENTIVE
    description: str = Field(..., min_length=5)
    owner_id: Optional[uuid.UUID] = None
    due_date: Optional[datetime] = None


class CAPAUpdate(BaseModel):
    description: Optional[str] = None
    owner_id: Optional[uuid.UUID] = None
    due_date: Optional[datetime] = None
    status: Optional[str] = None


class CAPAResponse(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    finding_id: uuid.UUID
    action_type: str
    description: str
    owner_id: Optional[uuid.UUID] = None
    due_date: Optional[datetime] = None
    completion_date: Optional[datetime] = None
    verification_status: str
    status: str

    class Config:
        from_attributes = True


@router.post("", response_model=CAPAResponse, status_code=status.HTTP_201_CREATED)
def create_capa(
    payload: CAPACreate,
    current_user: User = Depends(require_roles(UserRole.QA_MANAGER, UserRole.AUDITOR, UserRole.FOOD_SAFETY_MANAGER)),
    db: Session = Depends(get_db)
):
    """Initiate a Corrective or Preventive Action from an audit non-conformance."""
    finding = db.query(AuditFinding).filter(AuditFinding.id == payload.finding_id).first()
    if not finding:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Associated audit finding not found")

    capa = CAPAAction(
        id=uuid.uuid4(),
        organization_id=current_user.organization_id,
        finding_id=payload.finding_id,
        action_type=payload.action_type,
        description=payload.description,
        owner_id=payload.owner_id or current_user.id,
        due_date=payload.due_date,
        verification_status="PENDING",
        status="OPEN"
    )
    db.add(capa)
    db.commit()
    db.refresh(capa)
    return capa


@router.get("", response_model=List[CAPAResponse])
def list_capa(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all CAPA actions for the tenant."""
    return db.query(CAPAAction).all()


@router.get("/{capa_id}", response_model=CAPAResponse)
def get_capa(
    capa_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get single CAPA action details."""
    capa = db.query(CAPAAction).filter(CAPAAction.id == capa_id).first()
    if not capa:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CAPA not found")
    return capa


@router.patch("/{capa_id}", response_model=CAPAResponse)
def update_capa(
    capa_id: uuid.UUID,
    payload: CAPAUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update CAPA description, assignee, or deadline."""
    capa = db.query(CAPAAction).filter(CAPAAction.id == capa_id).first()
    if not capa:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CAPA not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(capa, key, value)

    db.commit()
    db.refresh(capa)
    return capa


@router.post("/{capa_id}/verify", response_model=CAPAResponse)
def verify_capa(
    capa_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.QA_MANAGER, UserRole.FOOD_SAFETY_MANAGER)),
    db: Session = Depends(get_db)
):
    """QA Manager verifies effectiveness of corrective action."""
    capa = db.query(CAPAAction).filter(CAPAAction.id == capa_id).first()
    if not capa:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CAPA not found")

    capa.verification_status = "VERIFIED"
    capa.completion_date = datetime.now(timezone.utc)
    db.commit()
    db.refresh(capa)
    return capa


@router.post("/{capa_id}/close", response_model=CAPAResponse)
def close_capa(
    capa_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.QA_MANAGER, UserRole.FOOD_SAFETY_MANAGER)),
    db: Session = Depends(get_db)
):
    """Formally close verified CAPA and update root finding."""
    capa = db.query(CAPAAction).filter(CAPAAction.id == capa_id).first()
    if not capa:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CAPA not found")

    capa.status = "CLOSED"
    if capa.finding:
        capa.finding.status = "RESOLVED"

    db.commit()
    db.refresh(capa)
    return capa
