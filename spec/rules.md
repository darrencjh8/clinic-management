# Agent Rules

These rules must be followed by all agents working on this project.

## 1. Mandatory Verification Protocol (UI)

**CRITICAL:** Before starting your work, run the tests first to ensure you started with a clean state. Before completing any task that involves UI changes, you MUST run the full component test suite to ensure no regressions were introduced.

1.  **Run the suite:**
    ```bash
    npm run test:ct
    ```
    *(Run this from the `ui` directory)*

2.  **Verify Results:** All tests must pass.
3.  **Fix Failures:** If any tests fail, you must fix them before proceeding. Do not ignore test failures.

## 2. Context
For detailed instructions on writing and debugging tests, refer to:
- `spec/tests/component_testing.md` - Component testing guidelines
- `spec/tests/integration_testing.md` - Integration testing guidelines

## 3. Build
    ```bash
    npm run build
    ```
    *(Run this from the `ui` directory)*
1.  **Verify Results:** The build must complete successfully.
2.  **Fix Failures:** If the build fails, you must fix it before proceeding. Do not ignore build failures.


## 4. Documentation
After implementing a feature based on a requirement file in the `spec/requirements` folder (e.g., `spec/requirements/1002_requirement.txt`), you must create a summary markdown file in the same folder with a corresponding name (e.g., `spec/requirements/1002_summary.md`).
This summary should describe the implemented feature and any relevant details.

## 5. Test Requirements

**CRITICAL:** You MUST write tests for any features you implement.

### Component Tests (UI)
For any UI feature implementation, you must write component tests covering:
-   Core functionality and user interactions
-   Edge cases and error states
-   All new props and state behaviors

Test files go in `ui/tests/components/`. See `spec/tests/component_testing.md` for writing guidelines.

### Unit Tests (Business Logic)
For complex business logic (calculations, data transformations, validation), add simple unit tests to verify correctness.

## 6. Deployment

The deployment script (`deploy.ps1`) automatically handles:
1. **Regression Testing:** Runs component tests to ensure all tests pass before proceeding
2. Building the Docker image
3. Tagging and pushing to the registry
4. Deploying to Fly.io
5. **Cleanup:** After successful deployment, the script automatically removes local Docker images and tags to keep the local environment clean:
   - Removes `chongjinheng/wisata-dental:latest`
   - Removes `wisata-dental:latest`

This cleanup prevents accumulation of unused Docker images on your local machine.

**Note:** The deployment will automatically abort if regression tests fail, preventing deployment of broken code.
