import { test, expect } from '@playwright/experimental-ct-react';
import { Reporting } from '../../src/components/Reporting';
import { TestWrapper } from '../../src/components/TestWrapper';

test.use({ viewport: { width: 1280, height: 800 } });

test.describe('Reporting', () => {
    const mockTreatments = [
        {
            id: 't1',
            date: '2024-01-15T10:00:00.000Z',
            dentist: 'Dr. Smith',
            patientId: 'p1',
            treatmentType: 'Consultation',
            amount: 500000,
            nettTotal: 500000,
            discount: 0,
            adminFee: 0
        },
        {
            id: 't2',
            date: '2024-01-16T11:00:00.000Z',
            dentist: 'Dr. Jones',
            patientId: 'p2',
            treatmentType: 'Orthodontics',
            bracesPrice: 5000000,
            amount: 6000000,
            nettTotal: 6000000,
            discount: 0,
            adminFee: 0
        }
    ];

    const mockPatients = [
        { id: 'p1', name: 'Patient One', rowIndex: 1 },
        { id: 'p2', name: 'Patient Two', rowIndex: 2 }
    ];

    test('should render summary view with dentist cards', async ({ mount }) => {
        const component = await mount(
            <TestWrapper storeValues={{ treatments: mockTreatments, patients: mockPatients }}>
                <Reporting />
            </TestWrapper>
        );

        // Should show dentist names on cards
        await expect(component.getByText('Dr. Smith')).toBeVisible();
        await expect(component.getByText('Dr. Jones')).toBeVisible();

        // Should show total revenue with currency format
        await expect(component.getByText(/Rp/)).toBeVisible();
    });

    test('should navigate to detail view on dentist click', async ({ mount }) => {
        const component = await mount(
            <TestWrapper storeValues={{ treatments: mockTreatments, patients: mockPatients }}>
                <Reporting />
            </TestWrapper>
        );

        // Click on Dr. Smith's card
        await component.getByText('Dr. Smith').click();

        // Should show detail heading with dentist name
        await expect(component.locator('h1')).toContainText('Dr. Smith');

        // Should show calculator section
        await expect(component.locator('input[type="number"]').first()).toBeVisible();

        // Should show patient name for Dr. Smith's treatment
        await expect(component.getByText('Patient One')).toBeVisible();
    });

    test('should render empty state when no treatments', async ({ mount }) => {
        const component = await mount(
            <TestWrapper storeValues={{ treatments: [], patients: [] }}>
                <Reporting />
            </TestWrapper>
        );

        // Should still render the component structure
        await expect(component).not.toBeEmpty();
        // Should show total as Rp 0
        await expect(component.getByText('Rp 0')).toBeVisible();
    });
});
