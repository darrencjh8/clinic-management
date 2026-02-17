import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Env vars are loaded by the runner script

test.describe('E2E Staging Flow', () => {
    test.setTimeout(300000); // 5 minutes for full flow including pauses

    test.afterEach(async ({ page }, testInfo) => {
        if (testInfo.status !== 'passed') {
            console.log(`❌ Test failed: ${testInfo.title}`);
            const screenshotPath = `e2e-failure-${testInfo.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`;
            await page.screenshot({ path: screenshotPath, fullPage: true });
            console.log(`📸 Screenshot saved to: ${screenshotPath}`);

            try {
                const pageContent = await page.content();
                fs.writeFileSync('e2e-failure-dump.html', pageContent);
                // Also try to help debug fs issues
                if (fs.existsSync('e2e-failure-dump.html')) {
                    console.log('e2e-failure-dump.html created successfully');
                }
            } catch (e) {
                try {
                    fs.appendFileSync('test-progress.txt', `[ERROR] Could not capture page content: ${(e as Error).message}\n`);
                } catch (err) { }
            }
        }
    });


    test('Full User Journey: Login -> PIN Setup -> Spreadsheet Selection -> Treatment Entry', async ({ page }) => {
        const email = process.env.E2E_TEST_EMAIL;
        const password = process.env.E2E_TEST_PASSWORD;

        // Skip if credentials not provided
        test.skip(!email || !password, 'E2E_TEST_EMAIL and E2E_TEST_PASSWORD environment variables required');

        // Clean previous logs
        try {
            if (fs.existsSync('browser-logs.txt')) fs.unlinkSync('browser-logs.txt');
        } catch (e) { }

        // Enable console log from browser and write to file
        page.on('console', msg => {
            const logMsg = `[BROWSER] ${msg.type()}: ${msg.text()}\n`;
            try {
                fs.appendFileSync('browser-logs.txt', logMsg);
            } catch (e) {
                // ignore
            }
            // Keep console log for realtime feedback
            if (msg.type() === 'error') console.log(`[BROWSER ERROR] ${msg.text()}`);
        });

        // Helper to log test progress
        const logProgress = (msg: string) => {
            try {
                fs.appendFileSync('test-progress.txt', `[TEST] ${msg}\n`);
            } catch (e) { }
            console.log(msg);
        };

        logProgress(`Starting E2E test against: ${process.env.BASE_URL || 'localhost'}`);

        // 1. Visit App - Use explicit full URL to avoid navigation issues
        const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
        console.log(`Navigating to base URL: ${baseUrl}`);

        // Wait for server to be ready (especially important for CI environment)
        console.log('Checking server availability...');
        let serverReady = false;
        let retryCount = 0;
        const maxRetries = 10;

        while (!serverReady && retryCount < maxRetries) {
            try {
                // Try to fetch the base URL to check if server is ready
                const response = await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 5000 });
                if (response && response.ok()) {
                    serverReady = true;
                    console.log(`Server ready after ${retryCount + 1} attempts`);
                } else {
                    throw new Error(`Server responded with status: ${response?.status()}`);
                }
            } catch (e) {
                retryCount++;
                console.log(`Server not ready (attempt ${retryCount}/${maxRetries}), waiting 3 seconds...`);
                await page.waitForTimeout(3000);
            }
        }

        if (!serverReady) {
            throw new Error(`Server at ${baseUrl} is not ready after ${maxRetries} attempts. Deployment may have failed or server is still starting.`);
        }

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

        await emailInput.fill(email!);
        await page.fill('input[type="password"]', password!);

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

        const pinScreen = page.locator('h2:has-text("Atur PIN Keamanan Anda"), h2:has-text("Set a PIN")');
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

        // 3. Define PIN Handler for whenever it appears
        // This handles both the initial PIN setup/entry and any random reappearances

        // Note: Generic PIN screen locator
        await page.addLocatorHandler(pinScreen, async () => {
            console.log('🛡️ PIN Screen detected by handler. Entering PIN...');

            // Loop to retry PIN entry if screen persists
            const maxRetries = 3;
            for (let i = 0; i < maxRetries; i++) {
                console.log(`   -> Attempt ${i + 1}/${maxRetries} to handle PIN...`);

                // Check if it's setup or entry
                const isSetup = await page.locator('text=Buat PIN (min 6 digit)|Create a PIN (min 6 digits)').isVisible();
                // Simple PIN entry
                const pinInput = page.locator('input[type="password"]').first();

                // Ensure input is empty before typing
                await pinInput.clear();
                await pinInput.fill('123456');

                if (isSetup) {
                    await page.locator('button[type="submit"]').click();
                    await page.waitForTimeout(1000);
                    await pinInput.fill('123456');
                }

                await page.locator('button[type="submit"]').click();

                // Wait a bit for processing
                await page.waitForTimeout(2000);

                // Check for error feedback
                const errorMsg = page.locator('.text-red-500, .error-message').or(page.locator('text=/Incorrect|Salah|Gagal/')).first();
                if (await errorMsg.isVisible()) {
                    const text = await errorMsg.textContent();
                    console.log(`❌ PIN Error: ${text}`);
                    if (/Incorrect|Salah/i.test(text || '')) {
                        console.log('Trying alternative PIN 000000...');
                        await pinInput.fill('000000');
                        await page.locator('button[type="submit"]').click();
                        await page.waitForTimeout(2000);
                    }
                }

                // Check if screen is still there
                if (!await pinScreen.isVisible()) {
                    logProgress('✅ PIN screen dismissed.');
                    return;
                }
                logProgress('⚠️ PIN screen still visible, retrying...');
            }
            logProgress('❌ Failed to dismiss PIN screen after retries.');
        });



        // 4. Handle Spreadsheet Selection if visible
        try {
            logProgress('Checking for spreadsheet setup screen...');
            await spreadsheetSetup.waitFor({ state: 'visible', timeout: 10000 });
        } catch (e) {
            logProgress('Spreadsheet setup screen did not appear within timeout.');
        }

        if (await spreadsheetSetup.isVisible()) {
            logProgress('On spreadsheet selection screen...');
            await page.screenshot({ path: 'e2e-spreadsheet-selection.png' });

            // Scope to the card container to avoid false positives
            // The card contains the H2 title "Setup Database"
            const setupCard = page.locator('.max-w-md').filter({ has: page.locator('h2') });

            // Wait for spreadsheet list to load (service account API must be called first)
            // The app fetches service account from server, then uses it to list spreadsheets
            await page.waitForTimeout(3000); // Allow time for API calls

            // Try to find "Create New" button (Admin only)
            const createButton = setupCard.locator('button').filter({ hasText: /Create New|Buat Spreadsheet Baru/i });

            // Look for buttons that represent sheets. based on LoginScreen.tsx they have an ID textual representation
            // We look for buttons that contain "ID:" text which is unique to sheet buttons
            const sheetButtons = setupCard.locator('button').filter({ hasText: /ID:/ });

            if (await createButton.isVisible({ timeout: 5000 }).catch(() => false)) {
                logProgress('Creating new spreadsheet (admin user)...');
                await createButton.click();
            } else if (await sheetButtons.first().isVisible({ timeout: 5000 }).catch(() => false)) {
                const count = await sheetButtons.count();
                logProgress(`Found ${count} spreadsheet buttons. Selecting first one...`);
                // Force click in case of overlays/transparency issues
                await sheetButtons.first().click({ force: true });
                logProgress('Clicked spreadsheet button (forced). Waiting for navigation...');

                await page.waitForTimeout(5000);

                try {
                    await page.screenshot({ path: 'e2e-after-click.png', fullPage: true });
                    logProgress('Captured e2e-after-click.png');
                } catch (e) {
                    logProgress(`Failed to capture after-click screenshot: ${(e as Error).message}`);
                }
            } else {
                // Try fallback: any button that is NOT Create/Refresh/Logout
                const otherButtons = setupCard.locator('button').filter({ hasNot: page.locator('text=/Create|Buat|Refresh|Perbarui|Logout|Keluar/i') });
                if (await otherButtons.first().isVisible({ timeout: 3000 }).catch(() => false)) {
                    console.log('Selecting potential spreadsheet button (fallback)...');
                    await otherButtons.first().click();
                } else {
                    // Take screenshot for debugging
                    await page.screenshot({ path: 'e2e-no-sheets-debug.png' });
                    const bodyHtml = await page.locator('body').innerHTML();
                    console.log('Page HTML (truncated):', bodyHtml.substring(0, 2000));
                    throw new Error('No spreadsheet options found. Service account may not have access to any spreadsheets.');
                }
            }
        }

        // Wait for App to Load (Treatment Entry is default view)
        // EN: "New Treatment Entry" / ID: "Entri Perawatan Baru"
        const treatmentHeader = page.getByRole('heading', { name: /New Treatment|Perawatan Baru|Treatment Entry|Entri Perawatan/i });
        await expect(treatmentHeader).toBeVisible({ timeout: 30000 });

        // 5. Add Patient
        console.log('Navigating to Patients...');
        // Use title attribute for sidebar navigation (collapsed state) or text
        const patientsNav = page.locator('[title*="Patients"], [title*="Pasien"]').or(page.locator('text=/^Patients$|^Pasien$/i'));
        // Click the first matching element (there might be multiple due to mobile/desktop navs, but typically one visible)
        // We force click just in case
        await patientsNav.first().click({ force: true });

        // EN: "Patient Management" / ID: "Manajemen Pasien"
        const patientManagementHeader = page.getByRole('heading', { name: /Patient Management|Manajemen Pasien/i });
        await expect(patientManagementHeader).toBeVisible({ timeout: 10000 });

        console.log('Clicking Add Patient button...');
        await page.getByRole('button', { name: /Add New Patient|Tambah Pasien Baru/i }).click();

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
        await treatmentsNav.first().click({ force: true });

        // Wait for treatment entry form
        await expect(page.locator('text=/New Treatment|Perawatan Baru|Treatment Entry|Entri Perawatan/i')).toBeVisible({ timeout: 10000 });

        // Select Patient using autocomplete - be more specific about patient input
        // Look for input that might be labeled or have patient-related attributes
        const patientInput = page.locator('input[type="text"]:not([inputmode="numeric"]), input[placeholder*="patient"], input[placeholder*="Patient"]').first();
        await patientInput.click();
        await patientInput.fill(testName.substring(0, 10)); // Type partial name
        await page.waitForTimeout(500);
        // Click on suggestion
        await page.locator(`text=${testName}`).click();

        // Fill Amount - find numeric input
        const amountInput = page.locator('input[inputmode="numeric"]').first();
        await amountInput.fill('500000');

        // Select Dentist and Admin (Required fields)
        const form = page.locator('form');
        // Select 2nd option for Dentist (index 1)
        await form.locator('select').nth(0).selectOption({ index: 1 });
        // Select 2nd option for Admin (index 1)
        await form.locator('select').nth(1).selectOption({ index: 1 });

        // Select Treatment Type - click on a checkbox/label
        // Select Treatment Type - click on a checkbox/label
        // EN: "Cleaning" / "Checkup" / ID: "Scaling" / "Konsultasi"
        await page.locator('label').filter({ hasText: /Cleaning|Checkup|Scaling|Konsultasi/i }).first().click();

        // Submit - EN: "Add Treatment" / ID: "Tambah Perawatan"
        const submitBtn = page.locator('button').filter({ hasText: /Add Treatment|Tambah Perawatan/i });
        await expect(submitBtn).toBeEnabled();
        await submitBtn.click();

        // Wait for success message or redirect
        try {
            await page.waitForTimeout(2000);

            // Debug: Check if we are still on the same page or if an error occurred
            const pageContent = await page.content();
            console.log('Page content after adding treatment (snippet):', pageContent.substring(0, 500));

            // Check for potential error messages
            const errorMsg = await page.locator('.error-message, .alert-danger, text=/Error|Gagal/i').first();
            if (await errorMsg.isVisible()) {
                console.log('❌ Error message found after adding treatment:', await errorMsg.textContent());
            }

            // Check if PIN screen reappeared unexpectedly
            if (await pinScreen.isVisible()) {
                console.log('⚠️ PIN screen reappeared unexpectedly!');
            }
        } catch (e) {
            console.log('Error during post-treatment verification:', e);
        }

        // 7. Verify in History
        console.log('Navigating to History...');
        const historyNav = page.locator('[title*="History"], [title*="Riwayat"]').or(page.locator('text=/^History$|^Riwayat$/i'));
        await historyNav.first().click({ force: true });

        // Wait for potential sync - History page might need a moment or manual sync
        console.log('Waiting for history to load and sync...');
        await page.waitForTimeout(2000); // Initial wait for page load

        // Try to find the treatment. If not found, try sync.
        try {
            await expect(page.locator(`text=${testName}`)).toBeVisible({ timeout: 5000 });
        } catch (e) {
            console.log('Treatment not immediately visible, attempting manual sync...');
            // Button title attribute might be "Sync Now" or localized "Sinkronkan"
            const syncButton = page.locator('button[title="Sync Now"], button[title="Sinkronkan"]');
            if (await syncButton.isVisible()) {
                await syncButton.click();
                console.log('Clicked Sync button. Waiting for data...');
                await page.waitForTimeout(3000); // Wait for sync
            } else {
                console.log('Sync button not visible.');
            }
        }

        // Final verification with longer timeout
        await expect(page.locator(`text=${testName}`)).toBeVisible({ timeout: 30000 });
        console.log('E2E Test Completed Successfully!');
    });
});
