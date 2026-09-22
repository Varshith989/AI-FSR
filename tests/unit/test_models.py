import uuid
from datetime import datetime, date
import pytest
from backend.models import (
    Base, Organization, User, UserRole,
    Site, Product, Supplier, Batch, BatchStatus,
    RegulatoryDocument, RegulatoryClause,
    Document, DocumentAnalysis,
    Audit, AuditFinding, FindingSeverity, CAPAAction,
    RecallPrediction, RecallEvent,
    AIModelVersion, AIPrediction, AIAuditLog,
    LabelValidation
)
from backend.utils.tenancy import TenantBypassScope, TenantScope


def test_table_registration_count():
    """Assert all core tables are properly registered in SQLAlchemy metadata."""
    expected_tables = {
        "organizations", "users", "sites", "products", "suppliers", "batches",
        "regulatory_documents", "regulatory_clauses", "documents", "document_analysis",
        "audits", "audit_findings", "capa_actions", "recall_predictions", "recall_events",
        "ai_model_versions", "ai_predictions", "ai_audit_logs", "label_validations"
    }
    actual_tables = set(Base.metadata.tables.keys())
    assert expected_tables.issubset(actual_tables), f"Missing tables: {expected_tables - actual_tables}"
    assert len(actual_tables) == 19


def test_user_roles_enum():
    """Assert all roles specified in §5.1 exist in UserRole enum."""
    expected_roles = {
        "SUPER_ADMIN", "ORG_ADMIN", "FOOD_SAFETY_MANAGER", "QA_MANAGER",
        "AUDITOR", "QA_ANALYST", "PRODUCTION_MANAGER", "SUPPLIER", "VIEWER"
    }
    actual_roles = {r.value for r in UserRole}
    assert expected_roles == actual_roles


def test_batch_status_enum():
    """Assert all batch statuses specified in §5.9 exist."""
    expected = {"RELEASED", "HOLD", "QUARANTINED", "RECALLED", "DESTROYED", "CLOSED"}
    actual = {s.value for s in BatchStatus}
    assert expected == actual


def test_finding_severity_enum():
    """Assert all audit finding severities specified in §5.10 exist."""
    expected = {"CRITICAL", "HIGH", "MEDIUM", "LOW", "OBSERVATION"}
    actual = {s.value for s in FindingSeverity}
    assert expected == actual


def test_model_instantiation_and_persistence(db_session, sample_orgs):
    """Assert models can be inserted and queried cleanly."""
    org_a, _ = sample_orgs

    with TenantScope(org_a.id):
        # 1. Product
        product = Product(
            id=uuid.uuid4(),
            organization_id=org_a.id,
            product_code="PRD-TEST-01",
            name="Pasteurized Whole Milk 1L",
            category="Dairy",
            shelf_life_days=3,
            allergen_profile=["Milk"],
            status="ACTIVE"
        )
        db_session.add(product)

        # 2. Supplier
        supplier = Supplier(
            id=uuid.uuid4(),
            organization_id=org_a.id,
            supplier_code="SUP-TEST-01",
            name="Green Meadows Dairy Farm",
            license_number="10020000000001",
            status="ACTIVE"
        )
        db_session.add(supplier)
        db_session.commit()

        # 3. Batch
        batch = Batch(
            id=uuid.uuid4(),
            organization_id=org_a.id,
            product_id=product.id,
            supplier_id=supplier.id,
            batch_number="BATCH-2026-TEST-01",
            manufacturing_date=date(2026, 9, 22),
            expiry_date=date(2026, 9, 25),
            status=BatchStatus.RELEASED,
            risk_score=0.05,
            risk_level="LOW"
        )
        db_session.add(batch)
        db_session.commit()

        # Verify query
        retrieved_batch = db_session.query(Batch).filter_by(batch_number="BATCH-2026-TEST-01").first()
        assert retrieved_batch is not None
        assert retrieved_batch.product.name == "Pasteurized Whole Milk 1L"
        assert retrieved_batch.supplier.name == "Green Meadows Dairy Farm"
        assert retrieved_batch.status == BatchStatus.RELEASED
