import uuid
from typing import Dict, Any, Optional


class VoiceEngine:
    def process_voice_command(self, transcript: str, lang: str = "en-IN", pin: Optional[str] = None) -> Dict[str, Any]:
        transcript_lower = (transcript or "").lower()

        # Detect language
        detected_lang = lang
        if any("\u0900" <= c <= "\u097F" for c in transcript):
            detected_lang = "hi"
        elif any("\u0B80" <= c <= "\u0BFF" for c in transcript):
            detected_lang = "ta"
        elif "hi" in lang.lower():
            detected_lang = "hi"
        elif "ta" in lang.lower():
            detected_lang = "ta"
        else:
            detected_lang = "en"

        high_impact = False
        requires_confirmation = False

        if "quarantine" in transcript_lower or "क्वारंटाइन" in transcript or "தனிமைப்படுத்து" in transcript:
            high_impact = True
            if pin != "9999":
                requires_confirmation = True
                if detected_lang == "hi":
                    response_text = "कार्रवाई रोक दी गई है। जारी रखने के लिए प्राधिकरण पिन की आवश्यकता है।"
                elif detected_lang == "ta":
                    response_text = "செயல்பாடு இடைநிறுத்தப்பட்டது. தொடர அங்கீகார பின் தேவை."
                else:
                    response_text = "Operation held. Explicit authorization PIN is required to execute quarantine."
            else:
                response_text = "Authorization verified. Batch quarantine protocol has been initiated."
        elif "temp" in transcript_lower or "तापमान" in transcript or "வெப்பநிலை" in transcript:
            if detected_lang == "hi":
                response_text = "बैच PAN-202609B का तापमान 7.2 डिग्री सेल्सियस रिकॉर्ड किया गया है, जो स्वीकार्य सीमा (4°C) से अधिक है।"
            elif detected_lang == "ta":
                response_text = "தொகுதி PAN-202609B வெப்பநிலை 7.2 டிகிரி செல்சியஸ் என பதிவாகியுள்ளது, இது 4°C வரம்பை விட அதிகம்."
            else:
                response_text = "Batch PAN-202609B logged a temperature excursion of 7.2°C, which exceeds the statutory 4°C limit."
        else:
            if detected_lang == "hi":
                response_text = "मुझे आपका निर्देश मिल गया है। खाद्य सुरक्षा नियमों का पालन करें और दैनिक स्वच्छता लॉग दर्ज करें।"
            elif detected_lang == "ta":
                response_text = "உங்கள் குரல் கட்டளை பெறப்பட்டது. எஃப்.எஸ்.எஸ்.ஏ.ஐ உணவு பாதுகாப்பு விதிமுறைகளை கவனமாக பின்பற்றுங்கள்."
            else:
                response_text = "Under FSSAI rules, pasteurized milk must be kept refrigerated below 4°C and used within 2 to 3 days."

        return {
            "response_text": response_text,
            "detected_language": detected_lang,
            "high_impact_action_flagged": high_impact,
            "requires_confirmation": requires_confirmation
        }


voice_engine = VoiceEngine()
