$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

# Refresh PATH and activate mise
$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "User")
& mise activate pwsh | Out-String | Invoke-Expression
Set-Location $ProjectRoot

Write-Host "=== flowrite setup ===" -ForegroundColor Cyan
Write-Host "node: $(node --version)"
Write-Host ""

# clasp check
if (-not (Get-Command clasp -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: clasp is not installed" -ForegroundColor Red
    Write-Host "  npm install -g @google/clasp"
    exit 1
}

# npm install
if (-not (Test-Path "$ProjectRoot\node_modules")) {
    Write-Host "=== npm install ==="
    npm install
}

# clasp login (skip if already logged in)
if (Test-Path "$env:USERPROFILE\.clasprc.json") {
    Write-Host "clasp: already logged in (skip)" -ForegroundColor DarkGray
} else {
    Write-Host ""
    Write-Host "=== clasp login ===" -ForegroundColor Cyan
    clasp login
}

# clasp create (skip if .clasp.json already exists)
if (Test-Path "$ProjectRoot\.clasp.json") {
    Write-Host "clasp: project already exists (skip)" -ForegroundColor DarkGray
} else {
    Write-Host ""
    Write-Host "=== clasp create ===" -ForegroundColor Cyan
    Set-Location "$ProjectRoot\gas"
    clasp create --title "flowrite"

    # gas/.clasp.json -> project root
    if (Test-Path "$ProjectRoot\gas\.clasp.json") {
        Move-Item "$ProjectRoot\gas\.clasp.json" "$ProjectRoot\.clasp.json" -Force
    }

    # add rootDir to .clasp.json
    if (Test-Path "$ProjectRoot\.clasp.json") {
        $claspJson = Get-Content "$ProjectRoot\.clasp.json" -Raw -Encoding utf8 | ConvertFrom-Json
        $claspJson | Add-Member -NotePropertyName "rootDir" -NotePropertyValue "gas" -Force
        $claspJson | ConvertTo-Json | Out-File "$ProjectRoot\.clasp.json" -Encoding utf8
    }
}

# appsscript.json from template (includes webapp config)
Write-Host ""
Write-Host "=== appsscript.json ===" -ForegroundColor Cyan
Copy-Item "$ProjectRoot\appsscript.template.json" "$ProjectRoot\gas\appsscript.json" -Force

# spreadsheet ID
Write-Host ""
$SpreadsheetId = Read-Host "Enter SPREADSHEET_ID"

# frontend build
Write-Host ""
Write-Host "=== npm run build ===" -ForegroundColor Cyan
Set-Location $ProjectRoot
npm run build

# clasp push
Write-Host ""
Write-Host "=== clasp push ===" -ForegroundColor Cyan
clasp push

# clasp deploy
Write-Host ""
Write-Host "=== clasp deploy ===" -ForegroundColor Cyan
$deployOutput = clasp deploy --description "initial deployment"
Write-Host $deployOutput

# get scriptId
$claspJson = Get-Content "$ProjectRoot\.clasp.json" -Raw -Encoding utf8 | ConvertFrom-Json
$ScriptId = $claspJson.scriptId

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Setup complete" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Set script properties manually:"
Write-Host ""
Write-Host "1. Open in browser:"
Write-Host "   https://script.google.com/d/$ScriptId/edit" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. Project Settings > Script Properties"
Write-Host ""
Write-Host "   SPREADSHEET_ID : $SpreadsheetId" -ForegroundColor Yellow
Write-Host "   GEMINI_API_KEY  : <your Gemini API key>" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Run deploy.ps1 to deploy"
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
