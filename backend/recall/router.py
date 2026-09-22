import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Batch, RecallPrediction, RecallEvent, User, UserRole
from backend.auth.dependencies import get_current_user, require_roles
from backend.recall.ml_engine import RecallPredictionEngine
from backend.notifications.dispatcher import emit_notification, NotificationEvent

router = APIRouter(prefix="/recall", tags=["Recall Risk Intelligence"])
engine = RecallPredictionEngine()


class PredictRequest(BaseModel):
    batch_id: uuid.UUID
    temperature_excursion_c: float = 0.0
    lab_anomaly_score: float = 0.0
    complaints_count: int = 0
    inspection_findings_count: int = 0


class FactorAttribution(BaseModel):
    factor: str
    percentage: int


class PredictionResponse(BaseModel):
    prediction_id: str
    batch_id: str
    batch_number: str
    risk_probability: float
    risk_level: str
    confidence: float
    contributing_factors: List[FactorAttribution]
    recommended_actions: List[str]
    predicted_at: str


class RecallEventCreate(BaseModel):
    batch_id: uuid.UUID
    reason: str = Field(..., min_length=5)
    severity: str = "CLASS_I"  # CLASS_I, CLASS_II, CLASS_III


class RecallEventUpdate(BaseModel):
    status: str  # NOTIFIED, QUARANTINED, COMPLETED, CLOSED
    reason: Optional[str] = None


class RecallEventResponse(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    batch_id: uuid.UUID
    reason: str
    severity: str
    status: str
    initiated_at: datetime
    closed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


@router.post("/predict", response_model=PredictionResponse)
def predict_recall_risk(
    payload: PredictRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Predict batch recall risk probability and generate SHAP explainability attribution (§5.7).
    """
    batch = db.query(Batch).filter(Batch.id == payload.batch_id).first()
    if not batch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Batch not found")

    result = engine.compute_recall_risk(
        db=db,
        batch=batch,
        temp_excursion_c=payload.temperature_excursion_c,
        lab_anomaly_score=payload.lab_anomaly_score,
        complaints_count=payload.complaints_count,
        inspection_findings_count=payload.inspection_findings_count
    )

    risk_level = result.get("risk_level", "LOW") if isinstance(result, dict) else getattr(result, "risk_level", "LOW")
    risk_prob = result.get("risk_probability", 0.0) if isinstance(result, dict) else getattr(result, "risk_probability", 0.0)

    if risk_level in ["HIGH", "CRITICAL"] or risk_prob >= 0.5:
        emit_notification(
            event=NotificationEvent.RECALL_RISK_HIGH,
            message=f"Elevated recall risk detected for batch {batch.batch_number}: {risk_level} ({risk_prob * 100:.1f}%)",
            recipient=current_user.email,
            payload={"batch_id": str(batch.id), "risk_probability": risk_prob, "risk_level": risk_level}
        )

    return result


@router.get("/predictions")
def list_predictions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List historical recall risk predictions."""
    predictions = db.query(RecallPrediction).order_by(RecallPrediction.predicted_at.desc()).limit(20).all()
    return [
        {
            "id": str(p.id),
            "batch_id": str(p.batch_id),
            "model_version": p.model_version,
            "risk_probability": p.risk_probability,
            "risk_level": p.risk_level,
            "confidence": p.confidence,
            "reason_codes": p.reason_codes,
            "recommended_actions": p.recommended_actions,
            "predicted_at": str(p.predicted_at)
        }
        for p in predictions
    ]


@router.get("/predictions/{pred_id}")
def get_prediction(
    pred_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get single prediction deep-dive."""
    pred = db.query(RecallPrediction).filter(RecallPrediction.id == pred_id).first()
    if not pred:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prediction not found")
    return {
        "id": str(pred.id),
        "batch_id": str(pred.batch_id),
        "risk_probability": pred.risk_probability,
        "risk_level": pred.risk_level,
        "confidence": pred.confidence,
        "contributing_factors": pred.reason_codes,
        "recommended_actions": pred.recommended_actions,
        "predicted_at": str(pred.predicted_at)
    }


@router.post("/events", response_model=RecallEventResponse, status_code=status.HTTP_201_CREATED)
def initiate_recall_event(
    payload: RecallEventCreate,
    current_user: User = Depends(require_roles(UserRole.FOOD_SAFETY_MANAGER, UserRole.QA_MANAGER)),
    db: Session = Depends(get_db)
):
    """Initiate an official product recall protocol for an unsafe lot."""
    batch = db.query(Batch).filter(Batch.id == payload.batch_id).first()
    if not batch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Batch not found")

    event = RecallEvent(
        id=uuid.uuid4(),
        organization_id=current_user.organization_id,
        batch_id=batch.id,
        reason=payload.reason,
        severity=payload.severity,
        status="INITIATED",
        initiated_at=datetime.now(timezone.utc)
    )
    db.add(event)

    # Immediately lock batch
    batch.status = "RECALLED"
    db.commit()
    db.refresh(event)

    emit_notification(
        event=NotificationEvent.RECALL_RISK_HIGH,
        message=f"Official recall event initiated for batch {batch.batch_number}: {payload.reason}",
        recipient=current_user.email,
        payload={"batch_id": str(batch.id), "event_id": str(event.id), "severity": payload.severity}
    )

    return event


@router.patch("/events/{event_id}", response_model=RecallEventResponse)
def update_recall_event(
    event_id: uuid.UUID,
    payload: RecallEventUpdate,
    current_user: User = Depends(require_roles(UserRole.FOOD_SAFETY_MANAGER, UserRole.QA_MANAGER)),
    db: Session = Depends(get_db)
):
    """Update recall event progression or mark closed."""
    event = db.query(RecallEvent).filter(RecallEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recall event not found")

    event.status = payload.status
    if payload.reason:
        event.reason = payload.reason
    if payload.status == "CLOSED":
        event.closed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(event)
    return event
