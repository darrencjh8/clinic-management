// Staging Secret Check: Environment Credentials Validation
// Purpose: Verify all staging environment variables are properly configured

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Determines if a URL is a staging environment URL.
 * Checks against configured patterns or falls back to common staging tokens.
 * Configuration via:
 * - STAGING_URL_REGEX: A regex pattern (e.g., "(staging|stg|test)")
 * - STAGING_URL_KEYWORDS: Comma-separated keywords (e.g., "staging,stg,test")
 * @param {string} url - The URL to check
 * @returns {boolean} True if the URL appears to be a staging environment
 */
function isStagingUrl(url) {
    // Check for configured regex pattern
    if (process.env.STAGING_URL_REGEX) {
        try {
            const regex = new RegExp(process.env.STAGING_URL_REGEX, 'i');
            return regex.test(url);
        } catch (error) {
            console.warn('   ⚠️  Invalid STAGING_URL_REGEX, falling back to default pattern');
        }
    }

    // Check for configured keywords
    if (process.env.STAGING_URL_KEYWORDS) {
        const keywords = process.env.STAGING_URL_KEYWORDS.split(',').map(k => k.trim());
        return keywords.some(keyword => url.toLowerCase().includes(keyword.toLowerCase()));
    }

    // Default: common staging environment patterns
    // Matches: staging, stg, -stg, test, -test, dev, -dev, qa, -qa, uat, -uat
    const defaultPattern = /(staging|\bstg\b|-stg|\btest\b|-test|\bdev\b|-dev|\bqa\b|-qa|\buat\b|-uat)/i;
    return defaultPattern.test(url);
}

export async function validateStagingCredentials(envFileName = '.env') {
    console.log('🔐 Staging Secret Check: Environment Credentials Validation');
    console.log('   Purpose: Verify all staging environment variables are properly configured');

    try {
        // In CI pipeline, use environment variables instead of .env file
        const isCI = process.env.CI || process.env.GITHUB_ACTIONS;

        let envContent = '';
        if (!isCI) {
            const envPath = path.resolve(__dirname, '../../', envFileName);
            try {
                envContent = fs.readFileSync(envPath, 'utf8');
                console.log(`   📄 Reading from ${envFileName} file`);
            } catch (error) {
                console.log(`   ⚠️  ${envFileName} file not found, using environment variables`);
            }
        } else {
            console.log('   🔄 Running in CI - using environment variables');
        }

        function getEnvVar(name) {
            // Check environment variables first (for CI)
            if (process.env[name]) {
                return process.env[name];
            }

            // Fall back to .env file content
            if (envContent) {
                const match = envContent.match(new RegExp(`^${name}=(.*)$`, 'm'));
                if (match) {
                    let value = match[1];

                    // Strip inline comments (everything after #)
                    const commentIndex = value.indexOf('#');
                    if (commentIndex !== -1) {
                        value = value.substring(0, commentIndex);
                    }

                    // Trim whitespace
                    value = value.trim();

                    // Remove surrounding quotes (single or double)
                    if ((value.startsWith('"') && value.endsWith('"')) ||
                        (value.startsWith("'") && value.endsWith("'"))) {
                        value = value.slice(1, -1);
                    }

                    return value;
                }
            }

            throw new Error(`Environment variable ${name} not found in environment or ${envFileName}`);
        }

        const credentials = {
            firebaseApiKey: getEnvVar('VITE_FIREBASE_API_KEY'),
            email: getEnvVar('E2E_TEST_EMAIL'),
            password: getEnvVar('E2E_TEST_PASSWORD'),
            backendUrl: getEnvVar('VITE_API_URL'),
            googleClientId: getEnvVar('VITE_GOOGLE_CLIENT_ID'),
            clientSecret: getEnvVar('VITE_CLIENT_SECRET'),
            clinicName: getEnvVar('VITE_CLINIC_NAME'),
            firebaseAuthDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN'),
            firebaseProjectId: getEnvVar('VITE_FIREBASE_PROJECT_ID'),
            firebaseStorageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET'),
            firebaseMessagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID'),
            firebaseAppId: getEnvVar('VITE_FIREBASE_APP_ID')
        };

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

        // Validate Backend URL (must be staging)
        if (!credentials.backendUrl || !credentials.backendUrl.startsWith('https://')) {
            throw new Error('Invalid staging backend URL');
        }
        if (!isStagingUrl(credentials.backendUrl)) {
            throw new Error('Backend URL does not appear to be staging environment. Configure STAGING_URL_REGEX or STAGING_URL_KEYWORDS if needed.');
        }
        console.log('   ✅ Staging backend URL valid:', credentials.backendUrl);

        // Validate Google Client ID
        if (!credentials.googleClientId || !credentials.googleClientId.endsWith('.apps.googleusercontent.com')) {
            throw new Error('Invalid Google Client ID format');
        }
        console.log('   ✅ Google Client ID format valid');

        // Validate Firebase Configuration
        if (!credentials.firebaseAuthDomain || !credentials.firebaseAuthDomain.includes('firebaseapp.com')) {
            throw new Error('Invalid Firebase auth domain');
        }
        console.log('   ✅ Firebase auth domain valid');

        if (!credentials.firebaseProjectId || credentials.firebaseProjectId.length < 3) {
            throw new Error('Invalid Firebase project ID');
        }
        console.log('   ✅ Firebase project ID valid');

        console.log('   🎉 All staging environment credentials validated successfully!');

        return credentials;
    } catch (error) {
        throw new Error(`Environment credentials validation failed: ${error.message}`);
    }
}

// Run validation if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    validateStagingCredentials()
        .then(credentials => {
            console.log('\n✅ Staging credentials validation completed');
            console.log('   Backend URL:', credentials.backendUrl);
            console.log('   Firebase Project:', credentials.firebaseProjectId);
            console.log('   Test Email:', credentials.email);
        })
        .catch(error => {
            console.error('\n❌ Validation failed:', error.message);
            process.exit(1);
        });
}