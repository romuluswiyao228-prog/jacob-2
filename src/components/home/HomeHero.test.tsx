import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { HomeHero } from "./HomeHero";
import type { HomeSlide } from "@/lib/db-types";

let roots: Root[] = [];

async function renderHero(props: React.ComponentProps<typeof HomeHero>): Promise<HTMLDivElement> {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.push(root);

  await act(async () => {
    root.render(
      <MemoryRouter>
        <HomeHero {...props} />
      </MemoryRouter>
    );
  });

  return container;
}

const mockSlidesLeft: HomeSlide[] = [
  {
    id: "l1",
    image_url: "https://example.com/left1.webp",
    alt_text: "Modèle gauche 1",
    side: "left",
    sort_order: 0,
    is_active: true,
    created_at: "2026-11-10T00:00:00Z",
  },
  {
    id: "l2",
    image_url: "https://example.com/left2.webp",
    alt_text: "Modèle gauche 2",
    side: "left",
    sort_order: 1,
    is_active: true,
    created_at: "2026-11-10T00:00:00Z",
  },
];

const mockSlidesRight: HomeSlide[] = [
  {
    id: "r1",
    image_url: "https://example.com/right1.webp",
    alt_text: "Modèle droit 1",
    side: "right",
    sort_order: 0,
    is_active: true,
    created_at: "2026-11-10T00:00:00Z",
  },
  {
    id: "r2",
    image_url: "https://example.com/right2.webp",
    alt_text: "Modèle droit 2",
    side: "right",
    sort_order: 1,
    is_active: true,
    created_at: "2026-11-10T00:00:00Z",
  },
];

describe("HomeHero", () => {
  beforeEach(() => {
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
      await act(async () => r.unmount());
    }
    roots = [];
    document.body.innerHTML = "";
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("1. Repli sans photo : rend la bannière de repli si aucun slide n'est configuré", async () => {
    const container = await renderHero({
      slides: [],
      storeName: "JACOB DE JESUS",
      tagline: "Streetwear brut",
      bannerUrl: "https://example.com/banner.webp",
      intro: "Intro de la boutique",
      lines: ["JACOB", "DE JESUS"],
    });

    // La section repli a la classe hero (issue de HomePage.module.css)
    expect(container.querySelector("picture, img")).not.toBeNull();
    const cta = container.querySelector('a[href="/boutique"]');
    expect(cta?.textContent).toContain("DÉCOUVRIR LA BOUTIQUE");
  });

  it("2. Deux cadres côte à côte : rend les deux cadres photo, le titre, le slogan et les deux boutons", async () => {
    const container = await renderHero({
      slides: [...mockSlidesLeft, ...mockSlidesRight],
      storeName: "JACOB DE JESUS",
      tagline: "Streetwear brutal, épuré, intemporel.",
    });

    const leftFrame = container.querySelector('[data-testid="slide-frame-left"]');
    const rightFrame = container.querySelector('[data-testid="slide-frame-right"]');

    expect(leftFrame).not.toBeNull();
    expect(rightFrame).not.toBeNull();

    // Titre de la boutique en Anton
    const title = container.querySelector("h1");
    expect(title?.textContent).toBe("JACOB DE JESUS");

    // Phrase tagline
    expect(container.textContent).toContain("Streetwear brutal, épuré, intemporel.");

    // Deux boutons
    const btnShop = container.querySelector('a[href="/boutique"]');
    const btnNew = container.querySelector('a[href="/boutique?tri=newest"]');
    expect(btnShop?.textContent).toContain("VOIR LA BOUTIQUE");
    expect(btnNew?.textContent).toContain("NOUVEAUTÉS");

    // Première photo de chaque cadre a fetchPriority high et loading eager
    const leftImg = leftFrame?.querySelector("img");
    expect(leftImg?.getAttribute("src")).toBe("https://example.com/left1.webp");
    expect(leftImg?.getAttribute("fetchpriority")).toBe("high");
    expect(leftImg?.getAttribute("loading")).toBe("eager");
    expect(leftImg?.getAttribute("width")).toBe("800");
    expect(leftImg?.getAttribute("height")).toBe("1200");
  });

  it("3. Un côté vide : si un seul côté a des photos, il occupe toute la largeur (colonne unique)", async () => {
    const container = await renderHero({
      slides: mockSlidesLeft, // Seulement le côté gauche
      storeName: "JACOB DE JESUS",
    });

    const leftFrame = container.querySelector('[data-testid="slide-frame-left"]');
    const rightFrame = container.querySelector('[data-testid="slide-frame-right"]');

    expect(leftFrame).not.toBeNull();
    expect(rightFrame).toBeNull();

    const grid = leftFrame?.parentElement;
    expect(grid?.className).toContain("singleColumn");
  });

  it("4. Alternance des photos : alterne les photos avec décalage de 2,2 s pour le cadre droit", async () => {
    vi.useFakeTimers();

    const container = await renderHero({
      slides: [...mockSlidesLeft, ...mockSlidesRight],
      storeName: "JACOB DE JESUS",
    });

    const leftFrame = container.querySelector('[data-testid="slide-frame-left"]');
    const rightFrame = container.querySelector('[data-testid="slide-frame-right"]');

    // Au départ : index 0 pour les deux
    expect(leftFrame?.getAttribute("data-active-index")).toBe("0");
    expect(rightFrame?.getAttribute("data-active-index")).toBe("0");

    // À t = 2200ms : le cadre droit démarre 2,2 s après le gauche et passe à l'index 1
    await act(async () => {
      vi.advanceTimersByTime(2200);
    });

    expect(leftFrame?.getAttribute("data-active-index")).toBe("0");
    expect(rightFrame?.getAttribute("data-active-index")).toBe("1");

    // À t = 4500ms (soit 2300ms de plus) : le cadre gauche passe à l'index 1
    await act(async () => {
      vi.advanceTimersByTime(2300);
    });

    expect(leftFrame?.getAttribute("data-active-index")).toBe("1");
  });

  it("5. Arrêt avec prefers-reduced-motion : reste en image fixe sans alternance", async () => {
    vi.useFakeTimers();

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

    const container = await renderHero({
      slides: [...mockSlidesLeft, ...mockSlidesRight],
      storeName: "JACOB DE JESUS",
    });

    const leftFrame = container.querySelector('[data-testid="slide-frame-left"]');
    const rightFrame = container.querySelector('[data-testid="slide-frame-right"]');

    expect(leftFrame?.getAttribute("data-active-index")).toBe("0");
    expect(rightFrame?.getAttribute("data-active-index")).toBe("0");

    // Même après 10 secondes, les index restent à 0
    await act(async () => {
      vi.advanceTimersByTime(10000);
    });

    expect(leftFrame?.getAttribute("data-active-index")).toBe("0");
    expect(rightFrame?.getAttribute("data-active-index")).toBe("0");
  });

  it("6. Pause au survol et au focus", async () => {
    vi.useFakeTimers();

    const container = await renderHero({
      slides: [...mockSlidesLeft, ...mockSlidesRight],
      storeName: "JACOB DE JESUS",
    });

    const hero = container.querySelector('[data-testid="home-hero"]');
    expect(hero?.getAttribute("data-paused")).toBe("false");

    // Survol
    await act(async () => {
      hero?.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    });
    expect(hero?.getAttribute("data-paused")).toBe("true");

    // Avancement du temps pendant la pause : aucune alternance
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    const leftFrame = container.querySelector('[data-testid="slide-frame-left"]');
    expect(leftFrame?.getAttribute("data-active-index")).toBe("0");

    // Fin du survol
    await act(async () => {
      hero?.dispatchEvent(new MouseEvent("mouseout", { bubbles: true }));
      hero?.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    });
    expect(hero?.getAttribute("data-paused")).toBe("false");
  });
});
