import { auth } from '../config/firebase';
import { signInWithEmailAndPassword, signOut as firebaseSignOut, onIdTokenChanged, type User } from 'firebase/auth';

const getEnv = (key: string) => {
    try {
        return import.meta.env[key];
    } catch (e) {
        if (typeof process !== 'undefined' && process.env) {
            return process.env[key];
        }
    }
    return undefined;
};

const API_URL = getEnv('VITE_API_URL') || '';

const isCT = (() => {
    try {
        // @ts-ignore
        return import.meta.env.VITE_IS_CT === 'true';
    } catch (e) {
        return false;
    }
})();

export const FirebaseAuthService = {
    signIn: async (email: string, pass: string) => {
        if (isCT) {
            console.log('Mock signIn called');
            return {} as any;
        }
        console.log('FirebaseAuthService: signIn called');
        try {
            const result = await signInWithEmailAndPassword(auth, email, pass);
            console.log('FirebaseAuthService: signIn success');
            return result;
        } catch (e) {
            console.error('FirebaseAuthService: signIn failed', e);
            throw e;
        }
    },

    signOut: async () => {
        if (isCT) return;
        return await firebaseSignOut(auth);
    },

    getCurrentUser: (): User | null => {
        return auth.currentUser;
    },

    getToken: async (): Promise<string | undefined> => {
        if (isCT) return 'MOCK_TOKEN';
        return await auth.currentUser?.getIdToken();
    },

    fetchServiceAccount: async (token: string): Promise<any> => {
        if (isCT) {
            return { client_email: 'mock@service.com', private_key: 'mock_key' };
        }
        const response = await fetch(`${API_URL}/api/auth/service-account`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch service account');
        }

        const data = await response.json();
        return data.serviceAccount;
    },

    onTokenChange: (callback: (token: string | null) => void) => {
        if (isCT) {
            (window as any).__triggerTokenChange = callback;
            return () => { };
        }
        return onIdTokenChanged(auth, async (user) => {
            if (user) {
                const token = await user.getIdToken();
                callback(token);
            } else {
                callback(null);
            }
        });
    }
};
