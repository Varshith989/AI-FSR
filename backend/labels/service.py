import re
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone


class LabelValidatorEngine:
    """
    Deterministic Food Label Validator (§5.6).
    Enforces hard compliance rules directly via deterministic logic,
    using AI strictly for supplementary interpretation.
    """

    MANDATORY_ALLERGENS = [
        "gluten", "wheat", "crustacean", "crab", "prawn", "egg",
        "fish", "peanut", "tree nut", "almond", "cashew", "walnut",
        "soy", "soya", "soybean", "milk", "dairy", "sulphite"
    ]

    def extract_text_and_layout(self, raw_text: str) -> Dict[str, Any]:
        """Simulate OCR layout extraction for ingredients, nutrition, and declarations."""
        clean = raw_text.strip()
        lines = [line.strip() for line in clean.split("\n") if line.strip()]

        ingredients = []
        nutrition = {}
        for line in lines:
            if line.lower().startswith("ingredients:"):
                raw_ing = line.split(":", 1)[1]
                ingredients = [i.strip() for i in raw_ing.split(",") if i.strip()]
            elif "energy" in line.lower() or "protein" in line.lower() or "sugar" in line.lower():
                parts = line.split(":")
                if len(parts) == 2:
                    nutrition[parts[0].strip().lower()] = parts[1].strip()

        return {
            "raw_text": clean,
            "lines": lines,
            "ingredients": ingredients,
            "nutrition": nutrition
        }

    def validate_label(self, extracted: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute deterministic FSSAI compliance rules.
        Returns exact shape specified in §5.6.
        """
        raw_text = extracted.get("raw_text", "")
        lower_text = raw_text.lower()
        ingredients = extracted.get("ingredients", [])

        issues: List[Dict[str, str]] = []
        score = 100

        # Rule 1: Veg / Non-Veg Symbol Check (FSSAI Labelling Regs 2020)
        has_veg = "veg" in lower_text or "green dot" in lower_text or "vegetarian" in lower_text
        has_non_veg = "non-veg" in lower_text or "brown triangle" in lower_text or "non vegetarian" in lower_text
        if not (has_veg or has_non_veg):
            score -= 15
            issues.append({
                "severity": "HIGH",
                "category": "SYMBOL_DECLARATION",
                "description": "Missing mandatory Veg (green circle) or Non-Veg (brown triangle) symbol.",
                "regulation_reference": "FSSAI (Packaging & Labelling) Regs 2020, Reg 5(4)"
            })

        # Rule 2: FSSAI Logo and 14-digit License Number Check
        fssai_match = re.search(r'\b1[0-9]{13}\b', raw_text)
        if "fssai" not in lower_text or not fssai_match:
            score -= 20
            issues.append({
                "severity": "CRITICAL",
                "category": "LICENSING",
                "description": "Missing valid 14-digit FSSAI License Number alongside the FSSAI logo.",
                "regulation_reference": "FSSAI (Packaging & Labelling) Regs 2020, Reg 5(8)"
            })

        # Rule 3: Allergen Engine Check (§5.6)
        detected_allergens = []
        for allergen in self.MANDATORY_ALLERGENS:
            for ing in ingredients:
                if allergen in ing.lower():
                    detected_allergens.append(allergen)

        has_allergen_declaration = "contains:" in lower_text or "allergen" in lower_text
        if detected_allergens and not has_allergen_declaration:
            score -= 16
            issues.append({
                "severity": "HIGH",
                "category": "ALLERGEN",
                "description": f"Potential allergens detected ({', '.join(set(detected_allergens))}) without distinct mandatory allergen warning declaration.",
                "regulation_reference": "FSSAI (Packaging & Labelling) Regs 2020, Reg 5(3)"
            })

        # Rule 4: Nutritional Information Panel
        if not extracted.get("nutrition") and "nutrition" not in lower_text:
            score -= 15
            issues.append({
                "severity": "MEDIUM",
                "category": "NUTRITION",
                "description": "Missing nutritional facts per 100g or per serving (Energy, Protein, Carbs, Added Sugars, Total Fat).",
                "regulation_reference": "FSSAI (Packaging & Labelling) Regs 2020, Reg 5(2)"
            })

        # Rule 5: Date of Manufacture & Expiry
        has_dates = ("mfg" in lower_text or "manufactur" in lower_text) and ("expiry" in lower_text or "best before" in lower_text or "use by" in lower_text)
        if not has_dates:
            score -= 10
            issues.append({
                "severity": "HIGH",
                "category": "MANDATORY_DATES",
                "description": "Missing Date of Manufacture or Best Before / Expiry date declaration.",
                "regulation_reference": "FSSAI (Packaging & Labelling) Regs 2020, Reg 5(7)"
            })

        # Calculate overall status
        score = max(0, min(100, score))
        if score >= 95:
            overall_status = "COMPLIANT"
        elif score >= 75:
            overall_status = "REVIEW_REQUIRED"
        else:
            overall_status = "NON_COMPLIANT"

        return {
            "overall_status": overall_status,
            "score": score,
            "issues": issues
        }


# In-memory session store for uploaded labels during MVP
_label_store: Dict[str, Dict[str, Any]] = {}


def save_label(label_id: str, data: Dict[str, Any]):
    _label_store[label_id] = data


def get_label(label_id: str) -> Optional[Dict[str, Any]]:
    return _label_store.get(label_id)
