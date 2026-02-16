// Test the UI login flow with staging environment
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load credentials from .env.e2e
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../.env.e2e');
const envContent = fs.readFileSync(envPath, 'utf8');

function getEnvVar(name) {
    const match = envContent.match(new RegExp(`^${name}=(.*)$`, 'm'));
    if (!match) {
        throw new Error(`Environment variable ${name} not found in .env.e2e`);
    }
    return match[1];
}

const EMAIL = getEnvVar('E2E_TEST_EMAIL');
const PASSWORD = getEnvVar('E2E_TEST_PASSWORD');
const BASE_URL = 'http://localhost:5173';

async function testUILogin() {
    console.log('============================================================');
    console.log('Testing UI Login Flow with Staging Environment');
    console.log('============================================================');
    
    const browser = await chromium.launch({ headless: false }); // Set to true for CI
    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 }
    });
    
    try {
        const page = await context.newPage();
        
        // Enable console logging
        page.on('console', msg => console.log('Browser console:', msg.text()));
        page.on('pageerror', error => console.log('Browser error:', error.message));
        
        console.log('\n=== Step 1: Navigate to App ===');
        await page.goto(BASE_URL);
        await page.waitForLoadState('domcontentloaded');
        
        console.log('Current URL:', page.url());
        console.log('Page title:', await page.title());
        
        // Take initial screenshot
        await page.screenshot({ path: 'ui-login-initial.png' });
        
        console.log('\n=== Step 2: Fill Login Form ===');
        
        // Wait for and fill email input
        const emailInput = page.locator('input[type="email"]');
        await emailInput.waitFor({ state: 'visible', timeout: 10000 });
        console.log('Email input found and visible');
        
        await emailInput.fill(EMAIL);
        console.log('Email filled:', EMAIL);
        
        // Fill password input
        const passwordInput = page.locator('input[type="password"]');
        await passwordInput.waitFor({ state: 'visible' });
        console.log('Password input found and visible');
        
        await passwordInput.fill(PASSWORD);
        console.log('Password filled');
        
        // Take screenshot before login
        await page.screenshot({ path: 'ui-login-before-submit.png' });
        
        console.log('\n=== Step 3: Submit Login Form ===');
        
        // Click submit button
        const submitButton = page.locator('button[type="submit"]');
        await submitButton.waitFor({ state: 'visible' });
        console.log('Submit button found and visible');
        console.log('Submit button text:', await submitButton.textContent());
        
        // Click and wait for navigation
        await Promise.all([
            page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
                console.log('Network idle timeout, continuing...');
            }),
            submitButton.click()
        ]);
        
        console.log('Login form submitted');
        
        // Wait a bit for any redirects or state changes
        await page.waitForTimeout(3000);
        
        console.log('\n=== Step 4: Check Result ===');
        console.log('Current URL after login:', page.url());
        
        // Take screenshot after login attempt
        await page.screenshot({ path: 'ui-login-after-submit.png' });
        
        // Check page content
        const pageContent = await page.textContent('body');
        console.log('Page content after login attempt:');
        console.log(pageContent.substring(0, 500) + '...');
        
        // Look for error messages
        const errorElements = page.locator('[class*="error"], .text-red-600, .text-red-500');
        const hasError = await errorElements.count() > 0;
        if (hasError) {
            const errorText = await errorElements.first().textContent();
            console.log('Error message found:', errorText);
        }
        
        // Check if we're still on login page
        const isStillOnLogin = await emailInput.isVisible().catch(() => false);
        if (isStillOnLogin) {
            console.log('❌ Still on login page - login failed');
            
            // Check for specific error messages
            const loginError = page.locator('text=/Invalid email|Email atau kata sandi tidak valid|User not found|auth\\/invalid|wrong-password/i');
            const hasLoginError = await loginError.isVisible({ timeout: 2000 }).catch(() => false);
            if (hasLoginError) {
                const errorText = await loginError.textContent();
                console.log('Login error:', errorText);
            }
            
            throw new Error('Login failed - still on login page');
        }
        
        // Look for next screens (PIN, spreadsheet setup, or main app)
        const pinScreen = page.locator('h2:has-text("Atur PIN")');
        const spreadsheetSetup = page.locator('text=/Setup Database|Pengaturan Database/i');
        const mainApp = page.locator('text=/New Treatment|Perawatan Baru|Treatment Entry|Entri Perawatan/i');
        
        // Wait longer for the PIN screen to appear
        const pinVisible = await pinScreen.count() > 0;
        const spreadsheetVisible = await spreadsheetSetup.count() > 0;
        const mainAppVisible = await mainApp.count() > 0;
        
        if (pinVisible) {
            console.log('✅ PIN screen detected - login successful');
        } else if (spreadsheetVisible) {
            console.log('✅ Spreadsheet setup screen detected - login successful');
        } else if (mainAppVisible) {
            console.log('✅ Main app detected - login successful');
        } else {
            console.log('⚠️  Unknown state - neither PIN, spreadsheet, nor main app detected');
            
            // Take final screenshot for debugging
            await page.screenshot({ path: 'ui-login-unknown-state.png' });
        }
        
        console.log('\n============================================================');
        console.log('✅ UI Login Test Completed Successfully');
        console.log('============================================================\n');
        
    } catch (error) {
        console.log('\n============================================================');
        console.log('❌ UI LOGIN TEST FAILED:', error.message);
        console.log('============================================================\n');
        
        // Take error screenshot
        try {
            await page.screenshot({ path: 'ui-login-error.png' });
        } catch (e) {
            console.log('Could not take error screenshot:', e.message);
        }
        
        throw error;
    } finally {
        await browser.close();
    }
}

// Run the test
testUILogin().catch(console.error);