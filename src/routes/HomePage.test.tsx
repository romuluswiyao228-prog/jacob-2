import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import HomePage from "./HomePage";

vi.mock("@/lib/hooks", () => ({
  useStoreSettings: vi.fn(),
  useCategories: vi.fn(() => ({ data: [], isLoading: false, error: null, refetch: vi.fn() })),
  useNewProducts: vi.fn(() => ({ data: [], isLoading: false, error: null, refetch: vi.fn() })),
  useBestSellers: vi.fn(() => ({ data: [], isLoading: false, error: null, refetch: vi.fn() })),
  useFeaturedProducts: vi.fn(() => ({ data: [], isLoading: false, error: null, refetch: vi.fn() })),
  usePromoProducts: vi.fn(() => ({ data: [], isLoading: false, error: null, refetch: vi.fn() })),
  useCollections: vi.fn(() => ({ data: [], isLoading: false, error: null, refetch: vi.fn() })),
}));

import { useStoreSettings } from "@/lib/hooks";

let roots: Root[] = [];

async function renderPage(): Promise<HTMLDivElement> {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.push(root);

  await act(async () => {
    root.render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );
  });

  return container;
}

describe("HomePage - Bannière et responsive picture", () => {
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

  afterEach(() => {
    roots.forEach((r) => r.unmount());
    roots = [];
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("affiche la balise <source media='(max-width: 700px)'> uniquement si banner_mobile_url existe", async () => {
    vi.mocked(useStoreSettings).mockReturnValue({
      data: {
        store_name: "JACOB DE JESUS",
        tagline: "Streetwear brutal",
        description: null,
        logo_url: null,
        banner_url: "https://example.com/banner-desktop.webp",
        banner_mobile_url: "https://example.com/banner-mobile.webp",
        email: null,
        phone: null,
        address: null,
        city: null,
        country: "Togo",
        currency: "XOF",
        social_links: {},
        about_text: null,
        about_image_url: null,
        legal_mentions: null,
        cgv: null,
        privacy_policy: null,
        announcement_text: null,
        whatsapp_number: null,
        latitude: null,
        longitude: null,
        opening_hours: null,
        returns_policy: null,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const container = await renderPage();

    const picture = container.querySelector("picture");
    expect(picture).not.toBeNull();

    const source = picture?.querySelector('source[media="(max-width: 700px)"]');
    expect(source).not.toBeNull();
    expect(source?.getAttribute("srcset")).toBe("https://example.com/banner-mobile.webp");

    const img = picture?.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe("https://example.com/banner-desktop.webp");
  });

  it("n'affiche pas la source mobile si banner_mobile_url est absent, et utilise la photo horizontale partout", async () => {
    vi.mocked(useStoreSettings).mockReturnValue({
      data: {
        store_name: "JACOB DE JESUS",
        tagline: "Streetwear brutal",
        description: null,
        logo_url: null,
        banner_url: "https://example.com/banner-desktop.webp",
        banner_mobile_url: null,
        email: null,
        phone: null,
        address: null,
        city: null,
        country: "Togo",
        currency: "XOF",
        social_links: {},
        about_text: null,
        about_image_url: null,
        legal_mentions: null,
        cgv: null,
        privacy_policy: null,
        announcement_text: null,
        whatsapp_number: null,
        latitude: null,
        longitude: null,
        opening_hours: null,
        returns_policy: null,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const container = await renderPage();

    // La source mobile ne doit PAS exister
    const source = container.querySelector('source[media="(max-width: 700px)"]');
    expect(source).toBeNull();

    // L'image horizontale doit être présente
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe("https://example.com/banner-desktop.webp");
  });

  it("ne rend aucune image si aucune bannière n'est configurée", async () => {
    vi.mocked(useStoreSettings).mockReturnValue({
      data: {
        store_name: "JACOB DE JESUS",
        tagline: "Streetwear brutal",
        description: null,
        logo_url: null,
        banner_url: null,
        banner_mobile_url: null,
        email: null,
        phone: null,
        address: null,
        city: null,
        country: "Togo",
        currency: "XOF",
        social_links: {},
        about_text: null,
        about_image_url: null,
        legal_mentions: null,
        cgv: null,
        privacy_policy: null,
        announcement_text: null,
        whatsapp_number: null,
        latitude: null,
        longitude: null,
        opening_hours: null,
        returns_policy: null,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const container = await renderPage();

    const picture = container.querySelector("picture");
    expect(picture).toBeNull();

    const heroImg = container.querySelector(".heroImage");
    expect(heroImg).toBeNull();
  });
});

describe("HomePage - Bloc La marque", () => {
  it("affiche le bloc La marque avec photo et texte", async () => {
    vi.mocked(useStoreSettings).mockReturnValue({
      data: {
        store_name: "JACOB DE JESUS",
        tagline: "Streetwear brutal",
        description: null,
        logo_url: null,
        banner_url: null,
        banner_mobile_url: null,
        about_text: "Notre histoire et vision.",
        about_image_url: "https://example.com/about.webp",
        email: null,
        phone: null,
        address: null,
        city: null,
        country: "Togo",
        currency: "XOF",
        social_links: {},
        legal_mentions: null,
        cgv: null,
        privacy_policy: null,
        announcement_text: null,
        whatsapp_number: null,
        latitude: null,
        longitude: null,
        opening_hours: null,
        returns_policy: null,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const container = await renderPage();

    const brandSection = container.querySelector('section[class*="brand"]');
    expect(brandSection).not.toBeNull();

    const title = brandSection?.querySelector("h2");
    expect(title?.textContent).toContain("La marque");

    const img = brandSection?.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe("https://example.com/about.webp");
    expect(img?.getAttribute("alt")).toBe("JACOB DE JESUS");

    const text = brandSection?.querySelector("p");
    expect(text?.textContent).toBe("Notre histoire et vision.");
  });

  it("affiche le bloc La marque sans photo (texte seul)", async () => {
    vi.mocked(useStoreSettings).mockReturnValue({
      data: {
        store_name: "JACOB DE JESUS",
        tagline: "Streetwear brutal",
        description: null,
        logo_url: null,
        banner_url: null,
        banner_mobile_url: null,
        about_text: "Texte de manifeste sans photo.",
        about_image_url: null,
        email: null,
        phone: null,
        address: null,
        city: null,
        country: "Togo",
        currency: "XOF",
        social_links: {},
        legal_mentions: null,
        cgv: null,
        privacy_policy: null,
        announcement_text: null,
        whatsapp_number: null,
        latitude: null,
        longitude: null,
        opening_hours: null,
        returns_policy: null,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const container = await renderPage();

    const brandSection = container.querySelector('section[class*="brand"]');
    expect(brandSection).not.toBeNull();

    const img = brandSection?.querySelector("img");
    expect(img).toBeNull();

    const text = brandSection?.querySelector("p");
    expect(text?.textContent).toBe("Texte de manifeste sans photo.");
  });

  it("affiche le bloc La marque avec photo seule (sans texte)", async () => {
    vi.mocked(useStoreSettings).mockReturnValue({
      data: {
        store_name: "JACOB DE JESUS",
        tagline: "Streetwear brutal",
        description: null,
        logo_url: null,
        banner_url: null,
        banner_mobile_url: null,
        about_text: null,
        about_image_url: "https://example.com/about-only.webp",
        email: null,
        phone: null,
        address: null,
        city: null,
        country: "Togo",
        currency: "XOF",
        social_links: {},
        legal_mentions: null,
        cgv: null,
        privacy_policy: null,
        announcement_text: null,
        whatsapp_number: null,
        latitude: null,
        longitude: null,
        opening_hours: null,
        returns_policy: null,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const container = await renderPage();

    const brandSection = container.querySelector('section[class*="brand"]');
    expect(brandSection).not.toBeNull();

    const img = brandSection?.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe("https://example.com/about-only.webp");
    expect(img?.getAttribute("alt")).toBe("JACOB DE JESUS");

    const text = brandSection?.querySelector("p");
    expect(text).toBeNull();
  });
});

