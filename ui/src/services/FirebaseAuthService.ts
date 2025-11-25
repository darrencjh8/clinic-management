import { auth } from '../config/firebase';
import { signInWithEmailAndPassword, signOut as firebaseSignOut, type User } from 'firebase/auth';

const API_URL = import.meta.env.VITE_API_URL || '';

export const FirebaseAuthService = {
    signIn: async (email: string, pass: string) => {
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
        return await firebaseSignOut(auth);
    },

    getCurrentUser: (): User | null => {
        return auth.currentUser;
    },

    getToken: async (): Promise<string | undefined> => {
        return await auth.currentUser?.getIdToken();
    },

    fetchServiceAccount: async (token: string): Promise<any> => {
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
    }
};
