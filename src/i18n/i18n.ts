import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGE_CODES,
  getLanguage,
} from "./languages";

export const STORAGE_KEY = "jacob_language";

const localeLoaders: Record<
  string,
  () => Promise<{ default: Record<string, unknown> }>
> = {
  fr: () => import("./locales/fr.json"),
  en: () => import("./locales/en.json"),
  es: () => import("./locales/es.json"),
  pt: () => import("./locales/pt.json"),
  ar: () => import("./locales/ar.json"),
  de: () => import("./locales/de.json"),
  it: () => import("./locales/it.json"),
  zh: () => import("./locales/zh.json"),
};

/**
 * Reads stored language from localStorage or detects browser language.
 */
export function getInitialLanguage(): string {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored && SUPPORTED_LANGUAGE_CODES.includes(stored)) {
        return stored;
      }
    }
  } catch {
    // Ignore localStorage errors (private mode, quota, etc.)
  }

  // Detect from navigator if supported
  if (
    typeof process !== "undefined" &&
    process.env?.NODE_ENV === "test"
  ) {
    let detectNavigator = false;
    try {
      detectNavigator =
        typeof window !== "undefined" &&
        !!window.localStorage?.getItem("test_detect_navigator");
    } catch {
      // localStorage may be unavailable in some test scenarios
    }
    if (!detectNavigator) return DEFAULT_LANGUAGE;
  }

  if (typeof navigator !== "undefined") {
    const candidateLanguages = navigator.languages
      ? [...navigator.languages]
      : [navigator.language];

    for (const raw of candidateLanguages) {
      if (!raw) continue;
      const code = raw.split("-")[0].toLowerCase();
      if (SUPPORTED_LANGUAGE_CODES.includes(code)) {
        return code;
      }
    }
  }

  return DEFAULT_LANGUAGE;
}

/**
 * Updates <html lang> and <html dir>.
 */
export function applyLanguageToDocument(code: string): void {
  if (typeof document === "undefined") return;
  const def = getLanguage(code);
  const dir = def?.direction || "ltr";
  document.documentElement.lang = code;
  document.documentElement.dir = dir;
}

const loadedLanguages = new Set<string>();

/**
 * Loads a locale file dynamically on demand.
 */
export async function loadLanguageResource(code: string): Promise<void> {
  if (loadedLanguages.has(code)) return;
  const loader = localeLoaders[code];
  if (!loader) return;

  try {
    const module = await loader();
    i18n.addResourceBundle(code, "translation", module.default, true, true);
    loadedLanguages.add(code);
  } catch (err) {
    console.error(`Failed to dynamically load locale [${code}]:`, err);
  }
}

/**
 * Ensures fallback languages ('en' and 'fr') are loaded so missing keys
 * fall back to English then French.
 */
export async function ensureFallbackLanguages(): Promise<void> {
  await Promise.all([
    loadLanguageResource("en"),
    loadLanguageResource("fr"),
  ]);
}

/**
 * Switches the active language, updates document attributes, and saves to localStorage.
 */
export async function setLanguage(code: string): Promise<void> {
  const targetCode = SUPPORTED_LANGUAGE_CODES.includes(code)
    ? code
    : DEFAULT_LANGUAGE;

  // 1. Load target language bundle
  await loadLanguageResource(targetCode);

  // 2. If target is not 'fr' or 'en', ensure fallback bundles are available
  if (targetCode !== "fr" && targetCode !== "en") {
    await ensureFallbackLanguages();
  } else if (targetCode === "en") {
    await loadLanguageResource("fr");
  }

  // 3. Change i18next language
  await i18n.changeLanguage(targetCode);

  // 4. Update html lang & dir
  applyLanguageToDocument(targetCode);

  // 5. Persist to localStorage
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, targetCode);
    }
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Initialize i18next synchronously with default settings,
 * then bootstrap initial language asynchronously.
 */
const initialLang = getInitialLanguage();

i18n.use(initReactI18next).init({
  lng: initialLang,
  fallbackLng: ["en", "fr"],
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

// Bootstrap active language resource
setLanguage(initialLang).catch((err) => {
  console.error("Failed to initialize active language:", err);
});

export default i18n;

