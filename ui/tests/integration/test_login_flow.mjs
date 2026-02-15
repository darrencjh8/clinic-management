// Test the complete staff login flow
import https from 'https';
import * as jose from 'jose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get env file from command line argument or default to .env.e2e
const envFileName = process.argv[2] || '.env.e2e';

// Load credentials from specified env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../', envFileName);
const envContent = fs.readFileSync(envPath, 'utf8');

function getEnvVar(name) {
    const match = envContent.match(new RegExp(`^${name}=(.*)$`, 'm'));
    if (!match) {
        throw new Error(`Environment variable ${name} not found in ${envFileName}`);
    }
    return match[1];
}

const FIREBASE_API_KEY = getEnvVar('VITE_FIREBASE_API_KEY');
const EMAIL = getEnvVar('E2E_TEST_EMAIL');
const PASSWORD = getEnvVar('E2E_TEST_PASSWORD');
const BACKEND_API_URL = getEnvVar('VITE_API_URL');

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

async function firebaseLogin() {
    console.log('\n=== Step 1: Firebase Login ===');
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`;
    
    const postData = JSON.stringify({
        email: EMAIL,
        password: PASSWORD,
        returnSecureToken: true
    });
    
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };
    
    const response = await makeRequest(url, options, postData);
    const idToken = response.idToken;
    console.log(`✓ Firebase ID Token obtained (length: ${idToken.length})`);
    return idToken;
}

async function getServiceAccount(firebaseToken) {
    console.log('\n=== Step 2: Get Service Account from Backend ===');
    const url = `${BACKEND_API_URL}/api/auth/service-account`;
    
    const options = {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${firebaseToken}`,
            'Content-Type': 'application/json'
        }
    };
    
    const response = await makeRequest(url, options);
    const serviceAccount = response.serviceAccount;
    console.log(`✓ Service Account obtained: ${serviceAccount.client_email}`);
    return serviceAccount;
}

async function getGoogleAccessToken(serviceAccount) {
    console.log('\n=== Step 3: Get Google OAuth Token ===');
    
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
    
    console.log('✓ JWT created');
    
    // Exchange JWT for access token
    const postData = `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`;
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData)
        }
    };
    
    const response = await makeRequest('https://oauth2.googleapis.com/token', options, postData);
    const accessToken = response.access_token;
    console.log(`✓ Google Access Token obtained (length: ${accessToken.length})`);
    console.log(`  Expires in: ${response.expires_in} seconds`);
    return accessToken;
}

async function listSpreadsheets(accessToken) {
    console.log('\n=== Step 4: List Spreadsheets ===');
    
    const query = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`;
    
    const options = {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        }
    };
    
    const response = await makeRequest(url, options);
    const files = response.files || [];
    
    console.log(`\n✓ Found ${files.length} spreadsheets:`);
    files.forEach((file, idx) => {
        console.log(`  ${idx + 1}. ${file.name} (ID: ${file.id})`);
    });
    
    return files;
}

async function main() {
    console.log('============================================================');
    console.log('Testing Complete Staff Login Flow');
    console.log('============================================================');
    
    try {
        const firebaseToken = await firebaseLogin();
        const serviceAccount = await getServiceAccount(firebaseToken);
        const googleToken = await getGoogleAccessToken(serviceAccount);
        const spreadsheets = await listSpreadsheets(googleToken);
        
        console.log('\n============================================================');
        if (spreadsheets.length > 0) {
            console.log('✅ SUCCESS: Service account can access spreadsheets!');
            console.log(`   Total spreadsheets found: ${spreadsheets.length}`);
        } else {
            console.log('⚠️  WARNING: No spreadsheets found');
            console.log('   This means the service account has no spreadsheets shared with it');
        }
        console.log('============================================================\n');
        
    } catch (error) {
        console.log('\n============================================================');
        console.log('❌ TEST FAILED:', error.message);
        console.log('============================================================\n');
        process.exit(1);
    }
}

main();
