/**
 * Registry of supported languages for Jacob de Jesus.
 * Adding a language = adding a JSON file in src/i18n/locales/<code>.json
 * and a line in RAW_LANGUAGES below.
 */

export type LanguageDirection = "ltr" | "rtl";
export type LanguageStatus = "complete" | "beta";

export interface LanguageConfig {
  code: string;
  direction: LanguageDirection;
  status: LanguageStatus;
}

export interface Language {
  code: string;
  name: string;
  direction: LanguageDirection;
  status: LanguageStatus;
}

export const RAW_LANGUAGES: readonly LanguageConfig[] = [
  { code: "fr", direction: "ltr", status: "complete" },
  { code: "en", direction: "ltr", status: "beta" },
  { code: "es", direction: "ltr", status: "beta" },
  { code: "pt", direction: "ltr", status: "beta" },
  { code: "ar", direction: "rtl", status: "beta" },
  { code: "de", direction: "ltr", status: "beta" },
  { code: "it", direction: "ltr", status: "beta" },
  { code: "zh", direction: "ltr", status: "beta" },
] as const;

export const DEFAULT_LANGUAGE = "fr";

/**
 * Returns native name of the language via Intl.DisplayNames,
 * with fallbacks for environments where it may be missing.
 */
export function getNativeLanguageName(code: string): string {
  try {
    if (typeof Intl !== "undefined" && "DisplayNames" in Intl) {
      const dn = new Intl.DisplayNames([code], { type: "language" });
      const name = dn.of(code);
      if (name) {
        return name.charAt(0).toUpperCase() + name.slice(1);
      }
    }
  } catch {
    // Fallback if Intl.DisplayNames throws
  }

  const fallbacks: Record<string, string> = {
    fr: "Français",
    en: "English",
    es: "Español",
    pt: "Português",
    ar: "العربية",
    de: "Deutsch",
    it: "Italiano",
    zh: "中文",
  };

  return fallbacks[code] || code.toUpperCase();
}

export const LANGUAGES: Language[] = RAW_LANGUAGES.map((cfg) => ({
  code: cfg.code,
  name: getNativeLanguageName(cfg.code),
  direction: cfg.direction,
  status: cfg.status,
}));

export const SUPPORTED_LANGUAGE_CODES = LANGUAGES.map((l) => l.code);

export function getLanguage(code: string): Language | undefined {
  return LANGUAGES.find((l) => l.code === code);
}

