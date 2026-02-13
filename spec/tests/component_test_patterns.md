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
```

## Critical i18n Considerations

**⚠️ Default Language**: Tests run with Indonesian (`id`) as the default language, NOT English.

```typescript
// ❌ WRONG - Expects English
await expect(component.getByText('New Treatment')).toBeVisible();

// ✅ CORRECT - Expects Indonesian OR uses regex for both
await expect(component.getByText(/Perawatan Baru|New Treatment/)).toBeVisible();
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

### SyncStatus
- **Store override unreliable** in tests
- Keep assertions basic (check for non-empty render)
- Advanced state tests marked as `test.fixme()`

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

## Areas for Improvement

If you're enhancing the test suite, consider:
1. **Fix MockStoreProvider context propagation** - Store overrides don't always work reliably
2. **Multi-language testing** - Add tests for both Indonesian and English locales
3. **Test utilities** - Create helper functions for common patterns (form filling, assertions)
4. **Visual regression** - Add screenshot comparison tests for UI components
5. **Firebase mocking** - Implement comprehensive Firebase Auth mocking for auth-dependent components
6. **Test data builders** - Create factory functions for consistent mock data generation
