/**
 * Utilitaires pour l'affichage multi-devises et les conversions indicatives.
 *
 * Règles métier :
 * - La base de données reste en XOF (entiers).
 * - Les autres devises sont des conversions indicatives pour l'affichage uniquement.
 * - Le franc CFA (XOF) est arrimé à l'euro (1 EUR = 655,957 XOF, parité fixe).
 * - Si les taux sont absents ou périmés (> 7 jours), repli automatique sur le XOF.
 */

export const EUR_XOF_PARITY = 655.957;
export const DEFAULT_CURRENCY = "XOF";
export const CURRENCY_STORAGE_KEY = "jacob_currency";
export const MAX_RATE_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

export interface ExchangeRateRecord {
  devise: string;
  taux: number; // 1 XOF = taux devise
  mis_a_jour: string;
}

export type ExchangeRateMap = Record<
  string,
  {
    taux: number;
    mis_a_jour: string;
  }
>;

export interface ConvertedPriceResult {
  amount: number;
  currency: string;
  isConverted: boolean;
  stale?: boolean;
}

/**
 * Vérifie si un taux est périmé (plus de 7 jours).
 */
export function isRateStale(
  updatedAt: string | Date | null | undefined,
  nowMs = Date.now()
): boolean {
  if (!updatedAt) return true;
  const time = new Date(updatedAt).getTime();
  if (isNaN(time)) return true;
  return nowMs - time > MAX_RATE_AGE_MS;
}

/**
 * Récupère la devise initiale depuis le localStorage ou retourne XOF.
 */
export function getInitialCurrency(validCurrencies?: string[]): string {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const stored = window.localStorage.getItem(CURRENCY_STORAGE_KEY);
      if (stored) {
        const clean = stored.trim().toUpperCase();
        if (!validCurrencies || validCurrencies.includes(clean)) {
          return clean;
        }
      }
    }
  } catch {
    // Erreur localStorage ignorée
  }
  return DEFAULT_CURRENCY;
}

/**
 * Sauvegarde la devise dans le localStorage.
 */
export function saveCurrency(currencyCode: string): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(CURRENCY_STORAGE_KEY, currencyCode.toUpperCase());
    }
  } catch {
    // Ignorer
  }
}

/**
 * Récupère la liste de toutes les devises ISO supportées par l'environnement Intl.
 */
export function getSupportedBrowserCurrencies(): string[] {
  if (
    typeof Intl !== "undefined" &&
    typeof (Intl as unknown as { supportedValuesOf?: (key: string) => string[] })
      .supportedValuesOf === "function"
  ) {
    try {
      return (
        Intl as unknown as { supportedValuesOf: (key: string) => string[] }
      ).supportedValuesOf("currency");
    } catch {
      // Ignorer si échec
    }
  }
  return [
    "XOF",
    "EUR",
    "USD",
    "GBP",
    "CAD",
    "JPY",
    "CHF",
    "CNY",
    "NGN",
    "GHS",
    "ZAR",
  ];
}

/**
 * Retourne le nom localisé d'une devise via Intl.DisplayNames.
 */
export function getCurrencyDisplayName(code: string, locale = "fr"): string {
  try {
    const dn = new Intl.DisplayNames([locale], { type: "currency" });
    return dn.of(code) || code;
  } catch {
    return code;
  }
}

/**
 * Convertit un montant XOF vers la devise cible.
 *
 * Pour l'EUR : utilise la parité fixe exacte (1 EUR = 655,957 XOF).
 * Pour les autres : utilise amountXOF * taux.
 * Si le taux est manquant ou périmé (> 7 jours) : repli sur le montant en XOF.
 */
export function convertPrice(
  amountXOF: number,
  targetCurrency: string,
  rates: ExchangeRateMap,
  nowMs = Date.now()
): ConvertedPriceResult {
  const normTarget = (targetCurrency || DEFAULT_CURRENCY).toUpperCase();

  if (normTarget === "XOF" || !amountXOF) {
    return {
      amount: amountXOF || 0,
      currency: "XOF",
      isConverted: false,
    };
  }

  // Cas spécial Euro : parité fixe exacte
  if (normTarget === "EUR") {
    const eurRate = rates["EUR"];
    if (eurRate && isRateStale(eurRate.mis_a_jour, nowMs)) {
      return {
        amount: amountXOF,
        currency: "XOF",
        isConverted: false,
        stale: true,
      };
    }
    // 1 EUR = 655,957 XOF => Montant EUR = Montant XOF / 655.957
    const converted = amountXOF / EUR_XOF_PARITY;
    return {
      amount: converted,
      currency: "EUR",
      isConverted: true,
    };
  }

  const rate = rates[normTarget];
  if (!rate) {
    // Taux absent -> repli sur XOF
    return {
      amount: amountXOF,
      currency: "XOF",
      isConverted: false,
    };
  }

  if (isRateStale(rate.mis_a_jour, nowMs)) {
    // Taux périmé (> 7 jours) -> repli sur XOF
    return {
      amount: amountXOF,
      currency: "XOF",
      isConverted: false,
      stale: true,
    };
  }

  const converted = amountXOF * rate.taux;
  return {
    amount: converted,
    currency: normTarget,
    isConverted: true,
  };
}

/**
 * Formate un montant indicatif ou officiel.
 * Si la devise est autre que XOF et la conversion est active, préfixe avec « ≈ ».
 */
export function formatPrice(
  amountXOF: number,
  targetCurrency: string,
  rates: ExchangeRateMap,
  locale = "fr-FR",
  options?: { hideApprox?: boolean }
): string {
  const { amount, currency, isConverted } = convertPrice(
    amountXOF,
    targetCurrency,
    rates
  );

  if (!isConverted || currency === "XOF") {
    // XOF n'a pas de sous-unité usuelle dans le commerce (0 décimales)
    const formattedXOF = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "XOF",
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(Math.round(amount));

    return formattedXOF;
  }

  // Formatage dans la devise convertie (décimales et symboles standards)
  const formatted = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount);

  return options?.hideApprox ? formatted : `≈\u00a0${formatted}`;
}

