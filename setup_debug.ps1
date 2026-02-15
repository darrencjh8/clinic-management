# setup_debug.ps1
$appName = "wisata-dental-e2e-debug"

$serverEnv = Get-Content "server\.env"
$googleSecret = $serverEnv | Select-String "GOOGLE_SERVICE_ACCOUNT_BASE64=(.*)" | ForEach-Object { $_.Matches.Groups[1].Value }
$firebaseSecret = $serverEnv | Select-String "FIREBASE_SERVICE_ACCOUNT_BASE64=(.*)" | ForEach-Object { $_.Matches.Groups[1].Value }

if (-not $googleSecret -or -not $firebaseSecret) {
    Write-Error "Failed to extract secrets"
    exit 1
}

Write-Output "Setting secrets..."
fly secrets set GOOGLE_SERVICE_ACCOUNT_BASE64=$googleSecret FIREBASE_SERVICE_ACCOUNT_BASE64=$firebaseSecret --app $appName

Write-Output "Deploying..."
fly deploy --app $appName --ha=false
