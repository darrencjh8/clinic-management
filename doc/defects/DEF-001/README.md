# DEF-001: Service Account Key Lost During React Component Remounting

**Status:** In Progress  
**Priority:** Critical  
**Created:** 2026-02-16  
**Updated:** 2026-02-16 00:54 UTC+8
**Component:** UI - LoginScreen, GoogleSheetsService, useStore  
**Affected Version:** After commit f9bef73b7dec108abecc3c71a8d8c98dd94a73b7

## Latest Finding (2026-02-16 00:54)

User screenshot confirms sessionStorage is **completely empty** when landing on spreadsheet selection page, despite:
- ✅ Storing encrypted key in sessionStorage after PIN setup (line 202)
- ✅ Fixed sessionStorage.clear() to preserve encrypted keys (useStore.tsx:265-269)  
- ✅ Added race condition prevention with isKeyRestored state
- ✅ Manual integration test proves backend works (lists 2 spreadsheets)

**Current Theory:**
sessionStorage is being wiped by a full page reload (`window.location.href`) somewhere in the flow, OR the key is never being stored in the first place due to timing issues.

## Summary

Service account key stored in static class variable `GoogleSheetsService.serviceAccountKey` is lost when React components remount after PIN setup, causing spreadsheet listing to fail despite having a valid access token.

## Evidence

Manual testing (`test_flow.mjs`) proves the complete authentication flow works:
- ✅ Firebase login successful
- ✅ Backend API returns service account correctly
- ✅ JWT signing and OAuth token exchange work
- ✅ **Lists 2 spreadsheets successfully**

However, E2E tests consistently fail with "No spreadsheet options found" after PIN setup.

## Root Cause

1. User completes PIN setup → `loginWithServiceAccount(key)` stores key in `GoogleSheetsService.serviceAccountKey` (static variable)
2. `onLoginSuccess(token)` called → App remounts with new token
3. LoginScreen remounts with `initialToken` prop
4. **BUG**: Service account key is lost from static variable during remount
5. Only access token persists (via sessionStorage), but without the key, token refresh fails
6. When token expires (60min TTL), `fetchSpreadsheets` fails because no key exists to refresh the token

## Impact

- E2E tests fail at spreadsheet selection
- Staff users cannot list spreadsheets after PIN setup
- Authentication flow is broken for production use

## Attempted Fixes

1. **Commit 3e05a2a**: Redirect to PIN check when remounting with initialToken to restore key
2. **Commit 2dc912b**: After PIN check, go to spreadsheet_setup directly instead of remounting again

Both attempts failed to resolve the issue.

## Proposed Solution

Store encrypted service account key in sessionStorage instead of relying on static class variable:

1. After PIN setup, encrypt service account key with PIN
2. Store encrypted key in sessionStorage (session-scoped, cleared on tab close)
3. On component remount, restore key from sessionStorage
4. Ensure logout clears all sessionStorage data

**Benefits:**
- Survives component remounts
- Automatically cleared on tab close
- Encrypted for security
- No dependency on React lifecycle

## Files Affected

- `ui/src/services/GoogleSheetsService.ts` - Service account key management
- `ui/src/components/LoginScreen.tsx` - PIN and key restoration flow
- `ui/src/App.tsx` - Logout clearing

## Testing

- Manual test: `ui/tests/integration/test_login_flow.mjs` (proves backend works)
- E2E test: `ui/tests/e2e/staging-flow.spec.ts` (currently failing)
- Component tests: All 46 passing

## References

- Full analysis: `spec/login_flow_analysis.md`
- Last working commit: `f9bef73b7dec108abecc3c71a8d8c98dd94a73b7`
