$ErrorActionPreference = "SilentlyContinue"
$ScriptDir = $PSScriptRoot

Write-Host "Stopping existing services..." -ForegroundColor Yellow

# Kill ports 8080 (Backend) and 5173 (Frontend)
$ports = @(8080, 5173)

foreach ($port in $ports) {
    $t = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($t) { 
        $procId = $t.OwningProcess
        Write-Host "  Killing process $procId on port $port..." -ForegroundColor Gray
        Stop-Process -Id $procId -Force 
    }
}

Start-Sleep -Seconds 2

Write-Host "Restarting..." -ForegroundColor Cyan
& "$ScriptDir\start.ps1"
