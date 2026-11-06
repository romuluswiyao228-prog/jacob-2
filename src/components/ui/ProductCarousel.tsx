import {
  useRef,
  useState,
  useEffect,
  useCallback,
  Children,
  type ReactNode,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./ProductCarousel.module.css";

export interface ProductCarouselProps {
  children: ReactNode;
  ariaLabel?: string;
  className?: string;
}

/**
 * Bande horizontale de défilement (scroll-snap) pour cartes produits :
 * - Mobile : environ 1,2 carte visible avec glissement tactile
 * - Ordinateur : environ 4,2 cartes visibles avec flèches précédent/suivant
 * - Navigation clavier (flèches gauche/droite et focus tab)
 * - Barre de défilement masquée
 * - Respect de prefers-reduced-motion
 */
export function ProductCarousel({
  children,
  ariaLabel = "Produits",
  className,
}: ProductCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => updateArrows());
      ro.observe(el);
    }

    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
      ro?.disconnect();
    };
  }, [updateArrows]);

  const getScrollStep = () => {
    const el = trackRef.current;
    if (!el) return 300;
    const firstItem = el.firstElementChild as HTMLElement | null;
    return firstItem ? firstItem.offsetWidth + 16 : el.clientWidth * 0.75;
  };

  const handlePrev = () => {
    const el = trackRef.current;
    if (!el) return;
    const isReduced =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({
      left: -getScrollStep(),
      behavior: isReduced ? "auto" : "smooth",
    });
  };

  const handleNext = () => {
    const el = trackRef.current;
    if (!el) return;
    const isReduced =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({
      left: getScrollStep(),
      behavior: isReduced ? "auto" : "smooth",
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      handlePrev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      handleNext();
    }
  };

  const count = Children.count(children);
  if (count === 0) return null;

  return (
    <div className={[styles.carouselWrapper, className].filter(Boolean).join(" ")}>
      <button
        type="button"
        className={[styles.arrowBtn, styles.arrowPrev].join(" ")}
        onClick={handlePrev}
        disabled={!canScrollLeft}
        aria-label="Produits précédents"
      >
        <ChevronLeft size={22} strokeWidth={2} />
      </button>

      <div
        ref={trackRef}
        className={styles.track}
        tabIndex={0}
        role="region"
        aria-label={ariaLabel}
        onKeyDown={handleKeyDown}
      >
        {Children.map(children, (child, index) => (
          <div key={index} className={styles.item}>
            {child}
          </div>
        ))}
      </div>

      <button
        type="button"
        className={[styles.arrowBtn, styles.arrowNext].join(" ")}
        onClick={handleNext}
        disabled={!canScrollRight}
        aria-label="Produits suivants"
      >
        <ChevronRight size={22} strokeWidth={2} />
      </button>
    </div>
  );
}

