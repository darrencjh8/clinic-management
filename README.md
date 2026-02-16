# Clinic Management App

A web application for managing dental clinic operations, including patient records, treatment history, and financial reporting. Built with React, TypeScript, Vite, and Express.

## 🆕 Content Security Policy (CSP) System

This application now includes an **environment-specific CSP configuration system** that automatically injects appropriate security policies based on the deployment environment (development, staging, production).

### Key Features

- **Environment-Specific CSP**: Separate configurations for development, staging, and production
- **Build-Time Injection**: CSP meta tags are injected during the build process
- **Security Validation**: Production deployments are validated to prevent security risks
- **Automated Integration**: CSP system integrates with CI/CD pipeline

### Quick Start with CSP

```bash
# Development (includes localhost)
export DEPLOYMENT_ENV=development
npm run dev

# Staging (includes staging backend)
export DEPLOYMENT_ENV=staging
npm run build

# Production (strictest security)
export DEPLOYMENT_ENV=production
npm run build
```

📚 **Full CSP Documentation**: [CSP Configuration System](doc/architecture/csp-configuration-system.md)

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
        *   Linux/Mac: `base64 -w 0 key-file.json`
        *   Windows (PowerShell): `[Convert]::ToBase64String([IO.File]::ReadAllBytes("path\to\key-file.json"))`

    *   **Set the secrets:**
        ```bash
        fly secrets set FIREBASE_SERVICE_ACCOUNT_BASE64="<your_firebase_base64_string>"
        fly secrets set GOOGLE_SERVICE_ACCOUNT_BASE64="<your_google_base64_string>"
        fly secrets set VITE_CLINIC_NAME="Wisata Dental"
        ```

## 🚀 Deployment

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

## 🔧 Local Development

To run the application locally:

1.  **Backend:**
    ```bash
    cd server
    npm install
    npm start
    ```

2.  **Frontend:**
    ```bash
    cd ui
    npm install
    npm run dev
    ```
    Access at `http://localhost:5173`.

## 🧪 Testing Strategy

This project uses a **staging-focused testing approach** that prioritizes environment-specific validation over traditional unit/component testing.

### Staging Secret Checks (Primary Testing)

**Staging Secret Checks** are comprehensive validation tests that verify critical security configurations, authentication flows, API endpoints, and database interactions in the staging environment before production deployment.

```bash
cd ui
# Run all staging secret checks
node tests/staging-secret-checks/run-all-checks.mjs

# Run individual checks
node tests/staging-secret-checks/01-credentials-validation.mjs
node tests/staging-secret-checks/02-firebase-auth.mjs
node tests/staging-secret-checks/03-backend-api.mjs
node tests/staging-secret-checks/04-google-cloud-services.mjs
```

#### What Staging Secret Checks Validate:
- **Environment Credentials**: All staging environment variables are properly configured
- **Firebase Authentication**: Complete authentication flow with staging credentials
- **Backend API Security**: API endpoints, service account retrieval, and security validation
- **Google Cloud Integration**: Service account access, OAuth tokens, and API permissions
- **CSP Configuration**: Content Security Policy validation for staging environment
- **UI Authentication Flow**: Complete login flow validation

### E2E Tests (Final Validation)

End-to-end tests run against the deployed staging environment after all staging secret checks pass.

```bash
cd ui
# Run E2E tests against staging
npx playwright test tests/e2e/staging-flow.spec.ts
```

### Unit Tests (Optional Development)

Unit tests are available for development but are not required for deployment.

```bash
cd ui
# Run unit tests (optional)
npm run test:unit
```

### Component Tests (Optional Development)

Component tests are available for development but are not required for deployment.

```bash
cd ui
# Run component tests (optional)
npm run test:ct
```

### Testing Pipeline Flow

1. **Build** → Application builds successfully
2. **Staging Secret Checks** → Comprehensive staging environment validation
3. **E2E Tests** → Final validation against deployed staging
4. **Production Deployment** → Only after all checks pass

### Success Criteria for Production Deployment

All staging secret checks must pass, confirming:
✅ Staging credentials are valid and functional  
✅ Authentication flows work end-to-end  
✅ API endpoints respond correctly  
✅ Database connections are established  
✅ Security configurations are properly applied  
✅ Environment-specific settings are correct  

### Local Testing Against Staging

Run local UI with staging backend for development testing:

```bash
# PowerShell script for local E2E testing
.\run-e2e-staging.ps1
```

This script:
- Starts local UI development server
- Configures staging backend API
- Runs E2E tests against local UI + staging backend
- Automatically cleans up after testing

## 📚 Documentation

### Architecture
- [CSP Configuration System](doc/architecture/csp-configuration-system.md) - Environment-specific CSP implementation

### Deployment
- [Deployment Guide with CSP](doc/deployment/deployment-guide-csp.md) - Updated deployment procedures

### API
- [API Documentation with CSP](doc/api/api-documentation-csp.md) - API endpoints and CSP integration

### Testing
- [Component Testing Guide](doc/tests/component_testing.md)
- [Component Test Patterns](doc/tests/component_test_patterns.md)

## 🔒 Security Features

### Content Security Policy (CSP)
- **Environment-specific configurations** prevent security risks
- **Build-time validation** ensures production safety
- **Automated injection** eliminates manual configuration errors

### Authentication
- **Firebase Authentication** integration
- **Google OAuth** support
- **Service Account** integration for Google Sheets

### Data Protection
- **HTTPS enforcement** in production
- **Input validation** on all forms
- **Secure session management**

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js, Express
- **Authentication**: Firebase Auth, Google OAuth
- **Database**: Google Sheets (via Google Apps Script)
- **Deployment**: Docker, Fly.io
- **Testing**: Jest, Playwright
- **Security**: Environment-specific CSP system

## 📋 Environment Configuration

### Development Environment
- **CSP**: Permissive for development flexibility
- **API**: Local development server
- **Authentication**: Firebase development project

### Staging Environment
- **CSP**: Restrictive but includes staging domains
- **API**: Staging backend (wisata-dental-staging.fly.dev)
- **Authentication**: Firebase staging project

### Production Environment
- **CSP**: Strictest security policy
- **API**: Production backend
- **Authentication**: Firebase production project

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm run test:unit`
5. Build and test locally with appropriate CSP configuration
6. Submit a pull request

## 🐛 Troubleshooting

### Common Issues

**CSP Violation Errors**
- Check browser console for specific violations
- Review CSP configuration for missing domains
- Verify environment configuration

**Build Failures**
- Ensure CSP configuration files exist
- Check environment variable settings
- Validate JSON configuration syntax

**Authentication Issues**
- Verify Firebase configuration
- Check service account permissions
- Review CSP for authentication domains

### Debug Commands

```bash
# Test CSP configuration
node -e "const { generateCSPReport } = require('./ui/scripts/csp-manager.ts'); console.log(generateCSPReport('staging'));"

# Validate build
npm run build
# Check generated CSP report: csp-report.md
```

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review the documentation
3. Check existing issues
4. Create a new issue with detailed information

## 📄 License

This project is licensed under the MIT License.