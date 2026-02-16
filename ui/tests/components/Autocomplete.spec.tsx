import { test, expect } from '@playwright/experimental-ct-react';
import { Autocomplete } from '../../src/components/Autocomplete';

test.use({ viewport: { width: 500, height: 500 } });

test.describe('Autocomplete', () => {
    test('should render with label and placeholder', async ({ mount }) => {
        const component = await mount(
            <Autocomplete
                value=""
                onChange={() => { }}
                suggestions={[]}
                label="Test Label"
                placeholder="Type here..."
            />
        );

        await expect(component.getByText('Test Label')).toBeVisible();
        await expect(component.getByPlaceholder('Type here...')).toBeVisible();
    });

    test('should show suggestions when typing matches', async ({ mount }) => {
        const suggestions = ['Apple', 'Banana', 'Cherry'];
        const component = await mount(
            <Autocomplete
                value="App"
                onChange={() => { }}
                suggestions={suggestions}
            />
        );

        const input = component.locator('input');
        await input.waitFor({ state: 'visible' });
        await input.click();
        
        // Wait for suggestions to appear
        await expect(component.getByText('Apple')).toBeVisible({ timeout: 10000 });
        await expect(component.getByText('Banana')).not.toBeVisible();
    });

    test('should call onChange when selecting a suggestion', async ({ mount }) => {
        let selectedValue = '';
        const component = await mount(
            <Autocomplete
                value="App"
                onChange={(val) => { selectedValue = val; }}
                suggestions={['Apple', 'Apricot']}
            />
        );

        const input = component.locator('input');
        await input.waitFor({ state: 'visible' });
        await input.click();

        // Wait for suggestions to appear
        const appleSuggestion = component.getByText('Apple');
        await appleSuggestion.waitFor({ state: 'visible', timeout: 10000 });
        await appleSuggestion.click();
        
        // Wait for state update with polling
        await expect.poll(() => selectedValue, { timeout: 5000 }).toBe('Apple');
    });

    test('should close suggestions when clicking outside', async ({ mount }) => {
        const component = await mount(
            <div>
                <div data-testid="outside">Outside</div>
                <Autocomplete
                    value="A"
                    onChange={() => { }}
                    suggestions={['Apple']}
                />
            </div>
        );

        const input = component.locator('input');
        await input.waitFor({ state: 'visible' });
        await input.click();

        const appleSuggestion = component.getByText('Apple');
        await appleSuggestion.waitFor({ state: 'visible', timeout: 10000 });

        // Click outside
        await component.getByTestId('outside').click();

        await expect(appleSuggestion).not.toBeVisible();
    });
});
