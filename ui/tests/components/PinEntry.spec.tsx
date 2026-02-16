import { test, expect } from '@playwright/experimental-ct-react';
import { PinEntry } from '../../src/components/PinEntry';

test.use({ viewport: { width: 500, height: 500 } });

test('should render PinEntry in enter mode', async ({ mount }) => {
    const component = await mount(
        <PinEntry
            mode="enter"
            onSubmit={() => { }}
            error={null}
        />
    );
    await expect(component).toContainText('Masukkan PIN');
});
