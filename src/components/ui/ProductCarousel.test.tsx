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

  it("les flèches du Carousel défilent (clic sur suivant et précédent appelle scrollBy)", async () => {
    await act(async () => {
      root!.render(
        <ProductCarousel ariaLabel="Derniers drops">
          <div>Produit 1</div>
          <div>Produit 2</div>
          <div>Produit 3</div>
        </ProductCarousel>
      );
    });

    const track = container!.querySelector('[role="region"]') as HTMLDivElement;
    expect(track).not.toBeNull();
    track.scrollBy = vi.fn();

    // Simuler le débordement scrollable dans JSDOM
    Object.defineProperty(track, "clientWidth", { value: 300, configurable: true });
    Object.defineProperty(track, "scrollWidth", { value: 1000, configurable: true });
    Object.defineProperty(track, "scrollLeft", { value: 50, configurable: true, writable: true });

    await act(async () => {
      track.dispatchEvent(new Event("scroll"));
    });

    const nextBtn = container!.querySelector(
      'button[aria-label="Produits suivants"]'
    ) as HTMLButtonElement;
    const prevBtn = container!.querySelector(
      'button[aria-label="Produits précédents"]'
    ) as HTMLButtonElement;

    expect(nextBtn).not.toBeNull();
    expect(prevBtn).not.toBeNull();
    expect(nextBtn.disabled).toBe(false);
    expect(prevBtn.disabled).toBe(false);

    // Clic sur suivant
    await act(async () => {
      nextBtn.click();
    });
    expect(track.scrollBy).toHaveBeenCalledWith(
      expect.objectContaining({
        left: expect.any(Number),
      })
    );

    // Clic sur précédent
    await act(async () => {
      prevBtn.click();
    });
    expect(track.scrollBy).toHaveBeenCalledTimes(2);
  });

  it("affiche le compteur au format 01 / 03 et s'adapte au nombre d'éléments", async () => {
    await act(async () => {
      root!.render(
        <ProductCarousel ariaLabel="Derniers drops">
          <div>Produit 1</div>
          <div>Produit 2</div>
          <div>Produit 3</div>
        </ProductCarousel>
      );
    });

    const counter = container!.querySelector('[class*="counter"]');
    expect(counter).not.toBeNull();
    expect(counter?.textContent).toContain("01");
    expect(counter?.textContent).toContain("/");
    expect(counter?.textContent).toContain("03");
  });

  it("gère l'autoPlay et la mise en pause au survol, focus et visibilité", async () => {
    vi.useFakeTimers();

    await act(async () => {
      root!.render(
        <ProductCarousel autoPlay autoPlayInterval={5000} ariaLabel="Derniers drops">
          <div>Produit 1</div>
          <div>Produit 2</div>
          <div>Produit 3</div>
        </ProductCarousel>
      );
    });

    const wrapper = container!.firstElementChild as HTMLElement;
    const track = container!.querySelector('[role="region"]') as HTMLDivElement;
    track.scrollBy = vi.fn();
    track.scrollTo = vi.fn();

    expect(wrapper.getAttribute("data-autoplay")).toBe("true");
    expect(wrapper.getAttribute("data-paused")).toBe("false");

    // Avancement après 5000 ms
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(track.scrollBy).toHaveBeenCalled();

    // Pause au survol
    await act(async () => {
      wrapper.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      wrapper.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    });
    expect(wrapper.getAttribute("data-paused")).toBe("true");

    const callCountAfterHover = (track.scrollBy as any).mock.calls.length;
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect((track.scrollBy as any).mock.calls.length).toBe(callCountAfterHover);

    // Fin du survol
    await act(async () => {
      wrapper.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
      wrapper.dispatchEvent(new MouseEvent("mouseout", { bubbles: true }));
    });
    expect(wrapper.getAttribute("data-paused")).toBe("false");

    // Pause au focus
    await act(async () => {
      track.focus();
      track.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    });
    expect(wrapper.getAttribute("data-paused")).toBe("true");

    vi.useRealTimers();
  });

  it("arrête l'autoPlay lorsque prefers-reduced-motion est activé", async () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    await act(async () => {
      root!.render(
        <ProductCarousel autoPlay ariaLabel="Derniers drops">
          <div>Produit 1</div>
          <div>Produit 2</div>
        </ProductCarousel>
      );
    });

    const wrapper = container!.firstElementChild as HTMLElement;
    expect(wrapper.getAttribute("data-paused")).toBe("true");
  });

  it("supporte le glisser à la souris (mouse drag)", async () => {
    await act(async () => {
      root!.render(
        <ProductCarousel ariaLabel="Derniers drops">
          <div>Produit 1</div>
          <div>Produit 2</div>
          <div>Produit 3</div>
        </ProductCarousel>
      );
    });

    const track = container!.querySelector('[role="region"]') as HTMLDivElement;
    Object.defineProperty(track, "offsetLeft", { value: 0, configurable: true });
    let currentScroll = 0;
    Object.defineProperty(track, "scrollLeft", {
      get: () => currentScroll,
      set: (val: number) => {
        currentScroll = val;
      },
      configurable: true,
    });

    // Mouse down
    await act(async () => {
      track.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true, button: 0, clientX: 100 })
      );
    });

    expect(track.className).toContain("isDragging");

    // Mouse move
    await act(async () => {
      track.dispatchEvent(
        new MouseEvent("mousemove", { bubbles: true, clientX: 50 })
      );
    });

    // scrollLeft a été augmenté (100 - 50 = 50)
    expect(track.scrollLeft).toBe(50);

    // Mouse up
    await act(async () => {
      track.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    });

    expect(track.className).not.toContain("isDragging");
  });
});

