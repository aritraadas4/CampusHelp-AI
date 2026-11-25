"""
Phase 1 Backend Test Suite for CampusHelp AI.
Tests are run directly (no pytest dependency needed).
Each test prints PASS or FAIL with details.
"""

import sys
import os
import shutil
import tempfile
import traceback
from pathlib import Path

# ── make project root importable ────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

# ── Single shared temp directory for the entire test run ────────────────────
# Using one directory prevents the parent-dir-deleted problem: cleanup only
# happens after ALL tests finish (at the very end of this file).
TEMP_DIR = Path(tempfile.mkdtemp())
TEMP_DB   = TEMP_DIR / "test_campus.db"
TEMP_UPL  = TEMP_DIR / "uploads"
TEMP_UPL.mkdir(parents=True, exist_ok=True)

# Patch config BEFORE any backend module is imported
import backend.config as cfg
cfg.DB_PATH    = TEMP_DB
cfg.UPLOAD_DIR = TEMP_UPL

# Now safe to import
from backend.database import init_db, get_complaint_by_id, list_complaints
from backend.database import create_complaint_record, update_complaint_record
from backend.database import get_analytics_metrics, get_user_by_email
from backend.auth import hash_password, verify_password, create_access_token, decode_access_token
from backend.classifier_service import classifier_service
from backend.storage import validate_magic_bytes

# ── Test harness ─────────────────────────────────────────────────────────────

PASS = 0
FAIL = 0
RESULTS = []

def test(name: str, fn):
    global PASS, FAIL
    try:
        fn()
        PASS += 1
        RESULTS.append(f"  ✅ PASS  {name}")
    except Exception as exc:
        FAIL += 1
        tb = traceback.format_exc().strip().split("\n")[-1]
        RESULTS.append(f"  ❌ FAIL  {name}\n         → {tb}")

# ── 1. Config ────────────────────────────────────────────────────────────────

def test_config_paths():
    assert cfg.MODEL_PATH.exists(), f"Model not found: {cfg.MODEL_PATH}"
    assert cfg.VECTORIZER_PATH.exists(), f"Vectorizer not found: {cfg.VECTORIZER_PATH}"
    assert len(cfg.DEPARTMENT_MAPPING) == 6
    assert "IT_NETWORK" in cfg.DEPARTMENT_MAPPING

test("config: model & vectorizer paths exist", test_config_paths)

# ── 2. Database init & migration ─────────────────────────────────────────────

def test_db_init():
    # First call should create tables and seed users
    init_db()
    admin = get_user_by_email("admin@campus.edu")
    assert admin is not None, "Admin seed user not created"
    assert admin["role"] == "admin"

test("database: init_db creates tables and seeds admin user", test_db_init)

def test_db_idempotent():
    # Second call must NOT raise or duplicate users
    init_db()
    import sqlite3
    conn = sqlite3.connect(str(TEMP_DB))
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) as n FROM users WHERE email='admin@campus.edu'")
    count = cur.fetchone()["n"]
    conn.close()
    assert count == 1, f"Admin user duplicated (count={count})"

test("database: init_db is idempotent (no duplicate seed users)", test_db_idempotent)

def test_db_all_roles_seeded():
    for email in [
        "admin@campus.edu", "it.staff@campus.edu", "electrical.staff@campus.edu",
        "plumbing.staff@campus.edu", "maintenance.staff@campus.edu",
        "housekeeping.staff@campus.edu", "student@campus.edu"
    ]:
        u = get_user_by_email(email)
        assert u is not None, f"Seed user missing: {email}"

test("database: all 7 seed role accounts present", test_db_all_roles_seeded)

# ── 3. Auth ──────────────────────────────────────────────────────────────────

def test_password_hash_verify():
    pw = "TestPass@999"
    h = hash_password(pw)
    assert h != pw
    assert verify_password(pw, h)
    assert not verify_password("WrongPass", h)

test("auth: bcrypt hash and verify correct", test_password_hash_verify)

def test_jwt_create_decode():
    token = create_access_token({"sub": "42", "role": "student"})
    payload = decode_access_token(token)
    assert payload["sub"] == "42"
    assert payload["role"] == "student"

test("auth: JWT create and decode round-trip", test_jwt_create_decode)

def test_jwt_seed_admin_login():
    admin = get_user_by_email("admin@campus.edu")
    assert verify_password("Admin@123", admin["password_hash"]), "Admin password mismatch"

test("auth: seed admin@campus.edu password verifies correctly", test_jwt_seed_admin_login)

def test_jwt_seed_staff_login():
    staff = get_user_by_email("it.staff@campus.edu")
    assert verify_password("Staff@123", staff["password_hash"]), "Staff password mismatch"

test("auth: seed it.staff@campus.edu password verifies correctly", test_jwt_seed_staff_login)

def test_jwt_seed_student_login():
    student = get_user_by_email("student@campus.edu")
    assert verify_password("Student@123", student["password_hash"]), "Student password mismatch"

test("auth: seed student@campus.edu password verifies correctly", test_jwt_seed_student_login)

# ── 4. ML Classifier Service ─────────────────────────────────────────────────

def test_classifier_loads():
    assert classifier_service.model is not None
    assert classifier_service.vectorizer is not None

test("classifier: model and vectorizer loaded successfully", test_classifier_loads)

CLASSIFIER_CASES = [
    ("Wi-Fi not working in classroom", "IT_NETWORK"),
    ("Water leakage in bathroom", "PLUMBING"),
    ("Classroom fan stopped working", "ELECTRICAL"),
    ("Garbage near canteen entrance", "CLEANLINESS"),
    ("Broken classroom door", "INFRASTRUCTURE"),
    ("Request for duplicate ID card", "OTHER"),
]

def test_classifier_predictions():
    for text, expected_cat in CLASSIFIER_CASES:
        result = classifier_service.classify(text)
        assert result["category"] == expected_cat, (
            f"Text='{text}' → expected '{expected_cat}', got '{result['category']}'"
        )
        assert 0.0 <= result["confidence"] <= 100.0
        assert isinstance(result["review_required"], bool)

test("classifier: 6 category predictions correct", test_classifier_predictions)

def test_classifier_confidence_type():
    result = classifier_service.classify("The corridor lights are off")
    assert isinstance(result["confidence"], float)

test("classifier: confidence is a float", test_classifier_confidence_type)

def test_classifier_empty_raises():
    try:
        classifier_service.classify("   ")
        assert False, "Should have raised ValueError"
    except ValueError:
        pass

test("classifier: empty complaint raises ValueError", test_classifier_empty_raises)

# ── 5. Urgency Engine (Requirement #3 – independent from confidence) ──────────

URGENCY_CASES = [
    ("There is an exposed wire sparking near the entrance", "Urgent"),
    ("There is a fire in the lab", "Urgent"),
    ("No water supply in the hostel today", "High"),
    ("Power cut in the laboratory", "High"),
    ("Request for bus timetable", "Low"),
    ("Fee receipt request", "Low"),
    ("The classroom floor is dirty", "Medium"),
]

def test_urgency_independent():
    for text, expected_urgency in URGENCY_CASES:
        urgency, reason = classifier_service.analyze_urgency(text)
        assert urgency == expected_urgency, (
            f"Text='{text}' → expected urgency '{expected_urgency}', got '{urgency}'"
        )
        assert len(reason) > 0

test("urgency: 7 independent urgency assessments correct", test_urgency_independent)

def test_urgency_separate_from_confidence():
    # High-confidence complaint can still be Urgent
    result = classifier_service.classify("exposed wire sparking in lab")
    assert result["confidence"] > 0  # ML confidence is numeric
    assert result["suggested_urgency"] == "Urgent"  # Urgency is independent
    assert result["review_required"] is not None  # Both fields exist independently

test("urgency: urgency is returned separately from confidence and review_required", test_urgency_separate_from_confidence)

# ── 6. Database CRUD ─────────────────────────────────────────────────────────

SAMPLE_COMPLAINT = {
    "student_name": "Test Student",
    "student_email": "test@campus.edu",
    "complaint": "The Wi-Fi is not working in room 204",
    "category": "IT_NETWORK",
    "department": "IT Department",
    "confidence": 76.5,
    "priority": "Normal",
    "urgency": "Medium",
    "location": "Block A, Room 204",
    "attachment_url": "",
    "admin_notes": "",
    "assigned_to": ""
}

CREATED_ID = None

def test_create_complaint():
    global CREATED_ID
    record = create_complaint_record(SAMPLE_COMPLAINT)
    assert record["id"] is not None
    assert record["ticket_id"].startswith("CMP-")
    assert record["complaint"] == SAMPLE_COMPLAINT["complaint"]
    CREATED_ID = record["id"]

test("database: create_complaint_record inserts and returns ticket_id", test_create_complaint)

def test_get_complaint_by_id():
    assert CREATED_ID is not None, "Skipped: create_complaint failed"
    row = get_complaint_by_id(CREATED_ID)
    assert row is not None
    assert row["student_name"] == "Test Student"
    assert row["category"] == "IT_NETWORK"

test("database: get_complaint_by_id returns correct row", test_get_complaint_by_id)

def test_list_complaints_all():
    rows = list_complaints(limit=100)
    assert len(rows) >= 1

test("database: list_complaints returns at least 1 row", test_list_complaints_all)

def test_list_complaints_filter_dept():
    rows = list_complaints(department="IT Department")
    for r in rows:
        assert r["department"] == "IT Department"

test("database: list_complaints department filter works", test_list_complaints_filter_dept)

def test_update_complaint_status():
    assert CREATED_ID is not None, "Skipped: create_complaint failed"
    updated = update_complaint_record(CREATED_ID, {"status": "In Progress"})
    assert updated["status"] == "In Progress"

test("database: update_complaint_record changes status correctly", test_update_complaint_status)

def test_update_complaint_notes():
    assert CREATED_ID is not None, "Skipped: create_complaint failed"
    updated = update_complaint_record(CREATED_ID, {"admin_notes": "Assigned to IT team"})
    assert updated["admin_notes"] == "Assigned to IT team"
    assert updated["updated_at"] != ""

test("database: update_complaint_record sets admin_notes and updated_at", test_update_complaint_notes)

def test_analytics_metrics():
    metrics = get_analytics_metrics()
    assert metrics["total_complaints"] >= 1
    assert "status_breakdown" in metrics
    assert "category_breakdown" in metrics
    assert "department_breakdown" in metrics
    assert "urgency_breakdown" in metrics
    assert "needs_human_review_count" in metrics
    assert isinstance(metrics["average_confidence"], float)

test("database: get_analytics_metrics returns all required fields", test_analytics_metrics)

def test_track_complaint_endpoint():
    from backend.routes import track_complaint
    from fastapi import HTTPException
    # Track existing complaint by ticket ID
    res = track_complaint(f"CMP-{1000 + CREATED_ID}")
    assert res.id == CREATED_ID
    assert res.ticket_id == f"CMP-{1000 + CREATED_ID}"
    # Non-existent should raise 404
    try:
        track_complaint("CMP-99999")
        assert False, "Should have raised 404"
    except HTTPException as e:
        assert e.status_code == 404

test("routes: track_complaint retrieves ticket and 404s on invalid ID", test_track_complaint_endpoint)

# ── 7. File upload validation ─────────────────────────────────────────────────

def test_magic_bytes_jpeg():
    jpeg_header = b"\xff\xd8\xff\xe0\x00\x10JFIF"
    assert validate_magic_bytes(jpeg_header, ".jpg")
    assert validate_magic_bytes(jpeg_header, ".jpeg")

test("storage: JPEG magic bytes validated correctly", test_magic_bytes_jpeg)

def test_magic_bytes_png():
    png_header = b"\x89PNG\r\n\x1a\nsome_rest"
    assert validate_magic_bytes(png_header, ".png")

test("storage: PNG magic bytes validated correctly", test_magic_bytes_png)

def test_magic_bytes_pdf():
    pdf_header = b"%PDF-1.4 some content"
    assert validate_magic_bytes(pdf_header, ".pdf")

test("storage: PDF magic bytes validated correctly", test_magic_bytes_pdf)

def test_magic_bytes_reject_mismatch():
    # JPEG header but claiming to be PNG
    jpeg_header = b"\xff\xd8\xff\xe0\x00\x10JFIF"
    assert not validate_magic_bytes(jpeg_header, ".png")

test("storage: mismatched extension/content is rejected", test_magic_bytes_reject_mismatch)

def test_magic_bytes_webp():
    webp_header = b"RIFF\x00\x00\x00\x00WEBP"
    assert validate_magic_bytes(webp_header, ".webp")

test("storage: WebP magic bytes validated correctly", test_magic_bytes_webp)

# ── 8. FastAPI App imports cleanly ───────────────────────────────────────────

def test_app_imports():
    # backend.main calls init_db() at module level.
    # The DB is still alive (same TEMP_DIR, cleanup only at EOF).
    # If main was already cached in sys.modules from an earlier import,
    # that is fine — the app object is still valid.
    from backend.main import app
    assert app.title == "CampusHelp AI"
    # FastAPI flattens include_router paths into the OpenAPI schema.
    # This is the authoritative way to enumerate all registered endpoints.
    paths = set(app.openapi()["paths"].keys())
    expected = [
        "/api/health",
        "/api/auth/login",
        "/api/auth/register",
        "/api/complaints",
        "/api/complaints/analyze",
        "/api/analytics",
    ]
    for ep in expected:
        assert ep in paths, f"Route not found: {ep}. Registered: {sorted(paths)}"

test("app: FastAPI app imports and all routes registered", test_app_imports)

# ── Print results ─────────────────────────────────────────────────────────────

print()
print("=" * 60)
print("  CAMPUSHELP AI — PHASE 1 BACKEND TEST RESULTS")
print("=" * 60)
for line in RESULTS:
    print(line)
print()
print(f"  Total: {PASS + FAIL}  |  PASSED: {PASS}  |  FAILED: {FAIL}")
print("=" * 60)

# Cleanup: single temp directory holds DB + uploads
try:
    shutil.rmtree(TEMP_DIR)
except Exception:
    pass

sys.exit(0 if FAIL == 0 else 1)
