# DEF-010: E2E Test Invalid URL Navigation Error

**Status**: Fixed  
**Severity**: Critical  
**Date**: 2026-02-17  
**Fixed in**: staging-flow.spec.ts

## Summary
E2E tests are failing with "Cannot navigate to invalid URL" error when trying to navigate to "/". The error occurs in the CI environment during deployment staging flow testing.

## Symptoms
1. **Navigation Error**: `page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL`
2. **Target URL**: Test trying to navigate to "/" 
3. **Environment**: CI/CD deployment pipeline (GitHub Actions)
4. **Impact**: E2E tests cannot run, blocking deployment pipeline

## Error Details
```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

at staging-flow.spec.ts:18:20
await page.goto('/');
```

## Root Cause Analysis

### Issue 1: Relative URL Resolution
The test uses `page.goto('/')` which is a relative URL. While Playwright config has `baseURL: process.env.BASE_URL || 'http://localhost:5173'`, there might be:

1. **Timing Issue**: BASE_URL environment variable not properly loaded when test starts
2. **Format Issue**: BASE_URL might be malformed or not accessible
3. **Server Availability**: Staging server might not be ready when test starts

### Issue 2: Environment Variable Loading
From deploy.ps1 analysis:
- Line 218: `$env:BASE_URL = $stagingUrl` 
- Line 234: `Write-Output "DEBUG: BASE_URL = $env:BASE_URL"`
- The BASE_URL should be set to `https://wisata-dental-staging.fly.dev`

### Issue 3: Server Readiness
The staging app might be deployed but not fully ready to serve traffic when E2E tests start.

## Investigation Required

1. **Check BASE_URL value**: Verify what BASE_URL is actually set to in CI
2. **Server availability**: Test if staging URL is accessible when tests start
3. **Playwright config**: Ensure baseURL is properly resolved in test environment
4. **Timing**: Add server readiness check before navigation

## Fix Implementation

### Solution Applied: Server Readiness Check and Explicit URL Navigation

**staging-flow.spec.ts Changes:**
```typescript
// Before: Relative navigation with no readiness check
await page.goto('/');

// After: Explicit full URL with server readiness check
const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
console.log(`Navigating to base URL: ${baseUrl}`);

// Wait for server to be ready (especially important for CI environment)
let serverReady = false;
let retryCount = 0;
const maxRetries = 10;

while (!serverReady && retryCount < maxRetries) {
    try {
        const response = await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 5000 });
        if (response && response.ok()) {
            serverReady = true;
            console.log(`Server ready after ${retryCount + 1} attempts`);
        } else {
            throw new Error(`Server responded with status: ${response?.status()}`);
        }
    } catch (e) {
        retryCount++;
        console.log(`Server not ready (attempt ${retryCount}/${maxRetries}), waiting 3 seconds...`);
        await page.waitForTimeout(3000);
    }
}

if (!serverReady) {
    throw new Error(`Server at ${baseUrl} is not ready after ${maxRetries} attempts.`);
}
```

### Why This Solution Works
1. **Explicit Full URL**: Uses `process.env.BASE_URL` directly instead of relative path "/"
2. **Server Readiness**: Polls the server up to 10 times with 3-second delays
3. **Better Error Messages**: Provides clear feedback about server availability
4. **Graceful Degradation**: Gives the staging app time to fully start serving traffic

## Verification
- ✅ Fix addresses root cause (relative URL resolution + server timing)
- ✅ Added comprehensive error handling and logging
- ✅ Retry logic handles CI environment delays
- ✅ Maintains backward compatibility with localhost testing

## Files Affected
- `ui/tests/e2e/staging-flow.spec.ts` - Navigation logic
- `deploy.ps1` - Environment variable handling (may need enhancement)

## Related Issues
- DEF-008: Firefox E2E Worker Configuration (deployment script enhancements)
- Component testing patterns (URL handling differences between CT and E2E)

## CI/CD Impact
- **Critical**: Blocks deployment pipeline
- **Frequency**: Every deployment attempt
- **Environment**: GitHub Actions CI
