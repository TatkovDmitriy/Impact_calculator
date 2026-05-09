# check_vpn.ps1 - VPN check via TCP to GP_HOST:GP_PORT
# Exit 0 = connected, Exit 1 = disconnected, Exit 2 = warning

param([string]$EnvFile = "research\.env")

$gpHost = $null
if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        if ($_ -match '^\s*GP_HOST\s*=\s*(.+)\s*$') {
            $gpHost = $Matches[1].Trim('"').Trim("'")
        }
    }
}

if (-not $gpHost) {
    Write-Host "[VPN]      WARN  GP_HOST not set in $EnvFile"
    exit 2
}

$gpPort = 5432
if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        if ($_ -match '^\s*GP_PORT\s*=\s*(\d+)\s*$') { $gpPort = [int]$Matches[1] }
    }
}

try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $async = $tcp.BeginConnect($gpHost, $gpPort, $null, $null)
    $wait = $async.AsyncWaitHandle.WaitOne(3000, $false)
    if ($wait -and $tcp.Connected) {
        $tcp.Close()
        Write-Host "[VPN]      OK    CONNECTED  ($gpHost`:$gpPort reachable)"
        exit 0
    } else {
        $tcp.Close()
        Write-Host "[VPN]      FAIL  DISCONNECTED  ($gpHost`:$gpPort unreachable)"
        exit 1
    }
} catch {
    Write-Host "[VPN]      FAIL  ERROR  $_"
    exit 1
}
