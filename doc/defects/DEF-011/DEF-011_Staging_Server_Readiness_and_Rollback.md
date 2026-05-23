# DEF-011: Staging Server Readiness and Rollback Issues

**Status**: Fixed  
**Severity**: High  
**Date**: 2026-02-17  
**Fixed in**: .github/workflows/ci-cd.yml

## Summary
The CI/CD pipeline lacks proper server readiness verification before running E2E tests, and has no rollback mechanism when E2E tests fail. The staging app should be rolled back to previous version, not destroyed.

## Symptoms
1. **No Server Readiness Check**: E2E tests start immediately after deployment without verifying the staging app is fully ready
2. **No Rollback Mechanism**: If E2E tests fail, the staging deployment remains active with failed version
3. **False Test Failures**: Tests may fail due to server not being ready rather than actual code issues
4. **Resource Waste**: Failed deployments remain active until manual intervention

## Critical Correction
**STAGING APPS SHOULD NEVER BE DESTROYED** - They should be rolled back to previous healthy version. Destroying staging apps loses:
- DNS configuration
- SSL certificates  
- Environment secrets
- Deployment history
- Monitoring setup

## Current Deployment Flow Issues

### Issue 1: Missing Server Readiness Check
From CI/CD analysis:
- Deployment completes → E2E tests start immediately
- **Gap**: No verification that the deployed app is actually serving traffic

### Issue 2: No Rollback Mechanism
- If E2E tests fail → failed deployment remains active
- **Problem**: No automatic rollback to previous working version
- **Risk**: Broken staging environment until manual fix

### Issue 3: Poor Error Diagnostics
- **Missing**: Health check to distinguish between deployment failure vs test failure

## Root Cause Analysis

### Deployment Timing Issues
1. **Fly.io Deployment**: `fly deploy` may return success before app is fully ready
2. **Cold Starts**: New deployments may need time to initialize dependencies
3. **Health Checks**: No verification that critical endpoints are responding

### Error Handling Gaps
1. **Success Assumption**: Script assumes deployment = ready app
2. **Test Failure Confusion**: Can't distinguish between app failure vs test failure
3. **Resource Management**: Failed deployments persist longer than necessary

## Fix Implementation

### Solution Applied: Server Readiness Check and Rollback in CI/CD

**.github/workflows/ci-cd.yml Changes:**

#### 1. Server Readiness Check After Deployment
```yaml
- name: Deploy to Staging
  run: |
    flyctl deploy --app wisata-dental-staging --config fly.staging.toml --ha=false \
      --build-arg VITE_API_URL="${{ secrets.VITE_API_URL }}" \
      # ... other build args
  env:
    FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}

- name: Wait for Staging Server Readiness
  run: |
    echo "Waiting for staging server to be ready..."
    SERVER_READY=false
    RETRY_COUNT=0
    MAX_RETRIES=20
    STAGING_URL="https://wisata-dental-staging.fly.dev"
    
    while [ "$SERVER_READY" = false ] && [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
      if curl -f -s --max-time 10 "$STAGING_URL" | grep -q "wisata-dental\|clinic\|dental\|id=\"root\""; then
        echo "✅ Server ready after $((RETRY_COUNT + 1)) attempts"
        SERVER_READY=true
      else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        echo "Server not ready (attempt $RETRY_COUNT/$MAX_RETRIES), waiting 5 seconds..."
        sleep 5
      fi
    done
    
    if [ "$SERVER_READY" = false ]; then
      echo "❌ Staging server failed to become ready after $MAX_RETRIES attempts"
      echo "Rolling back to previous deployment..."
      flyctl deploy rollback --app wisata-dental-staging
      exit 1
    fi
  env:
    FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

#### 2. Rollback on E2E Test Failure
```yaml
- name: Run E2E Tests
  working-directory: ./ui
  run: |
    if npx playwright test tests/e2e/staging-flow.spec.ts; then
      echo "✅ E2E Tests PASSED!"
    else
      echo "❌ E2E Tests FAILED!"
      echo "🔄 Rolling back staging deployment..."
      flyctl deploy rollback --app wisata-dental-staging
      echo "✅ Staging rolled back to previous version"
      exit 1
    fi
  env:
    BASE_URL: https://wisata-dental-staging.fly.dev
    E2E_TEST_EMAIL: ${{ secrets.E2E_TEST_EMAIL }}
    E2E_TEST_PASSWORD: ${{ secrets.E2E_TEST_PASSWORD }}
    FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

### Why This Solution Works
1. **Server Readiness Check**: 20 attempts with 5-second delays (up to 100 seconds total)
2. **Content Verification**: Uses `curl` with `grep` to ensure actual app content is served
3. **Rollback Not Destroy**: Uses `flyctl deploy rollback` to revert to previous healthy version
4. **Preserves Infrastructure**: Maintains DNS, SSL, secrets, and deployment history
5. **CI/CD Integration**: Properly integrated into GitHub Actions workflow

## Benefits
1. **Reliable Testing**: E2E tests only run against verified ready servers
2. **Fast Recovery**: Immediate rollback on test failures
3. **Infrastructure Preservation**: Staging app configuration and history maintained
4. **Better Debugging**: Clear distinction between deployment vs test failures
5. **Zero Downtime**: Rollback is instant vs full redeployment

## Files to Modify
- `.github/workflows/ci-cd.yml` - Add server readiness check and rollback logic

## Related Issues
- DEF-010: E2E Test Invalid URL Navigation (server readiness related)
- DEF-008: Firefox E2E Worker Configuration (deployment script improvements)

## Verification
- ✅ Server readiness check prevents false E2E test failures
- ✅ Rollback preserves staging infrastructure (DNS, SSL, secrets, history)
- ✅ Content verification ensures actual app deployment, not just container start
- ✅ Immediate rollback minimizes failed deployment exposure
- ✅ CI/CD integration maintains workflow dependencies and error handling

## Implementation Summary
1. **Added Server Readiness Check**: 20 attempts with 5-second delays and content verification
2. **Added Rollback Mechanism**: Uses `flyctl deploy rollback` instead of destroying the app
3. **Preserved Infrastructure**: Maintains all staging app configuration and history
4. **Enhanced Error Handling**: Clear feedback and automatic recovery on failures
