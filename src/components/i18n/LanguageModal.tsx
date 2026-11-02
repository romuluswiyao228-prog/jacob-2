import { useEffect, useRef, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { X, Check } from "lucide-react";
import { LANGUAGES, type Language } from "@/i18n/languages";
import { setLanguage } from "@/i18n/i18n";
import { useCurrency, type CurrencyItem } from "@/lib/currency-context";
import styles from "./LanguageModal.module.css";

interface LanguageModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "language" | "currency";
}

export function LanguageModal({
  isOpen,
  onClose,
  initialTab = "language",
}: LanguageModalProps) {
  const { i18n, t } = useTranslation();
  const { currency, setCurrency, availableCurrencies } = useCurrency();

  const [activeTab, setActiveTab] = useState<"language" | "currency">(initialTab);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const currentLang = i18n.language || "fr";

  // Met à jour l'onglet actif quand le modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Filtrage langues
  const filteredLanguages = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return LANGUAGES;
    return LANGUAGES.filter(
      (lang) =>
        lang.name.toLowerCase().includes(q) ||
        lang.code.toLowerCase().includes(q)
    );
  }, [query]);

  // Filtrage devises
  const filteredCurrencies = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return availableCurrencies;
    return availableCurrencies.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q)
    );
  }, [query, availableCurrencies]);

  const currentItemsCount =
    activeTab === "language" ? filteredLanguages.length : filteredCurrencies.length;

  // Réinitialiser la recherche et la surbrillance à l'ouverture ou au changement d'onglet
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      if (activeTab === "language") {
        const idx = LANGUAGES.findIndex((l) => l.code === currentLang);
        setHighlightedIndex(idx >= 0 ? idx : 0);
      } else {
        const idx = availableCurrencies.findIndex((c) => c.code === currency);
        setHighlightedIndex(idx >= 0 ? idx : 0);
      }
      setTimeout(() => inputRef.current?.focus(), 15);
    }
  }, [isOpen, activeTab, currentLang, currency, availableCurrencies]);

  // Maintenir l'indice de surbrillance dans les bornes
  useEffect(() => {
    if (highlightedIndex >= currentItemsCount) {
      setHighlightedIndex(Math.max(0, currentItemsCount - 1));
    }
  }, [currentItemsCount, highlightedIndex]);

  // Navigation clavier & Focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < currentItemsCount - 1 ? prev + 1 : 0
        );
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : currentItemsCount - 1
        );
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        if (activeTab === "language" && filteredLanguages[highlightedIndex]) {
          selectLanguage(filteredLanguages[highlightedIndex]);
        } else if (
          activeTab === "currency" &&
          filteredCurrencies[highlightedIndex]
        ) {
          selectCurrency(filteredCurrencies[highlightedIndex]);
        }
        return;
      }

      // Focus trap (Tab / Shift+Tab)
      if (e.key === "Tab" && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isOpen,
    activeTab,
    currentItemsCount,
    filteredLanguages,
    filteredCurrencies,
    highlightedIndex,
    onClose,
  ]);

  // Défilement automatique vers l'élément actif
  useEffect(() => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll("li button");
    const activeItem = items[highlightedIndex] as HTMLElement | undefined;
    if (activeItem) {
      activeItem.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex]);

  if (!isOpen) return null;

  const selectLanguage = async (lang: Language) => {
    await setLanguage(lang.code);
    onClose();
  };

  const selectCurrency = (cur: CurrencyItem) => {
    setCurrency(cur.code);
    onClose();
  };

  return (
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div
        ref={modalRef}
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="locale-modal-title"
      >
        <div className={styles.header}>
          <h2 id="locale-modal-title" className={styles.title}>
            {activeTab === "language"
              ? t("languageModal.title", "Choisir la langue")
              : t("currencyModal.title", "Choisir la devise")}
          </h2>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label={t("common.close", "Fermer")}
          >
            <X size={20} />
          </button>
        </div>

        {/* Onglets Langue / Devise */}
        <div className={styles.tabs} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "language"}
            className={[
              styles.tab,
              activeTab === "language" ? styles.tabActive : "",
            ].join(" ")}
            onClick={() => setActiveTab("language")}
          >
            {t("languageModal.tabLanguage", "Langue")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "currency"}
            className={[
              styles.tab,
              activeTab === "currency" ? styles.tabActive : "",
            ].join(" ")}
            onClick={() => setActiveTab("currency")}
          >
            {t("languageModal.tabCurrency", "Devise")}
          </button>
        </div>

        <div className={styles.searchWrap}>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlightedIndex(0);
            }}
            placeholder={
              activeTab === "language"
                ? t("languageModal.searchPlaceholder", "Rechercher une langue…")
                : t("currencyModal.searchPlaceholder", "Rechercher une devise…")
            }
            className={styles.searchInput}
            aria-label={
              activeTab === "language"
                ? t("languageModal.searchPlaceholder", "Rechercher une langue…")
                : t("currencyModal.searchPlaceholder", "Rechercher une devise…")
            }
          />
        </div>

        {activeTab === "language" ? (
          filteredLanguages.length === 0 ? (
            <div className={styles.noResults}>
              {t("languageModal.noResults", "Aucune langue trouvée")}
            </div>
          ) : (
            <ul ref={listRef} className={styles.list} role="listbox">
              {filteredLanguages.map((lang, idx) => {
                const isCurrent = lang.code === currentLang;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <li key={lang.code} role="none">
                    <button
                      type="button"
                      role="option"
                      aria-selected={isCurrent}
                      className={[
                        styles.item,
                        isHighlighted ? styles.itemFocused : "",
                        isCurrent ? styles.itemActive : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => selectLanguage(lang)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                    >
                      <div className={styles.itemInfo}>
                        <span className={styles.nativeName}>{lang.name}</span>
                        <span className={styles.code}>{lang.code}</span>
                      </div>

                      <div className={styles.itemMeta}>
                        {lang.status === "beta" && (
                          <span className={styles.betaBadge}>
                            {t("common.beta", "BETA")}
                          </span>
                        )}
                        {isCurrent && (
                          <Check size={16} className={styles.activeCheck} />
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )
        ) : filteredCurrencies.length === 0 ? (
          <div className={styles.noResults}>
            {t("currencyModal.noResults", "Aucune devise disponible")}
          </div>
        ) : (
          <ul ref={listRef} className={styles.list} role="listbox">
            {filteredCurrencies.map((item, idx) => {
              const isCurrent = item.code === currency;
              const isHighlighted = idx === highlightedIndex;

              return (
                <li key={item.code} role="none">
                  <button
                    type="button"
                    role="option"
                    aria-selected={isCurrent}
                    className={[
                      styles.item,
                      isHighlighted ? styles.itemFocused : "",
                      isCurrent ? styles.itemActive : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => selectCurrency(item)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                  >
                    <div className={styles.itemInfo}>
                      <span className={styles.nativeName}>{item.name}</span>
                      <span className={styles.code}>{item.code}</span>
                    </div>

                    <div className={styles.itemMeta}>
                      {isCurrent && (
                        <Check size={16} className={styles.activeCheck} />
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
