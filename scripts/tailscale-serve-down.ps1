$ErrorActionPreference = "Stop"

if (-not (Get-Command tailscale -ErrorAction SilentlyContinue)) {
    Write-Error "Tailscale CLI no encontrado."
}

Write-Host "=== Desactivando Tailscale Serve (los datos y contenedores no se borran) ==="
tailscale serve off
tailscale serve status
