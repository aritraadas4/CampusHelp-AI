@echo off
echo ===================================================
echo   CampusHelp AI - Intelligent Campus Helpdesk
echo ===================================================
echo Starting FastAPI Backend on http://localhost:8000 ...
start "CampusHelp AI - Backend (FastAPI)" cmd /k ".\venv\Scripts\python.exe -m uvicorn backend.main:app --reload --port 8000"

echo Starting React + Vite Frontend on http://localhost:5173 ...
start "CampusHelp AI - Frontend (React/Vite)" cmd /k "cd frontend && npm run dev"

echo.
echo Both servers launched in separate terminal windows:
echo - Frontend Web UI:  http://localhost:5173
echo - Backend API Docs: http://localhost:8000/docs
echo ===================================================
timeout /t 2 /nobreak >nul
start http://localhost:5173
