import React from 'react';
import { useStore } from '../store/useStore';
import { Sidebar } from './Sidebar';
import { BottomTabs } from './BottomTabs';

interface LayoutProps {
    children: React.ReactNode;
    currentView: string;
    onNavigate: (view: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentView, onNavigate }) => {
    const { isDarkMode, toggleDarkMode } = useStore();

    return (
        <div className="min-h-screen bg-white flex transition-colors duration-200">
            {/* Sidebar (Desktop Only) */}
            <Sidebar
                currentView={currentView}
                onNavigate={onNavigate}
                isDarkMode={isDarkMode}
                toggleDarkMode={toggleDarkMode}
            />

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden pb-20 md:pb-0 md:pl-64">
                {/* Mobile Header */}
                <header className="md:hidden bg-white border-b border-secondary-light p-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
                    <h1 className="text-xl font-bold text-primary">Dental Clinic</h1>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-secondary-light">
                    <div className="max-w-full mx-auto">
                        {children}
                    </div>
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            <BottomTabs currentView={currentView} onNavigate={onNavigate} />
        </div>
    );
};
