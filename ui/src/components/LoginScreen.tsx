import { useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { FirebaseAuthService } from '../services/FirebaseAuthService';
import { GoogleSheetsService } from '../services/GoogleSheetsService';
import { LogIn, Lock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { PinEntry } from './PinEntry';

interface LoginScreenProps {
    onLoginSuccess: (token: string, role: 'admin' | 'staff') => void;
    onSpreadsheetIdSubmit?: (id: string) => void;
    initialToken?: string | null;
}

export const LoginScreen = ({ onLoginSuccess, onSpreadsheetIdSubmit, initialToken }: LoginScreenProps) => {
    // Login Method State
    const [loginMethod, setLoginMethod] = useState<'firebase' | 'google'>('firebase');

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

    useEffect(() => {
        console.log('LoginScreen: Effect running', { initialToken: !!initialToken });

        // 1. Priority: If we have an initial token (from App), we are in setup mode.
        if (initialToken) {
            console.log('LoginScreen: initialToken detected, switching to spreadsheet_setup');
            GoogleSheetsService.setAccessToken(initialToken);
            setAuthStep('spreadsheet_setup');
            return;
        }

        // 2. Check if user is already logged in to Firebase
        const currentUser = FirebaseAuthService.getCurrentUser();
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
            fetchSpreadsheets();
        }
    }, [authStep]);

    const fetchSpreadsheets = async () => {
        setIsLoadingSheets(true);
        try {
            const sheets = await GoogleSheetsService.listSpreadsheets();
            setAvailableSheets(sheets);
        } catch (e) {
            console.error('Failed to list sheets', e);
        } finally {
            setIsLoadingSheets(false);
        }
    };

    // --- Google OAuth Logic ---
    const googleLogin = useGoogleLogin({
        onSuccess: (tokenResponse) => {
            // DIRECT OAUTH ACCESS: Use the user's token, skip PIN/Service Account
            GoogleSheetsService.setAccessToken(tokenResponse.access_token);
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
            const userCredential = await FirebaseAuthService.signIn(email, password);
            const uid = userCredential.user.uid;

            // Check if we already have a key for this user
            if (localStorage.getItem(`encrypted_key_${uid}`)) {
                setAuthStep('pin_check');
            } else {
                // Fetch service account from server
                console.log('Fetching service account...');
                const token = await userCredential.user.getIdToken();
                const serviceAccount = await FirebaseAuthService.fetchServiceAccount(token);
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
            const uid = FirebaseAuthService.getCurrentUser()?.uid;
            if (!uid) throw new Error('No user');

            console.log('Encrypting key...');
            const jwe = await GoogleSheetsService.encryptKey(tempServiceAccount, pin);
            localStorage.setItem(`encrypted_key_${uid}`, jwe);

            // Login to sheets
            console.log('Logging in with service account...');
            await GoogleSheetsService.loginWithServiceAccount(tempServiceAccount);
            console.log('Service account login successful');

            // Get the actual access token generated by the service account login
            const token = GoogleSheetsService.getAccessToken();
            console.log('Access token retrieved:', !!token);

            if (token) {
                console.log('Calling onLoginSuccess...');
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
            const uid = FirebaseAuthService.getCurrentUser()?.uid;
            if (!uid) throw new Error('No user');

            const encryptedKey = localStorage.getItem(`encrypted_key_${uid}`);
            if (!encryptedKey) throw new Error('No stored key');

            const key = await GoogleSheetsService.decryptKey(encryptedKey, pin);
            await GoogleSheetsService.loginWithServiceAccount(key);

            const token = GoogleSheetsService.getAccessToken();
            if (token) {
                onLoginSuccess(token, 'staff');
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
            const user = FirebaseAuthService.getCurrentUser();
            if (!user) throw new Error('No user');

            // 1. Clear stored key
            localStorage.removeItem(`encrypted_key_${user.uid}`);

            // 2. Re-fetch service account
            console.log('Fetching service account for reset...');
            const token = await user.getIdToken();
            const serviceAccount = await FirebaseAuthService.fetchServiceAccount(token);

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
        await FirebaseAuthService.signOut();
        setAuthStep('login');
        setEmail('');
        setPassword('');
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
                            Forgot PIN? / Reset
                        </button>
                        <button onClick={handleSignOut} className="text-xs text-slate-400 hover:text-red-500 w-full text-center">
                            Sign Out
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
                    <h2 className="text-xl font-bold text-center mb-4 text-secondary-dark">Set your Security PIN</h2>
                    <p className="text-sm text-gray-500 text-center mb-6">
                        This PIN will be used to encrypt your access on this device.
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
                    <h2 className="text-xl font-bold text-center mb-4 text-secondary-dark">Setup Database</h2>
                    <p className="text-sm text-gray-500 text-center mb-6">
                        Select an existing spreadsheet or create a new one.
                    </p>

                    <div className="flex flex-col gap-4">
                        <button
                            onClick={async () => {
                                setIsLoading(true);
                                try {
                                    const title = `Dental Clinic Data - ${new Date().getFullYear()}`;
                                    const sheet = await GoogleSheetsService.createSpreadsheet(title);
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
                            {isLoading ? 'Creating...' : 'Create New Spreadsheet'}
                        </button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-gray-500">Or select existing</span>
                            </div>
                        </div>

                        {isLoadingSheets ? (
                            <div className="text-center py-4 text-gray-500">Loading your spreadsheets...</div>
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
                            <div className="text-center py-4 text-gray-400 text-sm">No spreadsheets found.</div>
                        )}

                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            const id = formData.get('sheetId') as string;
                            if (id && onSpreadsheetIdSubmit) {
                                onSpreadsheetIdSubmit(id);
                            }
                        }}>
                            <input
                                name="sheetId"
                                type="text"
                                placeholder="Or enter ID manually"
                                className="w-full px-4 py-3 rounded-xl border border-secondary-light focus:ring-2 focus:ring-primary outline-none text-sm"
                            />
                        </form>

                        <button onClick={handleSignOut} className="mt-2 text-xs text-slate-400 hover:text-red-500 w-full text-center">
                            Sign Out
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
                    {loginMethod === 'firebase' ? 'Dental Clinic Login' : 'Admin Login'}
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
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-secondary-light focus:ring-2 focus:ring-primary outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
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
                                    Sign In
                                </>
                            )}
                        </button>
                    </form>
                ) : (
                    <div className="flex flex-col gap-4">
                        <p className="text-gray-600 text-center mb-4">
                            Sign in with your Google Account for administrative access.
                        </p>
                        <button
                            onClick={() => googleLogin()}
                            className="w-full bg-white border border-gray-300 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                        >
                            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
                            Sign in with Google
                        </button>
                    </div>
                )}

                <div className="mt-6 pt-6 border-t border-gray-100">
                    <button
                        onClick={() => {
                            setLoginMethod(prev => prev === 'firebase' ? 'google' : 'firebase');
                            setError(null);
                        }}
                        className="w-full text-sm text-gray-500 hover:text-primary transition-colors"
                    >
                        {loginMethod === 'firebase'
                            ? 'Switch to Admin (Google) Login'
                            : 'Switch to Staff (Email) Login'}
                    </button>
                </div>
            </div>
        </div>
    );
};
