"""
CampusHelp AI – FastAPI Application Entry Point
Phase 1: Backend Foundation
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.database import init_db
from backend.routes import router

# Initialize and migrate database on startup
init_db()

app = FastAPI(
    title="CampusHelp AI",
    description=(
        "AI-powered campus complaint management system.\n\n"
        "Roles: student | staff | admin\n\n"
        "Seed credentials (Phase 1 defaults):\n"
        "- Admin:   admin@campus.edu / Admin@123\n"
        "- IT Staff: it.staff@campus.edu / Staff@123\n"
        "- Student:  student@campus.edu / Student@123"
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS – allow React dev server (Phase 2 frontend) and Streamlit
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:8501"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all API routes under /api prefix
app.include_router(router, prefix="/api")

@app.get("/", include_in_schema=False)
def root():
    return {
        "message": "CampusHelp AI Backend is running.",
        "docs": "/docs",
        "health": "/api/health"
    }
