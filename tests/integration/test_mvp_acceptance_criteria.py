import uuid
from datetime import date, datetime, timezone
import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.database import get_db
from backend.auth.dependencies import get_current_user
from backend.models import (
    User, UserRole, Organization, Site, Product, Supplier,
    Batch, BatchStatus, RegulatoryDocument, RegulatoryClause,
    Audit, AuditFinding, CAPAAction
)
from backend.utils.tenancy import TenantScope, TenantBypassScope, set_current_tenant_id
from data.seeders.seed_data import seed_database


@pytest.fixture
def mvp_client(db_session, sample_orgs):
    org_a, _ = sample_orgs

    # Seed baseline regulations
    seed_database(db_session)

    # Fetch seeded QA Manager
    with TenantBypassScope():
        qa_user = db_session.query(User).filter(User.email == "qa.head@apexfoods.com").first()
        if not qa_user:
            qa_user = User(
                id=uuid.uuid4(),
                organization_id=org_a.id,
                name="QA Head",
                email="qa.head@apexfoods.com",
                role=UserRole.QA_MANAGER,
                status="ACTIVE"
            )
            db_session.add(qa_user)
            db_session.commit()

    def override_get_db():
        yield db_session

    def override_current_user():
        set_current_tenant_id(qa_user.organization_id)
        return qa_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_current_user

    with TestClient(app) as client:
        yield client

    app.dependency_overrides.clear()


def test_acceptance_criteria_1_regulatory_ai(mvp_client):
    """
    §16 Criterion 1 - Regulatory AI:
    - Answer a regulatory question
    - Cite the source
    - Show clause/section
    - Show effective date
    - Handle conflicting versions (flag for human review)
    """
    # 1. Normal Question
    resp = mvp_client.post(
        "/api/v1/compliance/query",
        json={"question": "What are the temperature rules for pasteurized milk storage?"}
    )
    assert resp.status_code == 200
    data = resp.json()

    assert "answer" in data
    assert len(data["answer"]) > 20
    assert data["confidence"] >= 0.85
    assert len(data["sources"]) > 0

    source = data["sources"][0]
    assert "document" in source
    assert "section" in source
    assert "clause" in source
    assert "effective_date" in source
    assert source["effective_date"] != ""

    # 2. Ambiguous / Conflicting query triggering human review
    conflict_resp = mvp_client.post(
        "/api/v1/compliance/query",
        json={"question": "Are there conflicting amendments regarding pasteurized milk cold storage standards?"}
    )
    assert conflict_resp.status_code == 200
    conflict_data = conflict_resp.json()
    assert conflict_data["requires_human_review"] is True


def test_acceptance_criteria_2_document_ai(mvp_client):
    """
    §16 Criterion 2 - Document AI:
    - Upload PDF/DOCX
    - Extract content
    - Identify compliance gaps
    - Provide supporting evidence
    - Generate corrective actions
    """
    # 1. Upload document
    sample_content = b"Standard Operating Procedure for Dairy Processing and Cold Chain."
    upload_resp = mvp_client.post(
        "/api/v1/documents",
        files={"file": ("sop_dairy_pasteurization.pdf", sample_content, "application/pdf")},
        data={"document_type": "SOP"}
    )
    assert upload_resp.status_code == 201
    doc_id = upload_resp.json()["id"]

    # 2. Analyze document
    analyze_resp = mvp_client.post(f"/api/v1/documents/{doc_id}/analyze")
    assert analyze_resp.status_code == 200
    analysis = analyze_resp.json()

    assert analysis["compliance_score"] is not None
    assert len(analysis["findings"]) > 0
    assert len(analysis["recommendations"]) > 0

    # Verify gap findings contain clause reference and evidence required
    finding = analysis["findings"][0]
    assert "finding" in finding
    assert "clause_ref" in finding
    assert "evidence_required" in finding

    # Verify corrective actions
    rec = analysis["recommendations"][0]
    assert rec["action"] in ["CORRECTIVE", "PREVENTIVE"]
    assert "description" in rec


def test_acceptance_criteria_3_label_ai(mvp_client):
    """
    §16 Criterion 3 - Label AI:
    - Upload label
    - Extract ingredients
    - Identify allergens
    - Validate mandatory declarations
    - Produce a compliance report
    """
    sample_label = """
    Product: Artisanal Sourdough Bread
    Veg Green Dot Symbol
    FSSAI Lic: 10019022009876
    Ingredients: Whole wheat flour, water, salt, baker's yeast, soy lecithin.
    Contains: Gluten, Soy
    Nutrition Facts per 100g:
    Energy: 245 kcal
    Protein: 8.5g
    Carbs: 48g
    Added Sugars: 1.2g
    Total Fat: 2.1g
    Mfg Date: 2026-09-22
    Best Before: 2026-09-27
    Net Qty: 400g
    """
    # 1. Upload
    upload_resp = mvp_client.post(
        "/api/v1/labels/upload",
        data={"raw_text": sample_label}
    )
    assert upload_resp.status_code == 201
    label_id = upload_resp.json()["label_id"]

    # 2. Extract
    extract_resp = mvp_client.post(f"/api/v1/labels/{label_id}/extract")
    assert extract_resp.status_code == 200
    extracted = extract_resp.json()["extracted"]
    assert len(extracted["ingredients"]) > 0

    # 3. Validate and produce report
    val_resp = mvp_client.post(f"/api/v1/labels/{label_id}/validate")
    assert val_resp.status_code == 200
    report = val_resp.json()

    assert "overall_status" in report
    assert "score" in report
    assert isinstance(report["issues"], list)
    assert report["score"] >= 90


def test_acceptance_criteria_4_audit_workflow(mvp_client):
    """
    §16 Criterion 4 - Audit:
    - Create audit
    - Generate checklist
    - Record findings
    - Attach evidence
    - Generate PDF / summary report
    """
    # 1. Create audit
    create_resp = mvp_client.post(
        "/api/v1/audits",
        json={"audit_type": "FSSAI Schedule 4 Comprehensive Inspection"}
    )
    assert create_resp.status_code == 201
    audit_id = create_resp.json()["id"]

    # 2. Start audit
    start_resp = mvp_client.post(f"/api/v1/audits/{audit_id}/start")
    assert start_resp.status_code == 200
    assert start_resp.json()["status"] == "IN_PROGRESS"

    # 3. Record finding with evidence
    finding_resp = mvp_client.post(
        f"/api/v1/audits/{audit_id}/findings",
        json={
            "severity": "HIGH",
            "finding": "Cold room storage thermometer out of calibration since 3 months.",
            "evidence": "https://s3.ap-south-1.amazonaws.com/safefood-docs/evidence/thermometer_gauge.jpg"
        }
    )
    assert finding_resp.status_code == 201
    finding_id = finding_resp.json()["id"]

    # 4. Complete audit
    complete_resp = mvp_client.post(f"/api/v1/audits/{audit_id}/complete")
    assert complete_resp.status_code == 200
    completed = complete_resp.json()
    assert completed["status"] == "COMPLETED"
    assert completed["score"] is not None

    # 5. Generate report
    report_resp = mvp_client.get(f"/api/v1/audits/{audit_id}/report")
    assert report_resp.status_code == 200
    report = report_resp.json()
    assert report["audit_id"] == str(audit_id)
    assert report["findings_count"] == 1
    assert report["findings"][0]["evidence"] is not None


def test_acceptance_criteria_5_risk_and_capa(mvp_client, db_session):
    """
    §16 Criterion 5 - Risk:
    - Create supplier
    - Create batch
    - Calculate risk
    - Explain risk (feature attribution)
    - Create corrective action from a risk finding
    """
    # 1. Create supplier
    sup_resp = mvp_client.post(
        "/api/v1/suppliers",
        json={
            "supplier_code": "SUP-ACCEPT-01",
            "name": "Deccan Dairy Producers",
            "license_number": "11520000000099",
            "risk_score": 0.28,
            "health_score": 79.5
        }
    )
    assert sup_resp.status_code == 201
    supplier_id = sup_resp.json()["id"]

    # 2. Fetch or create product
    prod_resp = mvp_client.post(
        "/api/v1/products",
        json={
            "product_code": "PRD-MILK-ACCEPT",
            "name": "Standardized Milk 1L",
            "category": "Dairy",
            "allergen_profile": ["Milk"]
        }
    )
    product_id = prod_resp.json()["id"]

    # 3. Create batch
    batch_resp = mvp_client.post(
        "/api/v1/batches",
        json={
            "product_id": product_id,
            "supplier_id": supplier_id,
            "batch_number": "BATCH-ACCEPT-001",
            "manufacturing_date": "2026-09-22",
            "expiry_date": "2026-09-25",
            "status": "HOLD"
        }
    )
    assert batch_resp.status_code == 201
    batch_id = batch_resp.json()["id"]

    # 4. Calculate Risk with feature attribution (SHAP)
    predict_resp = mvp_client.post(
        "/api/v1/recall/predict",
        json={
            "batch_id": batch_id,
            "temperature_excursion_c": 6.8,
            "lab_anomaly_score": 0.75,
            "complaints_count": 2,
            "inspection_findings_count": 1
        }
    )
    assert predict_resp.status_code == 200
    risk_result = predict_resp.json()

    assert risk_result["risk_probability"] >= 0.50
    assert risk_result["risk_level"] in ["MEDIUM", "HIGH"]
    assert len(risk_result["contributing_factors"]) > 0

    # Feature attribution percentages check
    factors = {f["factor"]: f["percentage"] for f in risk_result["contributing_factors"]}
    assert "Supplier history" in factors
    assert "Temperature excursion" in factors
    assert "Lab anomaly" in factors

    # 5. Create Corrective Action (CAPA) from finding
    # First create an audit finding
    audit_resp = mvp_client.post("/api/v1/audits", json={"audit_type": "Risk Follow-up Audit"})
    audit_id = audit_resp.json()["id"]
    finding_resp = mvp_client.post(
        f"/api/v1/audits/{audit_id}/findings",
        json={
            "severity": "CRITICAL",
            "finding": f"High recall risk detected on batch BATCH-ACCEPT-001 due to severe temperature excursion."
        }
    )
    finding_id = finding_resp.json()["id"]

    capa_resp = mvp_client.post(
        "/api/v1/capa",
        json={
            "finding_id": finding_id,
            "action_type": "CORRECTIVE",
            "description": "Quarantine affected milk lot, calibrate reefer digital sensors, and verify cold-chain logger."
        }
    )
    assert capa_resp.status_code == 201
    capa = capa_resp.json()
    assert capa["status"] == "OPEN"
    assert capa["verification_status"] == "PENDING"

    # Verify CAPA can be verified and closed
    capa_id = capa["id"]
    verify_resp = mvp_client.post(f"/api/v1/capa/{capa_id}/verify")
    assert verify_resp.status_code == 200
    assert verify_resp.json()["verification_status"] == "VERIFIED"

    close_resp = mvp_client.post(f"/api/v1/capa/{capa_id}/close")
    assert close_resp.status_code == 200
    assert close_resp.json()["status"] == "CLOSED"
