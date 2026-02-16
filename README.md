# Clinic Management App

A web application for managing dental clinic operations, including patient records, treatment history, and financial reporting. Built with React, TypeScript, Vite, and Express.

> [!NOTE]
> This project is developed on Windows. All commands and instructions are optimized for Windows PowerShell. Refer to `rules.md` for complete development protocols.

## Pre-requisites (Google Apps Script Setup)

Before you can fully utilize the application's backend functionalities, you need to set up the Google Apps Script as detailed in the [`gAppScripts/Readme.md`](gAppScripts/Readme.md) file. This involves configuring the script to interact with your Google Sheets for data storage and processing.

### Setup Service Account

To enable persistent login and Google Sheets access, you need to create a Google Service Account.

1.  **Create Service Account:**
    *   Go to the [Google Cloud Console](https://console.cloud.google.com/).
    *   Navigate to **IAM & Admin** > **Service Accounts**.
    *   Click **Create Service Account**.
    *   Name it (e.g., `clinic-app`) and click **Create and Continue**.

2.  **Generate Key:**
    *   Click on the newly created service account.
    *   Go to the **Keys** tab.
    *   Click **Add Key** > **Create new key**.
    *   Select **JSON** and click **Create**.
    *   **IMPORTANT:** Keep this file safe. You will need the Base64 encoded version of this file for deployment.

3.  **Share Sheet (Crucial):**
    *   Copy the **email address** of the service account.
    *   Open your Google Sheet.
    *   Click **Share** and paste the email address.
    *   **Permission:** Grant **Editor** access.

## Fly.io Deployment Prerequisites

Before deploying, you must configure your Fly.io application and secrets.

1.  **Install Fly CLI:**
    *   Follow instructions at [https://fly.io/docs/hands-on/install-flyctl/](https://fly.io/docs/hands-on/install-flyctl/)

2.  **Login:**
    ```bash
    fly auth login
    ```

3.  **Create App:**
    ```bash
    fly launch --no-deploy
    ```
    *   Follow the prompts. This will generate/update `fly.toml`.

4.  **Set Secrets (CRITICAL):**
    You must set the following environment variables in Fly.io for the app to work.
    
    *   **Prepare your keys:** Convert your JSON key files to Base64 strings.
        *   Windows (PowerShell): `[Convert]::ToBase64String([IO.File]::ReadAllBytes("path\to\key-file.json"))`

    *   **Set the secrets:**
        ```bash
        fly secrets set FIREBASE_SERVICE_ACCOUNT_BASE64="<your_firebase_base64_string>"
        fly secrets set GOOGLE_SERVICE_ACCOUNT_BASE64="<your_google_base64_string>"
        fly secrets set VITE_CLINIC_NAME="Wisata Dental"
        ```

## Deployment

We use a single-container deployment strategy where the Node.js server serves the built React frontend.

### Automated Deployment (Recommended)

Use the provided PowerShell script to build, tag, push, and deploy.

1.  Open PowerShell in the `ui` directory.
2.  Run the script:
    ```powershell
    .\deploy.ps1
    ```

This script will:
1.  Build the Docker image (`wisata-dental:latest`) from the project root.
2.  Tag it for Docker Hub (`chongjinheng/wisata-dental:latest`).
3.  Push the image to Docker Hub.
4.  Deploy to Fly.io using the pushed image.

### Manual Deployment

If you prefer running commands manually from the project root:

```bash
# 1. Build
docker build -t wisata-dental:latest .

# 2. Tag
docker tag wisata-dental:latest chongjinheng/wisata-dental:latest

# 3. Push
docker push chongjinheng/wisata-dental:latest

# 4. Deploy
fly deploy --image chongjinheng/wisata-dental:latest --ha=false
```

## Local Development

To run the application locally:

1.  **Backend:**
    ```powershell
    cd server
    npm install
    npm start
    ```

2.  **Frontend:**
    ```powershell
    cd ui
    npm install
    npm run dev
    ```
    Access at `http://localhost:5173`.

## Pull Request Process

After completing your implementation and ensuring all tests pass:

1. **Stage and Commit Changes:**
   ```powershell
   git add .
   git commit -m "feat: descriptive commit message"
   git push origin feature-branch-name
   ```

2. **Create Pull Request:**
   Use GitHub CLI to create a pull request:
   ```powershell
   gh pr create --title "Descriptive PR title" --body "Description of changes made"
   ```

3. **Requirements:**
   - All component tests must pass (`npm run test:ct`)
   - Build must succeed (`npm run build`)
   - Documentation updated if applicable
   - Refer to `rules.md` for complete workflow

## 🧪 Testing Strategy

This project uses a **staging-focused testing approach** that prioritizes environment-specific validation over traditional unit/component testing.

### Staging Secret Checks (Primary Testing)

**Staging Secret Checks** are comprehensive validation tests that verify critical security configurations, authentication flows, API endpoints, and database interactions in the staging environment before production deployment.

#### Purpose
- Validate staging environment credentials and configurations
- Test complete authentication flows (Firebase → Backend → Google Services)
- Verify API endpoint functionality and security
- Ensure database connectivity and data integrity
- Confirm CSP (Content Security Policy) configurations
- Validate environment-specific settings

#### Test Coverage

**Authentication Flow Tests:**
- Firebase authentication with staging credentials
- Backend service account retrieval
- Google OAuth token generation
- Complete login flow validation

**API Endpoint Tests:**
- Staging backend API connectivity
- Authentication endpoint validation
- Service account endpoint security
- Error handling and response validation

**Database Interaction Tests:**
- Google Sheets API connectivity
- Data read/write operations
- Permission validation
- Service account access verification

**Security Configuration Tests:**
- CSP (Content Security Policy) validation
- Environment variable verification
- Service account credential validation
- Third-party service integration testing

#### Running Staging Secret Checks

```bash
cd ui
npm install
npm run dev &  # Start local development server
node tests/staging-secret-checks/run-all-checks.mjs
```

### E2E Tests (Integration Testing)

End-to-end tests validate complete user workflows and are executed after staging secret checks pass.

#### Test Coverage
- Complete user authentication flows
- Patient management workflows
- Treatment record operations
- Financial reporting functionality
- Cross-browser compatibility

#### Running E2E Tests Locally

```bash
cd ui
npm run test:e2e
```

### CI/CD Pipeline Flow

1. **Build Application** - Verify code compiles successfully
2. **Staging Secret Checks** - Validate staging environment security and functionality
3. **E2E Tests** - Test complete user workflows against staging
4. **Deploy to Staging** - Deploy validated code to staging environment
5. **Deploy to Production** - Deploy to production (main branch only)

### Success Criteria for Production Deployment

For a successful production deployment, all staging secret checks must pass:

✅ **Environment Credentials Validation**
- All required environment variables are configured
- Firebase API keys are valid
- Service account credentials are properly set up

✅ **Firebase Authentication Tests**
- User can authenticate with staging credentials
- Authentication tokens are generated successfully
- Token refresh mechanisms work correctly

✅ **Backend API Tests**
- Staging backend is accessible and responsive
- API endpoints return expected responses
- Authentication flows work end-to-end

✅ **Google Cloud Services Tests**
- Google Sheets API is accessible
- Service account has appropriate permissions
- Data operations complete successfully

### Local Development Testing

For local development, you can run specific staging secret checks:

```bash
# Run individual test modules
cd ui
node tests/staging-secret-checks/01-credentials-validation.mjs
node tests/staging-secret-checks/02-firebase-auth.mjs
node tests/staging-secret-checks/03-backend-api.mjs
node tests/staging-secret-checks/04-google-cloud-services.mjs
```

### Testing Philosophy

This testing strategy prioritizes:
- **Environment-specific validation** over generic unit tests
- **Security-first approach** with comprehensive credential validation
- **Integration testing** that mirrors production scenarios
- **Staging-focused validation** before production deployment
- **Comprehensive coverage** of authentication, API, and service integration
