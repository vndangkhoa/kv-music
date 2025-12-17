@echo off
echo ==========================================
echo      Spotify Clone Deployment Script
echo ==========================================

echo [1/3] Checking Docker status...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is NOT running!
    echo.
    echo Please start Docker Desktop from your Start Menu.
    echo Once Docker is running ^(green icon^), run this script again.
    echo.
    pause
    exit /b 1
)

echo [2/3] Docker is active. Building Image...
echo This may take a few minutes...
docker build -t vndangkhoa/spotify-clone:latest .
if %errorlevel% neq 0 (
    echo [ERROR] Docker build failed.
    pause
    exit /b 1
)

echo [3/3] Pushing to Docker Hub...
docker push vndangkhoa/spotify-clone:latest
if %errorlevel% neq 0 (
    echo [ERROR] Docker push failed.
    echo You may need to run 'docker login' first.
    pause
    exit /b 1
)

echo.
echo ==========================================
echo [SUCCESS] Deployment Complete!
echo Image: vndangkhoa/spotify-clone:latest
echo ==========================================
pause
