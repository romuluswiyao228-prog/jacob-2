import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useCurrency } from "@/lib/currency-context";
import { LanguageModal } from "@/components/i18n/LanguageModal";
import styles from "@/components/i18n/LanguageButton.module.css";

interface CurrencyButtonProps {
  variant?: "header" | "footer";
  className?: string;
}

export function CurrencyButton({
  variant = "header",
  className,
}: CurrencyButtonProps) {
  const { t } = useTranslation();
  const { currency } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);

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
        aria-label={t("header.changeCurrencyAria", {
          currency,
          defaultValue: `Changer de devise (actuel : ${currency})`,
        })}
      >
        <span>{currency}</span>
      </button>

      <LanguageModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        initialTab="currency"
      />
    </>
  );
}

