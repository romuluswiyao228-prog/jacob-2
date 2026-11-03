/**
 * Mappage des noms de couleur en codes hexadécimaux réels
 * pour l'affichage des pastilles de couleur sur les cartes et fiches produit.
 */

export function getColorHex(colorName: string): string {
  if (!colorName) return "#222222";
  const normalized = colorName.trim().toLowerCase();

  // Noirs / Sombres
  if (normalized.includes("noir") || normalized.includes("black")) return "#111111";
  if (normalized.includes("anthracite")) return "#2b2b2b";

  // Blancs / Clairs
  if (normalized.includes("blanc") || normalized.includes("white")) return "#FFFFFF";
  if (normalized.includes("ivoire") || normalized.includes("ecru") || normalized.includes("crème")) return "#F7F5EE";

  // Gris
  if (normalized.includes("gris clair")) return "#D4D4D4";
  if (normalized.includes("gris")) return "#737373";

  // Terres / Nudes / Cuirs
  if (normalized.includes("sable") || normalized.includes("sand")) return "#D6C6B2";
  if (normalized.includes("beige") || normalized.includes("naturel")) return "#E8D8C8";
  if (normalized.includes("camel") || normalized.includes("fauve")) return "#C18A45";
  if (normalized.includes("marron") || normalized.includes("brun") || normalized.includes("ecaille") || normalized.includes("chocolat")) return "#4A2E18";

  // Verts
  if (normalized.includes("kaki") || normalized.includes("olive")) return "#555D50";
  if (normalized.includes("vert") || normalized.includes("green")) return "#2D5A27";

  // Bleus
  if (normalized.includes("marine") || normalized.includes("navy")) return "#162238";
  if (normalized.includes("bleu") || normalized.includes("blue")) return "#2563EB";

  // Rouges / Jaunes
  if (normalized.includes("bordeaux")) return "#660018";
  if (normalized.includes("rouge") || normalized.includes("red")) return "#E10600";
  if (normalized.includes("jaune") || normalized.includes("yellow")) return "#FFD400";

  // Métaux
  if (normalized.includes("argent") || normalized.includes("silver")) return "#C0C0C0";
  if (normalized.includes("or") || normalized.includes("gold")) return "#D4AF37";

  // Teinte streetwear neutre par défaut
  return "#333333";
}

export function isLightColor(hex: string): boolean {
  if (!hex) return false;
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return false;
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  // Luminance perçue
  const luminance = (r * 299 + g * 587 + b * 114) / 1000;
  return luminance > 200;
}

