import { test, expect } from '@playwright/test';

test('smoke test - staging server is running', async ({ page }) => {
    // Simple health check - verify staging server responds
    const response = await page.goto(process.env.BASE_URL || 'https://wisata-dental-staging.fly.dev');
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);
});

test('smoke test - staging app loads without critical errors', async ({ page }) => {
    // Listen for console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
        }
    });
    
    // Listen for page errors
    const pageErrors: Error[] = [];
    page.on('pageerror', error => {
        pageErrors.push(error);
    });
    
    await page.goto(process.env.BASE_URL || 'https://wisata-dental-staging.fly.dev');
    
    // Wait a moment for any errors to be logged
    await page.waitForTimeout(2000);
    
    // Check that no critical errors occurred (excluding Firebase config errors in test env)
    const criticalErrors = consoleErrors.filter(e => 
        !e.includes('Firebase') && 
        !e.includes('VITE_FIREBASE') &&
        !e.includes('test-api-key')
    );
    
    expect(criticalErrors).toHaveLength(0);
    
    // Verify page has basic structure
    const title = await page.title();
    expect(title).toBeTruthy();
});
