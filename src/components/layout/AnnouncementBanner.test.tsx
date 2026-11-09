import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { AnnouncementBanner } from "./AnnouncementBanner";

let roots: Root[] = [];

async function renderBanner(text: string): Promise<HTMLDivElement> {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.push(root);

  await act(async () => {
    root.render(<AnnouncementBanner text={text} />);
  });

  return container;
}

describe("AnnouncementBanner", () => {
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

  afterEach(() => {
    roots.forEach((r) => r.unmount());
    roots = [];
    document.body.innerHTML = "";
    window.matchMedia = originalMatchMedia;
    vi.restoreAllMocks();
  });

  it("bandeau masqué avec 0 message", async () => {
    const containerEmpty = await renderBanner("");
    expect(containerEmpty.querySelector('[role="status"]')).toBeNull();

    const containerSpaces = await renderBanner("   \n   \n");
    expect(containerSpaces.querySelector('[role="status"]')).toBeNull();
  });

  it("bandeau fixe avec 1 message", async () => {
    const container = await renderBanner("Livraison offerte dès 50 000 FCFA.");

    const banner = container.querySelector('[role="status"]');
    expect(banner).not.toBeNull();
    expect(banner?.textContent).toContain("Livraison offerte dès 50 000 FCFA.");

    // Un seul message : pas de piste défilante (track)
    const track = container.querySelector('[class*="track"]');
    expect(track).toBeNull();
  });

  it("bandeau défilant avec 2 messages ou plus", async () => {
    const container = await renderBanner("Livraison offerte à Lomé.\nNouvelle collection disponible.");

    const banner = container.querySelector('[role="status"]');
    expect(banner).not.toBeNull();

    // 2 messages : la piste défilante (track) est présente avec les messages et séparateurs
    const track = container.querySelector('[class*="track"]');
    expect(track).not.toBeNull();
    expect(track?.textContent).toContain("Livraison offerte à Lomé.");
    expect(track?.textContent).toContain("Nouvelle collection disponible.");
    expect(track?.textContent).toContain("•");
  });

  it("bandeau fixe avec prefers-reduced-motion (affiche le premier message)", async () => {
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

    const container = await renderBanner("Premier message.\nDeuxième message.");

    const banner = container.querySelector('[role="status"]');
    expect(banner).not.toBeNull();

    // En reduced motion : le premier message est affiché fixe, pas de piste animée
    const track = container.querySelector('[class*="track"]');
    expect(track).toBeNull();
    expect(banner?.textContent).toContain("Premier message.");
    expect(banner?.textContent).not.toContain("Deuxième message.");
  });
});

