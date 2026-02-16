# Google OAuth Domain Whitelist Configuration

## Static Staging Domain

For E2E testing to work reliably in staging, we use a static staging domain:

**Staging Domain:** `https://wisata-dental-staging.fly.dev`

## Google Cloud Console Configuration

To allow the staging environment to make Google API calls, you must whitelist this domain in your Google Cloud Console:

### OAuth 2.0 Client ID Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Find your OAuth 2.0 Client ID (currently: `567490186448-hrq4kq1f0ecjgsgfd5dtqmaalj3k0kug.apps.googleusercontent.com`)
4. Click on it to edit
5. In **Authorized JavaScript origins**, add:
   - `https://wisata-dental-staging.fly.dev`
6. In **Authorized redirect URIs**, add:
   - `https://wisata-dental-staging.fly.dev`

### Google Sheets API

Ensure the following APIs are enabled for your project:
- Google Sheets API
- Google Drive API

The staging environment uses a service account for backend operations, but the frontend OAuth flow needs the domain whitelist for the Google OAuth consent screen.

## Deployment Process

The deployment script (`deploy.ps1`) now:
1. Uses a static staging app name: `wisata-dental-staging`
2. Deploys to `https://wisata-dental-staging.fly.dev` consistently
3. Runs E2E tests against this predictable domain
4. Cleans up the staging app after tests complete

This ensures that:
- The domain is predictable and can be whitelisted
- E2E tests work consistently across deployments
- Google API calls succeed in staging environment

## Testing

After updating the Google OAuth configuration, test the staging deployment:

```powershell
.\deploy.ps1
```

The E2E tests should now pass the spreadsheet fetching step that was failing due to domain restrictions.
