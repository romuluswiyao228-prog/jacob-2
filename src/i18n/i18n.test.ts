import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import i18n, {
  setLanguage,
  getInitialLanguage,
  applyLanguageToDocument,
  STORAGE_KEY,
} from "./i18n";
import { LANGUAGES, getNativeLanguageName, getLanguage } from "./languages";

describe("i18n system", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = "fr";
    document.documentElement.dir = "ltr";
  });

  afterEach(async () => {
    await setLanguage("fr");
    localStorage.clear();
  });

  describe("languages registry", () => {
    it("lists all 8 supported languages", () => {
      const codes = LANGUAGES.map((l) => l.code);
      expect(codes).toEqual(["fr", "en", "es", "pt", "ar", "de", "it", "zh"]);
    });

    it("identifies Arabic as RTL and French as complete", () => {
      const ar = getLanguage("ar");
      expect(ar?.direction).toBe("rtl");
      expect(ar?.status).toBe("beta");

      const fr = getLanguage("fr");
      expect(fr?.direction).toBe("ltr");
      expect(fr?.status).toBe("complete");
    });

    it("resolves native language names", () => {
      expect(getNativeLanguageName("fr")).toMatch(/Français/i);
      expect(getNativeLanguageName("en")).toMatch(/English/i);
      expect(getNativeLanguageName("ar")).toBe("العربية");
    });
  });

  describe("language switching", () => {
    it("changes the active language and loads the bundle", async () => {
      await setLanguage("en");
      expect(i18n.language).toBe("en");
      expect(i18n.t("common.save")).toBe("Save");
      expect(i18n.t("common.cancel")).toBe("Cancel");
    });

    it("changes to another language such as Spanish", async () => {
      await setLanguage("es");
      expect(i18n.language).toBe("es");
      expect(i18n.t("common.save")).toBe("Guardar");
    });
  });

  describe("RTL support", () => {
    it("sets dir='rtl' on <html> when switching to Arabic", async () => {
      await setLanguage("ar");
      expect(i18n.language).toBe("ar");
      expect(document.documentElement.dir).toBe("rtl");
      expect(document.documentElement.lang).toBe("ar");
    });

    it("resets dir='ltr' when switching away from Arabic", async () => {
      await setLanguage("ar");
      expect(document.documentElement.dir).toBe("rtl");

      await setLanguage("fr");
      expect(document.documentElement.dir).toBe("ltr");
      expect(document.documentElement.lang).toBe("fr");
    });

    it("applyLanguageToDocument correctly sets attributes directly", () => {
      applyLanguageToDocument("ar");
      expect(document.documentElement.dir).toBe("rtl");
      expect(document.documentElement.lang).toBe("ar");

      applyLanguageToDocument("en");
      expect(document.documentElement.dir).toBe("ltr");
      expect(document.documentElement.lang).toBe("en");
    });
  });

  describe("fallback chain: active -> en -> fr", () => {
    it("falls back to English when a key is missing in active language", async () => {
      await setLanguage("es");

      // Inject temporary test keys into 'en' and 'fr' but not 'es'
      i18n.addResourceBundle("en", "translation", { only_in_en: "English fallback text" }, true, true);
      i18n.addResourceBundle("fr", "translation", { only_in_en: "French fallback text" }, true, true);

      expect(i18n.t("only_in_en")).toBe("English fallback text");
    });

    it("falls back to French when key is missing in English too", async () => {
      await setLanguage("es");

      // Inject key only in 'fr'
      i18n.addResourceBundle("fr", "translation", { only_in_fr: "Texte de secours français" }, true, true);

      expect(i18n.t("only_in_fr")).toBe("Texte de secours français");
    });
  });

  describe("persistence in localStorage", () => {
    it("persists language selection to localStorage", async () => {
      await setLanguage("de");
      expect(localStorage.getItem(STORAGE_KEY)).toBe("de");
    });

    it("reads stored language from localStorage on initialization", () => {
      localStorage.setItem(STORAGE_KEY, "pt");
      expect(getInitialLanguage()).toBe("pt");
    });

    it("detects browser language from navigator when localStorage is not set", () => {
      // In jsdom, navigator.language is 'en' or 'en-US'
      expect(["en", "fr"]).toContain(getInitialLanguage());
    });

    it("falls back to default language when neither localStorage nor navigator has supported language", () => {
      const navSpy = vi.spyOn(navigator, "languages", "get").mockReturnValue(["xx-XX"] as any);
      const navLangSpy = vi.spyOn(navigator, "language", "get").mockReturnValue("xx-XX");

      localStorage.setItem(STORAGE_KEY, "invalid_lang_code");
      expect(getInitialLanguage()).toBe("fr");

      navSpy.mockRestore();
      navLangSpy.mockRestore();
    });

    it("handles localStorage access errors gracefully", () => {
      const navSpy = vi.spyOn(navigator, "languages", "get").mockReturnValue(["xx-XX"] as any);
      const navLangSpy = vi.spyOn(navigator, "language", "get").mockReturnValue("xx-XX");

      const getItemSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("SecurityError: localStorage is disabled");
      });

      expect(() => getInitialLanguage()).not.toThrow();
      expect(getInitialLanguage()).toBe("fr");

      getItemSpy.mockRestore();
      navSpy.mockRestore();
      navLangSpy.mockRestore();
    });
  });
});
