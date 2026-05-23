import { test, expect } from '@playwright/test';

test.describe('Viewport and Keyboard Handling', () => {
    test.beforeEach(async ({ page }) => {
        // Go to the staging URL (configured in playwright-e2e.config.ts)
        await page.goto('/');
    });

    test('should have the correct viewport meta tag for keyboard handling', async ({ page }) => {
        const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content');
        expect(viewportMeta).toContain('interactive-widget=resizes-content');
    });

    test('should have essential PWA and iOS compatibility tags', async ({ page }) => {
        const appleMobileWebAppCapable = await page.locator('meta[name="apple-mobile-web-app-capable"]').getAttribute('content');
        expect(appleMobileWebAppCapable).toBe('yes');

        const themeColor = await page.locator('meta[name="theme-color"]').getAttribute('content');
        expect(themeColor).toBe('#9E7658');
    });
});
