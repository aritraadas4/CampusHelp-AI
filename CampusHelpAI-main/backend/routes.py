"""
CampusHelp AI – FastAPI Route Handlers
Phase 1: Backend Foundation

Routes:
  POST   /api/auth/register        - Student self-registration
  POST   /api/auth/login           - Login for all roles
  GET    /api/auth/me              - Current user profile

  POST   /api/complaints/analyze   - ML prediction only (no DB write)
  POST   /api/complaints           - Submit + save complaint
  GET    /api/complaints           - List complaints (filtered)
  GET    /api/complaints/{id}      - Single complaint by ID or ticket_id
  PATCH  /api/complaints/{id}      - Update status/urgency/notes (staff/admin)

  POST   /api/uploads              - Upload evidence file
  GET    /api/uploads/{filename}   - Serve uploaded file

  GET    /api/analytics            - Summary metrics (staff/admin)
  GET    /api/health               - Health check
"""

from pathlib import Path
from typing import Optional
from datetime import timedelta

from fastapi import (
    APIRouter, Depends, HTTPException, Query,
    UploadFile, File, status
)
from fastapi.responses import FileResponse

from backend.config import (
    UPLOAD_DIR, ACCESS_TOKEN_EXPIRE_MINUTES,
    COMPLAINT_STATUSES, URGENCY_LEVELS, DEPARTMENTS
)
from backend.database import (
    init_db,
    get_complaint_by_id, get_complaint_by_ticket_id,
    list_complaints, create_complaint_record, update_complaint_record,
    get_analytics_metrics,
    get_user_by_email, create_user_record
)
from backend.auth import (
    hash_password, verify_password, create_access_token,
    get_current_user, get_optional_current_user,
    require_admin, require_staff_or_admin, require_student_or_higher
)
from backend.classifier_service import classifier_service
from backend.storage import save_upload_file
from backend.models import (
    UserRegisterRequest, UserLoginRequest, UserResponse, TokenResponse,
    AnalyzeComplaintRequest, AnalyzeComplaintResponse,
    ComplaintCreateRequest, ComplaintUpdateRequest, ComplaintResponse,
    AnalyticsSummaryResponse
)

router = APIRouter()


# ---------------------------------------------------------------------------
# Health Check
# ---------------------------------------------------------------------------

@router.get("/health", tags=["System"])
def health_check():
    return {
        "status": "ok",
        "service": "CampusHelp AI Backend",
        "version": "1.0.0"
    }


# ---------------------------------------------------------------------------
# Auth Routes
# ---------------------------------------------------------------------------

@router.post("/auth/register", response_model=TokenResponse, tags=["Auth"])
def register_student(payload: UserRegisterRequest):
    """
    Self-registration for students only.
    Staff and admin accounts are created by the system administrator.
    """
    existing = get_user_by_email(payload.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists."
        )

    pw_hash = hash_password(payload.password)
    new_user = create_user_record(
        email=payload.email,
        password_hash=pw_hash,
        full_name=payload.full_name,
        role="student"
    )

    token = create_access_token(
        data={"sub": str(new_user["id"]), "role": "student"},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    return TokenResponse(
        access_token=token,
        user=UserResponse(**new_user)
    )


@router.post("/auth/login", response_model=TokenResponse, tags=["Auth"])
def login(payload: UserLoginRequest):
    """Login for students, staff, and admin."""
    user = get_user_by_email(payload.email)
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    token = create_access_token(
        data={"sub": str(user["id"]), "role": user["role"]},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            full_name=user["full_name"],
            role=user["role"],
            department=user.get("department"),
            created_at=user["created_at"]
        )
    )


@router.get("/auth/me", response_model=UserResponse, tags=["Auth"])
def me(current_user: dict = Depends(get_current_user)):
    """Returns the authenticated user's profile."""
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        full_name=current_user["full_name"],
        role=current_user["role"],
        department=current_user.get("department"),
        created_at=current_user["created_at"]
    )


# ---------------------------------------------------------------------------
# ML Prediction Route (no DB write, available without login)
# ---------------------------------------------------------------------------

@router.post("/complaints/analyze", response_model=AnalyzeComplaintResponse, tags=["ML"])
def analyze_complaint(payload: AnalyzeComplaintRequest):
    """
    Runs ML classification on a complaint text.
    Returns category, department, confidence, review_required, and
    an independently-assessed urgency level (Requirement #3).
    Does NOT save anything to the database.
    """
    try:
        result = classifier_service.classify(payload.complaint)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    return AnalyzeComplaintResponse(**result)


# ---------------------------------------------------------------------------
# Complaint Submission & Management
# ---------------------------------------------------------------------------

def _build_complaint_response(row: dict) -> ComplaintResponse:
    """Helper: maps a DB dict to ComplaintResponse, adding computed review_required."""
    row["review_required"] = float(row.get("confidence", 100)) < 40.0
    # Fill defaults for new columns on legacy rows
    for field in ("ticket_id", "student_email", "location", "urgency",
                  "attachment_url", "admin_notes", "assigned_to", "updated_at"):
        if row.get(field) is None:
            row[field] = ""
    if not row.get("urgency"):
        row["urgency"] = "Medium"
    return ComplaintResponse(**row)


@router.post("/complaints", response_model=ComplaintResponse, tags=["Complaints"],
             status_code=status.HTTP_201_CREATED)
def submit_complaint(
    payload: ComplaintCreateRequest,
    current_user: Optional[dict] = Depends(get_optional_current_user)
):
    """
    Submit a complaint. Runs ML classification automatically.
    - Students must be logged in; their email is captured from the token.
    - Unauthenticated submissions are allowed for now (anonymous).
    - Urgency is independently assessed from the complaint text (Req #3).
    - If the caller supplies a category override, it is recorded but confidence
      is set to 0 and review_required becomes True (manual override).
    """
    try:
        ml_result = classifier_service.classify(payload.complaint)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    # Allow caller to override category (e.g. student corrections)
    final_category = payload.category if payload.category else ml_result["category"]
    if payload.category and payload.category != ml_result["category"]:
        # Manual override → flag for review
        ml_result["confidence"] = 0.0
        ml_result["review_required"] = True

    final_urgency = payload.urgency if payload.urgency else ml_result["suggested_urgency"]

    student_name = payload.student_name or "Anonymous"
    student_email = ""
    if current_user:
        student_email = current_user.get("email", "")
        if student_name == "Anonymous" or not student_name:
            student_name = current_user.get("full_name", "Anonymous")

    priority_label = "Normal"
    if ml_result["review_required"]:
        priority_label = "HUMAN REVIEW REQUIRED"
    if final_urgency in ("Urgent", "High"):
        priority_label = f"URGENT - {priority_label}" if "REVIEW" in priority_label else "URGENT"

    record_data = {
        "student_name": student_name,
        "student_email": student_email,
        "complaint": ml_result["complaint"],
        "category": final_category,
        "department": ml_result["department"],
        "confidence": ml_result["confidence"],
        "priority": priority_label,
        "status": "Pending",
        "location": payload.location or "Main Campus",
        "urgency": final_urgency,
        "attachment_url": payload.attachment_url or "",
        "admin_notes": "",
        "assigned_to": ""
    }

    saved = create_complaint_record(record_data)
    return _build_complaint_response(saved)


@router.get("/complaints", tags=["Complaints"])
def list_all_complaints(
    department: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    urgency: Optional[str] = Query(None),
    review_required: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(require_student_or_higher)
):
    """
    List complaints with optional filters.
    - Students see only their own complaints (by email).
    - Staff see only their department's complaints.
    - Admins see all.
    """
    student_email_filter = None
    dept_filter = department

    if current_user["role"] == "student":
        student_email_filter = current_user.get("email", "")
        dept_filter = None  # Students can't filter by department

    elif current_user["role"] == "staff":
        # Staff are locked to their department
        staff_dept = current_user.get("department")
        if staff_dept:
            dept_filter = staff_dept

    rows = list_complaints(
        department=dept_filter,
        status=status_filter,
        urgency=urgency,
        review_required=review_required,
        student_email=student_email_filter,
        search=search,
        limit=limit,
        offset=offset
    )

    return [_build_complaint_response(row) for row in rows]


@router.get("/complaints/track/{ticket_id}", response_model=ComplaintResponse, tags=["Complaints"])
def track_complaint(ticket_id: str):
    """
    Public ticket tracking endpoint:
    Allows any student or guest to track a complaint by ticket ID (e.g. CMP-1001) or ID.
    Does not require login.
    """
    clean_id = ticket_id.strip()
    if clean_id.upper().startswith("CMP-"):
        row = get_complaint_by_ticket_id(clean_id.upper())
    else:
        try:
            row = get_complaint_by_id(int(clean_id))
        except ValueError:
            row = get_complaint_by_ticket_id(clean_id)

    if not row:
        raise HTTPException(status_code=404, detail=f"Ticket '{ticket_id}' not found.")

    return _build_complaint_response(row)


@router.get("/complaints/{complaint_id}", response_model=ComplaintResponse, tags=["Complaints"])
def get_complaint(
    complaint_id: str,
    current_user: dict = Depends(require_student_or_higher)
):
    """
    Retrieve a single complaint by numeric ID or ticket_id (e.g. CMP-1001).
    Students can only view their own complaints.
    """
    if complaint_id.upper().startswith("CMP-"):
        row = get_complaint_by_ticket_id(complaint_id.upper())
    else:
        try:
            row = get_complaint_by_id(int(complaint_id))
        except ValueError:
            row = get_complaint_by_ticket_id(complaint_id)

    if not row:
        raise HTTPException(status_code=404, detail=f"Complaint '{complaint_id}' not found.")

    # Students can only see their own records
    if current_user["role"] == "student":
        if row.get("student_email") != current_user.get("email"):
            raise HTTPException(status_code=403, detail="Access denied.")

    return _build_complaint_response(row)


@router.patch("/complaints/{complaint_id}", response_model=ComplaintResponse, tags=["Complaints"])
def update_complaint(
    complaint_id: int,
    payload: ComplaintUpdateRequest,
    current_user: dict = Depends(require_staff_or_admin)
):
    """
    Update complaint status, urgency, department, notes, or assigned_to.
    Restricted to staff (own department) and admin (all).
    Validates status and urgency values before writing.
    """
    row = get_complaint_by_id(complaint_id)
    if not row:
        raise HTTPException(status_code=404, detail=f"Complaint ID {complaint_id} not found.")

    # Staff can only update their own department's complaints
    if current_user["role"] == "staff":
        staff_dept = current_user.get("department", "")
        if row.get("department") != staff_dept:
            raise HTTPException(
                status_code=403,
                detail=f"Your department ({staff_dept}) does not own this complaint."
            )

    updates = payload.model_dump(exclude_none=True)

    if "status" in updates and updates["status"] not in COMPLAINT_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{updates['status']}'. Allowed: {COMPLAINT_STATUSES}"
        )
    if "urgency" in updates and updates["urgency"] not in URGENCY_LEVELS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid urgency '{updates['urgency']}'. Allowed: {URGENCY_LEVELS}"
        )
    if "department" in updates and updates["department"] not in DEPARTMENTS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid department '{updates['department']}'. Allowed: {DEPARTMENTS}"
        )

    updated = update_complaint_record(complaint_id, updates)
    if not updated:
        raise HTTPException(status_code=500, detail="Failed to update complaint.")

    return _build_complaint_response(updated)


# ---------------------------------------------------------------------------
# File Upload Routes
# ---------------------------------------------------------------------------

@router.post("/uploads", tags=["Files"])
async def upload_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_student_or_higher)
):
    """
    Upload evidence file (image or PDF). Max 5 MB.
    Validates extension AND magic bytes.
    Returns the file URL to attach to a complaint submission.
    """
    result = await save_upload_file(file)
    return result


@router.get("/uploads/{filename}", tags=["Files"])
def serve_file(
    filename: str,
    current_user: dict = Depends(require_student_or_higher)
):
    """Serve an uploaded evidence file (authenticated only)."""
    # Prevent path traversal
    safe_name = Path(filename).name
    file_path = UPLOAD_DIR / safe_name
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found.")
    return FileResponse(str(file_path))


# ---------------------------------------------------------------------------
# Analytics Routes
# ---------------------------------------------------------------------------

@router.get("/analytics", response_model=AnalyticsSummaryResponse, tags=["Analytics"])
def get_analytics(current_user: dict = Depends(require_staff_or_admin)):
    """
    Returns complaint analytics summary.
    Staff see all metrics; intended for department and admin dashboards.
    """
    return get_analytics_metrics()
