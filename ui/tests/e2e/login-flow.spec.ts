import { test, expect } from '@playwright/test';

test.describe('E2E Login Flow', () => {
    test.setTimeout(120000);

    test('should show login form on initial visit', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');

        // Should see login form with email input
        const emailInput = page.locator('input[type="email"]');
        await expect(emailInput).toBeVisible({ timeout: 20000 });

        // Should see password input
        const passwordInput = page.locator('input[type="password"]');
        await expect(passwordInput).toBeVisible();

        // Should see sign in button
        const submitButton = page.locator('button[type="submit"]');
        await expect(submitButton).toBeVisible();
    });

    test('should allow switching between staff and admin login', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');

        // Initially on staff login (Firebase)
        await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 20000 });

        // Find and click the switch to admin login button
        const switchButton = page.locator('text=/Switch to Admin|Beralih ke Login Admin/i');
        await expect(switchButton).toBeVisible();
        await switchButton.click();

        // Should now show Google sign in option
        await expect(page.locator('text=/Sign in with Google|Masuk dengan Google/i')).toBeVisible();

        // Switch back to staff login
        const switchBackButton = page.locator('text=/Switch to Staff|Beralih ke Login Staf/i');
        await expect(switchBackButton).toBeVisible();
        await switchBackButton.click();

        // Should be back to email/password form
        await expect(page.locator('input[type="email"]')).toBeVisible();
    });

    test('should allow language switching', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');

        // Wait for page to load
        await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 20000 });

        // Find language switch button
        const langButton = page.locator('text=/Bahasa Indonesia|English/i');
        await expect(langButton).toBeVisible();

        // Get current language
        const currentLang = await langButton.textContent();

        // Click to switch language
        await langButton.click();

        // Language should have changed
        await expect(langButton).not.toHaveText(currentLang || '');
    });

    test('should show error for invalid credentials', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');

        const emailInput = page.locator('input[type="email"]');
        await expect(emailInput).toBeVisible({ timeout: 20000 });

        // Enter invalid credentials
        await emailInput.fill('invalid@test.com');
        await page.fill('input[type="password"]', 'wrongpassword');
        await page.click('button[type="submit"]');

        // Should show error message (wait longer for Firebase response)
        const errorMessage = page.locator('text=/Invalid|tidak valid|User not found|auth\\/user-not-found/i');
        await expect(errorMessage).toBeVisible({ timeout: 15000 });
    });
});
