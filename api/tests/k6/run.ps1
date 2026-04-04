# run.ps1 -- Stress Test Orchestrator
# Runs all k6 tests sequentially and immediately analyzes results.
#
# Prerequisites:
#   - k6 installed: winget install k6
#   - API running locally: cd api ; npm run dev
#   - Local Postgres on :8090, Redis on :6379
#   - Seed done: npm run db:seed:stress
#
# Usage (from api/ directory):
#   .\tests\k6\run.ps1
#
# Flags:
#   -TestFilter browse|order|websocket    run only one test
#   -SkipSeed                             skip re-seeding
#   -Smoke                                fast 50-second smoke test (5 VUs)

param(
    [string]$TestFilter = '',
    [switch]$SkipSeed,
    [switch]$Smoke
)

$ErrorActionPreference = 'Stop'
$ScriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$ApiDir     = Resolve-Path "$ScriptDir\..\.."
$ResultsDir = "$ScriptDir\results"

function Write-Header($msg) {
    Write-Host ""
    Write-Host ("=" * 60) -ForegroundColor Cyan
    Write-Host "  $msg" -ForegroundColor Cyan
    Write-Host ("=" * 60) -ForegroundColor Cyan
}
function Write-Step($msg)  { Write-Host "`n>> $msg" -ForegroundColor Yellow }
function Write-OK($msg)    { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Fail($msg)  { Write-Host "  [FAIL] $msg" -ForegroundColor Red }
function Write-Info($msg)  { Write-Host "  $msg" -ForegroundColor Gray }

Write-Header "Delivery Gjilan -- API Stress Test Suite"

# -- Check prerequisites -------------------------------------------------------
Write-Step "Checking prerequisites"

if (-not (Get-Command k6 -ErrorAction SilentlyContinue)) {
    Write-Fail "k6 not found. Install with: winget install k6"
    exit 1
}
Write-OK "k6 found: $(k6 version)"

try {
    $null = Invoke-WebRequest -Uri "http://localhost:4000/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Write-OK "API is reachable at http://localhost:4000"
}
catch {
    Write-Fail "API not reachable at http://localhost:4000 -- start with: cd api ; npm run dev"
    exit 1
}

# -- Seed fixtures -------------------------------------------------------------
if (-not $SkipSeed) {
    Write-Step "Seeding stress-test fixtures"
    Push-Location $ApiDir
    try {
        npx tsx --env-file=.env scripts/seed-stress-test.ts
        if ($LASTEXITCODE -ne 0) { throw "Seed script exited with code $LASTEXITCODE" }
        Write-OK "Fixtures seeded"
    }
    catch {
        Write-Fail "Seed script failed: $_"
        Pop-Location
        exit 1
    }
    Pop-Location
}
else {
    Write-Info "Skipping seed (-SkipSeed flag set)"
}

if (-not (Test-Path "$ScriptDir\fixtures.json")) {
    Write-Fail "fixtures.json not found -- run without -SkipSeed first"
    exit 1
}

# -- Prepare results dir -------------------------------------------------------
New-Item -ItemType Directory -Force -Path $ResultsDir | Out-Null

# -- Test definitions ----------------------------------------------------------
$tests = @(
    @{ Name = 'browse';    File = 'browse.js';     Desc = 'Read-heavy browse (businesses + products)' },
    @{ Name = 'order';     File = 'order-flow.js'; Desc = 'Full order creation flow' },
    @{ Name = 'websocket'; File = 'websocket.js';  Desc = 'WebSocket connections (drivers + subscriptions)' }
)

if ($TestFilter) {
    $tests = $tests | Where-Object { $_.Name -eq $TestFilter }
    if ($tests.Count -eq 0) {
        Write-Fail "Unknown -TestFilter '$TestFilter'. Valid values: browse, order, websocket"
        exit 1
    }
}

# -- Run tests -----------------------------------------------------------------
$results = @()

foreach ($test in $tests) {
    Write-Header $test.Desc

    $outFile  = "$ResultsDir\$($test.Name).json"
    $testFile = "$ScriptDir\$($test.File)"

    Write-Info "Output: $outFile"

    $startTime = Get-Date

    if ($Smoke) {
        k6 run --out "json=$outFile" --no-color --stage "10s:5,30s:5,10s:0" $testFile
    }
    else {
        k6 run --out "json=$outFile" --no-color $testFile
    }

    $exitCode = $LASTEXITCODE
    $duration = [math]::Round(((Get-Date) - $startTime).TotalSeconds)

    if ($exitCode -eq 0) {
        Write-OK "Completed in ${duration}s (all thresholds passed)"
        $results += @{ Name = $test.Name; Status = 'PASS'; Duration = $duration }
    }
    else {
        Write-Fail "Completed in ${duration}s -- one or more thresholds failed (exit $exitCode)"
        $results += @{ Name = $test.Name; Status = 'FAIL'; Duration = $duration }
    }

    Write-Info "Cooling down 15s before next test..."
    Start-Sleep -Seconds 15
}

# -- Analyze results -----------------------------------------------------------
Write-Header "Analysis"
node "$ScriptDir\analyze.js"

# -- Final summary -------------------------------------------------------------
Write-Header "Run Summary"
foreach ($r in $results) {
    if ($r.Status -eq 'PASS') {
        Write-Host "  [PASS] $($r.Name.PadRight(12)) $($r.Duration)s" -ForegroundColor Green
    }
    else {
        Write-Host "  [FAIL] $($r.Name.PadRight(12)) $($r.Duration)s" -ForegroundColor Red
    }
}

$failCount = ($results | Where-Object { $_.Status -eq 'FAIL' }).Count
if ($failCount -gt 0) {
    Write-Host "`n  $failCount test(s) exceeded thresholds -- see analysis above`n" -ForegroundColor Red
    exit 1
}
else {
    Write-Host "`n  All tests passed their thresholds`n" -ForegroundColor Green
}
