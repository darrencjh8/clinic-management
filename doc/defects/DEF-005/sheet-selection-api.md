# DEF-005: Sheet Selection API Not Triggered After PIN Save

## Description
After the user enters and saves a PIN during setup (`pin_setup` -> `spreadsheet_setup`), the list of Google Sheets is not automatically fetched. The user sees an empty list or loading state until they manually click "Refresh".

## Repro Steps
1. Start with a fresh session (or cleared storage).
2. Log in with Firebase -> prompted to Set PIN.
3. Enter PIN and Submit.
4. App transitions to "Select Spreadsheet".
5. Observe that the sheet list is not loading automatically.

## RCA (Hypothesis)
- `handlePinSetup` transitions `authStep` to `spreadsheet_setup`.
- The `useEffect` that triggers `fetchSpreadsheets` depends on `[authStep, isKeyRestored]`.
- There might be a race condition where `isKeyRestored` is not yet true when `authStep` changes, or the effect doesn't fire because dependencies haven't "changed" in the way React expects if batched.
- Or `handlePinSetup` logic explicitly sets the step but misses a trigger.

## Proposed Fix
- Verify useEffect dependencies.
- Ensure `isKeyRestored` is set true *before* or *simultaneously* with the step change.
- Or explicitly call `fetchSpreadsheets` in the success handler (though declarative `useEffect` is preferred).

## Resolution
The issue was a race condition where the `useEffect` hook listening to `authStep` and `isKeyRestored` was not triggering reliably after the state update to `spreadsheet_setup`. The fix involved:
1.  Explicitly calling `fetchSpreadsheets()` in `handlePinSetup` and `handlePinCheck` immediately after updating the step.
2.  Manually updating `authStepRef.current` to bypass the guard in `fetchSpreadsheets` which checks for the active step (since state updates are async).

