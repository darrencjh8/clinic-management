export const FirebaseAuthService = {
    onTokenChange: (callback: (token: string | null) => void) => {
        // Expose trigger to window for testing
        (window as any).__triggerTokenChange = callback;
        // Don't trigger immediately to avoid interference
        return () => { };
    },
    signOut: async () => { },
    signIn: async (email: string, pass: string) => { return {} as any; },
    getCurrentUser: () => null,
    getToken: async () => 'MOCK_TOKEN',
    fetchServiceAccount: async (token: string) => ({ client_email: 'mock@service.com', private_key: 'mock_key' }),
};
