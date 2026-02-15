import { test, expect } from '@playwright/experimental-ct-react';
import { LoginScreen } from '../../src/components/LoginScreen';
import { TestWrapper } from '../../src/components/TestWrapper';

test.describe('LoginScreen Race Condition', () => {
    test.beforeEach(async ({ page }) => {
        // Mock Google OAuth Token Endpoint
        await page.route('https://oauth2.googleapis.com/token', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    access_token: 'mock_token',
                    expires_in: 3600,
                    token_type: 'Bearer'
                })
            });
        });
    });

    test('should NOT show error if fetch fails after navigating away', async ({ mount, page }) => {
        // 1. Mock a SLOW fetch that eventually fails with 401
        await page.route('https://www.googleapis.com/drive/v3/files**', async route => {
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1s delay
            await route.fulfill({
                status: 401,
                contentType: 'application/json',
                body: JSON.stringify({ error: 'Unauthorized' })
            });
        });

        const component = await mount(
            <TestWrapper>
                <LoginScreen
                    onLoginSuccess={() => { }}
                    initialToken="test_token" // Triggers spreadsheet_setup -> fetchSpreadsheets
                />
            </TestWrapper>
        );

        // 2. Wait for fetch to start (it has 1s delay)
        await page.waitForTimeout(200);

        // 3. Simulate navigation away by manually changing state or triggering a different flow
        // Since we can't easily change internal state from outside, we'll simulate the "Sign Out" 
        // or a similar action that changes authStep if possible.
        // 3. Simulate navigation away

        // Actually, we can click "Sign Out" which sets authStep to 'login'
        // The "Sign Out" button is visible in 'spreadsheet_setup'
        const signOutBtn = component.getByRole('button', { name: /Sign Out|Keluar/i });
        await expect(signOutBtn).toBeVisible({ timeout: 5000 });
        await signOutBtn.click();

        // 4. Now we are in 'login' step.
        // Wait for the slow fetch to complete (it takes 1s, we waited 0.2s + click time)
        await page.waitForTimeout(1500);

        // 5. Assert: Error should NOT be visible
        // "Failed to load spreadsheets" should not appear
        const errorMsg = component.getByText('Failed to load spreadsheets');
        await expect(errorMsg).toBeHidden();

        // Also check if we are on the login screen
        await expect(component.getByText('Dental Clinic')).toBeVisible();
    });
});
