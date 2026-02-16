import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Exclude E2E tests from unit test runner
    exclude: [
      'node_modules/**',
      'tests/e2e/**',
      'tests/staging-secret-checks/**',
      'dist/**',
      '**/*.d.ts'
    ],
    environment: 'jsdom',
    setupFiles: [],
    globals: true
  }
});
