import { describe, it, expect, vi, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { AccountLayout } from "./AccountLayout";

const mockSignOut = vi.fn();

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "client@example.com" },
    signOut: mockSignOut,
  }),
}));

let roots: Root[] = [];

async function renderAccountLayout(initialPath = "/compte"): Promise<HTMLDivElement> {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.push(root);

  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[initialPath]}>
        <AccountLayout title="Mon compte">
          <div data-testid="content">Contenu de la page</div>
        </AccountLayout>
      </MemoryRouter>
    );
  });

  return container;
}

describe("AccountLayout", () => {
  afterEach(() => {
    roots.forEach((r) => r.unmount());
    roots = [];
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("affiche les 4 onglets de navigation (Profil, Adresses, Commandes, Favoris) et le bouton de déconnexion", async () => {
    const container = await renderAccountLayout("/compte");

    const nav = container.querySelector('nav[aria-label="Menu du compte"]');
    expect(nav).not.toBeNull();

    const profileLink = nav?.querySelector('a[href="/compte"]');
    const addressesLink = nav?.querySelector('a[href="/compte/adresses"]');
    const ordersLink = nav?.querySelector('a[href="/compte/commandes"]');
    const favoritesLink = nav?.querySelector('a[href="/favoris"]');
    const logoutBtn = nav?.querySelector("button");

    expect(profileLink).not.toBeNull();
    expect(addressesLink).not.toBeNull();
    expect(ordersLink).not.toBeNull();
    expect(favoritesLink).not.toBeNull();
    expect(logoutBtn).not.toBeNull();
    expect(logoutBtn?.textContent).toMatch(/déconnexion/i);
  });

  it("met en avant l'onglet actif selon la route courante", async () => {
    // 1. Sur /compte -> Profil actif
    const container1 = await renderAccountLayout("/compte");
    const activeLink1 = container1.querySelector('a[aria-current="page"]');
    expect(activeLink1?.getAttribute("href")).toBe("/compte");
    expect(activeLink1?.className).toMatch(/navLinkActive/);

    // Nettoyage avant prochain rendu
    roots.forEach((r) => r.unmount());
    roots = [];
    document.body.innerHTML = "";

    // 2. Sur /compte/commandes -> Commandes actif
    const container2 = await renderAccountLayout("/compte/commandes");
    const activeLink2 = container2.querySelector('a[aria-current="page"]');
    expect(activeLink2?.getAttribute("href")).toBe("/compte/commandes");
    expect(activeLink2?.className).toMatch(/navLinkActive/);

    // Nettoyage avant prochain rendu
    roots.forEach((r) => r.unmount());
    roots = [];
    document.body.innerHTML = "";

    // 3. Sur /favoris -> Favoris actif
    const container3 = await renderAccountLayout("/favoris");
    const activeLink3 = container3.querySelector('a[aria-current="page"]');
    expect(activeLink3?.getAttribute("href")).toBe("/favoris");
    expect(activeLink3?.className).toMatch(/navLinkActive/);
  });
});
