# Clinic Management App

A web application for managing dental clinic operations, including patient records, treatment history, and financial reporting. Built with React, TypeScript, Vite, and Express.

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
