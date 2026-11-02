import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import OrderConfirmationPage from "./OrderConfirmationPage";

vi.mock("@/lib/hooks", () => ({
  useStoreSettings: vi.fn(),
}));

import { useStoreSettings } from "@/lib/hooks";

const mockOrderState = {
  orderId: "ord_123",
  orderNumber: "CMD-2026-0001",
  subtotal: 50000,
  shippingTotal: 2500,
  discountTotal: 0,
  total: 52500,
  currency: "XOF",
  customer: {
    first_name: "Jean",
    last_name: "Dupont",
    email: "jean.dupont@example.com",
    phone: "0102030405",
  },
  shippingAddress: {
    line1: "Rue 12",
    city: "Abidjan",
    country: "Côte d'Ivoire",
  },
  items: [
    {
      id: "item_1",
      product_name: "T-shirt Brutal",
      unit_price: 25000,
      quantity: 2,
    },
  ],
};

let roots: Root[] = [];

async function renderPage(initialState: unknown = mockOrderState): Promise<HTMLDivElement> {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.push(root);

  await act(async () => {
    root.render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/confirmation",
            state: initialState,
          },
        ]}
      >
        <Routes>
          <Route path="/confirmation" element={<OrderConfirmationPage />} />
        </Routes>
      </MemoryRouter>
    );
  });

  return container;
}

describe("OrderConfirmationPage", () => {
  beforeEach(() => {
    vi.mocked(useStoreSettings).mockReturnValue({
      data: null,
      error: null,
      isLoading: false,
    } as any);
  });

  afterEach(() => {
    for (const root of roots) {
      act(() => root.unmount());
    }
    roots = [];
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("supprime la fausse confirmation par e-mail et affiche le message sur le suivi et paiement à la livraison", async () => {
    const container = await renderPage();

    expect(container.textContent).not.toContain(
      "Un e-mail de confirmation récapitulatif a été transmis à"
    );
    expect(container.textContent).toContain(
      "Conservez ce numéro : il vous permet de suivre votre commande et de contacter la boutique. Le règlement se fait à la livraison."
    );
  });

  it("affiche le bloc WhatsApp avec le bouton et lien prérempli si whatsapp_number est valide", async () => {
    vi.mocked(useStoreSettings).mockReturnValue({
      data: { whatsapp_number: "22501020304" },
      error: null,
      isLoading: false,
    } as any);

    const container = await renderPage();

    const link = container.querySelector(
      'a[href^="https://wa.me/22501020304"]'
    ) as HTMLAnchorElement | null;
    expect(link).not.toBeNull();
    expect(link?.textContent).toContain("Envoyer ma commande sur WhatsApp");
    expect(link?.getAttribute("target")).toBe("_blank");
    expect(link?.getAttribute("rel")).toBe("noopener noreferrer");

    const href = link?.getAttribute("href") ?? "";
    expect(href).toContain("CMD-2026-0001");
    expect(href).toContain("Jean%20Dupont");
    expect(href).toContain("Abidjan");
    expect(href).toContain("52%20500%20XOF");
    expect(href).toContain(encodeURIComponent("Pouvez-vous me confirmer la livraison ?"));
  });

  it("n'affiche aucun bloc WhatsApp si whatsapp_number est absent ou invalide", async () => {
    vi.mocked(useStoreSettings).mockReturnValue({
      data: { whatsapp_number: "123" }, // Moins de 8 chiffres -> invalide
      error: null,
      isLoading: false,
    } as any);

    const container = await renderPage();

    expect(container.textContent).not.toContain("Envoyer ma commande sur WhatsApp");
    expect(container.querySelector('a[href^="https://wa.me/"]')).toBeNull();
  });
});
