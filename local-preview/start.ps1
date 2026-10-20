# Starts the full local preview of the website: database + API + website, then opens the browser.
# Safe to run again: running services are kept, schema and starter data are updated.
$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
$repo = Split-Path $here -Parent
if (-not (Test-Path (Join-Path $repo 'pnpm-workspace.yaml'))) { throw 'Keep the local-preview folder inside the project repository.' }
$api = Join-Path $repo "artifacts\api-server"
$web = Join-Path $repo "artifacts\pmt-restaurant"
$logs = Join-Path $here "logs"
New-Item -ItemType Directory -Force $logs | Out-Null

function Listening($port) {
  $client = New-Object Net.Sockets.TcpClient
  try {
    $pending = $client.BeginConnect('127.0.0.1', [int]$port, $null, $null)
    if (-not $pending.AsyncWaitHandle.WaitOne(500)) { return $false }
    $client.EndConnect($pending)
    return $true
  } catch { return $false } finally { $client.Dispose() }
}
function Wait-Port($port, $what) {
  for ($i = 0; $i -lt 120 -and -not (Listening $port); $i++) { Start-Sleep -Milliseconds 500 }
  if (-not (Listening $port)) { throw "$what did not start - see the logs folder" }
}

# Settings for this computer (created once; holds the local admin login)
$envFile = Join-Path $here ".env"
if (-not (Test-Path $envFile)) {
  $bytes = New-Object byte[] 12
  [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $password = [Convert]::ToBase64String($bytes).Replace("+", "x").Replace("/", "y").Substring(0, 14)
  @(
    "# Local preview settings - only used on this computer",
    "DB_PORT=54330",
    "DATABASE_URL=postgres://postgres:postgres@localhost:54330/pmt",
    "PORT=8080",
    "NODE_ENV=development",
    "# Staff login for the local preview (go to http://localhost:5173/admin)",
    "ADMIN_USERNAME=owner",
    "ADMIN_PASSWORD=$password"
  ) | Set-Content -Encoding utf8 $envFile
}
foreach ($line in Get-Content $envFile) {
  if ($line -match '^\s*([A-Z_]+)=(.*)$') { [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2]) }
}

Write-Host "1/4 Database..." -ForegroundColor Green
if (-not (Listening $env:DB_PORT)) {
  Start-Process -FilePath node -ArgumentList "db.mjs" -WorkingDirectory $here -WindowStyle Hidden `
    -RedirectStandardOutput "$logs\db.log" -RedirectStandardError "$logs\db.err.log"
  Wait-Port $env:DB_PORT "The database"
}

Write-Host "2/4 Updating database tables and starter data..." -ForegroundColor Green
$setup = Start-Process -FilePath node -ArgumentList './database/setup.mjs' -WorkingDirectory $repo -WindowStyle Hidden `
  -RedirectStandardOutput "$logs\db-setup.log" -RedirectStandardError "$logs\db-setup.err.log" -Wait -PassThru
if ($setup.ExitCode -ne 0) { throw "Updating the database failed - see logs\db-setup.log and logs\db-setup.err.log" }

Write-Host "3/4 API server..." -ForegroundColor Green
if (-not (Listening $env:PORT)) {
  $apiProcess = Start-Process -FilePath node -ArgumentList "--enable-source-maps", "./dist/index.mjs" -WorkingDirectory $api -WindowStyle Hidden `
    -RedirectStandardOutput "$logs\api.log" -RedirectStandardError "$logs\api.err.log" -PassThru
  $apiProcess.Id | Set-Content (Join-Path $here 'api.pid')
  Wait-Port $env:PORT "The API server"
}
$health = Invoke-RestMethod -Uri "http://127.0.0.1:$($env:PORT)/api/healthz" -TimeoutSec 10
if ($health.status -ne 'ok') { throw "The service on port $($env:PORT) is not the expected API." }

Write-Host "4/4 Website..." -ForegroundColor Green
if (-not (Listening 5173)) {
  $vite = Join-Path $web "node_modules\vite\bin\vite.js"
  $env:API_PORT = $env:PORT
  $webProcess = Start-Process -FilePath node -ArgumentList "`"$vite`"", "--config", "vite.config.ts", "--host", "127.0.0.1", "--port", "5173", "--strictPort" `
    -WorkingDirectory $web -WindowStyle Hidden -RedirectStandardOutput "$logs\web.log" -RedirectStandardError "$logs\web.err.log" -PassThru
  $webProcess.Id | Set-Content (Join-Path $here 'web.pid')
  Wait-Port 5173 "The website"
}
$webHealth = Invoke-RestMethod -Uri 'http://127.0.0.1:5173/api/healthz' -TimeoutSec 10
if ($webHealth.status -ne 'ok') { throw 'The website cannot reach the API. See logs\web.err.log.' }

Write-Host ""
Write-Host "Ready: http://localhost:5173" -ForegroundColor Yellow
Write-Host "Staff area: http://localhost:5173/admin  (login is in local-preview\.env)"
Write-Host "To stop everything, run 'Stop Preview'."
if ($args -notcontains "-NoBrowser") { Start-Process "http://localhost:5173" }
