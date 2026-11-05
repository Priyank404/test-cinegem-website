@echo off
REM ==============================================================================
REM Cinegem Studio — Cloudflare R2 Media Sync Launcher
REM ==============================================================================
cd /d "%~dp0"
echo Starting Cloudflare R2 Media Sync Pipeline...
echo.
node scripts/sync-media.mjs %*
echo.
pause
