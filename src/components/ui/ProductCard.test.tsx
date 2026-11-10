import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { ProductCard } from "./ProductCard";
import type { ProductCardData } from "./product-types";

const mockAddItem = vi.fn();
const mockOpenCart = vi.fn();

vi.mock("@/lib/cart-context", () => ({
  useCart: () => ({
    addItem: mockAddItem,
    openCart: mockOpenCart,
  }),
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("@/lib/currency-context", () => ({
  useCurrency: () => ({
    formatPrice: (amount: number) => `${amount} XOF`,
  }),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [] }),
    })),
  },
}));

describe("ProductCard - Ajout rapide et variantes", () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
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

  const baseProduct: ProductCardData = {
    id: "prod-1",
    slug: "t-shirt-brut",
    name: "T-Shirt Brut",
    reference: "TEE-01",
    price: 25000,
    currency: "XOF",
    image: "https://example.com/tee.webp",
  };

  it("affiche le bouton « Ajout rapide » seulement si le produit a une seule variante en stock", async () => {
    const singleVariantProduct: ProductCardData = {
      ...baseProduct,
      variants: [
        {
          id: "var-1",
          size: "Unique",
          color: "Noir",
          sku: "TEE-01-U",
          stock: 4,
          price: 25000,
        },
      ],
    };

    await act(async () => {
      root!.render(
        <MemoryRouter>
          <ProductCard product={singleVariantProduct} />
        </MemoryRouter>
      );
    });

    const quickAddBtn = container!.querySelector(
      'button[aria-label*="Ajout rapide"]'
    );
    expect(quickAddBtn).not.toBeNull();
    expect(quickAddBtn?.textContent?.trim()).toBe("Ajout rapide");

    // Pas de bouton "Choisir la taille"
    const chooseSizeLink = container!.querySelector(
      'a[aria-label*="Choisir la taille"]'
    );
    expect(chooseSizeLink).toBeNull();

    // Clic sur "Ajout rapide" ajoute l'article au panier et ouvre le tiroir
    await act(async () => {
      (quickAddBtn as HTMLButtonElement).click();
    });

    expect(mockAddItem).toHaveBeenCalledWith(
      expect.objectContaining({
        variant_id: "var-1",
        product_id: "prod-1",
        product_name: "T-Shirt Brut",
        unit_price: 25000,
      })
    );
    expect(mockOpenCart).toHaveBeenCalled();
  });

  it("affiche « Choisir la taille » si le produit a plusieurs variantes en stock", async () => {
    const multiVariantProduct: ProductCardData = {
      ...baseProduct,
      variants: [
        { id: "var-1", size: "M", color: "Noir", stock: 3, price: 25000 },
        { id: "var-2", size: "L", color: "Noir", stock: 2, price: 25000 },
      ],
    };

    await act(async () => {
      root!.render(
        <MemoryRouter>
          <ProductCard product={multiVariantProduct} />
        </MemoryRouter>
      );
    });

    const chooseSizeLink = container!.querySelector(
      'a[aria-label*="Choisir la taille"]'
    );
    expect(chooseSizeLink).not.toBeNull();
    expect(chooseSizeLink?.textContent?.trim()).toBe("Choisir la taille");

    // Pas de bouton "Ajout rapide"
    const quickAddBtn = container!.querySelector(
      'button[aria-label*="Ajout rapide"]'
    );
    expect(quickAddBtn).toBeNull();
  });

  it("n'affiche aucun bouton si la variante est épuisée", async () => {
    const soldOutProduct: ProductCardData = {
      ...baseProduct,
      variants: [
        { id: "var-1", size: "M", color: "Noir", stock: 0, price: 25000 },
      ],
    };

    await act(async () => {
      root!.render(
        <MemoryRouter>
          <ProductCard product={soldOutProduct} />
        </MemoryRouter>
      );
    });

    const quickAddBtn = container!.querySelector(
      'button[aria-label*="Ajout rapide"]'
    );
    const chooseSizeLink = container!.querySelector(
      'a[aria-label*="Choisir la taille"]'
    );

    expect(quickAddBtn).toBeNull();
    expect(chooseSizeLink).toBeNull();
  });
});

