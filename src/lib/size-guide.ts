// Guide des tailles international : correspondances EU / US / UK / international / cm.
// Données indicatives — les marques peuvent varier légèrement.

export interface SizeGuideRow {
  intl: string;
  eu: string;
  us: string;
  uk: string;
  cm: string;
}

export interface SizeGuideSection {
  id: string;
  title: string;
  headers: [string, string, string, string, string];
  rows: SizeGuideRow[];
}

const CLOTHING_ROWS: SizeGuideRow[] = [
  { intl: "XS", eu: "36", us: "2", uk: "8", cm: "80-84" },
  { intl: "S", eu: "38", us: "4-6", uk: "10-12", cm: "84-88" },
  { intl: "M", eu: "40", us: "8-10", uk: "14-16", cm: "88-94" },
  { intl: "L", eu: "42", us: "12-14", uk: "18-20", cm: "94-100" },
  { intl: "XL", eu: "44", us: "16-18", uk: "22-24", cm: "100-106" },
  { intl: "XXL / 2XL", eu: "46", us: "20-22", uk: "26-28", cm: "106-112" },
  { intl: "XXXL / 3XL", eu: "48-50", us: "24-26", uk: "30-32", cm: "112-120" },
  { intl: "4XL", eu: "52-54", us: "28-30", uk: "34-36", cm: "120-128" },
  { intl: "5XL", eu: "56-58", us: "32-34", uk: "38-40", cm: "128-138" },
  { intl: "6XL", eu: "60+", us: "36+", uk: "42+", cm: "138+" },
];

const PANTS_ROWS: SizeGuideRow[] = [
  { intl: "26", eu: "38", us: "26-27", uk: "26", cm: "64-66" },
  { intl: "28", eu: "40", us: "28-29", uk: "28", cm: "68-70" },
  { intl: "30", eu: "42", us: "30-31", uk: "30", cm: "72-74" },
  { intl: "32", eu: "44", us: "32-33", uk: "32", cm: "76-78" },
  { intl: "34", eu: "46", us: "34-35", uk: "34", cm: "80-82" },
  { intl: "36", eu: "48", us: "36-37", uk: "36", cm: "84-86" },
  { intl: "38", eu: "50", us: "38-39", uk: "38", cm: "88-90" },
  { intl: "40", eu: "52", us: "40-41", uk: "40", cm: "92-94" },
  { intl: "42", eu: "54", us: "42-43", uk: "42", cm: "96-98" },
  { intl: "44", eu: "56", us: "44-45", uk: "44", cm: "100-102" },
  { intl: "46", eu: "58", us: "46-47", uk: "46", cm: "104-106" },
  { intl: "48", eu: "60", us: "48-49", uk: "48", cm: "108-110" },
  { intl: "50", eu: "62", us: "50", uk: "50", cm: "112-114" },
];

const SHOES_ROWS: SizeGuideRow[] = [
  { intl: "36", eu: "36", us: "4", uk: "3.5", cm: "22.5" },
  { intl: "37", eu: "37", us: "5", uk: "4.5", cm: "23.0" },
  { intl: "38", eu: "38", us: "6", uk: "5.5", cm: "23.5" },
  { intl: "39", eu: "39", us: "6.5-7", uk: "6-6.5", cm: "24.0" },
  { intl: "40", eu: "40", us: "7-7.5", uk: "6.5-7", cm: "24.5" },
  { intl: "41", eu: "41", us: "8", uk: "7.5", cm: "25.0" },
  { intl: "42", eu: "42", us: "8.5-9", uk: "8-8.5", cm: "25.5" },
  { intl: "43", eu: "43", us: "9-9.5", uk: "8.5-9", cm: "26.0" },
  { intl: "44", eu: "44", us: "10", uk: "9.5", cm: "26.5" },
  { intl: "45", eu: "45", us: "10.5-11", uk: "10-10.5", cm: "27.0" },
  { intl: "46", eu: "46", us: "11-11.5", uk: "10.5-11", cm: "27.5" },
  { intl: "47", eu: "47", us: "12", uk: "11.5", cm: "28.0" },
  { intl: "48", eu: "48", us: "12.5-13", uk: "12-12.5", cm: "28.5" },
  { intl: "49", eu: "49", us: "13-13.5", uk: "13", cm: "29.0" },
  { intl: "50", eu: "50", us: "14", uk: "13.5", cm: "29.5" },
];

const HEADERS = ["Intl.", "EU", "US", "UK", "Mesure (cm)"] as [string, string, string, string, string];

const SECTIONS: Record<string, SizeGuideSection[]> = {
  vetements: [
    {
      id: "vetements",
      title: "Vêtements — tour de poitrine (cm)",
      headers: HEADERS,
      rows: CLOTHING_ROWS,
    },
  ],
  pantalons: [
    {
      id: "pantalons",
      title: "Pantalons — tour de taille (cm)",
      headers: HEADERS,
      rows: PANTS_ROWS,
    },
  ],
  "pointures-eu": [
    {
      id: "pointures",
      title: "Pointures chaussures — longueur du pied (cm)",
      headers: HEADERS,
      rows: SHOES_ROWS,
    },
  ],
  "pointures-us": [
    {
      id: "pointures",
      title: "Pointures chaussures — longueur du pied (cm)",
      headers: HEADERS,
      rows: SHOES_ROWS,
    },
  ],
  "pointures-uk": [
    {
      id: "pointures",
      title: "Pointures chaussures — longueur du pied (cm)",
      headers: HEADERS,
      rows: SHOES_ROWS,
    },
  ],
  lingerie: [
    {
      id: "lingerie",
      title: "Sous-vêtements — tour de poitrine (cm)",
      headers: HEADERS,
      rows: CLOTHING_ROWS.slice(0, 8),
    },
  ],
};

/** Retourne les sections de guide adaptées à la clé du système de tailles du produit. */
export function getSizeGuideSections(systemKey?: string | null): SizeGuideSection[] {
  if (!systemKey) return [];
  return SECTIONS[systemKey] ?? [];
}
