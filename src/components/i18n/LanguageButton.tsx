import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LanguageModal } from "./LanguageModal";
import { getLanguage } from "@/i18n/languages";
import styles from "./LanguageButton.module.css";

interface LanguageButtonProps {
  variant?: "header" | "footer";
  className?: string;
}

export function LanguageButton({ variant = "header", className }: LanguageButtonProps) {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const currentCode = (i18n.language || "fr").toUpperCase();
  const langDef = getLanguage(i18n.language || "fr");
  const nativeName = langDef?.name || currentCode;

  return (
    <>
      <button
        type="button"
        className={[
          styles.langBtn,
          variant === "footer" ? styles.langBtnFooter : "",
          className ?? "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={() => setIsOpen(true)}
        aria-label={t("header.changeLanguageAria", {
          language: nativeName,
          defaultValue: `Changer de langue (actuel : ${nativeName})`,
        })}
      >
        <span>{currentCode}</span>
      </button>

      <LanguageModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

