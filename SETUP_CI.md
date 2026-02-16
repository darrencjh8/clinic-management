# setting Up CI/CD Secrets

This guide explains how to configure the GitHub Secrets required for the CI/CD pipeline.

## Prerequisites

- Access to the GitHub repository settings.
- A Fly.io Access Token.

## Steps

1.  **Generate Fly.io Token** (if you don't have one):
    - Run `fly auth token` in your terminal to get the token.

2.  **Run Helper Script** (Optional):
    - Run `.\setup_secrets.ps1` to see your local values. You will need to copy these values into GitHub.

3.  **Configure GitHub Environments**:
    - Go to your GitHub repository -> **Settings** -> **Environments**.
    - Create two environments:
        - `staging`
        - `production`

4.  **Add Secrets to Environments**:
    - For each environment, adding the *same* secret names but with values specific to that environment.
    - Click on the environment name (e.g., `staging`) -> **Environment secrets** -> **Add secret**.

### Secrets List

Add these secrets to **BOTH** `staging` and `production` environments (unless otherwise noted).

| Secret Name | Description |
| :--- | :--- |
| `FLY_API_TOKEN` | Token for deploying to Fly.io. |
| `VITE_API_URL` | API URL (Staging URL for staging, Prod URL for production). |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Client ID. |
| `VITE_CLIENT_SECRET` | Google OAuth Client Secret. |
| `VITE_CLINIC_NAME` | Name of the clinic. |
| `VITE_FIREBASE_API_KEY` | Firebase API Key. |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain. |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project ID. |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket. |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging Sender ID. |
| `VITE_FIREBASE_APP_ID` | Firebase App ID. |
| `GOOGLE_SERVICE_ACCOUNT_BASE64` | Service Account for Sheets (Base64 encoded). |
| `FIREBASE_SERVICE_ACCOUNT_BASE64` | Service Account for Firebase Admin (Base64 encoded). |

#### Staging Only Secrets
Add these **only** to the `staging` environment:

| Secret Name | Description |
| :--- | :--- |
| `E2E_TEST_EMAIL` | Email for E2E tests login. |
| `E2E_TEST_PASSWORD` | Password for E2E tests login. |

> [!TIP]
> Use the values from `.env.e2e` for the `staging` environment and `.env-prod` for the `production` environment.

> [!IMPORTANT]
> The `setup_secrets.ps1` script now just outputs values. You must manually creating the environments and pasting the values into GitHub.
