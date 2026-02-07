$ErrorActionPreference = "Stop"
$ScriptDir = $PSScriptRoot
$ProjectRoot = Split-Path $ScriptDir -Parent

# 1. Locate Go
$GoExe = "C:\Program Files\Go\bin\go.exe"
if (-not (Test-Path $GoExe)) {
    Write-Host "Go binaries not found at expected location: $GoExe" -ForegroundColor Red
    Exit 1
}

# 2. Locate Portable Node
$NodeDir = Join-Path $ProjectRoot ".tools\node_tar\node-v20.11.0-win-x64"
$NpmCmd = Join-Path $NodeDir "npm.cmd"

if (-not (Test-Path $NpmCmd)) {
    Write-Host "Portable Node not found at: $NodeDir" -ForegroundColor Red
    Write-Host "Please run the installation steps first."
    Exit 1
}

# 3. Setup Environment
$env:PATH = "$NodeDir;$env:PATH"
Write-Host "Environment configured." -ForegroundColor Gray

# 4. Start Backend (in new window)
Write-Host "Starting Backend..." -ForegroundColor Green
$BackendDir = Join-Path $ProjectRoot "backend-go"
Start-Process -FilePath "cmd.exe" -ArgumentList "/k `"$GoExe`" run cmd\server\main.go" -WorkingDirectory $BackendDir

# 5. Start Frontend (in new window)
Write-Host "Starting Frontend..." -ForegroundColor Green
$FrontendDir = Join-Path $ProjectRoot "frontend-vite"

# Check if node_modules exists, otherwise install
if (-not (Test-Path (Join-Path $FrontendDir "node_modules"))) {
    Write-Host "Installing Frontend Dependencies (this may take a minute)..." -ForegroundColor Yellow
    Start-Process -FilePath $NpmCmd -ArgumentList "install" -WorkingDirectory $FrontendDir -Wait -NoNewWindow
}

Start-Process -FilePath "cmd.exe" -ArgumentList "/k `"$NpmCmd`" run dev" -WorkingDirectory $FrontendDir

Write-Host "App launched! Check the new windows." -ForegroundColor Cyan
