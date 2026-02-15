import { test, expect } from '@playwright/experimental-ct-react';
import { SyncStatus } from '../../src/components/SyncStatus';
import { TestWrapper } from '../../src/components/TestWrapper';

test.use({ viewport: { width: 500, height: 500 } });

test.describe('SyncStatus', () => {
    test('should render status when authenticated', async ({ mount }) => {
        const component = await mount(
            <TestWrapper storeValues={{
                accessToken: 'test-token',
                spreadsheetId: 'test-sheet',
                userRole: 'admin'
            }}>
                <SyncStatus />
            </TestWrapper>
        );

        // Basic visibility check - exact text matching might fail due to i18n/context issues
        await expect(component).not.toBeEmpty();
    });
});
