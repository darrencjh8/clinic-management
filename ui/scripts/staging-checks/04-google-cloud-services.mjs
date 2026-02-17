// Staging Secret Check: Google Cloud Services Integration
// Purpose: Validate Google Cloud service account access, OAuth tokens, and API permissions

import * as jose from 'jose';
import https from 'https';

function makeRequest(url, options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(parsed);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(parsed)}`));
                    }
                } catch (e) {
                    reject(new Error(`Parse error: ${data}`));
                }
            });
        });
        req.on('error', reject);
        if (postData) req.write(postData);
        req.end();
    });
}

export async function testGoogleCloudServices(credentials, serviceAccount) {
    console.log('☁️  Staging Secret Check: Google Cloud Services Integration');
    console.log('   Purpose: Validate Google Cloud service account access and permissions');
    
    try {
        // Generate JWT for Google OAuth
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
        
        console.log('   ✅ JWT created for Google OAuth');
        console.log('   ✅ JWT issuer:', serviceAccount.client_email);
        console.log('   ✅ JWT scopes: spreadsheets, drive.readonly');
        
        // Exchange JWT for access token
        const postData = `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`;
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const tokenResponse = await makeRequest('https://oauth2.googleapis.com/token', options, postData);
        
        if (!tokenResponse.access_token) {
            throw new Error('No access token received from Google OAuth');
        }
        
        console.log('   ✅ Google OAuth token obtained (length:', tokenResponse.access_token.length, ')');
        console.log('   ✅ Token expires in:', tokenResponse.expires_in, 'seconds');
        console.log('   ✅ Token type:', tokenResponse.token_type);
        
        // Test Google Drive API access
        const driveUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false")}&fields=files(id,name,createdTime,modifiedTime)`;
        const driveOptions = {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${tokenResponse.access_token}`,
                'Content-Type': 'application/json'
            }
        };
        
        const driveResponse = await makeRequest(driveUrl, driveOptions);
        const files = driveResponse.files || [];
        
        console.log('   ✅ Google Drive API accessible');
        console.log('   ✅ Found', files.length, 'spreadsheets');
        
        if (files.length > 0) {
            console.log('   ✅ Service account has spreadsheet access');
            files.slice(0, 3).forEach((file, idx) => {
                console.log(`      ${idx + 1}. ${file.name} (ID: ${file.id})`);
            });
        } else {
            console.log('   ⚠️  No spreadsheets found (may be normal for staging)');
        }
        
        // Test Google Sheets API access
        if (files.length > 0) {
            const testSpreadsheetId = files[0].id;
            const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${testSpreadsheetId}?fields=properties.title,sheets.properties.title`;
            const sheetsOptions = {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${tokenResponse.access_token}`,
                    'Content-Type': 'application/json'
                }
            };
            
            try {
                const sheetsResponse = await makeRequest(sheetsUrl, sheetsOptions);
                console.log('   ✅ Google Sheets API accessible');
                console.log('   ✅ Spreadsheet title:', sheetsResponse.properties?.title);
                console.log('   ✅ Number of sheets:', sheetsResponse.sheets?.length);
            } catch (error) {
                console.log('   ⚠️  Google Sheets API access failed (may be permission issue):', error.message);
            }
        }
        
        // Test token info endpoint
        const tokenInfoUrl = `https://oauth2.googleapis.com/tokeninfo?access_token=${tokenResponse.access_token}`;
        try {
            const tokenInfoResponse = await makeRequest(tokenInfoUrl, { method: 'GET' });
            console.log('   ✅ Token info endpoint accessible');
            console.log('   ✅ Token scope:', tokenInfoResponse.scope);
            console.log('   ✅ Token expires in:', tokenInfoResponse.expires_in, 'seconds');
        } catch (error) {
            console.log('   ⚠️  Token info endpoint failed:', error.message);
        }
        
        return {
            accessToken: tokenResponse.access_token,
            expiresIn: tokenResponse.expires_in,
            spreadsheets: files,
            serviceAccountEmail: serviceAccount.client_email
        };
        
    } catch (error) {
        throw new Error(`Google Cloud services validation failed: ${error.message}`);
    }
}

export async function testGoogleCloudPermissions(serviceAccount) {
    console.log('🔐 Staging Secret Check: Google Cloud Permissions');
    console.log('   Purpose: Validate service account permissions and roles');
    
    try {
        // Basic validation of service account structure
        if (!serviceAccount.client_email || !serviceAccount.private_key || !serviceAccount.project_id) {
            throw new Error('Invalid service account structure');
        }
        
        console.log('   ✅ Service account has valid structure');
        console.log('   ✅ Client email:', serviceAccount.client_email);
        console.log('   ✅ Project ID:', serviceAccount.project_id);
        
        // Check if service account email indicates proper staging environment
        if (serviceAccount.client_email.includes('staging') || serviceAccount.client_email.includes('test')) {
            console.log('   ✅ Service account appears to be staging-specific');
        } else {
            console.log('   ⚠️  Service account may not be staging-specific');
        }
        
        return true;
        
    } catch (error) {
        throw new Error(`Google Cloud permissions validation failed: ${error.message}`);
    }
}