Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  CampusHelp AI - Intelligent Campus Helpdesk" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

Write-Host "Starting FastAPI Backend on http://localhost:8000 ..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", ".\venv\Scripts\python.exe -m uvicorn backend.main:app --reload --port 8000"

Write-Host "Starting React + Vite Frontend on http://localhost:5173 ..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location frontend; npm run dev"

Write-Host ""
Write-Host "Both servers launched in dedicated windows:" -ForegroundColor Yellow
Write-Host "- Frontend Web Portal: http://localhost:5173" -ForegroundColor White
Write-Host "- Backend OpenAPI Docs: http://localhost:8000/docs" -ForegroundColor White
Write-Host "===================================================" -ForegroundColor Cyan

Start-Sleep -Seconds 2
Start-Process "http://localhost:5173"
