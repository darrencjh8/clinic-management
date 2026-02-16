# DEF-002: LoginScreen Race Condition & Stale Error State

## Description
User reported "Failed to load spreadsheets: Unauthorized" error visible on the "Set PIN" (`pin_setup`) screen.
This indicates that `fetchSpreadsheets` (which only runs in `spreadsheet_setup`) was triggered, failed, and set the error state *after* the user had already navigated to `pin_setup`.

Additionally, the initial fix for this race condition introduced a secondary issue where valid transitions from "PIN Setup" to "Spreadsheet Selection" were blocked by over-aggressive guards.

## Root Cause Analysis (RCA)

### 1. Stale State Updates (Original Issue)
- **Mechanism**: `fetchSpreadsheets` is an asynchronous function triggered by `useEffect`.
- **Trigger**: When the component mounts or `authStep` changes to `spreadsheet_setup`.
- **Failure**: If the user navigates away (e.g., to `pin_setup` or `login`) *while* the fetch is pending, the `await listSpreadsheets()` promise eventually resolves or rejects.
- **Impact**: The subsequent code execution (setting state, handling errors) runs blindly, updating the UI state (e.g., `setError`) even though the component is now logically in a different "Page" or "Step".

### 2. Blocking Valid Transitions (Secondary Issue)
- **Mechanism**: A guard was added to `useEffect` listening to `initialToken`. `if (authStep === 'pin_setup') return;`.
- **Trigger**: User completes PIN setup. `handlePinSetup` calls `onLoginSuccess`.
- **Failure**: `onLoginSuccess` updates the `initialToken` prop. The component re-renders. The `useEffect` sees the new token but *also* sees the old state `pin_setup` (state update hasn't processed or was blocked). The guard activates, preventing the transition to `spreadsheet_setup`.
- **Impact**: User gets stuck on the PIN setup screen despite successful setup.

## Solution
1.  **Ref-based Guards**: Use `useRef` to track the *current* `authStep` inside async functions.
2.  **Explicit State Transitions**: In `handlePinSetup`, manually call `setAuthStep('spreadsheet_setup')` *before* triggering the parent `onLoginSuccess` callback. This safeguards the transition against the `initialToken` guard.
3.  **Error Clearing**: `useEffect` now clears `error` state whenever `authStep` changes.

---

# DEF-003: Logout Persistence Failure

## Description
Clicking "Sign Out" or "Keluar" returned the user to the Login screen, but reloading the page immediately logged them back in as the previous user.

## Root Cause Analysis
- **Mechanism**: `LoginScreen` manages its own UI state (`authStep`) and calls `FirebaseAuthService.signOut()`.
- **Failure**: `LoginScreen` *did not* call `GoogleSheetsService.logout()`.
- **Impact**: The `GoogleSheetsService` maintained the `google_access_token` and `encrypted_service_account` in the browser's `sessionStorage`.
- **Result**: On page reload, `App.tsx` initializes `GoogleSheetsService`, finds the tokens in `sessionStorage`, and automatically restores the session, bypassing the login screen.

## Solution
- **Action**: Modified `handleSignOut` in `LoginScreen.tsx` to explicitly call `GoogleSheetsService.logout()`.
- **Verification**: Verified via `tests/components/LoginScreenLogout.spec.tsx`.
