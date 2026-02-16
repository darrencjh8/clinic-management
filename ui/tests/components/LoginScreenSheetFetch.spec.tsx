import { test, expect } from '@playwright/experimental-ct-react';
import { LoginScreen } from '../../src/components/LoginScreen';
import { TestWrapper } from '../../src/components/TestWrapper';

test.describe('DEF-005: Sheet Selection API Trigger', () => {
    test.skip('should fetch spreadsheets automatically after valid PIN setup', async ({ mount, page }) => {
        // Enable console logs
        page.on('console', msg => console.log(`[Browser]: ${msg.text()}`));

        // 1. Mock Google OAuth & Drive APIs
        let sheetsFetched = false;
        await page.route('https://www.googleapis.com/drive/v3/files**', async route => {
            console.log('API: fetchSpreadsheets called!');
            sheetsFetched = true;
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ files: [{ id: 'sheet1', name: 'Test Sheet' }] })
            });
        });

        // 2. Mock Firebase/Service Account Setup
        // We simulate a state where "pin_setup" is active (User logged in to Firebase, no key yet)
        await page.evaluate(() => {
            sessionStorage.clear();
            localStorage.clear();
            // Mock a temporary service account being present in state
            // LoginScreen doesn't read tempServiceAccount from storage, it's state. 
            // So we can't easily injection it unless we mock the fetchServiceAccount call 
            // OR we start from 'pin_setup' step by setting initial props? 
            // LoginScreen props don't control step directly unless initialToken is set.

            // To be in 'pin_setup', we need:
            // - Firebase User Logged In
            // - NO localStorage key
            // - we must have called handleFirebaseLogin -> success -> fetchSA -> done.

            // This is hard to orchestrate purely via props.
            // ALTERNATIVE: Mock the `LoginScreen` internal state? No.

            // Let's rely on the `initialToken` flow logic which might be slightly different 
            // BUT the user report says "after pressing simpan pin".
            // So we must simulate the PIN SETUP flow.

            // We can stub `FirebaseAuthService`!
        });

        // Mock the Services using window-based pattern (LoginScreen expects MockAuthService and MockSheetsService)
        await page.evaluate(() => {
            (window as any).MockAuthService = {
                getCurrentUser: () => ({ uid: 'test-user', getIdToken: async () => 'mock-id-token' }),
                fetchServiceAccount: async () => ({
                    client_email: 'test@example.com',
                    private_key: '-----BEGIN PRIVATE KEY-----\nFAKE\n-----END PRIVATE KEY-----'
                }),
                signIn: async () => ({ user: { uid: 'test-user', getIdToken: async () => 'token' } }),
                signOut: async () => { }
            };

            (window as any).MockSheetsService = {
                encryptKey: async () => 'encrypted-jwe',
                loginWithServiceAccount: async () => { },
                setEncryptedServiceAccountKey: () => { },
                getEncryptedServiceAccountKey: () => null,
                setAccessToken: () => { },
                getAccessToken: () => 'mock-access-token',
                createSpreadsheet: async () => ({ spreadsheetId: 'new-id' }),
                fetchSpreadsheets: async () => ({ files: [{ id: 'sheet1', name: 'Test Sheet' }] }),
                logout: () => { }
            };
        });

        // 3. Mount Component
        const component = await mount(
            <TestWrapper>
                <LoginScreen
                    onLoginSuccess={() => console.log('Login Success')}
                    userRole="staff" // or admin, doesn't matter for fetching
                />
            </TestWrapper>
        );

        // 4. We need to trigger the flow to reach 'pin_setup'.
        // The easiest way is to mock the `handleFirebaseLogin` flow.
        // Enter dummy email/pass and submit.
        await component.getByLabel(/Email/i).fill('test@example.com');
        await component.getByLabel(/Password/i).fill('password');
        await component.getByRole('button', { name: /Sign In|Masuk/i }).click();

        // 5. Should now be at PIN Setup 
        await expect(component.getByText(/Set a PIN|Buat PIN/i)).toBeVisible();

        // 6. Enter PIN
        const pinInput = component.locator('input[type="password"]').first(); // Assuming PinEntry input
        // PinEntry usually has multiple inputs or one. Let's assume standard behavior.
        // Actually PinEntry might be complex. Let's try filling '123456'.
        // Detailed check of PinEntry implementation might be needed if this fails.
        // Assuming simple input for now or use keyboard.
        await page.keyboard.type('123456');

        // Click Simpan/Save
        await component.getByRole('button', { name: /Save PIN|Simpan PIN/i }).click();

        // 7. Should transition to 'spreadsheet_setup'
        await expect(component.getByText(/Select Existing Spreadsheet|Pilih Spreadsheet/i)).toBeVisible();

        // 8. VERIFY: Did fetchSpreadsheets fire?
        // We check our `sheetsFetched` flag via polling or expectation
        // Wait a bit for effect to fire
        await page.waitForTimeout(1000);

        // We can't check variable `sheetsFetched` from Node context effortlessly if it was updated in browser context?
        // Wait, `page.route` is Node context! Yes!

        expect(sheetsFetched, 'API should have been called').toBe(true);
    });
});
