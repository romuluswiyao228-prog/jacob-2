import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import CartPage from "./CartPage";

const mockUseCart = vi.fn();

vi.mock("@/lib/cart-context", () => ({
  useCart: () => mockUseCart(),
}));

vi.mock("@/lib/currency-context", () => ({
  useCurrency: () => ({
    formatPrice: (val: number) => `${val.toLocaleString("fr-FR")} XOF`,
    currency: "XOF",
    setCurrency: vi.fn(),
  }),
}));

let roots: Root[] = [];

async function renderCartPage(): Promise<HTMLDivElement> {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.push(root);

  await act(async () => {
    root.render(
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>
    );
  });

  return container;
}

describe("CartPage", () => {
  beforeEach(() => {
    mockUseCart.mockReturnValue({
      items: [],
      subtotal: 0,
      isLoading: false,
      error: null,
      removeItem: vi.fn(),
      updateQuantity: vi.fn(),
      clearAlerts: vi.fn(),
      retry: vi.fn(),
    });
  });

  afterEach(() => {
    roots.forEach((r) => r.unmount());
    roots = [];
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("affiche l'état vide avec un bouton vers la boutique lorsque le panier est vide", async () => {
    const container = await renderCartPage();

    expect(container.textContent).toMatch(/votre sac est vide/i);
    const shopLink = container.querySelector('a[href="/boutique"]');
    expect(shopLink).not.toBeNull();
    expect(shopLink?.textContent).toMatch(/boutique/i);
  });

  it("masque le code promotionnel dans le panier car aucun champ promo n'existe au niveau du panier", async () => {
    mockUseCart.mockReturnValue({
      items: [
        {
          id: "item-1",
          variant_id: "var-1",
          product_id: "prod-1",
          product_name: "T-Shirt Brutal",
          product_slug: "t-shirt-brutal",
          image_url: "https://example.com/tshirt.webp",
          size: "L",
          color: "Noir",
          sku: "TSH-BLK-L",
          unit_price: 25000,
          currency: "XOF",
          quantity: 1,
          stock: 10,
        },
      ],
      subtotal: 25000,
      isLoading: false,
      error: null,
      removeItem: vi.fn(),
      updateQuantity: vi.fn(),
      clearAlerts: vi.fn(),
      retry: vi.fn(),
    });

    const container = await renderCartPage();

    // Vérifie que les informations du panier sont bien affichées
    expect(container.textContent).toContain("T-Shirt Brutal");
    expect(container.textContent).toMatch(/passer la commande/i);

    // Vérifie qu'aucun champ ou bloc de code promotionnel n'est inventé ou présent
    const promoInput = container.querySelector('input[name*="promo" i], input[placeholder*="promo" i]');
    expect(promoInput).toBeNull();
    expect(container.textContent).not.toMatch(/code promo/i);
  });
});

