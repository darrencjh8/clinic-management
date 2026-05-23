# DEF-009: Tablet Blank Screen after Keyboard Close

**Status**: Fixed  
**Severity**: High  
**Date**: 2026-05-23  

## Summary
In tablet and mobile mode, when editing/adding treatments on the **Add Treatment** page, focusing on form input fields (e.g., patient name autocomplete, amount, admin fee, discount) opens the device's virtual/on-screen keyboard. Upon closing the keyboard, the screen goes completely blank or white/grey.

## Symptoms
1. The user navigates to the **Add Treatment** view in landscape or portrait mode on a tablet.
2. The user focuses on a text input field, triggering the virtual keyboard.
3. The browser scrolls the layout viewport upward to ensure the focused input is in view.
4. When the user closes the keyboard (or clicks away to blur the input), the keyboard is dismissed, but the page remains scrolled/shifted upward.
5. Because the parent container has `overflow-hidden` at the root and layout level (`h-screen` in `App.tsx` and `h-[100dvh]` in `Layout.tsx`), the scrollbars are hidden, and the user cannot scroll back down manually.
6. The entire app layout remains shifted off-screen, showing only blank/grey background.

## Root Cause Analysis
Mobile and tablet browsers (especially WebKit/iOS Safari, and some configurations of Blink/Android Chrome) handle virtual keyboard display by scrolling the layout viewport (`window.scrollY` / `document.documentElement.scrollTop`).
- When inputs are focused, the browser scrolls the page container vertically to ensure the input field is visible.
- When the input loses focus or the virtual keyboard is dismissed, the browser does not always restore the scroll position of the window to `0`.
- Because our app wraps the content in elements with `h-screen overflow-hidden` and `h-[100dvh] overflow-hidden` to provide a native-app-like sidebar and bottom-tab navigation, the window itself should never have a scroll offset (scrolling is managed by the inner `overflow-y-auto` container in `Layout.tsx`).
- When the window's scroll offset becomes non-zero, it shifts the entire fixed-size application container upward out of the browser's view, creating a persistent blank screen.

## Proposed Fix
To completely resolve this issue and prevent future occurrences, we propose a two-pronged solution:

1. **Global Scroll Reset on Focus Out (Input Blur)**:
   In [Layout.tsx](../../ui/src/components/Layout.tsx), a `useEffect` hook registers a bubbling `focusout` listener on `document`. The `handleFocusOut` handler clears any pending timeout, then schedules `setTimeout(..., 100)`. After the delay, it calls `window.scrollTo(0, 0)` only when `e.target` is an `HTMLInputElement`, `HTMLSelectElement`, or `HTMLTextAreaElement` and `document.activeElement` is not another such element—so focus moving between fields does not reset scroll. The effect cleanup removes the listener and calls `clearTimeout` on any pending timeout so scroll cannot run after unmount.
   ```typescript
   React.useEffect(() => {
       let timeoutId: ReturnType<typeof setTimeout> | null = null;

       const handleFocusOut = (e: FocusEvent) => {
           if (timeoutId) clearTimeout(timeoutId);

           // Delay the scroll to see if focus moved to another input
           timeoutId = setTimeout(() => {
               if (
                   (e.target instanceof HTMLInputElement ||
                   e.target instanceof HTMLSelectElement ||
                   e.target instanceof HTMLTextAreaElement) &&
                   !(document.activeElement instanceof HTMLInputElement ||
                     document.activeElement instanceof HTMLSelectElement ||
                     document.activeElement instanceof HTMLTextAreaElement)
               ) {
                   window.scrollTo(0, 0);
               }
           }, 100);
       };

       document.addEventListener('focusout', handleFocusOut);
       return () => {
           if (timeoutId) clearTimeout(timeoutId);
           document.removeEventListener('focusout', handleFocusOut);
       };
   }, []);
   ```
   This ensures that any time the virtual keyboard blurs an input and closes, the viewport scroll position is restored to `0`.

2. **Viewport Meta Tag Optimization**:
   Update `ui/index.html`'s viewport meta tag to specify the `interactive-widget=resizes-content` setting:
   ```html
   <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, interactive-widget=resizes-content" />
   ```
   This signals to modern mobile browsers (especially Chrome/Android) to resize the visual viewport instead of shifting the layout viewport when the keyboard opens/closes, preventing layout misalignment.

## Verification Plan
For detailed automated and manual test cases, refer to the [DEF-009 Viewport and Keyboard Reset Test Plan](../requirements/DEF-009_Viewport_Keyboard_Test_Plan.md).

### Automated Tests
- Run the comprehensive testing suite as defined in the test plan:
  ```bash
  # Run unit tests
  npx vitest run src/components/__tests__/Layout.test.tsx
  
  # Run component tests
  npx playwright test tests/components/Layout.spec.tsx --config playwright-component.config.ts
  
  # Run E2E tests
  npx playwright test tests/e2e/viewport-keyboard.spec.ts --config playwright-e2e.config.ts
  ```

### Manual Verification
- Follow the manual verification steps and scenarios outlined in the [companion test plan](../requirements/DEF-009_Viewport_Keyboard_Test_Plan.md) to ensure consistency across devices.
