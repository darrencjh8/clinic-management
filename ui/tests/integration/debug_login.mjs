// Debug test to see what's actually on the page
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

async function debugLogin() {
    console.log('============================================================');
    console.log('Debug Login Flow - Finding Elements');
    console.log('============================================================');
    
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 }
    });
    
    try {
        const page = await context.newPage();
        
        // Enable console logging
        page.on('console', msg => console.log('Browser console:', msg.text()));
        
        console.log('\n=== Step 1: Navigate to App ===');
        await page.goto(BASE_URL);
        await page.waitForLoadState('domcontentloaded');
        
        console.log('\n=== Step 2: Fill Login Form ===');
        await page.locator('input[type="email"]').fill(EMAIL);
        await page.locator('input[type="password"]').fill(PASSWORD);
        
        console.log('\n=== Step 3: Submit Login Form ===');
        await page.click('button[type="submit"]');
        
        // Wait for the page to change
        await page.waitForTimeout(3000);
        
        console.log('\n=== Step 4: Debug Page Content ===');
        
        // Get all text content
        const pageText = await page.textContent('body');
        console.log('Full page text:');
        console.log(pageText);
        
        // Look for specific elements with different selectors
        const selectors = [
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            '[class*="pin"]', '[class*="PIN"]', '[class*="security"]',
            '[class*="setup"]', '[class*="atur"]',
            'button', 'input[type="password"]'
        ];
        
        for (const selector of selectors) {
            try {
                const elements = await page.locator(selector).all();
                if (elements.length > 0) {
                    console.log(`\nElements matching '${selector}':`);
                    for (let i = 0; i < Math.min(elements.length, 5); i++) {
                        const element = elements[i];
                        const text = await element.textContent().catch(() => 'No text');
                        const visible = await element.isVisible().catch(() => false);
                        console.log(`  ${i + 1}. "${text.trim()}" (visible: ${visible})`);
                    }
                }
            } catch (e) {
                console.log(`Error with selector '${selector}':`, e.message);
            }
        }
        
        // Take a screenshot
        await page.screenshot({ path: 'debug-login-result.png' });
        console.log('\nScreenshot saved as debug-login-result.png');
        
    } catch (error) {
        console.log('Error:', error.message);
    } finally {
        await browser.close();
    }
}

debugLogin();