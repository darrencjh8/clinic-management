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
