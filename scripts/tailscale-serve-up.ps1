param(
    [int]$ProxyPort = 8088
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command tailscale -ErrorAction SilentlyContinue)) {
    Write-Error "Tailscale CLI no encontrado. Instalalo desde https://tailscale.com/download y ejecuta nuevamente."
}

Write-Host "=== Verificando sesion Tailscale ==="
tailscale status

Write-Host "=== Verificando proxy local en 127.0.0.1:$ProxyPort ==="
$probe = Invoke-WebRequest -Uri "http://127.0.0.1:$ProxyPort/" -UseBasicParsing -TimeoutSec 5
if ($probe.StatusCode -ne 200) {
    Write-Error "El proxy local no respondio HTTP 200 en 127.0.0.1:$ProxyPort."
}

Write-Host "=== Activando Tailscale Serve (solo HTTPS privado dentro de la tailnet) ==="
tailscale serve --bg "http://127.0.0.1:$ProxyPort"

Write-Host "=== Estado actual de Serve ==="
tailscale serve status
