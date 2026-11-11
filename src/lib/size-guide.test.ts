import { describe, it, expect } from "vitest";
import { getSizeGuideSections } from "./size-guide";

describe("getSizeGuideSections", () => {
  it("retourne les sections vêtements pour la clé vetements", () => {
    const sections = getSizeGuideSections("vetements");
    expect(sections).toHaveLength(1);
    expect(sections[0].rows.length).toBeGreaterThan(5);
    expect(sections[0].rows[0].intl).toBe("XS");
  });

  it("retourne les pointures pour les trois systèmes de chaussures", () => {
    for (const key of ["pointures-eu", "pointures-us", "pointures-uk"]) {
      const sections = getSizeGuideSections(key);
      expect(sections).toHaveLength(1);
      expect(sections[0].rows.some((r) => r.intl === "42")).toBe(true);
    }
  });

  it("retourne les pantalons pour la clé pantalons", () => {
    const sections = getSizeGuideSections("pantalons");
    expect(sections[0].rows.some((r) => r.intl === "32")).toBe(true);
  });

  it("retourne un tableau vide pour une clé inconnue ou absente", () => {
    expect(getSizeGuideSections("inconnu")).toEqual([]);
    expect(getSizeGuideSections(null)).toEqual([]);
    expect(getSizeGuideSections(undefined)).toEqual([]);
  });
});
