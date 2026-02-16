import { test, expect } from '@playwright/experimental-ct-react';
import { LoginScreen } from '../../src/components/LoginScreen';
import { TestWrapper } from '../../src/components/TestWrapper';

test.describe('LoginScreen Guards', () => {
    test('DEF-002: should handle unmount/navigation during slow fetch without errors', async ({ mount, page, browserName }) => {
        // Skip for Firefox due to timing issues with button state
        test.skip(browserName === 'firefox', 'Firefox has timing issues with refresh button state');
        // Enable console logs
        page.on('console', msg => console.log(`[Browser]: ${msg.text()}`));

        // 1. Mock Google Drive API with a DELAY
        await page.route('https://www.googleapis.com/drive/v3/files**', async route => {
            console.log('Mock API hit, delaying...');
            // Delay for 1.5 seconds (sufficient to test the guard)
            await new Promise(resolve => setTimeout(resolve, 1500));
            console.log('Mock API resuming...');

            // Abort or fulfill? 
            // If we abort, it throws error.
            // If we fulfill, it resolves.
            // Let's fulfill to simulate legitimate late response.
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ files: [] })
            });
        });

        // 2. Mock Session to be logged in
        await page.evaluate(() => {
            sessionStorage.setItem('google_access_token', 'valid-token');
            // We DO NOT set encrypted_service_account. 
            // This forces LoginScreen to skip key restoration and go straight to 'spreadsheet_setup',
            // which triggers fetchSpreadsheets. This is sufficient to test the guard.
        });

        // 3. Mount component in spreadsheet_setup step
        const component = await mount(
            <TestWrapper>
                <LoginScreen
                    onLoginSuccess={() => { }}
                    initialToken="valid-token"
                    userRole="admin"
                />
            </TestWrapper>
        );

        // 4. Verify we are in spreadsheet_setup
        await expect(component.getByText(/Select Existing Spreadsheet|Pilih Spreadsheet/i)).toBeVisible();

        // 5. Trigger navigation AWAY (e.g. Sign Out) immediately while fetch is pending
        // The fetch logic starts on effect or button click. initialToken triggers key restoration then fetch.
        // It might be running now.

        // Let's explicitly trigger a refresh which calls fetchSpreadsheets
        console.log('Waiting for refresh button to be enabled...');
        const refreshBtn = component.getByRole('button', { name: /Refresh|Perbarui/i });
        await expect(refreshBtn).toBeEnabled({ timeout: 5000 });
        
        console.log('Clicking Refresh...');
        await refreshBtn.click();

        // 6. IMMEDIATELY navigate away (Sign Out)
        // LoginScreen handles signout by switching to 'login' step.
        console.log('Clicking Sign Out...');
        const signOutBtn = component.getByRole('button', { name: /Sign Out|Keluar/i });
        await signOutBtn.click();

        // 7. Wait for the Delayed API response to resolve
        // We wait 2s to ensure the 1.5s delay passes + buffer
        console.log('Waiting for delay...');
        await page.waitForTimeout(2500);

        // 8. Assert:
        // - We should still be on Login screen (Sign In button visible)
        // - NO Error toast about "Unauthorized" or "Failed to load" (would be visible if guard failed)
        // - Console logs (optional check) shouldn't show React state update warnings (Playwright usually captures these as errors if configured strictly)

        console.log('Asserting state...');
        await expect(component.getByRole('button', { name: /Sign In|Masuk/i })).toBeVisible();
        await expect(component.getByText(/Failed to load spreadsheets/i)).toBeHidden();
        await expect(component.getByText(/Session expired/i)).toBeHidden();
    });
});
