// Integration test for sessionStorage persistence after component lifecycle
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env variables
const envPath = path.resolve(__dirname, '../../.env.e2e');
const envContent = fs.readFileSync(envPath, 'utf8');

function getEnvVar(name) {
    const match = envContent.match(new RegExp(`^${name}=(.*)$`, 'm'));
    if (!match) {
        throw new Error(`Environment variable ${name} not found`);
    }
    return match[1];
}

const BASE_URL = process.argv[2] || 'http://localhost:5173';
const FIREBASE_API_KEY = getEnvVar('VITE_FIREBASE_API_KEY');
const EMAIL = getEnvVar('E2E_TEST_EMAIL');
const PASSWORD = getEnvVar('E2E_TEST_PASSWORD');

async function testSessionPersistence() {
    console.log('============================================================');
    console.log('Testing sessionStorage Persistence After Page Load');
    console.log('============================================================');
    console.log(`Target URL: ${BASE_URL}\n`);

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        // Step 1: Navigate to app
        console.log('=== Step 1: Load Application ===');
        await page.goto(BASE_URL);
        console.log('✓ Application loaded');

        // Step 2: Perform Firebase login
        console.log('\n=== Step 2: Firebase Login ===');
        await page.fill('input[type="email"]', EMAIL);
        await page.fill('input[type="password"]', PASSWORD);
        await page.click('button[type="submit"]');
        console.log('✓ Login form submitted');

        // Step 3: Wait for PIN setup or PIN check screen
        console.log('\n=== Step 3: Waiting for PIN Screen ===');
        await page.waitForSelector('text=/PIN|Set a PIN|Atur PIN/i', { timeout: 10000 });
        console.log('✓ PIN screen detected');

        // Step 4: Enter PIN (setup or check)
        console.log('\n=== Step 4: Enter PIN ===');
        const pinInput = page.locator('input[type="password"]').first();
        await pinInput.fill('123456');
        await page.click('button[type="submit"]');
        console.log('✓ PIN submitted');

        // If it was PIN setup, we need to confirm
        const confirmVisible = await page.locator('text=/Confirm|Konfirmasi/i').isVisible().catch(() => false);
        if (confirmVisible) {
            console.log('  Confirming PIN...');
            await pinInput.fill('123456');
            await page.click('button[type="submit"]');
            console.log('  ✓ PIN confirmed');
        }

        // Step 5: Wait a moment for sessionStorage to be set
        console.log('\n=== Step 5: Waiting for Session Setup ===');
        await page.waitForTimeout(2000);

        // Step 6: Check sessionStorage BEFORE any navigation
        console.log('\n=== Step 6: Check sessionStorage ===');
        const sessionBefore = await page.evaluate(() => {
            return {
                encrypted_service_account: sessionStorage.getItem('encrypted_service_account'),
                google_access_token: sessionStorage.getItem('google_access_token'),
                allKeys: Object.keys(sessionStorage)
            };
        });

        console.log('sessionStorage contents:');
        console.log(`  encrypted_service_account: ${sessionBefore.encrypted_service_account ? 'PRESENT (length: ' + sessionBefore.encrypted_service_account.length + ')' : 'MISSING'}`);
        console.log(`  google_access_token: ${sessionBefore.google_access_token ? 'PRESENT (length: ' + sessionBefore.google_access_token.length + ')' : 'MISSING'}`);
        console.log(`  All keys: ${sessionBefore.allKeys.join(', ')}`);

        // Step 7: Wait for spreadsheet setup screen to ensure we've fully progressed
        console.log('\n=== Step 7: Waiting for Spreadsheet Selection ===');
        try {
            await page.waitForSelector('text=/Pengaturan Database|Database Setup|Spreadsheet/i', { timeout: 10000 });
            console.log('✓ Spreadsheet selection screen detected');
        } catch (e) {
            console.log('⚠️  Spreadsheet selection screen not detected (may still be loading)');
        }

        // Step 8: Check sessionStorage AFTER navigation to spreadsheet selection
        console.log('\n=== Step 8: Check sessionStorage After Navigation ===');
        const sessionAfter = await page.evaluate(() => {
            return {
                encrypted_service_account: sessionStorage.getItem('encrypted_service_account'),
                google_access_token: sessionStorage.getItem('google_access_token'),
                allKeys: Object.keys(sessionStorage)
            };
        });

        console.log('sessionStorage contents after navigation:');
        console.log(`  encrypted_service_account: ${sessionAfter.encrypted_service_account ? 'PRESENT (length: ' + sessionAfter.encrypted_service_account.length + ')' : 'MISSING'}`);
        console.log(`  google_access_token: ${sessionAfter.google_access_token ? 'PRESENT (length: ' + sessionAfter.google_access_token.length + ')' : 'MISSING'}`);
        console.log(`  All keys: ${sessionAfter.allKeys.join(', ')}`);

        // Step 9: Verify persistence
        console.log('\n============================================================');
        if (sessionAfter.encrypted_service_account) {
            console.log('✅ SUCCESS: encrypted_service_account persisted in sessionStorage!');
            console.log('   This means the service account key survives component lifecycle');
        } else {
            console.log('❌ FAILURE: encrypted_service_account was lost from sessionStorage');
            console.log('   This indicates a bug where sessionStorage is being cleared');
            
            // Additional debugging info
            if (sessionBefore.encrypted_service_account && !sessionAfter.encrypted_service_account) {
                console.log('\n   Key was present after PIN setup but lost during navigation');
                console.log('   Possible causes:');
                console.log('   1. sessionStorage.clear() being called');
                console.log('   2. Hard page reload (window.location.href or location.reload())');
                console.log('   3. Context being destroyed');
            }
            
            process.exit(1);
        }
        console.log('============================================================\n');

    } catch (error) {
        console.log('\n============================================================');
        console.log('❌ TEST FAILED:', error.message);
        console.log('============================================================\n');
        
        // Take screenshot on failure
        await page.screenshot({ path: 'session-persistence-failure.png', fullPage: true });
        console.log('Screenshot saved to: session-persistence-failure.png');
        
        await browser.close();
        process.exit(1);
    }

    await browser.close();
}

testSessionPersistence();
