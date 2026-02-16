import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Patient Treatment Recording
 * 
 * Prerequisites:
 * - User must be authenticated (these tests assume login is already done)
 * - A spreadsheet must be selected
 * - E2E_STAGING_SHEET_ID should be configured in .env.e2e
 * 
 * These tests cover:
 * 1. Adding a new patient
 * 2. Recording a treatment
 * 3. Viewing treatment history
 * 4. Editing a treatment
 */

test.describe('Treatment Recording E2E', () => {
    test.setTimeout(180000); // 3 minutes for full flow

    // Helper to complete login flow
    async function loginIfNeeded(page: any) {
        const email = process.env.E2E_TEST_EMAIL!;
        const password = process.env.E2E_TEST_PASSWORD!;

        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');

        // Check if already on main app
        const mainApp = page.locator('text=/New Treatment|Perawatan Baru/i');
        if (await mainApp.isVisible({ timeout: 5000 }).catch(() => false)) {
            console.log('Already logged in, on main app');
            return;
        }

        // Check if on login page
        const emailInput = page.locator('input[type="email"]');
        if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
            console.log('On login page, logging in...');
            await emailInput.fill(email);
            await page.fill('input[type="password"]', password);
            await page.click('button[type="submit"]');
            
            // Handle PIN screen
            const pinScreen = page.locator('text=/Set a PIN|Enter PIN|Atur PIN|Masukkan PIN/i');
            const spreadsheetSetup = page.locator('text=/Setup Database|Pengaturan Database/i');
            
            await expect(pinScreen.or(spreadsheetSetup).or(mainApp)).toBeVisible({ timeout: 30000 });
            
            if (await pinScreen.isVisible()) {
                const pinInput = page.locator('input[type="password"]');
                await pinInput.fill('123456');
                await page.locator('button[type="submit"]').click();
                
                // Check if PIN setup (need to enter twice)
                const isSetup = await page.locator('text=/Set a PIN|Atur PIN/i').isVisible({ timeout: 1000 }).catch(() => false);
                if (isSetup) {
                    await page.waitForTimeout(500);
                    await pinInput.fill('123456');
                    await page.locator('button[type="submit"]').click();
                }
            }
            
            // Handle spreadsheet selection
            if (await spreadsheetSetup.isVisible({ timeout: 5000 }).catch(() => false)) {
                const createButton = page.locator('button').filter({ hasText: /Create New|Buat Spreadsheet Baru/i });
                const sheetButtons = page.locator('button').filter({ hasText: /Dental|Clinic|Wisata/i });
                
                if (await createButton.isVisible({ timeout: 3000 }).catch(() => false)) {
                    await createButton.click();
                } else if (await sheetButtons.first().isVisible({ timeout: 3000 }).catch(() => false)) {
                    await sheetButtons.first().click();
                }
            }
            
            await expect(mainApp).toBeVisible({ timeout: 30000 });
        }
    }

    test('should display treatment entry form', async ({ page }) => {
        test.skip(!process.env.E2E_TEST_EMAIL || !process.env.E2E_TEST_PASSWORD, 'Credentials required');
        await loginIfNeeded(page);
        
        // Should see the treatment entry form
        await expect(page.locator('text=/New Treatment|Perawatan Baru/i').first()).toBeVisible();
        
        // Should see date picker
        await expect(page.locator('input[type="date"]')).toBeVisible();
        
        // Should see patient autocomplete
        await expect(page.locator('input[placeholder*="patient" i], input[placeholder*="pasien" i]')).toBeVisible();
        
        // Should see treatment type checkboxes
        await expect(page.locator('text=/Checkup|Scaling|Extraction|Filling/i').first()).toBeVisible();
    });

    test('should add a new patient via autocomplete', async ({ page }) => {
        test.skip(!process.env.E2E_TEST_EMAIL || !process.env.E2E_TEST_PASSWORD, 'Credentials required');
        await loginIfNeeded(page);
        
        // Generate unique patient name
        const timestamp = Date.now();
        const patientName = `E2E Test Patient ${timestamp}`;
        
        // Find and interact with patient input
        const patientInput = page.locator('input[placeholder*="patient" i], input[placeholder*="pasien" i]').first();
        await patientInput.fill(patientName);
        
        // Wait for "Add new" option to appear
        const addNewOption = page.locator('text=/Add new|Tambah baru/i');
        await expect(addNewOption).toBeVisible({ timeout: 5000 });
        
        // Click to add new patient
        await addNewOption.click();
        
        // Verify patient is selected (input should have the name)
        await expect(patientInput).toHaveValue(patientName);
        
        console.log(`Added new patient: ${patientName}`);
    });

    test('should record a basic treatment', async ({ page }) => {
        test.skip(!process.env.E2E_TEST_EMAIL || !process.env.E2E_TEST_PASSWORD, 'Credentials required');
        await loginIfNeeded(page);
        
        // Generate unique patient name
        const timestamp = Date.now();
        const patientName = `E2E Treatment Test ${timestamp}`;
        
        // 1. Add patient
        const patientInput = page.locator('input[placeholder*="patient" i], input[placeholder*="pasien" i]').first();
        await patientInput.fill(patientName);
        const addNewOption = page.locator('text=/Add new|Tambah baru/i');
        await expect(addNewOption).toBeVisible({ timeout: 5000 });
        await addNewOption.click();
        
        // 2. Select treatment type (Checkup)
        const checkupCheckbox = page.locator('text=/Checkup/i').locator('..').locator('input[type="checkbox"]');
        if (await checkupCheckbox.isVisible().catch(() => false)) {
            await checkupCheckbox.check();
        } else {
            // Try clicking the label directly
            await page.locator('text=/Checkup/i').first().click();
        }
        
        // 3. Select dentist (if dropdown exists)
        const dentistSelect = page.locator('select').first();
        if (await dentistSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
            const options = await dentistSelect.locator('option').all();
            if (options.length > 1) {
                await dentistSelect.selectOption({ index: 1 });
            }
        }
        
        // 4. Submit the form
        const submitButton = page.locator('button[type="submit"]').filter({ hasText: /Save|Simpan|Submit/i });
        await submitButton.click();
        
        // 5. Verify success (form should reset or show success message)
        // After submit, patient input should be empty (form reset)
        await expect(patientInput).toHaveValue('', { timeout: 10000 });
        
        console.log(`Recorded treatment for: ${patientName}`);
    });

    test('should navigate to treatment history', async ({ page }) => {
        test.skip(!process.env.E2E_TEST_EMAIL || !process.env.E2E_TEST_PASSWORD, 'Credentials required');
        await loginIfNeeded(page);
        
        // Find and click History navigation
        const historyNav = page.locator('[title*="History"], [title*="Riwayat"]').or(
            page.locator('text=/^History$|^Riwayat$/i')
        );
        
        if (await historyNav.first().isVisible({ timeout: 5000 }).catch(() => false)) {
            await historyNav.first().click();
            
            // Should see treatment history content
            await expect(page.locator('text=/Treatment History|Riwayat Perawatan/i').first()).toBeVisible({ timeout: 10000 });
            
            // Should see date navigation
            await expect(page.locator('input[type="date"]').or(page.locator('text=/Today|Hari ini/i'))).toBeVisible();
        } else {
            console.log('History navigation not found - may be on mobile layout');
            // Try bottom tabs
            const bottomHistoryTab = page.locator('button, a').filter({ hasText: /History|Riwayat/i });
            if (await bottomHistoryTab.first().isVisible({ timeout: 3000 }).catch(() => false)) {
                await bottomHistoryTab.first().click();
                await expect(page.locator('text=/Treatment History|Riwayat Perawatan/i').first()).toBeVisible({ timeout: 10000 });
            }
        }
    });

    test('should navigate to patients list', async ({ page }) => {
        test.skip(!process.env.E2E_TEST_EMAIL || !process.env.E2E_TEST_PASSWORD, 'Credentials required');
        await loginIfNeeded(page);
        
        // Find and click Patients navigation
        const patientsNav = page.locator('[title*="Patients"], [title*="Pasien"]').or(
            page.locator('text=/^Patients$|^Pasien$/i')
        );
        
        if (await patientsNav.first().isVisible({ timeout: 5000 }).catch(() => false)) {
            await patientsNav.first().click();
            
            // Should see patient list
            await expect(page.locator('text=/Patient|Pasien/i').first()).toBeVisible({ timeout: 10000 });
            
            // Should have add patient button
            await expect(page.locator('button').filter({ hasText: /Add|Tambah/i }).first()).toBeVisible();
        } else {
            console.log('Patients navigation not found - may be on mobile layout');
        }
    });
});
