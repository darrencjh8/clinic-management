import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

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

const firebaseConfig = {
    apiKey: getEnv('VITE_FIREBASE_API_KEY'),
    authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: getEnv('VITE_FIREBASE_PROJECT_ID'),
    storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: getEnv('VITE_FIREBASE_APP_ID')
};

// Fallback for testing/Node.js environment where env vars might be missing
if (!firebaseConfig.apiKey) {
    console.warn('Firebase config missing (likely in test/Node environment). Using mock values.');
    Object.assign(firebaseConfig, {
        apiKey: "mock-api-key",
        authDomain: "mock.firebaseapp.com",
        projectId: "mock-project",
        storageBucket: "mock.appspot.com",
        messagingSenderId: "12345",
        appId: "1:123:web:mock"
    });
}

console.log('Firebase Config Debug:', {
    apiKey: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 5)}...` : 'MISSING',
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain
});

let app;
let auth: any;

let isCT = false;
try {
    // @ts-ignore
    if (import.meta.env.VITE_IS_CT === 'true') {
        isCT = true;
    }
} catch (e) { }

if (!isCT) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
} else {
    // Mock for Component Testing to avoid invalid config errors
    auth = {
        currentUser: null,
    };
}

export { auth };
