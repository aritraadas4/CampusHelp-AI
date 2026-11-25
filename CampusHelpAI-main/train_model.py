import pandas as pd
import os
import joblib

from sklearn.model_selection import train_test_split, GridSearchCV, StratifiedKFold
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    ConfusionMatrixDisplay
)
from sklearn.base import clone
import matplotlib.pyplot as plt


# ==========================================
# 1. LOAD DATASET
# ==========================================

data = pd.read_csv("complaints.csv")

print("\nCAMPUSHELP AI - MODEL TRAINING")
print("=" * 45)

print("Dataset loaded successfully!")
print("Total complaints:", len(data))


# ==========================================
# 2. CHECK DATASET
# ==========================================

required_columns = ["complaint", "category"]

for column in required_columns:
    if column not in data.columns:
        raise ValueError(f"Missing column: {column}")

data = data.dropna(subset=required_columns)

data["complaint"] = data["complaint"].astype(str).str.strip()
data["category"] = data["category"].astype(str).str.strip().str.upper()

data = data[data["complaint"] != ""]

# Remove exact duplicate complaint-label pairs
data = data.drop_duplicates(
    subset=["complaint", "category"]
)

print("\nDataset shape:", data.shape)

print("\nCategory distribution:")
print(data["category"].value_counts())

# Check minimum examples per category
category_counts = data["category"].value_counts()

if len(category_counts) < 2:
    raise ValueError("At least two categories are required.")

if category_counts.min() < 5:
    raise ValueError(
        "Each category needs at least 5 examples "
        "for this training setup."
    )


# ==========================================
# 3. SEPARATE INPUT AND OUTPUT
# ==========================================

X = data["complaint"]
y = data["category"]

# Split into training and testing data

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.25,
    random_state=42,
    stratify=y
)

print("\nTraining examples:", len(X_train))
print("Testing examples:", len(X_test))


# ==========================================
# 4. CREATE MACHINE LEARNING PIPELINE
# ==========================================

pipeline = Pipeline([
    (
        "tfidf",
        TfidfVectorizer(
            lowercase=True,
            ngram_range=(1, 2),
            min_df=1,
            sublinear_tf=True
        )
    ),

    (
        "classifier",
        MultinomialNB()
    )
])


# ==========================================
# 5. AUTOMATIC HYPERPARAMETER TUNING
# ==========================================

parameters = {
    "tfidf__ngram_range": [
        (1, 1),
        (1, 2)
    ],

    "tfidf__min_df": [
        1,
        2
    ],

    "classifier__alpha": [
        0.1,
        0.3,
        0.5,
        1.0,
        2.0
    ]
}

cross_validation = StratifiedKFold(
    n_splits=5,
    shuffle=True,
    random_state=42
)

grid_search = GridSearchCV(
    estimator=pipeline,
    param_grid=parameters,
    cv=cross_validation,
    scoring="f1_macro",
    n_jobs=-1
)

print("\nFinding the best model configuration...")

grid_search.fit(X_train, y_train)

print("\nBest Parameters:")
print(grid_search.best_params_)

print(
    "\nBest Cross-Validation Macro F1:",
    round(grid_search.best_score_ * 100, 2),
    "%"
)


# ==========================================
# 6. TEST THE MODEL
# ==========================================

best_model = grid_search.best_estimator_

predictions = best_model.predict(X_test)

accuracy = accuracy_score(
    y_test,
    predictions
)

print("\n" + "=" * 45)
print("MODEL EVALUATION")
print("=" * 45)

print("\nTest Accuracy:")
print(round(accuracy * 100, 2), "%")

print("\nClassification Report:")

print(
    classification_report(
        y_test,
        predictions,
        zero_division=0
    )
)


# ==========================================
# 7. CONFUSION MATRIX
# ==========================================

labels = sorted(y.unique())

matrix = confusion_matrix(
    y_test,
    predictions,
    labels=labels
)

print("\nConfusion Matrix:")
print(matrix)

display = ConfusionMatrixDisplay(
    confusion_matrix=matrix,
    display_labels=labels
)

display.plot(
    cmap="Blues",
    xticks_rotation=45
)

plt.title("CampusHelp AI - Confusion Matrix")
plt.tight_layout()

plt.savefig(
    "confusion_matrix.png",
    dpi=300
)

plt.show()


# ==========================================
# 8. TRAIN FINAL MODEL ON FULL DATASET
# ==========================================

print("\nTraining final model on complete dataset...")

final_model = clone(best_model)

final_model.fit(X, y)

# Extract trained components

vectorizer = final_model.named_steps["tfidf"]

model = final_model.named_steps["classifier"]


# ==========================================
# 9. SAVE MODEL AND VECTORIZER
# ==========================================

os.makedirs("model", exist_ok=True)

joblib.dump(
    model,
    "model/complaint_model.pkl"
)

joblib.dump(
    vectorizer,
    "model/vectorizer.pkl"
)

print("\n" + "=" * 45)
print("TRAINING COMPLETED SUCCESSFULLY!")
print("=" * 45)

print("\nModel saved successfully!")
print("Vectorizer saved successfully!")
print("Confusion matrix saved successfully!")

print("\nSaved files:")
print("1. model/complaint_model.pkl")
print("2. model/vectorizer.pkl")
print("3. confusion_matrix.png")