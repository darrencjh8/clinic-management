# Project Setup and Agent Guidelines

> [!IMPORTANT]
> **CRITICAL:** The source of truth for all agent rules is `rules.md` in the root directory. You **MUST** read `rules.md` immediately after reading this file to understand the mandatory protocols for this project.

This document provides an overview of the project structure and guidelines for agents and developers working on the Clinic Management App.

## 1. Project Structure

- **root/**: Contains `rules.md`, `SETUP.md`, `package.json` for the main app.
- **doc/**: The central repository for all project documentation.
    - **defects/**: Stores defect reports and RCA (Root Cause Analysis).
    - **requirements/**: Stores project requirements and feature summaries.
    - **tests/**: Stores testing guidelines (`component_testing.md`, etc.).
    - **learnings/**: Stores knowledge and learnings for future agents (e.g., `e2e_testing_guide.md`).
    - **architecture/**: System architecture documentation.
- **ui/**: The frontend React application.
    - **src/**: Source code.
    - **tests/components/**: Component tests (Playwright CT).
- **server/**: Backend server code (if applicable).
- **.agent/**: Agent-specific workflows and configurations.

## 2. Agent Workflow

1.  **Start:** thoroughly read `rules.md` in the root directory.
2.  **Learn:** Check `doc/learnings` and `doc/tests` for relevant context.
3.  **Explore:** Use `list_dir` and `view_file` to understand the codebase structure.
4.  **Task:** Follow the task assignments and rules strictly.

## 3. Development Rules

- **Testing:** Always run `npm run test:ct -- --reporter=list` in the `ui` directory before and after changes.
- **Commits:** Make granular commits. Periodically commit working changes to the feature branch.
- **Merging:** Merge to `main` ONLY when all component tests pass.
- **Documentation:** Update relevant docs in `doc/` after every significant change or fix.
- **Defects:** Document all defects in `doc/defects/` before fixing them.
- **Cleanup:** Remove any temporary files (logs, screenshots) created during the task.

## 4. Setup for Agents

When initializing a new agent session:
1.  **Read `rules.md`**: This is the source of truth.
2.  **Check `task.md`**: If continuing work, check the task list.
3.  **Review `implementation_plan.md`**: For active plans.

## 5. Key Commands

- **Run UI Tests:** `cd ui && npm run test:ct -- --reporter=list`
- **Build UI:** `cd ui && npm run build`
- **Deploy:** `.\deploy.ps1` (Handles testing, building, and deployment)

## 6. Additional Guides
- **UI Setup & OAuth:** See [`doc/guides/ui_setup.md`](doc/guides/ui_setup.md)
- **Staging Checks:** `cd ui && npm run check:staging`
- **Local Staging Test:** `cd ui && npm run test:staging:local`

---
**Note:** Keep this file updated as the project evolves.
