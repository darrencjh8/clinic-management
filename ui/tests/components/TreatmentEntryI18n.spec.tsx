import { test, expect } from '@playwright/experimental-ct-react';
import { TreatmentEntry } from '../../src/components/TreatmentEntry';
import { TestWrapper } from '../../src/components/TestWrapper';

test.use({ viewport: { width: 800, height: 900 } });

test.describe('TreatmentEntry i18n', () => {
    test('should render translated text for edit mode', async ({ mount }) => {
        const editingTreatment = {
            id: 'test-id',
            patientId: 'p1',
            dentist: 'Dr. Smith',
            admin: 'Admin A',
            amount: 500000,
            treatmentType: 'Cleaning',
            date: new Date().toISOString(),
            rowIndex: 1
        };

        const component = await mount(
            <TestWrapper>
                <TreatmentEntry editingTreatment={editingTreatment} onEditComplete={() => { }} />
            </TestWrapper>
        );

        // Verify "Edit Treatment" title (Indonesian: "Ubah Perawatan")
        await expect(component.locator('h1')).toHaveText('Ubah Perawatan');

        // Verify "Cancel" button (Indonesian: "Batal")
        await expect(component.getByTestId('cancel-edit-button')).toHaveText('Batal');

        // Verify "Update Treatment" button (Indonesian: "Perbarui Perawatan")
        await expect(component.locator('button[type="submit"]')).toHaveText('Perbarui Perawatan');
    });

    test('should render translated validation message', async ({ mount }) => {
        const component = await mount(
            <TestWrapper>
                <TreatmentEntry />
            </TestWrapper>
        );

        // Verify "Select at least one treatment type" message (Indonesian: "Pilih setidaknya satu jenis perawatan")
        // Initially no treatment types are selected, so the message should be visible
        await expect(component.locator('text=Pilih setidaknya satu jenis perawatan')).toBeVisible();
    });
});
