import { test, expect } from '@playwright/experimental-ct-react';
import { Sidebar } from '../../src/components/Sidebar';
import { TestWrapper } from '../../src/components/TestWrapper';

test.use({ viewport: { width: 1280, height: 720 } }); // Desktop viewport

test.describe('Sidebar', () => {
    test('should render navigation items', async ({ mount }) => {
        const component = await mount(
            <TestWrapper>
                <Sidebar
                    currentView="treatments"
                    onNavigate={() => { }}
                    isDarkMode={false}
                    toggleDarkMode={() => { }}
                    isCollapsed={false}
                    onToggle={() => { }}
                />
            </TestWrapper>
        );

        // Admin has 4 nav items: Treatments, Patients, History, Report
        await expect(component.locator('nav button')).toHaveCount(4);
    });

    test('should collapse and expand', async ({ mount }) => {
        const component = await mount(
            <TestWrapper>
                <Sidebar
                    currentView="treatments"
                    onNavigate={() => { }}
                    isDarkMode={false}
                    toggleDarkMode={() => { }}
                    isCollapsed={true}
                    onToggle={() => { }}
                />
            </TestWrapper>
        );

        // When collapsed, text should not be visible (or hidden via CSS). 
        // Logic says: {!isCollapsed && <span ...>}
        await expect(component.getByText('Treatments')).not.toBeVisible();

        // Icon should still be there
        await expect(component.locator('nav button').first()).toBeVisible();
    });

    test('should highlight active view', async ({ mount }) => {
        const component = await mount(
            <TestWrapper>
                <Sidebar
                    currentView="patients"
                    onNavigate={() => { }}
                    isDarkMode={false}
                    toggleDarkMode={() => { }}
                    isCollapsed={false}
                    onToggle={() => { }}
                />
            </TestWrapper>
        );

        // Patients is the second item (index 1)
        const patientsBtn = component.locator('nav button').nth(1);
        await expect(patientsBtn).toHaveClass(/bg-primary/);
        await expect(patientsBtn).toHaveClass(/text-primary/);
    });

    test('should show extra options for admin', async ({ mount }) => {
        const component = await mount(
            <TestWrapper storeValues={{ userRole: 'admin' }}>
                <Sidebar
                    currentView="treatments"
                    onNavigate={() => { }}
                    isDarkMode={false}
                    toggleDarkMode={() => { }}
                    isCollapsed={false}
                    onToggle={() => { }}
                />
            </TestWrapper>
        );

        // Admin has 4 nav items: Treatments, Patients, History, Report
        await expect(component.locator('nav button')).toHaveCount(4);
    });
});
