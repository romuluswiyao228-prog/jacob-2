import {
  useState,
  useEffect,
  useRef,
  type ReactNode,
  type ElementType,
  type ComponentPropsWithoutRef,
} from "react";
import styles from "./Reveal.module.css";

export type RevealProps<T extends ElementType = "div"> = {
  as?: T;
  children: ReactNode;
  /** Décalage en millisecondes (ex: 60ms par élément dans une grille) */
  delay?: number;
  className?: string;
} & ComponentPropsWithoutRef<T>;

export function Reveal<T extends ElementType = "div">({
  as,
  children,
  delay = 0,
  className,
  style,
  ...rest
}: RevealProps<T>) {
  const Component = as || "div";
  const ref = useRef<HTMLElement>(null);

  // Vérifie si IntersectionObserver ou reduced-motion est présent
  const [isVisible, setIsVisible] = useState(() => {
    // Si environnement sans IntersectionObserver (ex: SSR, tests basiques sans mock, ou JS désactivé)
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      return true;
    }
    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return true;
    }
    return false;
  });

  useEffect(() => {
    if (isVisible) return;
    if (typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }

    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -40px 0px",
      }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [isVisible]);

  const customStyle = {
    ...style,
    ...(delay > 0 && isVisible ? { transitionDelay: `${delay}ms` } : {}),
  };

  return (
    <Component
      ref={ref as any}
      className={[
        styles.reveal,
        isVisible ? styles.visible : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={customStyle}
      data-revealed={isVisible ? "true" : "false"}
      {...rest}
    >
      {children}
    </Component>
  );
}

