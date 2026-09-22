import uuid
import json
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Request, UploadFile, File, Form
from backend.database import SessionLocal
from backend.compliance.service import ComplianceService
from backend.labels.service import LabelValidatorEngine, save_label
from backend.voice.service import voice_engine

router = APIRouter(tags=["Frontend Prototype API Bridge"])
label_engine = LabelValidatorEngine()


@router.post("/regulatory-chat")
async def regulatory_chat(request: Request):
    """Bridge for frontend chat assistant and audit test."""
    query = ""
    try:
        data = await request.json()
        query = data.get("query") or data.get("question") or ""
    except Exception:
        pass

    if not query.strip():
        return {
            "reply": "Hi! Welcome to SafeFood AI. How can I help you with FSSAI regulations or food safety compliance today?",
            "sources": [],
            "confidence": 1.0
        }

    db = SessionLocal()
    try:
        service = ComplianceService(db=db)
        result = service.answer_query(question=query)
        return {
            "reply": result["answer"],
            "sources": result.get("sources", []),
            "confidence": result.get("confidence", 0.9),
            "requires_human_review": result.get("requires_human_review", False)
        }
    finally:
        db.close()


@router.post("/generate-checklist")
async def generate_checklist(request: Request):
    """Bridge for audit checklist generator."""
    business_type = "restaurant"
    try:
        data = await request.json()
        business_type = data.get("businessType", "restaurant").lower()
    except Exception:
        pass

    checklists = {
        "restaurant": [
            {"id": "r1", "text": "All raw materials sourced from FSSAI registered/licensed vendors.", "clause": "Sec 4.1"},
            {"id": "r2", "text": "Potable water quality checked and test records maintained.", "clause": "Sec 4.2.1"},
            {"id": "r3", "text": "Refrigerators maintaining temperature below 5°C; freezers below -18°C.", "clause": "Sec 4.5.2"},
            {"id": "r4", "text": "Separate cutting boards and knives used for raw/cooked food.", "clause": "Sec 4.3"},
            {"id": "r5", "text": "All food handlers wearing clean aprons, gloves, and hairnets.", "clause": "Sec 4.6.1"},
            {"id": "r6", "text": "Pest control treatment completed and traps logbook active.", "clause": "Sec 4.4.3"},
            {"id": "r7", "text": "Annual health examination records of handlers present.", "clause": "Sec 4.6.2"},
            {"id": "r8", "text": "First-in-First-out (FIFO) inventory method followed.", "clause": "Sec 4.3.2"},
            {"id": "r9", "text": "All food containers labeled with date of preparation.", "clause": "Sec 4.7"},
            {"id": "r10", "text": "Daily cleaning schedule logs signed by floor supervisor.", "clause": "Sec 4.4"}
        ],
        "manufacturing": [
            {"id": "m1", "text": "Raw material reception inspection checklist fully updated.", "clause": "Sched 4 Part II"},
            {"id": "m2", "text": "Continuous temperature sensor monitoring validated for boiler.", "clause": "Sec 4.2.3"},
            {"id": "m3", "text": "Clean-In-Place (CIP) systems operational and log updated.", "clause": "Sec 4.4.2"},
            {"id": "m4", "text": "Quarantine area demarcated for substandard raw goods.", "clause": "Sec 4.1.2"},
            {"id": "m5", "text": "Metal detector sensitivity tested hourly with test pieces.", "clause": "Sec 4.3.5"},
            {"id": "m6", "text": "Staff personal hygiene screening conducted at shifts.", "clause": "Sec 4.6"},
            {"id": "m7", "text": "All processing exhaust vents fitted with insect mesh.", "clause": "Sec 4.2.5"},
            {"id": "m8", "text": "All food grade additives verified within maximum limits.", "clause": "Sec 4.5"},
            {"id": "m9", "text": "Batch recall drill conducted and logged within past 12 months.", "clause": "Sec 4.8"},
            {"id": "m10", "text": "Waste disposal bins kept covered and emptied frequently.", "clause": "Sec 4.4.5"}
        ],
        "warehouse": [
            {"id": "w1", "text": "Loading dock clear of water stagnation and clutter.", "clause": "Sec 4.1.1"},
            {"id": "w2", "text": "Cold chain storage records generated continuously.", "clause": "Sec 4.5.1"},
            {"id": "w3", "text": "Pallets placed at least 15cm off floor & 45cm away from walls.", "clause": "Sec 4.2"},
            {"id": "w4", "text": "No chemicals stored in same chamber as food products.", "clause": "Sec 4.3.1"},
            {"id": "w5", "text": "Vehicle sanitization certificates verified before load.", "clause": "Sec 4.7.1"},
            {"id": "w6", "text": "Humidity control logs recorded in dry goods warehouse.", "clause": "Sec 4.5.2"},
            {"id": "w7", "text": "Extermination bait stations inspected and recorded weekly.", "clause": "Sec 4.4.1"},
            {"id": "w8", "text": "Emergency exit paths clear and fire extinguishers operational.", "clause": "Sec 4.2.9"},
            {"id": "w9", "text": "All stored pallets clearly carry Batch IDs & Expiry labels.", "clause": "Sec 4.7.2"},
            {"id": "w10", "text": "Visitor entry hygiene protocols signed and enforced.", "clause": "Sec 4.6.3"}
        ]
    }
    items = checklists.get(business_type, checklists["restaurant"])
    return {
        "source": "ai",
        "businessType": business_type,
        "items": items
    }


@router.post("/analyze-document")
async def analyze_document_bridge(request: Request):
    """Bridge for document intelligence analysis."""
    text = ""
    filename = "document.txt"
    content_type = request.headers.get("content-type", "")

    if "multipart/form-data" in content_type:
        form = await request.form()
        uploaded_file = form.get("document") or form.get("file")
        if uploaded_file and hasattr(uploaded_file, "filename"):
            filename = uploaded_file.filename
            content_bytes = await uploaded_file.read()
            text = content_bytes.decode("utf-8", errors="ignore")
        text = text or str(form.get("text", ""))
        filename = str(form.get("filename", filename))
    else:
        try:
            data = await request.json()
            text = data.get("text", "")
            filename = data.get("filename", "document.txt")
        except Exception:
            pass

    combined = (filename + " " + text).lower()
    score = 78
    haccp = "8/10"
    fssai = "Satisfactory"
    risk = "Low Risk"
    gaps = []
    corrections = []

    if "pest" in combined:
        score = 68
        fssai = "Critical Gaps"
        risk = "High Risk"
        gaps = [
            "Weekly rodent trap checks mandatory under Schedule 4 (currently twice monthly).",
            "Pesticide spraying during active production shifts risks chemical contamination.",
            "Record-keeping must be minimum 12 months (currently 6 months)."
        ]
        corrections = [
            {"title": "Corrective Clause 2.1 — Trapping Schedule", "text": "Rodent bait stations shall be checked weekly by a certified pest controller."},
            {"title": "Corrective Clause 3.1 — Chemical Application", "text": "Chemical spraying is prohibited during active food handling."}
        ]
    elif "cold" in combined or "temp" in combined or "thermometer" in combined:
        score = 72
        fssai = "Satisfactory"
        risk = "Medium Risk"
        gaps = [
            "FSSAI Schedule 4 requires continuous automated temperature logging, not manual twice-daily charts.",
            "Sensor calibration every 2 years is insufficient; validate every 12 months minimum."
        ]
        corrections = [
            {"title": "Corrective Clause 1.1 — Automatic Logging", "text": "Cold rooms shall use continuous electronic data loggers with cloud backup."}
        ]
    else:
        gaps = ["Document contains general hygiene protocols but lacks specific CCP metrics."]
        corrections = [{"title": "Recommendation", "text": "Append HACCP CCP sheets with limits, probe numbers, and safety tolerances."}]

    return {
        "source": "ai",
        "analysis": {
            "complianceScore": score,
            "haccpAlignment": haccp,
            "fssaiSchedule4Status": fssai,
            "safetyRiskLevel": risk,
            "complianceGaps": gaps,
            "recommendedCorrections": corrections
        }
    }


@router.post("/validate-label")
async def validate_label_bridge(request: Request):
    """Bridge for AI food label validator."""
    raw_text = ""
    content_type = request.headers.get("content-type", "")

    if "multipart/form-data" in content_type:
        form = await request.form()
        uploaded_file = form.get("labelImage") or form.get("file")
        if uploaded_file and hasattr(uploaded_file, "filename"):
            content_bytes = await uploaded_file.read()
            raw_text = content_bytes.decode("utf-8", errors="ignore")
        raw_text = raw_text or str(form.get("raw_text", ""))
    else:
        try:
            data = await request.json()
            raw_text = data.get("raw_text") or data.get("text") or ""
        except Exception:
            pass

    if not raw_text.strip():
        raw_text = "Standard Product Label. Veg Green Dot. FSSAI Lic No: 10019022009876. Nutrition facts per 100g: Energy 100 kcal."

    extracted = label_engine.extract_text_and_layout(raw_text)
    report = label_engine.validate_label(extracted)

    # Persist in DB and memory
    lbl_id = str(uuid.uuid4())
    save_label(lbl_id, {
        "label_id": lbl_id,
        "file_name": "frontend_label_scan.txt",
        "raw_text": raw_text,
        "status": "VALIDATED",
        "extracted": extracted,
        "report": report
    })

    score = report["score"]
    status_str = report["overall_status"]

    nutri_pills = []
    for k, v in extracted.get("nutrition", {}).items():
        nutri_pills.append({"text": f"{k.title()}: {v}", "class": "pass"})
    if not nutri_pills:
        nutri_pills = [{"text": "Nutritional Panel Checked", "class": "pass" if score >= 80 else "warn"}]

    warnings = []
    for issue in report.get("issues", []):
        warnings.append({
            "text": f"[{issue.get('severity')}] {issue.get('description')}",
            "class": "danger-warning" if issue.get("severity") in ["CRITICAL", "HIGH"] else "info-warning"
        })

    mandatory_text = "FSSAI Mandatory Declarations Verified" if score >= 90 else "Mandatory declarations require attention under FSSAI 2020 Labelling Regulations."

    if status_str == "COMPLIANT":
        badge_text = f"Approved ({score}%)"
        badge_class = "badge badge-success-glow"
        verdict = {
            "class": "verdict-approved",
            "icon": '<i class="fa-solid fa-circle-check" aria-hidden="true"></i>',
            "title": "APPROVED: Fully Compliant",
            "desc": "All allergen callouts and mandatory declarations comply with FSSAI rules."
        }
    elif status_str == "REVIEW_REQUIRED":
        badge_text = f"Warning ({score}%)"
        badge_class = "badge badge-warning-glow"
        verdict = {
            "class": "verdict-warning",
            "icon": '<i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>',
            "title": "WARNING: Potential Compliance Gaps",
            "desc": "Label passes basic checks but requires front-of-pack review."
        }
    else:
        badge_text = f"Rejected ({score}%)"
        badge_class = "badge badge-danger-glow"
        verdict = {
            "class": "verdict-rejected",
            "icon": '<i class="fa-solid fa-circle-xmark" aria-hidden="true"></i>',
            "title": "REJECTED: Regulatory Breach",
            "desc": "Mandatory licensing, allergen, or vegetarian declaration is absent."
        }

    return {
        "source": "ai",
        "label_id": lbl_id,
        "report": {
            "overallBadge": {"text": badge_text, "class": badge_class},
            "nutriPills": nutri_pills,
            "warnings": warnings,
            "mandatory": mandatory_text,
            "verdict": verdict
        }
    }


@router.post("/recall-assessment")
async def recall_assessment_bridge(request: Request):
    """Bridge for predictive recall assessment."""
    supplier_info = ""
    batch_info = ""
    pathogen_info = "E. coli"
    try:
        data = await request.json()
        supplier_info = data.get("supplierInfo", "S-102")
        batch_info = data.get("batchInfo", "B-402")
        pathogen_info = data.get("pathogenInfo", "E. coli")
    except Exception:
        pass

    return {
        "assessment": {
            "recallRiskScore": 78,
            "recallClassification": "Class I - Dangerous",
            "recallNecessity": "Immediate Mandatory Recall",
            "quarantineInstructions": f"FSSAI Chapter 3 compliance requires physical quarantine of batch {batch_info} from supplier {supplier_info} and formal diagnostic auditing for {pathogen_info}.",
            "supplierNotification": f"URGENT FOOD SAFETY NOTIFICATION: Potential contamination hazard ({pathogen_info}) flagged for batch {batch_info}. Please quarantine immediately and coordinate with QA within 24 hours."
        }
    }


@router.post("/voice-chat")
async def voice_chat_bridge(request: Request):
    """Bridge for floor audit voice assistant."""
    query = ""
    lang = "en-IN"
    try:
        data = await request.json()
        query = data.get("query", "")
        lang = data.get("lang", "en-IN")
    except Exception:
        pass

    res = voice_engine.process_voice_command(
        transcript=query or "What is current cold room temperature?",
        lang=lang
    )

    return {
        "reply": res["response_text"],
        "detected_language": res["detected_language"],
        "action": res.get("action"),
        "high_impact_action_flagged": res.get("high_impact_action_flagged", False)
    }
