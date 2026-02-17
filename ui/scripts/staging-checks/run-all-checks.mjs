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

// ... (imports remain)

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

        return {
            firebaseApiKey: getEnvVar('VITE_FIREBASE_API_KEY'),
            email: getEnvVar('E2E_TEST_EMAIL'),
            password: getEnvVar('E2E_TEST_PASSWORD'),
            backendUrl: getEnvVar('VITE_API_URL'),
            googleClientId: getEnvVar('VITE_GOOGLE_CLIENT_ID'),
            frontendUrl: getEnvVar('BASE_URL') || 'http://localhost:4173' // Default to preview port in CI if not set, though BASE_URL should be set
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

// ... (makeRequest function remains the same)

// Test 4: Google Cloud Services Integration
async function testGoogleCloudServices(credentials, serviceAccount) {
    console.log('\n☁️  Staging Secret Check 4: Google Cloud Services Integration');
    console.log('   Purpose: Validate Google Cloud service account access and permissions');

    try {
        // ... (JWT creation logic remains the same)
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
            files.slice(0, 3).forEach((file, idx) => {
                console.log(`      ${idx + 1}. ${file.name} (ID: ${file.id})`);
            });
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
        await submitButton.click();

        // ... (verification logic)
        await page.waitForTimeout(5000); // Wait for navigation

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
        const connectSrc = config.directives['connect-src'] || [];
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
    // ...
    // Using the values
    let googleResult;

    try {
        // ...
        googleResult = await testGoogleCloudServices(credentials, serviceAccount);
        await testUIAuthenticationFlow(credentials);
        await testCSPConfiguration();

        // ...

        return {
            success: true,
            summary: {
                spreadsheetsFound: googleResult.fileCount,
                userId: firebaseAuth.localId,
                serviceAccountEmail: serviceAccount.client_email
            }
        };

    } catch (error) {
        // ... (error handling)
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