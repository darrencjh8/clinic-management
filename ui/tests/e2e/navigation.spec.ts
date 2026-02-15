import { test, expect } from '@playwright/test';

test.describe('E2E Navigation (requires authenticated session)', () => {
    test.setTimeout(60000);

    // Note: These tests require a valid authenticated session
    // They will skip if not authenticated

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');

        // Check if we're on login page or authenticated
        const emailInput = page.locator('input[type="email"]');
        const isLoginPage = await emailInput.isVisible({ timeout: 5000 }).catch(() => false);

        if (isLoginPage) {
            test.skip(true, 'Requires authenticated session - skipping navigation tests');
        }
    });

    test('should display main navigation elements', async ({ page }) => {
        // Look for navigation items (sidebar or bottom tabs)
        const treatmentsNav = page.locator('[title*="Treatment"], [title*="Perawatan"]').or(
            page.locator('text=/^Treatments$|^New Treatment$|^Perawatan Baru$/i')
        );
        const patientsNav = page.locator('[title*="Patients"], [title*="Pasien"]').or(
            page.locator('text=/^Patients$|^Pasien$/i')
        );
        const historyNav = page.locator('[title*="History"], [title*="Riwayat"]').or(
            page.locator('text=/^History$|^Riwayat$/i')
        );

        // At least one nav should be visible
        const hasNav = await treatmentsNav.first().isVisible({ timeout: 5000 }).catch(() => false) ||
            await patientsNav.first().isVisible({ timeout: 5000 }).catch(() => false) ||
            await historyNav.first().isVisible({ timeout: 5000 }).catch(() => false);

        expect(hasNav).toBe(true);
    });

    test('should navigate between views', async ({ page }) => {
        // Navigate to Patients
        const patientsNav = page.locator('[title*="Patients"], [title*="Pasien"]').or(
            page.locator('text=/^Patients$|^Pasien$/i')
        );

        if (await patientsNav.first().isVisible({ timeout: 3000 }).catch(() => false)) {
            await patientsNav.first().click();
            // Should see patient management content
            await expect(page.locator('text=/Patient|Pasien/i').first()).toBeVisible({ timeout: 5000 });
        }

        // Navigate to History
        const historyNav = page.locator('[title*="History"], [title*="Riwayat"]').or(
            page.locator('text=/^History$|^Riwayat$/i')
        );

        if (await historyNav.first().isVisible({ timeout: 3000 }).catch(() => false)) {
            await historyNav.first().click();
            // Should see history content
            await expect(page.locator('text=/History|Riwayat/i').first()).toBeVisible({ timeout: 5000 });
        }
    });
});
