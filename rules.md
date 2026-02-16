# Agent Rules

These rules must be followed by all agents working on this project.

## 1. Information Retrieval Protocol
- **Rules Check:** ALWAYS check `rules.md` for all commands and ensure compliance.
- **Documentation Check:** continually check `.md` files under the `doc/` folder for learnings from other agents.
    - Specifically, read `doc/tests/component_testing.md` and `doc/tests/component_test_patterns.md` BEFORE implementing or running component tests.
- **Knowledge Transfer:** If you discover new learnings suitable for future agents, document them in a `.md` file under `doc/learnings/`.
- **Learnings**: Before fixing a defect or implementing a feature, check `doc/learnings` for relevant insights.

## 2. Development Workflow
- **Granular Commits:** Commit and push changes to GitHub granularly by feature or fix. Do NOT implement multiple features in a single commit.
- **Periodic Commits:** Commit to the working feature branch periodically when a specific fix or feature is verified to be working. Do not wait until the very end to commit everything.
- **Branching Strategy:** 
    - Do NOT commit untested code to `main`.
    - Create a new feature branch for every task.
    - Develop and commit on the feature branch until you have a fully working, tested component. E2E tests are handled by the CI/CD workflow.
    - **Merge Condition:** Create a PR to `main`. The PR must pass all CI checks (component tests, unit tests, and e2e tests) before merging.

## 3. Mandatory Verification Protocol (UI)
**CRITICAL:** Before starting work, run tests to ensure a clean state. Before completing any UI task, you MUST run unit tests locally to ensure no regressions.

1.  **Establish Baseline:**
    - Run unit tests locally to understand the current state of the project.
    - If there are failures, determine whether they are test issues or actual application bugs *before* proceeding with any changes.

2.  **Run Unit Tests (Local):**
    ```bash
    npm run test:unit
    ```
    *(Run this from the `ui` directory)*
    *(Unit tests should be run locally during development and also run automatically in CI)*

3.  **Component Tests (CI):**
    - Component tests (`npm run test:ct`) are automatically run in the CI/CD pipeline
    - No need to run component tests locally unless specifically debugging

4.  **Verify Results:** All unit tests must pass locally before committing.
5.  **Fix Failures:** If any unit tests fail, you must fix them before proceeding. Do not ignore test failures.

## 4. Documentation Standards
- **Defects:** New defects must be documented under `doc/defects`.
- **Requirements:** New docs or requirements should be documented under `doc/`.
- **Testing Best Practices:** New testing best practices should be documented under `doc/tests/`.
- **RCA:** Before fixing a defect, create a defect file in `doc/defects`. After fixing, update the RCA in the same file and any other relevant docs in `doc/`.

## 5. Build Verification
**CRITICAL:** Before ending any task, you MUST ensure the build passes successfully.

1. **Run Build:**
    ```bash
    npm run build
    ```
    *(Run this from the `ui` directory)*

2. **Verify Results:** The build must complete successfully.
3. **Fix Failures:** If the build fails, fix it immediately before ending the task.
4. **Final Check:** This is the final verification step before task completion.

## 6. Cleanup Protocol
- **Remove Redundant Files:** Before finishing a task or committing, you MUST remove any temporary files, log files, screenshots, or debug output created during the debugging process. Keep the workspace clean.

## 7. Component Testing Protocol
**CRITICAL:** Before implementing or fixing component tests, you MUST follow this protocol:

1. **Read Documentation First:**
   - ALWAYS read `doc/tests/component_testing.md` for setup, configuration, and best practices
   - ALWAYS read `doc/tests/component_test_patterns.md` for comprehensive patterns, learnings, and troubleshooting
   - These documents contain critical information about mocking patterns, i18n considerations, and common pitfalls

2. **When Stuck:**
   - Check `doc/defects/` folder for Root Cause Analysis (RCA) documents
   - Review similar test files in `ui/tests/components/` for patterns
   - Consult the "Window-based Service Mocking" section in component_test_patterns.md

3. **Testing Strategy:**
   - Component tests should test isolated component behavior WITHOUT full integration
   - Use `TestWrapper` for all components under test
   - Use `MockStoreProvider` instead of real `StoreProvider`
   - Complex multi-step workflows belong in e2e tests, not component tests

## 8. Implementation References
- **Requirements:** After implementing a feature from `doc/requirements`, create a summary markdown file in the same folder (e.g., `doc/requirements/1002_summary.md`).
- **Tests:**
    - **Component Tests (UI):** Written in `ui/tests/components/`. Cover core functionality, interactions, edge cases, and all new props/state.
    - **E2E Tests (UI):** Written in `ui/tests/e2e/`. Cover full user workflows and integration scenarios.
    - **Unit Tests:** Written in `ui/src/**/*.test.ts` or `ui/src/**/*.spec.ts`. For complex business logic in services, utilities, and helper functions.

## 9. Terminal Command Timeout Protocol
**CRITICAL:** All terminal commands must be executed with timeout mechanisms to prevent agents from getting stuck waiting for commands that may never complete.

1. **Timeout Implementation:**
   - Always use the `WaitDurationSeconds` parameter when checking command status with `command_status`
   - Set reasonable timeouts based on expected command duration (typically 30-60 seconds for most operations)
   - For long-running processes, use `Background: true` and poll status periodically

2. **Status Polling:**
   - Use `command_status` to check if background commands have completed
   - Implement polling loops with appropriate intervals (every 5-10 seconds)
   - Handle timeout scenarios gracefully and provide user feedback

3. **Process Management:**
   - Prefer background execution for commands that may take extended time
   - Monitor process status and be prepared to terminate stuck processes
   - Always verify command completion before proceeding with dependent tasks

## 10. Pre-Commit E2E Validation
**OPTIONAL:** When you're not confident about changes and want to validate against the staging environment before committing, use the local E2E staging script.

1. **Run Local E2E Against Staging:**
    ```powershell
    .\run-e2e-staging.ps1
    ```
    *(Run this from the project root directory)*

2. **What It Does:**
    - Starts local UI development server with staging backend configuration
    - Runs E2E tests against local UI (`http://localhost:5173`) while calling staging API (`https://wisata-dental-staging.fly.dev`)
    - Automatically cleans up dev server and restores environment after tests
    - Faster than full Docker deployment for validation

3. **Usage Scenarios:**
    - Before committing complex UI changes
    - When you want to verify integration with staging backend
    - As a confidence check before pushing to feature branch
    - When CI/CD e2e tests are failing and you need local validation

4. **Options:**
    ```powershell
    # Run without cleanup to preserve dev server for debugging
    .\run-e2e-staging.ps1 -SkipCleanup
    ```

## 11. Deployment
The deployment script (`deploy.ps1`) automatically handling testing, building, tagging, pushing, deploying, and cleaning up local Docker images.
    - **Note:** The deployment will automatically abort if regression tests fail.

---
**Note:** The `doc` folder is the central repository for all project documentation including defects, requirements, tests, and future agent learnings.
