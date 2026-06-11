import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import am from './locales/am.json';

// Detect device language (e.g., 'en-US' or 'am-ET') and map to supported locales
const storageKey = 'app_lang';
const deviceLang = (typeof navigator !== 'undefined' && (navigator.languages?.[0] || navigator.language)) || 'en';
const normalized = deviceLang.toLowerCase().startsWith('am') ? 'am' : 'en';
const savedLang = (typeof window !== 'undefined' && window.localStorage.getItem(storageKey)) || '';
const initialLang = savedLang === 'am' || savedLang === 'en' ? savedLang : normalized;

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    am: { translation: am },
  },
  lng: initialLang,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

i18n.on('languageChanged', (lng) => {
  const next = lng.toLowerCase().startsWith('am') ? 'am' : 'en';
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(storageKey, next);
  }
});

export default i18n;
