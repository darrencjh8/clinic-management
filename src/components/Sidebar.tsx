import React from 'react';
import { FileText, Users, Calendar, LogOut } from 'lucide-react';
import { useStore } from '../store/useStore';

interface SidebarProps {
    currentView: string;
    onNavigate: (view: string) => void;
    isDarkMode: boolean;
    toggleDarkMode: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
    const { logout } = useStore();
    const navItems = [
        { id: 'treatments', label: 'New Treatment', icon: FileText },
        { id: 'patients', label: 'Patients', icon: Users },
        { id: 'history', label: 'History', icon: Calendar },
    ];

    return (
        <aside className="hidden md:block fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-secondary-light shadow-sm">
            <div className="p-6 border-b border-secondary-light flex items-center justify-between">
                <h1 className="text-2xl font-bold text-primary">
                    Dental Clinic
                </h1>
            </div>

            <nav className="p-4 space-y-1">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => {
                            onNavigate(item.id);
                        }}
                        className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium
                ${currentView === item.id
                                ? 'bg-primary bg-opacity-10 text-primary shadow-sm'
                                : 'text-gray-600 hover:bg-secondary-light hover:text-secondary-dark'}
              `}
                    >
                        <item.icon className={`w-5 h-5 ${currentView === item.id ? 'text-primary' : 'text-gray-400'}`} />
                        {item.label}
                    </button>
                ))}
            </nav>

            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-secondary-light">
                <button
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all font-medium mb-2"
                >
                    <LogOut className="w-5 h-5" />
                    Logout
                </button>
                <div className="flex items-center gap-3 px-4 py-3 text-gray-400 text-sm">
                    <span>v1.0.0</span>
                </div>
            </div>
        </aside>
    );
};
