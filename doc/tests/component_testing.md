# Component Testing Guide (Playwright CT)

> **📚 For comprehensive testing patterns, learnings, and troubleshooting**, see [`component_test_patterns.md`](./component_test_patterns.md) which documents proven patterns and best practices.

This document provides setup context and configuration instructions for the Playwright CT environment.

## 1. Environment Setup
The environment is already configured with:
- **Dependency**: `@playwright/experimental-ct-react`
- **Config File**: `ui/playwright-ct.config.ts`
- **Entry Points**: `ui/playwright/index.html`, `ui/playwright/index.tsx`
- **TS Config**: `ui/tsconfig.app.json` (updated with path aliases)

## 2. Running Tests
All commands should be run from the `ui` directory.

- **Run All Tests**:
  ```bash
  npm run test:ct -- --reporter=list
  ```
  *(Alias for `playwright test -c playwright-ct.config.ts --reporter=list`)*
  > **⚠️ IMPORTANT**: The Playwright HTTP server may hang indefinitely after tests complete. If the process does not exit, you may need to manually terminate it (Ctrl+C). Always use `--reporter=list` to see progress.

- **Run Specific Test**:
  ```bash
  npx playwright test -c playwright-ct.config.ts tests/components/MyComponent.spec.tsx
  ```

- **Debug Mode (UI)**:
  ```bash
  npx playwright test -c playwright-ct.config.ts --ui
  ```

## 3. Writing Tests
Test files are located in `ui/tests/components/`.

### Template
```tsx
import { test, expect } from '@playwright/experimental-ct-react';
import { MyComponent } from '../../src/components/MyComponent'; // Recommend relative imports for stability

test.use({ viewport: { width: 500, height: 500 } });

test('should render successfully', async ({ mount }) => {
  const component = await mount(<MyComponent prop="value" />);
  await expect(component).toContainText('Expected Text');
});
```

## 4. Crucial Context for Future Agents

### Import Paths
Path aliases (`@/`) are configured in `tsconfig.app.json` and **should be used** in test files for cleaner imports. Verification confirmed that imports like `@/components/TestWrapper` work correctly. If you encounter resolution issues, ensure `vite.config.ts` or `playwright-ct.config.ts` correctly resolves these aliases.

### Test Isolation & Architecture
- **TestWrapper**: Always wrap components under test with `<TestWrapper>`. This provides necessary contexts (`StoreContext`, `ToastContext`, `I18nextProvider`) and prevents errors related to missing providers.
- **MockStoreProvider**: The `TestWrapper` uses `MockStoreProvider` to supply mock data. **Do not** use the real `StoreProvider` in component tests, as it triggers API calls and side effects that will cause tests to fail or timeout.
- **StoreContext**: `useStore` hook matches the `StoreContext` interface. If adding new store methods, ensure `MockStoreProvider` in `ui/src/components/MockStoreProvider.tsx` is updated with mock implementations.

### I18n & Locales
- The default test locale is **Indonesian ('id')**.
- **Selectors**: Avoid selecting by visible text if possible, as it makes tests brittle to translation changes. Use `data-testid`, `placeholder`, or structural selectors (e.g., `component.locator('input').nth(1)`).
- **Assertions**: If asserting text, expect Indonesian values (e.g., "Entri Baru", "Ubah").

### Global Styles
- Global CSS (Tailwind) is imported in `ui/playwright/index.tsx`. Components should render with correct styling automatically.

### Troubleshooting
- **Ghost Build Errors**: If you encounter persistent Rollup/Vite errors (especially "Could not resolve import") that don't make sense:
    1.  Delete `ui/node_modules/.vite` (the Vite cache).
    2.  Delete `ui/test-results`.
    3.  Re-run tests.
- **"Root element not found"**: This error in `ui/playwright/index.tsx` usually means the `index.html` template is not being loaded correctly or the mounting logic is broken.

## 5. Mandatory Verification Protocol

**CRITICAL:** Future agents MUST run the full component test suite before completing any task that involves UI changes.

1.  **Run the suite:**
    ```bash
    npm run test:ct
    ```
2.  **Verify Results:** All tests must pass.
3.  **Fix Failures:** If any tests fail, you must fix them before proceeding. Do not ignore test failures.

## 6. Firebase & External Services

Firebase is initialized at module load time. When testing components that use `useStore`, you may encounter `FirebaseError: Firebase: Error (auth/invalid-api-key)`.

**Solution**: Mock Firebase environment variables are already configured in `playwright-ct.config.ts`:

```ts
define: {
    'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify('test-api-key'),
    // ... other Firebase vars
}
```

If you add new environment variables, add corresponding mocks to this config.

## 7. E2E Test Credentials & Validation

**CRITICAL:** When working with E2E tests that require Firebase authentication and Google Sheets access, ALWAYS validate credentials before debugging test failures.

### E2E Credentials Location
- **File**: `ui/.env.e2e`
- **Purpose**: Contains production Firebase credentials and test user credentials
- **Variables**: 
  - `E2E_TEST_EMAIL`: Firebase user email
  - `E2E_TEST_PASSWORD`: Firebase user password
  - `E2E_TEST_SERVICE_ACCOUNT`: Base64-encoded service account JSON
  - `VITE_FIREBASE_*`: Firebase configuration
  - `VITE_GOOGLE_CLIENT_ID`: Google OAuth client ID
  - `VITE_API_URL`: Backend API URL

### Credentials Validation Script
**Before debugging E2E test failures**, run the validation script to verify the complete authentication flow:

```bash
node ui/tests/integration/test_login_flow.mjs
```

This script validates:
1. ✓ Firebase authentication (email/password login)
2. ✓ Backend service account retrieval
3. ✓ Google OAuth token generation (JWT signing)
4. ✓ Google Drive API access (spreadsheet listing)

**If this script fails**, the E2E test credentials are invalid. Fix credentials in `.env.e2e` before proceeding.

**If this script passes but E2E tests fail**, the issue is in the test logic, not the credentials.

### Component vs E2E Test Boundaries
- **Component Tests**: Test isolated component behavior with mocked services
- **E2E Tests**: Test full user workflows with real authentication and API calls
- **Migrated Tests**: Tests previously skipped in component tests have been migrated to `ui/tests/e2e/auth-flow.spec.ts`

## 7. Test Writing Best Practices

### ✅ DO:
- Use structural selectors over text: `component.locator('input[type="date"]')`, `component.locator('button').nth(0)`
- Use `data-testid` attributes for important elements
- Check for class presence: `await expect(element).toHaveClass(/border-primary/)`
- Use regex for flexible matching: `expect(value).toMatch(/^\d{4}-\d{2}-\d{2}$/)`
- Test user interactions: `await element.click()`, `await element.focus()`

### ❌ DON'T:
- Assert exact translation text (locale is Indonesian, translations may not exist)
- Compare dates exactly (timezone differences between test and component)
- Test implementation details, test behavior

### Example Patterns
```tsx
// Good: Structural selector
const dateInput = component.locator('input[type="date"]');

// Good: Regex for date format
const value = await dateInput.inputValue();
expect(value).toMatch(/^\d{4}-\d{2}-\d{2}$/);

// Good: Class-based state check
await expect(label).toHaveClass(/border-primary/);

// Bad: Text-dependent (translation brittle)
await expect(component).toContainText('Edit Treatment');

// Bad: Exact date (timezone issues)
await expect(dateInput).toHaveValue('2024-01-15');
```

## 8. Common Test Patterns

### Testing Edit Mode
```tsx
test('should pre-populate in edit mode', async ({ mount }) => {
    const editData = {
        id: 'test-id',
        amount: 500000,
        // ... other fields
    };
    
    const component = await mount(
        <TestWrapper>
            <MyComponent editingItem={editData} onEditComplete={() => {}} />
        </TestWrapper>
    );
    
    const amountInput = component.locator('input[inputmode="numeric"]').first();
    await expect(amountInput).toHaveValue('500.000'); // formatted value
});
```

### Testing Conditional UI
```tsx
test('should show extra field when condition met', async ({ mount }) => {
    const component = await mount(<TestWrapper><MyComponent /></TestWrapper>);
    
    // Count elements before
    const selects = component.locator('select');
    await expect(selects).toHaveCount(2);
    
    // Trigger condition
    await component.locator('label:has-text("Special")').click();
    
    // Verify new element appears
    await expect(selects).toHaveCount(3);
});
```

## 9. MockStoreProvider Reference

Location: `ui/src/components/MockStoreProvider.tsx`

Default mock data includes:
- `patients`: 2 sample patients (John Doe, Jane Smith)
- `dentists`: ['Dr. Smith', 'Dr. Jones']
- `admins`: ['Admin A']
- `treatmentTypes`: ['Cleaning', 'Filling', 'Orthodontic', 'Ortodontik', 'Checkup']
- `bracesTypes`: [{ type: 'Metal', price: 5000000 }, { type: 'Control', price: 0 }]
- `userRole`: 'admin'

Override values in tests:
```tsx
<TestWrapper storeValues={{ userRole: 'staff', patients: [] }}>
    <MyComponent />
</TestWrapper>
```

