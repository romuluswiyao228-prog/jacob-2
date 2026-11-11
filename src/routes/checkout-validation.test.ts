import { describe, it, expect } from "vitest";
import { checkoutSchema } from "@/routes/CheckoutPage";

describe("Validation du formulaire de commande simplifié (checkoutSchema)", () => {
  const validData = {
    first_name: "Awa",
    full_name: "Awa Mensah",
    phone: "+228 90 12 34 56",
    city: "Lomé",
    country: "Togo",
    landmark: "En face de la pharmacie",
  };

  it("valide des données complètes avec un point de repère", () => {
    const result = checkoutSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("valide avec des coordonnées GPS (lat et lng)", () => {
    const result = checkoutSchema.safeParse({
      ...validData,
      lat: 6.1319,
      lng: 1.2228,
      landmark: "",
    });
    expect(result.success).toBe(true);
  });

  it("valide avec un lien Google Maps", () => {
    const result = checkoutSchema.safeParse({
      ...validData,
      maps_link: "https://maps.app.goo.gl/ExempleValide123",
      landmark: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejette sans aucun élément de position", () => {
    const result = checkoutSchema.safeParse({ ...validData, landmark: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.errors.some((e) =>
          e.message.includes("Indiquez votre position")
        )
      ).toBe(true);
    }
  });

  it("rejette un repère de moins de 5 caractères sans autre position", () => {
    const result = checkoutSchema.safeParse({ ...validData, landmark: "Phar" });
    expect(result.success).toBe(false);
  });

  it("rejette un lien Google Maps invalide (hors Google)", () => {
    const result = checkoutSchema.safeParse({
      ...validData,
      maps_link: "https://exemple.com/faux",
      landmark: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.errors.some((e) => e.message.includes("Google Maps"))
      ).toBe(true);
    }
  });

  it("rejette lat sans lng", () => {
    const result = checkoutSchema.safeParse({
      ...validData,
      lat: 6.13,
      landmark: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejette une latitude hors limites", () => {
    const result = checkoutSchema.safeParse({
      ...validData,
      lat: 91,
      lng: 1.2,
      landmark: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejette un prénom vide", () => {
    const result = checkoutSchema.safeParse({ ...validData, first_name: " " });
    expect(result.success).toBe(false);
  });

  it("rejette un nom complet vide", () => {
    const result = checkoutSchema.safeParse({ ...validData, full_name: " " });
    expect(result.success).toBe(false);
  });

  it("rejette un nom complet d'un seul caractère", () => {
    const result = checkoutSchema.safeParse({ ...validData, full_name: "A" });
    expect(result.success).toBe(false);
  });

  it("rejette un téléphone invalide", () => {
    const result = checkoutSchema.safeParse({ ...validData, phone: "123" });
    expect(result.success).toBe(false);
  });

  it("rejette une ville vide", () => {
    const result = checkoutSchema.safeParse({ ...validData, city: "  " });
    expect(result.success).toBe(false);
  });

  it("accepte un pays absent (facultatif)", () => {
    const { country, ...withoutCountry } = validData;
    const result = checkoutSchema.safeParse(withoutCountry);
    expect(result.success).toBe(true);
  });

  it("aucun champ e-mail n'est présent dans le schéma", () => {
    const result = checkoutSchema.safeParse({
      ...validData,
      email: "client@example.com",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect("email" in result.data).toBe(false);
      expect(result.data).not.toHaveProperty("email");
    }
  });
});
