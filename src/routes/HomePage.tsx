import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ProductCard, Stripe, ProductCarousel } from "@/components/ui";
import { Section } from "@/components/home/Section";
import { SEO } from "@/components/SEO";
import {
  useStoreSettings,
  useCategories,
  useNewProducts,
  useBestSellers,
  useFeaturedProducts,
  usePromoProducts,
  useCollections,
} from "@/lib/hooks";
import type { ProductCardData } from "@/components/ui";
import type { ProductWithImage } from "@/lib/db-types";
import { splitWordmark, wordmarkSize } from "@/lib/wordmark";
import styles from "./HomePage.module.css";

// Les tailles reelles ne sont pas chargees ici : on n'affiche aucune taille
// plutot que des tailles inventees.
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
  };
}

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
  } = useNewProducts(8);
  const {
    data: bestSellers,
    isLoading: bestLoading,
    error: bestError,
    refetch: refetchBest,
  } = useBestSellers(8);
  const {
    data: featured,
    isLoading: featLoading,
    error: featError,
    refetch: refetchFeatured,
  } = useFeaturedProducts(8);
  const {
    data: collections,
    isLoading: colLoading,
    error: colError,
    refetch: refetchCollections,
  } = useCollections(6);
  const {
    data: promoProducts,
    isLoading: promoLoading,
    error: promoError,
    refetch: refetchPromo,
  } = usePromoProducts(8);

  const hasNewProducts = (newProducts?.length ?? 0) > 0;
  const hasBestSellers = (bestSellers?.length ?? 0) > 0;
  const hasFeatured = (featured?.length ?? 0) > 0;
  const hasCollections = (collections?.length ?? 0) > 0;
  const hasPromoProducts = (promoProducts?.length ?? 0) > 0;
  const hasCategories = (categories?.length ?? 0) > 0;
  const aboutText = settings?.about_text?.trim() ?? "";

  // Les meilleures ventes se rabattent sur les produits mis en avant.
  const bestSellerCards: ProductCardData[] = hasBestSellers
    ? (bestSellers ?? []).map((bs) => ({
        id: bs.product_id,
        slug: bs.slug,
        name: bs.name,
        reference: bs.slug.toUpperCase(),
        price: bs.price,
        currency: bs.currency,
        image: "",
        imageAlt: bs.name,
        sizes: [],
        badge: null,
      }))
    : hasFeatured
    ? (featured ?? []).map(productToCardData)
    : [];
  const showBestSellerSection = hasBestSellers || hasFeatured;

  // Logotype : le nom de la boutique, coupe en deux lignes, plein ecran.
  const storeName = settings?.store_name?.trim() || "JACOB DE JESUS";
  const lines = splitWordmark(storeName);
  const wordmarkStyle = {
    "--wm-size": wordmarkSize(lines),
  } as CSSProperties;
  const bannerUrl = settings?.banner_url?.trim() || "";
  const intro = settings?.tagline?.trim() || settings?.description?.trim() || "";

  return (
    <div className={styles.page}>
      <SEO
        title={storeName}
        description={intro || "Marque streetwear contemporaine. Pièces exclusives, finitions haut de gamme et esprit brut."}
        ogImage={bannerUrl || "/favicon.svg"}
      />
      <section className={styles.hero}>
        {bannerUrl && (
          <>
            <img
              src={bannerUrl}
              alt=""
              className={styles.heroImage}
              fetchPriority="high"
            />
            <div className={styles.heroShade} />
          </>
        )}
        <div className={styles.heroInner}>
          <h1
            className={styles.wordmark}
            style={wordmarkStyle}
            aria-label={storeName}
          >
            {lines.map((line, i) => (
              <span key={i} className={styles.wordmarkLine} aria-hidden="true">
                <span
                  className={styles.wordmarkText}
                  style={{ animationDelay: `${i * 110}ms` }}
                >
                  {line}
                </span>
              </span>
            ))}
          </h1>
          <div className={styles.heroFoot}>
            {intro ? <p className={styles.heroIntro}>{intro}</p> : <span />}
            <Link to="/boutique" className={styles.cta}>
              {t("home.ctaShop", "Découvrir la collection")}
            </Link>
          </div>
        </div>
      </section>

      <Section
        title={t("home.categories", "Catégories")}
        isLoading={catLoading}
        error={catError}
        hasData={hasCategories}
        onRetry={refetchCategories}
      >
        <div className={styles.categoryGrid}>
          {(categories ?? []).map((cat) => {
            const hasImage = Boolean(cat.image_url);
            return (
              <Link
                key={cat.id}
                to={`/categorie/${cat.slug}`}
                className={[
                  styles.categoryCard,
                  hasImage ? styles.categoryCardWithImage : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {hasImage && (
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
                    hasImage ? styles.categoryNameWithImage : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {cat.name}
                </span>
              </Link>
            );
          })}
        </div>
      </Section>

      <Section
        title={t("home.newArrivals", "Derniers drops")}
        tone="paper"
        moreHref="/boutique?tri=newest"
        isLoading={newLoading}
        error={newError}
        hasData={hasNewProducts}
        onRetry={refetchNew}
      >
        <ProductCarousel ariaLabel={t("home.newArrivals", "Derniers drops")}>
          {(newProducts ?? []).map((p) => (
            <ProductCard key={p.id} product={productToCardData(p)} />
          ))}
        </ProductCarousel>
      </Section>

      {showBestSellerSection && (
        <Section
          title={hasBestSellers ? t("home.featured", "Meilleures ventes") : t("home.featured", "Coups de cœur")}
          moreHref="/boutique"
          isLoading={hasBestSellers ? bestLoading : featLoading}
          error={hasBestSellers ? bestError : featError}
          hasData={bestSellerCards.length > 0}
          onRetry={hasBestSellers ? refetchBest : refetchFeatured}
        >
          <div className={styles.productGrid}>
            {bestSellerCards.map((card) => (
              <ProductCard key={card.id} product={card} />
            ))}
          </div>
        </Section>
      )}

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

      <Section
        title={t("home.collections", "Collections")}
        isLoading={colLoading}
        error={colError}
        hasData={hasCollections}
        onRetry={refetchCollections}
      >
        <div className={styles.collectionGrid}>
          {(collections ?? []).map((col) => (
            <Link
              key={col.id}
              to={`/collection/${col.slug}`}
              className={styles.collectionCard}
            >
              {col.image_url ? (
                <img
                  src={col.image_url}
                  alt=""
                  className={styles.collectionImage}
                  loading="lazy"
                />
              ) : (
                <div className={styles.collectionPlaceholder} />
              )}
              <span className={styles.collectionName}>{col.name}</span>
            </Link>
          ))}
        </div>
      </Section>

      {aboutText && (
        <section className={styles.brand}>
          <div className={styles.brandInner}>
            <h2 className={styles.brandTitle}>{t("home.brand", "La marque")}</h2>
            <p className={styles.brandText}>{aboutText}</p>
          </div>
        </section>
      )}

      {/* Bande signature : entre l'accueil et le pied de page */}
      <Stripe />
    </div>
  );
}
