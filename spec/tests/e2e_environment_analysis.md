# E2E Testing Environment Setup Guide

## Problem
Local E2E tests fail because Vite environment variables aren't properly loaded when starting dev server via PowerShell scripts. The Firebase config fails with `TypeError: Cannot read properties of undefined (reading 'VITE_FIREBASE_API_KEY')`.

## Root Cause Analysis
1. **PowerShell Process Isolation**: When `Start-Process` or `Start-Job` creates child processes, environment variables set in parent PowerShell session aren't inherited by the Vite dev server
2. **Vite Environment Loading**: Vite only loads `.env.local` automatically when started directly, not when spawned as a child process
3. **Firebase Config Dependency**: The Firebase configuration directly accesses `import.meta.env.VITE_*` variables without fallbacks

## Current Workarounds Attempted
1. **ProcessStartInfo with EnvironmentVariables**: Failed - child processes don't inherit PowerShell env vars properly
2. **Background Jobs with $using:PWD**: Failed - environment isolation still prevents proper env var loading
3. **Direct .env.local Creation**: Failed - Vite cache and process isolation issues
4. **WebServer Configuration in Playwright**: Failed - same env var inheritance issues

## Recommended Solution: Staging Environment Strategy

### Option 1: Staging Google Sheet (Recommended)
Create a dedicated test environment that mirrors production but uses separate data:

**Benefits:**
- Tests real Google Sheets integration
- No production data risk
- Proper end-to-end testing
- Mirrors production architecture

**Implementation:**
1. Create staging Google Sheet with test data
2. Set up staging service account
3. Configure staging environment variables
4. Update deployment scripts for staging pipeline

### Option 2: Mock Google Sheets Service (Alternative)
Replace Google Sheets service with mock implementation for E2E testing:

**Benefits:**
- No external dependencies
- Fast, reliable tests
- Full control over test data
- No Google API quota concerns

**Implementation:**
1. Create mock GoogleSheetsService with in-memory data
2. Add test data factories
3. Configure mock mode for E2E tests
4. Keep real service for production

### Option 3: Firebase Mocking (Complementary)
Mock Firebase Auth completely for E2E tests:

**Benefits:**
- Eliminates Firebase dependency
- Faster test execution
- No network dependencies
- Consistent test environment

**Implementation:**
1. Create mock Firebase Auth service
2. Mock user authentication state
3. Add test user management
4. Configure test-only mode

## Decision Matrix

| Approach | Implementation Complexity | Maintenance Overhead | Test Coverage | Production Risk |
|----------|---------------------|-------------------|--------------|----------------|
| Staging Sheet | Medium | Low | High | Low |
| Mock Sheets | High | Medium | Medium | None |
| Firebase Mock | Low | Low | Medium | None |

## Recommendation
**Implement Option 1 (Staging Google Sheet)** as primary solution with Option 3 (Firebase Mock) as complementary enhancement.

This provides the most comprehensive testing while maintaining architectural fidelity to production.
