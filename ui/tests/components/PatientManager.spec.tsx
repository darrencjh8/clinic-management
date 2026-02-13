import { test, expect } from '@playwright/experimental-ct-react';
import { PatientManager } from '../../src/components/PatientManager';
import { TestWrapper } from '../../src/components/TestWrapper';

test.use({ viewport: { width: 1024, height: 768 } });

test.describe('PatientManager', () => {
    test('should render patient list', async ({ mount }) => {
        const patients = [
            { id: '1', name: 'John Doe', age: 30, notes: 'Note 1', rowIndex: 1 },
            { id: '2', name: 'Jane Smith', age: 25, notes: '', rowIndex: 2 }
        ];

        const component = await mount(
            <TestWrapper storeValues={{ patients }}>
                <PatientManager />
            </TestWrapper>
        );

        await expect(component.getByText('John Doe')).toBeVisible();
        await expect(component.getByText('Jane Smith')).toBeVisible();
    });



    test('should open add patient modal', async ({ mount, page }) => {
        const component = await mount(
            <TestWrapper>
                <PatientManager />
            </TestWrapper>
        );

        const addButton = component.getByRole('button', { name: /Tambah Pasien|Add Patient/i });
        await addButton.click();

        // The form is shown inline, not as a modal dialog
        // Check for form fields (using placeholder as label is missing)
        await expect(component.getByPlaceholder(/Nama|Name/i)).toBeVisible();
    });
});
