$ErrorActionPreference = "Stop"
$ScriptDir = $PSScriptRoot
$ProjectRoot = Split-Path $ScriptDir -Parent

# Reload Environment PATH from Registry to catch new installations (like Rust and FFmpeg)
$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
$SystemPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
foreach ($path in ($UserPath + ";" + $SystemPath -split ";")) {
    if ($path -and -not ($env:PATH -split ";" -contains $path) -and (Test-Path $path)) {
        $env:PATH = "$path;$env:PATH"
    }
}

# 1. Locate Cargo (Rust)
$CargoExe = "cargo"
try {
    cargo --version | Out-Null
} catch {
    $UserCargo = Join-Path $env:USERPROFILE ".cargo\bin\cargo.exe"
    if (Test-Path $UserCargo) {
        $CargoExe = $UserCargo
        $env:PATH = "$(Join-Path $env:USERPROFILE '.cargo\bin');$env:PATH"
    } else {
        Write-Host "Cargo not found in PATH or user profile. Please install Rust." -ForegroundColor Red
        Exit 1
    }
}


# 2. Locate Node & Npm
$NpmCmd = "npm.cmd"
$GlobalNpm = "C:\Program Files\nodejs\npm.cmd"
if (Test-Path $GlobalNpm) {
    $NpmCmd = $GlobalNpm
    $env:PATH = "C:\Program Files\nodejs\;$env:PATH"
    Write-Host "Using global Node.js installation: $GlobalNpm" -ForegroundColor Gray
} else {
    $NodeDir = Join-Path $ProjectRoot ".tools\node_tar\node-v20.11.0-win-x64"
    $NpmCmd = Join-Path $NodeDir "npm.cmd"
    if (Test-Path $NpmCmd) {
        $env:PATH = "$NodeDir;$env:PATH"
        Write-Host "Using portable Node.js installation." -ForegroundColor Gray
    } else {
        Write-Host "Node.js/npm not found. Please install Node.js." -ForegroundColor Red
        Exit 1
    }
}


# 3. Setup Environment
try {

    $PythonScriptsDir = python -c "import sysconfig; print(sysconfig.get_path('scripts', 'nt_user'))"
    if (Test-Path $PythonScriptsDir) {
        $env:PATH = "$PythonScriptsDir;$env:PATH"
        Write-Host "Added Python user scripts to PATH: $PythonScriptsDir" -ForegroundColor Gray
    }
} catch {
    # Fail silently if python is not available or errors out
}
Write-Host "Environment configured." -ForegroundColor Gray


# 4. Start Backend (in new window)
Write-Host "Starting Backend (Rust)..." -ForegroundColor Green
$BackendDir = Join-Path $ProjectRoot "backend-rust"
Start-Process -FilePath "cmd.exe" -ArgumentList "/k set `"PATH=$env:PATH`" && `"$CargoExe`" run" -WorkingDirectory $BackendDir


# 5. Start Frontend (in new window)
Write-Host "Starting Frontend (Vite)..." -ForegroundColor Green
$FrontendDir = Join-Path $ProjectRoot "frontend-vite"

# Check if node_modules exists, otherwise install
if (-not (Test-Path (Join-Path $FrontendDir "node_modules"))) {
    Write-Host "Installing Frontend Dependencies (this may take a minute)..." -ForegroundColor Yellow
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c set `"PATH=$env:PATH`" && `"$NpmCmd`" install" -WorkingDirectory $FrontendDir -Wait -NoNewWindow
}

Start-Process -FilePath "cmd.exe" -ArgumentList "/k set `"PATH=$env:PATH`" && `"$NpmCmd`" run dev" -WorkingDirectory $FrontendDir

Write-Host "App launched! Check the new windows." -ForegroundColor Cyan

