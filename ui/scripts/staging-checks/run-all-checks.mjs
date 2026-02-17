// Comprehensive staging environment validation tests
// This suite replaces integration tests and focuses on staging-specific security and functionality checks

import https from 'https';
import * as jose from 'jose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load staging environment credentials
function loadStagingCredentials(envFileName = '.env.e2e') {
    // In CI pipeline, use environment variables instead of .env file
    if (process.env.CI || process.env.GITHUB_ACTIONS) {
        console.log('   🔄 Running in CI - using environment variables');

        const getEnvVar = (name, optional = false) => {
            const value = process.env[name];
            if (!value && !optional) {
                throw new Error(`Environment variable ${name} not set in CI environment`);
            }
            return value;
        };

        // In CI, BASE_URL must be set - fail fast if missing
        const frontendUrl = getEnvVar('BASE_URL');

        return {
            firebaseApiKey: getEnvVar('VITE_FIREBASE_API_KEY'),
            email: getEnvVar('E2E_TEST_EMAIL'),
            password: getEnvVar('E2E_TEST_PASSWORD'),
            backendUrl: getEnvVar('VITE_API_URL'),
            googleClientId: getEnvVar('VITE_GOOGLE_CLIENT_ID'),
            frontendUrl
        };
    }

    // Local development - use .env file
    const envPath = path.resolve(__dirname, '../../../', envFileName);
    let envContent = '';
    try {
        envContent = fs.readFileSync(envPath, 'utf8');
    } catch (e) {
        console.warn(`   ⚠️  .env file not found at ${envPath}, trying process.env`);
    }

    function getEnvVar(name, defaultValue) {
        if (process.env[name]) return process.env[name];
        if (envContent) {
            const match = envContent.match(new RegExp(`^${name}=(.*)$`, 'm'));
            if (match) return match[1];
        }
        if (defaultValue !== undefined) return defaultValue;
        throw new Error(`Environment variable ${name} not found in environment or ${envFileName}`);
    }

    return {
        firebaseApiKey: getEnvVar('VITE_FIREBASE_API_KEY'),
        email: getEnvVar('E2E_TEST_EMAIL'),
        password: getEnvVar('E2E_TEST_PASSWORD'),
        backendUrl: getEnvVar('VITE_API_URL'),
        googleClientId: getEnvVar('VITE_GOOGLE_CLIENT_ID'),
        frontendUrl: getEnvVar('BASE_URL', 'http://localhost:5173')
    };
}

function maskEmail(email) {
    if (!email) return 'MISSING';
    const parts = email.split('@');
    if (parts.length !== 2) return 'INVALID_FORMAT';
    const [user, domain] = parts;
    const maskedUser = user.length > 2 ? `${user.substring(0, 2)}***` : `${user}***`;
    return `${maskedUser}@${domain}`;
}

// Helper function to make HTTPS requests
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

// Test 4: Google Cloud Services Integration
async function testGoogleCloudServices(credentials, serviceAccount) {
    console.log('\n☁️  Staging Secret Check 4: Google Cloud Services Integration');
    console.log('   Purpose: Validate Google Cloud service account access and permissions');

    try {
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
            // Only log file details in debug mode to avoid leaking sensitive metadata
            if (process.env.DEBUG) {
                files.slice(0, 3).forEach((file, idx) => {
                    console.log(`      ${idx + 1}. ${file.name} (ID: ${file.id})`);
                });
            }
        }

        return { accessToken: tokenResponse.access_token, fileCount: files.length };
    } catch (error) {
        throw new Error(`Google Cloud services validation failed: ${error.message}`);
    }
}

// Test 5: UI Authentication Flow
async function testUIAuthenticationFlow(credentials) {
    console.log('\n🖥️  Staging Secret Check 5: UI Authentication Flow');
    console.log('   Purpose: Validate complete UI authentication flow with staging environment');

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();

    try {
        const page = await context.newPage();

        // ... (console logging setup)

        const targetUrl = credentials.frontendUrl;
        console.log('   Navigating to staging application...');
        console.log(`   Target URL: ${targetUrl}`);
        console.log('   Available environment variables:');
        console.log(`   - VITE_API_URL: ${credentials.backendUrl}`);
        console.log(`   - E2E_TEST_EMAIL: ${maskEmail(credentials.email)}`);

        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // ... (rest of the test logic, using credentials.email/password)

        // Wait for and fill email input
        const emailInput = page.locator('input[type="email"]');
        await emailInput.waitFor({ state: 'visible', timeout: 15000 });
        await emailInput.fill(credentials.email);

        // ... (rest of interactions)
        const passwordInput = page.locator('input[type="password"]');
        await passwordInput.waitFor({ state: 'visible' });
        await passwordInput.fill(credentials.password);

        const submitButton = page.locator('button[type="submit"]');
        await submitButton.waitFor({ state: 'visible' });

        // Wait for navigation after clicking submit
        await Promise.all([
            page.waitForLoadState('networkidle', { timeout: 15000 }),
            submitButton.click()
        ]);

        // Check for success indicators (PIN, Spreadsheet, or Main App)
        const pinScreen = page.locator('h2:has-text("Atur PIN")');
        const spreadsheetSetup = page.locator('text=/Setup Database|Pengaturan Database/i');
        const mainApp = page.locator('text=/New Treatment|Perawatan Baru|Treatment Entry|Entri Perawatan/i');

        if (await pinScreen.count() > 0) {
            console.log('   ✅ PIN screen detected - authentication successful');
        } else if (await spreadsheetSetup.count() > 0) {
            console.log('   ✅ Spreadsheet setup screen detected - authentication successful');
        } else if (await mainApp.count() > 0) {
            console.log('   ✅ Main app detected - authentication successful');
        } else {
            // Fallback check
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

// Test 6: CSP Configuration Validation (Re-implemented locally to avoid TS import)
async function testCSPConfiguration() {
    console.log('\n🔒 Staging Secret Check 6: CSP Configuration Validation');
    console.log('   Purpose: Validate Content Security Policy configuration for staging environment');

    try {
        // Load config directly from JSON
        const configPath = path.join(__dirname, '../../csp-config/csp-staging.json');
        if (!fs.existsSync(configPath)) {
            throw new Error('CSP configuration file not found for staging');
        }
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        console.log('   ✅ Staging CSP configuration loaded');

        // Validate
        if (config.environment !== 'staging') {
            throw new Error(`Configuration environment mismatch: expected staging, got ${config.environment}`);
        }
        console.log('   ✅ Staging CSP configuration validated');

        // Verify staging-specific content
        let connectSrc = config.directives['connect-src'] || [];
        // Normalize to array if it's a string
        if (!Array.isArray(connectSrc)) {
            if (typeof connectSrc === 'string') {
                connectSrc = connectSrc.split(/\s+/).filter(s => s.length > 0);
            } else {
                connectSrc = [];
            }
        }
        const hasStagingBackend = connectSrc.some(src => src.includes('wisata-dental-staging.fly.dev'));

        if (!hasStagingBackend) {
            throw new Error('Staging backend URL not found in CSP connect-src directive');
        }
        console.log('   ✅ Staging backend URL included in CSP');

        return true;
    } catch (error) {
        throw new Error(`CSP configuration validation failed: ${error.message}`);
    }
}

// Main test runner
async function runStagingSecretChecks() {
    console.log('🚀 Starting Comprehensive Staging Environment Validation');
    console.log('='.repeat(60));

    let googleResult;
    let credentials;
    let serviceAccount;
    let firebaseAuth;

    try {
        // Load staging credentials
        console.log('\n📋 Loading staging credentials...');
        credentials = loadStagingCredentials();
        console.log('   ✅ Credentials loaded successfully');
        console.log(`   📧 Test Email: ${maskEmail(credentials.email)}`);
        console.log(`   🌐 Backend URL: ${credentials.backendUrl}`);
        console.log(`   🔥 Firebase API Key: ${credentials.firebaseApiKey.substring(0, 10)}...`);

        // Test 1: Firebase Authentication
        console.log('\n🔥 Test 1: Firebase Authentication');
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

        firebaseAuth = await makeRequest(url, options, postData);

        if (!firebaseAuth.idToken || !firebaseAuth.refreshToken || !firebaseAuth.localId) {
            throw new Error('Missing required authentication tokens');
        }

        console.log('   ✅ Firebase authentication successful');
        console.log('   ✅ ID token obtained (length:', firebaseAuth.idToken.length, ')');
        console.log('   ✅ User ID:', firebaseAuth.localId);

        // Test 2: Backend API - Service Account Retrieval
        console.log('\n🌐 Test 2: Backend API - Service Account Retrieval');
        const serviceAccountUrl = `${credentials.backendUrl}/api/auth/service-account`;
        const serviceAccountOptions = {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${firebaseAuth.idToken}`,
                'Content-Type': 'application/json'
            }
        };

        const serviceAccountResponse = await makeRequest(serviceAccountUrl, serviceAccountOptions);

        if (!serviceAccountResponse.serviceAccount || !serviceAccountResponse.serviceAccount.client_email) {
            throw new Error('Invalid service account response format');
        }

        serviceAccount = serviceAccountResponse.serviceAccount;
        console.log('   ✅ Service account endpoint accessible');
        console.log('   ✅ Service account obtained:', serviceAccount.client_email);

        // Test 3: Token Refresh
        console.log('\n🔄 Test 3: Firebase Token Refresh');
        const refreshUrl = `https://securetoken.googleapis.com/v1/token?key=${credentials.firebaseApiKey}`;
        const refreshPostData = `grant_type=refresh_token&refresh_token=${encodeURIComponent(firebaseAuth.refreshToken)}`;
        const refreshOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(refreshPostData)
            }
        };

        const refreshResponse = await makeRequest(refreshUrl, refreshOptions, refreshPostData);

        if (!refreshResponse.id_token || !refreshResponse.refresh_token) {
            throw new Error('Missing tokens in refresh response');
        }

        console.log('   ✅ Token refresh successful');
        console.log('   ✅ New ID token obtained');

        // Test 4: Google Cloud Services
        googleResult = await testGoogleCloudServices(credentials, serviceAccount);

        // Test 5: UI Authentication Flow
        await testUIAuthenticationFlow(credentials);

        // Test 6: CSP Configuration
        await testCSPConfiguration();

        console.log('\n' + '='.repeat(60));
        console.log('✅ All Staging Secret Checks Passed!');
        console.log('='.repeat(60));

        return {
            success: true,
            summary: {
                spreadsheetsFound: googleResult.fileCount,
                userId: firebaseAuth.localId,
                serviceAccountEmail: serviceAccount.client_email
            }
        };

    } catch (error) {
        console.error('\n' + '='.repeat(60));
        console.error('❌ Staging Secret Checks Failed!');
        console.error('='.repeat(60));
        console.error('Error:', error.message);
        throw error;
    }
}

// Run the staging secret checks if this file is executed directly
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
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