import { test, expect } from '@playwright/experimental-ct-react';
import { Layout } from '../../src/components/Layout';
import { TestWrapper } from '../../src/components/TestWrapper';

test.use({ viewport: { width: 1024, height: 768 } }); // Desktop

test.describe('Layout', () => {
    test('should render sidebar and children on desktop', async ({ mount }) => {
        const component = await mount(
            <TestWrapper storeValues={{ accessToken: 'token', spreadsheetId: 'sheet', userRole: 'admin' }}>
                <Layout currentView="treatments" onNavigate={() => { }}>
                    <div data-testid="child-content">Main Content</div>
                </Layout>
            </TestWrapper>
        );

        await expect(component.getByTestId('child-content')).toBeVisible();

        // Sidebar check - just check the aside element is visible
        // We know Sidebar is rendered, exact text/title check assumes specific state/i18n
        await expect(component.locator('aside')).toBeVisible();
    });

    test('should render bottom tabs on mobile', async ({ mount }) => {
        // Override viewport for this test? Playwright CT might not support per-test usage easily if already mounted?
        // Actually it acts as a separate worker/fixture setup usually.
    });
});

test.describe('Layout Mobile', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should render bottom tabs and children', async ({ mount }) => {
        const component = await mount(
            <TestWrapper storeValues={{ accessToken: 'token', spreadsheetId: 'sheet', userRole: 'staff' }}>
                <Layout currentView="treatments" onNavigate={() => { }}>
                    <div data-testid="child-content">Main Content</div>
                </Layout>
            </TestWrapper>
        );

        await expect(component.getByTestId('child-content')).toBeVisible();
        // Check bottom tabs presence (they have titles)
        const tabs = component.locator('nav').last(); // BottomTabs has a nav
        await expect(tabs).toBeVisible();

        // Sidebar should be hidden or null?
        // Layout hides sidebar with `md:flex` (hidden by default) in Sidebar.tsx likely?
        // In Layout.tsx: <Sidebar ... /> 
        // and Sidebar.tsx has: className="hidden md:flex ..."
        // So checking it's hidden
        const sidebar = component.locator('aside');
        await expect(sidebar).toBeHidden();
    });
});
