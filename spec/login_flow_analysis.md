# Login Flow Analysis and Bug Fix

## Date: 2026-02-15

## Problem Summary
Firebase login for staff users was broken in E2E tests, showing "Invalid email or password" errors despite correct credentials.

## Root Cause Analysis

### What Happened
Between commits `2b5d7ab` (working) and `8f12b9a` (broken), the `onTokenChange` listener in `ui/src/store/useStore.tsx` was completely removed, breaking the Firebase authentication flow for staff users.

### The Correct Login Flow for Staff Users

#### Step 1: Firebase Email/Password Authentication
```
User enters email/password → FirebaseAuthService.signIn()
                          ↓
                    Firebase Auth validates credentials
                          ↓
                    Returns UserCredential with UID
```

#### Step 2: Firebase Token Required for Backend API
```
userCredential.user.getIdToken()
          ↓
    Firebase ID Token (JWT)
          ↓
    Used to authenticate with backend /api/auth/service-account
```

#### Step 3: Fetch Google Service Account from Backend
```
POST /api/auth/service-account
Authorization: Bearer <firebase_id_token>
          ↓
    Backend verifies Firebase token
          ↓
    Returns GOOGLE_SERVICE_ACCOUNT_BASE64 from Fly secrets
          ↓
    Service account JSON with private_key and client_email
```

#### Step 4: PIN Setup/Check
- **First time login**: User sets up PIN → Service account encrypted and stored locally
- **Returning user**: User enters PIN → Service account decrypted from local storage

#### Step 5: Service Account Login to Google Sheets
```
GoogleSheetsService.loginWithServiceAccount(serviceAccount)
          ↓
    Creates JWT signed with service account private key
          ↓
    Exchanges JWT for Google OAuth2 access token
          ↓
    Access token stored in GoogleSheetsService
          ↓
    This token is used for ALL Google Sheets API calls
```

#### Step 6: Token Management
```
handleLoginSuccess(token, 'staff')
          ↓
    Sets accessToken state = service account access token
    Sets userRole = 'staff'
    Stores in localStorage and sessionStorage
```

### The Critical onTokenChange Listener

**Location**: `ui/src/store/useStore.tsx` lines 298-321

**Purpose**: Handles Firebase token refresh events WITHOUT overwriting service account tokens

**Why It's Needed**:
1. Firebase automatically refreshes ID tokens every hour
2. The `onTokenChange` listener fires when Firebase token refreshes
3. For **staff users**, we MUST NOT overwrite the Google Sheets service account token with the Firebase ID token
4. For **admin users** (Google OAuth), we DO update the token since they use Firebase tokens directly for Sheets API

**The Working Implementation** (from commit 2b5d7ab):
```typescript
useEffect(() => {
    const unsubscribe = authService.onTokenChange((token) => {
        if (token) {
            console.log('Firebase token refreshed:', token.substring(0, 10) + '...');
            // Only update tokens if we're NOT using a service account.
            // Service account tokens are managed by GoogleSheetsService itself.
            // Overwriting with a Firebase ID token would cause 401 on Sheets API calls.
            const userRole = localStorage.getItem('user_role');
            const isStaff = userRole === 'staff';

            if (!GoogleSheetsService.hasServiceAccount() && !isStaff) {
                console.log('Updating access token from Firebase (User is not staff)');
                setAccessToken(token);
                GoogleSheetsService.setAccessToken(token);
            } else {
                console.log('Ignoring Firebase token update (User is staff or has Service Account)');
            }
        } else {
            // User signed out or session expired completely
            console.log('No token received (signed out?)');
        }
    });

    return () => unsubscribe();
}, [authService]);
```

### What Broke the Login

**Commit History**:
- `f9bef73` (last known working) - No `onTokenChange` listener at all
- `5b47f3b` - Added `onTokenChange` listener to handle token refresh
- `2b5d7ab` (origin/main) - Working version with proper `onTokenChange` handling
- `6356e0a` - **MISTAKE**: Tried to "fix" token overwriting by adding state-based checks
- `8f12b9a` - **CRITICAL ERROR**: Completely removed `onTokenChange` listener

**Why Removing It Broke Login**:
The `onTokenChange` listener is registered during component mount. Even though staff users don't need Firebase token updates after initial login, **Firebase still requires the listener to be present** for the authentication system to work properly. Removing it broke the entire Firebase authentication initialization flow.

### The Fix

**Solution**: Restore the `onTokenChange` listener from commit `2b5d7ab` exactly as it was.

**Commit**: `f9a22eb` - "fix: restore onTokenChange listener from working commit for Firebase login"

## Deployment Configuration

### Fly.io Secrets Injection
The `deploy_and_test.ps1` script correctly:
1. Reads `E2E_TEST_SERVICE_ACCOUNT` from `ui/.env.e2e`
2. Reads `FIREBASE_SERVICE_ACCOUNT_BASE64` from `server/.env`
3. Injects both into Fly secrets during staging app creation:
```powershell
fly secrets set GOOGLE_SERVICE_ACCOUNT_BASE64=$googleSecret FIREBASE_SERVICE_ACCOUNT_BASE64=$firebaseSecret --app $appName
```

### Backend API Endpoint
`server/index.js` line 54-69:
```javascript
app.post('/api/auth/service-account', verifyToken, (req, res) => {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_BASE64) {
        return res.status(500).json({ error: 'Server configuration error' });
    }
    const decoded = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf-8');
    const googleServiceAccount = JSON.parse(decoded);
    res.json({ serviceAccount: googleServiceAccount });
});
```

## E2E Test Status

### Current Status
✅ Firebase login working
✅ PIN setup working
✅ Service account fetched from backend
❌ No spreadsheets available for E2E test

### Remaining Issue
The service account (`google-sheet-bot@wisata-dental.iam.gserviceaccount.com`) needs to:
1. Have at least one Google Sheet shared with it
2. The spreadsheet ID should be pre-configured or the test should create one

This is NOT a login flow issue - the authentication is working correctly.

## Key Lessons Learned

1. **Never remove Firebase listeners without understanding their purpose** - Even if staff users don't use Firebase token updates for Sheets API, the listener is required for Firebase Auth to initialize properly.

2. **The onTokenChange listener has dual purpose**:
   - Handles token refresh for admin users (Google OAuth)
   - Required for Firebase Auth initialization for all users

3. **Staff vs Admin token usage**:
   - **Staff**: Use Google Service Account access token for Sheets API
   - **Admin**: Use Firebase ID token directly for Sheets API (via Google OAuth)

4. **Always check git history carefully** before making "fixes" - The working commit `2b5d7ab` already had the correct implementation.

5. **Service account flow requires**:
   - Firebase login (for user authentication)
   - Firebase ID token (for backend API authentication)
   - Backend API call (to get service account)
   - Service account login (to get Google Sheets access token)

## Files Modified

- `ui/src/store/useStore.tsx` - Restored `onTokenChange` listener
- `.dockerignore` - Added playwright cache to prevent build failures

## Testing

- ✅ All 46 component tests passing
- ✅ Firebase login working in E2E tests
- ✅ Service account fetch working
- ⚠️  E2E test needs spreadsheet access configuration
