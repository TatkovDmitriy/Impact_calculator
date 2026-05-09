# check_vpn.ps1 — проверка VPN-соединения
# Метод: ping GP_HOST (только через VPN доступен корп-сеть)
# Exit 0 = connected, Exit 1 = disconnected / недостижим

param(
    [string]$EnvFile = "research\.env"
)

# Загрузить GP_HOST из .env файла
$gpHost = $null
if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        if ($_ -match '^\s*GP_HOST\s*=\s*(.+)\s*$') {
            $gpHost = $Matches[1].Trim('"').Trim("'")
        }
    }
}

if (-not $gpHost) {
    Write-Host "[VPN] ⚠️  WARNING: GP_HOST not set in $EnvFile — cannot verify VPN"
    exit 2
}

# Попытка TCP-соединения на порт 5432 (Greenplum)
$gpPort = 5432
if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        if ($_ -match '^\s*GP_PORT\s*=\s*(\d+)\s*$') {
            $gpPort = [int]$Matches[1]
        }
    }
}

try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $async = $tcp.BeginConnect($gpHost, $gpPort, $null, $null)
    $wait = $async.AsyncWaitHandle.WaitOne(3000, $false)   # 3 сек таймаут
    if ($wait -and $tcp.Connected) {
        $tcp.Close()
        Write-Host "[VPN]      ✅  CONNECTED  ($gpHost`:$gpPort reachable)"
        exit 0
    } else {
        $tcp.Close()
        Write-Host "[VPN]      ❌  DISCONNECTED  ($gpHost`:$gpPort unreachable — VPN off?)"
        exit 1
    }
} catch {
    Write-Host "[VPN]      ❌  ERROR  $_"
    exit 1
}
