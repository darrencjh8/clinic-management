import { test, expect } from '@playwright/experimental-ct-react';
import { TreatmentEntry } from '../../src/components/TreatmentEntry';
import { TestWrapper } from '../../src/components/TestWrapper';

test.use({ viewport: { width: 800, height: 900 } });

test.describe('TreatmentEntry Component', () => {
    test('should render with date picker', async ({ mount }) => {
        const component = await mount(
            <TestWrapper>
                <TreatmentEntry />
            </TestWrapper>
        );

        // Date picker should exist and have a value (today's date)
        const datePicker = component.locator('input[type="date"]');
        await expect(datePicker).toBeVisible();

        // Should have a value in YYYY-MM-DD format
        const value = await datePicker.inputValue();
        expect(value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('should display treatment type checkboxes', async ({ mount }) => {
        const component = await mount(
            <TestWrapper>
                <TreatmentEntry />
            </TestWrapper>
        );

        // Should have checkboxes for treatment types (from mock store)
        const cleaningLabel = component.locator('label:has-text("Cleaning")');
        const fillingLabel = component.locator('label:has-text("Filling")');

        await expect(cleaningLabel).toBeVisible();
        await expect(fillingLabel).toBeVisible();

        // Verify they contain the checkbox indicator div
        const cleaningCheckmark = cleaningLabel.locator('div').first();
        await expect(cleaningCheckmark).toBeVisible();
    });

    test('should allow multiple treatment type selection', async ({ mount }) => {
        const component = await mount(
            <TestWrapper>
                <TreatmentEntry />
            </TestWrapper>
        );

        // Initially nothing is selected
        const cleaningLabel = component.locator('label:has-text("Cleaning")');
        const checkupLabel = component.locator('label:has-text("Checkup")');

        // Click to select
        await cleaningLabel.click();
        await checkupLabel.click();

        // Both should now have the selected state (border-primary class)
        await expect(cleaningLabel).toHaveClass(/border-primary/);
        await expect(checkupLabel).toHaveClass(/border-primary/);
    });

    test('should show admin fee default of 10.000', async ({ mount }) => {
        const component = await mount(
            <TestWrapper>
                <TreatmentEntry />
            </TestWrapper>
        );

        // Find admin fee input - it's the second numeric input after amount
        const adminFeeInput = component.locator('input[inputmode="numeric"]').nth(1);
        await expect(adminFeeInput).toHaveValue('10.000');
    });

    test('should clear admin fee on focus', async ({ mount }) => {
        const component = await mount(
            <TestWrapper>
                <TreatmentEntry />
            </TestWrapper>
        );

        const adminFeeInput = component.locator('input[inputmode="numeric"]').nth(1);
        await expect(adminFeeInput).toHaveValue('10.000');

        // Focus and blur to trigger clearance
        await adminFeeInput.focus();

        // Should clear the default value
        await expect(adminFeeInput).toHaveValue('');
    });

    test('should show braces type selector when orthodontic is selected', async ({ mount }) => {
        const component = await mount(
            <TestWrapper>
                <TreatmentEntry />
            </TestWrapper>
        );

        // Count visible selects - should be 2 initially (dentist, admin)
        const selects = component.locator('select');
        await expect(selects).toHaveCount(2);

        // Select Orthodontic or Ortodontik
        const orthodonticLabel = component.locator('label:has-text("Orthodontic")');
        await orthodonticLabel.click();

        // Now should have 3 selects (braces type added)
        await expect(selects).toHaveCount(3);
    });

    test('should pre-populate form in edit mode', async ({ mount }) => {
        const editingTreatment = {
            id: 'test-id',
            patientId: 'p1',
            dentist: 'Dr. Smith',
            admin: 'Admin A',
            amount: 500000,
            treatmentType: 'Cleaning,Filling',
            date: '2024-01-15T10:00:00.000Z',
            adminFee: 15000,
            discount: 5000,
            rowIndex: 5
        };

        const component = await mount(
            <TestWrapper>
                <TreatmentEntry
                    editingTreatment={editingTreatment}
                    onEditComplete={() => { }}
                />
            </TestWrapper>
        );

        // Amount should be populated (formatted as 500.000)
        const amountInput = component.locator('input[inputmode="numeric"]').first();
        await expect(amountInput).toHaveValue('500.000');

        // Treatment types should be selected
        const cleaningLabel = component.locator('label:has-text("Cleaning")');
        const fillingLabel = component.locator('label:has-text("Filling")');
        await expect(cleaningLabel).toHaveClass(/border-primary/);
        await expect(fillingLabel).toHaveClass(/border-primary/);
    });

    test('should show cancel button in edit mode', async ({ mount }) => {
        const editingTreatment = {
            id: 'test-id',
            patientId: 'p1',
            dentist: 'Dr. Smith',
            admin: 'Admin A',
            amount: 100000,
            treatmentType: 'Cleaning',
            date: new Date().toISOString(),
            rowIndex: 1
        };

        const component = await mount(
            <TestWrapper>
                <TreatmentEntry
                    editingTreatment={editingTreatment}
                    onEditComplete={() => { }}
                />
            </TestWrapper>
        );

        // Should have a cancel button
        const cancelButton = component.getByTestId('cancel-edit-button');
        await expect(cancelButton).toBeVisible();
    });
});
