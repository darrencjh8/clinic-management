# Dental Clinic App - Quick Setup

## What Was Fixed
- Created `.env` file from `.env.example` (was missing, causing the OAuth error)
- The app now runs successfully on `http://localhost:5173/`

## Required: Google OAuth Setup

To fully use the app, you need to set up Google OAuth credentials:

1. **Create OAuth Client ID:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Create or select a project
   - Click "Create Credentials" → "OAuth 2.0 Client ID"
   - Application type: "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:5173`
     - `http://localhost:5173/` 
   - Copy the Client ID

2. **Update `.env` file:**
   ```
   VITE_GOOGLE_CLIENT_ID=your_actual_client_id_here
   ```

3. **Restart the dev server:**
   ```bash
   npm run dev
   ```

## Current Status
✅ App builds successfully
✅ Dev server runs without errors
⚠️ Needs Google OAuth Client ID to enable login

## Environment Files

### Local Development
- **`.env`** - Used for local development with localhost settings
- Copy from `.env.example` and update with your local credentials
- Contains `VITE_API_URL=http://localhost:3001` for local backend

### Production Deployment
- **`.env-prod`** - Used for production deployments
- Required for all deployment scripts (deploy.ps1, deploy_and_test.ps1)
- Must contain production settings (no localhost URLs)
- Deployment scripts will fail if this file is missing or incomplete

### E2E Testing
- **`.env.e2e`** - Used for end-to-end testing
- Contains test credentials for automated testing
- Required for deploy_and_test.ps1 script

### Required Production Variables (.env-prod)
```
VITE_API_URL=https://your-production-url.com
VITE_FIREBASE_API_KEY=your_production_firebase_key
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_GOOGLE_CLIENT_ID=your_production_oauth_client_id
VITE_CLINIC_NAME=Your Clinic Name
```

## Development Commands
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

## Notes
- The old utility-splitter components have been removed
- All UI is now for dental clinic patient management
- LoginScreen component is working correctly
- Just needs OAuth credentials to be fully functional
