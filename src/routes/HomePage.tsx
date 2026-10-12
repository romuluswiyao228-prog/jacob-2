import { Link } from "react-router-dom";
import { Button, ProductCard, Skeleton } from "@/components/ui";
import { Section } from "@/components/home/Section";
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
import styles from "./HomePage.module.css";

function productToCardData(
  product: ProductWithImage,
  sizes: string[] = ["S", "M", "L", "XL"]
): ProductCardData {
  const hasDiscount = product.compare_at_price != null && product.compare_at_price > product.price;
  return {
    id: product.id,
    name: product.name,
    reference: product.slug.toUpperCase(),
    price: product.price,
    originalPrice: hasDiscount ? product.compare_at_price : null,
    image: product.primary_image?.url ?? "",
    imageAlt: product.primary_image?.alt_text ?? product.name,
    sizes,
    badge: hasDiscount ? "sale" : null,
  };
}

export default function HomePage() {
  const {
    data: settings,
    isLoading: settingsLoading,
    error: settingsError,
  } = useStoreSettings();
  void settingsError;
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
  const hasAboutText =
    settings?.about_text && settings.about_text.trim().length > 0;

  // Section 4: Best sellers falls back to featured products
  const bestSellerFallback =
    !hasBestSellers && hasFeatured ? featured : null;

  // Best seller products mapped to cards (either real best-sellers or fallback)
  const bestSellerCards: ProductCardData[] = hasBestSellers
    ? (bestSellers ?? []).map((bs) => ({
        id: bs.product_id,
        name: bs.name,
        reference: bs.slug.toUpperCase(),
        price: bs.price,
        image: "",
        imageAlt: bs.name,
        sizes: ["S", "M", "L", "XL"],
        badge: null,
      }))
    : bestSellerFallback
    ? bestSellerFallback.map((p) => productToCardData(p))
    : [];

  const showBestSellerSection = hasBestSellers || hasFeatured;

  return (
    <div className={styles.page}>
      {/* === SECTION 1: Bannière principale === */}
      <section className={styles.hero}>
        {settings?.logo_url ? (
          <img
            src={settings.logo_url}
            alt={settings.store_name}
            className={styles.heroImage}
          />
        ) : (
          <div className={styles.heroFallback} />
        )}
        <div className={styles.heroOverlay}>
          <h1 className={styles.heroTitle}>
            {settings?.store_name ?? "JACOB DE JESUS"}
          </h1>
          {settings?.description && (
            <p className={styles.heroText}>{settings.description}</p>
          )}
          <Link to="/boutique">
            <Button variant="primary" size="lg">
              Découvrir la collection
            </Button>
          </Link>
        </div>
      </section>

      <div className={styles.sections}>
        {/* === SECTION 2: Catégories === */}
        <Section
          title="Catégories"
          isLoading={catLoading}
          error={catError}
          hasData={hasCategories}
          onRetry={refetchCategories}
        >
          <div className={styles.categoryGrid}>
            {(categories ?? []).map((cat) => (
              <Link
                key={cat.id}
                to={`/categorie/${cat.slug}`}
                className={styles.categoryCard}
              >
                <span className={styles.categoryName}>{cat.name}</span>
              </Link>
            ))}
          </div>
        </Section>

        {/* === SECTION 3: Nouveautés === */}
        <Section
          title="Nouveautés"
          isLoading={newLoading}
          error={newError}
          hasData={hasNewProducts}
          onRetry={refetchNew}
        >
          <div className={styles.productGrid}>
            {(newProducts ?? []).map((p) => (
              <ProductCard
                key={p.id}
                product={productToCardData(p)}
              />
            ))}
          </div>
        </Section>

        {/* === SECTION 4: Meilleures ventes (or featured fallback) === */}
        {showBestSellerSection && (
          <Section
            title={hasBestSellers ? "Meilleures ventes" : "Coups de cœur"}
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

        {/* === SECTION 5: Promotions === */}
        <Section
          title="Promotions"
          isLoading={promoLoading}
          error={promoError}
          hasData={hasPromoProducts}
          onRetry={refetchPromo}
        >
          <div className={styles.productGrid}>
            {(promoProducts ?? []).map((p) => (
              <ProductCard
                key={p.id}
                product={productToCardData(p)}
              />
            ))}
          </div>
        </Section>

        {/* === SECTION 6: Collections mises en avant === */}
        <Section
          title="Collections"
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
                    alt={col.name}
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

        {/* === SECTION 7: Présentation de la marque === */}
        {hasAboutText && (
          <section className={styles.aboutSection}>
            <h2 className={styles.aboutTitle}>La marque</h2>
            <p className={styles.aboutText}>{settings!.about_text}</p>
          </section>
        )}

        {/* === SECTION 8: Paiement et livraison === */}
        {/* Shipping zones require admin RLS — section hidden unless settings has info */}

        {/* === Settings loading/error === */}
        {settingsLoading && (
          <div className={styles.settingsLoading}>
            <Skeleton variant="text" width="200px" />
          </div>
        )}
      </div>
    </div>
  );
}
