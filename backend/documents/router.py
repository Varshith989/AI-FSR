import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Document, DocumentAnalysis, User
from backend.auth.dependencies import get_current_user
from backend.documents.service import DocumentIntelligenceService

router = APIRouter(prefix="/documents", tags=["Document Intelligence"])


class DocumentAnalysisResponse(BaseModel):
    id: uuid.UUID
    document_id: uuid.UUID
    model_version: Optional[str] = None
    compliance_score: Optional[float] = None
    risk_level: Optional[str] = None
    summary: Optional[str] = None
    findings: List[dict] = []
    recommendations: List[dict] = []
    confidence: Optional[float] = None

    class Config:
        from_attributes = True


class DocumentResponse(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    document_type: str
    file_name: str
    storage_key: str
    mime_type: str
    version: str
    status: str
    checksum: Optional[str] = None

    class Config:
        from_attributes = True


@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    document_type: str = Form("SOP"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload an SOP, HACCP plan, or lab test document for compliance analysis."""
    service = DocumentIntelligenceService(db, current_user)
    content = await file.read()
    doc = service.upload_document(
        file_name=file.filename or "uploaded_document.pdf",
        content=content,
        document_type=document_type,
        mime_type=file.content_type or "application/pdf"
    )
    return doc


@router.get("", response_model=List[DocumentResponse])
def list_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all documents uploaded by the tenant."""
    return db.query(Document).all()


@router.get("/{doc_id}", response_model=DocumentResponse)
def get_document(
    doc_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get single document metadata."""
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return doc


@router.post("/{doc_id}/analyze", response_model=DocumentAnalysisResponse)
def analyze_document(
    doc_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Trigger automated FSSAI gap analysis on an uploaded document."""
    service = DocumentIntelligenceService(db, current_user)
    try:
        analysis = service.analyze_document(doc_id)
        return analysis
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.get("/{doc_id}/analysis", response_model=DocumentAnalysisResponse)
def get_document_analysis(
    doc_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve compliance analysis findings and recommendations for a document."""
    analysis = db.query(DocumentAnalysis).filter(DocumentAnalysis.document_id == doc_id).first()
    if not analysis:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis report not found for document")
    return analysis


@router.get("/{doc_id}/versions")
def get_document_versions(
    doc_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get version history for a compliance document."""
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return [
        {
            "version": doc.version,
            "file_name": doc.file_name,
            "status": doc.status,
            "checksum": doc.checksum,
            "created_at": doc.created_at
        }
    ]
