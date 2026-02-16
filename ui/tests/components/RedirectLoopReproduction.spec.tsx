import { test, expect } from '@playwright/experimental-ct-react';
import { TestWrapper } from '../../src/components/TestWrapper';
import { TestTokenWatcher as TokenWatcher } from '../../src/components/TestTokenWatcher';

test.use({ viewport: { width: 500, height: 500 } });

test('should IGNORE firebase token update when user is STAFF to prevent redirect loop', async ({ mount, page }) => {
    page.on('console', msg => console.log(`[Browser Console]: ${msg.text()}`));

    await page.addInitScript(() => {
        localStorage.setItem('user_role', 'staff');
        sessionStorage.setItem('google_access_token', 'STAFF_SERVICE_TOKEN');
    });

    const component = await mount(
        <TestWrapper storeValues={{ userRole: 'staff', accessToken: 'STAFF_SERVICE_TOKEN' }}>
            <TokenWatcher />
        </TestWrapper>
    );

    await expect(component.getByTestId('token-value')).toHaveText('STAFF_SERVICE_TOKEN');

    await page.evaluate(() => {
        if ((window as any).__triggerTokenChange) {
            (window as any).__triggerTokenChange('FIREBASE_ID_TOKEN');
        } else {
            console.error('MockAuthService did not register __triggerTokenChange');
        }
    });

    await page.waitForTimeout(500);
    await expect(component.getByTestId('token-value')).toHaveText('STAFF_SERVICE_TOKEN');
});

