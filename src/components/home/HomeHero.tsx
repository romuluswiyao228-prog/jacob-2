import { useState, useEffect, useRef, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { HomeSlide } from "@/lib/db-types";
import styles from "./HomeHero.module.css";
import homeStyles from "@/routes/HomePage.module.css";

interface SlideFrameProps {
  slides: HomeSlide[];
  side: "left" | "right";
  isPaused: boolean;
  isReducedMotion: boolean;
  initialDelayMs: number;
}

function SlideFrame({
  slides,
  side,
  isPaused,
  isReducedMotion,
  initialDelayMs,
}: SlideFrameProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;

  const hasMultiple = slides.length > 1;

  useEffect(() => {
    if (!hasMultiple || isReducedMotion || isPaused) return;

    let initialTimer: ReturnType<typeof setTimeout> | null = null;
    let intervalTimer: ReturnType<typeof setInterval> | null = null;

    const advance = () => {
      const prev = currentIndexRef.current;
      const next = (prev + 1) % slides.length;
      setPrevIndex(prev);
      setCurrentIndex(next);
      setIsTransitioning(true);
    };

    if (initialDelayMs > 0) {
      initialTimer = setTimeout(() => {
        advance();
        intervalTimer = setInterval(advance, 4500);
      }, initialDelayMs);
    } else {
      intervalTimer = setInterval(advance, 4500);
    }

    return () => {
      if (initialTimer) clearTimeout(initialTimer);
      if (intervalTimer) clearInterval(intervalTimer);
    };
  }, [hasMultiple, isReducedMotion, isPaused, initialDelayMs, slides.length]);

  useEffect(() => {
    if (!isTransitioning) return;
    const timer = setTimeout(() => {
      setIsTransitioning(false);
      setPrevIndex(null);
    }, 700);
    return () => clearTimeout(timer);
  }, [isTransitioning]);

  if (slides.length === 0) return null;

  const currentSlide = slides[currentIndex];
  const nextSlide = slides[(currentIndex + 1) % slides.length];

  return (
    <div
      className={styles.frame}
      data-testid={`slide-frame-${side}`}
      data-active-index={currentIndex}
    >
      {/* Photo sortante pendant la transition */}
      {isTransitioning && prevIndex !== null && slides[prevIndex] && (
        <img
          key={`prev-${slides[prevIndex].id}`}
          src={slides[prevIndex].image_url}
          alt={slides[prevIndex].alt_text}
          className={`${styles.slideImage} ${styles.slideOutgoing}`}
          width={800}
          height={1200}
        />
      )}

      {/* Photo courante / entrante */}
      <img
        key={`curr-${currentSlide.id}`}
        src={currentSlide.image_url}
        alt={currentSlide.alt_text}
        className={[
          styles.slideImage,
          isTransitioning ? styles.slideIncoming : styles.slideActive,
        ].join(" ")}
        fetchPriority={currentIndex === 0 ? "high" : "low"}
        loading={currentIndex === 0 ? "eager" : "lazy"}
        width={800}
        height={1200}
      />

      {/* Préchargement de la photo suivante */}
      {hasMultiple && !isReducedMotion && nextSlide && (
        <img
          src={nextSlide.image_url}
          alt=""
          aria-hidden="true"
          className={styles.slidePreload}
          loading="lazy"
          width={1}
          height={1}
        />
      )}
    </div>
  );
}

export interface HomeHeroProps {
  slides?: HomeSlide[] | null;
  storeName: string;
  tagline?: string | null;
  bannerUrl?: string | null;
  bannerMobileUrl?: string | null;
  intro?: string | null;
  wordmarkStyle?: CSSProperties;
  lines?: string[];
}

export function HomeHero({
  slides,
  storeName,
  tagline,
  bannerUrl,
  bannerMobileUrl,
  intro,
  wordmarkStyle,
  lines = [],
}: HomeHeroProps) {
  const { t } = useTranslation();

  const [isReducedMotion, setIsReducedMotion] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
    if (media.addEventListener) {
      media.addEventListener("change", handler);
      return () => media.removeEventListener("change", handler);
    }
  }, []);

  const [isPaused, setIsPaused] = useState(false);

  const leftSlides = (slides ?? []).filter(
    (s) => s.side === "left" && s.is_active !== false
  );
  const rightSlides = (slides ?? []).filter(
    (s) => s.side === "right" && s.is_active !== false
  );

  const hasLeft = leftSlides.length > 0;
  const hasRight = rightSlides.length > 0;
  const hasSlides = hasLeft || hasRight;

  // Repli : sans aucune photo, rendre la bannière actuelle
  if (!hasSlides) {
    const hasImage = Boolean(bannerUrl || bannerMobileUrl);
    return (
      <section
        className={[homeStyles.hero, hasImage ? homeStyles.heroWithImage : ""]
          .filter(Boolean)
          .join(" ")}
      >
        {hasImage && (
          <>
            {bannerMobileUrl ? (
              <picture className={homeStyles.heroPicture}>
                <source media="(max-width: 700px)" srcSet={bannerMobileUrl} />
                <img
                  src={bannerUrl || bannerMobileUrl}
                  alt=""
                  className={homeStyles.heroImage}
                  fetchPriority="high"
                />
              </picture>
            ) : (
              <img
                src={bannerUrl!}
                alt=""
                className={homeStyles.heroImage}
                fetchPriority="high"
              />
            )}
            <div className={homeStyles.heroShade} />
          </>
        )}
        <div className={homeStyles.heroInner}>
          <h1
            className={homeStyles.wordmark}
            style={wordmarkStyle}
            aria-label={storeName}
          >
            {lines.map((line, i) => (
              <span key={i} className={homeStyles.wordmarkLine} aria-hidden="true">
                <span
                  className={homeStyles.wordmarkText}
                  style={{ animationDelay: `${i * 110}ms` }}
                >
                  {line}
                </span>
              </span>
            ))}
          </h1>
          <div className={homeStyles.heroFoot}>
            {intro ? <p className={homeStyles.heroIntro}>{intro}</p> : <span />}
            <Link to="/boutique" className={homeStyles.cta}>
              {t("home.ctaShop", "DÉCOUVRIR LA BOUTIQUE")}
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // Disposition : deux cadres ou cadre unique
  const gridClass =
    hasLeft && hasRight
      ? `${styles.frameGrid} ${styles.twoColumns}`
      : `${styles.frameGrid} ${styles.singleColumn}`;

  return (
    <section
      className={styles.heroWrapper}
      aria-label={storeName}
      data-testid="home-hero"
      data-paused={isPaused ? "true" : "false"}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onMouseOver={() => setIsPaused(true)}
      onMouseOut={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
    >
      <div className={gridClass}>
        {hasLeft && (
          <SlideFrame
            slides={leftSlides}
            side="left"
            isPaused={isPaused}
            isReducedMotion={isReducedMotion}
            initialDelayMs={0}
          />
        )}
        {hasRight && (
          <SlideFrame
            slides={rightSlides}
            side="right"
            isPaused={isPaused}
            isReducedMotion={isReducedMotion}
            initialDelayMs={2200}
          />
        )}

        {/* Calque noir uni de 25 % pour la lisibilité, sans dégradé */}
        <div className={styles.shade} />

        {/* Par-dessus, centré en bas : nom en Anton, phrase tagline, 2 boutons */}
        <div className={styles.overlayContent}>
          <h1 className={styles.storeTitle}>{storeName}</h1>
          {tagline && <p className={styles.tagline}>{tagline}</p>}
          <div className={styles.actions}>
            <Link to="/boutique" className={styles.btnShop}>
              VOIR LA BOUTIQUE
            </Link>
            <Link to="/boutique?tri=newest" className={styles.btnNew}>
              NOUVEAUTÉS
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
