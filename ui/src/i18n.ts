import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import id from './locales/id.json';

const resources = {
    en: { translation: en },
    id: { translation: id }
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: (window as any).TEST_LANGUAGE || localStorage.getItem('language') || 'id',
        fallbackLng: 'id',
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;
