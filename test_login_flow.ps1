# Test the complete staff login flow
# 1. Login to Firebase
# 2. Get service account from backend
# 3. Get Google OAuth token
# 4. List spreadsheets

$ErrorActionPreference = "Stop"

# Configuration
$FIREBASE_API_KEY = "AIzaSyDsmavUPO_LoF6QxTz9x9HlPsdTWT8RdSs"
$EMAIL = "chongjinheng@gmail.com"
$PASSWORD = "123456"
$BACKEND_API_URL = "https://wisata-dental.fly.dev"

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "Testing Complete Staff Login Flow" -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan

# Step 1: Firebase Login
Write-Host "=== Step 1: Firebase Login ===" -ForegroundColor Yellow
$firebaseUrl = "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=$FIREBASE_API_KEY"
$firebaseBody = @{
    email = $EMAIL
    password = $PASSWORD
    returnSecureToken = $true
} | ConvertTo-Json

try {
    $firebaseResponse = Invoke-RestMethod -Uri $firebaseUrl -Method Post -Body $firebaseBody -ContentType "application/json"
    $firebaseToken = $firebaseResponse.idToken
    Write-Host "✓ Firebase ID Token obtained (length: $($firebaseToken.Length))" -ForegroundColor Green
} catch {
    Write-Host "❌ Firebase login failed: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Get Service Account
Write-Host "`n=== Step 2: Get Service Account from Backend ===" -ForegroundColor Yellow
$serviceAccountUrl = "$BACKEND_API_URL/api/auth/service-account"
$headers = @{
    "Authorization" = "Bearer $firebaseToken"
    "Content-Type" = "application/json"
}

try {
    $serviceAccountResponse = Invoke-RestMethod -Uri $serviceAccountUrl -Method Post -Headers $headers
    $serviceAccount = $serviceAccountResponse.serviceAccount
    Write-Host "✓ Service Account obtained: $($serviceAccount.client_email)" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to get service account: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Create JWT and get Google OAuth token
Write-Host "`n=== Step 3: Get Google OAuth Token ===" -ForegroundColor Yellow

# Create JWT manually (PowerShell doesn't have built-in JWT, so we'll use a workaround)
# For simplicity, let's use Node.js to create the JWT
$jwtScript = @"
const jose = require('jose');
const fs = require('fs');

async function main() {
    const serviceAccount = JSON.parse(fs.readFileSync('service_account_temp.json', 'utf-8'));
    
    const alg = 'RS256';
    const privateKeyString = serviceAccount.private_key.includes('\\n') 
        ? serviceAccount.private_key.replace(/\\n/g, '\n') 
        : serviceAccount.private_key;
    
    const privateKey = await jose.importPKCS8(privateKeyString, alg);
    
    const jwt = await new jose.SignJWT({
        scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.readonly'
    })
        .setProtectedHeader({ alg })
        .setIssuer(serviceAccount.client_email)
        .setSubject(serviceAccount.client_email)
        .setAudience('https://oauth2.googleapis.com/token')
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(privateKey);
    
    console.log(jwt);
}

main().catch(console.error);
"@

# Save service account to temp file
$serviceAccount | ConvertTo-Json -Depth 10 | Out-File -FilePath "service_account_temp.json" -Encoding UTF8
$jwtScript | Out-File -FilePath "create_jwt_temp.js" -Encoding UTF8

try {
    # Use Node.js to create JWT (we know jose is available from ui project)
    $jwt = node create_jwt_temp.js
    Write-Host "✓ JWT created" -ForegroundColor Green
    
    # Exchange JWT for access token
    $tokenUrl = "https://oauth2.googleapis.com/token"
    $tokenBody = "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=$jwt"
    
    $tokenResponse = Invoke-RestMethod -Uri $tokenUrl -Method Post -Body $tokenBody -ContentType "application/x-www-form-urlencoded"
    $accessToken = $tokenResponse.access_token
    Write-Host "✓ Google Access Token obtained (length: $($accessToken.Length))" -ForegroundColor Green
    Write-Host "  Expires in: $($tokenResponse.expires_in) seconds" -ForegroundColor Gray
} catch {
    Write-Host "❌ Failed to get Google access token: $_" -ForegroundColor Red
    Remove-Item -Path "service_account_temp.json" -ErrorAction SilentlyContinue
    Remove-Item -Path "create_jwt_temp.js" -ErrorAction SilentlyContinue
    exit 1
} finally {
    # Clean up temp files
    Remove-Item -Path "service_account_temp.json" -ErrorAction SilentlyContinue
    Remove-Item -Path "create_jwt_temp.js" -ErrorAction SilentlyContinue
}

# Step 4: List Spreadsheets
Write-Host "`n=== Step 4: List Spreadsheets ===" -ForegroundColor Yellow
$query = "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false"
$encodedQuery = [System.Web.HttpUtility]::UrlEncode($query)
$driveUrl = "https://www.googleapis.com/drive/v3/files?q=$encodedQuery&fields=files(id,name)"

$driveHeaders = @{
    "Authorization" = "Bearer $accessToken"
    "Content-Type" = "application/json"
}

try {
    $driveResponse = Invoke-RestMethod -Uri $driveUrl -Method Get -Headers $driveHeaders
    $files = $driveResponse.files
    
    Write-Host "`n✓ Found $($files.Count) spreadsheets:" -ForegroundColor Green
    $i = 1
    foreach ($file in $files) {
        Write-Host "  $i. $($file.name) (ID: $($file.id))" -ForegroundColor White
        $i++
    }
    
    Write-Host "`n============================================================" -ForegroundColor Cyan
    if ($files.Count -gt 0) {
        Write-Host "✅ SUCCESS: Service account can access spreadsheets!" -ForegroundColor Green
        Write-Host "   Total spreadsheets found: $($files.Count)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  WARNING: No spreadsheets found" -ForegroundColor Yellow
        Write-Host "   This means the service account has no spreadsheets shared with it" -ForegroundColor Yellow
    }
    Write-Host "============================================================`n" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Failed to list spreadsheets: $_" -ForegroundColor Red
    Write-Host "Response: $($_.Exception.Response)" -ForegroundColor Red
    exit 1
}
