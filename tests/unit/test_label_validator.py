import pytest
from backend.labels.service import LabelValidatorEngine


@pytest.fixture
def engine():
    return LabelValidatorEngine()


def test_label_validator_compliant(engine):
    """Assert a label meeting all FSSAI 2020 requirements receives high score and COMPLIANT status."""
    raw_label = """
    Product: Fresh Pasteurized Cow Milk 500ml
    Veg Green Dot Symbol present
    FSSAI License No: 10019022009876
    Ingredients: Pasteurized standardized cow milk, Vitamin A, Vitamin D.
    Contains: Milk
    Nutrition Facts per 100g:
    Energy: 65 kcal
    Protein: 3.2g
    Carbohydrates: 4.8g
    Added Sugars: 0.0g
    Total Fat: 4.5g
    Mfg Date: 2026-09-20
    Expiry Date: 2026-09-23
    Net Quantity: 500 ml
    """
    extracted = engine.extract_text_and_layout(raw_label)
    report = engine.validate_label(extracted)

    assert report["overall_status"] == "COMPLIANT"
    assert report["score"] >= 95
    assert len(report["issues"]) == 0


def test_label_validator_missing_fssai_license_and_allergens(engine):
    """Assert missing license and undeclared allergens trigger critical/high issues."""
    flawed_label = """
    Product: Spicy Peanut Chutney
    Ingredients: Peanuts, Roasted Gram, Red Chilli, Salt.
    (No FSSAI number displayed)
    """
    extracted = engine.extract_text_and_layout(flawed_label)
    report = engine.validate_label(extracted)

    assert report["overall_status"] in ["REVIEW_REQUIRED", "NON_COMPLIANT"]
    assert report["score"] < 75

    categories = [i["category"] for i in report["issues"]]
    assert "LICENSING" in categories
    assert "ALLERGEN" in categories
    assert "SYMBOL_DECLARATION" in categories
