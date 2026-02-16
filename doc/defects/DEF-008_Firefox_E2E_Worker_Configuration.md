# DEF-008: Firefox Browser Missing from E2E Tests and Worker Configuration Issues

**Status**: Fixed  
**Severity**: High  
**Date**: 2026-02-16  
**Fixed in**: `playwright.config.ts`, `deploy.ps1`, `playwright-ct.config.ts`  

## Summary
The deployment script was failing because Firefox browser tests were not configured for E2E testing, and there were worker configuration issues that could cause test timeouts and failures during parallel execution.

## Symptoms
1. **Missing Firefox E2E Tests**: The deployment script only ran E2E tests on Chromium, missing Firefox browser compatibility testing
2. **Worker Configuration Issues**: The deployment script had inconsistent CI environment variable handling that could lead to test execution problems
3. **Firefox Parallel Execution**: Component tests had Firefox configured with `fullyParallel: false`, potentially causing performance issues

## Root Cause Analysis

### Issue 1: Missing Firefox Project in E2E Configuration
The main `playwright.config.ts` only included Chromium project:
```typescript
projects: [
    {
        name: 'chromium',
        use: { ...devices['Desktop Chrome'] },
    },
],
```

While the component test configuration (`playwright-ct.config.ts`) had Firefox configured, the E2E tests were only running on Chromium.

### Issue 2: Suboptimal Worker Configuration in Deployment Script
The deployment script had this logic:
```powershell
# Clear CI for component tests to allow multiple workers
$env:CI = $null
# ... run component tests ...
# Restore CI for E2E tests to force 1 worker
$env:CI = "true"
npx playwright test tests/e2e/staging-flow.spec.ts --project=chromium
```

This forced E2E tests to run with only 1 worker (`CI=true` sets `workers: 1` in Playwright config), making tests slower than necessary.

### Issue 3: Firefox Parallel Execution Restriction
The component test configuration had:
```typescript
{
    name: 'firefox',
    use: { ...devices['Desktop Firefox'] },
    fullyParallel: false,  // This was unnecessary
},
```

## Fix Implementation

### Fix 1: Add Firefox Project to E2E Configuration
Updated `playwright.config.ts`:
```typescript
projects: [
    {
        name: 'chromium',
        use: { ...devices['Desktop Chrome'] },
    },
    {
        name: 'firefox',
        use: { ...devices['Desktop Firefox'] },
    },
],
```

### Fix 2: Optimize Worker Configuration in Deployment Script
Updated `deploy.ps1`:
```powershell
# Set CI mode to avoid HTML report server blocking, but use multiple workers for faster execution
$env:CI = "true"
# Run tests on both Chromium and Firefox for comprehensive browser compatibility
npx playwright test tests/e2e/staging-flow.spec.ts --project=chromium --project=firefox --workers=2
```

### Fix 3: Remove Firefox Parallel Restriction
Updated `playwright-ct.config.ts`:
```typescript
{
    name: 'firefox',
    use: { ...devices['Desktop Firefox'] },
    // Removed fullyParallel: false to allow parallel execution
},
```

## Benefits
1. **Comprehensive Browser Testing**: E2E tests now run on both Chromium and Firefox, ensuring cross-browser compatibility
2. **Faster Test Execution**: Using 2 workers for E2E tests reduces execution time while maintaining stability
3. **Consistent Parallel Execution**: Firefox component tests can now run in parallel like other browsers
4. **Better Deployment Reliability**: The deployment script now tests multiple browsers, catching browser-specific issues early

## Verification

### Manual Testing
1. Run component tests on Firefox: `npm run test:ct -- --project=firefox`
2. Run E2E tests on both browsers: `npx playwright test tests/e2e/staging-flow.spec.ts --project=chromium --project=firefox --workers=2`
3. Verify deployment script runs successfully with the new configuration

### Test Results
- ✅ Component tests pass on Firefox with parallel execution
- ✅ E2E tests pass on both Chromium and Firefox
- ✅ Deployment script successfully runs multi-browser E2E tests
- ✅ Worker configuration optimizes test execution time

## Technical Details

### Worker Configuration Logic
The Playwright configuration uses this logic:
- `workers: process.env.CI ? 1 : undefined` - When CI=true, uses 1 worker
- Command line `--workers=2` overrides the config setting
- This allows optimal parallel execution while maintaining CI compatibility

### Browser Compatibility
- **Chromium**: Primary browser for development and testing
- **Firefox**: Added for comprehensive cross-browser validation
- **WebKit**: Available in component tests but not included in E2E to keep execution time reasonable

### Performance Impact
- **Before**: E2E tests ran sequentially (1 worker) on Chromium only
- **After**: E2E tests run with 2 workers on both Chromium and Firefox
- **Result**: Better browser coverage with optimized execution time

## Prevention
For future deployments:
1. Always include multiple browser projects in E2E configuration
2. Use optimal worker configuration for faster test execution
3. Avoid unnecessary parallel execution restrictions
4. Test the deployment script with all browser configurations before production deployment

## Related Issues
- **DEF-007**: HMR Service Account Key Loss (related to test environment stability)
- **Component Testing**: Firefox configuration improvements enhance overall test reliability

## Files Modified
- [`playwright.config.ts`](file:///c:/Users/darren/OneDrive/Documents/project/clinic-app/ui/playwright.config.ts#L37-L42) - Added Firefox project
- [`deploy.ps1`](file:///c:/Users/darren/OneDrive/Documents/project/clinic-app/deploy.ps1#L240-L242) - Updated E2E test execution
- [`playwright-ct.config.ts`](file:///c:/Users/darren/OneDrive/Documents/project/clinic-app/ui/playwright-ct.config.ts#L47-L49) - Removed Firefox parallel restriction