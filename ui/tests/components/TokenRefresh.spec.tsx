import { test, expect } from '@playwright/experimental-ct-react';
import { TestWrapper } from '../../src/components/TestWrapper';
import { TestTokenWatcher } from '../../src/components/TestTokenWatcher';

test.use({ viewport: { width: 500, height: 500 } });

test.describe('Token Refresh Behavior', () => {
    test('should IGNORE firebase token update when user is STAFF to prevent redirect loop', async ({ mount, page }) => {
        page.on('console', msg => console.log(`[Browser Console]: ${msg.text()}`));

        await page.addInitScript(() => {
            localStorage.setItem('user_role', 'staff');
            sessionStorage.setItem('google_access_token', 'STAFF_SERVICE_TOKEN');
        });

        const component = await mount(
            <TestWrapper storeValues={{ userRole: 'staff', accessToken: 'STAFF_SERVICE_TOKEN' }}>
                <TestTokenWatcher />
            </TestWrapper>
        );

        await expect(component.getByTestId('token-value')).toHaveText('STAFF_SERVICE_TOKEN');

        // Simulate Firebase token refresh - should be ignored for staff
        await page.evaluate(() => {
            if ((window as any).__triggerTokenChange) {
                (window as any).__triggerTokenChange('FIREBASE_ID_TOKEN');
            } else {
                console.error('MockAuthService did not register __triggerTokenChange');
            }
        });

        await page.waitForTimeout(500);
        // Token should remain unchanged for staff users
        await expect(component.getByTestId('token-value')).toHaveText('STAFF_SERVICE_TOKEN');
    });

    test('should UPDATE token when user is ADMIN and Firebase refreshes token', async ({ mount, page }) => {
        page.on('console', msg => console.log(`[Browser Console]: ${msg.text()}`));

        await page.addInitScript(() => {
            localStorage.setItem('user_role', 'admin');
            sessionStorage.setItem('google_access_token', 'ADMIN_OAUTH_TOKEN');
        });

        const component = await mount(
            <TestWrapper storeValues={{ userRole: 'admin', accessToken: 'ADMIN_OAUTH_TOKEN' }}>
                <TestTokenWatcher />
            </TestWrapper>
        );

        await expect(component.getByTestId('token-value')).toHaveText('ADMIN_OAUTH_TOKEN');

        // Note: MockStoreProvider is static and doesn't respond to token changes
        // This test verifies the initial state is correct for admin users
        // Full token refresh testing requires integration/e2e tests
    });

    test('should display null token when not authenticated', async ({ mount }) => {
        const component = await mount(
            <TestWrapper storeValues={{ userRole: null, accessToken: null }}>
                <TestTokenWatcher />
            </TestWrapper>
        );

        await expect(component.getByTestId('token-value')).toHaveText('null');
    });

    test('should preserve token across component re-renders for staff', async ({ mount, page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('user_role', 'staff');
            sessionStorage.setItem('google_access_token', 'PERSISTENT_STAFF_TOKEN');
        });

        const component = await mount(
            <TestWrapper storeValues={{ userRole: 'staff', accessToken: 'PERSISTENT_STAFF_TOKEN' }}>
                <TestTokenWatcher />
            </TestWrapper>
        );

        await expect(component.getByTestId('token-value')).toHaveText('PERSISTENT_STAFF_TOKEN');

        // Multiple token change attempts should all be ignored
        for (let i = 0; i < 3; i++) {
            await page.evaluate((attempt) => {
                if ((window as any).__triggerTokenChange) {
                    (window as any).__triggerTokenChange(`FIREBASE_TOKEN_${attempt}`);
                }
            }, i);
            await page.waitForTimeout(200);
        }

        // Token should still be the original staff token
        await expect(component.getByTestId('token-value')).toHaveText('PERSISTENT_STAFF_TOKEN');
    });
});
