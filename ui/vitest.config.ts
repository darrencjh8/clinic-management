import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Exclude E2E, component, integration, and Playwright tests from unit test runner
    exclude: [
      'node_modules/**',
      'tests/**',
      'dist/**',
      '**/*.d.ts'
    ],
    environment: 'jsdom',
    setupFiles: [],
    globals: true
  }
});
