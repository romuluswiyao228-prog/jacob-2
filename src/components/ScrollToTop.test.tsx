import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, useNavigate, useLocation } from "react-router-dom";
import { ScrollToTop } from "./ScrollToTop";

const mockCloseCart = vi.fn();
vi.mock("@/lib/cart-context", () => ({
  useCart: () => ({
    closeCart: mockCloseCart,
  }),
}));

function NavigationHelper() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div>
      <span data-testid="location">{location.pathname + location.search + location.hash}</span>
      <button id="btn-boutique" onClick={() => navigate("/boutique")}>Aller Boutique</button>
      <button id="btn-search" onClick={() => navigate("/boutique?q=t-shirt")}>Filtrer Recherche</button>
      <button id="btn-sort" onClick={() => navigate("/boutique?tri=price_asc")}>Trier Prix</button>
      <button id="btn-anchor" onClick={() => navigate("/boutique#mon-ancre")}>Aller Ancre</button>
      <button id="btn-contact" onClick={() => navigate("/contact")}>Aller Contact</button>
    </div>
  );
}

describe("ScrollToTop component", () => {
  let scrollToSpy: ReturnType<typeof vi.spyOn>;
  let roots: Root[] = [];
  let containers: HTMLDivElement[] = [];

  beforeEach(() => {
    scrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    mockCloseCart.mockClear();
    roots = [];
    containers = [];
  });

  afterEach(() => {
    scrollToSpy.mockRestore();
    vi.clearAllMocks();
    roots.forEach((root) => {
      act(() => {
        root.unmount();
      });
    });
    containers.forEach((c) => c.remove());
  });

  async function renderWithRouter(initialEntry = "/") {
    const container = document.createElement("div");
    document.body.appendChild(container);
    containers.push(container);
    const root = createRoot(container);
    roots.push(root);

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={[initialEntry]}>
          <ScrollToTop />
          <NavigationHelper />
        </MemoryRouter>
      );
    });

    return container;
  }

  it("remonte en haut de page (window.scrollTo(0, 0)) au montage et au changement de pathname", async () => {
    const container = await renderWithRouter("/");

    // Montage initial
    expect(scrollToSpy).toHaveBeenCalledWith(0, 0);
    scrollToSpy.mockClear();
    mockCloseCart.mockClear();

    // Navigation vers /boutique (changement de pathname)
    await act(async () => {
      const btn = container.querySelector("#btn-boutique") as HTMLButtonElement;
      btn.click();
    });

    expect(scrollToSpy).toHaveBeenCalledTimes(1);
    expect(scrollToSpy).toHaveBeenCalledWith(0, 0);
    expect(mockCloseCart).toHaveBeenCalledTimes(1);

    // Navigation vers /contact (changement de pathname)
    scrollToSpy.mockClear();
    mockCloseCart.mockClear();
    await act(async () => {
      const btn = container.querySelector("#btn-contact") as HTMLButtonElement;
      btn.click();
    });

    expect(scrollToSpy).toHaveBeenCalledTimes(1);
    expect(scrollToSpy).toHaveBeenCalledWith(0, 0);
    expect(mockCloseCart).toHaveBeenCalledTimes(1);
  });

  it("ne remonte pas quand seul le paramètre de recherche change (filtres, tri, pagination)", async () => {
    const container = await renderWithRouter("/boutique");

    // Reset après le montage
    scrollToSpy.mockClear();
    mockCloseCart.mockClear();

    // Changement de paramètre de recherche ?q=t-shirt sur le même pathname
    await act(async () => {
      const btn = container.querySelector("#btn-search") as HTMLButtonElement;
      btn.click();
    });

    // Ne doit PAS avoir appelé window.scrollTo
    expect(scrollToSpy).not.toHaveBeenCalled();
    expect(mockCloseCart).not.toHaveBeenCalled();

    // Changement de tri ?tri=price_asc sur le même pathname
    await act(async () => {
      const btn = container.querySelector("#btn-sort") as HTMLButtonElement;
      btn.click();
    });

    expect(scrollToSpy).not.toHaveBeenCalled();
    expect(mockCloseCart).not.toHaveBeenCalled();
  });

  it("fait défiler jusqu'à l'élément visé sans appeler window.scrollTo(0, 0) quand l'adresse contient un #ancre", async () => {
    const targetElement = document.createElement("div");
    targetElement.id = "mon-ancre";
    const scrollIntoViewSpy = vi.fn();
    targetElement.scrollIntoView = scrollIntoViewSpy;
    document.body.appendChild(targetElement);

    const container = await renderWithRouter("/boutique");
    scrollToSpy.mockClear();

    // Clic vers /boutique#mon-ancre
    await act(async () => {
      const btn = container.querySelector("#btn-anchor") as HTMLButtonElement;
      btn.click();
    });

    // Ne doit pas appeler scrollTo(0, 0)
    expect(scrollToSpy).not.toHaveBeenCalled();
    expect(scrollIntoViewSpy).toHaveBeenCalled();

    targetElement.remove();
  });
});
