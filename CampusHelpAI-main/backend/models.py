from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

# Authentication Models
class UserRegisterRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=100)
    password: str = Field(..., min_length=6, max_length=100)
    full_name: str = Field(..., min_length=2, max_length=100)

class UserLoginRequest(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    department: Optional[str] = None
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Prediction / ML Models
class AnalyzeComplaintRequest(BaseModel):
    complaint: str = Field(..., min_length=3, description="Complaint text description")

class AnalyzeComplaintResponse(BaseModel):
    complaint: str
    category: str
    department: str
    confidence: float
    review_required: bool
    suggested_urgency: str
    urgency_reason: str

# Complaint Management Models
class ComplaintCreateRequest(BaseModel):
    complaint: str = Field(..., min_length=3)
    student_name: Optional[str] = "Anonymous"
    student_email: Optional[str] = ""
    location: Optional[str] = "Main Campus"
    category: Optional[str] = None
    urgency: Optional[str] = None
    attachment_url: Optional[str] = ""

class ComplaintUpdateRequest(BaseModel):
    status: Optional[str] = None
    department: Optional[str] = None
    category: Optional[str] = None
    urgency: Optional[str] = None
    priority: Optional[str] = None
    admin_notes: Optional[str] = None
    assigned_to: Optional[str] = None
    location: Optional[str] = None

class ComplaintResponse(BaseModel):
    id: int
    ticket_id: str
    student_name: str
    student_email: Optional[str] = ""
    complaint: str
    category: str
    department: str
    confidence: float
    priority: str
    urgency: str
    status: str
    location: Optional[str] = ""
    attachment_url: Optional[str] = ""
    admin_notes: Optional[str] = ""
    assigned_to: Optional[str] = ""
    date: str
    updated_at: Optional[str] = ""
    review_required: bool = False

# Analytics Models
class AnalyticsSummaryResponse(BaseModel):
    total_complaints: int
    status_breakdown: Dict[str, int]
    category_breakdown: Dict[str, int]
    department_breakdown: Dict[str, int]
    urgency_breakdown: Dict[str, int]
    needs_human_review_count: int
    average_confidence: float

class DepartmentSummaryResponse(BaseModel):
    department: str
    total_tickets: int
    pending_tickets: int
    resolved_tickets: int
