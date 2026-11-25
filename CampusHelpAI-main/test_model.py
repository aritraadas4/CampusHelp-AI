import joblib

# Load trained model
model = joblib.load("model/complaint_model.pkl")

# Load TF-IDF vectorizer
vectorizer = joblib.load("model/vectorizer.pkl")

# New complaints for testing
complaints = [
    "Wi-Fi is not working",
    "Water leakage in bathroom",
    "Broken classroom fan",
    "Garbage near canteen",
    "Damaged classroom door",
    "Need duplicate college ID card"
]

# Convert complaints into numerical features
X = vectorizer.transform(complaints)

# Predict categories
predictions = model.predict(X)

# Display results
for complaint, prediction in zip(complaints, predictions):
    print("Complaint:", complaint)
    print("Predicted Category:", prediction)
    print("---------------------------")