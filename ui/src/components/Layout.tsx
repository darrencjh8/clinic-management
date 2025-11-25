import React from 'react';
import { useStore } from '../store/useStore';
import { Sidebar } from './Sidebar';
import { BottomTabs } from './BottomTabs';

import { SyncStatus } from './SyncStatus';

interface LayoutProps {
    children: React.ReactNode;
    currentView: string;
    onNavigate: (view: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentView, onNavigate }) => {
    const { isDarkMode, toggleDarkMode } = useStore();

    return (
        <div className="h-[100dvh] bg-white flex transition-colors duration-200 overflow-hidden">
            {/* Sidebar (Desktop Only) */}
            <Sidebar
                currentView={currentView}
                onNavigate={onNavigate}
                isDarkMode={isDarkMode}
                toggleDarkMode={toggleDarkMode}
            />

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 h-full md:pl-64 relative">
                {/* Mobile Header */}
                <header className="md:hidden bg-white border-b border-secondary-light p-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
                    <h1 className="text-xl font-bold text-primary">{import.meta.env.VITE_CLINIC_NAME || 'Dental Clinic'}</h1>
                </header>

                <SyncStatus />

                <div className="flex-1 overflow-y-auto bg-secondary-light p-4">
                    <div className="max-w-full mx-auto pb-20 md:pb-0">
                        {children}
                    </div>
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            <BottomTabs currentView={currentView} onNavigate={onNavigate} />
        </div>
    );
};
