import { defineConfig, devices } from '@playwright/experimental-ct-react';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
    testDir: './tests',
    testMatch: '**/*.spec.tsx',
    snapshotDir: './__snapshots__',
    timeout: 30 * 1000, // Increased from 15s to 30s for Firefox compatibility
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: undefined,
    reporter: 'html',
    use: {
        trace: 'on-first-retry',
        ctPort: 3100,
        ctViteConfig: {
            resolve: {
                alias: {
                    '@': resolve(__dirname, './src'),
                }
            },
            define: {
                // Mock Firebase environment variables for testing
                'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify('test-api-key'),
                'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify('test.firebaseapp.com'),
                'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify('test-project'),
                'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify('test.appspot.com'),
                'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify('123456789'),
                'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify('1:123:web:abc'),
                // Mock Google OAuth Client ID for testing
                'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify('test-google-client-id'),
                'import.meta.env.VITE_IS_CT': JSON.stringify('true'),
            }
        }
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
        },
        {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
        },
    ],
});
