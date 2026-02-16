import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Exclude E2E, component, and integration tests from unit test runner
    exclude: [
      'node_modules/**',
      'tests/e2e/**',
      'tests/components/**',
      'tests/integration/**',
      'tests/staging-secret-checks/**',
      'dist/**',
      '**/*.d.ts'
    ],
    environment: 'jsdom',
    setupFiles: [],
    globals: true
  }
});
