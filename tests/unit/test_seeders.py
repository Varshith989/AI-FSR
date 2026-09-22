import pytest
from data.seeders.seed_data import seed_database
from backend.models import Organization, User, RegulatoryDocument, RegulatoryClause
from backend.utils.tenancy import TenantBypassScope


def test_seed_database_execution(db_session):
    """Assert seed_database executes cleanly and populates essential baseline data."""
    summary = seed_database(db_session)
    assert summary["organization"] == "Apex Foods India Pvt Ltd"
    assert summary["users_seeded"] >= 8
    assert summary["regulations_seeded"] >= 2
    assert summary["clauses_seeded"] >= 5
    assert summary["sites_seeded"] >= 2
    assert summary["products_seeded"] >= 2
    assert summary["batches_seeded"] >= 2

    # Verify regulatory documents are global
    with TenantBypassScope():
        docs = db_session.query(RegulatoryDocument).all()
        assert len(docs) >= 2
        clauses = db_session.query(RegulatoryClause).all()
        assert len(clauses) >= 5
