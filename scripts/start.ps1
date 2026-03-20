$ErrorActionPreference = "Stop"
$ScriptDir = $PSScriptRoot
$ProjectRoot = Split-Path $ScriptDir -Parent

# 1. Locate Cargo (Rust)
$CargoExe = "cargo"
try {
    cargo --version | Out-Null
} catch {
    Write-Host "Cargo not found in PATH. Please install Rust." -ForegroundColor Red
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
Write-Host "Starting Backend (Rust)..." -ForegroundColor Green
$BackendDir = Join-Path $ProjectRoot "backend-rust"
Start-Process -FilePath "cmd.exe" -ArgumentList "/k cargo run" -WorkingDirectory $BackendDir

# 5. Start Frontend (in new window)
Write-Host "Starting Frontend (Vite)..." -ForegroundColor Green
$FrontendDir = Join-Path $ProjectRoot "frontend-vite"

# Check if node_modules exists, otherwise install
if (-not (Test-Path (Join-Path $FrontendDir "node_modules"))) {
    Write-Host "Installing Frontend Dependencies (this may take a minute)..." -ForegroundColor Yellow
    Start-Process -FilePath $NpmCmd -ArgumentList "install" -WorkingDirectory $FrontendDir -Wait -NoNewWindow
}

Start-Process -FilePath "cmd.exe" -ArgumentList "/k `"$NpmCmd`" run dev" -WorkingDirectory $FrontendDir

Write-Host "App launched! Check the new windows." -ForegroundColor Cyan
