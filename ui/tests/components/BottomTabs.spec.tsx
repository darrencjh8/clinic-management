import { test, expect } from '@playwright/experimental-ct-react';
import { BottomTabs } from '../../src/components/BottomTabs';
import { TestWrapper } from '../../src/components/TestWrapper';

test.use({ viewport: { width: 375, height: 667 } }); // Mobile viewport

test.describe('BottomTabs', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should render navigation items', async ({ mount }) => {
        const component = await mount(
            <TestWrapper storeValues={{ userRole: 'staff' }}>
                <BottomTabs
                    currentView="treatments"
                    onNavigate={() => { }}
                />
            </TestWrapper>
        );

        // Check for common items (using partial text or icons might be hard, so usage key labels if translated)
        // Since we are mocking translation in TestWrapper usually, or it uses actual i18n
        // Let's assume standard mock keys or default values if context not fully loaded
        // The file uses 'sidebar.treatments', 'sidebar.patients', etc.
        // Assuming TestWrapper provides a working i18n
        // Check for 4 buttons: Treatments, Patients, History, Settings
        const buttons = component.locator('button');
        await expect(buttons).toHaveCount(4);
    });

    test('should highlight active tab', async ({ mount }) => {
        const component = await mount(
            <TestWrapper>
                <BottomTabs
                    currentView="patients"
                    onNavigate={() => { }}
                />
            </TestWrapper>
        );

        const patientsButton = component.locator('button').nth(1); // 2nd item
        await expect(patientsButton).toHaveClass(/text-primary/);

        const treatmentsButton = component.locator('button').nth(0);
        await expect(treatmentsButton).toHaveClass(/text-gray-400/);
    });

    test('should call onNavigate when clicked', async ({ mount }) => {
        let navigatedTo = '';
        const component = await mount(
            <TestWrapper>
                <BottomTabs
                    currentView="treatments"
                    onNavigate={(view) => { navigatedTo = view; }}
                />
            </TestWrapper>
        );

        await component.locator('button').nth(1).click(); // Patients
        expect(navigatedTo).toBe('patients');
    });

    test('should show reporting tab for admin', async ({ mount }) => {
        const component = await mount(
            <TestWrapper storeValues={{ userRole: 'admin' }}>
                <BottomTabs
                    currentView="treatments"
                    onNavigate={() => { }}
                />
            </TestWrapper>
        );

        // Admin has 5 buttons: Treatments, Patients, History, Reporting, Settings
        await expect(component.locator('button')).toHaveCount(5);
    });
});
