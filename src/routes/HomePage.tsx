import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ProductCard, ProductCarousel, Marquee, Reveal } from "@/components/ui";
import { Section } from "@/components/home/Section";
import { SEO } from "@/components/SEO";
import {
  useStoreSettings,
  useCategories,
  useNewProducts,
  usePromoProducts,
  useCollections,
  useAllProducts,
  useArchiveProducts,
  useActiveShippingZones,
  useHomeSlides,
  useCommunityPhotos,
} from "@/lib/hooks";
import { HomeHero } from "@/components/home/HomeHero";
import { isValidWhatsAppNumber, whatsappLink } from "@/lib/whatsapp";
import type { ProductCardData } from "@/components/ui";
import type { CommunityPhoto, ProductWithImage } from "@/lib/db-types";
import { splitWordmark, wordmarkSize } from "@/lib/wordmark";
import styles from "./HomePage.module.css";

function productToCardData(product: ProductWithImage): ProductCardData {
  const hasDiscount =
    product.compare_at_price != null &&
    product.compare_at_price > product.price;
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    reference: product.slug.toUpperCase(),
    price: product.price,
    currency: product.currency,
    originalPrice: hasDiscount ? product.compare_at_price : null,
    image: product.primary_image?.url ?? "",
    imageAlt: product.primary_image?.alt_text ?? product.name,
    sizes: [],
    badge: hasDiscount ? "sale" : null,
    variants: (product.variants ?? []).map((v) => ({
      id: v.id,
      size: v.size,
      color: v.color,
      sku: v.sku,
      stock: v.stock,
      price: v.price,
    })),
    createdAt: product.created_at,
  };
}

const capsuleFallbacks = [
  { bg: "#000000", color: "#FFFFFF" },
  { bg: "#FFD400", color: "#000000" },
  { bg: "#F5F5F0", color: "#000000" },
];

export default function HomePage() {
  const { t } = useTranslation();
  const { data: settings } = useStoreSettings();
  const {
    data: categories,
    isLoading: catLoading,
    error: catError,
    refetch: refetchCategories,
  } = useCategories();
  const {
    data: newProducts,
    isLoading: newLoading,
    error: newError,
    refetch: refetchNew,
  } = useNewProducts(12);
  const {
    data: promoProducts,
    isLoading: promoLoading,
    error: promoError,
    refetch: refetchPromo,
  } = usePromoProducts(12);
  const {
    data: collections,
    isLoading: colLoading,
    error: colError,
    refetch: refetchCollections,
  } = useCollections(6);
  const {
    data: allProducts,
    isLoading: allLoading,
    error: allError,
    refetch: refetchAll,
  } = useAllProducts(12);
  const {
    data: archiveData,
    isLoading: archiveLoading,
    error: archiveError,
    refetch: refetchArchive,
  } = useArchiveProducts(12);
  const { data: shippingZones } = useActiveShippingZones();
  const { data: homeSlides } = useHomeSlides();
  const { data: communityPhotos } = useCommunityPhotos();
  const [selectedCommunityPhoto, setSelectedCommunityPhoto] = useState<CommunityPhoto | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const communityRailRef = useRef<HTMLDivElement | null>(null);
  const [communityRailDuration, setCommunityRailDuration] = useState(40);

  const hasCategories = (categories?.length ?? 0) > 0;
  const hasNewProducts = (newProducts?.length ?? 0) > 0;
  const activeCollections = (collections ?? []).filter((c) => c.is_active !== false);
  const hasCollections = activeCollections.length > 0;
  const hasPromoProducts = (promoProducts?.length ?? 0) > 0;
  const archiveProducts = archiveData?.products ?? [];
  const hasArchive = archiveProducts.length > 0;
  const hasAllProducts = (allProducts?.length ?? 0) > 0;

  const aboutText = settings?.about_text?.trim() ?? "";
  const aboutImageUrl = settings?.about_image_url?.trim() ?? "";
  const showBrandSection = Boolean(aboutText || aboutImageUrl);
  const hasStoreLocation = Boolean(settings?.address?.trim() || settings?.city?.trim());

  // Logotype : le nom de la boutique, coupe en deux lignes sur mobile, une seule sur ordinateur.
  const storeName = settings?.store_name?.trim() || "JACOB DE JESUS";
  const lines = splitWordmark(storeName);
  const wordmarkStyle = {
    "--wm-size": wordmarkSize([storeName, ...lines]),
  } as CSSProperties;
  const bannerUrl = settings?.banner_url?.trim() || "";
  const bannerMobileUrl = settings?.banner_mobile_url?.trim() || "";
  const intro = settings?.tagline?.trim() || settings?.description?.trim() || "";
  const communityItems = (communityPhotos ?? []).filter(
    (photo: CommunityPhoto) => photo.is_active && photo.consent_confirmed
  );
  const communityRailItems = communityItems.length > 0
    ? communityItems.length < 6
      ? Array.from({ length: Math.max(2, Math.ceil(6 / communityItems.length)) }, () => communityItems).flat()
      : communityItems
    : [];
  const communityLink = Object.values(settings?.social_links ?? {}).find((value) => typeof value === "string" && value.trim()) ?? null;

  // Vitesse du rail : 40 px/seconde. Un cycle du Marquee parcourt la largeur
  // d'une copie du rail, donc la durée = largeur / 40.
  useEffect(() => {
    const rail = communityRailRef.current;
    if (!rail || communityItems.length === 0) return;
    if (typeof ResizeObserver === "undefined") return;

    const updateDuration = () => {
      const width = rail.getBoundingClientRect().width;
      if (width > 0) {
        setCommunityRailDuration(Math.max(1, width / 40));
      }
    };

    updateDuration();
    const observer = new ResizeObserver(updateDuration);
    observer.observe(rail);
    return () => observer.disconnect();
  }, [communityItems.length]);

  useEffect(() => {
    if (!selectedCommunityPhoto) return;
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusFirst = () => {
      const container = dialogRef.current;
      const firstFocusable = container?.querySelector<HTMLElement>(focusableSelector);
      firstFocusable?.focus();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedCommunityPhoto(null);
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector)
      ).filter((element) => !element.hasAttribute("disabled") && element.tabIndex !== -1);

      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    focusFirst();
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocusedRef.current?.focus();
    };
  }, [selectedCommunityPhoto]);

  // Bande d'informations pratiques
  const activeCountries = Array.from(
    new Set(
      (shippingZones ?? [])
        .filter((z) => z.is_active !== false)
        .flatMap((z) => z.countries ?? [])
        .map((c) => c?.trim())
        .filter(Boolean)
    )
  );

  const infoItems: { id: string; content: ReactNode }[] = [];
  if (settings) {
    infoItems.push({
      id: "cod",
      content: <span>Paiement à la livraison</span>,
    });

    if (settings.returns_policy?.trim()) {
      infoItems.push({
        id: "returns",
        content: (
          <Link to="/retours" className={styles.infoLink}>
            Retours
          </Link>
        ),
      });
    }

    if (activeCountries.length > 0) {
      infoItems.push({
        id: "shipping",
        content: <span>Livraison vers : {activeCountries.join(", ")}</span>,
      });
    }

    if (isValidWhatsAppNumber(settings.whatsapp_number)) {
      const waUrl = whatsappLink(settings.whatsapp_number);
      if (waUrl) {
        infoItems.push({
          id: "whatsapp",
          content: (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.infoLink}
            >
              WhatsApp
            </a>
          ),
        });
      }
    }

    if (settings.city?.trim()) {
      infoItems.push({
        id: "city",
        content: (
          <Link to="/notre-boutique" className={styles.infoLink}>
            Boutique à {settings.city.trim()}
          </Link>
        ),
      });
    }
  }

  const hasPracticalInfo = infoItems.length > 0;

  return (
    <div className={styles.page}>
      <SEO
        title={storeName}
        description={intro || "Marque streetwear contemporaine. Pièces exclusives, finitions haut de gamme et esprit brut."}
        ogImage={bannerUrl || bannerMobileUrl || "/favicon.svg"}
      />

      {/* 1. Bannière */}
      <HomeHero
        slides={homeSlides}
        storeName={storeName}
        tagline={settings?.tagline}
        bannerUrl={bannerUrl}
        bannerMobileUrl={bannerMobileUrl}
        intro={intro}
        wordmarkStyle={wordmarkStyle}
        lines={lines}
      />

      {/* Bande d'infos défilante sous la bannière */}
      {hasPracticalInfo && (
        <section
          className={styles.practicalInfoBar}
          aria-label={t("home.practicalInfo", "Informations pratiques")}
        >
          <Marquee speed={30} pauseOnHover pauseOnFocus>
            <div className={styles.practicalInfoInner}>
              {infoItems.map((item, idx) => (
                <span key={item.id} className={styles.practicalInfoItem}>
                  {idx > 0 && (
                    <span className={styles.practicalInfoDivider} aria-hidden="true">
                      •
                    </span>
                  )}
                  <span className={styles.practicalInfoContent}>{item.content}</span>
                </span>
              ))}
              <span className={styles.practicalInfoDivider} aria-hidden="true">
                •
              </span>
            </div>
          </Marquee>
        </section>
      )}

      {communityItems.length > 0 && (
        <section className={styles.community} aria-labelledby="community-title">
          <div className={styles.communityHeader}>
            <h2 id="community-title" className={styles.communityTitle}>
              {t("home.communityTitle", "Porté par la communauté")}
            </h2>
            {communityLink && (
              <a
                href={communityLink}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.communityFollowLink}
              >
                {t("footer.followUs", "Suivez-nous")}
              </a>
            )}
          </div>

          <div className={styles.communityRailWrap}>
            <Marquee speed={communityRailDuration} pauseOnHover pauseOnFocus className={styles.communityMarquee}>
              <div
                ref={communityRailRef}
                data-testid="community-photo-rail"
                className={styles.communityTrack}
              >
                {communityRailItems.map((photo: CommunityPhoto, index: number) => (
                  <button
                    key={`${photo.id}-${index}`}
                    type="button"
                    className={styles.communityPhotoButton}
                    aria-label={photo.alt_text || "Photo de la communauté"}
                    onClick={() => setSelectedCommunityPhoto(photo)}
                    data-testid={`community-photo-trigger-${index}`}
                  >
                    <img
                      src={photo.image_url}
                      alt={photo.alt_text || "Photo de la communauté"}
                      className={styles.communityPhoto}
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            </Marquee>
          </div>
        </section>
      )}

      {/* 2. Catégories */}
      <Section
        title={t("home.categories", "Catégories")}
        isLoading={catLoading}
        error={catError}
        hasData={hasCategories}
        onRetry={refetchCategories}
      >
        <div className={styles.categoryGrid}>
          {(categories ?? []).map((cat, idx) => {
            const hasCatImage = Boolean(cat.image_url);
            return (
              <Reveal key={cat.id} delay={idx * 60}>
                <Link
                  to={`/categorie/${cat.slug}`}
                  className={[
                    styles.categoryCard,
                    hasCatImage ? styles.categoryCardWithImage : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {hasCatImage && (
                    <>
                      <img
                        src={cat.image_url!}
                        alt=""
                        aria-hidden="true"
                        className={styles.categoryBgImage}
                        loading="lazy"
                        width={400}
                        height={250}
                      />
                      <div className={styles.categoryOverlay} />
                    </>
                  )}
                  <span
                    className={[
                      styles.categoryName,
                      hasCatImage ? styles.categoryNameWithImage : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {cat.name}
                  </span>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </Section>

      {/* 3. Derniers drops */}
      <Section
        title={t("home.newArrivals", "Derniers drops")}
        tone="paper"
        moreHref="/boutique"
        moreLabel={t("home.viewAll", "Tout voir")}
        isLoading={newLoading}
        error={newError}
        hasData={hasNewProducts}
        onRetry={refetchNew}
      >
        <ProductCarousel autoPlay ariaLabel={t("home.newArrivals", "Derniers drops")}>
          {(newProducts ?? []).map((p) => (
            <ProductCard key={p.id} product={productToCardData(p)} />
          ))}
        </ProductCarousel>
      </Section>

      {/* 4. Capsules */}
      <Section
        title={t("home.capsules", "Capsules")}
        isLoading={colLoading}
        error={colError}
        hasData={hasCollections}
        onRetry={refetchCollections}
      >
        <div className={styles.capsulesGrid}>
          {activeCollections.slice(0, 6).map((col, index) => {
            const hasColImage = Boolean(col.image_url);
            const fallbackTheme = capsuleFallbacks[index % 3];
            return (
              <div
                key={col.id}
                className={styles.capsuleCard}
                style={
                  hasColImage
                    ? { color: "#FFFFFF" }
                    : { backgroundColor: fallbackTheme.bg, color: fallbackTheme.color }
                }
              >
                {hasColImage && (
                  <div className={styles.capsuleImageWrap}>
                    <img
                      src={col.image_url!}
                      alt=""
                      className={styles.capsuleImage}
                      loading="lazy"
                    />
                    <div className={styles.capsuleOverlay} />
                  </div>
                )}
                <div className={styles.capsuleContent}>
                  {typeof (col as any).product_count === "number" && (
                    <span className={styles.capsuleCount}>
                      {(col as any).product_count} articles
                    </span>
                  )}
                  <h3 className={styles.capsuleTitle}>{col.name}</h3>
                  {col.description && (
                    <p className={styles.capsuleDesc}>{col.description}</p>
                  )}
                  <Link
                    to={`/collection/${col.slug}`}
                    className={styles.capsuleBtn}
                  >
                    Découvrir la collection
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* 5. Promotions */}
      <Section
        title={t("home.promotions", "Promotions")}
        tone="paper"
        moreHref="/boutique"
        isLoading={promoLoading}
        error={promoError}
        hasData={hasPromoProducts}
        onRetry={refetchPromo}
      >
        {(promoProducts?.length ?? 0) > 4 ? (
          <ProductCarousel ariaLabel={t("home.promotions", "Promotions")}>
            {(promoProducts ?? []).map((p) => (
              <ProductCard key={p.id} product={productToCardData(p)} />
            ))}
          </ProductCarousel>
        ) : (
          <div className={styles.productGrid}>
            {(promoProducts ?? []).map((p) => (
              <ProductCard key={p.id} product={productToCardData(p)} />
            ))}
          </div>
        )}
      </Section>

      {/* 6. Archive */}
      <Section
        title={t("home.archive", "Archive")}
        isLoading={archiveLoading}
        error={archiveError}
        hasData={hasArchive}
        onRetry={refetchArchive}
      >
        <p className={styles.archiveIntro}>
          {t("home.archiveIntro", "Anciens drops et pièces limitées.")}
        </p>
        <ProductCarousel ariaLabel={t("home.archive", "Archive")}>
          {archiveProducts.map((p) => (
            <ProductCard key={p.id} product={productToCardData(p)} />
          ))}
        </ProductCarousel>
        <div className={styles.archiveCtaWrap}>
          <Link to="/collection/archive" className={styles.archiveBtn}>
            {t("home.viewArchive", "Voir l'archive")}
          </Link>
        </div>
      </Section>

      {/* 7. La boutique */}
      {showBrandSection && (
        <section
          className={[
            styles.brand,
            aboutImageUrl ? styles.brandWithImage : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div className={styles.brandInner}>
            <h2 className={styles.brandTitle}>{t("home.brand", "La boutique")}</h2>
            <div className={styles.brandBody}>
              {aboutImageUrl && (
                <img
                  src={aboutImageUrl}
                  alt={storeName}
                  className={styles.brandImage}
                  loading="lazy"
                />
              )}
              {aboutText && <p className={styles.brandText}>{aboutText}</p>}
            </div>
          </div>
        </section>
      )}

      {/* 8. Toute la boutique */}
      <Section
        title={t("home.allShop", "Toute la boutique")}
        isLoading={allLoading}
        error={allError}
        hasData={hasAllProducts}
        onRetry={refetchAll}
      >
        <p className={styles.allShopSubtitle}>
          {t("home.allShopSubtitle", "Retrouvez toutes les créations de la marque au même endroit.")}
        </p>
        <div className={styles.allShopGrid}>
          {(allProducts ?? []).map((p) => (
            <ProductCard key={p.id} product={productToCardData(p)} />
          ))}
        </div>
        <div className={styles.allShopCtaWrap}>
          <Link to="/boutique" className={styles.allShopBtn}>
            {t("home.viewAllShop", "Voir toute la boutique")}
          </Link>
        </div>
      </Section>

      {/* 9. Nous trouver */}
      {hasStoreLocation && (
        <Section title={t("home.findUs", "Nous trouver")}>
          <div className={styles.findUsContent}>
            {settings?.address?.trim() && (
              <p className={styles.findUsAddress}>
                {settings.address.trim()}
                {settings.city?.trim() ? `, ${settings.city.trim()}` : ""}
                {settings.country?.trim() ? ` (${settings.country.trim()})` : ""}
              </p>
            )}
            {settings?.opening_hours?.trim() && (
              <p className={styles.findUsHours}>{settings.opening_hours.trim()}</p>
            )}
            {settings?.phone?.trim() && (
              <p className={styles.findUsPhone}>
                <a href={`tel:${settings.phone.trim().replace(/\s/g, "")}`}>
                  {settings.phone.trim()}
                </a>
              </p>
            )}
            <div className={styles.findUsCtaWrap}>
              <Link to="/notre-boutique" className={styles.findUsBtn}>
                {t("home.findUs", "Nous trouver")}
              </Link>
            </div>
          </div>
        </Section>
      )}

      {selectedCommunityPhoto && (
        <div
          className={styles.communityLightboxBackdrop}
          onClick={() => setSelectedCommunityPhoto(null)}
          aria-hidden="true"
        >
          <div
            ref={dialogRef}
            className={styles.communityLightbox}
            role="dialog"
            aria-modal="true"
            aria-labelledby="community-lightbox-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className={styles.communityLightboxClose}
              aria-label={t("common.close", "Fermer")}
              onClick={() => setSelectedCommunityPhoto(null)}
            >
              ×
            </button>
            <img
              src={selectedCommunityPhoto.image_url}
              alt={selectedCommunityPhoto.alt_text || "Photo de la communauté"}
              className={styles.communityLightboxImage}
            />
            <div className={styles.communityLightboxContent}>
              <p id="community-lightbox-title" className={styles.communityLightboxCaption}>
                {selectedCommunityPhoto.caption || selectedCommunityPhoto.alt_text}
              </p>
              {selectedCommunityPhoto.link_path && (
                <Link
                  to={selectedCommunityPhoto.link_path}
                  className={styles.communityLightboxLink}
                  onClick={() => setSelectedCommunityPhoto(null)}
                >
                  {t("home.communityViewProduct", "Voir le produit")}
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
