import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { Header } from "./Header";

vi.mock("@/lib/auth-context", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/lib/cart-context", () => ({
  useCart: vi.fn(),
}));

vi.mock("@/lib/hooks", () => ({
  useCategories: vi.fn(),
  useCollections: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { useCategories, useCollections } from "@/lib/hooks";
import { supabase } from "@/lib/supabase";

let roots: Root[] = [];

async function renderHeader(): Promise<HTMLDivElement> {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.push(root);

  await act(async () => {
    root.render(
      <MemoryRouter>
        <Header storeName="JACOB DE JESUS" />
      </MemoryRouter>
    );
  });

  return container;
}

describe("Header", () => {
  beforeEach(() => {
    vi.mocked(useCategories).mockReturnValue({
      data: [
        { id: "1", name: "T-shirts", slug: "t-shirts", is_active: true, description: null, sort_order: 1, image_url: null },
        { id: "2", name: "Polo", slug: "polo", is_active: true, description: null, sort_order: 2, image_url: null },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    vi.mocked(useCollections).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    vi.mocked(useAuth).mockReturnValue({
      user: null,
      session: null,
      isLoading: false,
      role: null,
      isAdmin: false,
      aalLevel: null,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      refreshRole: vi.fn(),
    } as any);

    vi.mocked(useCart).mockReturnValue({
      items: [],
      totalItems: 0,
      subtotal: 0,
      currency: "XOF",
      isOpen: false,
      isLoading: false,
      error: null,
      openCart: vi.fn(),
      closeCart: vi.fn(),
      addItem: vi.fn(),
      removeItem: vi.fn(),
      updateQuantity: vi.fn(),
      clearAlerts: vi.fn(),
      retry: vi.fn(),
      clearCart: vi.fn(),
    } as any);

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any);
  });

  afterEach(() => {
    roots.forEach((r) => r.unmount());
    roots = [];
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("menu Collections est masqué s'il n'y a aucune collection", async () => {
    vi.mocked(useCollections).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const container = await renderHeader();

    const collectionsBtn = Array.from(container.querySelectorAll("button")).find(
      (btn) => btn.textContent?.includes("Collections")
    );
    expect(collectionsBtn).toBeUndefined();
  });

  it("menu Collections est affiché quand des collections actives existent", async () => {
    vi.mocked(useCollections).mockReturnValue({
      data: [
        {
          id: "col-1",
          name: "Série Noire",
          slug: "serie-noire",
          is_active: true,
          description: null,
          image_url: null,
          starts_at: null,
          ends_at: null,
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const container = await renderHeader();

    const collectionsBtn = Array.from(container.querySelectorAll("button")).find(
      (btn) => btn.textContent?.includes("Collections")
    );
    expect(collectionsBtn).toBeDefined();
    expect(collectionsBtn?.getAttribute("aria-expanded")).toBe("false");
  });

  it("compteur de panier est affiché seulement si totalItems > 0", async () => {
    // 0 article au panier : aucun badge
    vi.mocked(useCart).mockReturnValue({
      items: [],
      totalItems: 0,
      subtotal: 0,
      currency: "XOF",
      addItem: vi.fn(),
      removeItem: vi.fn(),
      updateQuantity: vi.fn(),
      clearCart: vi.fn(),
      isOpen: false,
      openCart: vi.fn(),
      closeCart: vi.fn(),
    } as any);

    let container = await renderHeader();
    let cartBtn = container.querySelector('button[aria-label*="Panier"]');
    expect(cartBtn?.querySelector('[class*="badge"]')).toBeNull();

    // 3 articles au panier : badge visible avec '3'
    roots.forEach((r) => r.unmount());
    roots = [];
    document.body.innerHTML = "";

    vi.mocked(useCart).mockReturnValue({
      items: [],
      totalItems: 3,
      subtotal: 75000,
      currency: "XOF",
      addItem: vi.fn(),
      removeItem: vi.fn(),
      updateQuantity: vi.fn(),
      clearCart: vi.fn(),
      isOpen: false,
      openCart: vi.fn(),
      closeCart: vi.fn(),
    } as any);

    container = await renderHeader();
    cartBtn = container.querySelector('button[aria-label*="Panier"]');
    const badge = cartBtn?.querySelector('[class*="badge"]');
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toBe("3");
  });

  it("compteur de favoris : aucun badge pour un invité ou avec 0 favori, badge affiché si > 0", async () => {
    // Invité (user = null) : pas de badge
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      session: null,
      isLoading: false,
      signOut: vi.fn(),
    } as any);

    let container = await renderHeader();
    let favLink = container.querySelector('a[href="/favoris"]');
    expect(favLink?.querySelector('[class*="badge"]')).toBeNull();

    // Connecté avec 2 favoris : badge affiché avec '2'
    roots.forEach((r) => r.unmount());
    roots = [];
    document.body.innerHTML = "";

    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-123", email: "test@example.com" } as any,
      session: null,
      isLoading: false,
      signOut: vi.fn(),
    } as any);

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [{ product_id: "prod-1" }, { product_id: "prod-2" }],
        error: null,
      }),
    } as any);

    container = await renderHeader();
    favLink = container.querySelector('a[href="/favoris"]');
    const badge = favLink?.querySelector('[class*="badge"]');
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toBe("2");
  });

  it("avec 9 catégories et une largeur réduite, le menu « Plus » contient les catégories qui ne tiennent pas", async () => {
    const nineCategories = [
      { id: "1", name: "T-shirts", slug: "t-shirts", is_active: true, description: null, sort_order: 1, image_url: null },
      { id: "2", name: "Sweats", slug: "sweats", is_active: true, description: null, sort_order: 2, image_url: null },
      { id: "3", name: "Vestes", slug: "vestes", is_active: true, description: null, sort_order: 3, image_url: null },
      { id: "4", name: "Pantalons", slug: "pantalons", is_active: true, description: null, sort_order: 4, image_url: null },
      { id: "5", name: "Casquettes", slug: "casquettes", is_active: true, description: null, sort_order: 5, image_url: null },
      { id: "6", name: "Chaussures", slug: "chaussures", is_active: true, description: null, sort_order: 6, image_url: null },
      { id: "7", name: "Sacs", slug: "sacs", is_active: true, description: null, sort_order: 7, image_url: null },
      { id: "8", name: "Bijoux", slug: "bijoux", is_active: true, description: null, sort_order: 8, image_url: null },
      { id: "9", name: "Lunettes", slug: "lunettes", is_active: true, description: null, sort_order: 9, image_url: null },
    ];

    vi.mocked(useCategories).mockReturnValue({
      data: nineCategories,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    // Simuler une largeur réduite (ex: 1100 px où 5 catégories tiennent et 4 vont dans Plus)
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1100,
    });
    window.dispatchEvent(new Event("resize"));

    const container = await renderHeader();

    // Le bouton « Plus » est présent
    const moreBtn = Array.from(container.querySelectorAll("button")).find((btn) =>
      btn.textContent?.includes("Plus")
    );
    expect(moreBtn).toBeDefined();
    expect(moreBtn?.getAttribute("aria-expanded")).toBe("false");

    // Ouvrir le menu déroulant Plus au clic
    await act(async () => {
      moreBtn?.click();
    });
    expect(moreBtn?.getAttribute("aria-expanded")).toBe("true");

    // Vérifier que le menu Plus contient les catégories qui ne tiennent pas
    const plusLinks = Array.from(
      container.querySelectorAll('[class*="moreDropdown"] a, [class*="moreLink"]')
    );
    const plusLinkTexts = plusLinks.map((l) => l.textContent);

    expect(plusLinkTexts).toContain("Chaussures");
    expect(plusLinkTexts).toContain("Sacs");
    expect(plusLinkTexts).toContain("Bijoux");
    expect(plusLinkTexts).toContain("Lunettes");

    // Fermeture avec la touche Échap
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(moreBtn?.getAttribute("aria-expanded")).toBe("false");
  });
});

