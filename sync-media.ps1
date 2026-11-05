# ==============================================================================
# Cinegem Studio — Cloudflare R2 Media Sync Launcher (PowerShell)
# ==============================================================================
$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

Write-Host "Starting Cloudflare R2 Media Sync Pipeline..." -ForegroundColor Cyan
node scripts/sync-media.mjs $args
