# Requirement: DEF-009 Viewport and Keyboard Reset Test Plan

**Status**: Proposed  
**Related Defect**: [DEF-009_Tablet_Blank_Screen_Keyboard_Close.md](../defects/DEF-009_Tablet_Blank_Screen_Keyboard_Close.md)  
**Date**: 2026-05-23  

## 1. Objective
Ensure the viewport reset logic in `Layout.tsx` and the viewport meta tag in `index.html` are correctly implemented and robust across different browsers and interaction patterns. This fix addresses the "blank screen" issue on tablets when the virtual keyboard is dismissed.

## 2. Proposed Implementation (Existing)
The logic remains inside [Layout.tsx](../../ui/src/components/Layout.tsx) as a `useEffect` hook:
- Listens for `focusout` events.
- Resets `window.scrollTo(0, 0)` after a 100ms delay.
- Conditional check: Only reset if the focus has not moved to another input-like element (`input`, `select`, `textarea`).

## 3. Testing Strategy

### A. Unit Tests (`ui/src/components/__tests__/Layout.test.tsx`)
Verify the core logic of the `useEffect` hook using **Vitest** and **React Testing Library**:
- **Mount Verification**: Ensure the `focusout` event listener is attached on mount and removed on unmount.
- **Scroll Reset**: Mock `window.scrollTo` and verify it is called with `(0, 0)` after 100ms when an input is blurred.
- **Focus Transition**: Verify `window.scrollTo` is **not** called if another input gains focus within the 100ms delay.

### B. Component Tests (`ui/tests/components/Layout.spec.tsx`)
Enhance Playwright component tests to verify behavioral integration:
- **Test Case 1: Simple Blur**: Mount `Layout`, focus an input, blur it, and assert `window.scrollTo(0, 0)` is called (using `expect.poll`).
- **Test Case 2: Multi-input Navigation**: Focus an input, move focus to another input, and verify `window.scrollTo(0, 0)` is **not** called.
- **Environment Handling**: Mock `i18next` and `useStore` within the test file to ensure environment stability without modifying production code.

### C. E2E Tests (`ui/tests/e2e/viewport-keyboard.spec.ts`)
Provide a high-level verification of the production environment:
- **Meta Tag Verification**: Ensure `index.html` contains `<meta name="viewport" content="...interactive-widget=resizes-content">`.
- **Smoke Check**: Navigate to a live view (e.g., `/treatments`), focus an input, and verify the page structure remains intact after blur.

## 4. Success Criteria
- All tests (Unit, CT, E2E) pass in the local environment and CI pipeline.
- No modifications are made to production code outside of the existing [Layout.tsx](../../ui/src/components/Layout.tsx) and [index.html](../../ui/index.html).
- The "blank screen" issue is non-reproducible on tablets (verified via behavioral simulation in tests).
