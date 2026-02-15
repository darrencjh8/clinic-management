# DEF-001: Root Cause Analysis

## Manual Testing Results

Created `ui/tests/integration/test_login_flow.mjs` to manually test the complete login flow outside of React.

**Test Results: ✅ SUCCESS**
```
=== Step 1: Firebase Login ===
✓ Firebase ID Token obtained (length: 926)

=== Step 2: Get Service Account from Backend ===
✓ Service Account obtained: google-sheet-bot@wisata-dental.iam.gserviceaccount.com

=== Step 3: Get Google OAuth Token ===
✓ JWT created
✓ Google Access Token obtained (length: 1024)
  Expires in: 3599 seconds

=== Step 4: List Spreadsheets ===
✓ Found 2 spreadsheets:
  1. Copy of Wisata Dental - February 9, 11:17 PM
  2. Wisata Dental

✅ SUCCESS: Service account can access spreadsheets!
```

**Critical Finding:** The service account works perfectly! The bug is in the UI React component lifecycle, not in:
- Firebase authentication ✓
- Backend API ✓
- Service account credentials ✓
- Google Sheets API permissions ✓

## Root Cause

The bug is **service account key persistence during React component remounting**.

### The Problem

After PIN setup, `onLoginSuccess` triggers App to remount, which causes LoginScreen to remount with `initialToken`. During this remount:

1. The service account key stored in `GoogleSheetsService.serviceAccountKey` (static class variable) is lost
2. Only the token persists (via sessionStorage and initialToken prop)
3. Without the key, `GoogleSheetsService` cannot refresh expired tokens
4. When `fetchSpreadsheets` tries to list spreadsheets, the token may be stale or the API call fails

### Why Static Variables Fail

Static class variables in JavaScript are shared across all instances, but they exist only in memory:
- They are NOT persisted across page reloads
- They are NOT preserved during React component remounts
- They are lost when the module is re-evaluated

### Evidence

1. **Integration test succeeds** - All operations happen in a single execution context
2. **UI fails** - Operations span multiple React lifecycle events and component remounts
3. **Component tests pass** - Mock environment doesn't simulate real remounting behavior

## Attempted Fixes

### Fix Attempt #1: Redirect to PIN Check on Remount
**Commit:** `3e05a2a`

When remounting with `initialToken` and encrypted key exists, redirect to `pin_check` to restore the service account key.

**Result:** Failed - Created a loop where users had to enter PIN twice

### Fix Attempt #2: Skip Remount After PIN Check
**Commit:** `2dc912b`

After PIN check succeeds with `initialToken` present, go directly to `spreadsheet_setup` instead of calling `onLoginSuccess` again.

**Result:** Failed - Timing issue; key restoration wasn't completing before spreadsheet listing

### Fix Attempt #3: SessionStorage for Key Persistence
**Commit:** `b8ea587` (current)

Store base64-encoded service account key in sessionStorage to survive component remounts.

**Result:** Failed - Async IIFE in useEffect may not complete before `fetchSpreadsheets` is called

## Discrepancy Between Integration Test and UI

### Integration Test (Working)
```javascript
// All operations happen sequentially in one execution:
const firebaseToken = await firebaseLogin();
const serviceAccount = await getServiceAccount(firebaseToken);
const googleToken = await getGoogleAccessToken(serviceAccount);
const spreadsheets = await listSpreadsheets(googleToken);
```

**Key characteristics:**
- Single execution context
- Synchronous flow
- Service account key stays in memory throughout
- Token is immediately used after creation

### UI Implementation (Failing)
```javascript
// Operations span multiple React lifecycle events:
1. PIN setup → loginWithServiceAccount(key) → onLoginSuccess(token)
2. App remounts with token prop
3. LoginScreen remounts with initialToken
4. useEffect fires → tries to restore key from sessionStorage
5. Async IIFE starts → restores key, refreshes token
6. MEANWHILE: authStep changes to 'spreadsheet_setup'
7. Another useEffect fires → calls fetchSpreadsheets()
8. Race condition: fetchSpreadsheets may run BEFORE key restoration completes
```

**Key characteristics:**
- Multiple React lifecycle events
- Asynchronous state updates
- Service account key must survive remounts
- Token may expire between operations

## The Actual Bug

The async IIFE in `LoginScreen.tsx` line 60-75 restores the service account key asynchronously:

```typescript
(async () => {
    const key = JSON.parse(atob(sessionEncryptedKey));
    GoogleSheetsService.restoreServiceAccountKey(key);
    await GoogleSheetsService.refreshServiceAccountToken();
    setAuthStep('spreadsheet_setup');
})();
```

But the dependency `[initialToken]` in the useEffect means this IIFE doesn't block. The component continues rendering, and when `authStep` changes to `'spreadsheet_setup'`, another useEffect triggers `fetchSpreadsheets()`.

**Race condition:**
- Thread A: Async IIFE restoring key + refreshing token
- Thread B: `fetchSpreadsheets()` called when `authStep === 'spreadsheet_setup'`
- Thread B may execute BEFORE Thread A completes

## Solution Requirements

Based on the working integration test, the UI must ensure:
1. Service account key is restored BEFORE spreadsheet listing
2. Token is refreshed BEFORE spreadsheet listing  
3. No race conditions between key restoration and API calls
4. Key persists across React component remounts

## Final Root Cause (2026-02-16 00:59)

**The smoking gun: `window.location.href = '/'` on 401 errors**

Location: `ui/src/store/useStore.tsx` line 277 (removed in fix)

### What Was Happening

1. After PIN setup, `onLoginSuccess` is called with service account token
2. Token stored in sessionStorage (`google_access_token` and `encrypted_service_account`)
3. App remounts, triggers `loadData()` to fetch spreadsheet metadata
4. On first load, if spreadsheet doesn't exist or any 401 error occurs, code called `window.location.href = '/'`
5. **Hard page reload wipes ALL sessionStorage**, including `encrypted_service_account`
6. User sees empty sessionStorage when landing on spreadsheet selection
7. Without service account key, `fetchSpreadsheets()` cannot list spreadsheets

### Why sessionStorage.clear() Wasn't the Only Issue

Two separate bugs were wiping sessionStorage:
1. **Bug A**: `sessionStorage.clear()` on 401 errors (line 265) - Fixed by selectively removing items
2. **Bug B**: `window.location.href = '/'` hard reload (line 277) - **This was the actual culprit**

Even after fixing Bug A, Bug B continued to wipe sessionStorage because **any full page reload clears sessionStorage by design** (unlike localStorage which persists across page loads).

### The Fix

```typescript
// BEFORE (broken):
if (e.message === 'Unauthorized') {
    sessionStorage.clear();
    localStorage.clear();
    setErrorType('AUTH');
    setAccessToken(null);
    setSpreadsheetId(null);
    window.location.href = '/';  // ❌ WIPES ALL sessionStorage!
}

// AFTER (working):
if (e.message === 'Unauthorized') {
    // Clear tokens but preserve encrypted service account
    sessionStorage.removeItem('google_access_token');
    sessionStorage.removeItem('retry_attempted');
    localStorage.removeItem('user_role');
    // Preserve sessionStorage.encrypted_service_account
    
    setErrorType('AUTH');
    setAccessToken(null);
    setSpreadsheetId(null);
    // Just clearing state triggers LoginScreen to show
    // NO hard reload needed!
}
```

### Key Lessons

1. **sessionStorage is wiped by page reloads** - Any `window.location` change, `location.reload()`, or navigation that causes full page reload will clear sessionStorage
2. **localStorage persists across reloads** - But we need sessionStorage for security (auto-cleared when tab closes)
3. **Clearing React state is enough** - Setting `accessToken` and `spreadsheetId` to null automatically triggers LoginScreen to render
4. **Hard reloads should be avoided** - Modern SPAs should handle state changes through React, not page reloads

## Current Status (2026-02-16 01:05)

### Completed Fixes
- ✅ Fixed `sessionStorage.clear()` to preserve encrypted keys (useStore.tsx:265-269)
- ✅ Removed `window.location.href = '/'` hard reload that wipes sessionStorage (useStore.tsx:277)
- ✅ Added race condition prevention with `isKeyRestored` state
- ✅ Added sessionStorage persistence tests (component and integration)
- ✅ Updated documentation in login_flow_architecture.md

### Next Steps Planned
1. **Run component tests** - Verify SessionStoragePersistence.spec.tsx passes
2. **Run integration test** - Test sessionStorage persistence with real browser
3. **Fix any test failures** - Address issues found during testing
4. **Push changes to GitHub** - Commit all fixes and documentation
5. **Run deploy-and-test** - Final verification with proper timeout (60s)
6. **Update defect status** - Mark as resolved if E2E passes

### Test Coverage Added
- `SessionStoragePersistence.spec.tsx` - Component tests for sessionStorage survival
- `test_session_persistence.mjs` - Integration test for real browser scenario
- Both tests verify that `encrypted_service_account` persists through:
  - Component remounting
  - Error handling scenarios
  - Page navigation without hard reloads

### Expected Outcome
With the `window.location.href` fix, sessionStorage should now persist correctly:
- After PIN setup → `encrypted_service_account` stored in sessionStorage
- Component remounts → Key restored from sessionStorage before spreadsheet listing
- No hard reloads → sessionStorage never wiped
- E2E test should pass and list spreadsheets successfully

## Suspected Problems and Fixes

### Problem 1: Service Account Key Lost During Component Remounting
**Suspected Issue:** Static class variable `GoogleSheetsService.serviceAccountKey` is lost when React components remount after PIN setup.

**Fix Applied:** Store encrypted service account key in sessionStorage to survive component remounts:
```typescript
// Store after PIN setup
const encodedKey = btoa(JSON.stringify(serviceAccount));
GoogleSheetsService.setEncryptedServiceAccountKey(encodedKey);

// Restore on component remount
const sessionEncryptedKey = GoogleSheetsService.getEncryptedServiceAccountKey();
if (sessionEncryptedKey) {
    const key = JSON.parse(atob(sessionEncryptedKey));
    GoogleSheetsService.restoreServiceAccountKey(key);
    await GoogleSheetsService.refreshServiceAccountToken();
}
```

### Problem 2: Race Condition Between Key Restoration and Spreadsheet Listing
**Suspected Issue:** Async IIFE in useEffect doesn't block, so `fetchSpreadsheets()` may run before key restoration completes.

**Fix Applied:** Use state to track restoration completion:
```typescript
const [isKeyRestored, setIsKeyRestored] = useState(false);

// Only fetch spreadsheets after key restoration is complete
useEffect(() => {
    if (authStep === 'spreadsheet_setup') {
        const hasSessionKey = GoogleSheetsService.getEncryptedServiceAccountKey();
        if (!hasSessionKey || isKeyRestored) {
            fetchSpreadsheets();
        }
    }
}, [authStep, isKeyRestored]);
```

### Problem 3: sessionStorage.clear() Wiping Encrypted Keys
**Suspected Issue:** `sessionStorage.clear()` on 401 errors removes ALL sessionStorage including encrypted service account.

**Fix Applied:** Selectively remove only tokens, preserve encrypted keys:
```typescript
// BEFORE (broken):
sessionStorage.clear();

// AFTER (fixed):
sessionStorage.removeItem('google_access_token');
sessionStorage.removeItem('retry_attempted');
// Preserve sessionStorage.encrypted_service_account
```

### Problem 4: Hard Page Reload Wiping sessionStorage
**Suspected Issue:** `window.location.href = '/'` on 401 errors causes full page reload, which wipes ALL sessionStorage by design.

**Fix Applied:** Remove hard reload, just clear React state:
```typescript
// BEFORE (broken):
window.location.href = '/';  // WIPES ALL sessionStorage!

// AFTER (fixed):
setErrorType('AUTH');
setAccessToken(null);
setSpreadsheetId(null);
// LoginScreen automatically shows when accessToken is null
```

### Problem 5: Session Storage Key Being Cleared on Restoration Failure
**Suspected Issue:** When async restoration fails, code calls `clearEncryptedServiceAccountKey()`, wiping the key permanently.

**Fix Applied:** Redirect to PIN check instead of clearing key:
```typescript
// BEFORE (broken):
catch (e) {
    GoogleSheetsService.clearEncryptedServiceAccountKey();
    setError('Failed to restore session. Please log in again.');
}

// AFTER (fixed):
catch (e) {
    setAuthStep('pin_check');
    setError('Session expired. Please enter your PIN.');
    // Key preserved for recovery
}
```

## Root Cause Summary

The primary issue was **Problem 4** - the hard page reload on 401 errors. This single bug was wiping sessionStorage, causing all other sessionStorage-based fixes to fail. The secondary issues (Problems 1-3, 5) were compounding factors that made the system more fragile.

**The Fix Chain:**
1. Remove hard reload → sessionStorage persists
2. Store key in sessionStorage → survives component remounts  
3. Use state tracking → prevents race conditions
4. Selective clearing → preserves encrypted keys during errors
5. PIN check fallback → allows recovery without full re-login

## Important Clarification: Token Clearing is NOT Required on Page Load

**Note:** The access tokens (`google_access_token`) should NOT be cleared when the page loads after PIN setup. Clearing them causes Google Sheets API calls to fail because:

- **Tokens are needed immediately** - The spreadsheet selection page needs the token to call Google Drive API
- **Token refresh requires the service account key** - If token is cleared AND service account key is lost, API calls fail
- **The flow should be**: PIN setup → store token → navigate to spreadsheet selection → use existing token

**The Problem:**
When React state clears `accessToken` on page load, but the service account key restoration hasn't completed yet, the GoogleSheetsService has no token to use for API calls.

**How Token Clearing Causes Failures:**
```typescript
// PIN setup completes:
GoogleSheetsService.setAccessToken(token); // Token set
GoogleSheetsService.setEncryptedServiceAccountKey(encodedKey); // Key stored

// App remounts with initialToken:
setAccessToken(null); // ❌ React clears token!
// Component tries to list spreadsheets but token is null
// Service account key restoration is async, so API fails immediately
```

**What Should Persist vs What Should Clear:**
- ✅ **Should Persist**: `google_access_token` (sessionStorage), `encrypted_service_account` (sessionStorage)
- ✅ **Should Clear**: React state `accessToken` only if user explicitly logs out
- ❌ **Problem**: React state clearing token on page load before key restoration completes

**The Correct Flow:**
1. PIN setup → store token AND encrypted key in sessionStorage
2. Component remounts → restore key from sessionStorage FIRST
3. Then restore token from sessionStorage OR refresh using restored key
4. THEN allow spreadsheet listing to proceed

## Final Root Cause (2026-02-16 01:25) - Aggressive Logout Race Condition

### The Hidden Bug: `this.logout()` in `GoogleSheetsService.fetch`

Even after fixing the hard reload, users were still experiencing login loops or "Session expired" errors during transient network failures or when the token expired before key restoration completed.

**Location:** `ui/src/services/GoogleSheetsService.ts`

### What Was Happening
1. `LoginScreen` starts `restoreServiceAccountKey` (async operation).
2. `fetchSpreadsheets` is called (race condition).
3. `fetch` calls API with expired/missing token → Returns 401.
4. `fetch` catches 401 but sees no `this.serviceAccountKey` (restoration not finished).
5. **Logic Error**: `fetch` calls `this.logout()` immediately.
6. `logout()` **wipes** `sessionStorage.encrypted_service_account`.
7. `restoreServiceAccountKey` finishes but finds `sessionStorage` empty (or the next retry finds it empty).
8. User is kicked back to PIN Check or Login.

### The Fix
Modified `GoogleSheetsService.ts` to **NEVER** call `this.logout()` automatically on 401 errors inside `fetch`.
- If 401 occurs, throw `Unauthorized`.
- `LoginScreen` or `useStore` catches the error.
- UI prompts user or retries logic.
- `encrypted_service_account` remains in `sessionStorage` for subsequent restoration attempts.

This enables **Self-Healing**:
- If `fetch` fails 401, it throws.
- The UI stays on the current screen (or shows error).
- The user can click "Retry" or the app can auto-retry.
- Because the key is still in session, the retry succeeds!

### Verification
- **Automated Test**: `Self-healing: 401 should trigger lazy restoration` passed.
- **Persistence Test**: `sessionStorage should survive React component remounting` passed.
- **Manual Verification**: App no longer loops on login.
