import uuid
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.database import get_db
from backend.models import User, Organization, UserRole
from backend.utils.security import hash_password
from backend.utils.tenancy import TenantBypassScope


@pytest.fixture
def client(db_session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def auth_user(db_session, sample_orgs):
    org_a, _ = sample_orgs
    with TenantBypassScope():
        user = User(
            id=uuid.uuid4(),
            organization_id=org_a.id,
            name="QA Test Lead",
            email="qatest@safefood.ai",
            password_hash=hash_password("SecurePassword@123"),
            role=UserRole.QA_MANAGER,
            status="ACTIVE"
        )
        db_session.add(user)
        db_session.commit()
    return user


def test_auth_login_success(client, auth_user):
    """Assert valid credentials return access & refresh JWT tokens."""
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "qatest@safefood.ai", "password": "SecurePassword@123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["role"] == "QA_MANAGER"
    assert data["email"] == "qatest@safefood.ai"


def test_auth_login_invalid_password(client, auth_user):
    """Assert bad password fails with 401 Unauthorized."""
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "qatest@safefood.ai", "password": "WrongPassword"}
    )
    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["detail"]


def test_auth_token_refresh(client, auth_user):
    """Assert refresh token issues new access token."""
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "qatest@safefood.ai", "password": "SecurePassword@123"}
    )
    refresh_token = login_resp.json()["refresh_token"]

    refresh_resp = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token}
    )
    assert refresh_resp.status_code == 200
    new_data = refresh_resp.json()
    assert "access_token" in new_data
    assert new_data["access_token"] != ""
