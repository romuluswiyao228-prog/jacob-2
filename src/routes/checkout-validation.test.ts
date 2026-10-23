import { describe, it, expect } from "vitest";
import { checkoutSchema } from "@/routes/CheckoutPage";

describe("Validation du formulaire de commande (checkoutSchema)", () => {
  const validData = {
    first_name: "Jean",
    last_name: "Dupont",
    email: "jean.dupont@example.com",
    phone: "0102030405", // 10 chiffres -> valide
    country: "Sénégal",
    city: "Dakar",
    line1: "12 Avenue Hassan II",
    notes: "Appeler avant la livraison.",
  };

  it("valide des données complètes et correctes", () => {
    const result = checkoutSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("accepte un formulaire sans notes facultatives", () => {
    const { notes, ...withoutNotes } = validData;
    const result = checkoutSchema.safeParse(withoutNotes);
    expect(result.success).toBe(true);
  });

  it("rejette un prénom vide", () => {
    const result = checkoutSchema.safeParse({ ...validData, first_name: "   " });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toBe("Le prénom est obligatoire.");
    }
  });

  it("rejette un nom vide", () => {
    const result = checkoutSchema.safeParse({ ...validData, last_name: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toBe("Le nom est obligatoire.");
    }
  });

  it("rejette un email invalide", () => {
    const result = checkoutSchema.safeParse({ ...validData, email: "invalid-email" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toBe("Veuillez saisir une adresse e-mail valide.");
    }
  });

  it("rejette un téléphone trop court (< 8 chiffres)", () => {
    const result = checkoutSchema.safeParse({ ...validData, phone: "12345" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain("Numéro de téléphone invalide");
    }
  });

  it("rejette un téléphone trop long (> 15 chiffres)", () => {
    const result = checkoutSchema.safeParse({ ...validData, phone: "123456789012345678" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain("Numéro de téléphone invalide");
    }
  });

  it("accepte un téléphone avec formatage international", () => {
    const result = checkoutSchema.safeParse({ ...validData, phone: "+221 77 123 45 67" });
    expect(result.success).toBe(true);
  });

  it("rejette une adresse vide", () => {
    const result = checkoutSchema.safeParse({ ...validData, line1: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toBe("L'adresse de livraison est obligatoire.");
    }
  });

  it("rejette une ville vide", () => {
    const result = checkoutSchema.safeParse({ ...validData, city: "  " });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toBe("La ville est obligatoire.");
    }
  });

  it("rejette un pays vide", () => {
    const result = checkoutSchema.safeParse({ ...validData, country: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toBe("Le pays est obligatoire.");
    }
  });
});
