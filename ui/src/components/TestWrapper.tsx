import React from 'react';
import { MockStoreProvider } from './MockStoreProvider';
import { ToastProvider } from '../context/ToastContext';
import { GoogleOAuthProvider } from '@react-oauth/google';
import '../i18n'; // Initialize i18n

import { useTranslation } from 'react-i18next';

export const TestWrapper = ({ children, storeValues }: { children: React.ReactNode, storeValues?: any }) => {
    const { i18n } = useTranslation();

    // Force language if specified in test
    if ((window as any).TEST_LANGUAGE && i18n.language !== (window as any).TEST_LANGUAGE) {
        i18n.changeLanguage((window as any).TEST_LANGUAGE);
    }

    return (
        <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || 'test-client-id'}>
            <MockStoreProvider value={storeValues}>
                <ToastProvider>
                    <div className={import.meta.env.VITE_IS_CT === 'true' ? 'relative min-h-screen' : ''}>
                        {children}
                    </div>
                </ToastProvider>
            </MockStoreProvider>
        </GoogleOAuthProvider>
    );
};
