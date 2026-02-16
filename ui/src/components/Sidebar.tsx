import React from 'react';
import { FileText, Users, Calendar, LogOut, Languages, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useTranslation } from 'react-i18next';

interface SidebarProps {
    currentView: string;
    onNavigate: (view: string) => void;
    isDarkMode: boolean;
    toggleDarkMode: () => void;
    isCollapsed: boolean;
    onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, isCollapsed, onToggle }) => {
    const { logout, userRole } = useStore();
    const { t, i18n } = useTranslation();

    const navItems = [
        { id: 'treatments', label: t('sidebar.treatments'), icon: FileText },
        { id: 'patients', label: t('sidebar.patients'), icon: Users },
        { id: 'history', label: t('sidebar.history'), icon: Calendar },
    ];

    if (userRole === 'admin') {
        navItems.push({ id: 'reporting', label: t('reporting.title'), icon: BarChart3 });
    }

    const toggleLanguage = () => {
        const newLang = i18n.language === 'en' ? 'id' : 'en';
        i18n.changeLanguage(newLang);
        localStorage.setItem('language', newLang);
    };

    return (
        <aside
            className={`hidden md:flex flex-col fixed inset-y-0 left-0 z-50 bg-white border-r border-secondary-light shadow-sm transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}
        >
            <div className={`p-6 border-b border-secondary-light flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                {!isCollapsed && (
                    <h1 className="text-xl font-bold text-primary leading-tight">
                        {import.meta.env.VITE_CLINIC_NAME || 'Dental Clinic'}
                    </h1>
                )}
                <button
                    onClick={onToggle}
                    className={`p-1.5 rounded-lg hover:bg-secondary-light text-gray-500 transition-colors ${isCollapsed ? '' : 'ml-2'}`}
                >
                    {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                </button>
            </div>

            <nav className="p-4 space-y-1 flex-1">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onNavigate(item.id)}
                        title={isCollapsed ? item.label : ''}
                        className={`
                            w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium
                            ${currentView === item.id
                                ? 'bg-primary bg-opacity-10 text-primary shadow-sm'
                                : 'text-gray-600 hover:bg-secondary-light hover:text-secondary-dark'}
                            ${isCollapsed ? 'justify-center' : ''}
                        `}
                    >
                        <item.icon className={`w-5 h-5 flex-shrink-0 ${currentView === item.id ? 'text-primary' : 'text-gray-400'}`} />
                        {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </button>
                ))}
            </nav>

            <div className="p-4 border-t border-secondary-light space-y-2">
                <button
                    onClick={toggleLanguage}
                    title={isCollapsed ? (i18n.language === 'en' ? 'Switch to Indonesian' : 'Beralih ke Bahasa Inggris') : ''}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-all font-medium ${isCollapsed ? 'justify-center' : ''}`}
                >
                    <Languages className="w-5 h-5 flex-shrink-0" />
                    {!isCollapsed && <span className="truncate">{i18n.language === 'en' ? 'Indonesian' : 'English'}</span>}
                </button>
                <button
                    onClick={logout}
                    title={isCollapsed ? t('sidebar.logout') : ''}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all font-medium ${isCollapsed ? 'justify-center' : ''}`}
                >
                    <LogOut className="w-5 h-5 flex-shrink-0" />
                    {!isCollapsed && <span className="truncate">{t('sidebar.logout')}</span>}
                </button>
                {!isCollapsed && (
                    <div className="flex items-center gap-3 px-4 py-3 text-gray-400 text-sm">
                        <span>v1.0.0</span>
                    </div>
                )}
            </div>
        </aside>
    );
};
