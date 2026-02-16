import React from 'react';
import { useStore } from '../store/useStore';
import { FileText, Users, Calendar, BarChart3, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface BottomTabsProps {
    currentView: string;
    onNavigate: (view: string) => void;
}

export const BottomTabs: React.FC<BottomTabsProps> = ({ currentView, onNavigate }) => {
    const { t } = useTranslation();
    const { userRole } = useStore();

    const navItems = [
        { id: 'treatments', label: t('sidebar.treatments'), icon: FileText },
        { id: 'patients', label: t('sidebar.patients'), icon: Users },
        { id: 'history', label: t('sidebar.history'), icon: Calendar },
    ];

    if (userRole === 'admin') {
        navItems.push({ id: 'reporting', label: t('reporting.title'), icon: BarChart3 });
    }

    navItems.push({ id: 'settings', label: t('sidebar.settings'), icon: Settings });

    return (
        <div className={`md:hidden ${import.meta.env.VITE_IS_CT === 'true' ? 'absolute bottom-0 left-0 right-0' : 'fixed bottom-0 left-0 right-0'} bg-white border-t border-secondary-light z-50 pb-safe shadow-lg`}>
            <nav className="flex justify-around items-center h-16">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onNavigate(item.id)}
                        className={`
                flex flex-col items-center justify-center w-full h-full
                ${currentView === item.id
                                ? 'text-primary'
                                : 'text-gray-400 hover:text-gray-600'}
              `}
                        title={item.label}
                    >
                        <item.icon className="w-7 h-7" />
                    </button>
                ))}
            </nav>
        </div>
    );
};
