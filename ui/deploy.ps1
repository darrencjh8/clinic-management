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

# Navigate to project root (one level up from ui/)
Write-Output "Navigating to project root..."
Set-Location ..

# 1. Execute the docker build command
Write-Output "Building Docker Image..."
docker build -t wisata-dental:latest .
Check-Error "Docker build failed"

# 2. Tag and Push
Write-Output "Pushing to Registry..."
docker tag wisata-dental:latest chongjinheng/wisata-dental:latest
Check-Error "Docker tag failed"

docker push chongjinheng/wisata-dental:latest
Check-Error "Docker push failed"

# 3. Deploy
Write-Output "Deploying to Fly.io..."
fly deploy --image chongjinheng/wisata-dental:latest --ha=false
Check-Error "Fly deploy failed"

Write-Output "Deployment Successful!"

# Return to original directory
Set-Location ui