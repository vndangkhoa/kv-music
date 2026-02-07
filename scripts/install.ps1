$ErrorActionPreference = "Stop"
$ScriptDir = $PSScriptRoot
$ProjectRoot = Split-Path $ScriptDir -Parent

Write-Host "=== Setting up Environment ===" -ForegroundColor Cyan
# 1. Locate Go
$GoExe = "C:\Program Files\Go\bin\go.exe"
if (-not (Test-Path $GoExe)) {
    Write-Host "Go not found at $GoExe" -ForegroundColor Red
    Exit 1
}

# 2. Locate Portable Node
$NodeDir = Join-Path $ProjectRoot ".tools\node_tar\node-v20.11.0-win-x64"
$NpmCmd = Join-Path $NodeDir "npm.cmd"
if (-not (Test-Path $NpmCmd)) {
    Write-Host "Portable Node not found at $NodeDir" -ForegroundColor Red
    Exit 1
}

# 3. Setup Environment
$env:PATH = "$NodeDir;$env:PATH"
Write-Host "Environment configured." -ForegroundColor Gray

# 4. Install Backend Dependencies
Write-Host "`n=== Installing Backend Dependencies (Go) ===" -ForegroundColor Yellow
$BackendDir = Join-Path $ProjectRoot "backend-go"
Push-Location $BackendDir
& $GoExe mod tidy
if ($LASTEXITCODE -eq 0) { Write-Host "Backend dependencies installed." -ForegroundColor Green }
else { Write-Host "Backend install failed." -ForegroundColor Red }
Pop-Location

# 5. Install Frontend Dependencies
Write-Host "`n=== Installing Frontend Dependencies (npm) ===" -ForegroundColor Yellow
$FrontendDir = Join-Path $ProjectRoot "frontend-vite"
Push-Location $FrontendDir

# Clean Corrupted Install
if (Test-Path "node_modules") {
    Write-Host "Cleaning existing node_modules (this might take a moment)..." -ForegroundColor Gray
    cmd.exe /c "rmdir /s /q node_modules"
}
if (Test-Path "package-lock.json") {
    Remove-Item -Path "package-lock.json" -Force -ErrorAction SilentlyContinue
}

# Using cmd /c ensuring we wait for the batch file to complete
Write-Host "Running npm install (fresh)..." -ForegroundColor Cyan
cmd /c "$NpmCmd" install
if ($LASTEXITCODE -eq 0) { Write-Host "Frontend dependencies installed." -ForegroundColor Green }
else { Write-Host "Frontend install failed." -ForegroundColor Red }
Pop-Location

Write-Host "`n=== Setup Complete ===" -ForegroundColor Cyan
Write-Host "You can now run 'restart.ps1' or 'start.ps1'"
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
