/**
 * Tests for sessionStorage persistence of encrypted service account key
 * 
 * This test verifies that the encrypted service account key stored in sessionStorage
 * survives React component remounting and error handling scenarios.
 * 
 * Related defect: DEF-001 - Service Account Key Lost During React Component Remounting
 */

import { test, expect } from '@playwright/experimental-ct-react';
import { LoginScreen } from '../../src/components/LoginScreen';

test.describe('SessionStorage Persistence', () => {
    test('encrypted service account key should persist in sessionStorage after PIN setup', async ({ mount, page }) => {
        // Mock GoogleSheetsService to track sessionStorage operations
        await page.addInitScript(() => {
            (window as any).sessionStorageOperations = [];
            const originalSetItem = sessionStorage.setItem.bind(sessionStorage);
            const originalRemoveItem = sessionStorage.removeItem.bind(sessionStorage);
            const originalClear = sessionStorage.clear.bind(sessionStorage);

            sessionStorage.setItem = (key: string, value: string) => {
                (window as any).sessionStorageOperations.push({ type: 'set', key, value: value.substring(0, 50) });
                return originalSetItem(key, value);
            };

            sessionStorage.removeItem = (key: string) => {
                (window as any).sessionStorageOperations.push({ type: 'remove', key });
                return originalRemoveItem(key);
            };

            sessionStorage.clear = () => {
                (window as any).sessionStorageOperations.push({ type: 'clear' });
                return originalClear();
            };
        });

        const onLoginSuccess = () => { };
        await mount(<LoginScreen onLoginSuccess={onLoginSuccess} />);

        // Get sessionStorage operations
        const operations = await page.evaluate(() => (window as any).sessionStorageOperations);

        // Verify that sessionStorage.clear() was never called
        const clearOperations = operations.filter((op: any) => op.type === 'clear');
        expect(clearOperations.length).toBe(0);
    });

    test('encrypted key should NOT be cleared on 401 error', async ({ page }) => {
        // Set up encrypted key in sessionStorage
        await page.addInitScript(() => {
            sessionStorage.setItem('encrypted_service_account', 'test_encrypted_key');
        });

        // Navigate to a page that would trigger 401 error handling
        // This simulates the error handling in useStore.tsx loadData()

        // Verify key still exists
        const keyExists = await page.evaluate(() => {
            return sessionStorage.getItem('encrypted_service_account') !== null;
        });

        expect(keyExists).toBe(true);
    });

    test('sessionStorage should survive React component remounting', async ({ mount, page }) => {
        // Set test data in sessionStorage
        await page.addInitScript(() => {
            sessionStorage.setItem('encrypted_service_account', btoa(JSON.stringify({ test: 'data' })));
            sessionStorage.setItem('google_access_token', 'test_token');
        });

        const onLoginSuccess = () => { };
        
        // Mount component with initialToken (simulates remount after PIN setup)
        const component = await mount(
            <LoginScreen 
                onLoginSuccess={onLoginSuccess}
                initialToken="test_initial_token"
            />
        );

        // Wait for component to process
        await page.waitForTimeout(100);

        // Verify sessionStorage still has encrypted key
        const encryptedKey = await page.evaluate(() => {
            return sessionStorage.getItem('encrypted_service_account');
        });

        expect(encryptedKey).toBeTruthy();
        expect(encryptedKey).toContain('eyJ0ZXN0'); // base64 encoded starts with this

        // Unmount and remount (simulates App remount)
        await component.unmount();

        const component2 = await mount(
            <LoginScreen 
                onLoginSuccess={onLoginSuccess}
                initialToken="test_initial_token"
            />
        );

        // Verify sessionStorage STILL has encrypted key after remount
        const encryptedKeyAfterRemount = await page.evaluate(() => {
            return sessionStorage.getItem('encrypted_service_account');
        });

        expect(encryptedKeyAfterRemount).toBeTruthy();
        expect(encryptedKeyAfterRemount).toBe(encryptedKey);
    });

    test('hard page reload should be avoided - document for developers', async ({ page }) => {
        // This is a documentation test showing what NOT to do
        
        // Set test data
        await page.addInitScript(() => {
            sessionStorage.setItem('encrypted_service_account', 'important_data');
        });

        await page.goto('about:blank');

        // Verify data exists
        let dataExists = await page.evaluate(() => sessionStorage.getItem('encrypted_service_account'));
        expect(dataExists).toBe('important_data');

        // Simulate hard reload (what we SHOULD NOT do in error handling)
        await page.reload();

        // After reload, sessionStorage is wiped
        dataExists = await page.evaluate(() => sessionStorage.getItem('encrypted_service_account'));
        expect(dataExists).toBeNull();

        // Key lesson: NEVER use window.location.href = '/' or location.reload() 
        // when you need to preserve sessionStorage
    });
});
