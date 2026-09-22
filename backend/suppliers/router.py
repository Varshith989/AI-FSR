import uuid
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Supplier, Batch, User, UserRole
from backend.auth.dependencies import get_current_user, require_roles

router = APIRouter(prefix="/suppliers", tags=["Supplier Risk Management"])


class SupplierCreate(BaseModel):
    supplier_code: str = Field(..., min_length=2)
    name: str = Field(..., min_length=2)
    license_number: Optional[str] = None
    risk_score: float = 0.0
    health_score: float = 100.0


class SupplierResponse(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    supplier_code: str
    name: str
    license_number: Optional[str] = None
    risk_score: float
    health_score: float
    status: str

    class Config:
        from_attributes = True


class SupplierRiskReport(BaseModel):
    supplier_id: uuid.UUID
    name: str
    health_score: float
    risk_score: float
    signals: Dict[str, float]
    recommendation: str


@router.post("", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
def create_supplier(
    payload: SupplierCreate,
    current_user: User = Depends(require_roles(UserRole.ORG_ADMIN, UserRole.FOOD_SAFETY_MANAGER, UserRole.QA_MANAGER)),
    db: Session = Depends(get_db)
):
    """Register a new raw material or ingredient supplier."""
    supplier = Supplier(
        id=uuid.uuid4(),
        organization_id=current_user.organization_id,
        supplier_code=payload.supplier_code,
        name=payload.name,
        license_number=payload.license_number,
        risk_score=payload.risk_score,
        health_score=payload.health_score,
        status="ACTIVE"
    )
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


@router.get("", response_model=List[SupplierResponse])
def list_suppliers(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all registered suppliers."""
    return db.query(Supplier).all()


@router.get("/{supplier_id}", response_model=SupplierResponse)
def get_supplier(
    supplier_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get single supplier profile."""
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")
    return supplier


@router.get("/{supplier_id}/risk", response_model=SupplierRiskReport)
def get_supplier_risk(
    supplier_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Compute supplier composite health score (§5.8).
    Synthesizes signals: Compliance (25%), Quality (25%), Delivery (15%), Audit (15%), Lab (10%), Complaints (10%).
    """
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")

    batches = db.query(Batch).filter(Batch.supplier_id == supplier_id).all()
    total_batches = len(batches)
    quarantined = sum(1 for b in batches if (getattr(b.status, "value", b.status) == "QUARANTINED"))
    recalled = sum(1 for b in batches if (getattr(b.status, "value", b.status) == "RECALLED"))
    avg_batch_risk = (sum(b.risk_score for b in batches) / total_batches) if total_batches > 0 else (supplier.risk_score or 0.1)

    base_health = supplier.health_score if supplier.health_score is not None else 85.0
    risk_factor = (supplier.risk_score or 0.1) * 30.0
    batch_penalty = (quarantined * 15.0) + (recalled * 30.0)

    compliance_score = max(10.0, min(100.0, round(base_health - (risk_factor * 0.4) - batch_penalty, 1)))
    quality_score = max(10.0, min(100.0, round(100.0 - (avg_batch_risk * 50.0) - batch_penalty, 1)))
    delivery_score = max(10.0, min(100.0, round(base_health * 0.95 - (quarantined * 5.0), 1)))
    audit_score = max(10.0, min(100.0, round(base_health * 0.92 - (risk_factor * 0.3), 1)))
    lab_score = max(10.0, min(100.0, round(100.0 - (avg_batch_risk * 45.0), 1)))
    complaints_score = max(10.0, min(100.0, round(100.0 - (quarantined * 15.0) - (recalled * 25.0) - (risk_factor * 0.2), 1)))

    signals = {
        "compliance": compliance_score,
        "quality": quality_score,
        "delivery": delivery_score,
        "audit": audit_score,
        "lab": lab_score,
        "complaints": complaints_score
    }
    composite_health = (
        signals["compliance"] * 0.25 +
        signals["quality"] * 0.25 +
        signals["delivery"] * 0.15 +
        signals["audit"] * 0.15 +
        signals["lab"] * 0.10 +
        signals["complaints"] * 0.10
    )
    calculated_risk = round(max(0.0, min(1.0, (100.0 - composite_health) / 100.0)), 2)

    supplier.health_score = round(composite_health, 1)
    supplier.risk_score = calculated_risk
    db.commit()

    recommendation = "Approved for premium Grade-A dairy processing" if composite_health >= 90 else "Under increased audit scrutiny"

    return SupplierRiskReport(
        supplier_id=supplier.id,
        name=supplier.name,
        health_score=supplier.health_score,
        risk_score=supplier.risk_score,
        signals=signals,
        recommendation=recommendation
    )


@router.get("/{supplier_id}/batches")
def get_supplier_batches(
    supplier_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all production lots associated with this supplier."""
    batches = db.query(Batch).filter(Batch.supplier_id == supplier_id).all()
    return [
        {
            "id": str(b.id),
            "batch_number": b.batch_number,
            "status": b.status if isinstance(b.status, str) else b.status.value,
            "risk_score": b.risk_score,
            "risk_level": b.risk_level,
            "manufacturing_date": str(b.manufacturing_date),
            "expiry_date": str(b.expiry_date)
        }
        for b in batches
    ]
