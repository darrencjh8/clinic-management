# setting Up CI/CD Secrets

This guide explains how to configure the GitHub Secrets required for the CI/CD pipeline.

## Prerequisites

- Access to the GitHub repository settings.
- A Fly.io Access Token.

## Steps

1.  **Generate Fly.io Token** (if you don't have one):
    - Run `fly auth token` in your terminal to get the token.

2.  **Run Helper Script**:
    - Run the temporary script to get your local secret values:
    ```powershell
    .\setup_secrets.ps1
    ```

3.  **Add Secrets to GitHub**:
    - Go to your GitHub repository.
    - Click **Settings** > **Secrets and variables** > **Actions**.
    - Click **New repository secret**.
    - Add each secret output by the script.

### Required Secrets List

You will need to add two sets of secrets: one for **Production** (no prefix) and one for **Staging** (prefixed with `STAGING_`).

#### Common Secrets
| Secret Name | Description |
| :--- | :--- |
| `FLY_API_TOKEN` | Token for deploying to Fly.io. |

#### Production Secrets (No Prefix)
Use values from your `.env-prod` file.
| Secret Name | Description |
| :--- | :--- |
| `VITE_API_URL` | Production API URL. |
| `VITE_FIREBASE_...` | All Firebase config variables. |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Client ID. |
| `GOOGLE_SERVICE_ACCOUNT_BASE64` | Service Account for Production Sheets. |
| `FIREBASE_SERVICE_ACCOUNT_BASE64` | Service Account for Production Firebase. |

#### Staging Secrets (Prefix: `STAGING_`)
Use values from your `.env.e2e` file.
| Secret Name | Description |
| :--- | :--- |
| `STAGING_VITE_API_URL` | Staging API URL. |
| `STAGING_VITE_FIREBASE_...` | All Firebase config variables for Staging. |
| `STAGING_VITE_GOOGLE_CLIENT_ID` | Staging Google OAuth Client ID. |
| `STAGING_GOOGLE_SERVICE_ACCOUNT_BASE64` | Service Account for Staging Sheets. |
| `STAGING_E2E_TEST_EMAIL` | Email for E2E tests. |
| `STAGING_E2E_TEST_PASSWORD` | Password for E2E tests. |

> [!TIP]
> Run `.\setup_secrets.ps1` to automatically generate the full list of secrets with correct prefixes.

> [!IMPORTANT]
> Once you have verified the pipeline works, **DELETE** `setup_secrets.ps1` to avoid leaving secrets in plain text on your disk.
