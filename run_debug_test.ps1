$ErrorActionPreference = "Stop"
$env:BASE_URL = "https://wisata-dental-e2e-debug.fly.dev"

# Read credentials
$envContent = Get-Content "ui\.env.e2e"
$email = ""
$password = ""
foreach ($line in $envContent) {
    if ($line -match "E2E_TEST_EMAIL=(.*)") { $email = $matches[1] }
    if ($line -match "E2E_TEST_PASSWORD=(.*)") { $password = $matches[1] }
}

Write-Host "Running tests against $env:BASE_URL with $email"

Set-Location ui

# Use Start-Process to stream output directly, or redirect
# Jobs in PowerShell are tricky with env vars if not passed explicitly in Init script
# Let's try simpler: directly run in this console but redirect output
$env:E2E_TEST_EMAIL = $email
$env:E2E_TEST_PASSWORD = $password

cmd /c "npx playwright test tests/e2e/staging-flow.spec.ts --reporter=line > ..\test_debug_output.txt 2>&1"
