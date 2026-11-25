import os
from pathlib import Path

# Paths
BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent
DB_PATH = PROJECT_ROOT / "campus_complaints.db"
DB_BACKUP_PATH = PROJECT_ROOT / "campus_complaints.db.backup"
MODEL_PATH = PROJECT_ROOT / "model" / "complaint_model.pkl"
VECTORIZER_PATH = PROJECT_ROOT / "model" / "vectorizer.pkl"
UPLOAD_DIR = PROJECT_ROOT / "uploads"

# Ensure upload directory exists
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# JWT & Authentication Config
JWT_SECRET = os.getenv("JWT_SECRET", "campushelp-secure-jwt-secret-key-2026")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Upload Limits & Validation
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".pdf"}
ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf"
}

# Categories and Departments Mapping
DEPARTMENT_MAPPING = {
    "IT_NETWORK": "IT Department",
    "ELECTRICAL": "Electrical Department",
    "PLUMBING": "Plumbing Department",
    "CLEANLINESS": "Housekeeping",
    "INFRASTRUCTURE": "Maintenance Department",
    "OTHER": "General Administration"
}

CATEGORIES = list(DEPARTMENT_MAPPING.keys())
DEPARTMENTS = list(dict.fromkeys(DEPARTMENT_MAPPING.values()))

# Status and Urgency Options
COMPLAINT_STATUSES = ["Pending", "Under Review", "In Progress", "Resolved", "Rejected"]
URGENCY_LEVELS = ["Low", "Medium", "High", "Urgent"]
USER_ROLES = ["student", "staff", "admin"]
