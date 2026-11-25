import re
from typing import Dict, Any, Tuple
import joblib
from backend.config import MODEL_PATH, VECTORIZER_PATH, DEPARTMENT_MAPPING

class ClassifierService:
    def __init__(self):
        self.model = None
        self.vectorizer = None
        self._load_model()

    def _load_model(self):
        if not MODEL_PATH.exists() or not VECTORIZER_PATH.exists():
            raise FileNotFoundError(
                f"Model or Vectorizer file not found at {MODEL_PATH} / {VECTORIZER_PATH}"
            )
        self.model = joblib.load(MODEL_PATH)
        self.vectorizer = joblib.load(VECTORIZER_PATH)

    def analyze_urgency(self, text: str) -> Tuple[str, str]:
        """
        Independent Urgency Analyzer (Requirement #3):
        Separates urgency assessment from model categorization confidence.
        Urgency measures physical risk, campus disruption, or hazard severity.
        """
        normalized = text.lower()

        urgent_patterns = [
            (r"\b(fire|smoke|flame)\b", "Fire or smoke hazard detected"),
            (r"\b(spark|sparking|short circuit)\b", "Electrical sparking hazard"),
            (r"\b(exposed wire|live wire|loose wire|electric shock)\b", "Live/exposed electrical danger"),
            (r"\b(gas leak|chemical leak)\b", "Hazardous substance leak"),
            (r"\b(pipe burst|burst pipe|severe flood|flooding)\b", "Severe plumbing flood"),
            (r"\b(ceiling collaps|roof collaps|structural crack)\b", "Structural safety hazard"),
            (r"\b(broken glass|injury|blood|accident)\b", "Physical safety / injury risk")
        ]

        high_patterns = [
            (r"\b(no water|water supply stopped|drinking water broken)\b", "Water outage disrupting students"),
            (r"\b(power cut|blackout|no electricity|no power in lab)\b", "Major power outage"),
            (r"\b(drain blocked|drainage blocked|overflowing washbasin)\b", "Sanitary overflow issue"),
            (r"\b(exam|examination|portal login failure|server down)\b", "Academic/exam blocking issue")
        ]

        low_patterns = [
            (r"\b(duplicate id|id card|bus schedule|bus timetable)\b", "Routine administrative request"),
            (r"\b(fee receipt|scholarship enquiry|working hours|event registration)\b", "General inquiry"),
            (r"\b(lost bottle|lost item|lost umbrella)\b", "Lost and found inquiry")
        ]

        for pattern, reason in urgent_patterns:
            if re.search(pattern, normalized):
                return "Urgent", reason

        for pattern, reason in high_patterns:
            if re.search(pattern, normalized):
                return "High", reason

        for pattern, reason in low_patterns:
            if re.search(pattern, normalized):
                return "Low", reason

        return "Medium", "Standard maintenance / service request"

    def classify(self, complaint: str) -> Dict[str, Any]:
        """
        Classifies complaint text using the trained ML model and vectorizer.
        Confidence is the statistical class probability.
        Urgency is evaluated separately.
        """
        if not complaint or not complaint.strip():
            raise ValueError("Complaint description cannot be empty.")

        cleaned = complaint.strip()
        vec = self.vectorizer.transform([cleaned])
        pred_category = str(self.model.predict(vec)[0])
        probabilities = self.model.predict_proba(vec)[0]

        confidence = round(float(max(probabilities) * 100), 2)
        review_required = bool(confidence < 40.0)
        department = DEPARTMENT_MAPPING.get(pred_category, "General Administration")

        suggested_urgency, urgency_reason = self.analyze_urgency(cleaned)

        return {
            "complaint": cleaned,
            "category": pred_category,
            "department": department,
            "confidence": confidence,
            "review_required": review_required,
            "suggested_urgency": suggested_urgency,
            "urgency_reason": urgency_reason
        }

# Global singleton
classifier_service = ClassifierService()
