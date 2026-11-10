import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import FavoritesPage from "./FavoritesPage";

const mockUseAuth = vi.fn();

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/lib/cart-context", () => ({
  useCart: () => ({
    addItem: vi.fn(),
    openCart: vi.fn(),
  }),
}));

vi.mock("@/lib/currency-context", () => ({
  useCurrency: () => ({
    formatPrice: (val: number) => `${val.toLocaleString("fr-FR")} XOF`,
    currency: "XOF",
    setCurrency: vi.fn(),
  }),
}));

// Supabase mock
vi.mock("@/lib/supabase", () => {
  return {
    supabase: {
      from: (table: string) => {
        const builder: any = {
          select: vi.fn(() => builder),
          eq: vi.fn(() => builder),
          in: vi.fn(() => builder),
          order: vi.fn(() => builder),
          delete: vi.fn(() => builder),
          then: (resolve: (val: any) => void) => {
            if (table === "favorites") {
              resolve({ data: [], error: null });
            } else {
              resolve({ data: [], error: null });
            }
          },
        };
        return builder;
      },
    },
  };
});

let roots: Root[] = [];

async function renderFavoritesPage(): Promise<HTMLDivElement> {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.push(root);

  await act(async () => {
    root.render(
      <MemoryRouter>
        <FavoritesPage />
      </MemoryRouter>
    );
  });

  return container;
}

describe("FavoritesPage", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: { id: "user-123", email: "client@example.com" },
      isLoading: false,
      signOut: vi.fn(),
    });
  });

  afterEach(() => {
    roots.forEach((r) => r.unmount());
    roots = [];
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("affiche l'état vide clair avec bouton vers la boutique lorsque l'utilisateur n'a aucun favori", async () => {
    const container = await renderFavoritesPage();

    expect(container.textContent).toMatch(/aucune pièce enregistrée en favoris|aucun favori/i);
    const shopLink = container.querySelector('a[href="/boutique"]');
    expect(shopLink).not.toBeNull();
    expect(shopLink?.textContent).toMatch(/boutique/i);
  });
});
