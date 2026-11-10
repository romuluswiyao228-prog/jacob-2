import {
  useState,
  useEffect,
  type ReactNode,
  type CSSProperties,
  type HTMLAttributes,
} from "react";
import styles from "./Marquee.module.css";

export interface MarqueeProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Durée en secondes pour un cycle complet (défaut : 25s) */
  speed?: number;
  /** Sens du défilement : "left" (défaut) ou "right" */
  direction?: "left" | "right";
  /** Pause l'animation au survol de la souris */
  pauseOnHover?: boolean;
  /** Pause l'animation lors de la prise de focus */
  pauseOnFocus?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function Marquee({
  children,
  speed = 25,
  direction = "left",
  pauseOnHover = true,
  pauseOnFocus = true,
  className,
  style,
  ...rest
}: MarqueeProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    return false;
  });

  const [isTouching, setIsTouching] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener?.("change", handler);
    return () => mediaQuery.removeEventListener?.("change", handler);
  }, []);

  const customStyle: CSSProperties = {
    ...style,
    "--marquee-duration": `${speed}s`,
  } as CSSProperties;

  const isPaused = isTouching;

  return (
    <div
      className={[
        styles.marquee,
        pauseOnHover ? styles.pauseOnHover : "",
        pauseOnFocus ? styles.pauseOnFocus : "",
        prefersReducedMotion ? styles.reducedMotion : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={customStyle}
      onTouchStart={() => setIsTouching(true)}
      onTouchEnd={() => setIsTouching(false)}
      data-reduced-motion={prefersReducedMotion ? "true" : undefined}
      {...rest}
    >
      <div
        className={[
          styles.track,
          direction === "right" ? styles.reverse : "",
          isPaused ? styles.paused : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={prefersReducedMotion ? { animation: "none" } : undefined}
      >
        <div className={styles.content}>{children}</div>
        <div className={styles.content} aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}

