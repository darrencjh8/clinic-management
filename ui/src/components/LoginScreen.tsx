import { useState, useEffect, useRef } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { FirebaseAuthService } from '../services/FirebaseAuthService';
import { GoogleSheetsService } from '../services/GoogleSheetsService';
import { LogIn, Lock, AlertTriangle, ShieldCheck, Languages } from 'lucide-react';
import { PinEntry } from './PinEntry';
import { useTranslation } from 'react-i18next';

interface LoginScreenProps {
    onLoginSuccess: (token: string, role: 'admin' | 'staff') => void;
    onSpreadsheetIdSubmit?: (id: string) => void;
    initialToken?: string | null;
    userRole?: 'admin' | 'staff' | null;
}

export const LoginScreen = ({
    onLoginSuccess,
    onSpreadsheetIdSubmit,
    initialToken,
    userRole,
}: LoginScreenProps) => {
    // Login Method State
    const [loginMethod, setLoginMethod] = useState<'firebase' | 'google'>('firebase');
    const { t, i18n } = useTranslation();

    // Service Locators (for testing)
    const authService = (window as any).MockAuthService || FirebaseAuthService;
    const sheetsService = (window as any).MockSheetsService || GoogleSheetsService;

    // Firebase State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // Shared State
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Auth Steps: 'login' -> 'pin_check' (if key exists) OR 'pin_setup' (if new) -> 'loading' -> 'spreadsheet_setup' (if no sheet ID)
    const [authStep, setAuthStep] = useState<'login' | 'pin_check' | 'pin_setup' | 'loading' | 'spreadsheet_setup'>('login');
    const [tempServiceAccount, setTempServiceAccount] = useState<any | null>(null);

    // Spreadsheet Selection State
    const [availableSheets, setAvailableSheets] = useState<any[]>([]);
    const [isLoadingSheets, setIsLoadingSheets] = useState(false);
    const [isKeyRestored, setIsKeyRestored] = useState(false);

    // Ref to track the current authStep for async operations to avoid closure staleness
    const authStepRef = useRef(authStep);
    useEffect(() => {
        authStepRef.current = authStep;
    }, [authStep]);

    const toggleLanguage = () => {
        const newLang = i18n.language === 'en' ? 'id' : 'en';
        i18n.changeLanguage(newLang);
        localStorage.setItem('language', newLang);
    };

    useEffect(() => {
        // Clear errors and previous data when switching steps
        // This prevents "Unauthorized" from spreadsheet_setup bleeding into pin_setup
        console.log(`[LoginScreen] Step changed to: ${authStep}`);
        setError(null);
        if (authStep !== 'spreadsheet_setup') {
            setAvailableSheets([]);
        }
    }, [authStep]);

    useEffect(() => {
        if (!initialToken) {
            // Only clear session-related items, not encrypted keys or preferences
            localStorage.removeItem('user_role');
        }
        console.log('LoginScreen: Effect running', { initialToken: !!initialToken });

        // 1. Priority: If we have an initial token (from App), we are in setup mode.
        if (initialToken) {
            // CRITICAL FIX: If we are in the middle of PIN setup/check (e.g. from Firebase Login flow),
            // do NOT let initialToken (which might be the Firebase ID token bubbling down) hijack the state.
            // Also block if we are loading (e.g. during sign-in) to prevent race conditions (401s).
            if (authStep === 'pin_setup' || authStep === 'pin_check' || isLoading) {
                console.log('[LoginScreen] Ignoring initialToken update during PIN flow or loading state');
                return;
            }

            console.log('[LoginScreen] initialToken detected', { tokenLength: initialToken.length });
            GoogleSheetsService.setAccessToken(initialToken);

            // CRITICAL FIX: Try to restore service account key from sessionStorage first
            // This survives component remounts unlike static class variables
            const sessionEncryptedKey = sheetsService.getEncryptedServiceAccountKey();
            if (sessionEncryptedKey) {
                console.log('[LoginScreen] Found encrypted key in sessionStorage, restoring...');
                setIsKeyRestored(false); // Reset state
                (async () => {
                    try {
                        const key = JSON.parse(atob(sessionEncryptedKey));
                        sheetsService.restoreServiceAccountKey(key);
                        console.log('[LoginScreen] Service account key restored, refreshing token...');

                        // Refresh token to ensure it's valid and tokenExpiration is set
                        await sheetsService.refreshServiceAccountToken();
                        console.log('[LoginScreen] Token refreshed successfully');

                        // Set state AFTER async operations complete
                        setIsKeyRestored(true);
                        setAuthStep('spreadsheet_setup');
                    } catch (e) {
                        console.error('[LoginScreen] Failed to restore key from session:', e);
                        // Don't clear the encrypted key - redirect to PIN check so user can re-enter PIN
                        // This prevents losing the key and allows recovery without full re-login
                        setAuthStep('pin_check');
                        setError('Session expired. Please enter your PIN.');
                    }
                })();
                return;
            }

            // Fallback: Check localStorage for encrypted key (requires PIN)
            const currentUser = authService.getCurrentUser();
            if (currentUser) {
                const uid = currentUser.uid;
                const encryptedKey = localStorage.getItem(`encrypted_key_${uid}`);
                if (encryptedKey) {
                    console.log('[LoginScreen] Found encrypted key in localStorage, need PIN to restore');
                    setAuthStep('pin_check');
                    return;
                }
            }

            console.log('[LoginScreen] No encrypted key found, proceeding to spreadsheet_setup');
            setAuthStep('spreadsheet_setup');
            return;
        }

        // 2. Check if user is already logged in to Firebase
        const currentUser = authService.getCurrentUser();
        if (currentUser) {
            // If already logged in, check if we have a stored key
            const uid = currentUser.uid;
            if (uid && localStorage.getItem(`encrypted_key_${uid}`)) {
                console.log('LoginScreen: Found stored key, switching to pin_check');
                setAuthStep('pin_check');
            }
        }
    }, [initialToken]);

    useEffect(() => {
        if (authStep === 'spreadsheet_setup') {
            // Only fetch spreadsheets if key restoration is complete or not needed
            // This prevents race condition where fetchSpreadsheets runs before key is restored
            const hasSessionKey = sheetsService.getEncryptedServiceAccountKey();
            if (!hasSessionKey || isKeyRestored) {
                console.log('[LoginScreen] Triggering fetchSpreadsheets', { hasSessionKey: !!hasSessionKey, isKeyRestored });
                fetchSpreadsheets();
            } else {
                console.log('[LoginScreen] Waiting for key restoration to complete before fetching spreadsheets');
            }
        }
    }, [authStep, isKeyRestored]);



    const fetchSpreadsheets = async () => {
        console.log('[LoginScreen] fetchSpreadsheets called');

        // GUARD: Use ref to check the LATEST step
        if (authStepRef.current !== 'spreadsheet_setup') {
            console.log('[LoginScreen] Aborting fetchSpreadsheets: Not in spreadsheet_setup step');
            return;
        }

        const currentToken = sheetsService.getAccessToken();
        console.log('[LoginScreen] Token check before listSpreadsheets:', { hasToken: !!currentToken, tokenLength: currentToken?.length });

        setIsLoadingSheets(true);
        try {
            const sheets = await sheetsService.listSpreadsheets();

            // GUARD: Check ref again
            if (authStepRef.current !== 'spreadsheet_setup') {
                console.log('[LoginScreen] Ignoring fetch result: User navigated away');
                return;
            }

            console.log('[LoginScreen] Spreadsheets fetched:', { count: sheets.length });
            setAvailableSheets(sheets);
        } catch (e: any) {
            console.error('[LoginScreen] Failed to list sheets', e);

            // GUARD: Check ref again
            if (authStepRef.current !== 'spreadsheet_setup') {
                console.log('[LoginScreen] Ignoring fetch error: User navigated away');
                return;
            }

            // AUTO-RECOVERY for stuck 401
            if (e?.message?.includes('Unauthorized') || e?.message?.includes('401')) {
                console.warn('[LoginScreen] Critical 401 during fetch. Redirecting to PIN check/Login.');

                // If we have a stored key, go to PIN check to re-decrypt/refresh properly
                const currentUser = authService.getCurrentUser();
                const uid = currentUser?.uid;
                if (uid && localStorage.getItem(`encrypted_key_${uid}`)) {
                    setAuthStep('pin_check');
                    setError('Session expired. Please enter PIN to refresh.');
                    return;
                }

                // Otherwise, full logout
                console.warn('[LoginScreen] No recovery key found, forcing logout.');
                handleSignOut();
                setError('Session expired. Please login again.');
                return;
            }

            setError(`Failed to load spreadsheets: ${e?.message || String(e)}`);
        } finally {
            if (authStepRef.current === 'spreadsheet_setup') {
                setIsLoadingSheets(false);
            }
        }
    };

    // --- Google OAuth Logic ---
    const googleLogin = useGoogleLogin({
        onSuccess: (tokenResponse) => {
            // DIRECT OAUTH ACCESS: Use the user's token, skip PIN/Service Account
            sheetsService.setAccessToken(tokenResponse.access_token);
            onLoginSuccess(tokenResponse.access_token, 'admin');
        },
        onError: () => setError('Google Login Failed'),
        scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.readonly',
    });

    // --- Firebase Logic ---
    const handleFirebaseLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const userCredential = await authService.signIn(email, password);
            const uid = userCredential.user.uid;

            // Check if we already have a key for this user
            if (localStorage.getItem(`encrypted_key_${uid}`)) {
                setAuthStep('pin_check');
            } else {
                // Fetch service account from server
                console.log('Fetching service account...');
                const token = await userCredential.user.getIdToken();
                const serviceAccount = await authService.fetchServiceAccount(token);
                console.log('Service account fetched:', !!serviceAccount);

                if (serviceAccount) {
                    setTempServiceAccount(serviceAccount);
                    setAuthStep('pin_setup');
                } else {
                    throw new Error('Failed to fetch service account');
                }
            }
        } catch (e: any) {
            console.error('Login failed', e);
            setError('Invalid email or password');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePinSetup = async (pin: string) => {
        console.log('handlePinSetup called with PIN length:', pin.length);
        if (!tempServiceAccount) {
            console.error('tempServiceAccount is missing!');
            setError('Service account data lost. Please try logging in again.');
            return;
        }
        setIsLoading(true);
        try {
            const uid = authService.getCurrentUser()?.uid;
            if (!uid) throw new Error('No user');

            console.log('Encrypting key...');
            const jwe = await sheetsService.encryptKey(tempServiceAccount, pin);
            localStorage.setItem(`encrypted_key_${uid}`, jwe);

            // Login to sheets
            console.log('Logging in with service account...');
            await sheetsService.loginWithServiceAccount(tempServiceAccount);
            console.log('Service account login successful');

            // Store base64-encoded service account in sessionStorage for remount persistence
            const encodedKey = btoa(JSON.stringify(tempServiceAccount));
            sheetsService.setEncryptedServiceAccountKey(encodedKey);
            console.log('Service account key stored in sessionStorage');

            // Mark key as restored since it's in memory now
            setIsKeyRestored(true);

            // Get the actual access token generated by the service account login
            const token = sheetsService.getAccessToken();
            console.log('Access token retrieved:', !!token);

            if (token) {
                console.log('Calling onLoginSuccess from Setup...');
                // UNLOCK TRANSITION: Explicitly set step to allow initialToken update to pass guard
                setAuthStep('spreadsheet_setup');

                // FIX DEF-005: Explicitly trigger fetch to ensure it happens immediately
                // The useEffect might be skipped or delayed due to batching/race
                // MANUALLY UPDATE REF to bypass guard since state update is async
                authStepRef.current = 'spreadsheet_setup';
                fetchSpreadsheets();

                onLoginSuccess(token, 'staff');
                console.log('onLoginSuccess called');
            } else {
                throw new Error('Failed to retrieve access token');
            }
        } catch (e: any) {
            console.error('Pin Setup Failed', e);
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePinCheck = async (pin: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const uid = authService.getCurrentUser()?.uid;
            if (!uid) throw new Error('No user');

            const encryptedKey = localStorage.getItem(`encrypted_key_${uid}`);
            if (!encryptedKey) throw new Error('No stored key');

            console.log('[LoginScreen] Decrypting service account key with PIN...');
            const key = await sheetsService.decryptKey(encryptedKey, pin);
            await sheetsService.loginWithServiceAccount(key);
            console.log('[LoginScreen] Service account restored successfully');

            // Store base64-encoded service account in sessionStorage for remount persistence
            const encodedKey = btoa(JSON.stringify(key));
            sheetsService.setEncryptedServiceAccountKey(encodedKey);
            console.log('Service account key stored in sessionStorage');

            // Mark key as restored since it's in memory now
            setIsKeyRestored(true);

            const token = sheetsService.getAccessToken();
            if (token) {
                // If we already have initialToken, just proceed to spreadsheet_setup
                if (initialToken) {
                    // Logic for pre-existing token users
                    setAuthStep('spreadsheet_setup');
                    // We assume initialToken is already the correct one if we are here?
                    // Actually, if we just restored the key, we might need to refresh?
                    // But if initialToken is null, we do onLoginSuccess.
                    authStepRef.current = 'spreadsheet_setup';
                    fetchSpreadsheets(); // Ensure fetch happens
                } else {
                    // Standard flow: Pin Check -> Service Account Restore -> Login Success
                    console.log('PIN check success, restoring session...');
                    // UNLOCK TRANSITION: Explicitly set step to allow initialToken update to pass guard
                    setAuthStep('spreadsheet_setup');

                    // FIX DEF-005: Explicitly trigger fetch here too for consistency
                    authStepRef.current = 'spreadsheet_setup';
                    fetchSpreadsheets();

                    onLoginSuccess(token, 'staff');
                }
            } else {
                throw new Error('Failed to retrieve access token');
            }
        } catch (e) {
            console.error('Pin Check Failed', e);
            setError('Incorrect PIN');
            setIsLoading(false);
        }
    };

    const handleResetPin = async () => {
        if (!window.confirm('This will clear your saved PIN and require you to set a new one. Continue?')) return;

        setIsLoading(true);
        try {
            const user = authService.getCurrentUser();
            if (!user) throw new Error('No user');

            // 1. Clear stored key
            localStorage.removeItem(`encrypted_key_${user.uid}`);

            // 2. Re-fetch service account
            console.log('Fetching service account for reset...');
            const token = await user.getIdToken();
            const serviceAccount = await authService.fetchServiceAccount(token);

            if (serviceAccount) {
                setTempServiceAccount(serviceAccount);
                setAuthStep('pin_setup');
                setError(null);
            } else {
                throw new Error('Failed to fetch service account');
            }
        } catch (e: any) {
            console.error('Reset failed', e);
            setError('Failed to reset: ' + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignOut = async () => {
        console.log('[LoginScreen] handleSignOut called');
        try {
            await authService.signOut();
            sheetsService.logout();
        } catch (e) {
            console.error('Sign out error', e);
        } finally {
            console.log('[LoginScreen] handleSignOut finally block - resetting loading state');
            // FIX DEF-004: Ensure loading state is reset
            setIsLoading(false);
            setAuthStep('login');
            setEmail('');
            setPassword('');
        }
    };

    // --- RENDER ---

    if (authStep === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="w-12 h-12 border-4 border-secondary-light border-t-primary rounded-full animate-spin"></div>
            </div>
        );
    }

    if (authStep === 'pin_check') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white p-4">
                <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 border-2 border-secondary-light relative">
                    <PinEntry mode="enter" onSubmit={handlePinCheck} error={error} />

                    <div className="mt-6 flex flex-col gap-3">
                        <button
                            onClick={handleResetPin}
                            className="text-sm text-primary hover:text-primary-dark underline w-full text-center"
                        >
                            {t('pin.forgotPIN')}
                        </button>
                        <button onClick={handleSignOut} className="text-xs text-slate-400 hover:text-red-500 w-full text-center">
                            {t('pin.signOut')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (authStep === 'pin_setup') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white p-4">
                <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 border-2 border-secondary-light">
                    <h2 className="text-xl font-bold text-center mb-4 text-secondary-dark">{t('pin.setupTitle')}</h2>
                    <p className="text-sm text-gray-500 text-center mb-6">
                        {t('pin.setupDescription')}
                    </p>
                    <PinEntry mode="set" onSubmit={handlePinSetup} error={error} />
                </div>
            </div>
        );
    }

    if (authStep === 'spreadsheet_setup') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white p-4">
                <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 border-2 border-secondary-light">
                    <h2 className="text-xl font-bold text-center mb-4 text-secondary-dark">{t('spreadsheet.setupTitle')}</h2>
                    <p className="text-sm text-gray-500 text-center mb-6">
                        {userRole === 'admin'
                            ? t('spreadsheet.selectOrCreate')
                            : t('spreadsheet.selectExisting')}
                    </p>

                    <div className="flex flex-col gap-4">
                        {userRole === 'admin' && (
                            <>
                                <button
                                    onClick={async () => {
                                        setIsLoading(true);
                                        try {
                                            const title = `Dental Clinic Data - ${new Date().getFullYear()}`;
                                            const sheet = await sheetsService.createSpreadsheet(title);
                                            if (onSpreadsheetIdSubmit) {
                                                onSpreadsheetIdSubmit(sheet.spreadsheetId);
                                            }
                                        } catch (e: any) {
                                            setError('Failed to create sheet: ' + e.message);
                                            setIsLoading(false);
                                        }
                                    }}
                                    disabled={isLoading}
                                    className="w-full bg-primary text-white py-3 rounded-xl font-medium hover:bg-opacity-90 disabled:opacity-50 transition-colors"
                                >
                                    {isLoading ? t('spreadsheet.creating') : t('spreadsheet.createNew')}
                                </button>

                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-gray-200"></div>
                                    </div>
                                    <div className="relative flex justify-center text-sm">
                                        <span className="px-2 bg-white text-gray-500">{t('spreadsheet.orSelectExisting')}</span>
                                    </div>
                                </div>
                            </>
                        )}

                        {isLoadingSheets ? (
                            <div className="text-center py-4 text-gray-500">{t('spreadsheet.loading')}</div>
                        ) : availableSheets.length > 0 ? (
                            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl">
                                {availableSheets.map(sheet => (
                                    <button
                                        key={sheet.id}
                                        onClick={() => onSpreadsheetIdSubmit && onSpreadsheetIdSubmit(sheet.id)}
                                        className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors flex items-center gap-2"
                                    >
                                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                        <div className="truncate flex-1">
                                            <div className="font-medium text-gray-700 truncate">{sheet.name}</div>
                                            <div className="text-xs text-gray-400">ID: {sheet.id.substring(0, 8)}...</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-4 text-gray-400 text-sm">{t('spreadsheet.noSpreadsheetsFound')}</div>
                        )}

                        {/* Refresh Button */}
                        <button
                            onClick={fetchSpreadsheets}
                            disabled={isLoadingSheets}
                            className="mt-4 w-full flex items-center justify-center gap-2 text-sm text-primary hover:text-primary-dark border border-primary rounded-lg py-2 px-4 disabled:opacity-50 transition-colors"
                        >
                            <svg className={`w-4 h-4 ${isLoadingSheets ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            {t('spreadsheet.refresh')}
                        </button>

                        <button onClick={handleSignOut} className="mt-2 text-xs text-slate-400 hover:text-red-500 w-full text-center">
                            {t('pin.signOut')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-white p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 border-2 border-secondary-light">

                {/* Header Icon */}
                <div className="w-16 h-16 bg-primary bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-6">
                    {loginMethod === 'firebase' ? (
                        <Lock className="w-8 h-8 text-primary" />
                    ) : (
                        <ShieldCheck className="w-8 h-8 text-primary" />
                    )}
                </div>

                <h2 className="text-2xl font-bold text-center text-secondary-dark mb-2">
                    {loginMethod === 'firebase'
                        ? `${import.meta.env.VITE_CLINIC_NAME || 'Dental Clinic'}`
                        : t('login.adminTitle')}
                </h2>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 text-red-600 rounded-lg text-sm flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        {error}
                    </div>
                )}

                {loginMethod === 'firebase' ? (
                    <form onSubmit={handleFirebaseLogin} className="flex flex-col gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('login.email')}</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-secondary-light focus:ring-2 focus:ring-primary outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('login.password')}</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-secondary-light focus:ring-2 focus:ring-primary outline-none"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-primary text-white py-3 rounded-xl font-medium hover:bg-opacity-90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <LogIn className="w-4 h-4" />
                                    {t('login.signIn')}
                                </>
                            )}
                        </button>
                    </form>
                ) : (
                    <div className="flex flex-col gap-4">
                        <p className="text-gray-600 text-center mb-4">
                            {t('login.googleSignInDescription')}
                        </p>
                        <button
                            onClick={() => googleLogin()}
                            className="w-full bg-white border border-gray-300 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                        >
                            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
                            {t('login.googleSignIn')}
                        </button>
                    </div>
                )}

                <div className="mt-6 pt-6 border-t border-gray-100 space-y-3">
                    <button
                        onClick={toggleLanguage}
                        className="w-full flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
                    >
                        <Languages className="w-4 h-4" />
                        {i18n.language === 'en' ? 'Bahasa Indonesia' : 'English'}
                    </button>
                    <button
                        onClick={() => {
                            setLoginMethod(prev => prev === 'firebase' ? 'google' : 'firebase');
                            setError(null);
                        }}
                        className="w-full text-sm text-gray-500 hover:text-primary transition-colors"
                    >
                        {loginMethod === 'firebase'
                            ? t('login.switchToAdmin')
                            : t('login.switchToStaff')}
                    </button>
                </div>
            </div>
        </div>
    );
};
