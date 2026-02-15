import { test, expect } from '@playwright/test';

// Env vars are loaded by the runner script

test.describe('E2E Staging Flow', () => {
    test.setTimeout(300000); // 5 minutes for full flow including pauses

    test('Full User Journey: Login -> PIN Setup -> Spreadsheet Selection -> Treatment Entry', async ({ page }) => {
        const email = process.env.E2E_TEST_EMAIL;
        const password = process.env.E2E_TEST_PASSWORD;

        // Debug: Log all relevant environment variables
        console.log('=== E2E Test Environment ===');
        console.log(`E2E_TEST_EMAIL: ${email}`);
        console.log(`E2E_TEST_PASSWORD: ${password}`);
        console.log(`BASE_URL: ${process.env.BASE_URL}`);
        console.log(`VITE_FIREBASE_API_KEY: ${process.env.VITE_FIREBASE_API_KEY?.substring(0, 10)}...`);
        console.log(`VITE_API_URL: ${process.env.VITE_API_URL}`);
        console.log('============================');

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
            console.log('Email input not visible immediately. Waiting...');
            console.log('Current page content:', await page.textContent('body'));
        }

        await expect(emailInput).toBeVisible({ timeout: 30000 });
        console.log('Login form visible, filling credentials...');

        await emailInput.fill(email);
        await page.fill('input[type="password"]', password);
        
        // Take screenshot before login for debugging
        await page.screenshot({ path: 'e2e-before-login.png' });
        
        await page.click('button[type="submit"]');
        console.log('Clicked login button, waiting for response...');

        // Wait for login to process - check for loading states
        await page.waitForTimeout(3000);
        
        // Take screenshot after login attempt
        await page.screenshot({ path: 'e2e-after-login.png' });
        console.log('Current URL after login:', page.url());
        console.log('Page content after login:', await page.textContent('body'));

        // After login, we could see: PIN screen, Spreadsheet setup, or Main app
        // The flow depends on whether user has stored credentials
        console.log('Waiting for next screen after login...');
        
        const pinScreen = page.locator('text=/Set a PIN|Enter PIN|Atur PIN|Masukkan PIN/i');
        const spreadsheetSetup = page.locator('text=/Setup Database|Pengaturan Database/i');
        const mainApp = page.locator('text=/New Treatment|Perawatan Baru|Treatment Entry|Entri Perawatan/i');
        const errorLocator = page.locator('text=/Invalid email|Email atau kata sandi tidak valid|User not found|auth\\/invalid|wrong-password|Failed to fetch/i');
        
        // Wait for any of these screens
        try {
            await expect(pinScreen.or(spreadsheetSetup).or(mainApp)).toBeVisible({ timeout: 30000 });
        } catch (e) {
            // Check if there's an error
            const hasError = await errorLocator.isVisible({ timeout: 2000 }).catch(() => false);
            if (hasError) {
                const errorText = await errorLocator.textContent();
                console.log('Login Error Detected:', errorText);
                throw new Error(`Login failed with UI error: ${errorText}`);
            }
            console.log('=== FAILURE DEBUG INFO ===');
            console.log('No expected screen found. Current URL:', page.url());
            console.log('Page Content:', await page.textContent('body'));
            await page.screenshot({ path: 'e2e-failure.png' });
            console.log('===========================');
            throw e;
        }

        // 3. Handle PIN screen if visible
        if (await pinScreen.isVisible()) {
            const isSetup = await page.locator('text=/Set a PIN|Atur PIN/i').isVisible();
            
            if (isSetup) {
                console.log('Setting up new PIN...');
                const pinInput = page.locator('input[type="password"]');
                await pinInput.fill('123456');
                await page.locator('button[type="submit"]').click();
                await page.waitForTimeout(1000);
                await pinInput.fill('123456');
                await page.locator('button[type="submit"]').click();
            } else {
                console.log('Entering existing PIN...');
                const pinInput = page.locator('input[type="password"]');
                await pinInput.fill('123456');
                await page.locator('button[type="submit"]').click();
            }
            
            // Wait for spreadsheet setup or main app after PIN
            await expect(spreadsheetSetup.or(mainApp)).toBeVisible({ timeout: 20000 });
        }

        // 4. Handle Spreadsheet Selection if visible
        if (await spreadsheetSetup.isVisible()) {
            console.log('On spreadsheet selection screen...');
            await page.screenshot({ path: 'e2e-spreadsheet-selection.png' });
            
            // Wait for spreadsheet list to load (service account API must be called first)
            // The app fetches service account from server, then uses it to list spreadsheets
            await page.waitForTimeout(3000); // Allow time for API calls
            
            // Try to find and select a spreadsheet or create one
            const createButton = page.locator('button').filter({ hasText: /Create New|Buat Spreadsheet Baru/i });
            
            // Look for any spreadsheet button in the list (they appear as buttons with spreadsheet names)
            // These are typically rendered as a list of clickable items
            const spreadsheetList = page.locator('ul, .spreadsheet-list, [role="list"]');
            const anySheetButton = spreadsheetList.locator('button, li[role="button"], .cursor-pointer').first();
            
            // Also try to find buttons that might be spreadsheet names (not Create/Refresh buttons)
            const sheetNameButtons = page.locator('button').filter({ hasNot: page.locator('text=/Create|Buat|Refresh|Perbarui|Logout|Keluar/i') });
            
            if (await createButton.isVisible({ timeout: 5000 }).catch(() => false)) {
                console.log('Creating new spreadsheet (admin user)...');
                await createButton.click();
            } else if (await anySheetButton.isVisible({ timeout: 3000 }).catch(() => false)) {
                console.log('Selecting spreadsheet from list...');
                await anySheetButton.click();
            } else if (await sheetNameButtons.first().isVisible({ timeout: 3000 }).catch(() => false)) {
                const count = await sheetNameButtons.count();
                console.log(`Found ${count} potential spreadsheet buttons`);
                if (count > 0) {
                    await sheetNameButtons.first().click();
                }
            } else {
                // Take screenshot for debugging
                await page.screenshot({ path: 'e2e-no-sheets-debug.png' });
                const bodyHtml = await page.locator('body').innerHTML();
                console.log('Page HTML (truncated):', bodyHtml.substring(0, 2000));
                throw new Error('No spreadsheet options found. Service account may not have access to any spreadsheets.');
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
