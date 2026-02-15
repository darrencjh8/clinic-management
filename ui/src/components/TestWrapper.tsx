import React from 'react';
import { MockStoreProvider } from './MockStoreProvider';
import { ToastProvider } from '../context/ToastContext';
import { GoogleOAuthProvider } from '@react-oauth/google';

export const TestWrapper = ({ children, storeValues }: { children: React.ReactNode, storeValues?: any }) => (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || 'test-client-id'}>
        <MockStoreProvider value={storeValues}>
            <ToastProvider>
                {children}
            </ToastProvider>
        </MockStoreProvider>
    </GoogleOAuthProvider>
);
