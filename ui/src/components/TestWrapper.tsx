import React from 'react';
import { MockStoreProvider } from './MockStoreProvider';
import { ToastProvider } from '../context/ToastContext';

export const TestWrapper = ({ children, storeValues }: { children: React.ReactNode, storeValues?: any }) => (
    <MockStoreProvider value={storeValues}>
        <ToastProvider>
            {children}
        </ToastProvider>
    </MockStoreProvider>
);
