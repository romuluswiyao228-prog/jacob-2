import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Marquee } from "./Marquee";

let roots: Root[] = [];

async function renderMarquee(
  props: React.ComponentProps<typeof Marquee>
): Promise<HTMLDivElement> {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.push(root);

  await act(async () => {
    root.render(<Marquee {...props} />);
  });

  return container;
}

describe("Marquee", () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(async () => {
    for (const r of roots) {
      await act(async () => {
        r.unmount();
      });
    }
    roots = [];
    document.body.innerHTML = "";
    window.matchMedia = originalMatchMedia;
    vi.restoreAllMocks();
  });

  it("duplique le contenu pour la boucle infinie avec la copie en aria-hidden", async () => {
    const container = await renderMarquee({
      children: <span>JACOB DE JESUS</span>,
    });

    const hiddenCopies = container.querySelectorAll('[aria-hidden="true"]');
    expect(hiddenCopies.length).toBeGreaterThanOrEqual(1);
    expect(hiddenCopies[0].textContent).toContain("JACOB DE JESUS");

    const track = container.querySelector('[class*="track"]');
    expect(track).not.toBeNull();
    // Les deux blocs (normal et aria-hidden) sont présents
    expect(track?.children.length).toBe(2);
  });

  it("arrête l'animation et permet le défilement manuel avec prefers-reduced-motion", async () => {
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

    const container = await renderMarquee({
      children: <span>Texte calme</span>,
    });

    const marquee = container.querySelector('[class*="marquee"]');
    const track = container.querySelector('[class*="track"]') as HTMLElement;

    expect(marquee?.getAttribute("data-reduced-motion")).toBe("true");
    expect(track?.style.animation).toBe("none");
  });

  it("applique les classes de pause au survol et au focus", async () => {
    const container = await renderMarquee({
      pauseOnHover: true,
      pauseOnFocus: true,
      children: <span>Pause me</span>,
    });

    const marquee = container.querySelector('[class*="marquee"]');
    expect(marquee?.className).toContain("pauseOnHover");
    expect(marquee?.className).toContain("pauseOnFocus");
  });
});
