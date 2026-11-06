import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ProductCarousel } from "./ProductCarousel";

describe("ProductCarousel", () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
      root = null;
    }
    if (container) {
      container.remove();
      container = null;
    }
  });

  it("rend les cartes enfants dans le conteneur scrollable avec les attributs d'accessibilité", async () => {
    await act(async () => {
      root!.render(
        <ProductCarousel ariaLabel="Derniers drops">
          <div>Carte 1</div>
          <div>Carte 2</div>
          <div>Carte 3</div>
        </ProductCarousel>
      );
    });

    const track = container!.querySelector('[role="region"]');
    expect(track).not.toBeNull();
    expect(track?.getAttribute("aria-label")).toBe("Derniers drops");
    expect(track?.getAttribute("tabindex")).toBe("0");

    expect(container!.textContent).toContain("Carte 1");
    expect(container!.textContent).toContain("Carte 2");
    expect(container!.textContent).toContain("Carte 3");

    const items = container!.querySelectorAll('[role="region"] > div');
    expect(items.length).toBe(3);
  });

  it("affiche les flèches de navigation précédent et suivant avec libellés accessibles", async () => {
    await act(async () => {
      root!.render(
        <ProductCarousel ariaLabel="Derniers drops">
          <div>Produit 1</div>
          <div>Produit 2</div>
        </ProductCarousel>
      );
    });

    const prevBtn = container!.querySelector('button[aria-label="Produits précédents"]');
    const nextBtn = container!.querySelector('button[aria-label="Produits suivants"]');

    expect(prevBtn).not.toBeNull();
    expect(nextBtn).not.toBeNull();
    // Au début, la flèche précédent est désactivée
    expect((prevBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it("supporte la navigation au clavier via les flèches gauche et droite", async () => {
    await act(async () => {
      root!.render(
        <ProductCarousel ariaLabel="Derniers drops">
          <div>Produit A</div>
          <div>Produit B</div>
          <div>Produit C</div>
        </ProductCarousel>
      );
    });

    const track = container!.querySelector('[role="region"]') as HTMLDivElement;
    expect(track).not.toBeNull();

    // Mock scrollBy
    track.scrollBy = vi.fn();

    // Appui sur ArrowRight
    await act(async () => {
      const event = new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true });
      track.dispatchEvent(event);
    });
    expect(track.scrollBy).toHaveBeenCalled();

    // Appui sur ArrowLeft
    await act(async () => {
      const event = new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true });
      track.dispatchEvent(event);
    });
    expect(track.scrollBy).toHaveBeenCalledTimes(2);
  });

  it("ne rend rien (null) s'il n'y a aucun enfant", async () => {
    await act(async () => {
      root!.render(<ProductCarousel ariaLabel="Vide">{[]}</ProductCarousel>);
    });

    expect(container!.children.length).toBe(0);
  });
});

