import { test, expect } from '@playwright/experimental-ct-react';
import { LoginScreen } from '../../src/components/LoginScreen';
import { TestWrapper } from '../../src/components/TestWrapper';

test.describe('DEF-004: Logout Spinner Stuck', () => {
    test.use({ viewport: { width: 500, height: 800 } });

    test('should reset loading state when signing out', async ({ mount, page }) => {
        page.on('console', msg => console.log(`[Browser] ${msg.text()}`));

        // 1. Setup: User logged in to Firebase, Key exists -> Pin Check Screen
        await page.evaluate(() => {
            (window as any).TEST_LANGUAGE = 'en';
            localStorage.setItem('language', 'en');
            localStorage.setItem('encrypted_key_test-user', 'mock-key');

            // Mock Services via Window
            const mockAuthService = {
                getCurrentUser: () => ({ uid: 'test-user' }),
                signOut: async () => { console.log('Mock SignOut Called'); },
                signIn: async () => { },
                fetchServiceAccount: async () => { }
            };

            const mockSheetsService = {
                setAccessToken: () => { },
                getEncryptedServiceAccountKey: () => null,
                decryptKey: () => new Promise(() => { }), // Hang
                loginWithServiceAccount: async () => { },
                logout: () => { console.log('Mock Sheets Logout Called'); }
            };

            (window as any).MockAuthService = mockAuthService;
            (window as any).MockSheetsService = mockSheetsService;
        });

        const component = await mount(
            <TestWrapper>
                <LoginScreen
                    onLoginSuccess={() => { }}
                />
            </TestWrapper>
        );

        // 2. Verify we are at PIN Check
        // 2. Verify we are at PIN Check
        await expect(component.getByText(/Enter PIN|Masukkan PIN/i)).toBeVisible();
        await expect(component.getByRole('button', { name: /Sign Out|Keluar/i })).toBeVisible();

        // 3. Inject State: Set isLoading to true to simulate a stuck process
        // Since we can't easily set internal state from outside, we'll confirm
        // that if we TRIGGER a loading action (like checking PIN) and then Sign Out, it resets.
        // But if checkPin is async, we can't click Sign Out while it's running (JS single thread).
        // UNLESS we mock checkPin to hang, but allow interaction?
        // If checkPin hangs, the thread is blocked? No, await yielding.

        // Mock checkPin deps to hang?


        // Enter PIN and Submit to trigger loading
        const pinInput = component.locator('input[type="password"]').first();
        await pinInput.fill('123456');

        // TRIGGER THE STUCK STATE: Click "Unlock" to call handlePinCheck which calls the hanging decryptKey
        // Note: We don't await the result of the action implies checking for UI changes, 
        // but since it hangs, we just want to fire the event.
        // PinEntry 'Unlock' button
        const unlockBtn = component.getByRole('button', { name: /Unlock|Buka/i });
        await expect(unlockBtn).toBeVisible();
        await unlockBtn.click();

        // Now we are "stuck" in loading (conceptually, though UI might not show it if Loading overlay isn't used).
        // But setIsLoading(true) has run.

        // 4. Click Sign Out
        // "Sign Out" button should still be interactive
        await component.getByRole('button', { name: /Sign Out|Keluar/i }).click();

        // 5. Verify:
        // - Auth step changed to 'login' (should see "Sign In" button/text)
        // - Loading state should be FALSE (Button should not show spinner)

        // await expect(component.getByText('Dental Clinic')).toBeVisible(); // Header text varies by env

        const signInBtn = component.getByRole('button', { name: /Sign In|Masuk/i });
        await expect(signInBtn).toBeVisible();

        // Check if button is disabled (loading causes disabled)
        await expect(signInBtn).not.toBeDisabled();

        // Check for spinner class or absence of lock icon?
        // If loading, button contains `.animate-spin`.
        // If not loading, button contains `LogIn` icon.
        // We expect NO `.animate-spin` on the button.
        const spinner = signInBtn.locator('.animate-spin');
        await expect(spinner).toBeHidden();
    });
});
