# Component Test Patterns Guide

> **For setup and configuration**, see [`component_testing.md`](./component_testing.md)

This guide documents practical patterns and learnings from writing component tests for the clinic app.

## Quick Start

```bash
# Run all component tests
npm run test:ct

# Run specific test file
npm run test:ct -- ui/tests/components/MyComponent.spec.tsx

# Debug mode
npm run test:ct -- --ui

# Validate E2E credentials (before debugging E2E tests)
node ui/tests/integration/test_login_flow.mjs
```

## Component Tests vs E2E Tests

**Critical Decision**: Choose the right test type for your scenario.

### Use Component Tests For:
- ✅ Isolated component behavior (rendering, state changes, props)
- ✅ User interactions with mocked services (click, type, select)
- ✅ Conditional rendering logic (role-based features)
- ✅ Form validation and error states
- ✅ Component-specific edge cases

### Use E2E Tests For:
- ✅ Complete user workflows (login → setup → usage)
- ✅ Multi-screen navigation flows
- ✅ Real authentication and API interactions
- ✅ Session persistence across page reloads
- ✅ Integration with backend services

### Recently Migrated Tests
The following tests were moved from component tests to E2E (`ui/tests/e2e/auth-flow.spec.ts`):
- **DEF-005**: Sheet fetching after PIN setup (requires full auth flow)
- **DEF-006**: Logout redirect behavior (requires full app navigation)
- **Session Persistence**: Cross-reload session validation (requires real session)

**Reason**: These scenarios require multiple steps of real authentication, navigation between screens, and actual API calls—making them unsuitable for isolated component testing.

## Critical i18n Considerations

**⚠️ Default Language**: Tests run with Indonesian (`id`) as the default language, NOT English.

### Language-Agnostic Assertions
Prefer using regex to match both languages to make tests robust:
```typescript
// ❌ WRONG - Expects English only
await expect(component.getByText('New Treatment')).toBeVisible();

// ✅ CORRECT - Expects Indonesian OR uses regex for both
await expect(component.getByText(/Perawatan Baru|New Treatment/i)).toBeVisible();
```

### Forcing Language via TestWrapper
To force a specific language in a test, use `window.TEST_LANGUAGE` and the `TestWrapper`.

**⚠️ Warning**: When implementing `i18n.changeLanguage` in a wrapper, **ALWAYS** check the current language first to avoid an infinite render loop.

```typescript
// In TestWrapper.tsx
const { i18n } = useTranslation();
if (window.TEST_LANGUAGE && i18n.language !== window.TEST_LANGUAGE) {
    i18n.changeLanguage(window.TEST_LANGUAGE);
}
```

**Common Translation Mappings**:
- "New Treatment" → "Perawatan Baru"
- "Please Rotate to Portrait" → "Silakan Putar ke Potret"
- "Connection Error" → "Kesalahan Koneksi"
- "Synced" → "Tersinkronisasi"

## Using TestWrapper and MockStoreProvider

### Basic Usage

```typescript
import { TestWrapper } from '../../src/components/TestWrapper';

test('should render with default store', async ({ mount }) => {
    const component = await mount(
        <TestWrapper>
            <MyComponent />
        </TestWrapper>
    );
});
```

### Passing Store Values

```typescript
test('should render with custom store values', async ({ mount }) => {
    const component = await mount(
        <TestWrapper storeValues={{ 
            userRole: 'admin',
            accessToken: 'test-token',
            patients: [{ id: '1', name: 'Test Patient' }]
        }}>
            <MyComponent />
        </TestWrapper>
    );
});
```

### ⚠️ Known Issue: Store Override Limitations

**Problem**: Store value overrides via `storeValues` prop may not consistently propagate to components in test environment.

**Workaround**: Keep tests simple and focused on basic rendering. Avoid complex state-dependent assertions.

```typescript
// ✅ SAFE - Basic rendering check
await expect(component).not.toBeEmpty();
await expect(component.getByText('Some Static Text')).toBeVisible();

// ⚠️ RISKY - State-dependent check may fail
await expect(component.getByText('Admin Only Feature')).toBeVisible();
```

## Viewport Configuration

```typescript
// Desktop/tablet components
test.use({ viewport: { width: 1024, height: 768 } });

// Mobile components
test.use({ viewport: { width: 375, height: 667 } });

// Larger desktop
test.use({ viewport: { width: 1280, height: 800 } });
```

## Selector Strategies

### 1. Collapsed Sidebar Pattern

```typescript
// ✅ Use title attribute for collapsed sidebar
await expect(component.getByTitle(/Perawatan Baru/)).toBeVisible();

// ❌ Text not visible when collapsed
await expect(component.getByText(/Perawatan Baru/)).toBeVisible(); 
```

### 2. Form Fields Without Labels

```typescript
// ✅ Use placeholder
await expect(component.getByPlaceholder(/Nama|Name/i)).toBeVisible();

// ❌ Label doesn't exist
await expect(component.getByLabel(/Nama|Name/i)).toBeVisible();
```

### 3. Prefer Structural Over Text

```typescript
// ✅ Robust structural selector
const dateInput = component.locator('input[type="date"]');

// ✅ Role-based
const addButton = component.getByRole('button', { name: /Tambah/i });

// ⚠️ Brittle text-based
const button = component.locator('button').filter({ hasText: 'Add' });
```

### 4. Safe Structural Checks

```typescript
// ✅ When exact content is uncertain
await expect(component.locator('aside')).toBeVisible();
await expect(component.locator('button')).toHaveCount(4);
```

## Test Patterns

### Pattern 1: Simple Rendering

```typescript
test('should render component', async ({ mount }) => {
    const component = await mount(
        <TestWrapper>
            <MyComponent />
        </TestWrapper>
    );

    await expect(component).not.toBeEmpty();
    await expect(component.getByText(/Expected Text/)).toBeVisible();
});
```

### Pattern 2: List Rendering

```typescript
test('should render list items', async ({ mount }) => {
    const mockData = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' }
    ];

    const component = await mount(
        <TestWrapper storeValues={{ items: mockData }}>
            <MyComponent />
        </TestWrapper>
    );

    await expect(component.getByText('Item 1')).toBeVisible();
    await expect(component.getByText('Item 2')).toBeVisible();
});
```

### Pattern 3: Interaction Test

```typescript
test('should handle button click', async ({ mount }) => {
    const component = await mount(
        <TestWrapper>
            <MyComponent />
        </TestWrapper>
    );

    const button = component.getByRole('button', { name: /Action/i });
    await button.click();

    await expect(component.getByRole('dialog')).toBeVisible();
});
```

### Pattern 4: Edit Mode Pre-population

```typescript
test('should pre-populate in edit mode', async ({ mount }) => {
    const editData = {
        id: 'test-id',
        amount: 500000,
    };
    
    const component = await mount(
        <TestWrapper>
            <MyComponent editingItem={editData} onEditComplete={() => {}} />
        </TestWrapper>
    );
    
    const amountInput = component.locator('input[inputmode="numeric"]').first();
    await expect(amountInput).toHaveValue('500.000'); // formatted
});
```

### Pattern 5: Conditional UI

```typescript
test('should show field when condition met', async ({ mount }) => {
    const component = await mount(<TestWrapper><MyComponent /></TestWrapper>);
    
    const selects = component.locator('select');
    await expect(selects).toHaveCount(2);
    
    await component.locator('label:has-text("Special")').click();
    await expect(selects).toHaveCount(3);
});
```

## Common Pitfalls

### 1. Forgetting to Click Input for Dropdown

```typescript
// ❌ Dropdown won't open
const input = component.locator('input');
await expect(component.getByText('Option 1')).toBeVisible();

// ✅ Click first
const input = component.locator('input');
await input.click();
await expect(component.getByText('Option 1')).toBeVisible();
```

### 2. Text vs Title for Collapsed Elements

```typescript
// ❌ Text is hidden when collapsed
await expect(component.getByText('Nav Item')).toBeVisible();

// ✅ Use title attribute
await expect(component.getByTitle('Nav Item')).toBeVisible();
```

### 3. Exact Text Assertions

```typescript
// ❌ Fragile - breaks on translation changes
await expect(component).toContainText('Edit Treatment');

// ✅ Use regex or structural checks
await expect(component.getByRole('button')).toHaveCount(3);
```

### 4. Date Comparison Issues

```typescript
// ❌ Timezone differences cause failures
await expect(dateInput).toHaveValue('2024-01-15');

// ✅ Use regex for format validation
const value = await dateInput.inputValue();
expect(value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
```

## Debugging Failed Tests

### 1. Print Rendered HTML

```typescript
console.log('Component HTML:', await component.innerHTML());
```

### 2. List All Matching Text

```typescript
const allText = await component.getByText(/Rp/).allTextContents();
console.log('All currency values:', allText);
```

### 3. Check Element Count

```typescript
const buttons = component.getByRole('button');
console.log('Button count:', await buttons.count());
```

### 4. Clear Vite Cache on Persistent Errors

```bash
# Delete Vite cache and test results
rm -rf ui/node_modules/.vite ui/test-results
npm run test:ct
```

## Component-Specific Notes

### Autocomplete
- **Must click input** to open dropdown before checking suggestions
- Dropdown doesn't auto-open on focus

### BottomTabs / Sidebar
- **Check button count** instead of text (more robust)
- Use index-based selection for active state
- Sidebar uses `userRole` to show/hide admin items

### Layout
- Desktop: renders `aside` (sidebar)
- Mobile: renders bottom tabs
- Sidebar defaults to **collapsed state** - use `getByTitle()` not `getByText()`

### OrientationGuard
- Viewport size determines which warning shows
- Mobile portrait (< 768px width): content visible
- Mobile landscape or tablet: rotation warning

### PatientManager
- No search feature implemented
- Form uses **placeholders**, not labels
- Shows "Add Patient" form on button click

### Reporting
- Two views: summary (dentist cards) and detail (single dentist)
- Commission calculation complex - test basic rendering
- Uses Indonesian number formatting (`toLocaleString('id-ID')`)

## Best Practices Summary

### ✅ DO:
- Use structural selectors: `component.locator('input[type="date"]')`
- Use `data-testid` for important elements
- Check for class presence: `await expect(el).toHaveClass(/border-primary/)`
- Use regex for flexible matching: `expect(value).toMatch(/^\d{4}-\d{2}-\d{2}$/)`
- Test user interactions: clicks, focus, typing
- Wrap components in `<TestWrapper>`

### ❌ DON'T:
- Assert exact translation text (locale is Indonesian)
- Compare dates exactly (timezone differences)
- Test implementation details
- Use real `StoreProvider` (triggers API calls)
- Forget to click inputs before checking dropdowns

## MockStoreProvider Default Data

```typescript
{
  patients: [
    { id: '1', name: 'John Doe', age: 30, rowIndex: 1 },
    { id: '2', name: 'Jane Smith', age: 25, rowIndex: 2 }
  ],
  dentists: ['Dr. Smith', 'Dr. Jones'],
  admins: ['Admin A'],
  treatmentTypes: ['Cleaning', 'Filling', 'Orthodontic', 'Ortodontik', 'Checkup'],
  bracesTypes: [
    { type: 'Metal', price: 5000000 },
    { type: 'Control', price: 0 }
  ],
  userRole: 'admin'
}
```

## Mocking External Service Dependencies

### Google OAuth Provider Pattern

**Problem**: Components using `@react-oauth/google`'s `useGoogleLogin` hook require `GoogleOAuthProvider` context, which needs a valid `clientId`.

**Solution**: Two-part setup:

1. **Wrap components in TestWrapper**: The `TestWrapper` must include `GoogleOAuthProvider`:
   ```typescript
   import { GoogleOAuthProvider } from '@react-oauth/google';
   
   export const TestWrapper = ({ children, storeValues }) => (
       <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || 'test-client-id'}>
           <MockStoreProvider value={storeValues}>
               <ToastProvider>
                   {children}
               </ToastProvider>
           </MockStoreProvider>
       </GoogleOAuthProvider>
   );
   ```

2. **Mock environment variables in playwright-ct.config.ts**:
   ```typescript
   define: {
       'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify('test-google-client-id'),
   }
   ```

### Window-based Service Mocking (Recommended)

**Problem**: Importing services directly inside `page.evaluate()` often fails with `Failed to fetch dynamically imported module` because the browser context lacks the same module resolution as the test runner.

**Solution**: Use a "Service Locator" pattern in your components.

1. **In Component**:
   ```typescript
   // LoginScreen.tsx
   const authService = (window as any).MockAuthService || FirebaseAuthService;
   ```

2. **In Test**:
   ```typescript
   // MyComponent.spec.tsx
   await page.evaluate(() => {
     (window as any).MockAuthService = {
       signIn: async () => ({ user: { uid: 'test' } }),
       signOut: async () => {}
     };
   });
   ```

**Benefits**:
- No dynamic import errors.
- Simple, sync-like mocking.
- Bypasses Playwright's prop serialization limits (cant pass functions/classes as props).

**Verification**: `LogoutSpinner.spec.tsx` uses this pattern to successfully mock service hanging and state resets.

**Verification**: `LoginScreen.spec.tsx` tests now pass across all browsers.


---

## HMR (Hot Module Replacement) Considerations

### DEF-007: Service Account Key Persistence
During development, Vite's HMR can reload modules, clearing static properties. This was causing 401 errors on fresh login because `GoogleSheetsService.serviceAccountKey` was being reset to null.

**Solution**: Critical service state is now persisted in `sessionStorage` and restored on module initialization.

**For Services with Static State**:
- ✅ Persist to sessionStorage on update
- ✅ Restore from sessionStorage on module load (IIFE pattern)
- ✅ Clear on explicit logout
- ❌ Never rely solely on in-memory static properties for critical data

**Reference**: See `GoogleSheetsService.ts` initialization IIFE for implementation pattern.

## Areas for Improvement

If you're enhancing the test suite, consider:
1. **Multi-language testing** - Add tests for both Indonesian and English locales
2. **Test utilities** - Create helper functions for common patterns (form filling, assertions)
3. **Visual regression** - Add screenshot comparison tests for UI components
4. **Firebase mocking** - Implement comprehensive Firebase Auth mocking for auth-dependent components
5. **Test data builders** - Create factory functions for consistent mock data generation
