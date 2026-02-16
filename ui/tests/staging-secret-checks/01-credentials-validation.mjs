// Staging Secret Check: Environment Credentials Validation
// Purpose: Verify all staging environment variables are properly configured

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function validateStagingCredentials(envFileName = '.env.e2e') {
    console.log('🔐 Staging Secret Check: Environment Credentials Validation');
    console.log('   Purpose: Verify all staging environment variables are properly configured');
    
    try {
        const envPath = path.resolve(__dirname, '../../', envFileName);
        const envContent = fs.readFileSync(envPath, 'utf8');
        
        function getEnvVar(name) {
            const match = envContent.match(new RegExp(`^${name}=(.*)$`, 'm'));
            if (!match) {
                throw new Error(`Environment variable ${name} not found in ${envFileName}`);
            }
            return match[1];
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
        if (!credentials.backendUrl.includes('staging')) {
            throw new Error('Backend URL does not appear to be staging environment');
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