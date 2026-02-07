
@echo off
echo Stopping existing processes...
taskkill /F /IM server.exe >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1

echo Starting Backend...
cd backend-go
start /B server.exe
cd ..

echo Starting Frontend...
cd frontend-vite
start npm run dev
cd ..

echo App Restarted! Backend on :8080, Frontend on :5173
