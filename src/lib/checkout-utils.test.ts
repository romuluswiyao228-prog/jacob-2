import { describe, it, expect } from "vitest";
import {
  collectCheckoutCities,
  collectCheckoutCountries,
  shouldShowCountrySelector,
  defaultCheckoutCity,
  hasDeliveryPosition,
  mapsLinkError,
  matchShippingFee,
  googleMapsCoordsUrl,
  type CheckoutZone,
} from "@/lib/checkout-utils";

const zones: CheckoutZone[] = [
  {
    name: "Zone Togo",
    countries: ["Togo"],
    regions: ["Lomé", "Kara"],
    shipping_rates: [
      { price: 1500, is_active: true },
      { price: 2500, is_active: true },
    ],
  },
  {
    name: "Zone Ghana",
    countries: ["Ghana"],
    regions: ["Accra"],
    shipping_rates: [{ price: 3000, is_active: true }],
  },
];

describe("checkout-utils : villes et pays", () => {
  it("collecte les villes depuis les régions des zones", () => {
    expect(collectCheckoutCities(zones)).toEqual(["Accra", "Kara", "Lomé"]);
  });

  it("Lomé est la ville par défaut si elle existe", () => {
    expect(defaultCheckoutCity(zones)).toBe("Lomé");
  });

  it("retombe sur la première ville si Lomé est absente", () => {
    const noLome: CheckoutZone[] = [
      { name: "Z", countries: ["Togo"], regions: ["Kara"], shipping_rates: [] },
    ];
    expect(defaultCheckoutCity(noLome)).toBe("Kara");
  });

  it("affiche le pays quand plusieurs pays sont couverts", () => {
    expect(shouldShowCountrySelector(zones)).toBe(true);
    expect(collectCheckoutCountries(zones)).toEqual(["Ghana", "Togo"]);
  });

  it("masque le pays quand une seule zone/pays est couverte", () => {
    const single: CheckoutZone[] = [
      { name: "Z", countries: ["Togo"], regions: ["Lomé"], shipping_rates: [] },
    ];
    expect(shouldShowCountrySelector(single)).toBe(false);
    expect(collectCheckoutCountries(single)).toEqual(["Togo"]);
  });
});

describe("checkout-utils : position de livraison", () => {
  it("accepte lat + lng", () => {
    expect(hasDeliveryPosition({ lat: 6.1, lng: 1.2 })).toBe(true);
  });

  it("accepte un lien Google Maps", () => {
    expect(
      hasDeliveryPosition({ mapsLink: "https://maps.app.goo.gl/abc" })
    ).toBe(true);
  });

  it("accepte un repère d'au moins 5 caractères", () => {
    expect(hasDeliveryPosition({ landmark: "Pharmacie" })).toBe(true);
  });

  it("rejette un repère trop court sans autre position", () => {
    expect(hasDeliveryPosition({ landmark: "Phar" })).toBe(false);
    expect(hasDeliveryPosition({})).toBe(false);
  });
});

describe("checkout-utils : validation du lien Google Maps", () => {
  it("accepte maps.app.goo.gl", () => {
    expect(mapsLinkError("https://maps.app.goo.gl/abc123")).toBeNull();
  });

  it("accepte maps.google.com", () => {
    expect(mapsLinkError("https://maps.google.com/?q=6.1,1.2")).toBeNull();
  });

  it("accepte goo.gl/maps", () => {
    expect(mapsLinkError("https://goo.gl/maps/xyz")).toBeNull();
  });

  it("accepte google.com/maps", () => {
    expect(mapsLinkError("https://www.google.com/maps/place/x")).toBeNull();
  });

  it("rejette un domaine hors Google", () => {
    expect(mapsLinkError("https://exemple.com/maps")).not.toBeNull();
  });

  it("rejette google.com sans chemin /maps", () => {
    expect(mapsLinkError("https://google.com/")).not.toBeNull();
  });

  it("rejette un lien sans https://", () => {
    expect(mapsLinkError("http://maps.app.goo.gl/abc")).not.toBeNull();
  });

  it("rejette un lien trop long", () => {
    expect(mapsLinkError("https://maps.app.goo.gl/" + "a".repeat(300))).not.toBeNull();
  });
});

describe("checkout-utils : frais de livraison", () => {
  it("retourne le tarif le moins cher de la zone correspondante", () => {
    const match = matchShippingFee(zones, "Togo", "Lomé");
    expect(match?.price).toBe(1500);
  });

  it("retourne null sans destination couverte", () => {
    expect(matchShippingFee(zones, "France", "Paris")).toBeNull();
  });
});

describe("checkout-utils : URL Google Maps", () => {
  it("construit l'URL des coordonnées", () => {
    expect(googleMapsCoordsUrl(6.1319, 1.2228)).toBe(
      "https://www.google.com/maps?q=6.1319,1.2228"
    );
  });
});
