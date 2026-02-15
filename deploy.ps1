# Prerequisite 
# powershell -ExecutionPolicy Bypass -File .\deploy.ps1

$ErrorActionPreference = "Stop"

# Helper function to check exit codes
function Check-Error {
    param([string]$Message)
    if ($LASTEXITCODE -ne 0) {
        Write-Error "$Message (Exit Code: $LASTEXITCODE)"
        exit $LASTEXITCODE
    }
}

# 1. Run Component Tests
Write-Output "Checking Playwright binaries..."
Push-Location ui
try {
    # Check if Playwright binaries are installed
    $playwrightCheck = npx playwright --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Output "Playwright binaries not found. Installing..."
        npx playwright install
        Check-Error "Playwright installation failed"
        Write-Output "Playwright binaries installed successfully."
    } else {
        Write-Output "Playwright binaries found: $playwrightCheck"
    }
    
    Write-Output "Running component tests..."
    npm run test:ct
    Check-Error "Component tests failed"
} finally {
    Pop-Location
}

# 2. Execute the docker build command
Write-Output "Building Docker Image..."
# Builds using the Dockerfile in the current directory, which includes both UI and Server
docker build -t wisata-dental:latest .
Check-Error "Docker build failed"

# 3. Tag and Push
Write-Output "Pushing to Registry..."
docker tag wisata-dental:latest chongjinheng/wisata-dental:latest
Check-Error "Docker tag failed"

docker push chongjinheng/wisata-dental:latest
Check-Error "Docker push failed"

# 4. Deploy
Write-Output "Deploying to Fly.io..."
fly deploy --image chongjinheng/wisata-dental:latest --ha=false
Check-Error "Fly deploy failed"

Write-Output "Deployment Successful!"

# 5. Cleanup Docker Images and Tags
Write-Output "Cleaning up Docker images and tags..."
docker rmi chongjinheng/wisata-dental:latest -f
docker rmi wisata-dental:latest -f

Write-Output "Docker cleanup complete!"
