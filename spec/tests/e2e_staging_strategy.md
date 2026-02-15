# E2E Testing Strategy for Staging Environment

## Problem
E2E tests cannot run locally because Vite environment variables aren't properly loaded when dev server is started via PowerShell scripts. The Firebase config fails with `TypeError: Cannot read properties of undefined (reading 'VITE_FIREBASE_API_KEY')`.

## Current State
- Component tests: 123 passed ✅
- E2E tests: Blocked by env var loading issue ❌
- Deploy script: Only runs component tests ✅

## Proposed Solution: Staging Environment E2E Tests

### 1. Create Staging Google Sheet
Create a dedicated test Google Sheet for E2E testing:
- Sheet name: `E2E Test Environment - Clinic App`
- Share with test service account
- Add test data (patients, treatments, etc.)

### 2. Environment Configuration
Create staging environment variables:
```bash
# .env.staging
VITE_GOOGLE_CLIENT_ID=staging-client-id
VITE_FIREBASE_API_KEY=staging-api-key
VITE_FIREBASE_AUTH_DOMAIN=staging.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=staging-project
VITE_FIREBASE_STORAGE_BUCKET=staging.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123:web:abc
VITE_GOOGLE_SHEET_ID=E2E_TEST_SHEET_ID
```

### 3. E2E Test Implementation
Create comprehensive E2E tests that work with staging data:
- Login flow with test credentials
- Patient management operations
- Treatment entry and history
- Reporting functionality
- Data persistence verification

### 4. Deployment Strategy
Two deployment pipelines:
1. **Production**: Current process (component tests only)
2. **Staging**: Full E2E suite against staging environment

### 5. Benefits
- Isolate E2E testing from production data
- Test real Google Sheets integration
- Verify end-to-end user flows
- No risk to production data
- Enables comprehensive regression testing

## Next Steps
1. Create staging Google Sheet with test data
2. Set up staging service account credentials
3. Configure staging environment variables
4. Implement comprehensive E2E test suite
5. Update deployment scripts for staging pipeline
6. Document E2E testing procedures
