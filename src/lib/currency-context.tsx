import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import {
  DEFAULT_CURRENCY,
  EUR_XOF_PARITY,
  getInitialCurrency,
  saveCurrency,
  convertPrice as convertPriceHelper,
  formatPrice as formatPriceHelper,
  isRateStale,
  getCurrencyDisplayName,
  type ExchangeRateMap,
  type ConvertedPriceResult,
} from "./currency";

export interface CurrencyItem {
  code: string;
  name: string;
}

export interface CurrencyContextValue {
  currency: string;
  setCurrency: (code: string) => void;
  rates: ExchangeRateMap;
  lastUpdated: string | null;
  isRatesStale: boolean;
  availableCurrencies: CurrencyItem[];
  enabledCurrencies: string[];
  convertPrice: (amountXOF: number) => ConvertedPriceResult;
  formatPrice: (
    amountXOF: number,
    options?: { hideApprox?: boolean; targetCurrency?: string }
  ) => string;
  refreshRates: () => Promise<void>;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language || "fr";

  const [currency, setCurrencyState] = useState<string>(() =>
    getInitialCurrency()
  );
  const [rates, setRates] = useState<ExchangeRateMap>({});
  const [enabledCurrencies, setEnabledCurrencies] = useState<string[]>([
    "XOF",
    "EUR",
    "USD",
  ]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Charger les taux de change et réglages de boutique
  const loadRatesAndSettings = useCallback(async () => {
    try {
      setIsLoading(true);

      const [ratesRes, settingsRes] = await Promise.all([
        supabase
          .from("exchange_rates")
          .select("devise, taux, mis_a_jour"),
        supabase
          .from("public_store_settings")
          .select("enabled_currencies")
          .limit(1)
          .maybeSingle(),
      ]);

      if (settingsRes.data && Array.isArray(settingsRes.data.enabled_currencies)) {
        setEnabledCurrencies(settingsRes.data.enabled_currencies);
      }

      const ratesMap: ExchangeRateMap = {};
      let newestTimestamp: string | null = null;

      if (ratesRes.data && ratesRes.data.length > 0) {
        ratesRes.data.forEach((r: { devise: string; taux: number; mis_a_jour: string }) => {
          ratesMap[r.devise] = {
            taux: Number(r.taux),
            mis_a_jour: r.mis_a_jour,
          };
          if (!newestTimestamp || r.mis_a_jour > newestTimestamp) {
            newestTimestamp = r.mis_a_jour;
          }
        });
      }

      // Parité fixe EUR toujours garantie si absente
      if (!ratesMap["EUR"]) {
        ratesMap["EUR"] = {
          taux: 1 / EUR_XOF_PARITY,
          mis_a_jour: newestTimestamp || new Date().toISOString(),
        };
      }

      setRates(ratesMap);
      setLastUpdated(newestTimestamp);
    } catch (err) {
      console.warn("Erreur chargement exchange_rates / settings:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRatesAndSettings();
  }, [loadRatesAndSettings]);

  // Vérifier si tous les taux sont périmés ou absents
  const isRatesStale = useMemo(() => {
    if (!lastUpdated) return false;
    return isRateStale(lastUpdated);
  }, [lastUpdated]);

  // Devises proposées dans le sélecteur :
  // Doivent être dans enabled_currencies ET avoir un taux valide non périmé
  const availableCurrencies = useMemo<CurrencyItem[]>(() => {
    // Si les taux sont complètement périmés, seule XOF est proposée
    if (isRatesStale) {
      return [{ code: "XOF", name: getCurrencyDisplayName("XOF", currentLang) }];
    }

    const list: CurrencyItem[] = [];

    // Toujours proposer XOF
    if (enabledCurrencies.includes("XOF")) {
      list.push({
        code: "XOF",
        name: getCurrencyDisplayName("XOF", currentLang),
      });
    }

    for (const code of enabledCurrencies) {
      if (code === "XOF") continue;
      const rate = rates[code];
      // Doit avoir un taux et ne pas être périmé
      if (rate && !isRateStale(rate.mis_a_jour)) {
        list.push({
          code,
          name: getCurrencyDisplayName(code, currentLang),
        });
      }
    }

    return list.length > 0
      ? list
      : [{ code: "XOF", name: getCurrencyDisplayName("XOF", currentLang) }];
  }, [enabledCurrencies, rates, isRatesStale, currentLang]);

  // Si la devise courante n'est plus disponible (taux périmé ou désactivée), repli sur XOF
  useEffect(() => {
    const isCurrentAvailable = availableCurrencies.some(
      (c) => c.code === currency
    );
    if (!isCurrentAvailable && currency !== DEFAULT_CURRENCY) {
      setCurrencyState(DEFAULT_CURRENCY);
      saveCurrency(DEFAULT_CURRENCY);
    }
  }, [availableCurrencies, currency]);

  const setCurrency = useCallback((code: string) => {
    const upper = code.toUpperCase();
    setCurrencyState(upper);
    saveCurrency(upper);
  }, []);

  const convertPrice = useCallback(
    (amountXOF: number): ConvertedPriceResult => {
      return convertPriceHelper(amountXOF, currency, rates);
    },
    [currency, rates]
  );

  const formatPrice = useCallback(
    (
      amountXOF: number,
      options?: { hideApprox?: boolean; targetCurrency?: string }
    ): string => {
      const target = options?.targetCurrency || currency;
      return formatPriceHelper(
        amountXOF,
        target,
        rates,
        currentLang === "en" ? "en-US" : "fr-FR",
        options
      );
    },
    [currency, rates, currentLang]
  );

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        rates,
        lastUpdated,
        isRatesStale,
        availableCurrencies,
        enabledCurrencies,
        convertPrice,
        formatPrice,
        refreshRates: loadRatesAndSettings,
        isLoading,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

const defaultCurrencyValue: CurrencyContextValue = {
  currency: DEFAULT_CURRENCY,
  setCurrency: () => {},
  rates: {},
  lastUpdated: null,
  isRatesStale: false,
  availableCurrencies: [
    { code: "XOF", name: getCurrencyDisplayName("XOF", "fr") },
  ],
  enabledCurrencies: ["XOF", "EUR", "USD"],
  convertPrice: (amountXOF: number) => ({
    amount: amountXOF,
    currency: DEFAULT_CURRENCY,
    isConverted: false,
  }),
  formatPrice: (
    amountXOF: number,
    options?: { hideApprox?: boolean; targetCurrency?: string }
  ) => {
    return formatPriceHelper(
      amountXOF,
      options?.targetCurrency || DEFAULT_CURRENCY,
      {},
      "fr-FR",
      options
    );
  },
  refreshRates: async () => {},
  isLoading: false,
};

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  return ctx || defaultCurrencyValue;
}
