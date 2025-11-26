import React from 'react';
import { useStore } from '../store/useStore';
import { useTranslation } from 'react-i18next';
import { Languages, LogOut } from 'lucide-react';

export const MobileSettings: React.FC = () => {
    const { logout } = useStore();
    const { t, i18n } = useTranslation();

    const toggleLanguage = () => {
        const newLang = i18n.language === 'en' ? 'id' : 'en';
        i18n.changeLanguage(newLang);
        localStorage.setItem('language', newLang);
    };

    return (
        <div className="max-w-md mx-auto p-3 space-y-6">
            <h1 className="text-2xl font-bold text-secondary-dark mb-6">{t('sidebar.settings')}</h1>

            <div className="bg-white rounded-2xl shadow-sm border border-secondary-light overflow-hidden">
                <button
                    onClick={toggleLanguage}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-secondary-light"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                            <Languages className="w-5 h-5" />
                        </div>
                        <span className="font-medium text-gray-700">
                            {i18n.language === 'en' ? 'Bahasa Indonesia' : 'English'}
                        </span>
                    </div>
                    <span className="text-sm text-gray-400">
                        {i18n.language === 'en' ? 'Switch' : 'Ganti'}
                    </span>
                </button>

                <button
                    onClick={logout}
                    className="w-full flex items-center justify-between p-4 hover:bg-red-50 transition-colors group"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-50 rounded-lg text-red-600 group-hover:bg-red-100">
                            <LogOut className="w-5 h-5" />
                        </div>
                        <span className="font-medium text-red-600 group-hover:text-red-700">
                            {t('sidebar.logout')}
                        </span>
                    </div>
                </button>
            </div>

            <div className="text-center text-gray-400 text-sm mt-8">
                <p>Version 1.0.0</p>
                <p className="text-xs mt-1">© {new Date().getFullYear()} {import.meta.env.VITE_CLINIC_NAME || 'Dental Clinic'}</p>
            </div>
        </div>
    );
};
