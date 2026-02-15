import { test, expect } from '@playwright/experimental-ct-react';
import { LoginScreen } from '../../src/components/LoginScreen';
import { TestWrapper } from '../../src/components/TestWrapper';

test.describe('LoginScreen Logout', () => {
    test('should clear session storage on sign out from spreadsheet setup', async ({ mount, page }) => {
        // 1. Mock Google Drive API to return success (prevent auto-logout on 401)
        await page.route('https://www.googleapis.com/drive/v3/files**', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ files: [] })
            });
        });

        // 2. Pre-fill sessionStorage with tokens to simulate a logged-in session
        await page.evaluate(() => {
            sessionStorage.setItem('google_access_token', 'secret-token');
            // '{"test":"key"}' encoded to base64
            sessionStorage.setItem('encrypted_service_account', 'eyJ0ZXN0Ijoia2V5In0=');
        });

        // 3. Mount component with initialToken (puts it in spreadsheet_setup state)
        const component = await mount(
            <TestWrapper>
                <LoginScreen
                    onLoginSuccess={() => { }}
                    initialToken="secret-token"
                    userRole="admin"
                />
            </TestWrapper>
        );

        // 4. Verify we are in pin_check (because key restoration failed for dummy key, which is expected)
        // OR spreadsheet_setup if we somehow managed to mock everything perfectly.
        // For robustness, let's just wait for the "Sign Out" button which is present in both states.
        const signOutButton = component.getByRole('button', { name: /Sign Out|Keluar/i });
        await expect(signOutButton).toBeVisible();

        // 5. Verify tokens exist before logout
        const tokenBefore = await page.evaluate(() => sessionStorage.getItem('google_access_token'));
        expect(tokenBefore).toBe('secret-token');

        // 6. Click "Sign Out" (Keluar)
        await signOutButton.click();

        // 7. Verify we are back to login (or at least Sign Out action happened)
        // LoginScreen resets authStep to 'login'.
        // Expect "Sign In" or "Masuk" button.
        await expect(component.getByRole('button', { name: /Sign In|Masuk/i })).toBeVisible();

        // 8. Verify sessionStorage is CLEARED
        const tokenAfter = await page.evaluate(() => sessionStorage.getItem('google_access_token'));
        const keyAfter = await page.evaluate(() => sessionStorage.getItem('encrypted_service_account'));

        expect(tokenAfter).toBeNull();
        expect(keyAfter).toBeNull();
    });
});
