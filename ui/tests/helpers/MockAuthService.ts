export const MockAuthService = {
    onTokenChange: (callback: (token: string | null) => void) => {
        (window as any).__triggerTokenChange = callback;
        return () => { };
    },
    signOut: async () => { console.log('Mock signOut called'); },
    signIn: async (email: string, pass: string) => { console.log('Mock signIn called'); return {} as any; },
    getCurrentUser: () => null,
    getToken: async () => 'MOCK_TOKEN',
    fetchServiceAccount: async (token: string) => ({ client_email: 'mock@service.com', private_key: 'mock_key' }),
    // Keep these for backward compatibility if used by other tests, but likely they need to be removed or updated
    logout: async () => { },
    getProfile: async () => null,
    getServiceAccountKeys: async () => null,
    getUnsafeIdToken: async () => null
};
