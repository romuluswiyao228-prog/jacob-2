import {
  useRef,
  useState,
  useEffect,
  useCallback,
  Children,
  type ReactNode,
  type MouseEvent as ReactMouseEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./ProductCarousel.module.css";

export interface ProductCarouselProps {
  children: ReactNode;
  ariaLabel?: string;
  className?: string;
  autoPlay?: boolean;
  autoPlayInterval?: number;
}

/**
 * Bande horizontale de défilement (scroll-snap) pour cartes produits :
 * - Mobile : environ 1,2 carte visible avec glissement tactile
 * - Ordinateur : environ 4,2 cartes visibles avec flèches précédent/suivant
 * - Navigation clavier (flèches gauche/droite et focus tab)
 * - Glisser à la souris (mouse drag)
 * - AutoPlay (5 s par produit) avec pause au survol, focus, toucher et onglet masqué
 * - Arrêt autoPlay avec prefers-reduced-motion
 * - Compteur « 01 / 08 »
 * - Barre de défilement masquée
 */
export function ProductCarousel({
  children,
  ariaLabel = "Produits",
  className,
  autoPlay = false,
  autoPlayInterval = 5000,
}: ProductCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  // AutoPlay pause triggers
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isTouching, setIsTouching] = useState(false);
  const [isDocHidden, setIsDocHidden] = useState(() =>
    typeof document !== "undefined" ? document.hidden : false
  );

  // Mouse drag states
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);

  // Prefers-reduced-motion
  const [isReducedMotion, setIsReducedMotion] = useState(() => {
    if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  // Visibility change listener
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVisibilityChange = () => setIsDocHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  const count = Children.count(children);

  const updateArrowsAndIndex = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);

    const items = Array.from(el.children) as HTMLElement[];
    if (items.length === 0) return;
    let activeIdx = 0;
    let minDiff = Infinity;
    items.forEach((item, idx) => {
      const diff = Math.abs(item.offsetLeft - scrollLeft);
      if (diff < minDiff) {
        minDiff = diff;
        activeIdx = idx;
      }
    });
    setCurrentIndex(activeIdx);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updateArrowsAndIndex();
    el.addEventListener("scroll", updateArrowsAndIndex, { passive: true });
    window.addEventListener("resize", updateArrowsAndIndex);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => updateArrowsAndIndex());
      ro.observe(el);
    }

    return () => {
      el.removeEventListener("scroll", updateArrowsAndIndex);
      window.removeEventListener("resize", updateArrowsAndIndex);
      ro?.disconnect();
    };
  }, [updateArrowsAndIndex]);

  const getScrollStep = () => {
    const el = trackRef.current;
    if (!el) return 300;
    const firstItem = el.firstElementChild as HTMLElement | null;
    return firstItem ? firstItem.offsetWidth + 16 : el.clientWidth * 0.75;
  };

  const handlePrev = () => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({
      left: -getScrollStep(),
      behavior: isReducedMotion ? "auto" : "smooth",
    });
  };

  const handleNext = useCallback(
    (loop = false) => {
      const el = trackRef.current;
      if (!el) return;
      const { scrollLeft, scrollWidth, clientWidth } = el;
      const isAtEnd =
        scrollWidth > clientWidth &&
        scrollLeft >= scrollWidth - clientWidth - 8;
      if (loop && isAtEnd) {
        el.scrollTo({ left: 0, behavior: isReducedMotion ? "auto" : "smooth" });
        return;
      }
      el.scrollBy({
        left: getScrollStep(),
        behavior: isReducedMotion ? "auto" : "smooth",
      });
    },
    [isReducedMotion]
  );

  // AutoPlay timer
  const isAutoPlayPaused =
    !autoPlay ||
    isReducedMotion ||
    isHovered ||
    isFocused ||
    isTouching ||
    isDragging ||
    isDocHidden;

  useEffect(() => {
    if (isAutoPlayPaused || count <= 1) return;
    const timer = setInterval(() => {
      handleNext(true);
    }, autoPlayInterval);

    return () => clearInterval(timer);
  }, [isAutoPlayPaused, count, autoPlayInterval, handleNext]);

  // Keyboard navigation
  const handleKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      handlePrev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      handleNext(false);
    }
  };

  // Mouse drag handlers
  const handleMouseDown = (e: ReactMouseEvent) => {
    if (e.button !== 0) return;
    const el = trackRef.current;
    if (!el) return;
    setIsDragging(true);
    hasDraggedRef.current = false;
    const x = e.pageX ?? e.clientX ?? 0;
    startXRef.current = x - el.offsetLeft;
    scrollLeftRef.current = el.scrollLeft;
  };

  const handleMouseMove = (e: ReactMouseEvent) => {
    if (!isDragging) return;
    const el = trackRef.current;
    if (!el) return;
    e.preventDefault();
    const x = e.pageX ?? e.clientX ?? 0;
    const walk = x - startXRef.current;
    if (Math.abs(walk) > 4) {
      hasDraggedRef.current = true;
    }
    el.scrollLeft = scrollLeftRef.current - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleClickCapture = (e: ReactMouseEvent) => {
    if (hasDraggedRef.current) {
      e.stopPropagation();
      e.preventDefault();
    }
  };

  if (count === 0) return null;

  const currentDisplay = String(currentIndex + 1).padStart(2, "0");
  const totalDisplay = String(count).padStart(2, "0");

  return (
    <div
      className={[styles.carouselWrapper, className].filter(Boolean).join(" ")}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsDragging(false);
      }}
      onMouseOver={() => setIsHovered(true)}
      onMouseOut={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsHovered(false);
          setIsDragging(false);
        }
      }}
      onFocusCapture={() => setIsFocused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsFocused(false);
        }
      }}
      data-autoplay={autoPlay ? "true" : undefined}
      data-paused={isAutoPlayPaused ? "true" : "false"}
    >
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
        className={[styles.track, isDragging ? styles.isDragging : ""].filter(Boolean).join(" ")}
        tabIndex={0}
        role="region"
        aria-label={ariaLabel}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onTouchStart={() => setIsTouching(true)}
        onTouchEnd={() => setIsTouching(false)}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClickCapture={handleClickCapture}
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
        onClick={() => handleNext(false)}
        disabled={!canScrollRight}
        aria-label="Produits suivants"
      >
        <ChevronRight size={22} strokeWidth={2} />
      </button>

      {/* Compteur 01 / 08 */}
      <div
        className={styles.counter}
        aria-label={`Élément ${currentIndex + 1} sur ${count}`}
        aria-live="polite"
      >
        <span className={styles.counterCurrent}>{currentDisplay}</span>
        <span className={styles.counterSep}>/</span>
        <span className={styles.counterTotal}>{totalDisplay}</span>
      </div>
    </div>
  );
}

export { ProductCarousel as Carousel };
export type { ProductCarouselProps as CarouselProps };
