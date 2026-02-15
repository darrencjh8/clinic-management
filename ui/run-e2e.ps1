# E2E Test Runner
#powershell -ExecutionPolicy Bypass -File .\run-e2e.ps1

$ErrorActionPreference = "Stop"

# Helper function to check exit codes
function Check-Error {
    param([string]$Message)
    if ($LASTEXITCODE -ne 0) {
        Write-Error "$Message (Exit Code: $LASTEXITCODE)"
        exit $LASTEXITCODE
    }
}

# ALWAYS kill existing node processes to ensure clean state
Write-Output "Cleaning up existing Node processes..."
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3

# Clear Vite cache completely
Write-Output "Clearing Vite cache..."
Remove-Item -Recurse -Force "./node_modules/.vite" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "./node_modules/.tmp" -ErrorAction SilentlyContinue

# Create .env.local file which Vite will auto-load
Write-Output "Creating .env.local file..."
$backupEnvFile = $null
if (Test-Path ".env.local") {
    $backupEnvFile = ".env.local.backup"
    Copy-Item -Path ".env.local" -Destination $backupEnvFile -Force
}

@"
VITE_FIREBASE_API_KEY=test-api-key
VITE_FIREBASE_AUTH_DOMAIN=test.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=test-project
VITE_FIREBASE_STORAGE_BUCKET=test.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123:web:abc
VITE_GOOGLE_CLIENT_ID=test-google-client-id
VITE_CLINIC_NAME=Wisata Dental Care
VITE_API_URL=http://localhost:3001
"@ | Out-File -FilePath ".env.local" -Encoding utf8 -Force

# Verify file was created
if (-not (Test-Path ".env.local")) {
    Write-Error "Failed to create .env.local file!"
    exit 1
}
Write-Output ".env.local created successfully"

# Start dev server as a background job
Write-Output "Starting dev server in background job..."
$job = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    npm run dev 2>&1
}

# Wait for server to be ready
Write-Output "Waiting for dev server to start..."
$maxAttempts = 40
$attempt = 0
$serverReady = $false
while ($attempt -lt $maxAttempts -and -not $serverReady) {
    Start-Sleep -Seconds 2
    $attempt++
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5173" -Method HEAD -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 404) {
            $serverReady = $true
            Write-Output "Dev server is ready!"
        }
    } catch {
        Write-Output "Waiting... ($attempt/$maxAttempts)"
    }
}

if (-not $serverReady) {
    Write-Output "Dev server output:"
    Receive-Job -Job $job
    Stop-Job -Job $job -ErrorAction SilentlyContinue
    Remove-Job -Job $job -ErrorAction SilentlyContinue
    Write-Error "Dev server failed to start within 80 seconds"
    exit 1
}

try {
    Write-Output "Checking Playwright binaries..."
    $playwrightCheck = npx playwright --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Output "Installing Playwright..."
        npx playwright install
        Check-Error "Playwright installation failed"
    }

    Write-Output "Running E2E tests..."
    npx playwright test --project=chromium
    Check-Error "E2E tests failed"

    Write-Output "E2E tests passed!"
} finally {
    Write-Output "Stopping dev server..."
    Stop-Job -Job $job -ErrorAction SilentlyContinue
    Remove-Job -Job $job -ErrorAction SilentlyContinue
    Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    
    # Restore original .env.local
    if ($backupEnvFile -and (Test-Path $backupEnvFile)) {
        Copy-Item -Path $backupEnvFile -Destination ".env.local" -Force
        Remove-Item -Path $backupEnvFile -Force
    }
}
