import { googleLogout } from '@react-oauth/google';
import * as jose from 'jose';

export interface GoogleUser {
    access_token: string;
    expires_in: number; // seconds
    token_type: string;
    scope: string;
    authuser: string;
    prompt: string;
}

export class GoogleSheetsService {
    private static accessToken: string | null = null;
    private static serviceAccountKey: any | null = null;
    private static tokenExpiration: number | null = null;

    // Initialize from sessionStorage on module load to survive HMR
    private static initializeFromStorage(): void {
        // Restore service account key from sessionStorage if present
        const rawKey = sessionStorage.getItem('service_account_key_raw');
        if (rawKey) {
            try {
                GoogleSheetsService.serviceAccountKey = JSON.parse(rawKey);
                console.log('[GoogleSheetsService] Restored service account key from sessionStorage (HMR recovery)');
            } catch (e) {
                console.error('[GoogleSheetsService] Failed to restore service account key:', e);
            }
        }
        
        // Restore token expiration
        const expiration = sessionStorage.getItem('token_expiration');
        if (expiration) {
            GoogleSheetsService.tokenExpiration = parseInt(expiration, 10);
        }
    }

    // Call initialization immediately on module load
    static { GoogleSheetsService.initializeFromStorage(); }

    static setAccessToken(token: string) {
        console.log('[GoogleSheetsService] setAccessToken called', { tokenLength: token?.length, hasServiceAccount: !!this.serviceAccountKey });
        this.accessToken = token;
        // Also save to sessionStorage for persistence across reloads
        sessionStorage.setItem('google_access_token', token);
    }

    static getAccessToken(): string | null {
        if (!this.accessToken) {
            this.accessToken = sessionStorage.getItem('google_access_token');
        }
        console.log('[GoogleSheetsService] getAccessToken called', { hasToken: !!this.accessToken, tokenLength: this.accessToken?.length });
        return this.accessToken;
    }

    static hasServiceAccount(): boolean {
        return this.serviceAccountKey !== null;
    }

    static logout() {
        googleLogout();
        this.accessToken = null;
        this.serviceAccountKey = null;
        this.tokenExpiration = null;
        sessionStorage.removeItem('google_access_token');
        sessionStorage.removeItem('encrypted_service_account'); // Clear session encrypted key
        sessionStorage.removeItem('service_account_key_raw'); // Clear raw key
        sessionStorage.removeItem('token_expiration'); // Clear token expiration
        localStorage.removeItem('service_account_key'); // Clear encrypted key on logout
    }

    // Store encrypted service account key in sessionStorage for persistence across remounts
    static setEncryptedServiceAccountKey(encryptedKey: string) {
        sessionStorage.setItem('encrypted_service_account', encryptedKey);
    }

    static getEncryptedServiceAccountKey(): string | null {
        return sessionStorage.getItem('encrypted_service_account');
    }

    static clearEncryptedServiceAccountKey() {
        sessionStorage.removeItem('encrypted_service_account');
    }

    // Restore service account key from decoded object (for sessionStorage restoration)
    static restoreServiceAccountKey(key: any) {
        this.serviceAccountKey = key;
        // Also persist to raw sessionStorage for HMR survival
        sessionStorage.setItem('service_account_key_raw', JSON.stringify(key));
    }

    static async fetch(url: string, options: RequestInit = {}) {
        console.log('[GoogleSheetsService.fetch] Called', { 
            url: url.substring(0, 60),
            hasServiceAccountKey: !!this.serviceAccountKey,
            hasToken: !!this.accessToken
        });
        
        // Auto-refresh token if using Service Account
        if (this.serviceAccountKey && this.tokenExpiration && Date.now() > this.tokenExpiration - 60000) {
            await this.refreshServiceAccountToken();
        }

        const token = this.getAccessToken();
        if (!token) throw new Error('No access token');

        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        };

        const response = await fetch(url, { ...options, headers });

        if (response.status === 401) {
            console.warn('API returned 401 Unauthorized', { url, serviceAccountKey: !!this.serviceAccountKey });

            // SELF-HEALING FIX: DEF-001
            // If service account key is missing in memory (e.g. race condition on page load),
            // try to restore it from sessionStorage immediately.
            if (!this.serviceAccountKey) {
                const sessionEncryptedKey = this.getEncryptedServiceAccountKey();
                if (sessionEncryptedKey) {
                    console.log('[GoogleSheetsService] 401 detected with missing key. Attempting lazy restoration from sessionStorage...');
                    try {
                        const key = JSON.parse(atob(sessionEncryptedKey));
                        this.restoreServiceAccountKey(key);
                        console.log('[GoogleSheetsService] Key restored successfully during 401 handling.');
                    } catch (e) {
                        console.error('[GoogleSheetsService] Failed to restore key from session during 401:', e);
                    }
                }
            }

            // Token expired or invalid
            // If we have a service account (either originally or just restored), try to refresh once
            if (this.serviceAccountKey) {
                try {
                    console.log('[GoogleSheetsService] Attempting token refresh...');
                    await this.refreshServiceAccountToken();
                    // Retry original request
                    const newToken = this.getAccessToken();
                    const newHeaders = {
                        ...options.headers,
                        'Authorization': `Bearer ${newToken}`,
                        'Content-Type': 'application/json',
                    };
                    const retryResponse = await fetch(url, { ...options, headers: newHeaders });
                    if (!retryResponse.ok) {
                        const errorText = await retryResponse.text();
                        console.error('Retry request failed', { status: retryResponse.status, error: errorText });
                        throw new Error(`API Error: ${retryResponse.status}`);
                    }
                    return retryResponse.json();
                } catch (e) {
                    console.error('Service Account Refresh Failed on 401 retry', e);
                    // Critical: If refresh fails, do NOT logout automatically.
                    // useStore.tsx handles 'Unauthorized' errors by clearing the access token
                    // but actively PRESERVES the encrypted key in sessionStorage/localStorage.
                    // This allows LoginScreen to prompt for a PIN or auto-restore instead of forcing a full re-login.
                    // this.logout(); // <-- REMOVED: Caused premature key deletion
                    throw new Error('Unauthorized');
                }
            } else {
                console.warn('401 but no service account key available -> Throw Unauthorized');
                // Do not logout here either. Let the UI decide if it can restore the key from another source.
                // this.logout(); // <-- REMOVED: Caused premature key deletion
                throw new Error('Unauthorized');
            }
        }

        // Check if response is OK (status 200-299)
        if (!response.ok) {
            const errorText = await response.text();
            console.error('[GoogleSheetsService] API request failed', { url, status: response.status, error: errorText });
            throw new Error(`API Error ${response.status}: ${errorText}`);
        }

        return response.json();
    }

    // --- Service Account Logic ---

    static async loginWithServiceAccount(credentials: any) {
        console.log('[GoogleSheetsService] loginWithServiceAccount called', { 
            hasCredentials: !!credentials, 
            hasPrivateKey: !!credentials?.private_key,
            email: credentials?.client_email 
        });
        this.serviceAccountKey = credentials;
        
        // Persist to sessionStorage to survive HMR reloads
        sessionStorage.setItem('service_account_key_raw', JSON.stringify(credentials));
        console.log('[GoogleSheetsService] serviceAccountKey set and persisted', { keyIsNowSet: !!this.serviceAccountKey });
        
        await this.refreshServiceAccountToken();
        console.log('[GoogleSheetsService] Token refreshed, serviceAccountKey status:', { stillSet: !!this.serviceAccountKey });
    }

    static async refreshServiceAccountToken() {
        if (!this.serviceAccountKey) throw new Error('No service account credentials');

        try {
            const alg = 'RS256';
            // Sanitize private key: ensure newlines are correctly formatted
            const rawKey = this.serviceAccountKey.private_key;
            const privateKeyString = rawKey.includes('\\n') ? rawKey.replace(/\\n/g, '\n') : rawKey;

            const privateKey = await jose.importPKCS8(privateKeyString, alg);

            const jwt = await new jose.SignJWT({
                scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.readonly'
            })
                .setProtectedHeader({ alg })
                .setIssuer(this.serviceAccountKey.client_email)
                .setSubject(this.serviceAccountKey.client_email)
                .setAudience('https://oauth2.googleapis.com/token')
                .setIssuedAt(Math.floor(Date.now() / 1000) - 60) // Backdate 60s to handle clock skew
                .setExpirationTime('1h')
                .sign(privateKey);

            const response = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                    assertion: jwt
                })
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`Failed to exchange JWT for token: ${response.status} ${errorBody}`);
            }

            const data = await response.json();
            this.setAccessToken(data.access_token);
            this.tokenExpiration = Date.now() + (data.expires_in * 1000);
            sessionStorage.setItem('token_expiration', this.tokenExpiration.toString());
            console.log('Service Account Token Refreshed', { expiresIn: data.expires_in });
        } catch (e) {
            console.error('Service Account Login Failed', e);
            throw e;
        }
    }

    // --- AppConfig & Setup Logic ---

    // --- AppConfig & Setup Logic ---

    static async checkAppConfig(spreadsheetId: string): Promise<{ status: 'setup_needed' | 'ready', key?: any }> {
        try {
            // 1. Check if AppConfig sheet exists
            const spreadsheet = await this.getSpreadsheet(spreadsheetId);
            const configSheet = spreadsheet.sheets?.find((s: any) => s.properties.title === 'AppConfig');
            const patientsSheet = spreadsheet.sheets?.find((s: any) => s.properties.title === 'Patients');

            const staffSheet = spreadsheet.sheets?.find((s: any) => s.properties.title === 'Staff');

            if (!configSheet) {
                await this.addSheet(spreadsheetId, 'AppConfig');
                await this.updateValues(spreadsheetId, 'AppConfig!A1', [['Paste your Service Account JSON in cell A2 (This cell)']]);
            }

            if (!patientsSheet) {
                await this.addSheet(spreadsheetId, 'Patients');
                await this.updateValues(spreadsheetId, 'Patients!A1:D1', [['ID', 'Name', 'Age', 'Notes']]);
            }

            if (!staffSheet) {
                await this.addSheet(spreadsheetId, 'Staff');
                await this.updateValues(spreadsheetId, 'Staff!A1:B1', [['Name', 'Role']]);
                // Add default staff
                await this.updateValues(spreadsheetId, 'Staff!A2:B6', [
                    ['Dr. Smith', 'Dentist'],
                    ['Dr. Jones', 'Dentist'],
                    ['Dr. Brown', 'Dentist'],
                    ['Admin Alice', 'Admin'],
                    ['Admin Bob', 'Admin']
                ]);
            }

            if (!configSheet) {
                return { status: 'setup_needed' };
            }

            // 2. Read A2
            const response = await this.getValues(spreadsheetId, 'AppConfig!A2');
            const values = response.values;

            if (!values || !values[0] || !values[0][0]) {
                return { status: 'setup_needed' };
            }

            const keyString = values[0][0];
            try {
                const key = JSON.parse(keyString);
                if (key.private_key && key.client_email) {
                    return { status: 'ready', key };
                }
            } catch (e) {
                console.warn('Invalid JSON in AppConfig');
            }

            return { status: 'setup_needed' };

        } catch (e) {
            console.error('Check AppConfig failed', e);
            return { status: 'setup_needed' };
        }
    }

    static async resizeSheet(spreadsheetId: string, sheetId: number, rowCount?: number, columnCount?: number) {
        return this.fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
            method: 'POST',
            body: JSON.stringify({
                requests: [{
                    updateSheetProperties: {
                        properties: {
                            sheetId: sheetId,
                            gridProperties: {
                                ...(rowCount ? { rowCount } : {}),
                                ...(columnCount ? { columnCount } : {})
                            }
                        },
                        fields: `gridProperties(${rowCount ? 'rowCount,' : ''}${columnCount ? 'columnCount' : ''})`
                    }
                }]
            })
        });
    }

    static async addSheet(spreadsheetId: string, title: string) {
        return this.fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
            method: 'POST',
            body: JSON.stringify({
                requests: [{
                    addSheet: {
                        properties: { title }
                    }
                }]
            })
        });
    }

    // --- Encryption Logic ---

    private static async deriveKey(pin: string): Promise<jose.JWK> {
        // Hash the PIN to get a consistent 32-byte (256-bit) key
        const encoder = new TextEncoder();
        const data = encoder.encode(pin);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);

        // Convert to Base64URL for JWK 'k' parameter
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashString = String.fromCharCode.apply(null, hashArray);
        const base64 = btoa(hashString);
        const base64url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

        return {
            k: base64url,
            alg: 'A256KW',
            kty: 'oct'
        };
    }

    static async encryptKey(key: any, pin: string): Promise<string> {
        const jwk = await this.deriveKey(pin);
        const secret = await jose.importJWK(jwk);

        const jwe = await new jose.CompactEncrypt(
            new TextEncoder().encode(JSON.stringify(key))
        )
            .setProtectedHeader({ alg: 'A256KW', enc: 'A256GCM' })
            .encrypt(secret);
        return jwe;
    }

    static async decryptKey(jwe: string, pin: string): Promise<any> {
        try {
            const jwk = await this.deriveKey(pin);
            const secret = await jose.importJWK(jwk);

            const { plaintext } = await jose.compactDecrypt(jwe, secret);
            return JSON.parse(new TextDecoder().decode(plaintext));
        } catch (e) {
            console.error('Decryption failed', e);
            throw new Error('Invalid PIN');
        }
    }

    static async getSpreadsheet(spreadsheetId: string) {
        return this.fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`);
    }

    static async getValues(spreadsheetId: string, range: string) {
        return this.fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`);
    }

    static async batchGetValues(spreadsheetId: string, ranges: string[]) {
        const rangesParam = ranges.map(r => `ranges=${encodeURIComponent(r)}`).join('&');
        return this.fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${rangesParam}&valueRenderOption=UNFORMATTED_VALUE`);
    }

    static async appendValues(spreadsheetId: string, range: string, values: any[][]) {
        return this.fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`, {
            method: 'POST',
            body: JSON.stringify({
                values
            })
        });
    }

    static async updateValues(spreadsheetId: string, range: string, values: any[][]) {
        return this.fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`, {
            method: 'PUT',
            body: JSON.stringify({
                values
            })
        });
    }

    static async clearValues(spreadsheetId: string, range: string) {
        return this.fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:clear`, {
            method: 'POST'
        });
    }

    // Helper to create a new spreadsheet if needed
    static async createSpreadsheet(title: string) {
        return this.fetch('https://sheets.googleapis.com/v4/spreadsheets', {
            method: 'POST',
            body: JSON.stringify({
                properties: {
                    title
                },
                sheets: [
                    { properties: { title: 'Patients', gridProperties: { rowCount: 1000, columnCount: 4 } } },
                    { properties: { title: 'Staff', gridProperties: { rowCount: 100, columnCount: 2 } } },
                    { properties: { title: 'TreatmentTypes', gridProperties: { rowCount: 100, columnCount: 1 } } },
                    { properties: { title: 'BracesType', gridProperties: { rowCount: 100, columnCount: 2 } } },
                    { properties: { title: 'AppConfig' } }
                ]
            })
        }).then(async (data) => {
            const spreadsheetId = data.spreadsheetId;

            // Initialize sheets with headers and default data
            await this.updateValues(spreadsheetId, 'Patients!A1:D1', [['ID', 'Name', 'Age', 'Notes']]);
            await this.updateValues(spreadsheetId, 'Staff!A1:B6', [
                ['Name', 'Role'],
                ['Dr. Smith', 'Dentist'],
                ['Dr. Jones', 'Dentist'],
                ['Dr. Brown', 'Dentist'],
                ['Admin Alice', 'Admin'],
                ['Admin Bob', 'Admin']
            ]);
            await this.updateValues(spreadsheetId, 'TreatmentTypes!A1:A8', [
                ['Type'],
                ['Cleaning'],
                ['Filling'],
                ['Root Canal'],
                ['Extraction'],
                ['Crown'],
                ['Whitening'],
                ['Checkup']
            ]);
            await this.updateValues(spreadsheetId, 'BracesType!A1:B3', [
                ['Type', 'Price'],
                ['Metal', '5000000'],
                ['Ceramic', '8000000']
            ]);
            await this.updateValues(spreadsheetId, 'AppConfig!A1:B1', [['Key', 'Value']]);

            return data;
        });
    }

    static async listSpreadsheets() {
        console.log('[GoogleSheetsService] listSpreadsheets called', { hasToken: !!this.accessToken, hasServiceAccount: !!this.serviceAccountKey });
        // Requires https://www.googleapis.com/auth/drive.readonly scope
        const q = "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false";
        const response = await this.fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`);
        console.log('[GoogleSheetsService] listSpreadsheets response', { filesCount: response.files?.length || 0 });
        return response.files || [];
    }
}
