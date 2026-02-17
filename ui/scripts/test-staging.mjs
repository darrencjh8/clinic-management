#!/usr/bin/env node

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file (in root directory)
const envPath = path.resolve(__dirname, '../../.env');
const env = {};

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        // Handle Windows line endings (\r\n)
        const cleanLine = line.replace(/\r$/, '');

        // Skip blank lines and comments
        if (!cleanLine.trim() || cleanLine.trim().startsWith('#')) {
            return;
        }

        const match = cleanLine.match(/^([^=\s]+)\s*=\s*(.*)$/);
        if (match) {
            let value = match[2].trim();

            // Strip surrounding quotes (single or double)
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }

            env[match[1]] = value;
        }
    });
}

// Set up environment variables for E2E testing (match CI/CD naming)
const testEnv = {
    ...process.env,
    E2E_TEST_EMAIL: process.env.E2E_TEST_EMAIL || env.E2E_TEST_EMAIL || process.env.E2E_USERNAME || env.E2E_USERNAME,
    E2E_TEST_PASSWORD: process.env.E2E_TEST_PASSWORD || env.E2E_PASSWORD,
    BASE_URL: process.env.BASE_URL || env.BASE_URL || 'https://wisata-dental-staging.fly.dev',
};

// Validate credentials
if (!testEnv.E2E_TEST_EMAIL || !testEnv.E2E_TEST_PASSWORD) {
    console.error('❌ E2E credentials not found!');
    console.error('Please ensure your .env file contains:');
    console.error('E2E_USERNAME=your-email@example.com');
    console.error('E2E_PASSWORD=your-password');
    process.exit(1);
}

// Helper to mask email for logging
function maskEmail(email) {
    if (!email) return 'MISSING';
    const parts = email.split('@');
    if (parts.length !== 2) return 'INVALID_FORMAT';
    const [user, domain] = parts;
    const maskedUser = user.length > 2 ? `${user.substring(0, 2)}***` : `${user}***`;
    return `${maskedUser}@${domain}`;
}

console.log('🧪 Testing staging-flow.spec.ts against staging server...');
console.log(`📧 Email: ${maskEmail(testEnv.E2E_TEST_EMAIL)}`);
console.log(`🌐 Target: ${testEnv.BASE_URL}`);

// Change to UI directory
const uiDir = path.resolve(__dirname, '../');

// Run the staging flow test (exactly like CI/CD)
console.log('\n🚀 Running staging-flow.spec.ts...');

const testProcess = spawn('npx', [
    'playwright',
    'test',
    'tests/e2e/staging-flow.spec.ts',
    '--config=playwright-e2e.config.ts',
    '--project=chromium',
    '--workers=1'
], {
    cwd: uiDir,
    env: testEnv,
    stdio: 'inherit',
    shell: true
});

testProcess.on('close', (code) => {
    if (code === 0) {
        console.log('\n✅ staging-flow.spec.ts completed successfully!');
        console.log('🎉 Your staging environment is working correctly!');
    } else {
        console.log(`\n❌ staging-flow.spec.ts failed with exit code: ${code}`);
        console.log('🔍 Check the test output above for details');
        process.exit(code);
    }
});

testProcess.on('error', (error) => {
    console.error('❌ Failed to start test process:', error);
    process.exit(1);
});