param(
  [switch]$NoFrontend
)

$repoRoot = Split-Path -Parent $PSScriptRoot

Write-Host "Freeing dev ports..."
& "$PSScriptRoot\free-dev-ports.ps1"

Write-Host "Starting backend in a separate PowerShell window..."
$backendCommand = "Set-Location '$repoRoot\backend'; `$env:NODE_ENV='development'; node app.js"
Start-Process powershell -ArgumentList @(
  '-NoProfile',
  '-ExecutionPolicy',
  'Bypass',
  '-Command',
  $backendCommand
)

if ($NoFrontend) {
  Write-Host "Backend started. Frontend launch skipped (--NoFrontend)."
  exit 0
}

Write-Host "Starting frontend in current terminal..."
Set-Location $repoRoot
npm run dev
