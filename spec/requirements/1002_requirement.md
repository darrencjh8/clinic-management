# 1002 Requirement

**Goal:** Enhance Treatment Entry Features and Data Handling.

## 1. Edit Functionality
*   Add the ability to **edit** existing treatment data in the Treatment Entry page.

## 2. Date Selection
*   Add a **date picker** to the Treatment Entry page.
*   **Default**: The date should default to **Today**.

## 3. Treatment Type Selection
*   Change the "Treatment Type" input mechanism to using **Checkboxes**. (Implies capability to select multiple types or easier toggling).

## 4. Backward Compatibility
*   **Critical**: Ensure any changes to the database (Google Sheet) schema or data format are **backward compatible**. Existing data must remain valid and accessible.

## 5. Admin Fee Behavior
*   **Default Value**: `10,000` (10.000).
*   **Submission**: If the user ignores the field and submits, automatically send `10000` to the backend.
*   **Interaction**: When the user clicks or focuses on the field, it should **clear the value** (behaving like a placeholder or auto-clear) to allow easy input of a different amount.
