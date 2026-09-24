import os
import uuid
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.database import Base
from backend.utils.tenancy import register_tenancy_guard, set_current_tenant_id, reset_current_tenant_id, TenantBypassScope
from backend.models import Organization, User, UserRole


@pytest.fixture(scope="session")
def test_engine():
    """In-memory SQLite database engine shared across tests in a session."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
    Base.metadata.create_all(bind=engine)
    return engine


@pytest.fixture(scope="function")
def db_session(test_engine):
    """Provides a fresh transactional database session with tenancy guard active."""
    connection = test_engine.connect()
    transaction = connection.begin()
    SessionTest = sessionmaker(bind=connection, autocommit=False, autoflush=False)
    register_tenancy_guard(SessionTest)
    session = SessionTest()

    yield session

    session.close()
    transaction.rollback()
    connection.close()
    reset_current_tenant_id()


@pytest.fixture
def sample_orgs(db_session):
    """Creates two distinct organizations for multi-tenancy verification."""
    with TenantBypassScope():
        org_a = Organization(
            id=uuid.uuid4(),
            name="Org Alpha Foods",
            legal_name="Alpha Foods Ltd",
            industry_type="Dairy",
            country="IN",
            status="ACTIVE"
        )
        org_b = Organization(
            id=uuid.uuid4(),
            name="Org Beta Organics",
            legal_name="Beta Organics Ltd",
            industry_type="Bakery",
            country="IN",
            status="ACTIVE"
        )
        db_session.add_all([org_a, org_b])
        db_session.commit()
    return org_a, org_b
