# DEF-006: Logout Redirect Flickers to Pin Creation

## Description
When logging out from the main app (Treatment Entry page), the screen flickers and potentially redirects to the "Pin Creation" (`pin_setup`) page instead of the standard "Login" (`login`) or "Pin Check" (`pin_check`) page.

## Repro Steps
1. Log in and enter the main application.
2. Click "Logout" from the sidebar/menu.
3. Observe the redirection behavior.

## RCA (Hypothesis)
- `useStore.logout()` clears the Google Access Token (App state).
- `App.tsx` sees no token and renders `LoginScreen`.
- `LoginScreen` checks `FirebaseAuthService.getCurrentUser()`.
- If Firebase Auth session is **still active** (because `useStore.logout` didn't sign out of Firebase?), `LoginScreen` thinks the user is authenticated.
- It then checks for a stored key (`localStorage`).
- If the key was cleared (or not found?), it assumes a "New Setup" is needed and goes to `pin_setup`.
- **Key Issue**: Logout from the main app should probably sign out of Firebase too, OR `LoginScreen` should handle "User Logged In but No Key" more gracefully (e.g., prompt to re-enter PIN if key exists, or warn). Wait, if `localStorage` key is missing, `pin_setup` IS the correct state for a logged-in user with no key.
- **Why is key missing?** Did logout wipe it?
- **Flickering**: Likely `LoginScreen` mounting -> `useEffect` async check -> state update.

## Proposed Fix
- Ensure App Logout signs out of Firebase completely if that's the desired behavior.
- Or ensure `LoginScreen` shows a "Loading" state while deciding where to go, preventing flicker.

## Resolution
The root cause was that `useStore.logout()` cleared the internal app session (Google Sheets token) but did not sign out the user from Firebase. This left the application in a state where `FirebaseAuthService.getCurrentUser()` returned a user, but no encrypted key was found in localStorage (since it's cleared on logout or not persisted). `LoginScreen` logic interprets "Logged in user + No Key" as "New User Setup", thus redirecting to `pin_setup`.

The fix was to ensure `await authService.signOut()` is called within `useStore.logout()`, ensuring a complete session teardown and redirecting correctly to the initial Login state.

