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
