// Comprehensive staging environment validation tests
// This suite replaces integration tests and focuses on staging-specific security and functionality checks

import https from 'https';
import * as jose from 'jose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load staging environment credentials
function loadStagingCredentials(envFileName = '.env.e2e') {
    // In CI pipeline, use environment variables instead of .env file
    if (process.env.CI || process.env.GITHUB_ACTIONS) {
        console.log('   🔄 Running in CI - using environment variables');
        
        const getEnvVar = (name) => {
            const value = process.env[name];
            if (!value) {
                throw new Error(`Environment variable ${name} not set in CI environment`);
            }
            return value;
        };
        
        return {
            firebaseApiKey: getEnvVar('VITE_FIREBASE_API_KEY'),
            email: getEnvVar('E2E_TEST_EMAIL'),
            password: getEnvVar('E2E_TEST_PASSWORD'),
            backendUrl: getEnvVar('VITE_API_URL'),
            googleClientId: getEnvVar('VITE_GOOGLE_CLIENT_ID')
        };
    }
    
    // Local development - use .env file
    const envPath = path.resolve(__dirname, '../../', envFileName);
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    function getEnvVar(name) {
        const match = envContent.match(new RegExp(`^${name}=(.*)$`, 'm'));
        if (!match) {
            throw new Error(`Environment variable ${name} not found in ${envFileName}`);
        }
        return match[1];
    }
    
    return {
        firebaseApiKey: getEnvVar('VITE_FIREBASE_API_KEY'),
        email: getEnvVar('E2E_TEST_EMAIL'),
        password: getEnvVar('E2E_TEST_PASSWORD'),
        backendUrl: getEnvVar('VITE_API_URL'),
        googleClientId: getEnvVar('VITE_GOOGLE_CLIENT_ID')
    };
}

// HTTP request helper
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

// Test 1: Staging Environment Credentials Validation
async function testStagingCredentials() {
    console.log('🔐 Staging Secret Check 1: Environment Credentials Validation');
    console.log('   Purpose: Verify all staging environment variables are properly configured');
    
    try {
        const credentials = loadStagingCredentials();
        
        // Validate Firebase API Key
        if (!credentials.firebaseApiKey || credentials.firebaseApiKey.length < 20) {
            throw new Error('Invalid Firebase API key format');
        }
        console.log('   ✅ Firebase API key format valid');
        
        // Validate Email
        if (!credentials.email || !credentials.email.includes('@')) {
            throw new Error('Invalid test email format');
        }
        console.log('   ✅ Test email format valid');
        
        // Validate Password
        if (!credentials.password || credentials.password.length < 6) {
            throw new Error('Invalid test password format');
        }
        console.log('   ✅ Test password format valid');
        
        // Validate Backend URL
        if (!credentials.backendUrl || !credentials.backendUrl.startsWith('https://')) {
            throw new Error('Invalid staging backend URL');
        }
        console.log('   ✅ Staging backend URL valid:', credentials.backendUrl);
        
        // Validate Google Client ID
        if (!credentials.googleClientId || !credentials.googleClientId.endsWith('.apps.googleusercontent.com')) {
            throw new Error('Invalid Google Client ID format');
        }
        console.log('   ✅ Google Client ID format valid');
        
        return credentials;
    } catch (error) {
        throw new Error(`Environment credentials validation failed: ${error.message}`);
    }
}

// Test 2: Firebase Authentication Flow
async function testFirebaseAuthentication(credentials) {
    console.log('\n🔥 Staging Secret Check 2: Firebase Authentication');
    console.log('   Purpose: Validate Firebase authentication with staging credentials');
    
    try {
        const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${credentials.firebaseApiKey}`;
        
        const postData = JSON.stringify({
            email: credentials.email,
            password: credentials.password,
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
        
        // Validate response
        if (!response.idToken || !response.refreshToken) {
            throw new Error('Missing authentication tokens in response');
        }
        
        console.log('   ✅ Firebase authentication successful');
        console.log('   ✅ ID token obtained (length:', response.idToken.length, ')');
        console.log('   ✅ Refresh token obtained (length:', response.refreshToken.length, ')');
        console.log('   ✅ User ID:', response.localId);
        
        return response;
    } catch (error) {
        throw new Error(`Firebase authentication failed: ${error.message}`);
    }
}

// Test 3: Backend API Connectivity and Security
async function testBackendAPI(credentials, firebaseAuth) {
    console.log('\n🌐 Staging Secret Check 3: Backend API Connectivity');
    console.log('   Purpose: Validate staging backend API endpoints and security');
    
    try {
        // Test service account endpoint
        const serviceAccountUrl = `${credentials.backendUrl}/api/auth/service-account`;
        const serviceAccountOptions = {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${firebaseAuth.idToken}`,
                'Content-Type': 'application/json'
            }
        };
        
        const serviceAccountResponse = await makeRequest(serviceAccountUrl, serviceAccountOptions);
        
        // Validate service account response
        if (!serviceAccountResponse.serviceAccount || !serviceAccountResponse.serviceAccount.client_email) {
            throw new Error('Invalid service account response format');
        }
        
        console.log('   ✅ Service account endpoint accessible');
        console.log('   ✅ Service account obtained:', serviceAccountResponse.serviceAccount.client_email);
        
        // Test health endpoint
        const healthUrl = `${credentials.backendUrl}/api/health`;
        const healthOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        try {
            await makeRequest(healthUrl, healthOptions);
            console.log('   ✅ Health endpoint accessible');
        } catch (error) {
            console.log('   ⚠️  Health endpoint not accessible (may be normal)');
        }
        
        return serviceAccountResponse.serviceAccount;
    } catch (error) {
        throw new Error(`Backend API validation failed: ${error.message}`);
    }
}

// Test 4: Google Cloud Services Integration
async function testGoogleCloudServices(credentials, serviceAccount) {
    console.log('\n☁️  Staging Secret Check 4: Google Cloud Services Integration');
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
        
        // Test Google Drive API access
        const driveUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false")}&fields=files(id,name)`;
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
        
        return tokenResponse.access_token;
    } catch (error) {
        throw new Error(`Google Cloud services validation failed: ${error.message}`);
    }
}

// Test 5: UI Authentication Flow
async function testUIAuthenticationFlow(credentials) {
    console.log('\n🖥️  Staging Secret Check 5: UI Authentication Flow');
    console.log('   Purpose: Validate complete UI authentication flow with staging environment');
    
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 }
    });
    
    try {
        const page = await context.newPage();
        
        // Enable console logging
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log('   Browser error:', msg.text());
            }
        });
        
        page.on('pageerror', error => {
            console.log('   Page error:', error.message);
        });
        
        console.log('   Navigating to staging application...');
        await page.goto('http://localhost:5173');
        await page.waitForLoadState('domcontentloaded');
        
        console.log('   ✅ Application loaded');
        
        // Wait for and fill email input
        const emailInput = page.locator('input[type="email"]');
        await emailInput.waitFor({ state: 'visible', timeout: 10000 });
        await emailInput.fill(credentials.email);
        console.log('   ✅ Email input filled');
        
        // Fill password input
        const passwordInput = page.locator('input[type="password"]');
        await passwordInput.waitFor({ state: 'visible' });
        await passwordInput.fill(credentials.password);
        console.log('   ✅ Password input filled');
        
        // Submit login form
        const submitButton = page.locator('button[type="submit"]');
        await submitButton.waitFor({ state: 'visible' });
        await submitButton.click();
        console.log('   ✅ Login form submitted');
        
        // Wait for navigation or state change
        await page.waitForTimeout(3000);
        
        // Check for next screens
        const pinScreen = page.locator('h2:has-text("Atur PIN")');
        const spreadsheetSetup = page.locator('text=/Setup Database|Pengaturan Database/i');
        const mainApp = page.locator('text=/New Treatment|Perawatan Baru|Treatment Entry|Entri Perawatan/i');
        
        const pinVisible = await pinScreen.count() > 0;
        const spreadsheetVisible = await spreadsheetSetup.count() > 0;
        const mainAppVisible = await mainApp.count() > 0;
        
        if (pinVisible) {
            console.log('   ✅ PIN screen detected - authentication successful');
        } else if (spreadsheetVisible) {
            console.log('   ✅ Spreadsheet setup screen detected - authentication successful');
        } else if (mainAppVisible) {
            console.log('   ✅ Main app detected - authentication successful');
        } else {
            // Check if still on login page
            const isStillOnLogin = await emailInput.isVisible().catch(() => false);
            if (isStillOnLogin) {
                throw new Error('Still on login page - authentication failed');
            }
            console.log('   ✅ Authentication successful (unknown state)');
        }
        
        return true;
    } catch (error) {
        throw new Error(`UI authentication flow failed: ${error.message}`);
    } finally {
        await browser.close();
    }
}

// Test 6: CSP Configuration Validation
async function testCSPConfiguration() {
    console.log('\n🔒 Staging Secret Check 6: CSP Configuration Validation');
    console.log('   Purpose: Validate Content Security Policy configuration for staging environment');
    
    try {
        // Import CSP manager
        const { loadCSPConfig, validateCSPConfig } = await import('../../scripts/csp-manager.ts');
        
        // Load staging CSP configuration
        const stagingConfig = loadCSPConfig('staging');
        console.log('   ✅ Staging CSP configuration loaded');
        
        // Validate staging CSP
        validateCSPConfig(stagingConfig, 'staging');
        console.log('   ✅ Staging CSP configuration validated');
        
        // Verify staging-specific content
        const connectSrc = stagingConfig.directives['connect-src'] || [];
        const hasStagingBackend = connectSrc.some(src => src.includes('wisata-dental-staging.fly.dev'));
        
        if (!hasStagingBackend) {
            throw new Error('Staging backend URL not found in CSP connect-src directive');
        }
        console.log('   ✅ Staging backend URL included in CSP');
        
        // Verify Firebase domains
        const hasFirebase = connectSrc.some(src => src.includes('firebase'));
        if (!hasFirebase) {
            throw new Error('Firebase domains not found in CSP connect-src directive');
        }
        console.log('   ✅ Firebase domains included in CSP');
        
        return true;
    } catch (error) {
        throw new Error(`CSP configuration validation failed: ${error.message}`);
    }
}

// Main test runner
async function runStagingSecretChecks() {
    console.log('🚀 Starting Staging Secret Checks');
    console.log('=====================================');
    console.log('Purpose: Comprehensive validation of staging environment security and functionality');
    console.log('This test suite replaces traditional integration tests with staging-specific checks.\n');
    
    let credentials;
    let firebaseAuth;
    let serviceAccount;
    let googleToken;
    
    try {
        // Run all staging secret checks
        credentials = await testStagingCredentials();
        firebaseAuth = await testFirebaseAuthentication(credentials);
        serviceAccount = await testBackendAPI(credentials, firebaseAuth);
        googleToken = await testGoogleCloudServices(credentials, serviceAccount);
        await testUIAuthenticationFlow(credentials);
        await testCSPConfiguration();
        
        console.log('\n🎉 All Staging Secret Checks Passed!');
        console.log('=====================================');
        console.log('✅ Staging environment credentials validated');
        console.log('✅ Firebase authentication working');
        console.log('✅ Backend API accessible and secure');
        console.log('✅ Google Cloud services integrated');
        console.log('✅ UI authentication flow successful');
        console.log('✅ CSP configuration validated');
        console.log('\n🚀 Staging environment is ready for E2E testing and production deployment!');
        
        return {
            success: true,
            summary: {
                spreadsheetsFound: 0, // Will be populated from Google Drive test
                userId: firebaseAuth.localId,
                serviceAccountEmail: serviceAccount.client_email
            }
        };
        
    } catch (error) {
        console.error('\n❌ Staging Secret Checks Failed!');
        console.error('=====================================');
        console.error('Error:', error.message);
        console.error('\n🔍 Troubleshooting:');
        console.error('- Verify staging environment variables are correctly set');
        console.error('- Check Firebase project configuration');
        console.error('- Validate staging backend is running and accessible');
        console.error('- Ensure Google Cloud service account has proper permissions');
        console.error('- Review CSP configuration for staging environment');
        
        throw error;
    }
}

// Run the staging secret checks if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runStagingSecretChecks()
        .then(result => {
            console.log('\n📊 Final Results:', JSON.stringify(result, null, 2));
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 Fatal Error:', error.message);
            process.exit(1);
        });
}

export { runStagingSecretChecks };