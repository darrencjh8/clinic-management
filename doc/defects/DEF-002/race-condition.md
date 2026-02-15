# DEF-002: LoginScreen Race Condition & Stale Error State

## Description
User reports "Failed to load spreadsheets: Unauthorized" error visible on the "Set PIN" (`pin_setup`) screen.
This indicates that `fetchSpreadsheets` (which only runs in `spreadsheet_setup`) was triggered, failed, and set the error state *after* the user had already navigated to `pin_setup`.

## Root Cause
- `fetchSpreadsheets` is async.
- If triggered (e.g., by `initialToken`), and the user navigates away (e.g., Sign Out -> Login) before it fails, the `catch` block executes and sets `error` regardless of the current `authStep`.
- This causes error messages from previous attempts to appear on unrelated screens.

## Solution
1. **Guard State Updates**: In `fetchSpreadsheets`, check if `authStep === 'spreadsheet_setup'` before setting state (sheets or error).
2. **Clear Errors on Step Change**: Ensure `setError(null)` is called whenever `setAuthStep` changes (or in an effect tracking `authStep`).
3. **Invalid Token Handling**: If `fetchSpreadsheets` fails with 401 and we have no key, we should probably clear the stale `initialToken` and redirect to login/PIN check rather than just showing a static error.

## Verification
- Component Test: Simulate slow fetch, change step, ensure error doesn't appear.
