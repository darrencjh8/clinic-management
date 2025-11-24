import React from 'react';
import { FileText, Users, Calendar } from 'lucide-react';

interface BottomTabsProps {
    currentView: string;
    onNavigate: (view: string) => void;
}

export const BottomTabs: React.FC<BottomTabsProps> = ({ currentView, onNavigate }) => {
    const navItems = [
        { id: 'treatments', label: 'Treatment', icon: FileText },
        { id: 'patients', label: 'Patients', icon: Users },
        { id: 'history', label: 'History', icon: Calendar },
    ];

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-secondary-light z-50 pb-safe shadow-lg">
            <nav className="flex justify-around items-center h-16">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onNavigate(item.id)}
                        className={`
                flex flex-col items-center justify-center w-full h-full space-y-1
                ${currentView === item.id
                                ? 'text-primary'
                                : 'text-gray-400 hover:text-gray-600'}
              `}
                    >
                        <item.icon className="w-6 h-6" />
                        <span className="text-xs font-medium">{item.label}</span>
                    </button>
                ))}
            </nav>
        </div>
    );
};
