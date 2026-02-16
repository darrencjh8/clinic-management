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
import { TestWrapper } from '../../src/components/TestWrapper';

// Mock Service Account Data with valid PEM key format for jose
const MOCK_SERVICE_ACCOUNT = {
    type: 'service_account',
    project_id: 'test-project',
    private_key_id: 'test-key-id',
    // This is a valid 2048-bit RSA private key generated for testing purposes only
    private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDKe9nrWz9uvcq1\nd9OkpnkPeuBM60q1mihVs7TFd4W9L4YYnhi0BkGqyFSEI6d39J1lzM8HuHpkepCB\n9mY+g25F0uzjhdJx35YBAJlE17/dUF+biIWf55dK5QL9g79sTmfkOuQdhCJI7N+9\n2OOELX+cbeIkXB3njHea9aeSTcwUmN8LlUUeCZN5ZzLnl49mHmA0Z/lREtzT1ibA\nWxkF3aHPHXLnXVDUS+SwsJpN6eF/VtMnUFbOOLnYLw8yPnj7aqHO4lN70BEDmaex\nBXDRDykLE5FtzI8+wgCOMMzNPAuegVkO7LzjgTAIatR0dFsdOttRXuf2vuqOWIpV\nhOsuJWYTAgMBAAECggEADpphDIrPp9ZzRKQoNOM2rumfPJzpjfBYwVmNC4LDt/Gx\n+5uHT5B18vGwurjxjoKrSVi8g6OH3DBEtMLG+/IxpUKBiCUyGLlV0auv4hmnQjhW\nNNrjPDWRITsj/JGgYBjFgF3I7uIFMPo4ZrI6MmGvpuH74cBs/bKRO7FEzRXkRoXh\nD04TbsmQbmf+hqdmgLGzTxg99dYGA7vXY0U27SuE2anlBVpr7KK/P9kGc33gw7Q7\nHauQ2g4i8bCuP5WyNejP88v2u50/+dKaBRr7bQRiYV9It9uvfVLCP0i3ca4HmFN1\nb9DLr04mXx/AUxCjYllp8fEOs7lwZPiTM3o5rnXp/QKBgQDsSvVjLvug6z5uCjvL\ncbEXztpN0tDQIJTj2n2si5qRqA7QATigEZLwamCYRvMjNsB7PkHysrvcjnSRZCa+\nVCKMCm9xzSFVKVdQ/4rAeebDOu36duTXq4O7lLcrXrnCNGmMCcwABzTZhyTVtd1W\ncJy4lmmu6+14vikrGxJc5g08BQKBgQDbXwsH0/kqC+3X+eENJosgU8/2SaPLVseo\n03idxZrw5AtuRDoftbbSLJIEHI6TFZfllAm7W1+P+uo9Oo52/56k/qavxGcZR4BI\nP2mZS1ViqGHsC98PLs/ou61sw5mWxD5uhLIOZaL9GDfchgvLuQ8aZabJllVn0zhF\nve5xwUBNNwKBgQCGL3c0sPyigJT+Zn9YZCL+czCTm1GLr8T9tBlEQC8x4i8vPlJK\nzFAWiUJ7l2cBq1kZY9yNl6SJdriJzEcYNK09u7tX8/am5wg37jZ8YX2DhtaYMqZ4\nN2Viw+xVC8EPoTYDGZkotu7zTQTE/DdKnD7TsE8pz78Wn16/pOsDqH0BhQKBgQDD\nZr1kk6P1l/qbzrBwDk0O1pj/QEjt7raZ4wQlRMbmm7qy1YMQi8P1Ik5N60H0Md/D\nV0Hz6UgN7+qF74rG5JpjTZEcL03GbrINqK5fJYNBBctzfn+J/qCjJcksgG5mpRcX\nSotv14h++PuJKr2HEagqUzFljss0WChftvaVzRWBsQKBgBK9F6n4O+0je1SYVw93\n0r2tHC6K/nwbU9pl/FPoUz8j2rdEBpt8kpFnqJDiGWscPLHw4wBZmEJnF4sfBbU+\nCij8STAV9G61As/ZEYrkYXFg3FhFvDvDjJtkhfoMUoG1BUw//1Jh+mNTbns5xL38\nqTHP7guqOeWjGthcrPwWrEYo\n-----END PRIVATE KEY-----\n',
    client_email: 'test-service-account@test-project.iam.gserviceaccount.com',
    client_id: '123456789',
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: 'https://www.googleapis.com/robot/v1/metadata/x509/test-service-account%40test-project.iam.gserviceaccount.com'
};

test.describe('SessionStorage Persistence', () => {
    test.beforeEach(async ({ page }) => {
        // Mock Google OAuth Token Endpoint
        await page.route('https://oauth2.googleapis.com/token', async route => {
            const body = route.request().postData();
            if (body && body.includes('grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer')) {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        access_token: 'mock_access_token_' + Date.now(),
                        expires_in: 3600,
                        token_type: 'Bearer'
                    })
                });
            } else {
                await route.continue();
            }
        });

        // Intercept drive list files call
        await page.route('https://www.googleapis.com/drive/v3/files**', async route => {
            const headers = route.request().headers();
            if (headers['authorization'] === 'Bearer expired_token') {
                await route.fulfill({ status: 401, body: 'Unauthorized' });
            } else {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ files: [] })
                });
            }
        });
    });

    // NOTE: Session persistence after PIN setup is covered in e2e/auth-flow.spec.ts
    // Component tests should focus on isolated behavior, not full authentication flows.

    test('sessionStorage should survive React component remounting', async ({ mount, page }) => {
        // Set valid test data in sessionStorage using mount-evaluate-remount strategy

        // Initial dummy mount to get page context ready
        const dummy = await mount(<div id="dummy-setup-test3" />);

        await page.evaluate((mockKey) => {
            sessionStorage.setItem('encrypted_service_account', btoa(JSON.stringify(mockKey)));
            sessionStorage.setItem('google_access_token', 'initial_test_token');
        }, MOCK_SERVICE_ACCOUNT);

        // Unmount dummy to clear DOM
        await dummy.unmount();

        const onLoginSuccess = () => { };

        // Mount component with initialToken (simulates remount after PIN setup)
        const component = await mount(
            <TestWrapper>
                <LoginScreen
                    onLoginSuccess={onLoginSuccess}
                    initialToken="initial_test_token"
                />
            </TestWrapper>
        );

        // Wait for potential async operations
        await page.waitForTimeout(500);

        // Verify key exists
        const encryptedKey = await page.evaluate(() => sessionStorage.getItem('encrypted_service_account'));
        expect(encryptedKey).toBeTruthy();

        // Unmount and remount
        await component.unmount();
        await mount(
            <TestWrapper>
                <LoginScreen
                    onLoginSuccess={onLoginSuccess}
                    initialToken="initial_test_token"
                />
            </TestWrapper>
        );

        // Verify key still exists
        const encryptedKeyRemount = await page.evaluate(() => sessionStorage.getItem('encrypted_service_account'));
        expect(encryptedKeyRemount).toBeTruthy();
        expect(encryptedKeyRemount).toBe(encryptedKey);
    });

    test('Self-healing: 401 should trigger lazy restoration from sessionStorage', async ({ mount, page }) => {
        // This test simulates the Service Layer self-healing mechanism logic
        // We will mock a situation where the service account key is NULL in memory
        // but PRESENT in sessionStorage, then trigger a 401.

        // 1. Setup sessionStorage using mount-evaluate-remount strategy
        // We mount a dummy component first to ensure page is initialized, then set sessionStorage,
        // then mount the actual component which should see the data.

        // Initial dummy mount to get page context ready
        const dummy = await mount(<div id="dummy-setup" />);

        await page.evaluate((mockKey) => {
            sessionStorage.setItem('encrypted_service_account', btoa(JSON.stringify(mockKey)));
            sessionStorage.setItem('google_access_token', 'expired_token');
        }, MOCK_SERVICE_ACCOUNT);

        // Unmount dummy to clear DOM
        await dummy.unmount();


        // Intercept 401 response and check if refresh is attempted
        let refreshAttempted = false;
        await page.route('https://sheets.googleapis.com/v4/spreadsheets/test-id', async route => {
            const headers = route.request().headers();

            // First request with expired token
            if (headers['authorization'] === 'Bearer expired_token') {
                await route.fulfill({
                    status: 401,
                    contentType: 'application/json',
                    body: JSON.stringify({ error: 'Unauthorized' })
                });
            } else if (headers['authorization'].includes('mock_access_token')) {
                // Second request with REFRESHED token (success!)
                refreshAttempted = true;
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ spreadsheetId: 'test-id' })
                });
            } else {
                await route.continue();
            }
        });

        // Trigger the service call via console execution (since we are testing the Service class logic)
        // We need to import the class or use an exposed instance. 
        // Since we can't easily import locally in page.evaluate, we rely on the implementation 
        // being bundled or testing via UI interaction that triggers it.
        // For CT, we'll assume the component triggers a fetch, but let's try to expose the service if possible
        // OR we just mount the LoginScreen which triggers fetchSpreadsheets

        // Note: For this specific test, we might need to rely on the fact that LoginScreen calls listSpreadsheets
        // But listSpreadsheets hits drive/v3/files. Let's update the route to match.

        await mount(
            <TestWrapper>
                <LoginScreen onLoginSuccess={() => { }} initialToken="expired_token" />
            </TestWrapper>
        );

        // Wait for retries
        await page.waitForTimeout(2000);

        // The Service should have self-healed
        // Check if the token in sessionStorage got updated
        const currentToken = await page.evaluate(() => sessionStorage.getItem('google_access_token'));
        expect(currentToken).toContain('mock_access_token');
        expect(currentToken).not.toBe('expired_token');
    });
});
