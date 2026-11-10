import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Reveal } from "./Reveal";

let roots: Root[] = [];

async function renderReveal(
  props: React.ComponentProps<typeof Reveal>
): Promise<HTMLDivElement> {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.push(root);

  await act(async () => {
    root.render(<Reveal {...props} />);
  });

  return container;
}

describe("Reveal", () => {
  let originalObserver: typeof window.IntersectionObserver;
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    originalObserver = window.IntersectionObserver;
    originalMatchMedia = window.matchMedia;
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

  afterEach(async () => {
    for (const r of roots) {
      await act(async () => {
        r.unmount();
      });
    }
    roots = [];
    document.body.innerHTML = "";
    window.IntersectionObserver = originalObserver;
    window.matchMedia = originalMatchMedia;
    vi.restoreAllMocks();
  });

  it("le contenu est immédiatement visible sans IntersectionObserver", async () => {
    // Supprimer IntersectionObserver pour simuler l'absence d'API
    // @ts-expect-error test sans observer
    delete window.IntersectionObserver;

    const container = await renderReveal({
      children: <p>Texte accessible immédiatement</p>,
    });

    const el = container.querySelector('[data-revealed="true"]');
    expect(el).not.toBeNull();
    expect(el?.className).toContain("visible");
    expect(el?.textContent).toContain("Texte accessible immédiatement");
  });

  it("le contenu est immédiatement visible avec prefers-reduced-motion", async () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const container = await renderReveal({
      children: <div>Contenu reduced motion</div>,
    });

    const el = container.querySelector('[data-revealed="true"]');
    expect(el).not.toBeNull();
    expect(el?.className).toContain("visible");
  });

  it("passe à l'état visible quand l'IntersectionObserver déclenche l'apparition", async () => {
    let observerCallback: IntersectionObserverCallback = () => {};
    const unobserveMock = vi.fn();
    const observeMock = vi.fn();

    class MockIntersectionObserver {
      readonly root: Element | Document | null = null;
      readonly rootMargin: string = "";
      readonly thresholds: ReadonlyArray<number> = [];
      constructor(cb: IntersectionObserverCallback) {
        observerCallback = cb;
      }
      observe = observeMock;
      unobserve = unobserveMock;
      disconnect = vi.fn();
      takeRecords = () => [];
    }

    window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;

    const container = await renderReveal({
      children: <div>Élément observé</div>,
    });

    const el = container.firstElementChild as HTMLElement;
    expect(observeMock).toHaveBeenCalled();
    // Au départ avec observer, non visible
    expect(el?.getAttribute("data-revealed")).toBe("false");

    // Simuler le passage à l'intersection
    await act(async () => {
      observerCallback(
        [{ isIntersecting: true, target: el } as unknown as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
    });

    expect(el?.getAttribute("data-revealed")).toBe("true");
    expect(el?.className).toContain("visible");
    expect(unobserveMock).toHaveBeenCalledWith(el);
  });

  it("supporte la prop as pour rendre une section ou un article", async () => {
    // @ts-expect-error test sans observer
    delete window.IntersectionObserver;

    const container = await renderReveal({
      as: "section",
      children: <h2>Titre de section</h2>,
    });

    const section = container.querySelector("section");
    expect(section).not.toBeNull();
    expect(section?.textContent).toContain("Titre de section");
  });
});
