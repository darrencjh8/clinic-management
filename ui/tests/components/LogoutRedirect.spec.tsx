import { test, expect } from '@playwright/experimental-ct-react';
import App from '../../src/App';
import { TestWrapper } from '../../src/components/TestWrapper';

test.describe('DEF-006: Logout Redirect', () => {
    test.use({ viewport: { width: 500, height: 800 } });

    test.skip('should redirect to login screen after logout', async ({ mount, page }) => {
        // 1. Setup: User logged in, Tokens present
        await page.evaluate(() => {
            sessionStorage.setItem('google_access_token', 'mock-token');
            localStorage.setItem('spreadsheet_id', 'mock-sheet-id');
            localStorage.setItem('user_role', 'staff');
        });

        // Mock Services using window-based pattern
        await page.evaluate(() => {
            // Track signOut calls
            let signOutCalled = false;
            
            (window as any).MockAuthService = {
                getCurrentUser: () => ({ uid: 'test-user' }),
                signOut: async () => { 
                    signOutCalled = true; 
                    console.log('Mock: Firebase signOut called'); 
                },
                signIn: async () => ({ user: { uid: 'test-user' } }),
                fetchServiceAccount: async () => ({})
            };

            (window as any).MockSheetsService = {
                getAccessToken: () => 'mock-token',
                setAccessToken: () => { },
                getSpreadsheet: async () => ({ sheets: [] }),
                logout: () => { console.log('Mock: Google Sheets logout called'); },
                getEncryptedServiceAccountKey: () => null,
                setEncryptedServiceAccountKey: () => { }
            };
            
            (window as any)._signOutCalled = () => signOutCalled;
        });

        const component = await mount(
            <TestWrapper>
                <App />
            </TestWrapper>
        );

        // 2. Verify we are in Main App (Treatment Entry or similar)
        // Wait for loading to finish?
        // App uses useStore which sets isLoading = true initially.
        // It calls loadData.
        // We mocked GoogleSheetsService.getSpreadsheet to return empty sheets.
        // So loadData should succeed (or fail gracefully). 
        // If it succeeds, it sets isLoading = false.

        await expect(component.getByText('Treatment Entry')).toBeVisible({ timeout: 10000 });

        // 3. Click Logout (in Settings or Sidebar?)
        // Mobile view -> Hamburger menu? 
        // Or Settings tab?
        // App.tsx renders:
        // - TreatmentEntry
        // - Layout (which has navigation)

        // Let's check Layout navigation. Assuming a "Logout" button exists or accessible.
        // If Layout has a sidebar/menu button.
        // Let's try finding "Logout" or "Sign Out".
        // It might be in a menu.

        // Try opening menu if exists?
        // If mobile, maybe standard "Sign Out" icon?
        // Or "Settings" tab? 
        // In App.tsx: `case 'settings': return <MobileSettings />;`
        // MobileSettings probably has Logout.

        // Click Settings nav item
        await component.getByRole('button', { name: /Settings|Pengaturan/i }).click();

        // Start waiting for logout
        const logoutPromise = page.waitForFunction(() => (window as any)._signOutCalled());

        // Click Logout in Settings
        await component.getByRole('button', { name: /Sign Out|Keluar/i }).click();

        // 4. Verify:
        // - Firebase signOut was called (DEF-006 Fix)
        // - Auth Step reverts to Login (Verified by "Sign In" text)

        await logoutPromise;

        // Check UI
        await expect(component.getByRole('button', { name: /Sign In|Masuk/i })).toBeVisible();
    });
});
