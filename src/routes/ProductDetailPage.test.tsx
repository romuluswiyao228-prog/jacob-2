import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProductDetailPage from "./ProductDetailPage";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ slug: "hoodie-brutal" }),
  };
});

const mockAddItem = vi.fn();
const mockOpenCart = vi.fn();
vi.mock("@/lib/cart-context", () => ({
  useCart: () => ({
    addItem: mockAddItem,
    openCart: mockOpenCart,
  }),
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: null,
  }),
}));

const mockProduct = {
  id: "prod-1",
  name: "Hoodie Brutal",
  slug: "hoodie-brutal",
  description: "Description test",
  price: 45000,
  compare_at_price: null,
  currency: "XOF",
  category_id: null,
  is_archived: false,
  is_featured: true,
  sort_order: 1,
  created_at: new Date().toISOString(),
};

const mockImages = [
  {
    id: "img-1",
    product_id: "prod-1",
    url: "https://example.com/img.jpg",
    alt_text: "Hoodie Brutal",
    sort_order: 0,
    is_primary: true,
  },
];

const mockVariants = [
  {
    id: "var-m-noir",
    product_id: "prod-1",
    size: "M",
    color: "Noir",
    sku: "HB-M-BLK",
    stock: 5,
    price: 45000,
    currency: "XOF",
  },
  {
    id: "var-l-noir",
    product_id: "prod-1",
    size: "L",
    color: "Noir",
    sku: "HB-L-BLK",
    stock: 0, // épuisé
    price: 45000,
    currency: "XOF",
  },
  {
    id: "var-m-blanc",
    product_id: "prod-1",
    size: "M",
    color: "Blanc",
    sku: "HB-M-WHT",
    stock: 3,
    price: 45000,
    currency: "XOF",
  },
];

vi.mock("@/lib/supabase", () => {
  return {
    supabase: {
      from: (table: string) => {
        if (table === "products") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: mockProduct, error: null }),
                }),
                neq: () => ({
                  limit: async () => ({ data: [], error: null }),
                  neq: () => ({
                    limit: async () => ({ data: [], error: null }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "product_images") {
          return {
            select: () => ({
              eq: () => ({
                order: () => ({
                  order: async () => ({ data: mockImages, error: null }),
                }),
              }),
              in: () => ({
                order: () => ({
                  order: async () => ({ data: [], error: null }),
                }),
              }),
            }),
          };
        }
        if (table === "product_variants") {
          return {
            select: () => ({
              eq: async () => ({ data: mockVariants, error: null }),
            }),
          };
        }
        if (table === "categories" || table === "favorites") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
                eq: () => ({
                  maybeSingle: async () => ({ data: null, error: null }),
                }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        };
      },
    },
  };
});

let roots: Root[] = [];

async function renderProductPage(): Promise<HTMLDivElement> {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.push(root);

  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={["/produit/hoodie-brutal"]}>
        <Routes>
          <Route path="/produit/:slug" element={<ProductDetailPage />} />
        </Routes>
      </MemoryRouter>
    );
  });

  return container;
}

describe("ProductDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock scrollIntoView
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    for (const root of roots) {
      act(() => root.unmount());
    }
    roots = [];
    document.body.innerHTML = "";
  });

  it("affiche les boutons AJOUTER AU SAC et ACHETER MAINTENANT non désactivés silencieusement", async () => {
    const container = await renderProductPage();

    const buttons = Array.from(container.querySelectorAll("button"));
    const addToCartBtn = buttons.find((b) => b.textContent?.includes("AJOUTER AU SAC"));
    const buyNowBtn = buttons.find((b) => b.textContent?.includes("ACHETER MAINTENANT"));

    expect(addToCartBtn).toBeDefined();
    expect(buyNowBtn).toBeDefined();
    expect(addToCartBtn?.disabled).toBe(false);
    expect(buyNowBtn?.disabled).toBe(false);
  });

  it("affiche 'Choisissez une couleur.' ou 'Choisissez une taille.' avec role='alert' sans sélection", async () => {
    const container = await renderProductPage();

    const buttons = Array.from(container.querySelectorAll("button"));
    const addToCartBtn = buttons.find((b) => b.textContent?.includes("AJOUTER AU SAC"))!;

    // Cliquer sans sélection
    await act(async () => {
      addToCartBtn.click();
    });

    const alert = container.querySelector('[role="alert"]');
    expect(alert).not.toBeNull();
    // Le premier choix requis selon l'ordre : taille ou couleur
    expect(alert?.textContent).toMatch(/Choisissez une (taille|couleur)\./);
  });

  it("fait disparaître le message d'erreur dès que la sélection change", async () => {
    const container = await renderProductPage();

    const buttons = Array.from(container.querySelectorAll("button"));
    const addToCartBtn = buttons.find((b) => b.textContent?.includes("AJOUTER AU SAC"))!;

    // 1. Déclencher l'erreur
    await act(async () => {
      addToCartBtn.click();
    });
    expect(container.querySelector('[role="alert"]')).not.toBeNull();

    // 2. Sélectionner une taille (M)
    const sizeMBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "M"
    );
    expect(sizeMBtn).toBeDefined();

    await act(async () => {
      sizeMBtn?.click();
    });

    // L'alerte disparaît
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it("ajoute l'article et navigue vers /commande lors d'un clic sur ACHETER MAINTENANT avec sélection valide", async () => {
    const container = await renderProductPage();

    // Sélectionner la couleur Noir
    const colorNoirBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Noir"
    );
    await act(async () => {
      colorNoirBtn?.click();
    });

    // Sélectionner la taille M
    const sizeMBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "M"
    );
    await act(async () => {
      sizeMBtn?.click();
    });

    const buyNowBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("ACHETER MAINTENANT")
    )!;

    await act(async () => {
      buyNowBtn.click();
    });

    expect(mockAddItem).toHaveBeenCalledWith(
      expect.objectContaining({
        variant_id: "var-m-noir",
        product_id: "prod-1",
        size: "M",
        color: "Noir",
      })
    );
    expect(mockNavigate).toHaveBeenCalledWith("/commande");
    expect(mockOpenCart).not.toHaveBeenCalled();
  });

  it("ouvre le panier lors d'un clic sur AJOUTER AU SAC avec sélection valide", async () => {
    const container = await renderProductPage();

    // Sélectionner la couleur Noir
    const colorNoirBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Noir"
    );
    await act(async () => {
      colorNoirBtn?.click();
    });

    // Sélectionner la taille M
    const sizeMBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "M"
    );
    await act(async () => {
      sizeMBtn?.click();
    });

    const addToCartBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("AJOUTER AU SAC")
    )!;

    await act(async () => {
      addToCartBtn.click();
    });

    expect(mockAddItem).toHaveBeenCalledWith(
      expect.objectContaining({
        variant_id: "var-m-noir",
      })
    );
    expect(mockOpenCart).toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

