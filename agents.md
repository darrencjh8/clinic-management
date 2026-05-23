# Agent Troubleshooting and Setup Guidelines

This document contains onboarding instructions and solutions to common environment setup errors for agents working on this codebase.

> [!IMPORTANT]
> **Requirement & Defect Discovery**: Before starting any new task, feature, or bug fix, agents **MUST** check the `doc/requirements/` and `doc/defects/` folders to understand the context, constraints, and previous implementation decisions.
>
> **TDD Workflow**: For any new implementation or bug fix:
> 1. **Baseline**: Run all existing tests to ensure a clean starting state.
> 2. **Red**: Write a failing test that reproduces the bug or defines the new feature.
> 3. **Green**: Implement the minimal code necessary to make the test pass.
> 4. **Refactor**: Clean up the code while ensuring tests remain green.

## 1. Local Environment Config Setup

> [!IMPORTANT]
> The frontend application utilizes **Google OAuth** (`@react-oauth/google`) and **Firebase**. If the necessary `.env` files are missing or incomplete, the React app's components will fail to initialize, resulting in a blank screen (`_.zd` Google OAuth error in the console).

### Environment Files Checklist
When initializing a new agent worktree or local environment, verify that the following files are populated in the respective directories:

#### Frontend config: `ui/.env`
Create a `.env` file in the `ui` directory containing the following environment variables (which are ignored by Git):

```env
# Google OAuth Client ID
VITE_GOOGLE_CLIENT_ID=<your_google_client_id>

# Firebase Configuration
VITE_FIREBASE_API_KEY=<your_api_key>
VITE_FIREBASE_AUTH_DOMAIN=<your_auth_domain>
VITE_FIREBASE_PROJECT_ID=<your_project_id>
VITE_FIREBASE_STORAGE_BUCKET=<your_storage_bucket>
VITE_FIREBASE_MESSAGING_SENDER_ID=<your_messaging_sender_id>
VITE_FIREBASE_APP_ID=<your_app_id>

# Backend Server URL
VITE_API_URL=http://localhost:3001
```

#### Backend config: `server/.env`
Verify that `server/.env` is correctly populated with API keys and service account credentials:
```env
PORT=3001
FIREBASE_SERVICE_ACCOUNT_BASE64=<base64_encoded_service_account_keys>
GOOGLE_SERVICE_ACCOUNT_BASE64=<base64_encoded_sheets_api_keys>
```

### E2E Testing Config: `ui/.env.e2e`
For running end-to-end tests locally against staging or production, create `ui/.env.e2e`:
```env
E2E_TEST_EMAIL=<your_test_email>
E2E_TEST_PASSWORD=<your_test_password>
BASE_URL=https://wisata-dental-staging.fly.dev
```

---

## 2. Testing Guidelines

### Running E2E Tests
* **Config Selection**: Always use the correct configuration file.
  * `playwright-e2e.config.ts`: For full flow tests against a live server.
  * `playwright-component.config.ts`: For individual React component tests.
* **Execution**: Use the following command format:
  ```bash
  npx playwright test --config playwright-e2e.config.ts
  ```

### Environment Constraints
* **Operating System**: Windows.
* **Terminal**: PowerShell 5.
* **Tooling**: Standard Unix commands like `grep` are not available by default. Use `Select-String` in PowerShell or use the internal search tools provided by the IDE/agent.

---

## 3. Common Errors and Resolutions

### Error: `_.zd` in browser console (Blank Screen on Load)
* **Cause**: `VITE_GOOGLE_CLIENT_ID` in `ui/.env` is empty, undefined, or invalid. This causes the `GoogleOAuthProvider` wrapper component in `ui/src/main.tsx` to crash during initialization.
* **Fix**: Set a valid Google Client ID inside `ui/.env`.

### Error: `@/index.css` or `@/i18n` cannot be resolved on `npm start`
* **Cause**: Running the development server in a fresh worktree/clone scans Playwright configs (`ui/playwright/index.tsx`) containing alias imports. If `vite.config.ts` does not have resolve alias mapping, Vite will throw a resolution error.
* **Fix**: Ensure that `resolve.alias` is configured inside `ui/vite.config.ts` (this is merged from `origin/main`).
