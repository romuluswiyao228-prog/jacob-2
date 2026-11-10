import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import HomePage from "./HomePage";

vi.mock("@/lib/hooks", () => ({
  useStoreSettings: vi.fn(),
  useCategories: vi.fn(() => ({ data: [], isLoading: false, error: null, refetch: vi.fn() })),
  useNewProducts: vi.fn(() => ({ data: [], isLoading: false, error: null, refetch: vi.fn() })),
  usePromoProducts: vi.fn(() => ({ data: [], isLoading: false, error: null, refetch: vi.fn() })),
  useCollections: vi.fn(() => ({ data: [], isLoading: false, error: null, refetch: vi.fn() })),
  useAllProducts: vi.fn(() => ({ data: [], isLoading: false, error: null, refetch: vi.fn() })),
  useArchiveProducts: vi.fn(() => ({ data: null, isLoading: false, error: null, refetch: vi.fn() })),
  useActiveShippingZones: vi.fn(() => ({ data: [], isLoading: false, error: null, refetch: vi.fn() })),
  useHomeSlides: vi.fn(() => ({ data: [], isLoading: false, error: null, refetch: vi.fn() })),
  useCommunityPhotos: vi.fn(() => ({ data: [], isLoading: false, error: null, refetch: vi.fn() })),
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ user: null }),
}));

import {
  useStoreSettings,
  useCategories,
  useNewProducts,
  usePromoProducts,
  useCollections,
  useAllProducts,
  useArchiveProducts,
  useActiveShippingZones,
  useHomeSlides,
  useCommunityPhotos,
} from "@/lib/hooks";

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

describe("HomePage - Porté par la communauté", () => {
  it("masque la section si aucune photo n'est active", async () => {
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
        social_links: { instagram: "https://instagram.com/jacobdejesus" },
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
    vi.mocked(useCommunityPhotos).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const container = await renderPage();
    expect(container.textContent).not.toContain("Porté par la communauté");
  });

  it("répète les photos quand il y a moins de 6 éléments pour remplir le rail", async () => {
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
        social_links: { instagram: "https://instagram.com/jacobdejesus" },
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
    vi.mocked(useCommunityPhotos).mockReturnValue({
      data: [
        { id: "c1", image_url: "https://example.com/1.webp", alt_text: "Photo 1", caption: "Caption 1", link_path: null, sort_order: 1, is_active: true, consent_confirmed: true, created_at: "2026-11-10T00:00:00Z" },
        { id: "c2", image_url: "https://example.com/2.webp", alt_text: "Photo 2", caption: "Caption 2", link_path: null, sort_order: 2, is_active: true, consent_confirmed: true, created_at: "2026-11-10T00:00:00Z" },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const container = await renderPage();
    const rail = container.querySelector('[data-testid="community-photo-rail"]');
    expect(rail).not.toBeNull();
    expect(rail?.querySelectorAll("img").length).toBeGreaterThanOrEqual(4);
  });

  it("ouvre une fenêtre d'agrandissement avec légende et bouton de lien quand une photo est cliquée", async () => {
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
        social_links: { instagram: "https://instagram.com/jacobdejesus" },
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
    vi.mocked(useCommunityPhotos).mockReturnValue({
      data: [
        { id: "c1", image_url: "https://example.com/zoom.webp", alt_text: "Photo 1", caption: "Legende de test", link_path: "/produit/test", sort_order: 1, is_active: true, consent_confirmed: true, created_at: "2026-11-10T00:00:00Z" },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const container = await renderPage();
    const trigger = container.querySelector('[data-testid="community-photo-trigger-0"]') as HTMLButtonElement | null;
    expect(trigger).not.toBeNull();
    await act(async () => trigger?.click());

    const dialog = document.body.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.textContent).toContain("Legende de test");
    expect(dialog?.textContent).toContain("Voir le produit");
  });
});

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

  it("affiche les deux cadres de photos d'accueil lorsque des home_slides actives existent", async () => {
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

    vi.mocked(useHomeSlides).mockReturnValue({
      data: [
        {
          id: "s1",
          image_url: "https://example.com/left.webp",
          alt_text: "Slide Gauche",
          side: "left",
          sort_order: 0,
          is_active: true,
          created_at: "2026-11-10T00:00:00Z",
        },
        {
          id: "s2",
          image_url: "https://example.com/right.webp",
          alt_text: "Slide Droit",
          side: "right",
          sort_order: 0,
          is_active: true,
          created_at: "2026-11-10T00:00:00Z",
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const container = await renderPage();
    expect(container.querySelector('[data-testid="slide-frame-left"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="slide-frame-right"]')).not.toBeNull();
    expect(container.querySelector('a[href="/boutique?tri=newest"]')).not.toBeNull();
  });
});

describe("HomePage - Bloc La boutique", () => {
  it("affiche le bloc La boutique avec photo et texte", async () => {
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
    expect(title?.textContent).toContain("La boutique");

    const img = brandSection?.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe("https://example.com/about.webp");
    expect(img?.getAttribute("alt")).toBe("JACOB DE JESUS");

    const text = brandSection?.querySelector("p");
    expect(text?.textContent).toBe("Notre histoire et vision.");
  });

  it("affiche le bloc La boutique sans photo (texte seul)", async () => {
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

  it("affiche le bloc La boutique avec photo seule (sans texte)", async () => {
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

describe("HomePage - Masquage des sections sans données", () => {
  it("masque chaque section lorsqu'elle n'a pas de données", async () => {
    vi.mocked(useStoreSettings).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    vi.mocked(useCategories).mockReturnValue({ data: [], isLoading: false, error: null, refetch: vi.fn() });
    vi.mocked(useNewProducts).mockReturnValue({ data: [], isLoading: false, error: null, refetch: vi.fn() });
    vi.mocked(useCollections).mockReturnValue({ data: [], isLoading: false, error: null, refetch: vi.fn() });
    vi.mocked(usePromoProducts).mockReturnValue({ data: [], isLoading: false, error: null, refetch: vi.fn() });
    vi.mocked(useArchiveProducts).mockReturnValue({ data: null, isLoading: false, error: null, refetch: vi.fn() });
    vi.mocked(useAllProducts).mockReturnValue({ data: [], isLoading: false, error: null, refetch: vi.fn() });
    vi.mocked(useActiveShippingZones).mockReturnValue({ data: [], isLoading: false, error: null, refetch: vi.fn() });

    const container = await renderPage();

    expect(container.textContent).not.toContain("Catégories");
    expect(container.textContent).not.toContain("Derniers drops");
    expect(container.textContent).not.toContain("Capsules");
    expect(container.textContent).not.toContain("Promotions");
    expect(container.textContent).not.toContain("Archive");
    expect(container.textContent).not.toContain("La boutique");
    expect(container.textContent).not.toContain("Toute la boutique");
    expect(container.querySelector('[aria-label="Informations pratiques"]')).toBeNull();
    expect(container.textContent).not.toContain("Nous trouver");
  });
});

describe("HomePage - Section Archive", () => {
  it("affiche la section Archive seulement si la collection « archive » contient des produits", async () => {
    const mockArchiveProduct = {
      id: "arch-1",
      name: "Hoodie Vintage",
      slug: "hoodie-vintage",
      description: null,
      price: 35000,
      compare_at_price: null,
      currency: "XOF",
      category_id: null,
      is_archived: false,
      is_featured: false,
      sort_order: 1,
      created_at: "2026-01-01T00:00:00Z",
      primary_image: {
        id: "img-1",
        product_id: "arch-1",
        url: "https://example.com/arch.webp",
        alt_text: "Hoodie Vintage",
        sort_order: 1,
        is_primary: true,
      },
      category: null,
      variants: [],
    };

    vi.mocked(useArchiveProducts).mockReturnValue({
      data: {
        collection: {
          id: "col-archive-id",
          name: "Archive",
          slug: "archive",
          description: null,
          image_url: null,
          is_active: true,
          starts_at: null,
          ends_at: null,
        },
        products: [mockArchiveProduct],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const container = await renderPage();

    expect(container.textContent).toContain("Archive");
    expect(container.textContent).toContain("Anciens drops et pièces limitées.");
    expect(container.textContent).toContain("Hoodie Vintage");

    const archiveBtn = container.querySelector('a[href="/collection/archive"]');
    expect(archiveBtn).not.toBeNull();
    expect(archiveBtn?.textContent).toContain("Voir l'archive");
  });

  it("masque la section Archive si la collection « archive » est vide ou absente", async () => {
    vi.mocked(useArchiveProducts).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const container = await renderPage();
    expect(container.textContent).not.toContain("Anciens drops et pièces limitées.");
    expect(container.querySelector('a[href="/collection/archive"]')).toBeNull();
  });
});

describe("HomePage - Bande d'informations pratiques", () => {
  it("affiche chaque élément de la bande d'infos selon sa donnée", async () => {
    vi.mocked(useStoreSettings).mockReturnValue({
      data: {
        store_name: "JACOB DE JESUS",
        tagline: null,
        description: null,
        logo_url: null,
        banner_url: null,
        banner_mobile_url: null,
        email: null,
        phone: null,
        address: null,
        city: "Abidjan",
        country: "Côte d'Ivoire",
        currency: "XOF",
        social_links: {},
        about_text: null,
        about_image_url: null,
        legal_mentions: null,
        cgv: null,
        privacy_policy: null,
        announcement_text: null,
        whatsapp_number: "+2250102030405",
        latitude: null,
        longitude: null,
        opening_hours: null,
        returns_policy: "Retours acceptés sous 7 jours.",
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    vi.mocked(useActiveShippingZones).mockReturnValue({
      data: [
        { id: "zone-1", name: "Afrique de l'Ouest", countries: ["Côte d'Ivoire", "Sénégal"], is_active: true },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const container = await renderPage();

    const bar = container.querySelector('[aria-label="Informations pratiques"]');
    expect(bar).not.toBeNull();

    // Paiement à la livraison
    expect(bar?.textContent).toContain("Paiement à la livraison");

    // Retours (avec lien vers /retours)
    const returnsLink = bar?.querySelector('a[href="/retours"]');
    expect(returnsLink).not.toBeNull();
    expect(returnsLink?.textContent).toContain("Retours");

    // Livraison avec pays
    expect(bar?.textContent).toContain("Livraison vers : Côte d'Ivoire, Sénégal");

    // WhatsApp avec lien wa.me
    const waLink = bar?.querySelector('a[href*="wa.me/2250102030405"]');
    expect(waLink).not.toBeNull();
    expect(waLink?.textContent).toContain("WhatsApp");

    // Boutique à <ville>
    const cityLink = bar?.querySelector('a[href="/notre-boutique"]');
    expect(cityLink).not.toBeNull();
    expect(cityLink?.textContent).toContain("Boutique à Abidjan");
  });

  it("masque les éléments facultatifs s'ils ne sont pas renseignés", async () => {
    vi.mocked(useStoreSettings).mockReturnValue({
      data: {
        store_name: "JACOB DE JESUS",
        tagline: null,
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

    vi.mocked(useActiveShippingZones).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const container = await renderPage();
    const bar = container.querySelector('[aria-label="Informations pratiques"]');

    expect(bar?.querySelector('a[href="/retours"]')).toBeNull();
    expect(bar?.textContent).not.toContain("Livraison vers :");
    expect(bar?.querySelector('a[href*="wa.me"]')).toBeNull();
    expect(bar?.querySelector('a[href="/notre-boutique"]')).toBeNull();
  });
});

