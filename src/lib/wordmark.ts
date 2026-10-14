// Largeurs (en em) des capitales de la police Anton, mesurees sur le fichier
// de la police. Elles servent a dimensionner le logotype pour qu'il remplisse
// la largeur de l'ecran sans deborder, quel que soit le nom de la boutique.
const ADVANCE: Record<string, number> = {
  "A": 0.485,
  "B": 0.479,
  "C": 0.474,
  "D": 0.493,
  "E": 0.412,
  "F": 0.399,
  "G": 0.485,
  "H": 0.499,
  "I": 0.227,
  "J": 0.466,
  "K": 0.472,
  "L": 0.397,
  "M": 0.746,
  "N": 0.498,
  "O": 0.486,
  "P": 0.472,
  "Q": 0.494,
  "R": 0.477,
  "S": 0.461,
  "T": 0.396,
  "U": 0.474,
  "V": 0.469,
  "W": 0.712,
  "X": 0.484,
  "Y": 0.446,
  "Z": 0.41,
  "0": 0.494,
  "1": 0.331,
  "2": 0.494,
  "3": 0.494,
  "4": 0.494,
  "5": 0.494,
  "6": 0.494,
  "7": 0.494,
  "8": 0.494,
  "9": 0.494,
  " ": 0.234,
  "&": 0.52,
  "'": 0.214,
  "-": 0.311,
  ".": 0.229,
  ",": 0.236,
  "!": 0.229,
  "?": 0.492,
  ":": 0.242,
};

const FALLBACK_ADVANCE = 0.5;
const TRACKING = 0.01;

function baseChar(char: string): string {
  return char
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

export function lineWidthEm(line: string): number {
  let total = 0;
  for (const char of line) {
    total += (ADVANCE[baseChar(char)] ?? FALLBACK_ADVANCE) + TRACKING;
  }
  return total;
}

/** Coupe le nom en deux lignes : premier mot, puis le reste. */
export function splitWordmark(name: string): string[] {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return [words[0] ?? ""];
  return [words[0], words.slice(1).join(" ")];
}

/** Taille de police (en vw) pour que la ligne la plus large tienne dans l'ecran. */
export function wordmarkSize(
  lines: string[],
  availableVw = 90,
  maxVw = 34
): string {
  const widest = Math.max(...lines.map(lineWidthEm), 1);
  return `${Math.min(availableVw / widest, maxVw).toFixed(2)}vw`;
}
