import { describe, it, expect } from "vitest";
import {
  isValidWhatsAppNumber,
  orderWhatsAppMessage,
  whatsappLink,
} from "./whatsapp";

describe("whatsapp utils", () => {
  describe("isValidWhatsAppNumber", () => {
    it("accepts valid numbers between 8 and 15 digits", () => {
      expect(isValidWhatsAppNumber("01020304")).toBe(true); // 8 digits
      expect(isValidWhatsAppNumber("2250701020304")).toBe(true); // 13 digits
      expect(isValidWhatsAppNumber("123456789012345")).toBe(true); // 15 digits
    });

    it("accepts valid numbers formatted with '+', spaces, and dashes", () => {
      expect(isValidWhatsAppNumber("+225 07 01 02 03 04")).toBe(true);
      expect(isValidWhatsAppNumber("+225-07-01-02-03")).toBe(true);
      expect(isValidWhatsAppNumber("  22501020304  ")).toBe(true);
    });

    it("rejects numbers with fewer than 8 digits", () => {
      expect(isValidWhatsAppNumber("1234567")).toBe(false); // 7 digits
      expect(isValidWhatsAppNumber("123")).toBe(false);
    });

    it("rejects numbers with more than 15 digits", () => {
      expect(isValidWhatsAppNumber("1234567890123456")).toBe(false); // 16 digits
    });

    it("rejects invalid, null, undefined, and non-numeric inputs", () => {
      expect(isValidWhatsAppNumber(null)).toBe(false);
      expect(isValidWhatsAppNumber(undefined)).toBe(false);
      expect(isValidWhatsAppNumber("")).toBe(false);
      expect(isValidWhatsAppNumber("   ")).toBe(false);
      expect(isValidWhatsAppNumber("abcdefgh")).toBe(false);
      expect(isValidWhatsAppNumber("2250102abc")).toBe(false);
    });
  });

  describe("orderWhatsAppMessage", () => {
    it("builds the formatted message from an object parameter", () => {
      const msg = orderWhatsAppMessage({
        orderNumber: "CMD-2026-0042",
        total: 35000,
        customerName: "Awa Traoré",
        city: "Abidjan",
      });

      expect(msg).toContain("CMD-2026-0042");
      expect(msg).toContain("Nom : Awa Traoré");
      expect(msg).toContain("Ville : Abidjan");
      expect(msg).toContain("35 000 XOF");
      expect(msg).toContain("Pouvez-vous me confirmer la livraison ?");
    });

    it("builds the formatted message from positional arguments", () => {
      const msg = orderWhatsAppMessage(
        "CMD-101",
        "20 000 XOF",
        "Koffi Yao",
        "Bouaké"
      );

      expect(msg).toContain("CMD-101");
      expect(msg).toContain("Nom : Koffi Yao");
      expect(msg).toContain("Ville : Bouaké");
      expect(msg).toContain("Total : 20 000 XOF");
      expect(msg).toContain("Pouvez-vous me confirmer la livraison ?");
    });

    it("combines firstName and lastName when provided", () => {
      const msg = orderWhatsAppMessage({
        orderNumber: "CMD-999",
        total: 12000,
        firstName: "Marc",
        lastName: "Touré",
        city: "Yamoussoukro",
      });

      expect(msg).toContain("Nom : Marc Touré");
    });

    it("appends XOF when total is a plain number or string without XOF", () => {
      const msg = orderWhatsAppMessage({
        orderNumber: "CMD-1",
        total: "15000",
        city: "San Pedro",
      });

      expect(msg).toContain("Total : 15000 XOF");
    });
  });

  describe("whatsappLink", () => {
    it("returns null if the phone number is invalid or missing", () => {
      expect(whatsappLink(null, "test")).toBeNull();
      expect(whatsappLink(undefined, "test")).toBeNull();
      expect(whatsappLink("", "test")).toBeNull();
      expect(whatsappLink("123", "test")).toBeNull();
      expect(whatsappLink("not-a-number", "test")).toBeNull();
      expect(whatsappLink("1234567890123456", "test")).toBeNull();
    });

    it("generates wa.me URL without text parameter when message is omitted", () => {
      expect(whatsappLink("2250102030405")).toBe(
        "https://wa.me/2250102030405"
      );
      expect(whatsappLink("+225 01 02 03 04 05")).toBe(
        "https://wa.me/2250102030405"
      );
    });

    it("generates wa.me URL with encoded text parameter", () => {
      const url = whatsappLink("2250102030405", "Bonjour !");
      expect(url).toBe("https://wa.me/2250102030405?text=Bonjour%20!");
    });

    it("encodes orderWhatsAppMessage output properly in wa.me link", () => {
      const msg = orderWhatsAppMessage({
        orderNumber: "CMD-10",
        total: 25000,
        customerName: "Fatou Diop",
        city: "Abidjan",
      });

      const link = whatsappLink("+225 0707070707", msg);
      expect(link).not.toBeNull();
      expect(link).toMatch(/^https:\/\/wa\.me\/2250707070707\?text=/);
      // Decoded text must match original
      const encodedQuery = link!.split("?text=")[1];
      expect(decodeURIComponent(encodedQuery)).toBe(msg);
    });
  });
});

