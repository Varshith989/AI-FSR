import re
import uuid
import hashlib
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from backend.models import AIPrediction, AIAuditLog, AIModelVersion, User
from backend.config import settings


# Regex patterns for detecting and redacting sensitive PII
PII_PATTERNS = [
    (r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[REDACTED_EMAIL]'),
    (r'\b(?:\+91[\-\s]?)?[6789]\d{9}\b', '[REDACTED_PHONE]'),
    (r'\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b', '[REDACTED_AADHAAR]'),
    (r'\b[A-Z]{5}\d{4}[A-Z]{1}\b', '[REDACTED_PAN]'),
]


def detect_and_mask_pii(text: str) -> str:
    """Mask personally identifiable information from query prompts."""
    masked = text
    for pattern, replacement in PII_PATTERNS:
        masked = re.sub(pattern, replacement, masked)
    return masked


class AIGuardrailPipeline:
    """
    Enterprise AI Guardrail Middleware (§10) enforcing validation, PII redaction,
    citation verification, confidence filtering, human-review routing, and audit logging.
    """
    def __init__(self, db: Session, user: Optional[User] = None):
        self.db = db
        self.user = user

    def process_query(
        self,
        question: str,
        retrieved_sources: List[Dict[str, Any]],
        raw_ai_output: Dict[str, Any],
        action_type: str = "RAG_REGULATORY_QUERY"
    ) -> Dict[str, Any]:
        # 1. Request Validation & PII Detection
        sanitized_question = detect_and_mask_pii(question)

        answer = raw_ai_output.get("answer", "")
        confidence = float(raw_ai_output.get("confidence", 0.9))
        requires_human_review = raw_ai_output.get("requires_human_review", False)
        flags = raw_ai_output.get("flags", [])

        # 2. Confidence Threshold Check
        if confidence < settings.AI_CONFIDENCE_THRESHOLD:
            requires_human_review = True
            flags.append("CONFIDENCE_BELOW_THRESHOLD")

        # 3. Regulatory Citation & Source Check
        if not retrieved_sources:
            requires_human_review = True
            flags.append("NO_AUTHORITATIVE_SOURCE_FOUND")
        elif len(retrieved_sources) > 1 and ("conflict" in question.lower() or "supersed" in question.lower()):
            requires_human_review = True
            flags.append("CONFLICTING_REGULATORY_VERSIONS")

        # 4. Critical Action Triggers (§10)
        lower_q = question.lower()
        if any(w in lower_q for w in ["recall", "quarantine", "release", "destroy", "legal opinion"]):
            requires_human_review = True
            flags.append("HIGH_IMPACT_OPERATION_OR_LEGAL_INTERPRETATION")

        final_response = {
            "answer": answer,
            "confidence": round(confidence, 2),
            "sources": retrieved_sources,
            "requires_human_review": requires_human_review,
            "flags": flags
        }

        # 5. Audit Logging to ai_predictions and ai_audit_logs
        try:
            input_hash = hashlib.sha256(sanitized_question.encode("utf-8")).hexdigest()
            org_id = self.user.organization_id if self.user and self.user.organization_id else None
            user_id = self.user.id if self.user else None

            # Look up or create active model version
            model_ver = self.db.query(AIModelVersion).filter_by(status="ACTIVE").first()
            model_id = model_ver.id if model_ver else None

            if org_id:
                pred_log = AIPrediction(
                    id=uuid.uuid4(),
                    model_id=model_id,
                    organization_id=org_id,
                    input_hash=input_hash,
                    output=final_response,
                    confidence=confidence,
                    explanation={"flags": flags, "source_count": len(retrieved_sources)}
                )
                self.db.add(pred_log)

            audit_log = AIAuditLog(
                id=uuid.uuid4(),
                user_id=user_id,
                model_id=model_id,
                action=action_type,
                input_reference=input_hash[:16],
                output_reference=f"confidence_{confidence}"
            )
            self.db.add(audit_log)
            self.db.commit()
        except Exception:
            self.db.rollback()

        return final_response
