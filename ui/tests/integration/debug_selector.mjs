// Debug test to find the right selector
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

async function debugSelector() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 }
    });
    
    try {
        const page = await context.newPage();
        
        await page.goto(BASE_URL);
        await page.waitForLoadState('domcontentloaded');
        
        // Fill and submit login form
        await page.locator('input[type="email"]').fill(EMAIL);
        await page.locator('input[type="password"]').fill(PASSWORD);
        await page.click('button[type="submit"]');
        
        // Wait for the page to change
        await page.waitForTimeout(3000);
        
        console.log('=== Testing Different Selectors ===');
        
        // Test different selector approaches
        const selectors = [
            'h2:has-text("Atur PIN")',
            'h2 >> text=Atur PIN',
            'text=Atur PIN Keamanan Anda',
            'h2',
            '[class*="pin"]',
            '[class*="PIN"]',
            '[class*="security"]'
        ];
        
        for (const selector of selectors) {
            try {
                const element = page.locator(selector).first();
                const visible = await element.isVisible({ timeout: 2000 }).catch(() => false);
                const text = await element.textContent({ timeout: 2000 }).catch(() => 'No text');
                console.log(`Selector '${selector}': visible=${visible}, text="${text.trim()}"`);
            } catch (e) {
                console.log(`Selector '${selector}': error - ${e.message}`);
            }
        }
        
        // Get all h2 elements
        const h2Elements = await page.locator('h2').all();
        console.log(`\nFound ${h2Elements.length} h2 elements:`);
        for (let i = 0; i < h2Elements.length; i++) {
            const text = await h2Elements[i].textContent();
            console.log(`  ${i + 1}. "${text.trim()}"`);
        }
        
    } catch (error) {
        console.log('Error:', error.message);
    } finally {
        await browser.close();
    }
}

debugSelector();