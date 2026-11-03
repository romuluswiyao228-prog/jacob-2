import { describe, it, expect } from "vitest";
import { getColorHex, isLightColor } from "./colors";

describe("colors helper", () => {
  it("renvoie les bonnes teintes hexadécimales pour les couleurs streetwear", () => {
    expect(getColorHex("Noir")).toBe("#111111");
    expect(getColorHex("Blanc")).toBe("#FFFFFF");
    expect(getColorHex("Ivoire")).toBe("#F7F5EE");
    expect(getColorHex("Anthracite")).toBe("#2b2b2b");
    expect(getColorHex("Sable")).toBe("#D6C6B2");
    expect(getColorHex("Kaki")).toBe("#555D50");
    expect(getColorHex("Argent Brillant")).toBe("#C0C0C0");
  });

  it("détecte correctement les couleurs claires nécessitant une bordure", () => {
    expect(isLightColor("#FFFFFF")).toBe(true);
    expect(isLightColor("#F7F5EE")).toBe(true);
    expect(isLightColor("#111111")).toBe(false);
    expect(isLightColor("#2b2b2b")).toBe(false);
  });
});

