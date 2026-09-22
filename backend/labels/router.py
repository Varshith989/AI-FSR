import uuid
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from pydantic import BaseModel
from backend.models import User
from backend.auth.dependencies import get_current_user
from backend.labels.service import LabelValidatorEngine, save_label, get_label

router = APIRouter(prefix="/labels", tags=["Food Label Validator"])
engine = LabelValidatorEngine()


class LabelIssue(BaseModel):
    severity: str
    category: str
    description: str
    regulation_reference: str


class LabelValidationResponse(BaseModel):
    overall_status: str
    score: int
    issues: List[LabelIssue]


class LabelUploadResponse(BaseModel):
    label_id: uuid.UUID
    file_name: str
    status: str


@router.post("/upload", response_model=LabelUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_label(
    file: Optional[UploadFile] = File(None),
    raw_text: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user)
):
    """Upload product packaging artwork or raw text for label validation."""
    label_id = uuid.uuid4()
    file_name = file.filename if file else "label_text_input.txt"

    if file:
        content_bytes = await file.read()
        text_content = content_bytes.decode("utf-8", errors="ignore")
    else:
        text_content = raw_text or ""

    save_label(str(label_id), {
        "label_id": str(label_id),
        "file_name": file_name,
        "raw_text": text_content,
        "status": "UPLOADED",
        "extracted": None,
        "report": None
    })

    return LabelUploadResponse(label_id=label_id, file_name=file_name, status="UPLOADED")


@router.post("/{label_id}/extract")
def extract_label_data(
    label_id: uuid.UUID,
    current_user: User = Depends(get_current_user)
):
    """Simulate OCR and structured layout extraction on the uploaded label artwork."""
    data = get_label(str(label_id))
    if not data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Label not found")

    extracted = engine.extract_text_and_layout(data["raw_text"])
    data["extracted"] = extracted
    data["status"] = "EXTRACTED"
    save_label(str(label_id), data)
    return {"label_id": label_id, "status": "EXTRACTED", "extracted": extracted}


@router.post("/{label_id}/validate", response_model=LabelValidationResponse)
def validate_label_endpoint(
    label_id: uuid.UUID,
    current_user: User = Depends(get_current_user)
):
    """
    Execute deterministic compliance validation against FSSAI labelling regulations (§5.6).
    Returns exact JSON shape with score, overall_status, and regulatory issues.
    """
    data = get_label(str(label_id))
    if not data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Label not found")

    if not data.get("extracted"):
        data["extracted"] = engine.extract_text_and_layout(data["raw_text"])

    report = engine.validate_label(data["extracted"])
    data["report"] = report
    data["status"] = "VALIDATED"
    save_label(str(label_id), data)
    return report


@router.get("/{label_id}/report", response_model=LabelValidationResponse)
def get_label_report(
    label_id: uuid.UUID,
    current_user: User = Depends(get_current_user)
):
    """Retrieve full validation report for an audited food product label."""
    data = get_label(str(label_id))
    if not data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Label not found")
    if not data.get("report"):
        data["report"] = engine.validate_label(engine.extract_text_and_layout(data["raw_text"]))
        save_label(str(label_id), data)
    return data["report"]
