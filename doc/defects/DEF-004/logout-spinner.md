# DEF-004: Logout Spinner Stuck

## Description
When the user logs out, the application spinner continues spinning indefinitely instead of returning to a clean login state.

## Repro Steps
1. Log in to the application.
2. Click "Sign Out" or "Logout".
3. Observe that the loading spinner remains visible.

## RCA (Hypothesis)
- The global `isLoading` state in `useStore` or `App.tsx` might not be reset upon logout.
- Or `LoginScreen` initializes in a `loading` state (`authStep='loading'`) and fails to transition to `login`.
- Or the `signOut` promise hangs.

## Proposed Fix
- Ensure `isLoading` is set to false in the logout handler.
- Or the `signOut` promise hangs.

## Resolution
The issue was confirmed to be `isLoading` remaining `true` after `handleSignOut` execution. The fix involved adding a `finally` block to the `handleSignOut` function in `LoginScreen.tsx` to explicitly set `setIsLoading(false)`, ensuring the UI is always reset to an interactive state.

