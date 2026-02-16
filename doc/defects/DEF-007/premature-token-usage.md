# DEF-007: Premature Token Usage causing 401s

## Description
During the login flow, immediately after Firebase Authentication, the application triggers 401 (Unauthorized) errors from the Google Sheets API before the user has even entered their PIN.

## Symptoms
-   Network tab shows failed calls to `googleapis.com` with 401 status.
-   Occurs immediately after `accounts:signInWithPassword` (Firebase) succeeds.
-   User is still on the "Enter PIN" screen.

## Root Cause Analysis (RCA)
-   **Context**: The application uses a hybrid auth system. Firebase Auth provides an ID Token, but the Google Sheets API requires a separate Service Account Access Token (for staff).
-   **Mechanism**:
    1.  User signs in to Firebase.
    2.  `useStore` detects the token change and updates `accessToken`.
    3.  `App.tsx` passes this `accessToken` to `LoginScreen` as `initialToken`.
    4.  `LoginScreen` has a `useEffect` listening to `initialToken`.
    5.  **The Bug**: This `useEffect` was triggering immediately upon receiving the Firebase ID token. It assumed any `initialToken` meant "Restore Session" and attempted to restore keys or fetch sheets.
    6.  Since the Service Account was not yet unlocked (requires PIN), the App tried to use the *Firebase ID Token* (or a stale token) against the *Google Sheets API*, which rejected it.
-   **Why it happened**: The `useEffect` lacked a guard to check if the application was currently in a "loading" or "setup" state (`pin_setup`, `pin_check`) where using the token is premature.

## Resolution
Added a guard condition to the `initialToken` effect in `LoginScreen.tsx`:

```typescript
// LoginScreen.tsx
if (initialToken) {
    // Block if we are in PIN flows or Loading
    if (authStep === 'pin_setup' || authStep === 'pin_check' || isLoading) {
        console.log('[LoginScreen] Ignoring initialToken update during PIN flow or loading state');
        return;
    }
    // ... rest of logic
}
```

This ensures the application only attempts to use the token for Sheets API calls when it is in a stable, ready state.
