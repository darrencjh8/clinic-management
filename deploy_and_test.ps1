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

if (-not (Test-Path "server\.env")) {
    Write-Error "server\.env not found! Cannot inject backend secrets."
    exit 1
}

# Read secrets for injection
# Note: This simple parsing assumes KEY=VALUE format without complex quoting/multiline issues for these specific keys
$serverEnv = Get-Content "server\.env"
$googleSecret = $serverEnv | Select-String "GOOGLE_SERVICE_ACCOUNT_BASE64=(.*)" | ForEach-Object { $_.Matches.Groups[1].Value }
$firebaseSecret = $serverEnv | Select-String "FIREBASE_SERVICE_ACCOUNT_BASE64=(.*)" | ForEach-Object { $_.Matches.Groups[1].Value }

if (-not $googleSecret -or -not $firebaseSecret) {
    Write-Error "Failed to extract GOOGLE_SERVICE_ACCOUNT_BASE64 or FIREBASE_SERVICE_ACCOUNT_BASE64 from server\.env"
    exit 1
}

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
        # Use npx directly in PowerShell to preserve environment variables
        npx playwright test tests/e2e/staging-flow.spec.ts --project=chromium
    } finally {
        Pop-Location
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Output "✅ E2E Tests PASSED!"
    } else {
        Write-Error "❌ E2E Tests FAILED!"
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
