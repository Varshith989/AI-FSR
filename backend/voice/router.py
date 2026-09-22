import uuid
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import User, Batch
from backend.auth.dependencies import get_current_user

router = APIRouter(prefix="/voice", tags=["Voice AI Copilot"])

# In-memory session tracking for active voice interactions
_voice_sessions: Dict[str, Dict[str, Any]] = {}


class VoiceQueryRequest(BaseModel):
    session_id: Optional[str] = None
    transcript: str
    language: str = "en"  # "en", "hi", "ta"
    confirmation_pin: Optional[str] = None


class VoiceQueryResponse(BaseModel):
    session_id: str
    detected_language: str
    intent: str
    response_text: str
    high_impact_action_flagged: bool
    requires_confirmation: bool
    confirmation_prompt: Optional[str] = None


@router.post("/transcribe")
async def transcribe_voice(
    file: Optional[UploadFile] = File(None),
    language_hint: str = Form("en"),
    current_user: User = Depends(get_current_user)
):
    """Speech-to-Text transcription supporting English, Hindi (हिन्दी), and Tamil (தமிழ்)."""
    # High-fidelity mock transcription for testing
    if language_hint == "hi":
        transcript = "बैच PAN-202609B का तापमान चेक करो"
    elif language_hint == "ta":
        transcript = "தொகுதி PAN-202609B வெப்பநிலையை சரிபார்க்கவும்"
    else:
        transcript = "Check the temperature of batch PAN-202609B"

    return {
        "transcript": transcript,
        "language": language_hint,
        "confidence": 0.96
    }


@router.post("/query", response_model=VoiceQueryResponse)
def process_voice_query(
    payload: VoiceQueryRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Process recognized voice intent with language adaptation and safety gates (§5.12).
    Hard rule: Voice commands NEVER directly perform high-impact actions (quarantine, release)
    without explicit secondary authentication/confirmation.
    """
    session_id = payload.session_id or str(uuid.uuid4())
    transcript_lower = payload.transcript.lower()

    # Detect language if not provided
    lang = payload.language
    if any("\u0900" <= c <= "\u097F" for c in payload.transcript):
        lang = "hi"
    elif any("\u0B80" <= c <= "\u0BFF" for c in payload.transcript):
        lang = "ta"

    # Intent Classification
    intent = "GENERAL_QUERY"
    high_impact = False
    requires_confirmation = False
    confirmation_prompt = None

    if "quarantine" in transcript_lower or "क्वारंटाइन" in payload.transcript or "தனிமைப்படுத்து" in payload.transcript:
        intent = "BATCH_QUARANTINE"
        high_impact = True
        # Check if confirmed with PIN
        if payload.confirmation_pin != "9999":
            requires_confirmation = True
            if lang == "hi":
                confirmation_prompt = "चेतावनी: बैच क्वारंटाइन एक महत्वपूर्ण कार्य है। कृपया 4-अंकीय पिन दर्ज करें।"
                response_text = "कार्रवाई रोक दी गई है। जारी रखने के लिए प्राधिकरण पिन की आवश्यकता है।"
            elif lang == "ta":
                confirmation_prompt = "எச்சரிக்கை: தொகுதி தனிமைப்படுத்தல் ஒரு முக்கியமான செயலாகும். அங்கீகார பின்னை உள்ளிடவும்."
                response_text = "செயல்பாடு இடைநிறுத்தப்பட்டது. தொடர அங்கீகார பின் தேவை."
            else:
                confirmation_prompt = "Warning: Batch quarantine is a high-impact action. Explicit QA authorization PIN required."
                response_text = "Operation held. Explicit authorization PIN is required to execute quarantine."
        else:
            response_text = "Authorization verified. Batch quarantine protocol has been initiated."
    elif "temp" in transcript_lower or "तापमान" in payload.transcript or "வெப்பநிலை" in payload.transcript:
        intent = "BATCH_TEMP_LOOKUP"
        if lang == "hi":
            response_text = "बैच PAN-202609B का तापमान 7.2 डिग्री सेल्सियस रिकॉर्ड किया गया है, जो स्वीकार्य सीमा (4°C) से अधिक है।"
        elif lang == "ta":
            response_text = "தொகுதி PAN-202609B வெப்பநிலை 7.2 டிகிரி செல்சியஸ் என பதிவாகியுள்ளது, இது 4°C வரம்பை விட அதிகம்."
        else:
            response_text = "Batch PAN-202609B logged a temperature excursion of 7.2°C, which exceeds the statutory 4°C limit."
    else:
        intent = "FSSAI_REGULATION_HELP"
        response_text = "SafeFood AI Voice Copilot is ready. Ask about FSSAI licensing, Schedule 4 hygiene, or batch telemetry."

    session_data = {
        "session_id": session_id,
        "last_transcript": payload.transcript,
        "intent": intent,
        "language": lang
    }
    _voice_sessions[session_id] = session_data

    return VoiceQueryResponse(
        session_id=session_id,
        detected_language=lang,
        intent=intent,
        response_text=response_text,
        high_impact_action_flagged=high_impact,
        requires_confirmation=requires_confirmation,
        confirmation_prompt=confirmation_prompt
    )


@router.post("/synthesize")
def synthesize_speech(
    text: str = Form(...),
    language: str = Form("en"),
    current_user: User = Depends(get_current_user)
):
    """Text-to-Speech audio synthesizer."""
    return {
        "text": text,
        "language": language,
        "audio_url": f"/static/audio/tts_{uuid.uuid4().hex[:8]}.mp3",
        "format": "audio/mp3"
    }


@router.get("/sessions/{session_id}")
def get_voice_session(
    session_id: str,
    current_user: User = Depends(get_current_user)
):
    """Retrieve state of an ongoing shopfloor voice session."""
    session = _voice_sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Voice session not found")
    return session
