# 0902 Requirement

**Goal:** Improve Input Readability and Commission Calculation Logic.

## 1. Input Formatting
*   **Feature**: All number input fields should display a dot (`.`) as a thousand separator (e.g., `1.000` for 1000) to ease readability.
*   **Constraint**: This formatting is **display-only**. The backend/database should receive the raw number (e.g., `1000`) without separators.

## 2. Commission Calculation (Reporting Page)
*   **Standard Rate**: 40% for all treatments by default.
*   **Exception (Orthodontic)**:
    *   **New Orthodontic Treatment** receives **50%** commission.
    *   **Definition**: An orthodontic treatment is considered "New" when the transaction **includes braces** (i.e., `Braces Price > 0`).
*   **Calculation Basis**: The dentist's commission should be calculated on the amount **excluding** the Admin Fee.
