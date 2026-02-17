# Project Setup and Agent Guidelines

> [!IMPORTANT]
> **CRITICAL:** The source of truth for all agent rules is `rules.md`. You **MUST** read it immediately.

## 1. Project Structure

- **root/**: `rules.md`, `SETUP.md`, `package.json`.
- **doc/**: Central documentation.
    - **defects/**: Defect reports & RCA.
    - **learnings/**: Knowledge base (e.g., `ui_configuration.md`, `e2e_testing_guide.md`).
    - **tests/**: Testing guidelines.
- **ui/**: Frontend React app.
    - **src/**: Source code.
    - **tests/e2e/**: Playwright E2E tests.
    - **scripts/**: Utility strings (e.g., `test-staging.mjs`, `staging-checks`).

## 2. Agent Workflow

1.  **Start:** Read `rules.md`.
2.  **Learn:** Check `doc/learnings` and `doc/tests`.
3.  **Explore:** Understand codebase structure.
4.  **Task:** Follow assignments and rules.

## 3. Scripts & Tools

- **Run UI Tests:** `cd ui && npm run test:ct -- --reporter=list`
- **Run E2E Staging (Local):** `cd ui && npm run test:staging:local`
- **Run Staging Checks:** `cd ui && npm run check:staging`
- **Build UI:** `cd ui && npm run build`
- **Deploy:** `.\deploy.ps1`

## 4. Development Rules

- **Testing:** Run component tests before/after changes.
- **Commits:** Granular commits; merge to `main` ONLY on green tests.
- **Documentation:** Update `doc/` after changes.
- **Cleanup:** Remove temporary files (`ui/test-results`, `ui/playwright-report`, `*.log`, `*.png`) before finishing.

## 5. Setup for Agents

1.  **Read `rules.md`**.
2.  **Check `task.md`**.
3.  **Review `implementation_plan.md`**.

For detailed UI setup and OAuth, see [`doc/learnings/ui_configuration.md`](doc/learnings/ui_configuration.md).
