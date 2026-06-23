$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

# Refresh PATH and activate mise
$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "User")
& mise activate pwsh | Out-String | Invoke-Expression
Set-Location $ProjectRoot

Write-Host "=== Build frontend ===" -ForegroundColor Cyan
npm run build

Write-Host ""
Write-Host "=== clasp push ===" -ForegroundColor Cyan
clasp push

Write-Host ""
Write-Host "=== Deploy complete ===" -ForegroundColor Green
Write-Host "Run 'clasp deploy' to update WebApp"
