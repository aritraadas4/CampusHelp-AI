import os
from pathlib import Path
import joblib

# Resolve absolute path to model directory
BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "model" / "complaint_model.pkl"
VECTORIZER_PATH = BASE_DIR / "model" / "vectorizer.pkl"

# Load the trained model and vectorizer
model = joblib.load(MODEL_PATH)
vectorizer = joblib.load(VECTORIZER_PATH)

# Map categories to departments
department_mapping = {
    "IT_NETWORK": "IT Department",
    "ELECTRICAL": "Electrical Department",
    "PLUMBING": "Plumbing Department",
    "CLEANLINESS": "Housekeeping",
    "INFRASTRUCTURE": "Maintenance Department",
    "OTHER": "General Administration"
}

def classify_complaint(complaint):
    if not isinstance(complaint, str) or not complaint.strip():
        return "Please enter a complaint."

    # Convert complaint into numerical features
    complaint_vector = vectorizer.transform([complaint])

    # Predict category
    prediction = model.predict(complaint_vector)[0]

    # Get prediction probability
    probabilities = model.predict_proba(complaint_vector)[0]
    confidence = max(probabilities) * 100
    review_required = confidence < 40

    # Find responsible department
    department = department_mapping.get(prediction, "General Administration")

    # Return all results
    return {
        "complaint": complaint,
        "category": prediction,
        "department": department,
        "confidence": round(float(confidence), 2),
        "review_required": review_required
    }


if __name__ == "__main__":
    # Test the system
    # Test multiple complaints
    complaints = [
        "Wi-Fi not working",
        "Broken classroom fan",
        "Water leakage in bathroom",
        "Garbage near canteen",
        "Exposed electrical wire",
        "Slow internet connection",
        "Blocked bathroom sink",
        "Damaged classroom door",
        "Dustbin overflowing",
        "Projector not working"
    ]

    for complaint in complaints:
        result = classify_complaint(complaint)
        print("\n--------------------------")
        print("Complaint:", result["complaint"])
        print("Category:", result["category"])
        print("Department:", result["department"])
        print("Confidence:", result["confidence"], "%")
        if result["review_required"]:
            print("Status: Requires Human Review")
        else:
            print("Status: Automatically Categorized")
