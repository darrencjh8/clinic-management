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
    - Develop and commit on the feature branch until you have a fully working, tested component and e2e feature.
    - **Merge Condition:** Merge to `main` **ONLY** after the full component test suite (`npm run test:ct`) has passed successfully.

## 3. Mandatory Verification Protocol (UI)
**CRITICAL:** Before starting work, run tests to ensure a clean state. Before completing any UI task, you MUST run the full component test suite (`npm run test:ct`) to ensure no regressions.

1.  **Establish Baseline:**
    - Run the full suite to understand the current state of the project.
    - If there are failures, determined whether they are test issues or actual application bugs *before* proceeding with any changes.

2.  **Run the suite:**
    ```bash
    npm run test:ct -- --reporter=list
    ```
    *(Run this from the `ui` directory)*
    *(Note: The `--reporter=list` flag is mandatory for the agentic framework to correctly parse test output)*

3.  **Verify Results:** All tests must pass.
4.  **Fix Failures:** If any tests fail, you must fix them before proceeding. Do not ignore test failures.

## 4. Documentation Standards
- **Defects:** New defects must be documented under `doc/defects`.
- **Requirements:** New docs or requirements should be documented under `doc/`.
- **Testing Best Practices:** New testing best practices should be documented under `doc/tests/`.
- **RCA:** Before fixing a defect, create a defect file in `doc/defects`. After fixing, update the RCA in the same file and any other relevant docs in `doc/`.

## 5. Build Verification
    ```bash
    npm run build
    ```
    *(Run this from the `ui` directory)*
1.  **Verify Results:** The build must complete successfully.
2.  **Fix Failures:** If the build fails, fix it immediately.

## 6. Cleanup Protocol
- **Remove Redundant Files:** Before finishing a task or committing, you MUST remove any temporary files, log files, screenshots, or debug output created during the debugging process. Keep the workspace clean.

## 7. Implementation References
- **Requirements:** After implementing a feature from `doc/requirements`, create a summary markdown file in the same folder (e.g., `doc/requirements/1002_summary.md`).
- **Tests:**
    - **Component Tests (UI):** Written in `ui/tests/components/`. Cover core functionality, interactions, edge cases, and all new props/state.
    - **Unit Tests:** For complex business logic.

## 8. Terminal Command Timeout Protocol
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

## 9. Deployment
The deployment script (`deploy.ps1`) automatically handling testing, building, tagging, pushing, deploying, and cleaning up local Docker images.
    - **Note:** The deployment will automatically abort if regression tests fail.

---
**Note:** The `doc` folder is the central repository for all project documentation including defects, requirements, tests, and future agent learnings.
