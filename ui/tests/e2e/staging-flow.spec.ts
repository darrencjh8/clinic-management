import { test, expect } from '@playwright/test';

// Env vars are loaded by the runner script

test.describe('E2E Staging Flow', () => {
    test.setTimeout(120000); // Increase timeout for full flow

    test('Full User Journey: Login -> Create Sheet -> Add Patient -> Add Treatment', async ({ page }) => {
        const email = process.env.E2E_TEST_EMAIL;
        const password = process.env.E2E_TEST_PASSWORD;

        if (!email || !password) {
            throw new Error('E2E_TEST_EMAIL or E2E_TEST_PASSWORD not found in environment');
        }

        console.log(`Starting E2E test against: ${process.env.BASE_URL || 'localhost'}`);

        // 1. Visit App
        await page.goto('/');
        try {
            await page.waitForLoadState('networkidle', { timeout: 10000 });
        } catch (e) {
            console.log('Network idle timeout, proceeding anyway...');
        }

        // 2. Login with Firebase
        console.log('Checking for login form...');
        const emailInput = page.locator('input[type="email"]');

        // Debug current page content if email input is not found immediately
        if (!await emailInput.isVisible()) {
            console.log('Email input not visible immediately. Page text:', await page.textContent('body'));
        }

        await expect(emailInput).toBeVisible({ timeout: 20000 });

        await emailInput.fill(email);
        await page.fill('input[type="password"]', password);
        await page.click('button[type="submit"]');

        // Wait for potential error or success
        console.log('Clicked login, waiting for navigation or error...');

        try {
            // Check for common error messages (both EN and ID)
            const errorLocator = page.locator('text=/Invalid email|Email atau kata sandi tidak valid|User not found/i').or(page.locator('.error-message'));
            if (await errorLocator.isVisible({ timeout: 5000 })) {
                console.log('Login Error Detected:', await errorLocator.textContent());
                throw new Error('Login failed with UI error');
            }

            // 3. Pin Setup - Use regex to match both EN and ID translations
            // EN: "Set a PIN" / "Enter PIN" / "Atur PIN" / "Masukkan PIN"
            const pinScreenLocator = page.locator('text=/Set a PIN|Enter PIN|Atur PIN|Masukkan PIN/i');
            await expect(pinScreenLocator).toBeVisible({ timeout: 15000 });
        } catch (e) {
            console.log('Failed to reach PIN screen. Current URL:', page.url());
            console.log('Page Content Dump:', await page.textContent('body'));
            throw e;
        }

        // Check if we're in PIN setup mode (EN: "Set a PIN" / ID: "Atur PIN")
        const isSetup = await page.locator('text=/Set a PIN|Atur PIN/i').isVisible();

        if (isSetup) {
            console.log('Setting up new PIN...');
            // Type PIN in the input field
            const pinInput = page.locator('input[type="password"]');
            await pinInput.fill('123456');
            await page.locator('button[type="submit"]').click();
            // Confirm PIN
            await page.waitForTimeout(500);
            await pinInput.fill('123456');
            await page.locator('button[type="submit"]').click();
        } else {
            console.log('Entering existing PIN...');
            const pinInput = page.locator('input[type="password"]');
            await pinInput.fill('123456');
            await page.locator('button[type="submit"]').click();
        }

        // 4. Spreadsheet Selection (EN: "Setup Database" / ID: "Pengaturan Database")
        // Wait for spreadsheet setup screen or main app
        const spreadsheetSetup = page.locator('text=/Setup Database|Pengaturan Database|Select Spreadsheet|Dental Clinic Data/i');
        const mainApp = page.locator('text=/New Treatment|Perawatan Baru|Treatment Entry|Entri Perawatan/i');
        
        // Either we see spreadsheet setup OR we're already in the app
        await expect(spreadsheetSetup.or(mainApp)).toBeVisible({ timeout: 20000 });

        if (await spreadsheetSetup.isVisible()) {
            // Click "Create New Spreadsheet" (Admin only) - EN: "Create New" / ID: "Buat Spreadsheet Baru"
            const createButton = page.locator('button').filter({ hasText: /Create New|Buat Spreadsheet Baru/i });
            if (await createButton.isVisible()) {
                console.log('Creating new spreadsheet...');
                await createButton.click();
            } else {
                // Try selecting an existing spreadsheet
                console.log('Create button not found, selecting existing spreadsheet...');
                const existingSheet = page.locator('button').filter({ hasText: /Dental Clinic/i }).first();
                if (await existingSheet.isVisible()) {
                    await existingSheet.click();
                } else {
                    throw new Error('No spreadsheet options found');
                }
            }
        }

        // Wait for App to Load (Treatment Entry is default view)
        // EN: "New Treatment Entry" / ID: "Entri Perawatan Baru"
        await expect(page.locator('text=/New Treatment|Perawatan Baru|Treatment Entry|Entri Perawatan/i')).toBeVisible({ timeout: 30000 });

        // 5. Add Patient
        console.log('Navigating to Patients...');
        // Use title attribute for sidebar navigation (collapsed state) or text
        const patientsNav = page.locator('[title*="Patients"], [title*="Pasien"]').or(page.locator('text=/^Patients$|^Pasien$/i'));
        await patientsNav.first().click();

        // EN: "Add New Patient" / ID: "Tambah Pasien Baru"
        await expect(page.locator('text=/Add Patient|Add New Patient|Tambah Pasien/i')).toBeVisible({ timeout: 10000 });
        await page.locator('button').filter({ hasText: /Add.*Patient|Tambah.*Pasien/i }).click();

        const testName = `E2E Test Patient ${Date.now()}`;
        // Use placeholder matching both languages - EN: "Name" / ID: may use same or localized
        await page.locator('input').first().fill(testName);
        // Age field
        const ageInput = page.locator('input[type="number"], input[placeholder*="Age"], input[placeholder*="Usia"]').first();
        if (await ageInput.isVisible()) {
            await ageInput.fill('30');
        }

        // Submit - EN: "Add Patient" / "Save" / ID: "Tambah Pasien" / "Simpan"
        await page.locator('button[type="submit"]').or(page.locator('button').filter({ hasText: /Save|Add|Tambah|Simpan/i })).first().click();

        // Verify Patient Added
        await expect(page.locator(`text=${testName}`)).toBeVisible({ timeout: 10000 });
        console.log('Patient added successfully.');

        // 6. Add Treatment
        console.log('Navigating to Treatments...');
        // Use title attribute for sidebar navigation or text
        const treatmentsNav = page.locator('[title*="Treatment"], [title*="Perawatan"]').or(page.locator('text=/^Treatments$|^New Treatment$|^Perawatan Baru$/i'));
        await treatmentsNav.first().click();

        // Wait for treatment entry form
        await expect(page.locator('text=/New Treatment|Perawatan Baru|Treatment Entry|Entri Perawatan/i')).toBeVisible({ timeout: 10000 });

        // Select Patient using autocomplete
        const patientInput = page.locator('input').filter({ hasText: '' }).first();
        await patientInput.click();
        await patientInput.fill(testName.substring(0, 10)); // Type partial name
        await page.waitForTimeout(500);
        // Click on suggestion
        await page.locator(`text=${testName}`).click();

        // Fill Amount - find numeric input
        const amountInput = page.locator('input[inputmode="numeric"]').first();
        await amountInput.fill('500000');

        // Select Treatment Type - click on a checkbox/label
        await page.locator('label').filter({ hasText: /Cleaning|Checkup/i }).first().click();

        // Submit - EN: "Add Treatment" / ID: "Tambah Perawatan"
        await page.locator('button').filter({ hasText: /Add Treatment|Tambah Perawatan/i }).click();

        // Wait for success message or redirect
        await page.waitForTimeout(2000);

        // 7. Verify in History
        console.log('Navigating to History...');
        const historyNav = page.locator('[title*="History"], [title*="Riwayat"]').or(page.locator('text=/^History$|^Riwayat$/i'));
        await historyNav.first().click();

        // Should see the treatment
        await expect(page.locator(`text=${testName}`)).toBeVisible({ timeout: 10000 });
        console.log('E2E Test Completed Successfully!');
    });
});
