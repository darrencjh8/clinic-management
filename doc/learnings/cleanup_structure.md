# Workspace Cleanup & Structure Guide

This document outlines the reorganized project structure established during the cleanup initiative.

## 1. Script Organization

All utility and testing scripts have been consolidated into `ui/scripts/` to declutter the workspace and separate concerns.

### New Configured Scripts (`ui/package.json`)
- **`npm run test:staging:local`**: Runs the staging E2E tests locally.
  - **Source**: `ui/scripts/test-staging.mjs`
  - **Purpose**: Mimics the CI/CD pipeline's E2E test step using local environment variables.
- **`npm run check:staging`**: Runs the staging secret and configuration validation suite.
  - **Source**: `ui/scripts/staging-checks/run-all-checks.mjs`
  - **Purpose**: Validates Firebase credentials, Backend API connectivity, and Google Cloud integration.

## 2. Documentation Location

To maintain a clean root directory, specific setup guides have been moved to `doc/guides/`.

- **`doc/guides/ui_setup.md`**: Contains detailed setup instructions for the UI, including Google OAuth configuration and local environment variables. (Previously `ui/SETUP.md`).

## 3. Temporary Files Policy

The following files and directories are considered temporary and should not be committed to Git:
- `ui/test-results/`: Playwright artifacts.
- `ui/playwright-report/`: HTML test reports.
- `ui/dist/`: Build output.
- `ui/e2e-*.png`: Failure screenshots.
- `*.log`: Log files.

## 4. Key Directories
- **`ui/tests/e2e/`**: Contains Playwright E2E test specifications (login, navigation, smoke, etc.).
- **`ui/scripts/staging-checks/`**: Contains the staging environment validation logic.
