import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import your language resources here
import enTranslations from './locales/en.json';
import frTranslations from './locales/fr.json';
import zhTranslations from './locales/zh.json';
// Add more languages as needed

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
      fr: { translation: frTranslations },
      zh: { translation: zhTranslations }
      // Add more languages as needed
    },
    lng: 'zh', // Set default language
    fallbackLng: 'zh',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
