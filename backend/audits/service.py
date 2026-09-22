import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from backend.models import Audit, AuditFinding, CAPAAction, FindingSeverity, Site, User
from backend.utils.tenancy import TenantBypassScope


class AuditService:
    def __init__(self, db: Session, user=None):
        self.db = db
        self.user = user

    def generate_checklist(self, facility_type: str = "Dairy") -> List[Dict[str, Any]]:
        """Generate standard FSSAI Schedule 4 inspection checklist items."""
        return [
            {
                "item_id": 1,
                "clause": "Schedule 4 - Part 2 Clause 1",
                "check": "Facility location is free from environmental pollution, stagnant water, and smoke.",
                "category": "Premises & Grounds"
            },
            {
                "item_id": 2,
                "clause": "Schedule 4 - Part 2 Clause 4.2",
                "check": "Potable water conforms to IS 10500 with semi-annual NABL testing certificates.",
                "category": "Water Supply"
            },
            {
                "item_id": 3,
                "clause": "Schedule 4 - Part 3 Clause 2",
                "check": "Continuous pasteurization temperature dataloggers and automated diversion valves functional.",
                "category": "Equipment & Process Controls"
            },
            {
                "item_id": 4,
                "clause": "Schedule 4 - Part 5 Clause 3",
                "check": "Food handlers possess active FoSTaC certifications and updated medical fitness records.",
                "category": "Personnel Hygiene"
            }
        ]

    def complete_audit(self, audit_id: uuid.UUID) -> Audit:
        """Calculate final audit score based on finding severities and complete inspection."""
        audit = self.db.query(Audit).filter(Audit.id == audit_id).first()
        if not audit:
            raise ValueError("Audit not found")

        findings = self.db.query(AuditFinding).filter(AuditFinding.audit_id == audit_id).all()
        deductions = 0
        for f in findings:
            sev = f.severity if isinstance(f.severity, str) else f.severity.value
            if sev == "CRITICAL":
                deductions += 30
            elif sev == "HIGH":
                deductions += 15
            elif sev == "MEDIUM":
                deductions += 8
            elif sev == "LOW":
                deductions += 4
            elif sev == "OBSERVATION":
                deductions += 1

        final_score = max(0.0, 100.0 - deductions)
        audit.score = final_score
        audit.status = "COMPLETED"
        audit.completed_date = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(audit)
        return audit

    def generate_report(self, audit_id: uuid.UUID) -> Dict[str, Any]:
        """Generate detailed executive audit report summary."""
        audit = self.db.query(Audit).filter(Audit.id == audit_id).first()
        if not audit:
            raise ValueError("Audit not found")

        findings = self.db.query(AuditFinding).filter(AuditFinding.audit_id == audit_id).all()
        return {
            "audit_id": str(audit.id),
            "organization_id": str(audit.organization_id),
            "audit_type": audit.audit_type,
            "status": audit.status,
            "score": audit.score,
            "completed_date": str(audit.completed_date) if audit.completed_date else None,
            "findings_count": len(findings),
            "findings": [
                {
                    "id": str(f.id),
                    "severity": f.severity if isinstance(f.severity, str) else f.severity.value,
                    "finding": f.finding,
                    "evidence": f.evidence,
                    "status": f.status,
                    "created_at": str(f.created_at)
                }
                for f in findings
            ]
        }
