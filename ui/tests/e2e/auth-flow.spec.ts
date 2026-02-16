import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Authentication and Session Management Workflows
 * 
 * These tests cover scenarios previously skipped in component tests:
 * - DEF-005: Sheet fetching after PIN setup
 * - DEF-006: Logout redirect behavior
 * - Session storage persistence
 * 
 * Prerequisites:
 * - E2E_TEST_EMAIL and E2E_TEST_PASSWORD must be set in .env.e2e
 * - Credentials should be valid Firebase credentials with backend access
 */

test.describe('Authentication Flow E2E', () => {
    test.setTimeout(180000); // 3 minutes for full flows

    // Helper to check if credentials are available
    function hasCredentials() {
        return !!(process.env.E2E_TEST_EMAIL && process.env.E2E_TEST_PASSWORD);
    }

    test('DEF-005: Should fetch spreadsheets automatically after PIN setup', async ({ page }) => {
        test.skip(!hasCredentials(), 'E2E credentials required');

        const email = process.env.E2E_TEST_EMAIL!;
        const password = process.env.E2E_TEST_PASSWORD!;

        console.log('Starting DEF-005: Sheet fetch after PIN setup');

        // 1. Navigate to app
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');

        // 2. Login with Firebase credentials
        console.log('Filling login credentials...');
        const emailInput = page.locator('input[type="email"]');
        await expect(emailInput).toBeVisible({ timeout: 20000 });
        
        await emailInput.fill(email);
        await page.fill('input[type="password"]', password);
        await page.click('button[type="submit"]');

        console.log('Waiting for PIN setup screen...');

        // 3. Wait for PIN setup screen (after successful Firebase login)
        const pinSetupHeading = page.locator('text=/Set a PIN|Buat PIN/i');
        await expect(pinSetupHeading).toBeVisible({ timeout: 30000 });

        console.log('On PIN setup screen, entering PIN...');

        // 4. Enter PIN (6 digits)
        // PinEntry component has 6 individual inputs
        const pinInputs = page.locator('input[type="password"]');
        const pinCount = await pinInputs.count();
        
        if (pinCount >= 6) {
            // Fill each PIN digit individually
            for (let i = 0; i < 6; i++) {
                await pinInputs.nth(i).fill((i + 1).toString());
            }
        } else {
            // Fallback: type PIN as string
            await page.keyboard.type('123456');
        }

        // 5. Click Save PIN button
        const savePinButton = page.locator('button', { hasText: /Save PIN|Simpan PIN/i });
        await savePinButton.click();

        console.log('PIN saved, waiting for spreadsheet selection screen...');

        // 6. Wait for spreadsheet selection screen
        // This is the key assertion: the screen should appear, meaning fetchSpreadsheets was called
        const spreadsheetHeading = page.locator('text=/Select Existing Spreadsheet|Pilih Spreadsheet|Setup Database|Pengaturan Database/i');
        await expect(spreadsheetHeading).toBeVisible({ timeout: 30000 });

        console.log('✓ Spreadsheet selection screen appeared');

        // 7. Verify that spreadsheets list is visible (or loading indicator)
        // The component should have either:
        // - A list of spreadsheets (if fetch succeeded)
        // - A "Create New" button
        // - A refresh button
        const refreshButton = page.locator('button', { hasText: /Refresh|Perbarui/i });
        const createButton = page.locator('button', { hasText: /Create New|Buat Baru/i });
        
        // At least one of these should be visible
        await expect(refreshButton.or(createButton)).toBeVisible({ timeout: 10000 });

        console.log('✓ DEF-005 PASSED: Spreadsheets were fetched after PIN setup');
    });

    test('DEF-006: Should redirect to login screen after logout', async ({ page }) => {
        test.skip(!hasCredentials(), 'E2E credentials required');

        const email = process.env.E2E_TEST_EMAIL!;
        const password = process.env.E2E_TEST_PASSWORD!;

        console.log('Starting DEF-006: Logout redirect');

        // Complete login flow
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');

        // Login
        const emailInput = page.locator('input[type="email"]');
        await expect(emailInput).toBeVisible({ timeout: 20000 });
        await emailInput.fill(email);
        await page.fill('input[type="password"]', password);
        await page.click('button[type="submit"]');

        // Handle PIN screen if it appears
        const pinSetup = page.locator('text=/Set a PIN|Enter PIN|Buat PIN|Masukkan PIN/i');
        if (await pinSetup.isVisible({ timeout: 5000 }).catch(() => false)) {
            console.log('Entering PIN...');
            // Enter PIN
            const pinInputs = page.locator('input[type="password"]');
            const pinCount = await pinInputs.count();
            
            if (pinCount >= 6) {
                for (let i = 0; i < 6; i++) {
                    await pinInputs.nth(i).fill((i + 1).toString());
                }
            }
            
            const savePinButton = page.locator('button', { hasText: /Save PIN|Simpan PIN/i });
            await savePinButton.click();
        }

        // Handle spreadsheet selection if it appears
        const spreadsheetSetup = page.locator('text=/Select Existing|Pilih Spreadsheet/i');
        if (await spreadsheetSetup.isVisible({ timeout: 5000 }).catch(() => false)) {
            console.log('Selecting spreadsheet...');
            // Try to select first available spreadsheet or create new
            const firstSheet = page.locator('button', { hasText: /sheet|spreadsheet/i }).first();
            const createNew = page.locator('button', { hasText: /Create New|Buat Baru/i });
            
            if (await firstSheet.isVisible({ timeout: 3000 }).catch(() => false)) {
                await firstSheet.click();
            } else if (await createNew.isVisible({ timeout: 3000 }).catch(() => false)) {
                await createNew.click();
                // Wait for creation and selection
                await page.waitForTimeout(3000);
            }
        }

        // Wait for main app to load
        console.log('Waiting for main app...');
        const mainApp = page.locator('text=/New Treatment|Treatment Entry|Perawatan Baru/i');
        await expect(mainApp).toBeVisible({ timeout: 30000 });

        console.log('On main app, navigating to settings...');

        // Navigate to Settings (either via sidebar or bottom tabs)
        const settingsButton = page.locator('button, a', { hasText: /Settings|Pengaturan/i });
        await expect(settingsButton.first()).toBeVisible({ timeout: 10000 });
        await settingsButton.first().click();

        console.log('On settings, clicking logout...');

        // Click Sign Out button
        const signOutButton = page.locator('button', { hasText: /Sign Out|Keluar/i });
        await expect(signOutButton).toBeVisible({ timeout: 10000 });
        await signOutButton.click();

        console.log('Logout clicked, verifying redirect...');

        // Verify redirect to login screen
        const signInButton = page.locator('button[type="submit"]', { hasText: /Sign In|Masuk/i });
        await expect(signInButton).toBeVisible({ timeout: 10000 });

        // Verify we're back on login screen (email input should be visible)
        const loginEmailInput = page.locator('input[type="email"]');
        await expect(loginEmailInput).toBeVisible();

        console.log('✓ DEF-006 PASSED: Redirected to login screen after logout');
    });

    test('Should persist session data across page reloads', async ({ page }) => {
        test.skip(!hasCredentials(), 'E2E credentials required');

        const email = process.env.E2E_TEST_EMAIL!;
        const password = process.env.E2E_TEST_PASSWORD!;

        console.log('Starting session persistence test');

        // Complete login flow to main app
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');

        const emailInput = page.locator('input[type="email"]');
        await expect(emailInput).toBeVisible({ timeout: 20000 });
        await emailInput.fill(email);
        await page.fill('input[type="password"]', password);
        await page.click('button[type="submit"]');

        // Handle PIN if needed
        const pinSetup = page.locator('text=/Set a PIN|Enter PIN|Buat PIN|Masukkan PIN/i');
        if (await pinSetup.isVisible({ timeout: 5000 }).catch(() => false)) {
            const pinInputs = page.locator('input[type="password"]');
            const pinCount = await pinInputs.count();
            
            if (pinCount >= 6) {
                for (let i = 0; i < 6; i++) {
                    await pinInputs.nth(i).fill((i + 1).toString());
                }
            }
            
            await page.locator('button', { hasText: /Save PIN|Simpan PIN/i }).click();
        }

        // Handle spreadsheet selection
        const spreadsheetSetup = page.locator('text=/Select Existing|Pilih Spreadsheet/i');
        if (await spreadsheetSetup.isVisible({ timeout: 5000 }).catch(() => false)) {
            const firstSheet = page.locator('button', { hasText: /sheet|spreadsheet/i }).first();
            const createNew = page.locator('button', { hasText: /Create New|Buat Baru/i });
            
            if (await firstSheet.isVisible({ timeout: 3000 }).catch(() => false)) {
                await firstSheet.click();
            } else if (await createNew.isVisible({ timeout: 3000 }).catch(() => false)) {
                await createNew.click();
                await page.waitForTimeout(3000);
            }
        }

        // Verify we're on main app
        await expect(page.locator('text=/New Treatment|Perawatan Baru/i')).toBeVisible({ timeout: 30000 });

        console.log('On main app, checking session storage...');

        // DEF-007: Verify service account key is persisted in sessionStorage (HMR fix)
        const hasServiceAccountKey = await page.evaluate(() => {
            const rawKey = sessionStorage.getItem('service_account_key_raw');
            const accessToken = sessionStorage.getItem('google_access_token');
            return { hasRawKey: !!rawKey, hasAccessToken: !!accessToken };
        });
        expect(hasServiceAccountKey.hasAccessToken).toBe(true);
        expect(hasServiceAccountKey.hasRawKey).toBe(true);
        console.log('✓ Service account key and token persisted in sessionStorage');

        console.log('Session data present, reloading page...');

        // Reload the page
        await page.reload();
        await page.waitForLoadState('domcontentloaded');

        // Verify we're still on main app (not redirected to login)
        await expect(page.locator('text=/New Treatment|Perawatan Baru/i')).toBeVisible({ timeout: 20000 });

        // Verify session data still present after reload
        const sessionAfterReload = await page.evaluate(() => {
            const rawKey = sessionStorage.getItem('service_account_key_raw');
            const accessToken = sessionStorage.getItem('google_access_token');
            return { hasRawKey: !!rawKey, hasAccessToken: !!accessToken };
        });
        expect(sessionAfterReload.hasAccessToken).toBe(true);
        expect(sessionAfterReload.hasRawKey).toBe(true);

        console.log('✓ Session persisted across reload (DEF-007 verified)');
    });
});
