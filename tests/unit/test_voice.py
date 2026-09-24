import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.database import get_db
from backend.auth.dependencies import get_current_user
from backend.models import User, UserRole


@pytest.fixture
def test_client(db_session, sample_orgs):
    org_a, _ = sample_orgs
    mock_user = User(
        id=org_a.id,
        organization_id=org_a.id,
        name="Voice Tester",
        email="voice@safefood.ai",
        role=UserRole.QA_MANAGER,
        status="ACTIVE"
    )

    def override_get_db():
        yield db_session

    def override_current_user():
        return mock_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_current_user
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


def test_voice_query_hindi(test_client):
    """Assert Hindi query is recognized and answered in Hindi."""
    response = test_client.post(
        "/api/v1/voice/query",
        json={"transcript": "बैच PAN-202609B का तापमान चेक करो", "language": "hi"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["detected_language"] == "hi"
    assert data["intent"] == "BATCH_TEMP_LOOKUP"
    assert "तापमान" in data["response_text"]


def test_voice_query_tamil(test_client):
    """Assert Tamil query is recognized and answered in Tamil."""
    response = test_client.post(
        "/api/v1/voice/query",
        json={"transcript": "தொகுதி PAN-202609B வெப்பநிலையை சரிபார்க்கவும்", "language": "ta"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["detected_language"] == "ta"
    assert data["intent"] == "BATCH_TEMP_LOOKUP"
    assert "வெப்பநிலை" in data["response_text"]


def test_voice_hard_rule_quarantine_blocked_without_pin(test_client):
    """
    Hard Rule (§5.12): Voice commands must NEVER directly execute high-impact
    actions (such as batch quarantine) without explicit authentication and confirmation.
    """
    response = test_client.post(
        "/api/v1/voice/query",
        json={"transcript": "Quarantine batch PAN-202609B immediately", "language": "en"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["intent"] == "BATCH_QUARANTINE"
    assert data["high_impact_action_flagged"] is True
    assert data["requires_confirmation"] is True
    assert "authorization PIN required" in data["confirmation_prompt"]


def test_voice_hard_rule_quarantine_allowed_with_pin(test_client):
    """Assert high-impact quarantine action is authorized when PIN is supplied."""
    response = test_client.post(
        "/api/v1/voice/query",
        json={
            "transcript": "Quarantine batch PAN-202609B immediately",
            "language": "en",
            "confirmation_pin": "9999"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["intent"] == "BATCH_QUARANTINE"
    assert data["requires_confirmation"] is False
    assert "Authorization verified" in data["response_text"]
