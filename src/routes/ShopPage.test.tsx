import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import ShopPage from "./ShopPage";

// Track navigation & queries
let currentLocation = { pathname: "", search: "", hash: "" };
let navigateFn: ReturnType<typeof useNavigate> | null = null;
const queryCallLog: { table: string; categoryId?: string; inIds?: string[] }[] = [];

function LocationTracker() {
  const loc = useLocation();
  const nav = useNavigate();
  currentLocation = loc;
  navigateFn = nav;
  return null;
}

const mockCategories = [
  { id: "cat-tshirts", name: "T-Shirts", slug: "t-shirts", description: "Nos t-shirts", sort_order: 1, is_active: true },
  { id: "cat-chemises", name: "Chemises", slug: "chemises", description: "Nos chemises", sort_order: 2, is_active: true },
];

const mockCollections = [
  { id: "col-ete", name: "Été 2026", slug: "ete-2026", description: "Collection été", image_url: "", is_active: true, starts_at: null, ends_at: null },
];

vi.mock("@/lib/hooks", () => ({
  useCategories: () => ({ data: mockCategories, isLoading: false, error: null }),
  useCollections: () => ({ data: mockCollections, isLoading: false, error: null }),
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ user: null }),
}));

// Supabase mock
vi.mock("@/lib/supabase", () => {
  return {
    supabase: {
      from: (table: string) => {
        let currentEqField: string | null = null;
        let currentEqValue: string | null = null;
        let inValues: string[] | null = null;

        const builder: any = {
          select: vi.fn(() => builder),
          eq: vi.fn((field: string, val: string) => {
            currentEqField = field;
            currentEqValue = val;
            return builder;
          }),
          not: vi.fn(() => builder),
          ilike: vi.fn(() => builder),
          order: vi.fn(() => builder),
          in: vi.fn((_field: string, values: string[]) => {
            inValues = values;
            return builder;
          }),
          limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
          range: vi.fn((_from: number, _to: number) => {
            queryCallLog.push({
              table,
              categoryId: currentEqField === "category_id" ? (currentEqValue ?? undefined) : undefined,
              inIds: inValues ?? undefined,
            });

            if (table === "products") {
              const category = mockCategories.find((c) => c.id === currentEqValue) || mockCategories[0];
              const sampleProduct = {
                id: `prod-${currentEqValue || "all"}`,
                name: `Produit ${category.name}`,
                slug: `produit-${category.slug}`,
                description: "Description test",
                price: 25000,
                compare_at_price: null,
                currency: "XOF",
                category_id: currentEqValue || category.id,
                is_archived: false,
                is_featured: false,
                sort_order: 1,
                created_at: new Date().toISOString(),
                categories: { name: category.name, slug: category.slug },
              };

              return Promise.resolve({
                data: [sampleProduct],
                count: 1,
                error: null,
              });
            }

            return Promise.resolve({ data: [], count: 0, error: null });
          }),
          then: (resolve: any) => resolve({ data: [], error: null }),
        };

        return builder;
      },
    },
  };
});

describe("ShopPage Navigation & Category Filter (BUG 2)", () => {
  let roots: Root[] = [];
  let containers: HTMLDivElement[] = [];

  beforeEach(() => {
    queryCallLog.length = 0;
    roots = [];
    containers = [];
  });

  afterEach(() => {
    roots.forEach((root) => {
      act(() => {
        root.unmount();
      });
    });
    containers.forEach((c) => c.remove());
  });

  async function renderShopPage(initialUrl: string) {
    const container = document.createElement("div");
    document.body.appendChild(container);
    containers.push(container);
    const root = createRoot(container);
    roots.push(root);

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={[initialUrl]}>
          <LocationTracker />
          <Routes>
            <Route path="/boutique" element={<ShopPage />} />
            <Route path="/categorie/:slug" element={<ShopPage />} />
            <Route path="/collection/:slug" element={<ShopPage />} />
          </Routes>
        </MemoryRouter>
      );
    });

    // Wait for debounce (300ms) + async effects to settle
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 400));
    });

    return container;
  }

  it("(b) handleCategorySelect produit l'adresse /categorie/<slug> en conservant les autres filtres utiles (q, tri) et supprime ?taille= et ?categorie=", async () => {
    const container = await renderShopPage("/boutique?q=oversize&tri=price_asc&taille=M");

    // Trouve le bouton de la catégorie Chemises dans la liste des filtres
    const chemisesButton = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("Chemises")
    );
    expect(chemisesButton).toBeDefined();

    await act(async () => {
      chemisesButton!.click();
    });

    // L'adresse doit être /categorie/chemises en conservant q et tri, sans taille ni categorie
    expect(currentLocation.pathname).toBe("/categorie/chemises");
    expect(currentLocation.search).toContain("q=oversize");
    expect(currentLocation.search).toContain("tri=price_asc");
    expect(currentLocation.search).not.toContain("taille");
    expect(currentLocation.search).not.toContain("categorie=");

    // Cliquer sur « Toutes les catégories » navigue vers /boutique avec q et tri conservés
    const allCategoriesButton = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("Toutes")
    );
    expect(allCategoriesButton).toBeDefined();

    await act(async () => {
      allCategoriesButton!.click();
    });

    expect(currentLocation.pathname).toBe("/boutique");
    expect(currentLocation.search).toContain("q=oversize");
    expect(currentLocation.search).toContain("tri=price_asc");
    expect(currentLocation.search).not.toContain("categorie=");
  }, 15000);

  it("(b-bis) redirige les anciens liens /boutique?categorie=xxx vers /categorie/xxx (replace)", async () => {
    await renderShopPage("/boutique?categorie=t-shirts&tri=newest");

    // Redirection automatique
    expect(currentLocation.pathname).toBe("/categorie/t-shirts");
    expect(currentLocation.search).toBe("?tri=newest");
  });

  it("(c) un changement de slug déclenche un nouveau chargement avec remise à zéro et catégorie active mise à jour", async () => {
    const container = await renderShopPage("/categorie/t-shirts");

    const tshirtsQueries = queryCallLog.filter((q) => q.categoryId === "cat-tshirts");
    expect(tshirtsQueries.length).toBeGreaterThan(0);

    // Navigue vers /categorie/chemises
    await act(async () => {
      navigateFn?.("/categorie/chemises");
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const chemisesQueries = queryCallLog.filter((q) => q.categoryId === "cat-chemises");
    expect(chemisesQueries.length).toBeGreaterThan(0);

    // Le titre de la page doit être mis à jour vers Chemises
    const titleEl = container.querySelector("h1");
    expect(titleEl?.textContent).toBe("Chemises");
  });

  it("(d) slug inconnu = message « Catégorie introuvable » avec un lien vers /boutique", async () => {
    const container = await renderShopPage("/categorie/slug-inexistant-xyz");

    // Doit afficher le message d'erreur clair
    expect(container.textContent).toContain("Catégorie introuvable");
    expect(container.textContent).toContain("slug-inexistant-xyz");

    // Doit contenir un lien vers /boutique
    const linkToBoutique = container.querySelector('a[href="/boutique"]');
    expect(linkToBoutique).not.toBeNull();
  });

  it("(d-bis) collection inconnue = message « Catégorie introuvable » avec un lien vers /boutique", async () => {
    const container = await renderShopPage("/collection/col-inexistante-xyz");

    expect(container.textContent).toContain("Catégorie introuvable");
    const linkToBoutique = container.querySelector('a[href="/boutique"]');
    expect(linkToBoutique).not.toBeNull();
  });

  it("affiche les puces des filtres actifs et 'Tout effacer' qui réinitialise", async () => {
    const container = await renderShopPage("/categorie/t-shirts?taille=M");

    expect(container.textContent).toContain("T-Shirts");
    expect(container.textContent).toContain("M");

    const clearBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Tout effacer"
    );
    expect(clearBtn).toBeDefined();

    await act(async () => {
      clearBtn?.click();
    });

    expect(currentLocation.pathname).toBe("/boutique");
  });

  it("affiche le compteur à jour dans le panneau mobile 'Voir les résultats (n)'", async () => {
    const container = await renderShopPage("/categorie/t-shirts");

    const filterBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("FILTRES")
    );
    expect(filterBtn).toBeDefined();

    await act(async () => {
      filterBtn?.click();
    });

    const applyBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("Voir les résultats")
    );
    expect(applyBtn).toBeDefined();
    expect(applyBtn?.textContent).toBe("Voir les résultats (1)");
  });
});
