# Service account credentials
$serviceAccount = @{
    type = "service_account"
    project_id = "wisata-dental"
    private_key_id = "1ff9eb50d54cc8306e085f6d7bbde1b0036de363"
    private_key = "-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC0Kdd5Mb3Ykhy6
zTUDuG6684iCR+EMUe/to3RmcHOUBOb6QQ5rmzh9wpRu6zMtufaZ0NTA+GGWIPdf
rufMzgY8yhRLJfKdmmbog0eF53NQQJtLbbW7RIT9A0mye7xLcHklNt44SnCPdD3UL
nVWfbPbpitWtv668Ww2yuzAvFsFtFocO20bCh53fs3P8HeCrWQPzJScxw0JvTNKp
sNJ3d77+lh9Uipga7k+Y4syOKhwzviXBSwB3f4MfQMFveiRLD8RPYVzcLbL3Sks9
fHR4K8BElfh0qTSN+ysi6/HXrFbV7DP7ZhLXDtvv/PE8zXczLI4BVFZNmtsQHuRDH
R3xle/I/AgMBAAECggEAPZQPkdzuhpdqOm7pL9xZ/IxAnEb1JMDcwNydbGYDGxSR
3fdedmkXZeSb102MsJRfNTOrhElhEW8zHgEqOVYxy5VGWmkeA8BCbDZyu9HgGA39
Bkr5UoiY6+Gzzs18DkzjG1UUlkjbMC0K9PrsICPW1bx2E614Y20hD5lMUpQOiGSaH
FnwN4jK7+alkWjhvvptUvneqHPAy/+XwTIvhTUdzv5k2EhOvlmTFcbEcKapVvxd9
tZPUEMXL68/jVys46Bgog7XpY0ajdefz6rWBpg/qzdOxnr+y8JI50Ol8gLNGDQoI
PEPpWmWWaYWAQUgg9yRupjOly3aZ+Qr//PyElUOf4AQKBgQDfczr8vG0Z1+I0sfCM
494VLfHFbuXAuHxthTZiTi+k4gt70llkbJTY30lS8lS3eMT2kPARZknxVDSiuwwB
LPZcAs+rCYNQQjBKo7zTXX9fDHPd10Y5I0JEtjJJaKFlP+pdygS/EbsNww9prSQA9
im5b5ciwg9BD0aae0PUXtPlYmQKBgQDOaGPleO5JAkUzi602n9tClvqZHUL+PRyk
7mVvJG1kovnvFRkLs/fdmYZMr4IEcJUD4p+T86gTa6TQuh1/DotSCalQ/IogL9nj
3JEK2KTfap50AQdZ83C8VOqCphXWhQAhdUOj4a6hiiPow39hCQSXvTuZ9IvnuL4JU
twx9t6wwlwKBgQCCMxd86qI7u8Iv6Dr9LU1bU/EblJnFKPo/qq5cq6gxUBFW7eNu
k6JLmBeWgGOCoJlL/noT+WE+gE1HQOwmxzcpt+2fgKSGIHsZEr1U/5bXIF9nNSfS
5UuY0/0LLy9T2uFKEwue9crjoo2pitx+vvDi/zW2aBMRWsBOBWMpnLOlZiQKBgQCz
/wa2cxnhIxCz3adkjkzHqh/I7GKikSpsjdR48pxO+WzZWF2p/fw2DA64ywin1IGu
jK86d23n2aQ1vUfBqC5IkVJM5J2TagcqFQuLGNfWWQTrBoaho5B5O9fxrOI4W218
v+UHgeQmyy+vaOSo+xM9O/FA1ag3n7xhJxgMnksee6wKBgBWWkcTpgMarCHU6yZms
CMcNsJ6nEeNxVI+KgEv0NRa7/Nsyrnjp15wjczC913zrQ9uYnfjXu7aQQkmaunvF
ntO9At38trgl9ivikcVXQcd3cxxMVwAeDU+Cg+013bLxb077hdhajPK9DTDDwyM/s
dGLPvcuw7cS6uYGmVCoH0woh
-----END PRIVATE KEY-----"
    client_email = "google-sheet-bot@wisata-dental.iam.gserviceaccount.com"
    client_id = "103139026239620265246"
    auth_uri = "https://accounts.google.com/o/oauth2/auth"
    token_uri = "https://oauth2.googleapis.com/token"
    auth_provider_x509_cert_url = "https://www.googleapis.com/oauth2/v1/certs"
    client_x509_cert_url = "https://www.googleapis.com/robot/v1/metadata/x509/google-sheet-bot%40wisata-dental.iam.gserviceaccount.com"
    universe_domain = "googleapis.com"
}

# Create JWT for OAuth2
$header = @{
    alg = "RS256"
    typ = "JWT"
}

$now = [int][double]::Parse((Get-Date -UFormat %s))
$payload = @{
    iss = $serviceAccount.client_email
    scope = "https://www.googleapis.com/auth/spreadsheets.readonly"
    aud = $serviceAccount.token_uri
    exp = $now + 3600
    iat = $now
}

# Base64URL encode function
function ConvertTo-Base64Url($text) {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($text)
    $base64 = [System.Convert]::ToBase64String($bytes)
    return $base64.Replace('+', '-').Replace('/', '_').Replace('=', '')
}

# Encode header and payload
$headerJson = $header | ConvertTo-Json -Compress
$payloadJson = $payload | ConvertTo-Json -Compress

$encodedHeader = ConvertTo-Base64Url $headerJson
$encodedPayload = ConvertTo-Base64Url $payloadJson

# Create signature
$signingInput = "$encodedHeader.$encodedPayload"

# Load the private key and sign
$rsa = [System.Security.Cryptography.RSA]::Create()
$privateKeyBytes = [System.Text.Encoding]::UTF8.GetBytes($serviceAccount.private_key)
$rsa.ImportPkcs8PrivateKey($privateKeyBytes, [ref]$null)

$signature = $rsa.SignData([System.Text.Encoding]::UTF8.GetBytes($signingInput), [System.Security.Cryptography.HashAlgorithmName]::SHA256, [System.Security.Cryptography.RSASignaturePadding]::Pkcs1)
$encodedSignature = ConvertTo-Base64Url ([System.Convert]::ToBase64String($signature))

$jwt = "$signingInput.$encodedSignature"
Write-Host "JWT created successfully"

# Get OAuth token
$tokenResponse = Invoke-RestMethod -Uri $serviceAccount.token_uri -Method Post -Body @{
    grant_type = "urn:ietf:params:oauth:grant-type:jwt-bearer"
    assertion = $jwt
}

Write-Host "Access token obtained"
$accessToken = $tokenResponse.access_token

# List Google Sheets
$sheetsResponse = Invoke-RestMethod -Uri "https://sheets.googleapis.com/v4/spreadsheets" -Method Get -Headers @{
    Authorization = "Bearer $accessToken"
}

Write-Host "Google Sheets found:"
$sheetsResponse.spreadsheets | ForEach-Object {
    Write-Host "- $($_.properties.title) (ID: $($_.spreadsheetId))"
}

Write-Host "`nTotal sheets found: $($sheetsResponse.spreadsheets.Count)"
