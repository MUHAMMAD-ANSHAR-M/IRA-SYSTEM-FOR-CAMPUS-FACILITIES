@echo off
echo ======================================================================
echo IRA - Smart Campus Resource Management System
echo Launching AI Microservice (Port 8000), Core API (Port 5000), and React (Port 3000)...
echo ======================================================================

start "IRA-AI-Microservice" cmd /k "cd ai-service && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
timeout /t 2 /nobreak >nul

start "IRA-Node-Backend" cmd /k "cd backend && node server.js"
timeout /t 2 /nobreak >nul

start "IRA-React-Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo All services launched!
echo - Frontend Dashboard: http://localhost:3000
echo - Backend API:        http://localhost:5000
echo - AI Microservice:    http://127.0.0.1:8000/docs
echo ======================================================================
