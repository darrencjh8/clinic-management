# run-e2e-staging.ps1
# E2E Test Runner for Staging Environment on Fly.io
# This script deploys to staging and runs E2E tests against the live staging environment

param(
    [switch]$SkipDeployment,
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
Write-Output "Target: wisata-dental-staging.fly.dev"

# 1. Validate E2E Environment
Write-Output "Step 1: Validating E2E Environment..."
if (-not (Test-Path ".env.e2e")) {
    Write-Error ".env.e2e not found! Please create it with E2E_TEST_EMAIL and E2E_TEST_PASSWORD."
    exit 1
}

# Load E2E credentials
Write-Output "Loading E2E credentials from .env.e2e..."
Get-Content ".env.e2e" | ForEach-Object {
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

# 2. Build and Deploy to Staging (if not skipped)
if (-not $SkipDeployment) {
    Write-Output "Step 2: Building Docker Image with E2E environment..."
    docker build --build-arg ENV_FILE=.env.e2e -t wisata-dental-staging-test ..
    Check-Error "Docker build failed!"
    Write-Output "✅ Docker Build PASSED!"

    Write-Output "Step 3: Deploying to Staging Environment..."
    $stagingAppName = "wisata-dental-staging"
    
    # Check if staging app exists
    try {
        fly apps list | Select-String $stagingAppName
        Write-Output "Staging app exists, proceeding with deployment..."
    } catch {
        Write-Output "Creating staging app..."
        fly apps create $stagingAppName
        if ($LASTEXITCODE -ne 0) {
            Check-Error "Fly staging app creation failed"
        }
    }

    # Set secrets
    Write-Output "Setting secrets on staging app..."
    fly secrets set GOOGLE_SERVICE_ACCOUNT_BASE64=$env:E2E_TEST_SERVICE_ACCOUNT FIREBASE_SERVICE_ACCOUNT_BASE64=$env:FIREBASE_SERVICE_ACCOUNT_BASE64 --app $stagingAppName
    if ($LASTEXITCODE -ne 0) {
        Write-Output "Warning: Failed to set secrets, but continuing with deployment..."
    }

    # Deploy to staging
    Write-Output "Deploying to staging..."
    fly deploy --app $stagingAppName --config ..\fly.staging.toml --ha=false
    Check-Error "Staging deployment failed"
    
    Write-Output "✅ Staging Deployment Complete!"
} else {
    Write-Output "Step 2: Skipping deployment (using existing staging environment)"
}

# 3. Run E2E Tests
$stagingUrl = "https://wisata-dental-staging.fly.dev"
Write-Output "Step 3: Running E2E Tests against $stagingUrl..."

# Set environment variables for Playwright
$env:BASE_URL = $stagingUrl
$env:CI = "true"

Write-Output "Environment Configuration:"
Write-Output "  BASE_URL: $env:BASE_URL"
Write-Output "  E2E_TEST_EMAIL: $env:E2E_TEST_EMAIL"
Write-Output "  E2E_TEST_PASSWORD: $($env:E2E_TEST_PASSWORD.Substring(0, [Math]::Min(6, $env:E2E_TEST_PASSWORD.Length)))..."

# Run tests with both Chromium and Firefox for comprehensive coverage
try {
    Write-Output "Running E2E tests on Chromium and Firefox..."
    npx playwright test tests/e2e/staging-flow.spec.ts --project=chromium --project=firefox --workers=2 --reporter=list
    
    if ($LASTEXITCODE -eq 0) {
        Write-Output "🎉 E2E Tests PASSED on both browsers!"
    } else {
        Write-Error "❌ E2E Tests FAILED!"
        
        # Run diagnostic integration test
        Write-Output "Running integration test to diagnose backend/API issues..."
        node tests/integration/test_login_flow.mjs .env.e2e
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
    Write-Output "Step 4: Cleaning up staging environment..."
    
    Write-Output "Destroying staging app..."
    fly apps destroy wisata-dental-staging --yes
    
    Write-Output "Cleaning up Docker images..."
    docker rmi wisata-dental-staging-test -f
    
    Write-Output "✅ Cleanup Complete!"
} else {
    Write-Output "Step 4: Skipping cleanup (staging environment preserved)"
}

Write-Output "🎉 E2E Staging Test Run Complete!"