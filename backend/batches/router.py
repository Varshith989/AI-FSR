import uuid
from typing import List, Optional
from datetime import date, datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Batch, Product, BatchStatus, User, UserRole
from backend.auth.dependencies import get_current_user, require_roles
from backend.notifications.dispatcher import emit_notification, NotificationEvent

router = APIRouter(tags=["Batches & Products"])

VALID_BATCH_TRANSITIONS = {
    BatchStatus.HOLD: {BatchStatus.RELEASED, BatchStatus.QUARANTINED, BatchStatus.DESTROYED, BatchStatus.HOLD},
    BatchStatus.RELEASED: {BatchStatus.QUARANTINED, BatchStatus.RECALLED, BatchStatus.HOLD, BatchStatus.RELEASED},
    BatchStatus.QUARANTINED: {BatchStatus.RELEASED, BatchStatus.HOLD, BatchStatus.RECALLED, BatchStatus.DESTROYED, BatchStatus.QUARANTINED},
    BatchStatus.RECALLED: {BatchStatus.DESTROYED, BatchStatus.QUARANTINED, BatchStatus.RECALLED},
    BatchStatus.DESTROYED: {BatchStatus.DESTROYED},
    BatchStatus.CLOSED: {BatchStatus.CLOSED},
}


class ProductCreate(BaseModel):
    product_code: str = Field(..., min_length=2)
    name: str = Field(..., min_length=2)
    category: Optional[str] = None
    description: Optional[str] = None
    shelf_life_days: Optional[int] = None
    allergen_profile: List[str] = []


class ProductResponse(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    product_code: str
    name: str
    category: Optional[str] = None
    shelf_life_days: Optional[int] = None
    allergen_profile: List[str] = []
    status: str

    class Config:
        from_attributes = True


class BatchCreate(BaseModel):
    product_id: uuid.UUID
    supplier_id: Optional[uuid.UUID] = None
    batch_number: str = Field(..., min_length=2)
    manufacturing_date: date
    expiry_date: date
    status: BatchStatus = BatchStatus.HOLD
    risk_score: float = 0.0
    risk_level: str = "LOW"


class BatchStatusUpdate(BaseModel):
    status: BatchStatus
    reason: Optional[str] = None


class BatchResponse(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    product_id: uuid.UUID
    supplier_id: Optional[uuid.UUID] = None
    batch_number: str
    manufacturing_date: date
    expiry_date: date
    status: str
    risk_score: float
    risk_level: str

    class Config:
        from_attributes = True


# --- Products ---

@router.post("/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    current_user: User = Depends(require_roles(UserRole.ORG_ADMIN, UserRole.FOOD_SAFETY_MANAGER, UserRole.QA_MANAGER)),
    db: Session = Depends(get_db)
):
    """Add a product item to catalogue."""
    product = Product(
        id=uuid.uuid4(),
        organization_id=current_user.organization_id,
        product_code=payload.product_code,
        name=payload.name,
        category=payload.category,
        description=payload.description,
        shelf_life_days=payload.shelf_life_days,
        allergen_profile=payload.allergen_profile,
        status="ACTIVE"
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.get("/products", response_model=List[ProductResponse])
def list_products(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List products registered for the organization."""
    return db.query(Product).all()


# --- Batches ---

@router.post("/batches", response_model=BatchResponse, status_code=status.HTTP_201_CREATED)
def create_batch(
    payload: BatchCreate,
    current_user: User = Depends(require_roles(UserRole.PRODUCTION_MANAGER, UserRole.QA_MANAGER, UserRole.ORG_ADMIN)),
    db: Session = Depends(get_db)
):
    """Register a new production lot or batch."""
    batch = Batch(
        id=uuid.uuid4(),
        organization_id=current_user.organization_id,
        product_id=payload.product_id,
        supplier_id=payload.supplier_id,
        batch_number=payload.batch_number,
        manufacturing_date=payload.manufacturing_date,
        expiry_date=payload.expiry_date,
        status=payload.status,
        risk_score=payload.risk_score,
        risk_level=payload.risk_level
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)
    return batch


@router.get("/batches", response_model=List[BatchResponse])
def list_batches(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List batches for current tenant."""
    return db.query(Batch).all()


@router.get("/batches/{batch_id}", response_model=BatchResponse)
def get_batch(
    batch_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve single batch details."""
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Batch not found")
    return batch


@router.patch("/batches/{batch_id}/status", response_model=BatchResponse)
def update_batch_status(
    batch_id: uuid.UUID,
    payload: BatchStatusUpdate,
    current_user: User = Depends(require_roles(UserRole.FOOD_SAFETY_MANAGER, UserRole.QA_MANAGER)),
    db: Session = Depends(get_db)
):
    """Transition batch status (e.g. HOLD to QUARANTINED or RELEASED)."""
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Batch not found")

    current_status = BatchStatus(batch.status) if isinstance(batch.status, str) else batch.status
    target_status = BatchStatus(payload.status) if isinstance(payload.status, str) else payload.status

    allowed = VALID_BATCH_TRANSITIONS.get(current_status, set())
    if target_status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid batch status transition from {current_status.value} to {target_status.value}"
        )

    batch.status = target_status
    db.commit()
    db.refresh(batch)

    if target_status == BatchStatus.QUARANTINED and current_status != BatchStatus.QUARANTINED:
        emit_notification(
            event=NotificationEvent.BATCH_QUARANTINED,
            message=f"Batch {batch.batch_number} has been transitioned to QUARANTINED.",
            recipient=current_user.email,
            payload={"batch_id": str(batch.id), "batch_number": batch.batch_number}
        )

    return batch
