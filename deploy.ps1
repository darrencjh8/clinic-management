# deploy.ps1
# Full deployment with comprehensive testing: CT tests → Staging deployment → E2E tests → Production deployment
# 
# Usage:
#   .\deploy.ps1                    # Full deployment with E2E tests
#   .\deploy.ps1 -SkipE2E           # Skip E2E tests (faster deployment)
#   .\deploy.ps1 -SkipE2E:$true     # Skip E2E tests (alternative syntax)

param(
    [switch]$SkipE2E
)

$ErrorActionPreference = "Stop"

function Check-Error {
    param([string]$Message)
    if ($LASTEXITCODE -ne 0) {
        Write-Error "$Message (Exit Code: $LASTEXITCODE)"
        exit $LASTEXITCODE
    }
}

# Helper function to validate .env-prod file
function Test-ProductionEnv {
    param([string]$EnvPath)
    
    Write-Output "Validating production environment file..."
    
    # Check if .env-prod exists
    if (-not (Test-Path $EnvPath)) {
        Write-Error "Production environment file not found: $EnvPath"
        Write-Error "Please create .env-prod with production environment variables."
        exit 1
    }
    
    # Required production variables
    $requiredVars = @(
        "VITE_API_URL",
        "VITE_FIREBASE_API_KEY", 
        "VITE_FIREBASE_PROJECT_ID",
        "VITE_GOOGLE_CLIENT_ID",
        "VITE_CLINIC_NAME"
    )
    
    # Read and validate .env-prod
    $envContent = Get-Content $EnvPath
    $missingVars = @()
    $invalidVars = @()
    
    foreach ($var in $requiredVars) {
        $found = $false
        foreach ($line in $envContent) {
            if ($line -match "^$var=(.*)$") {
                $found = $true
                $value = $matches[1].Trim()
                
                # Check if value is empty
                if ([string]::IsNullOrWhiteSpace($value)) {
                    $missingVars += $var
                }
                
                # Special validation for API URL
                if ($var -eq "VITE_API_URL" -and $value.Contains("localhost")) {
                    $invalidVars += "$var (contains localhost, should be production URL)"
                }
                break
            }
        }
        
        if (-not $found) {
            $missingVars += $var
        }
    }
    
    # Report validation results
    if ($missingVars.Count -gt 0) {
        Write-Error "Missing or empty variables in .env-prod:"
        foreach ($var in $missingVars) {
            Write-Error "  - $var"
        }
        exit 1
    }
    
    if ($invalidVars.Count -gt 0) {
        Write-Error "Invalid variables in .env-prod:"
        foreach ($var in $invalidVars) {
            Write-Error "  - $var"
        }
        exit 1
    }
    
    Write-Output "✅ Production environment validation passed!"
}

# 1. Validation
Write-Output "Step 1: Validating Environment..."
if (-not $SkipE2E -and -not (Test-Path "ui\.env.e2e")) {
    Write-Error "ui\.env.e2e not found! Please create it with E2E_TEST_EMAIL and E2E_TEST_PASSWORD, or use -SkipE2E flag."
    exit 1
}

if (-not $SkipE2E) {
    Write-Output "E2E tests enabled - validating E2E configuration..."
} else {
    Write-Output "E2E tests skipped - skipping E2E configuration validation"
}

# 1.1. Validate Production Environment
Test-ProductionEnv "ui\.env-prod"

# Load E2E credentials into environment (only if not skipping E2E)
if (-not $SkipE2E) {
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
} else {
    Write-Output "Skipping E2E credential loading - not needed for deployment without E2E tests"
}

# 2. Run Component Tests FIRST (before creating any cloud resources)
Write-Output "Step 2: Running Component Tests..."
Push-Location ui
try {
    # Ensure CI is not set for component tests to allow multiple workers
    $originalCI = $env:CI
    $env:CI = $null
    Write-Output "Component tests will use multiple workers (CI cleared)"
    
    npm run test:ct
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Component tests failed! Aborting deployment."
        exit 1
    }
    Write-Output "✅ Component Tests PASSED!"
    
    # Restore CI setting for subsequent steps (E2E tests need CI=true for 1 worker)
    $env:CI = $originalCI
    if ($env:CI) {
        Write-Output "CI environment restored for E2E tests (will use 1 worker)"
    }
} finally {
    Pop-Location
}

# 3. Build Docker Image (validate build before creating cloud resources)
Write-Output "Step 3: Building Docker Image..."
docker build -t wisata-dental-staging-test .
Check-Error "Docker build failed! Aborting deployment."
Write-Output "✅ Docker Build PASSED!"

# 4+ steps: Conditional flow based on E2E testing
if (-not $SkipE2E) {
    # E2E Flow: Use static staging app and run tests
    # 4. Deploy to Static Staging App
    $stagingAppName = "wisata-dental-staging"
    Write-Output "Step 4: Deploying to Static Staging App ($stagingAppName)..."

    # Check if staging app exists, if not create it
    try {
        fly apps info --app $stagingAppName
        Write-Output "Staging app exists, proceeding with deployment..."
    } catch {
        Write-Output "Staging app does not exist, creating it..."
        fly apps create $stagingAppName --config fly.staging.toml --org personal
        if ($LASTEXITCODE -ne 0) {
            # Try default org if 'personal' fails
            Write-Output "Retrying with default org..."
            fly apps create $stagingAppName --config fly.staging.toml
            Check-Error "Fly staging app creation failed"
        }
    }

    try {
        # 5. Configure Secrets
        Write-Output "Step 5: Setting Secrets..."
        fly secrets set GOOGLE_SERVICE_ACCOUNT_BASE64=$googleSecret FIREBASE_SERVICE_ACCOUNT_BASE64=$firebaseSecret --app $stagingAppName
        Check-Error "Failed to set secrets"

        # 6. Deploy
        Write-Output "Step 6: Deploying to Staging..."
        # fly deploy will build locally or remotely and push to fly registry automatically
        fly deploy --app $stagingAppName --config fly.staging.toml --ha=false
        Check-Error "Staging deployment failed"

        $stagingUrl = "https://$stagingAppName.fly.dev"
        Write-Output "Staging App Deployed: $stagingUrl"

        # 6.5. Verify Server Readiness
        Write-Output "Step 6.5: Verifying staging server readiness..."
        $serverReady = $false
        $retryCount = 0
        $maxRetries = 20

        while (-not $serverReady -and $retryCount -lt $maxRetries) {
            try {
                $response = Invoke-WebRequest -Uri "$stagingUrl" -TimeoutSec 10 -UseBasicParsing
                if ($response.StatusCode -eq 200) {
                    $serverReady = $true
                    Write-Output "✅ Server ready after $($retryCount + 1) attempts"
                    
                    # Additional check: Verify the app is actually serving our content
                    $content = $response.Content
                    if ($content -match 'wisata-dental|clinic|dental' -or $content -match '<!DOCTYPE html>' -and $content -match 'id="root"') {
                        Write-Output "✅ Application content verified"
                    } else {
                        throw "Server returned 200 but content doesn't match expected application"
                    }
                } else {
                    throw "Server returned status $($response.StatusCode)"
                }
            } catch {
                $retryCount++
                Write-Output "Server not ready (attempt $retryCount/$maxRetries), waiting 5 seconds..."
                Write-Output "  Error: $($_.Exception.Message)"
                Start-Sleep -Seconds 5
            }
        }

        if (-not $serverReady) {
            Write-Error "❌ Staging server failed to become ready after $maxRetries attempts"
            Write-Output "Rolling back staging deployment..."
            fly apps destroy $stagingAppName --yes
            Write-Output "✅ Staging server rolled back due to readiness failure"
            exit 1
        }

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
            # Set CI mode to avoid HTML report server blocking, but use multiple workers for faster execution
            $env:CI = "true"
            # Run tests on both Chromium and Firefox for comprehensive browser compatibility
            npx playwright test tests/e2e/staging-flow.spec.ts --project=chromium --project=firefox --workers=2
        } finally {
            Pop-Location
        }
        
        if ($LASTEXITCODE -eq 0) {
            Write-Output "✅ E2E Tests PASSED!"
            
            # 8. Deploy to Production (after all tests pass)
            Write-Output "Step 8: Deploying to Production..."
            docker build -t wisata-dental:latest .
            Check-Error "Production Docker build failed"
            
            # Tag and Push
            Write-Output "Pushing to Registry..."
            docker tag wisata-dental:latest chongjinheng/wisata-dental:latest
            Check-Error "Docker tag failed"
            
            docker push chongjinheng/wisata-dental:latest
            Check-Error "Docker push failed"
            
            # Deploy
            Write-Output "Deploying to Fly.io Production..."
            fly deploy --image chongjinheng/wisata-dental:latest --ha=false
            Check-Error "Production Fly deploy failed"
            
            Write-Output "🚀 Production Deployment Successful!"
            
            # 9. Cleanup Docker Images and Tags
            Write-Output "Step 9: Cleaning up Docker images and tags..."
            docker rmi chongjinheng/wisata-dental:latest -f
            docker rmi wisata-dental:latest -f
            Write-Output "Docker cleanup complete!"
            
        } else {
            Write-Error "❌ E2E Tests FAILED!"
            Write-Output "🔄 Immediate rollback of staging deployment..."
            fly apps destroy $stagingAppName --yes
            Write-Output "✅ Staging server rolled back due to test failure"
            
            # Run integration test to diagnose if issue is backend/API vs UI
            Write-Output "Running integration test to diagnose backend/API functionality..."
            try {
                Push-Location ui
                $env:CI = "true"
                node tests/integration/test_login_flow.mjs .env.e2e
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
            
            Write-Output "❌ Deployment aborted due to E2E test failures"
            exit 1
        }

    } catch {
        Write-Error "An error occurred during execution: $_"
    } finally {
        # 10. Cleanup
        Write-Output "Step 10: Cleaning up..."
        
        # Only attempt to destroy staging app if it wasn't already rolled back
        try {
            $appInfo = fly apps info --app $stagingAppName 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Output "Destroying Staging App..."
                fly apps destroy $stagingAppName --yes
                Write-Output "✅ Staging app cleaned up"
            } else {
                Write-Output "Staging app already destroyed or never created"
            }
        } catch {
            Write-Output "Staging app cleanup not needed or already completed"
        }
        
        Write-Output "✅ All tasks completed successfully!"
        Write-Output "Cleanup Complete."
    }

} else {
    # Skip E2E Flow: Direct production deployment
    Write-Output "Step 4: Skipping E2E Tests - proceeding directly to production deployment"
    
    # 5. Deploy to Production (skip E2E)
    Write-Output "Step 5: Deploying to Production..."
    docker build -t wisata-dental:latest .
    Check-Error "Production Docker build failed"
    
    # Tag and Push
    Write-Output "Pushing to Registry..."
    docker tag wisata-dental:latest chongjinheng/wisata-dental:latest
    Check-Error "Docker tag failed"
    
    docker push chongjinheng/wisata-dental:latest
    Check-Error "Docker push failed"
    
    # Deploy
    Write-Output "Deploying to Fly.io Production..."
    fly deploy --image chongjinheng/wisata-dental:latest --ha=false
    Check-Error "Production Fly deploy failed"
    
    Write-Output "🚀 Production Deployment Successful!"
    
    # 6. Cleanup Docker Images and Tags
    Write-Output "Step 6: Cleaning up Docker images and tags..."
    docker rmi chongjinheng/wisata-dental:latest -f
    docker rmi wisata-dental:latest -f
    Write-Output "Docker cleanup complete!"
    
    Write-Output "✅ Deployment completed successfully (E2E tests skipped)!"
}
