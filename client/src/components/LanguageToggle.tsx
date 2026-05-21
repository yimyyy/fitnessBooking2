import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * Button to toggle between English and French.
 */
export function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage();

  const toggle = () => setLanguage(language === 'en' ? 'fr' : 'en');

  return (
    <button
      onClick={toggle}
      className="px-3 py-1 text-sm font-medium rounded border border-gray-300 hover:bg-gray-100 transition"
      aria-label="Toggle language"
    >
      {t.language.toggle}
    </button>
  );
}
