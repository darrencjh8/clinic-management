# deploy_and_test.ps1
# Automates Staging Deployment and E2E Testing

$ErrorActionPreference = "Stop"

function Check-Error {
    param([string]$Message)
    if ($LASTEXITCODE -ne 0) {
        Write-Error "$Message (Exit Code: $LASTEXITCODE)"
        exit $LASTEXITCODE
    }
}

# 1. Validation
Write-Output "Step 1: Validating Environment..."
if (-not (Test-Path "ui\.env.e2e")) {
    Write-Error "ui\.env.e2e not found! Please create it with E2E_TEST_EMAIL and E2E_TEST_PASSWORD."
    exit 1
}

# Load E2E credentials into environment
Get-Content "ui\.env.e2e" | ForEach-Object {
    if ($_ -match "([^=]+)=(.*)") {
        [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
    }
}

# Read secrets from .env.e2e for staging deployment
# E2E_TEST_SERVICE_ACCOUNT is the Google Service Account for Sheets API
$googleSecret = $env:E2E_TEST_SERVICE_ACCOUNT

# Firebase service account from server/.env (for token verification)
if (Test-Path "server\.env") {
    $serverEnv = Get-Content "server\.env"
    $firebaseSecret = $serverEnv | Select-String "FIREBASE_SERVICE_ACCOUNT_BASE64=(.*)" | ForEach-Object { $_.Matches.Groups[1].Value }
} else {
    $firebaseSecret = $null
}

if (-not $googleSecret) {
    Write-Error "E2E_TEST_SERVICE_ACCOUNT not found in ui\.env.e2e! This is required for the staging server."
    exit 1
}

if (-not $firebaseSecret) {
    Write-Error "FIREBASE_SERVICE_ACCOUNT_BASE64 not found in server\.env! This is required for Firebase auth."
    exit 1
}

Write-Output "Secrets loaded: GOOGLE_SERVICE_ACCOUNT_BASE64 (from .env.e2e), FIREBASE_SERVICE_ACCOUNT_BASE64 (from server/.env)"

# 2. Run Component Tests FIRST (before creating any cloud resources)
Write-Output "Step 2: Running Component Tests..."
Push-Location ui
try {
    npm run test:ct -- --project=chromium
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Component tests failed! Aborting deployment."
        exit 1
    }
    Write-Output "✅ Component Tests PASSED!"
} finally {
    Pop-Location
}

# 3. Build Docker Image (validate build before creating cloud resources)
Write-Output "Step 3: Building Docker Image..."
docker build -t wisata-dental-staging-test .
Check-Error "Docker build failed! Aborting deployment."
Write-Output "✅ Docker Build PASSED!"

# 4. Create Staging App (only after tests and build pass)
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$appName = "wisata-dental-staging-$timestamp"
Write-Output "Step 4: Creating Staging App ($appName)..."

# Try to create app.
fly apps create $appName --org personal
if ($LASTEXITCODE -ne 0) {
    # Try default org if 'personal' fails
    Write-Output "Retrying with default org..."
    fly apps create $appName
    Check-Error "Fly app creation failed"
}

try {
    # 5. Configure Secrets
    Write-Output "Step 5: Setting Secrets..."
    fly secrets set GOOGLE_SERVICE_ACCOUNT_BASE64=$googleSecret FIREBASE_SERVICE_ACCOUNT_BASE64=$firebaseSecret --app $appName
    Check-Error "Failed to set secrets"

    # 6. Deploy
    Write-Output "Step 6: Deploying to Staging..."
    # fly deploy will build locally or remotely and push to fly registry automatically
    fly deploy --app $appName --ha=false
    Check-Error "Staging deployment failed"

    $stagingUrl = "https://$appName.fly.dev"
    Write-Output "Staging App Deployed: $stagingUrl"

    # 7. Run E2E Tests
    Write-Output "Step 7: Running E2E Tests..."
    
    # Set Env Vars for Playwright - ensure they are available to child processes
    $env:BASE_URL = $stagingUrl
    
    # Re-load and export .env.e2e variables explicitly for subprocess
    $envE2E = Get-Content "ui\.env.e2e"
    foreach ($line in $envE2E) {
        if ($line -match "^([^#][^=]+)=(.*)$") {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
            Write-Output "  ENV: $key = $($value.Substring(0, [Math]::Min(20, $value.Length)))..."
        }
    }
    
    # Debug: Log credentials (test account, safe to log)
    Write-Output "DEBUG: E2E_TEST_EMAIL = $env:E2E_TEST_EMAIL"
    Write-Output "DEBUG: E2E_TEST_PASSWORD = $env:E2E_TEST_PASSWORD"
    Write-Output "DEBUG: BASE_URL = $env:BASE_URL"
    
    # Run Playwright from ui directory using PowerShell directly (not cmd)
    Push-Location ui
    try {
        # Set CI mode to avoid HTML report server blocking
        $env:CI = "true"
        npx playwright test tests/e2e/staging-flow.spec.ts --project=chromium
    } finally {
        Pop-Location
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Output "✅ E2E Tests PASSED!"
    } else {
        Write-Error "❌ E2E Tests FAILED!"
        
        # Run integration test to diagnose if issue is backend/API vs UI
        Write-Output "Running integration test to diagnose backend/API functionality..."
        try {
            Push-Location ui
            $env:CI = "true"
            node tests/integration/test_login_flow.mjs
            $integrationExitCode = $LASTEXITCODE
            Pop-Location
            
            if ($integrationExitCode -eq 0) {
                Write-Output "✅ Integration Test PASSED - Backend APIs are working correctly"
                Write-Output "🔍 The E2E failure is likely in React component lifecycle or UI state management"
            } else {
                Write-Output "❌ Integration Test FAILED - Backend/API issue detected"
                Write-Output "🔍 Check Firebase credentials, service account secrets, or Google API permissions"
            }
        } catch {
            Write-Output "❌ Integration Test error: $_"
        }
    }

} catch {
    Write-Error "An error occurred during execution: $_"
} finally {
    # 8. Cleanup
    Write-Output "Step 8: Cleaning up..."
    
    Write-Output "Destroying Staging App..."
    fly apps destroy $appName --yes
    
    Write-Output "Cleanup Complete."
}
