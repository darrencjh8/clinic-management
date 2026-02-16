# DEF-007: HMR Service Account Key Loss (401 on Fresh Login)

**Status**: Fixed  
**Severity**: Critical  
**Date**: 2026-02-16  
**Fixed in**: GoogleSheetsService.ts

## Summary
During development, logging in on a fresh instance (new port like localhost:5174) resulted in immediate 401 errors after PIN setup, followed by forced logout. The error message was "No recovery key found, forcing logout."

## Symptoms
1. User completes Firebase login successfully
2. User sets up PIN successfully
3. Service account token is generated successfully
4. Immediately after, spreadsheet list API call returns 401
5. Recovery mechanism fails because `serviceAccountKey` is null
6. User is forced to logout

## Root Cause
Vite's Hot Module Replacement (HMR) reloads the `GoogleSheetsService` module during development, **clearing all static properties** including `serviceAccountKey`. The sequence:

1. `handlePinSetup()` calls `sheetsService.loginWithServiceAccount(credentials)`
2. `serviceAccountKey` static property is set
3. **HMR triggers module reload** (milliseconds later)
4. `GoogleSheetsService` module reinitializes with `serviceAccountKey = null`
5. `fetchSpreadsheets()` calls API with valid token
6. API returns 401 (token validation issue or timing)
7. Retry mechanism checks `this.serviceAccountKey` → **null**
8. Cannot refresh token, throws "Unauthorized"
9. LoginScreen catches error, checks localStorage for recovery key
10. Fresh instance has no localStorage key → forces logout

## Evidence
Console logs showed:
```
[GoogleSheetsService.fetch] Called { hasServiceAccountKey: false, hasToken: true }
API returned 401 Unauthorized { serviceAccountKey: false }
401 but no service account key available -> Throw Unauthorized
[LoginScreen] Failed to list sheets Error: Unauthorized
[LoginScreen] No recovery key found, forcing logout.
```

## Fix
Persist service account key in `sessionStorage` and restore on module initialization:

**GoogleSheetsService.ts:**
```typescript
export class GoogleSheetsService {
    private static accessToken: string | null = null;
    private static serviceAccountKey: any | null = null;
    private static tokenExpiration: number | null = null;

    // Initialize from sessionStorage on module load to survive HMR
    private static initialized = (() => {
        const rawKey = sessionStorage.getItem('service_account_key_raw');
        if (rawKey) {
            try {
                GoogleSheetsService.serviceAccountKey = JSON.parse(rawKey);
                console.log('[GoogleSheetsService] Restored service account key from sessionStorage (HMR recovery)');
            } catch (e) {
                console.error('[GoogleSheetsService] Failed to restore service account key:', e);
            }
        }
        
        const expiration = sessionStorage.getItem('token_expiration');
        if (expiration) {
            GoogleSheetsService.tokenExpiration = parseInt(expiration, 10);
        }
        
        return true;
    })();

    static async loginWithServiceAccount(credentials: any) {
        this.serviceAccountKey = credentials;
        // Persist to sessionStorage to survive HMR reloads
        sessionStorage.setItem('service_account_key_raw', JSON.stringify(credentials));
        await this.refreshServiceAccountToken();
    }

    static restoreServiceAccountKey(key: any) {
        this.serviceAccountKey = key;
        // Also persist for HMR survival
        sessionStorage.setItem('service_account_key_raw', JSON.stringify(key));
    }

    static logout() {
        // ... clear all sessionStorage keys including service_account_key_raw
        sessionStorage.removeItem('service_account_key_raw');
        sessionStorage.removeItem('token_expiration');
    }
}
```

## Benefits
1. **HMR resilience**: Service account key survives module reloads during development
2. **Production benefit**: Key persists across page refreshes in sessionStorage
3. **401 retry works**: Recovery mechanism can refresh tokens after HMR
4. **No breaking changes**: Existing flows continue to work

## Verification
### Manual Testing
1. Start fresh instance: `npm run start` (new port)
2. Complete login flow with Firebase
3. Set up PIN
4. Should successfully fetch spreadsheets (no 401)
5. Should NOT force logout

### E2E Test
Updated `ui/tests/e2e/auth-flow.spec.ts` to verify:
- Service account key persists in sessionStorage after PIN setup
- Session recovery works after page reload
- Both `service_account_key_raw` and `google_access_token` present

## Related
- **DEF-001**: 401 Self-healing (fixed by not clearing key on 401)
- **DEF-005**: Sheet fetch after PIN setup (already fixed)
- **Component Testing**: HMR issues are unique to development, not testable in CT

## Prevention
Future static service state in services should:
1. Persist to sessionStorage
2. Restore on module initialization
3. Clear on explicit logout
4. Never rely solely on in-memory static properties for critical data
