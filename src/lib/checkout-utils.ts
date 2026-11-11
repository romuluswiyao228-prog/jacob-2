/**
 * Helpers purs pour la page de commande simplifiée.
 * Aucune dépendance React ni Supabase : facilement testables.
 */

export interface CheckoutZone {
  name: string;
  countries: string[];
  regions: string[] | null;
  is_active?: boolean;
  shipping_rates?: { price: number; is_active: boolean }[];
}

export interface CheckoutZoneInfo {
  zone: CheckoutZone;
  price: number;
}

/** Villes proposées : toutes les régions (villes) des zones actives. */
export function collectCheckoutCities(zones: CheckoutZone[]): string[] {
  const cities = new Set<string>();
  for (const zone of zones) {
    if (zone.is_active === false) continue;
    for (const region of zone.regions ?? []) {
      const city = region?.trim();
      if (city) cities.add(city);
    }
  }
  return Array.from(cities).sort((a, b) => a.localeCompare(b, "fr"));
}

/** Pays distincts couverts par les zones actives. */
export function collectCheckoutCountries(zones: CheckoutZone[]): string[] {
  const countries = new Set<string>();
  for (const zone of zones) {
    if (zone.is_active === false) continue;
    for (const country of zone.countries ?? []) {
      const c = country?.trim();
      if (c) countries.add(c);
    }
  }
  return Array.from(countries).sort((a, b) => a.localeCompare(b, "fr"));
}

/** Le sélecteur de pays ne s'affiche que si plusieurs pays sont couverts. */
export function shouldShowCountrySelector(zones: CheckoutZone[]): boolean {
  return collectCheckoutCountries(zones).length > 1;
}

/** « Lomé » est sélectionnée par défaut si elle figure dans les villes connues. */
export function defaultCheckoutCity(zones: CheckoutZone[]): string {
  const cities = collectCheckoutCities(zones);
  const lome = cities.find((c) => c.toLowerCase() === "lomé");
  return lome ?? cities[0] ?? "";
}

/**
 * Même règle que la fonction SQL place_order :
 * au moins une coordonnée GPS (lat ET lng), un lien Google Maps
 * ou un point de repère d'au moins 5 caractères.
 */
export function hasDeliveryPosition(input: {
  lat?: number | null;
  lng?: number | null;
  mapsLink?: string | null;
  landmark?: string | null;
}): boolean {
  const hasCoords = input.lat != null && input.lng != null;
  const hasLink = Boolean(input.mapsLink && input.mapsLink.trim());
  const landmark = input.landmark?.trim() ?? "";
  return hasCoords || hasLink || landmark.length >= 5;
}

/**
 * Valide un lien Google Maps comme le serveur :
 * https:// obligatoire, ≤ 300 caractères, domaines autorisés
 * (maps.app.goo.gl, maps.google.com, goo.gl/maps, google.com/maps).
 * Retourne null si valide, sinon un message d'erreur en français.
 */
export function mapsLinkError(link: string): string | null {
  const value = link.trim();
  if (!value) return null;
  if (value.length > 300) {
    return "Le lien de position ne doit pas dépasser 300 caractères.";
  }
  if (!/^https:\/\//i.test(value)) {
    return "Le lien de position doit commencer par https://";
  }

  const rest = value.slice(8).toLowerCase();
  const slashPos = rest.indexOf("/");
  const host = slashPos === -1 ? rest : rest.slice(0, slashPos);
  const path = slashPos === -1 ? "/" : rest.slice(slashPos);

  const ok =
    host === "maps.app.goo.gl" ||
    host === "maps.google.com" ||
    ((host === "goo.gl" || host.endsWith(".goo.gl") ||
      host === "google.com" || host.endsWith(".google.com")) &&
      path.startsWith("/maps"));

  if (!ok) {
    return "Le lien doit pointer vers Google Maps (maps.app.goo.gl, goo.gl/maps, google.com/maps ou maps.google.com).";
  }
  return null;
}

/**
 * Calcule les frais de livraison affichés avant validation :
 * même logique que l'ancienne page — zone couvrant le pays,
 * priorité à la zone dont une région correspond à la ville,
 * sinon zone générale ; tarif actif le moins cher.
 */
export function matchShippingFee(
  zones: CheckoutZone[],
  country: string,
  city: string
): CheckoutZoneInfo | null {
  const countryLc = country.trim().toLowerCase();
  const cityLc = city.trim().toLowerCase();
  if (!countryLc) return null;

  const eligible = zones.filter((zone) =>
    (zone.countries ?? []).some((c) => c.trim().toLowerCase() === countryLc)
  );
  if (eligible.length === 0) return null;

  const specific = eligible.find(
    (zone) =>
      (zone.regions?.length ?? 0) > 0 &&
      zone.regions!.some((r) => r.trim().toLowerCase() === cityLc)
  );
  const general = eligible.find(
    (zone) => !zone.regions || zone.regions.length === 0
  );
  const target = specific ?? general;
  if (!target) return null;

  const rate = (target.shipping_rates ?? [])
    .filter((r) => r.is_active !== false)
    .sort((a, b) => a.price - b.price)[0];
  if (!rate) return null;

  return { zone: target, price: rate.price };
}

/** URL Google Maps pour les coordonnées GPS enregistrées. */
export function googleMapsCoordsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}
