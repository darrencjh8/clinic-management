import { test, expect } from '@playwright/experimental-ct-react';
import { LoginScreen } from '../../src/components/LoginScreen';
import { TestWrapper } from '../../src/components/TestWrapper';

test.use({ viewport: { width: 500, height: 500 } });

test('should render firebase login by default and switch to google', async ({ mount }) => {
    const component = await mount(
        <TestWrapper>
            <LoginScreen
                onLoginSuccess={() => { }}
                onSpreadsheetIdSubmit={() => { }}
                userRole={null}
            />
        </TestWrapper>
    );

    // Default: Firebase Login
    await expect(component.locator('input[type="email"]')).toBeVisible();
    await expect(component.locator('input[type="password"]')).toBeVisible();

    // Switch to Google Login (Admin)
    // We use the button that toggles the mode. It likely contains text about switching.
    // Since we don't know exact translation, we'll look for the button at the bottom.
    const switchButton = component.locator('button').last();
    await switchButton.click();

    // Now Google Login should be visible
    // The button has "Google" text or img alt="Google"
    await expect(component.locator('img[alt="Google"]')).toBeVisible();
});
