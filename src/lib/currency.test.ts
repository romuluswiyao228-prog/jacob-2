import { describe, it, expect } from "vitest";
import {
  convertPrice,
  formatPrice,
  isRateStale,
  EUR_XOF_PARITY,
  MAX_RATE_AGE_MS,
  getCurrencyDisplayName,
  getSupportedBrowserCurrencies,
  type ExchangeRateMap,
} from "./currency";

describe("Multi-currency conversion & formatting system", () => {
  const now = new Date("2026-11-02T12:00:00Z").getTime();
  const recentDate = new Date("2026-11-01T12:00:00Z").toISOString(); // 1 jour avant
  const staleDate = new Date(now - MAX_RATE_AGE_MS - 3600000).toISOString(); // 7 jours + 1 heure

  const sampleRates: ExchangeRateMap = {
    EUR: {
      taux: 1 / EUR_XOF_PARITY,
      mis_a_jour: recentDate,
    },
    USD: {
      taux: 0.0016, // 1 XOF = 0.0016 USD
      mis_a_jour: recentDate,
    },
    JPY: {
      taux: 0.25, // 1 XOF = 0.25 JPY
      mis_a_jour: recentDate,
    },
    CAD: {
      taux: 0.0022,
      mis_a_jour: staleDate, // périmé !
    },
  };

  describe("EUR avec parité fixe exacte", () => {
    it("utilise la parité fixe exacte 1 EUR = 655,957 XOF", () => {
      const amountXOF = 655957;
      const res = convertPrice(amountXOF, "EUR", sampleRates, now);
      expect(res.isConverted).toBe(true);
      expect(res.currency).toBe("EUR");
      expect(res.amount).toBe(1000);
    });

    it("calcule avec précision pour n'importe quel montant XOF", () => {
      const amountXOF = 10000;
      const res = convertPrice(amountXOF, "EUR", sampleRates, now);
      expect(res.isConverted).toBe(true);
      expect(res.currency).toBe("EUR");
      expect(res.amount).toBeCloseTo(10000 / 655.957, 5);
    });
  });

  describe("Conversion et calcul des autres devises", () => {
    it("convertit correctement vers USD avec le taux fourni", () => {
      const res = convertPrice(50000, "USD", sampleRates, now);
      expect(res.isConverted).toBe(true);
      expect(res.currency).toBe("USD");
      expect(res.amount).toBe(80); // 50000 * 0.0016 = 80
    });

    it("gère 0 XOF sans erreur", () => {
      const res = convertPrice(0, "USD", sampleRates, now);
      expect(res.isConverted).toBe(false);
      expect(res.amount).toBe(0);
      expect(res.currency).toBe("XOF");
    });

    it("renvoie le montant XOF non converti quand la devise cible est XOF", () => {
      const res = convertPrice(25000, "XOF", sampleRates, now);
      expect(res.isConverted).toBe(false);
      expect(res.amount).toBe(25000);
      expect(res.currency).toBe("XOF");
    });
  });

  describe("Repli sur le XOF (fallback)", () => {
    it("retombe sur le XOF si le taux est manquant", () => {
      const res = convertPrice(25000, "GBP", sampleRates, now);
      expect(res.isConverted).toBe(false);
      expect(res.currency).toBe("XOF");
      expect(res.amount).toBe(25000);
    });

    it("retombe sur le XOF si le taux est périmé (> 7 jours)", () => {
      const res = convertPrice(30000, "CAD", sampleRates, now);
      expect(res.isConverted).toBe(false);
      expect(res.currency).toBe("XOF");
      expect(res.amount).toBe(30000);
      expect(res.stale).toBe(true);
    });

    it("retombe sur le XOF pour l'EUR si le taux EUR est marqué périmé", () => {
      const staleEurRates: ExchangeRateMap = {
        EUR: {
          taux: 1 / EUR_XOF_PARITY,
          mis_a_jour: staleDate,
        },
      };
      const res = convertPrice(15000, "EUR", staleEurRates, now);
      expect(res.isConverted).toBe(false);
      expect(res.currency).toBe("XOF");
      expect(res.amount).toBe(15000);
    });
  });

  describe("Formatage des devises (Intl.NumberFormat)", () => {
    it("affiche le signe « ≈ » quand la devise n'est pas le XOF", () => {
      const formatted = formatPrice(655957, "EUR", sampleRates, "fr-FR");
      expect(formatted).toContain("≈");
      expect(formatted).toContain("1");
      expect(formatted).toContain("000");
    });

    it("n'affiche PAS le signe « ≈ » pour les montants en XOF", () => {
      const formatted = formatPrice(50000, "XOF", sampleRates, "fr-FR");
      expect(formatted).not.toContain("≈");
      expect(formatted).toMatch(/50[\s\u00a0]000/);
    });

    it("gère les devises sans décimales comme le JPY (Yen japonais)", () => {
      // 10000 XOF * 0.25 = 2500 JPY (pas de décimales en JPY)
      const formatted = formatPrice(10000, "JPY", sampleRates, "fr-FR");
      expect(formatted).toContain("≈");
      expect(formatted).toMatch(/2[\s\u00a0]500/);
      expect(formatted).not.toContain(",00");
    });

    it("n'affiche pas de décimales pour le XOF", () => {
      const formatted = formatPrice(12345, "XOF", sampleRates, "fr-FR");
      expect(formatted).not.toContain(",00");
      expect(formatted).not.toContain(".00");
      expect(formatted).toMatch(/12[\s\u00a0]345/);
    });

    it("supporte l'option hideApprox", () => {
      const formatted = formatPrice(655957, "EUR", sampleRates, "fr-FR", {
        hideApprox: true,
      });
      expect(formatted).not.toContain("≈");
      expect(formatted).toContain("1");
    });
  });

  describe("Vérification de péremption des taux (isRateStale)", () => {
    it("identifie les taux récents comme valides", () => {
      expect(isRateStale(recentDate, now)).toBe(false);
    });

    it("identifie les taux de plus de 7 jours comme périmés", () => {
      expect(isRateStale(staleDate, now)).toBe(true);
    });

    it("traite les dates nulles ou invalides comme périmées", () => {
      expect(isRateStale(null)).toBe(true);
      expect(isRateStale(undefined)).toBe(true);
      expect(isRateStale("invalid-date")).toBe(true);
    });
  });

  describe("Noms localisés et devises du navigateur", () => {
    it("retourne le nom en français d'une devise", () => {
      const nameEur = getCurrencyDisplayName("EUR", "fr");
      expect(nameEur.toLowerCase()).toContain("euro");

      const nameUsd = getCurrencyDisplayName("USD", "fr");
      expect(nameUsd.toLowerCase()).toContain("dollar");
    });

    it("fournit une liste de devises supportées", () => {
      const list = getSupportedBrowserCurrencies();
      expect(list.length).toBeGreaterThan(0);
      expect(list).toContain("XOF");
      expect(list).toContain("EUR");
      expect(list).toContain("USD");
    });
  });
});

