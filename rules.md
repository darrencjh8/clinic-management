# Agent Rules

**CRITICAL:** Follow these rules strictly.

## 1. Information Retrieval
- **Check First:** `rules.md` (Source of Truth), `doc/learnings/`, `doc/tests/`.
- **Document:** Add new findings to `doc/learnings/`.

## 2. Development Workflow
- **Branching:** Feature branches only. Merge to `main` **ONLY** after green `npm run test:ct`.
- **Rebase:** ALWAYS rebase from `origin/main` before creating a PR.
- **Commits:** Granular, periodic commits to feature branch.

## 3. Mandatory Verification (UI)
**Before & After Work:**
1.  **Run:** `npm run test:ct -- --reporter=list` (in `ui/`).
2.  **Verify:** All tests must pass. Fix failures immediately.

## 4. Documentation
- **New Items:** Document in `doc/defects`, `doc/requirements`, `doc/tests`.
- **RCA:** Mandatory for all defects.

## 5. Build Verification
**Final Step:**
1.  **Run:** `npm run build` (in `ui/`).
2.  **Verify:** Build success required before task completion.

## 6. Cleanup
- **Remove:** Logs, screenshots, temp files, debug output. Keep workspace clean.

## 7. Component Testing Protocol
**Read First:** `doc/tests/component_testing.md`, `doc/tests/component_test_patterns.md`.

- **Strategy:** Isolated tests, `TestWrapper`, `MockStoreProvider`.
- **Credentials:** Validate with `npm run check:staging` (runs `ui/scripts/staging-checks/run-all-checks.mjs`).

## 8. Implementation References
- **Tests:** `ui/tests/components/` (Components), `ui/tests/e2e/` (Workflows).

## 9. Terminal Protocol
- **Timeouts:** Use `WaitDurationSeconds` (30-60s).
- **Background:** Use `Background: true` for long processes. Poll status.

## 10. Deployment
- **Method:** Automated via GitHub Actions.
- **Trigger:** Push to `main` (requires passing tests).
- **Rollback:** Automated on staging failure.
