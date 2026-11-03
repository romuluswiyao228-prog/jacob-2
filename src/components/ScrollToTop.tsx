import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useCart } from "@/lib/cart-context";

export function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const prevPathnameRef = useRef<string | null>(null);
  const prevHashRef = useRef<string | null>(null);
  const { closeCart } = useCart();

  useEffect(() => {
    const isFirstMount = prevPathnameRef.current === null;
    const pathnameChanged = !isFirstMount && prevPathnameRef.current !== pathname;
    const hashChanged = !isFirstMount && prevHashRef.current !== hash;
    prevPathnameRef.current = pathname;
    prevHashRef.current = hash;

    if (pathnameChanged) {
      // Ferme le tiroir du panier et le menu mobile lors d'un changement de route
      closeCart?.();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("close-mobile-menu"));
      }
    }

    // Si l'adresse contient une ancre (#ancre), faire défiler jusqu'à l'élément visé
    if (hash && (isFirstMount || pathnameChanged || hashChanged)) {
      const id = decodeURIComponent(hash.replace(/^#/, ""));
      const targetElement =
        document.getElementById(id) ||
        document.querySelector(`[name="${id}"]`);

      if (targetElement && typeof targetElement.scrollIntoView === "function") {
        targetElement.scrollIntoView();
        return;
      }
    }

    // Remonte tout en haut uniquement si changement de page ou premier montage sans ancre
    if (pathnameChanged || (isFirstMount && !hash)) {
      if (typeof window !== "undefined" && typeof window.scrollTo === "function") {
        window.scrollTo(0, 0);
      }
    }
  }, [pathname, hash, closeCart]);

  return null;
}

export default ScrollToTop;

