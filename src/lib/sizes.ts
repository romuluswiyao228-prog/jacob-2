/**
 * Helper to sort product sizes:
 * - Numeric sizes (shoes: 38, 39, 40...) sorted numerically
 * - Clothing sizes (XS, S, M, L, XL...) sorted in standard clothing order
 */
export function sortSizes(sizes: string[]): string[] {
  const clothingOrder: Record<string, number> = {
    xxs: 1,
    xs: 2,
    s: 3,
    m: 4,
    l: 5,
    xl: 6,
    xxl: 7,
    "2xl": 7,
    xxxl: 8,
    "3xl": 8,
  };

  return [...sizes].sort((a, b) => {
    const cleanA = a.replace(/[^0-9.]/g, "");
    const cleanB = b.replace(/[^0-9.]/g, "");
    const numA = cleanA !== "" ? parseFloat(cleanA) : NaN;
    const numB = cleanB !== "" ? parseFloat(cleanB) : NaN;

    const orderA = clothingOrder[a.trim().toLowerCase()];
    const orderB = clothingOrder[b.trim().toLowerCase()];

    if (!isNaN(numA) && !isNaN(numB) && orderA === undefined && orderB === undefined) {
      return numA - numB;
    }
    if (orderA && orderB) {
      return orderA - orderB;
    }
    if (orderA) return -1;
    if (orderB) return 1;
    return a.localeCompare(b);
  });
}

export function isNoSizeCategory(categorySlug?: string | null): boolean {
  if (!categorySlug) return false;
  const slug = categorySlug.toLowerCase();
  return slug === "bijoux" || slug === "lunettes";
}
