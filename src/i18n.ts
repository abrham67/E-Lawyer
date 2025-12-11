import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import am from './locales/am.json';

// Detect device language (e.g., 'en-US' or 'am-ET') and map to supported locales
const deviceLang = (typeof navigator !== 'undefined' && (navigator.languages?.[0] || navigator.language)) || 'en';
const normalized = deviceLang.toLowerCase().startsWith('am') ? 'am' : 'en';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    am: { translation: am },
  },
  lng: normalized,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
