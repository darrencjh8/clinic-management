# run-e2e-staging.ps1
# E2E Test Runner for Staging Environment on Fly.io
# This script runs local UI code against the staging server

param(
    [switch]$SkipCleanup
)

$ErrorActionPreference = "Stop"

function Check-Error {
    param([string]$Message)
    if ($LASTEXITCODE -ne 0) {
        Write-Error "$Message (Exit Code: $LASTEXITCODE)"
        exit $LASTEXITCODE
    }
}

Write-Output "=== E2E Staging Test Runner ==="
Write-Output "Target: Local UI against wisata-dental-staging.fly.dev backend"

# 1. Validate E2E Environment
Write-Output "Step 1: Validating E2E Environment..."
if (-not (Test-Path "ui\.env.e2e")) {
    Write-Error "ui\.env.e2e not found! Please create it with E2E_TEST_EMAIL and E2E_TEST_PASSWORD."
    exit 1
}

# Load E2E credentials
Write-Output "Loading E2E credentials from ui\.env.e2e..."
Get-Content "ui\.env.e2e" | ForEach-Object {
    if ($_ -match "([^=]+)=(.*)") {
        [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
        if ($matches[1] -ne "E2E_TEST_SERVICE_ACCOUNT") {
            Write-Output "  Loaded: $($matches[1])"
        } else {
            Write-Output "  Loaded: $($matches[1]) (service account key)"
        }
    }
}

# Validate required credentials
if (-not $env:E2E_TEST_EMAIL -or -not $env:E2E_TEST_PASSWORD) {
    Write-Error "E2E_TEST_EMAIL and E2E_TEST_PASSWORD are required in .env.e2e"
    exit 1
}

# Load server secrets for Firebase
if (Test-Path "..\server\.env") {
    Write-Output "Loading Firebase credentials from server/.env..."
    $serverEnv = Get-Content "..\server\.env"
    $firebaseSecret = $serverEnv | Select-String "FIREBASE_SERVICE_ACCOUNT_BASE64=(.*)" | ForEach-Object { $_.Matches.Groups[1].Value }
    if ($firebaseSecret) {
        [Environment]::SetEnvironmentVariable("FIREBASE_SERVICE_ACCOUNT_BASE64", $firebaseSecret, "Process")
        Write-Output "  Loaded: FIREBASE_SERVICE_ACCOUNT_BASE64"
    }
}

# 2. Start Local UI Development Server
Write-Output "Step 2: Starting Local UI Development Server..."

# Check if Vite dev server is already running
$devServerRunning = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 2 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        $devServerRunning = $true
        Write-Output "Vite dev server is already running on http://localhost:5173"
    }
} catch {
    Write-Output "Vite dev server is not running, starting it..."
}

if (-not $devServerRunning) {
    # Start the dev server in background
    Push-Location ui
    $envFile = if (Test-Path ".env.e2e") { ".env.e2e" } else { ".env" }
    Write-Output "Starting dev server with environment: $envFile"
    
    # Backup original .env file and copy e2e env for Vite to pick it up
    if (Test-Path ".env.e2e") {
        if (Test-Path ".env") {
            Copy-Item ".env" ".env.backup" -Force
        }
        Copy-Item ".env.e2e" ".env" -Force
        Write-Output "Using .env.e2e configuration for local development"
    }
    
    $devServerJob = Start-Job -ScriptBlock {
        param($workingDir)
        Set-Location $workingDir
        npm run dev
    } -ArgumentList (Get-Location)
    
    Pop-Location
    
    # Wait for dev server to start
    Write-Output "Waiting for dev server to start..."
    $maxWait = 30
    $waited = 0
    while ($waited -lt $maxWait) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                Write-Output "✅ Local UI Development Server is running!"
                break
            }
        } catch {
            # Server not ready yet
        }
        Start-Sleep 1
        $waited++
    }
    
    if ($waited -ge $maxWait) {
        Write-Error "Dev server failed to start within $maxWait seconds"
        Stop-Job $devServerJob -ErrorAction SilentlyContinue
        Remove-Job $devServerJob -ErrorAction SilentlyContinue
        exit 1
    }
}

# 3. Run E2E Tests
$localUrl = "http://localhost:5173"
$stagingBackend = "https://wisata-dental-staging.fly.dev"
Write-Output "Step 3: Running E2E Tests against local UI ($localUrl) with staging backend ($stagingBackend)..."

# Set environment variables for Playwright
$env:BASE_URL = $localUrl
$env:CI = "true"

Write-Output "Environment Configuration:"
Write-Output "  BASE_URL (UI): $env:BASE_URL"
Write-Output "  Backend API: $stagingBackend"
Write-Output "  E2E_TEST_EMAIL: $env:E2E_TEST_EMAIL"
Write-Output "  E2E_TEST_PASSWORD: $($env:E2E_TEST_PASSWORD.Substring(0, [Math]::Min(6, $env:E2E_TEST_PASSWORD.Length)))..."

# Run tests with both Chromium and Firefox for comprehensive coverage
try {
    Write-Output "Running E2E tests on Chromium and Firefox..."
    Push-Location ui
    npx playwright test tests/e2e/staging-flow.spec.ts --project=chromium --project=firefox --workers=2 --reporter=list
    Pop-Location
    
    if ($LASTEXITCODE -eq 0) {
        Write-Output "🎉 E2E Tests PASSED on both browsers!"
    } else {
        Write-Error "❌ E2E Tests FAILED!"
        
        # Run diagnostic integration test
        Write-Output "Running integration test to diagnose backend/API issues..."
        Push-Location ui
        node tests/integration/test_login_flow.mjs .env.e2e
        Pop-Location
        $integrationExitCode = $LASTEXITCODE
        
        if ($integrationExitCode -eq 0) {
            Write-Output "✅ Backend APIs are working - issue is likely UI-related"
        } else {
            Write-Output "❌ Backend/API issue detected - check credentials and server configuration"
        }
        
        exit 1
    }
} catch {
    Write-Error "E2E test execution error: $_"
    exit 1
}

# 4. Cleanup (if not skipped)
if (-not $SkipCleanup) {
    Write-Output "Step 4: Cleaning up local development environment..."
    
    # Stop the dev server job if it was started by this script
    if ($devServerJob -and $devServerJob.State -eq "Running") {
        Write-Output "Stopping development server..."
        Stop-Job $devServerJob
        Remove-Job $devServerJob
        Write-Output "✅ Development server stopped"
    } else {
        Write-Output "Development server was not started by this script or is already stopped"
    }
    
    # Restore original .env file if it was backed up
    Push-Location ui
    if (Test-Path ".env.backup") {
        Write-Output "Restoring original .env file..."
        Move-Item ".env.backup" ".env" -Force
        Write-Output "✅ Original .env file restored"
    }
    Pop-Location
    
    Write-Output "✅ Cleanup Complete!"
} else {
    Write-Output "Step 4: Skipping cleanup (development environment preserved)"
}

Write-Output "🎉 E2E Local UI Test Run Complete!"