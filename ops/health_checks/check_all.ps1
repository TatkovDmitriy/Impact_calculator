# check_all.ps1 — оркестратор health checks
# Запускать перед каждой DA-сессией на рабочем ПК.
# Exit 0 = all OK, Exit 1 = есть critical, Exit 2 = есть warning

param(
    [string]$PythonExe = "research\.venv\Scripts\python.exe"
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent (Split-Path -Parent $scriptDir)

# Если python в venv недоступен — использовать системный
if (-not (Test-Path (Join-Path $repoRoot $PythonExe))) {
    $PythonExe = "python"
}

$vpnExit = 0
$gpExit = 0
$fbExit = 0

Write-Host ""
Write-Host "Impact Calculator — Infrastructure Health Check"
Write-Host ("-" * 52)

# VPN
Push-Location $repoRoot
& powershell -File "ops\health_checks\check_vpn.ps1"
$vpnExit = $LASTEXITCODE
Pop-Location

# Greenplum
Push-Location $repoRoot
& $PythonExe "ops\health_checks\check_gp.py"
$gpExit = $LASTEXITCODE
Pop-Location

# Firebase
Push-Location $repoRoot
& $PythonExe "ops\health_checks\check_firebase.py"
$fbExit = $LASTEXITCODE
Pop-Location

# Summary
Write-Host ("-" * 52)

$overallExit = 0

if ($vpnExit -eq 1 -or $gpExit -eq 1 -or $fbExit -eq 1) {
    $overallExit = 1
    Write-Host "[CRITICAL] Issues found. Fix before starting DA session." -ForegroundColor Red
} elseif ($vpnExit -eq 2 -or $gpExit -eq 2 -or $fbExit -eq 2) {
    $overallExit = 2
    Write-Host "[WARNING]  Warnings present. Proceed with caution." -ForegroundColor Yellow
} else {
    Write-Host "[OK]  All systems operational. Safe to start DA session." -ForegroundColor Green
}

Write-Host ""
exit $overallExit
