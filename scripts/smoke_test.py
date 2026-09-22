import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
os.environ["DATABASE_URL"] = "sqlite:///./smoke_test.db"

import uuid
from fastapi.testclient import TestClient
from backend.main import app
from backend.database import engine, Base, SessionLocal
from data.seeders.seed_data import seed_database

def run_smoke_test():
    # 0. Setup DB
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    seed_database(db)
    db.close()

    client = TestClient(app)

    # 1. Login
    login_res = client.post("/api/v1/auth/login", json={
        "email": "qa.head@apexfoods.com",
        "password": "SafeFood@2026"
    })
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    tokens = login_res.json()
    token = tokens["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"1. Auth Login: OK (Token: {token[:20]}...)")

    # 2. Compliance Query
    comp_res = client.post("/api/v1/compliance/query", headers=headers, json={
        "question": "What are the temperature rules for pasteurized milk storage?"
    })
    assert comp_res.status_code == 200, f"Compliance query failed: {comp_res.text}"
    comp_data = comp_res.json()
    print(f"2. Compliance Query: OK (Confidence: {comp_data['confidence']}, Sources: {len(comp_data['sources'])})")

    # 3. Label Validation
    label_res = client.post("/api/v1/labels/upload", headers=headers, data={
        "raw_text": "Artisanal Sourdough Bread. Veg Green Dot Symbol. FSSAI Lic: 10019022009876. Ingredients: Whole wheat flour, salt, yeast, soy lecithin. Contains: Gluten, Soy. Per 100g: Energy 245kcal, Net Qty: 400g."
    })
    assert label_res.status_code == 201, f"Label upload failed: {label_res.text}"
    label_id = label_res.json()["label_id"]
    val_res = client.post(f"/api/v1/labels/{label_id}/validate", headers=headers)
    assert val_res.status_code == 200, f"Label validation failed: {val_res.text}"
    print(f"3. Label Validation: OK (Status: {val_res.json()['overall_status']}, Score: {val_res.json()['score']})")

    # 4. Recall Risk Prediction
    sup_res = client.post("/api/v1/suppliers", headers=headers, json={
        "supplier_code": "SUP-SMOKE-01",
        "name": "Smoke Test Supplier",
        "risk_score": 0.35,
        "health_score": 82.0
    })
    assert sup_res.status_code == 201
    sup_id = sup_res.json()["id"]

    prod_res = client.post("/api/v1/products", headers=headers, json={
        "product_code": "PRD-SMOKE-01",
        "name": "Organic Whole Milk",
        "category": "Dairy",
        "allergen_profile": ["Milk"]
    })
    assert prod_res.status_code == 201
    prod_id = prod_res.json()["id"]

    batch_res = client.post("/api/v1/batches", headers=headers, json={
        "product_id": prod_id,
        "supplier_id": sup_id,
        "batch_number": "BATCH-SMOKE-999",
        "manufacturing_date": "2026-09-22",
        "expiry_date": "2026-09-26",
        "status": "RELEASED"
    })
    assert batch_res.status_code == 201
    batch_id = batch_res.json()["id"]

    recall_res = client.post("/api/v1/recall/predict", headers=headers, json={
        "batch_id": batch_id,
        "temperature_excursion_c": 5.2,
        "lab_anomaly_score": 0.6,
        "complaints_count": 1,
        "inspection_findings_count": 0
    })
    assert recall_res.status_code == 200
    rec_data = recall_res.json()
    print(f"4. Recall Prediction: OK (Risk: {rec_data['risk_level']}, Prob: {rec_data['risk_probability']}, SHAP factors: {len(rec_data['contributing_factors'])})")

    # 5. Voice Assistant Query
    voice_res = client.post("/api/v1/voice/query", headers=headers, json={
        "transcript": "Batch BATCH-SMOKE-999 ka status kya hai?",
        "language": "hi"
    })
    assert voice_res.status_code == 200
    print(f"5. Voice Copilot (Hindi): OK (Intent: {voice_res.json()['intent']})")

    # 6. Audit & CAPA
    audit_res = client.post("/api/v1/audits", headers=headers, json={
        "audit_type": "FSSAI Scheduled Inspection"
    })
    assert audit_res.status_code == 201
    audit_id = audit_res.json()["id"]
    finding_res = client.post(f"/api/v1/audits/{audit_id}/findings", headers=headers, json={
        "severity": "CRITICAL",
        "finding": "Cold room thermometer out of range by 5.2C"
    })
    assert finding_res.status_code == 201
    finding_id = finding_res.json()["id"]
    capa_res = client.post("/api/v1/capa", headers=headers, json={
        "finding_id": finding_id,
        "action_type": "CORRECTIVE",
        "description": "Recalibrate thermostat and isolate affected batch"
    })
    assert capa_res.status_code == 201
    print(f"6. Audit Finding & CAPA: OK (CAPA ID: {capa_res.json()['id']}, Status: {capa_res.json()['status']})")

    print("\n=======================================================")
    print("SUCCESS: ALL 6 CORE SAAS ENGINE FLOWS PASSED SMOKE TEST!")
    print("=======================================================")

if __name__ == "__main__":
    run_smoke_test()
