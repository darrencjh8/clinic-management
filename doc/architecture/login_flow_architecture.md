# Login Flow Architecture

## Overview

This document describes the authentication flow for the clinic management app, covering both admin and staff user types.

## User Types

### Admin Users
- Login via **Google OAuth** directly
- Use their personal Google account token to access Google Sheets API
- Can create new spreadsheets
- Have full access to all features including reporting

### Staff Users  
- Login via **Firebase Email/Password**
- Use a **Service Account** (fetched from server) to access Google Sheets API
- Service account key is encrypted with a user-set **PIN** and stored in localStorage
- Cannot create spreadsheets - can only select existing ones shared with the service account

## Authentication Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        LOGIN SCREEN                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐          ┌─────────────────┐               │
│  │  ADMIN LOGIN    │          │  STAFF LOGIN    │               │
│  │  (Google OAuth) │          │  (Firebase)     │               │
│  └────────┬────────┘          └────────┬────────┘               │
│           │                            │                         │
│           ▼                            ▼                         │
│  ┌─────────────────┐          ┌─────────────────┐               │
│  │ Google Token    │          │ Firebase Token  │               │
│  │ (User's own)    │          │ (ID Token)      │               │
│  └────────┬────────┘          └────────┬────────┘               │
│           │                            │                         │
│           │                            ▼                         │
│           │                   ┌─────────────────┐               │
│           │                   │ Fetch Service   │               │
│           │                   │ Account from    │               │
│           │                   │ Server API      │               │
│           │                   └────────┬────────┘               │
│           │                            │                         │
│           │                            ▼                         │
│           │                   ┌─────────────────┐               │
│           │                   │ PIN Setup/Check │               │
│           │                   │ (Encrypt/Decrypt│               │
│           │                   │  Service Acct)  │               │
│           │                   └────────┬────────┘               │
│           │                            │                         │
│           │                            ▼                         │
│           │                   ┌─────────────────┐               │
│           │                   │ Generate JWT &  │               │
│           │                   │ Exchange for    │               │
│           │                   │ Access Token    │               │
│           │                   └────────┬────────┘               │
│           │                            │                         │
│           ▼                            ▼                         │
│  ┌─────────────────────────────────────────────────┐            │
│  │           SPREADSHEET SELECTION                  │            │
│  │  (Admin can create, Staff can only select)       │            │
│  └─────────────────────────────────────────────────┘            │
│                            │                                     │
│                            ▼                                     │
│  ┌─────────────────────────────────────────────────┐            │
│  │                  MAIN APP                        │            │
│  └─────────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. FirebaseAuthService (`ui/src/services/FirebaseAuthService.ts`)
- `signIn(email, password)` - Firebase email/password auth
- `fetchServiceAccount(token)` - Calls server API to get Google Service Account
- `onTokenChange(callback)` - **CRITICAL**: Listens for Firebase token refreshes, required for Firebase Auth initialization

### 2. GoogleSheetsService (`ui/src/services/GoogleSheetsService.ts`)
- `loginWithServiceAccount(credentials)` - Generates JWT and exchanges for access token
- `refreshServiceAccountToken()` - Auto-refreshes token before expiry
- `encryptKey(key, pin)` / `decryptKey(jwe, pin)` - PIN-based encryption
- `listSpreadsheets()` - Lists spreadsheets accessible to current token
- `hasServiceAccount()` - Checks if service account key is loaded
- `fetch()` - **CRITICAL**: Includes response.ok check to handle API errors properly

### 3. Server API (`server/index.js`)
- `POST /api/auth/service-account` - Returns Google Service Account (protected by Firebase token)
- Requires `GOOGLE_SERVICE_ACCOUNT_BASE64` env var
- Uses `verifyToken` middleware to validate Firebase ID tokens

### 4. LoginScreen (`ui/src/components/LoginScreen.tsx`)
- Manages auth state machine: `login` → `pin_check`/`pin_setup` → `spreadsheet_setup`
- Handles both admin (Google OAuth) and staff (Firebase) login flows
- **CRITICAL**: Must handle component remounting with `initialToken` properly
- **Testability**: Uses a **Service Locator** pattern (`window.MockAuthService`) to allow robust dependency injection in component tests.

### 5. Store (`ui/src/store/useStore.tsx`)
- **CRITICAL**: Contains `onTokenChange` listener that:
  - Handles Firebase token refresh for admin users
  - **Ignores** Firebase token updates for staff users (prevents overwriting service account tokens)
  - Required for Firebase Auth initialization for all users

## Critical Implementation Details

### Service Account Token Flow (Staff Users)

1. **First Login:**
   - Firebase auth → Get Firebase ID token
   - Call `/api/auth/service-account` with Bearer token
   - User sets a PIN
   - Service account key encrypted with PIN → stored in `localStorage` as `encrypted_key_{uid}`
   - Generate JWT signed with service account private key
   - Exchange JWT for Google access token at `https://oauth2.googleapis.com/token`

2. **Subsequent Logins:**
   - Firebase auth (may be persisted)
   - User enters PIN
   - Decrypt service account key from localStorage
   - Generate JWT and exchange for access token

### Logout Flow

1.  **User Trigger**: Click Logout.
2.  **`useStore.logout` Execution**:
    -   **Firebase Signout**: `await authService.signOut()` (CRITICAL: Ensures "new user" state on next login).
    -   **Google Sheets Logout**: Clears memory and session tokens.
    -   **State Clearing**: Clears `accessToken`, `spreadsheetId`, `userRole`, `retry_attempted`.
    -   **Cache Clearing**: Clears Cache Storage and unregisters Service Workers.
3.  **Redirect**: Reloads page to `/`.

### Token Refresh Handling

**CRITICAL:** Staff users must NOT have their access token overwritten by Firebase token refreshes.

**The Working Implementation** in `useStore.tsx`:
```typescript
useEffect(() => {
    const unsubscribe = authService.onTokenChange((token) => {
        if (token) {
            console.log('Firebase token refreshed:', token.substring(0, 10) + '...');
            // Only update tokens if we're NOT using a service account.
            // Service account tokens are managed by GoogleSheetsService itself.
            // Overwriting with a Firebase ID token would cause 401 on Sheets API calls.
            const userRole = localStorage.getItem('user_role');
            const isStaff = userRole === 'staff';

            if (!GoogleSheetsService.hasServiceAccount() && !isStaff) {
                console.log('Updating access token from Firebase (User is not staff)');
                setAccessToken(token);
                GoogleSheetsService.setAccessToken(token);
            } else {
                console.log('Ignoring Firebase token update (User is staff or has Service Account)');
            }
        } else {
            // User signed out or session expired completely
            console.log('No token received (signed out?)');
        }
    });

    return () => unsubscribe();
}, [authService]);
```

**Why This Is Critical**:
1. Firebase automatically refreshes ID tokens every hour
2. The `onTokenChange` listener is **required for Firebase Auth initialization** - removing it breaks login entirely
3. For **staff users**, we MUST NOT overwrite the Google Sheets service account token with the Firebase ID token
4. For **admin users** (Google OAuth), we DO update the token since they use Firebase tokens directly for Sheets API

### Premature Token Usage (Race Condition)

**Problem**: Immediately after Firebase login, the global `accessToken` updates. If `LoginScreen` attempts to use this *Firebase ID Token* to query Google Sheets API (before the Service Account is unlocked via PIN), it results in **401 Unauthorized** errors.

**Mechanism**:
1. User signs in -> `accessToken` updates.
2. `LoginScreen` effect triggers on `initialToken` change.
3. If not guarded, it tries `fetchSpreadsheets()` with the wrong token type.

**Fix**:
In `LoginScreen.tsx`, the `useEffect` for `initialToken` **MUST** check `isLoading` or `authStep`.
```typescript
if (authStep === 'pin_setup' || authStep === 'pin_check' || isLoading) {
    return; // Ignore token updates during setup/loading
}
```

### Service Account Key Restoration

When `initialToken` is passed to LoginScreen (user authenticated but no spreadsheet selected):
- **Admin users:** Go directly to spreadsheet selection
- **Staff users:** Must re-enter PIN to restore service account key (for token refresh capability)

**Critical Issue - Component Remounting**:
After PIN setup, `onLoginSuccess` triggers App to remount, causing LoginScreen to remount with `initialToken`. During this remount:
1. The service account key stored in `GoogleSheetsService.serviceAccountKey` (static class variable) is lost
2. Only the token persists (via sessionStorage and initialToken prop)
3. Without the key, `GoogleSheetsService` cannot refresh expired tokens

**Current Fix**:
```typescript
if (userRole === 'staff' && currentUser && !GoogleSheetsService.hasServiceAccount()) {
    if (localStorage.getItem(`encrypted_key_${uid}`)) {
        setAuthStep('pin_check'); // Force PIN re-entry to restore key
        return;
    }
}
```

**After PIN Check with initialToken**: Go directly to `spreadsheet_setup` instead of calling `onLoginSuccess` again (which would cause another remount and lose the key).

### 401 Error Handling

In `GoogleSheetsService.fetch()`:
- If 401 received AND `serviceAccountKey` is set → auto-refresh token and retry
- If 401 received AND `serviceAccountKey` is null → logout (can't refresh)
- **CRITICAL**: Added `response.ok` check to properly handle API failures and prevent silent errors

## Environment Variables

### UI (`.env` / `.env.e2e`)
- `VITE_FIREBASE_API_KEY` - Firebase project API key
- `VITE_FIREBASE_AUTH_DOMAIN` - Firebase auth domain
- `VITE_FIREBASE_PROJECT_ID` - Firebase project ID
- `VITE_GOOGLE_CLIENT_ID` - Google OAuth client ID (for admin login)
- `VITE_API_URL` - Backend API URL (for service account fetch)

### Server (`.env`)
- `FIREBASE_SERVICE_ACCOUNT_BASE64` - Base64-encoded Firebase Admin SDK service account
- `GOOGLE_SERVICE_ACCOUNT_BASE64` - Base64-encoded Google Service Account for Sheets API

## Common Issues & Solutions

### Issue: Staff user sees "No spreadsheets found"
**Cause:** Service account key not restored due to component remounting, or spreadsheet not shared with service account
**Solution**: 
1. Ensure user goes through PIN check to restore service account key after component remount
2. Verify spreadsheet is shared with the service account email
3. Check `GoogleSheetsService.hasServiceAccount()` returns true before listing spreadsheets

### Issue: 401 error on Google Drive API
**Cause:** Service account key is null, can't refresh token
**Solution:** Force staff users through PIN check when `hasServiceAccount()` returns false

### Issue: Redirect loop on token refresh
**Cause:** Firebase token update overwrites service account token for staff users
**Solution:** Ignore Firebase token updates when `user_role === 'staff'`

### Issue: Firebase login completely broken
**Cause:** `onTokenChange` listener was removed from `useStore.tsx`
**Solution:** Restore the `onTokenChange` listener - it's required for Firebase Auth initialization even for staff users

### Issue: API errors silently returning empty results
**Cause:** `GoogleSheetsService.fetch()` didn't check `response.ok`
**Solution:** Added `response.ok` check to throw proper errors for failed API requests

## sessionStorage vs localStorage

### Usage Guidelines

**localStorage** (persists across page reloads and browser restarts):
- `encrypted_key_{uid}` - PIN-encrypted service account (staff users)
- `user_role` - 'admin' or 'staff' (cleared on logout)
- `language` - User's language preference
- General preferences that should persist

**sessionStorage** (cleared when tab closes, survives component remounts):
- `google_access_token` - Current Google API access token
- `encrypted_service_account` - Base64-encoded service account key (staff users)
- `retry_attempted` - Error retry tracking
- Security-sensitive data that should auto-clear

### Critical: Avoid Hard Page Reloads

**❌ NEVER DO THIS:**
```typescript
// This wipes ALL sessionStorage!
window.location.href = '/';
window.location.reload();
location.replace('/');
```

**✅ DO THIS INSTEAD:**
```typescript
// Just clear React state - component will re-render
setAccessToken(null);
setSpreadsheetId(null);
// LoginScreen will automatically show when accessToken is null
```

**Why:** sessionStorage is designed to persist **within a browsing session** but is **cleared on page reloads**. For SPAs, use React state management instead of hard reloads.

## Error Handling

### 401 Unauthorized Errors

When API returns 401:
1. **DO NOT** call `sessionStorage.clear()` - selectively remove tokens only
2. **DO NOT** call `window.location.href = '/'` - clear React state instead
3. **DO** preserve `encrypted_service_account` for token refresh
4. **DO** preserve `encrypted_key_{uid}` for re-login without full authentication

### Self-Healing Mechanism
1. **Goal**: Recover from transient 401 errors without forcing the user to re-login.
2. **Strategy**:
   - When API returns 401, check if `serviceAccountKey` is missing in memory.
   - If missing, attempt to restore it from `sessionStorage` (`encrypted_service_account`).
   - If restoration succeeds, refresh token and retry the original request.
   - **CRITICAL**: Do NOT call `logout()` on 401 failure immediately. Let the UI (`LoginScreen`) decide if it can prompt for a PIN or restore sessions. Wiping session data prematurely prevents recovery.

### Token Refresh Strategy

1. **Staff Users**: Use service account key to generate new JWT and exchange for new access token
2. **Admin Users**: Firebase automatically refreshes tokens, `onTokenChange` listener handles it
3. If refresh fails, redirect to PIN check (not full login) for staff users

## Testing

### Component Tests
- `TokenRefresh.spec.tsx` - Tests token refresh behavior for admin vs staff
- `RedirectLoopReproduction.spec.tsx` - Ensures staff token updates are ignored
- `SessionStoragePersistence.spec.tsx` - Verifies encrypted key survives error handling
- `staging-flow.spec.ts` - Full login flow including PIN and spreadsheet selection
- `login-flow.spec.ts` - Login form and error handling
- `treatment-recording.spec.ts` - Treatment entry after successful login

### Integration Tests
- `test_login_flow.mjs` - Verifies complete backend auth flow works
- `test_session_persistence.mjs` - Verifies sessionStorage survives component lifecycle

### E2E Tests
- `staging-flow.spec.ts` - Full login flow including PIN and spreadsheet selection
- `login-flow.spec.ts` - Login form and error handling
- `treatment-recording.spec.ts` - Treatment entry after successful login

**Key Finding**: Backend and APIs work perfectly. Issues are in React component lifecycle, not authentication.
