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
            // Check for common error messages
            const errorLocator = page.locator('text=Invalid email or password').or(page.locator('text=User not found')).or(page.locator('.error-message'));
            if (await errorLocator.isVisible({ timeout: 5000 })) {
                console.log('Login Error Detected:', await errorLocator.textContent());
                throw new Error('Login failed with UI error');
            }

            // 3. Pin Setup
            await expect(page.locator('text=Set a PIN')
                .or(page.locator('text=Enter PIN'))).toBeVisible({ timeout: 15000 });
        } catch (e) {
            console.log('Failed to reach PIN screen. Current URL:', page.url());
            console.log('Page Content Dump:', await page.textContent('body'));
            throw e;
        }

        const isSetup = await page.getByText('Set a PIN', { exact: false }).isVisible();

        if (isSetup) {
            console.log('Setting up new PIN...');
            // Simulating typing '123456'
            await page.keyboard.type('123456');
            // Confirm PIN
            await page.waitForTimeout(500); // Wait for transition
            await page.keyboard.type('123456');
        } else {
            console.log('Entering existing PIN...');
            await page.keyboard.type('123456');
        }

        // 4. Spreadsheet Selection
        await expect(page.locator('text=Select Spreadsheet').or(page.locator('text=Dental Clinic Data'))).toBeVisible({ timeout: 20000 });

        // Click "Create New Spreadsheet" (Admin only - assumed user is Admin)
        // Check if "Create New" button exists
        const createButton = page.locator('button', { hasText: 'Create New' });
        if (await createButton.isVisible()) {
            console.log('Creating new spreadsheet...');
            await createButton.click();
        } else {
            console.log('Create button not found, maybe not admin?');
            // Fallback: Try to select an existing one if strictly needed, but we wanted isolation.
            // Assuming Admin role for the test user.
            throw new Error('Create New Spreadsheet button not found. Is the test user an Admin?');
        }

        // Wait for App to Load (Treatment Entry is default view)
        await expect(page.locator('text=Treatment Entry')).toBeVisible({ timeout: 30000 });

        // 5. Add Patient
        console.log('Navigating to Patients...');
        // Navigation is via bottom tab or similar. 
        // Layout component usually has navigation.
        // Let's find "Patients" link/button.
        await page.click('a[href="/patients"], button:has-text("Patients")'); // Try generic selectors
        // If Layout uses icons, we might need aria-labels.
        // Let's try text "Patients"
        await page.getByText('Patients', { exact: true }).click();

        await expect(page.locator('text=Add Patient')).toBeVisible();
        await page.click('text=Add Patient');

        const testName = `E2E Test Patient ${Date.now()}`;
        await page.fill('input[placeholder="Name"]', testName);
        await page.fill('input[placeholder="Age"]', '30');
        await page.fill('textarea[placeholder="Notes"]', 'Created by E2E Test');

        // Submit
        await page.click('button:has-text("Save"), button:has-text("Add")');

        // Verify Patient Added
        await expect(page.locator(`text=${testName}`)).toBeVisible();
        console.log('Patient added successfully.');

        // 6. Add Treatment
        console.log('Adding Treatment...');
        await page.getByText('Treatments', { exact: true }).click();

        // Select Patient (Autosuggest or Dropdown)
        // The implementation usually has a patient search/select.
        // Let's assume there's an input to search patient.
        await page.click('text=Select Patient'); // Trigger dropdown
        await page.type('input[placeholder="Search..."]', testName);
        await page.click(`text=${testName}`);

        // Fill Details
        await page.fill('input[type="number"]', '500000'); // Amount

        // Select Treatment Type
        await page.click('text=Select Treatment');
        await page.click('text=Cleaning');

        // Save
        await page.click('button:has-text("Save")');

        // 7. Verify in History
        console.log('Verifying in History...');
        await page.getByText('History', { exact: true }).click();

        // Should see the treatment
        await expect(page.locator(`text=${testName}`)).toBeVisible();
        await expect(page.locator('text=Cleaning')).toBeVisible();
        await expect(page.locator('text=500,000')).toBeVisible(); // Formatting check

        console.log('E2E Test Completed Successfully!');
    });
});
