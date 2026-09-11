# One-shot launcher: build (if needed) + serve app & desktop-audio stream + open a public HTTPS tunnel.
#
#   powershell -ExecutionPolicy Bypass -File tools\start-car-audio.ps1
#
# Prints the public URL to open on your phone / car. Ctrl+C stops everything.

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

$ffmpeg = "C:\Users\hypnodroid\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.2-full_build\bin\ffmpeg.exe"
$cloudflared = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
$port = 8080

if (-not (Test-Path "$root\dist\index.html")) {
    Write-Host "Building app (dist/ missing)..." -ForegroundColor Cyan
    npm run build | Out-Null
}

Write-Host "Starting audio+app server on :$port ..." -ForegroundColor Cyan
$env:PORT = "$port"
$env:FFMPEG = $ffmpeg
$server = Start-Process node -ArgumentList "tools/car-audio-server.mjs" -PassThru -NoNewWindow

Start-Sleep -Seconds 2
Write-Host "Opening public tunnel ..." -ForegroundColor Cyan
& $cloudflared tunnel --url "http://localhost:$port"

# When cloudflared exits (Ctrl+C), tear down the server too.
if ($server -and -not $server.HasExited) { Stop-Process -Id $server.Id -Force }
