# CI/CD Pipeline Behavior & Fail-Safes

This document outlines the behavior of the CI/CD pipeline (`.github/workflows/ci-cd.yml`), specifically regarding failure handling, automatic rollbacks, and environment persistence.

## 1. Automatic Rollback on Staging
The pipeline is configured to **automatically roll back** the staging environment (`wisata-dental-staging`) to the previous successful deployment in two scenarios:

### A. Server Readiness Failure
After deployment, the pipeline waits for the server to become ready (responding to HTTP requests).
- **Check:** Polls `https://wisata-dental-staging.fly.dev` for up to 20 attempts (approx. 100 seconds).
- **Action on Failure:** If the server is not ready within the limit, it executes:
  ```bash
  flyctl deploy rollback --app wisata-dental-staging
  ```
- **Result:** The staging environment reverts to the previously deployed version.

### B. E2E Test Failure
After the server is ready, the pipeline runs the full E2E test suite (`tests/e2e/staging-flow.spec.ts`).
- **Check:** Executes `npx playwright test tests/e2e/staging-flow.spec.ts`.
- **Action on Failure:** If the tests fail, it executes:
  ```bash
  flyctl deploy rollback --app wisata-dental-staging
  ```
- **Result:** The staging environment reverts to the previously deployed version to ensure a stable state for further testing or manual usage.

## 2. Staging Environment Persistence
**CRITICAL:** The staging environment is **NEVER destroyed** by the CI/CD pipeline, regardless of deployment or test failures.

- **No Teardown:** There are no `destroy` or `delete` commands in the workflow.
- **State Preservation:** On failure, the environment is strictly rolled back. It is not de-provisioned.
- **Database:** The database and other persistent storage are not reset or destroyed by the CI/CD process (though the application state might be modified by the tests themselves, the infrastructure remains).

## 3. Production Deployment
Production deployment (`deploy-production` job) only proceeds if **ALL** prior steps (Unit Tests, Component Tests, Staging Deployment, and E2E Tests) have passed successfully.
