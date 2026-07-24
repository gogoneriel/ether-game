/**
 * Pain reply language: en / pt / es / de / fr.
 */

export const PAIN_LOCALES = ['en', 'pt', 'es', 'de', 'fr'];

const LANGUAGE_NAMES = {
  en: 'English',
  pt: 'Portuguese',
  es: 'Spanish',
  de: 'German',
  fr: 'French',
};

/**
 * @param {unknown} input
 * @returns {'en'|'pt'|'es'|'de'|'fr'}
 */
export function normalizeLocale(input) {
  const v = String(input || '')
    .trim()
    .toLowerCase();
  return PAIN_LOCALES.includes(v) ? v : 'en';
}

/**
 * System directive so Pain answers in the owner's language.
 * @param {unknown} locale
 */
export function localeSystemMessage(locale) {
  const code = normalizeLocale(locale);
  const name = LANGUAGE_NAMES[code];
  return `Language: the owner's app is set to ${name}. Detect the language of the OWNER'S latest message and reply ENTIRELY in that language. Only ever use one of: English, Portuguese, Spanish, German, French. If the latest message gives no clear signal (very short, an emoji, a tapped button label, "ok", numbers), default to ${name}. Keep code identifiers, file paths, URLs, and tool names unchanged — translate everything else, including \`\`\`options button labels and headings.`;
}
