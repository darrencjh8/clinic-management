/**
 * Robust Firebase Auth Mock for Component Testing
 * Supports token refresh simulation for both admin and staff users
 */

type TokenChangeCallback = (token: string | null) => void;

interface MockUser {
    uid: string;
    email: string;
    displayName?: string;
    getIdToken: () => Promise<string>;
}

interface MockFirebaseAuthState {
    currentUser: MockUser | null;
    tokenChangeCallbacks: Set<TokenChangeCallback>;
    currentToken: string | null;
    userRole: 'admin' | 'staff' | null;
    autoRefreshEnabled: boolean;
    refreshInterval: ReturnType<typeof setInterval> | null;
}

const state: MockFirebaseAuthState = {
    currentUser: null,
    tokenChangeCallbacks: new Set(),
    currentToken: null,
    userRole: null,
    autoRefreshEnabled: false,
    refreshInterval: null
};

// Token generation helpers
const generateToken = (prefix: string = 'TOKEN'): string => {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
};

export const MockFirebaseAuth = {
    // Reset state for test isolation
    reset: () => {
        state.currentUser = null;
        state.tokenChangeCallbacks.clear();
        state.currentToken = null;
        state.userRole = null;
        state.autoRefreshEnabled = false;
        if (state.refreshInterval) {
            clearInterval(state.refreshInterval);
            state.refreshInterval = null;
        }
        // Clean up window callbacks
        if (typeof window !== 'undefined') {
            delete (window as any).__triggerTokenChange;
            delete (window as any).__mockFirebaseAuth;
        }
    },

    // Initialize mock with a user
    initializeUser: (options: {
        uid?: string;
        email?: string;
        role: 'admin' | 'staff';
        initialToken?: string;
    }) => {
        const { uid = 'mock-uid-123', email = 'test@example.com', role, initialToken } = options;
        
        state.userRole = role;
        state.currentToken = initialToken || generateToken(role.toUpperCase());
        
        state.currentUser = {
            uid,
            email,
            displayName: role === 'admin' ? 'Admin User' : 'Staff User',
            getIdToken: async () => state.currentToken || ''
        };

        console.log(`MockFirebaseAuth: User initialized as ${role}`, { uid, email, token: state.currentToken?.substring(0, 20) });
        return state.currentUser;
    },

    // Sign in simulation
    signIn: async (email: string, _password: string) => {
        console.log('MockFirebaseAuth: signIn called', { email });
        
        // Simulate a brief delay
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Initialize as staff user by default for Firebase email/password login
        MockFirebaseAuth.initializeUser({
            email,
            role: 'staff',
            initialToken: generateToken('STAFF_FIREBASE')
        });

        // Notify listeners
        MockFirebaseAuth.notifyTokenChange(state.currentToken);
        
        return { user: state.currentUser };
    },

    // Sign out
    signOut: async () => {
        console.log('MockFirebaseAuth: signOut called');
        state.currentUser = null;
        state.currentToken = null;
        state.userRole = null;
        MockFirebaseAuth.stopAutoRefresh();
        MockFirebaseAuth.notifyTokenChange(null);
    },

    // Get current user
    getCurrentUser: (): MockUser | null => {
        return state.currentUser;
    },

    // Get token
    getToken: async (): Promise<string | undefined> => {
        return state.currentToken || undefined;
    },

    // Register token change listener
    onTokenChange: (callback: TokenChangeCallback) => {
        state.tokenChangeCallbacks.add(callback);
        
        // Also set up window callback for legacy compatibility
        if (typeof window !== 'undefined') {
            (window as any).__triggerTokenChange = (token: string | null) => {
                MockFirebaseAuth.simulateTokenRefresh(token);
            };
        }

        // Unsubscribe function
        return () => {
            state.tokenChangeCallbacks.delete(callback);
        };
    },

    // Notify all listeners of token change
    notifyTokenChange: (token: string | null) => {
        console.log('MockFirebaseAuth: Notifying token change', { token: token?.substring(0, 20) });
        state.tokenChangeCallbacks.forEach(callback => {
            try {
                callback(token);
            } catch (e) {
                console.error('MockFirebaseAuth: Token change callback error', e);
            }
        });
    },

    // Simulate token refresh (called by useStore or tests)
    simulateTokenRefresh: (newToken?: string | null) => {
        if (newToken === null) {
            state.currentToken = null;
        } else {
            state.currentToken = newToken || generateToken(state.userRole?.toUpperCase() || 'REFRESHED');
        }
        console.log('MockFirebaseAuth: Token refreshed', { 
            role: state.userRole, 
            newToken: state.currentToken?.substring(0, 20) 
        });
        MockFirebaseAuth.notifyTokenChange(state.currentToken);
        return state.currentToken;
    },

    // Start automatic token refresh simulation
    startAutoRefresh: (intervalMs: number = 5000) => {
        if (state.refreshInterval) {
            clearInterval(state.refreshInterval);
        }
        
        state.autoRefreshEnabled = true;
        state.refreshInterval = setInterval(() => {
            if (state.currentUser && state.autoRefreshEnabled) {
                console.log('MockFirebaseAuth: Auto-refreshing token...');
                MockFirebaseAuth.simulateTokenRefresh();
            }
        }, intervalMs);
        
        console.log('MockFirebaseAuth: Auto-refresh started', { intervalMs });
    },

    // Stop automatic token refresh
    stopAutoRefresh: () => {
        state.autoRefreshEnabled = false;
        if (state.refreshInterval) {
            clearInterval(state.refreshInterval);
            state.refreshInterval = null;
        }
        console.log('MockFirebaseAuth: Auto-refresh stopped');
    },

    // Fetch service account (mock)
    fetchServiceAccount: async (_token: string): Promise<any> => {
        console.log('MockFirebaseAuth: fetchServiceAccount called');
        return {
            client_email: 'mock-service-account@project.iam.gserviceaccount.com',
            private_key: '-----BEGIN RSA PRIVATE KEY-----\nMOCK_KEY\n-----END RSA PRIVATE KEY-----'
        };
    },

    // Expose state for testing
    getState: () => ({ ...state }),

    // Get current role
    getCurrentRole: () => state.userRole,

    // Check if token should be ignored (staff users ignore Firebase token updates)
    shouldIgnoreTokenUpdate: () => {
        return state.userRole === 'staff';
    }
};

// Expose globally for tests
if (typeof window !== 'undefined') {
    (window as any).__mockFirebaseAuth = MockFirebaseAuth;
}

export default MockFirebaseAuth;
