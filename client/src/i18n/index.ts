import en from './en.json';
import fr from './fr.json';

export type Language = 'en' | 'fr';
export type Translations = typeof en;

const translations: Record<Language, Translations> = { en, fr };

export function getTranslation(lang: Language): Translations {
  return translations[lang] || translations.en;
}

export { en, fr };
