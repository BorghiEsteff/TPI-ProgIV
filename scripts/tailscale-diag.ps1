param(
    [int]$ProxyPort = 8088
)

Write-Host "=== 1. Tailscale ==="
if (Get-Command tailscale -ErrorAction SilentlyContinue) {
    tailscale status
    tailscale ip -4
    tailscale serve status
} else {
    Write-Host "TAILSCALE_NOT_INSTALLED"
}

Write-Host "=== 2. Docker Compose (si aplica) ==="
docker compose ps 2>&1

Write-Host "=== 3. Endpoints a traves del proxy unico (127.0.0.1:$ProxyPort) ==="
foreach ($path in @("/", "/django/api/v1/genres/", "/node/health")) {
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:$ProxyPort$path" -UseBasicParsing -TimeoutSec 5
        Write-Host "$path -> $($r.StatusCode)"
    } catch {
        Write-Host "$path -> ERROR: $($_.Exception.Message)"
    }
}
