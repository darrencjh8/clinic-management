# E2E Testing Guide & Patterns

This document captures key learnings and patterns for implementing reliable End-to-End (E2E) tests in the Clinic App, based on the `staging-flow.spec.ts` implementation.

## 1. Handling Unpredictable Overlays (PIN Screen)
The "Set PIN" or "Enter PIN" screen can appear unpredictably during tests, masking other elements.

**Pattern:** Use Playwright's `page.addLocatorHandler`.
```typescript
await page.addLocatorHandler(
    page.getByText(/Atur PIN|Enter PIN/i),
    async () => {
        // ... logic to fill and submit PIN ...
    }
);
```
*   **Why:** This automatically detects and detects the overlay whenever it interrupts the flow, preventing "element not visible" errors.
*   **Tip:** Include a retry loop within the handler if the overlay is persistent or slow to dismiss.

## 2. Robust Navigation
Sidebar navigation links may be partially obscured or collapsed in responsive views, or strict mode might fail if multiple elements match (e.g., mobile vs desktop menu).

**Pattern:** Use `{ force: true }` and specific attributes.
```typescript
await page.locator('[title*="History"]').first().click({ force: true });
```
*   **Why:** `{ force: true }` bypasses actionable checks that fail if the sidebar is animating or partially covered.
*   **Tip:** Target stable attributes like `title` or `href` rather than generic text if possible.

## 3. Localization Support (EN/ID)
The staging environment defaults to Indonesian (ID), while local dev might be English (EN). Tests must support both.

**Pattern:** Use Regex with OR conditions.
```typescript
const header = page.getByRole('heading', { name: /Patient Management|Manajemen Pasien/i });
```
*   **Why:** Ensures the test passes regardless of the environment's default language.
*   **Key Terms:**
    *   Treatment: `Treatment|Perawatan`
    *   Consultation: `Consultation|Konsultasi`
    *   Scaling: `Scaling|Scaling Gigi`
    *   Root Canal: `Root Canal|Perawatan Saluran Akar`

## 4. Form Validation & Required Fields
Submit buttons often remain disabled until all required fields are valid.

**Pattern:** Explicitly select required dropdowns.
```typescript
// Select Dentist and Admin (Required)
const form = page.locator('form');
await form.locator('select').nth(0).selectOption({ index: 1 }); // Select 2nd option
```
*   **Why:** "Add" buttons are often disabled by form validation logic. Failing to fill hidden or assume-optional fields will cause the test to hang waiting for the button to become enabled.

## 5. Data Sync Latency
Newly created data (e.g., a new treatment) usually takes time to propagate to list views (History) due to backend sync intervals.

**Pattern:** Manual Sync Trigger + Extended Timeout.
```typescript
try {
    await expect(locator).toBeVisible({ timeout: 5000 });
} catch (e) {
    // Click manual sync button if available
    await page.locator('button[title="Sync Now"]').click();
    await page.waitForTimeout(3000);
}
// Final check
await expect(locator).toBeVisible({ timeout: 30000 });
```
*   **Why:** Waiting passively often leads to timeouts. Triggering a manual sync forces the UI to refresh its data.
