import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Heart, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import {
  Button,
  Skeleton,
  EmptyState,
  ErrorState,
  ProductCard,
  Breadcrumb,
} from "@/components/ui";
import { SEO } from "@/components/SEO";
import { sortSizes } from "@/lib/sizes";
import type {
  Product,
  ProductImage,
  ProductVariant,
  ProductWithImage,
} from "@/lib/db-types";
import type { ProductCardData } from "@/components/ui";
import styles from "./ProductDetailPage.module.css";

interface ProductWithSecondary extends ProductWithImage {
  secondary_image_url?: string | null;
}

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addItem, openCart } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [categoryName, setCategoryName] = useState<string>("");
  const [categorySlug, setCategorySlug] = useState<string>("");
  const [complementaryProducts, setComplementaryProducts] = useState<
    ProductWithSecondary[]
  >([]);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sizeSectionRef = useRef<HTMLDivElement>(null);

  const loadProduct = useCallback(async () => {
    if (!slug) return;
    setIsLoading(true);
    setError(null);

    try {
      // 1. Fetch product
      const { data: prod, error: prodErr } = await supabase
        .from("products")
        .select(
          "id, name, slug, description, price, compare_at_price, currency, category_id, is_archived, is_featured, sort_order, created_at"
        )
        .eq("slug", slug)
        .eq("is_archived", false)
        .maybeSingle();

      if (prodErr) throw prodErr;
      if (!prod) {
        setProduct(null);
        return;
      }
      setProduct(prod);

      // 2. Fetch images, variants, category & favorite in parallel
      const [imgRes, varRes, catRes] = await Promise.all([
        supabase
          .from("product_images")
          .select("id, product_id, url, alt_text, sort_order, is_primary")
          .eq("product_id", prod.id)
          .order("is_primary", { ascending: false })
          .order("sort_order", { ascending: true }),
        supabase
          .from("product_variants")
          .select("id, product_id, size, color, sku, stock, price, currency")
          .eq("product_id", prod.id),
        prod.category_id
          ? supabase
              .from("categories")
              .select("name, slug")
              .eq("id", prod.category_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      setImages(imgRes.data ?? []);
      const vars = varRes.data ?? [];
      setVariants(vars);
      if (catRes.data) {
        setCategoryName(catRes.data.name);
        setCategorySlug(catRes.data.slug);
      }

      // Auto-select size if single size is "Unique"
      const availableSizesRaw = Array.from(
        new Set(vars.map((v) => v.size).filter((s): s is string => Boolean(s)))
      );
      if (
        availableSizesRaw.length === 1 &&
        availableSizesRaw[0].toLowerCase() === "unique"
      ) {
        setSelectedSize(availableSizesRaw[0]);
      } else {
        setSelectedSize(null);
      }

      // Auto-select single color if only one
      const colors = Array.from(
        new Set(vars.map((v) => v.color).filter((c): c is string => Boolean(c)))
      );
      if (colors.length === 1) {
        setSelectedColor(colors[0]);
      } else {
        setSelectedColor(null);
      }

      // Check favorite
      if (user) {
        const { data: fav } = await supabase
          .from("favorites")
          .select("product_id")
          .eq("user_id", user.id)
          .eq("product_id", prod.id)
          .maybeSingle();
        setIsFavorite(Boolean(fav));
      }

      // 3. Section « À associer » : complementary items (accessories, other categories, or featured)
      let compQuery = supabase
        .from("products")
        .select(
          "id, name, slug, description, price, compare_at_price, currency, category_id, is_archived, is_featured, sort_order, created_at"
        )
        .eq("is_archived", false)
        .neq("id", prod.id);

      if (prod.category_id) {
        compQuery = compQuery.neq("category_id", prod.category_id);
      }
      const { data: compProds } = await compQuery.limit(4);

      let finalComp = compProds ?? [];
      if (finalComp.length < 4) {
        const { data: fallbackProds } = await supabase
          .from("products")
          .select(
            "id, name, slug, description, price, compare_at_price, currency, category_id, is_archived, is_featured, sort_order, created_at"
          )
          .eq("is_archived", false)
          .neq("id", prod.id)
          .limit(4);
        finalComp = fallbackProds ?? [];
      }

      if (finalComp.length > 0) {
        const compIds = finalComp.map((p) => p.id);
        const { data: compImgs } = await supabase
          .from("product_images")
          .select("id, product_id, url, alt_text, sort_order, is_primary")
          .in("product_id", compIds)
          .order("is_primary", { ascending: false })
          .order("sort_order", { ascending: true });

        const compImgMap = new Map<string, ProductImage>();
        const compSecMap = new Map<string, string>();
        for (const img of compImgs ?? []) {
          if (!compImgMap.has(img.product_id)) {
            compImgMap.set(img.product_id, img);
          } else if (!compSecMap.has(img.product_id)) {
            compSecMap.set(img.product_id, img.url);
          }
        }

        setComplementaryProducts(
          finalComp.map((sp) => ({
            ...sp,
            primary_image: compImgMap.get(sp.id) ?? null,
            secondary_image_url: compSecMap.get(sp.id) ?? null,
            category: null,
          }))
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur de chargement";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [slug, user]);

  useEffect(() => {
    loadProduct();
    setActiveImageIndex(0);
    setIsZoomed(false);
  }, [loadProduct]);

  // Handle favorite toggle
  const handleToggleFavorite = async () => {
    if (!product) return;
    if (!user) {
      navigate("/connexion");
      return;
    }

    const next = !isFavorite;
    setIsFavorite(next);

    if (next) {
      await supabase.from("favorites").insert({
        user_id: user.id,
        product_id: product.id,
      });
    } else {
      await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("product_id", product.id);
    }
  };

  // Distinct sizes & colors (pointures triées pour les chaussures)
  const distinctSizes = useMemo(() => {
    const list = Array.from(
      new Set(variants.map((v) => v.size).filter((s): s is string => Boolean(s)))
    );
    return sortSizes(list);
  }, [variants]);

  const isOnlyUniqueSize =
    distinctSizes.length === 1 && distinctSizes[0].toLowerCase() === "unique";

  const distinctColors = useMemo(() => {
    return Array.from(
      new Set(variants.map((v) => v.color).filter((c): c is string => Boolean(c)))
    );
  }, [variants]);

  // Current selected variant
  const selectedVariant = useMemo(() => {
    return variants.find((v) => {
      const sizeMatches = isOnlyUniqueSize
        ? true
        : selectedSize
        ? v.size === selectedSize
        : true;
      const colorMatches = selectedColor ? v.color === selectedColor : true;
      return sizeMatches && colorMatches;
    });
  }, [variants, isOnlyUniqueSize, selectedSize, selectedColor]);

  // Validation: whether a valid in-stock variant is chosen
  const isSelectionComplete = useMemo(() => {
    const needsSize = !isOnlyUniqueSize && distinctSizes.length > 0;
    const needsColor = distinctColors.length > 0;

    if (needsSize && !selectedSize) return false;
    if (needsColor && !selectedColor) return false;

    return selectedVariant ? selectedVariant.stock > 0 : false;
  }, [
    isOnlyUniqueSize,
    distinctSizes,
    distinctColors,
    selectedSize,
    selectedColor,
    selectedVariant,
  ]);

  // Add to cart handler
  const handleAddToCart = async () => {
    if (!isSelectionComplete) {
      if (!isOnlyUniqueSize && distinctSizes.length > 0 && !selectedSize) {
        sizeSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
      return;
    }

    if (!selectedVariant || !product) return;

    setIsAddingToCart(true);
    try {
      await addItem({
        variant_id: selectedVariant.id,
        product_id: product.id,
        product_name: product.name,
        product_slug: product.slug,
        image_url: activeImage?.url ?? null,
        size: selectedVariant.size ?? null,
        color: selectedVariant.color ?? null,
        sku: selectedVariant.sku,
        unit_price: selectedVariant.price ?? product.price,
        currency: selectedVariant.currency || product.currency || "XOF",
        stock: selectedVariant.stock,
      });
      openCart();
    } finally {
      setIsAddingToCart(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.layout}>
          <Skeleton variant="rect" width="100%" height="520px" />
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <Skeleton variant="text" width="80%" height="32px" />
            <Skeleton variant="text" width="40%" height="24px" />
            <Skeleton variant="rect" width="100%" height="100px" />
            <Skeleton variant="rect" width="100%" height="48px" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <ErrorState
          title="Impossible de charger le produit"
          message={error}
          action={
            <Button variant="outline" size="sm" onClick={loadProduct}>
              Réessayer
            </Button>
          }
        />
      </div>
    );
  }

  if (!product) {
    return (
      <div className={styles.page}>
        <EmptyState
          title="Produit introuvable"
          description="Ce produit n'existe pas ou n'est plus en vente."
        />
      </div>
    );
  }

  const hasDiscount =
    product.compare_at_price != null && product.compare_at_price > product.price;
  const currentPrice = selectedVariant?.price ?? product.price;
  const currencyLabel = product.currency || "FCFA";
  const activeImage = images[activeImageIndex] || null;

  // Guide des tailles seulement s'il est renseigné dans le produit (ne rien inventer)
  const productSizeGuide = (product as any).size_guide?.trim() ?? "";

  const inStock = variants.length > 0
    ? variants.some((v) => v.stock > 0)
    : true;

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || `${product.name} - Streetwear contemporain JACOB DE JESUS`,
    image: images.map((img) => img.url),
    sku: selectedVariant?.sku || product.id,
    offers: {
      "@type": "Offer",
      price: currentPrice,
      priceCurrency: product.currency || "XOF",
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: typeof window !== "undefined" ? window.location.href : undefined,
    },
  };

  return (
    <div className={styles.page}>
      <SEO
        title={product.name}
        description={product.description || `${product.name} — Streetwear contemporain JACOB DE JESUS`}
        ogImage={activeImage?.url}
        ogType="product"
        jsonLd={productJsonLd}
      />
      {/* 4. Fil d'Ariane */}
      <Breadcrumb
        items={[
          { label: "Accueil", href: "/" },
          { label: "Boutique", href: "/boutique" },
          ...(categoryName
            ? [
                {
                  label: categoryName,
                  href: categorySlug
                    ? `/categorie/${categorySlug}`
                    : `/boutique`,
                },
              ]
            : []),
          { label: product.name },
        ]}
        className={styles.breadcrumb}
      />

      <div className={styles.layout}>
        {/* Colonne Galerie */}
        <div className={styles.gallery}>
          <div
            className={styles.mainImageWrap}
            onClick={() => setIsZoomed((z) => !z)}
            title="Cliquer pour zoomer"
          >
            {activeImage ? (
              <img
                src={activeImage.url}
                alt={activeImage.alt_text ?? product.name}
                className={[styles.mainImage, isZoomed ? styles.zoomed : ""]
                  .filter(Boolean)
                  .join(" ")}
                loading="lazy"
              />
            ) : (
              <div className={styles.placeholderWrap}>
                <svg
                  width="64"
                  height="64"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span>Jacob de Jesus</span>
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className={styles.thumbnails}>
              {images.map((img, idx) => (
                <button
                  key={img.id}
                  type="button"
                  className={[
                    styles.thumbBtn,
                    activeImageIndex === idx ? styles.thumbBtnActive : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => {
                    setActiveImageIndex(idx);
                    setIsZoomed(false);
                  }}
                  aria-label={`Photo ${idx + 1}`}
                >
                  <img
                    src={img.url}
                    alt={img.alt_text ?? ""}
                    className={styles.thumbImg}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Colonne Informations & Achat */}
        <div className={styles.info}>
          <div className={styles.topRow}>
            <h1 className={styles.name}>{product.name}</h1>
            <button
              type="button"
              className={[
                styles.favButton,
                isFavorite ? styles.favButtonActive : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={handleToggleFavorite}
              aria-label={
                isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"
              }
            >
              <Heart
                size={20}
                fill={isFavorite ? "currentColor" : "none"}
                strokeWidth={1.5}
              />
            </button>
          </div>

          {/* Prix */}
          <div className={styles.priceRow}>
            <span className={hasDiscount ? styles.priceDiscount : styles.price}>
              {currentPrice.toLocaleString("fr-FR")} {currencyLabel}
            </span>
            {hasDiscount && (
              <span className={styles.originalPrice}>
                {product.compare_at_price!.toLocaleString("fr-FR")} {currencyLabel}
              </span>
            )}
          </div>

          {/* Description */}
          {product.description && (
            <p className={styles.description}>{product.description}</p>
          )}

          {/* Sélecteur de couleur */}
          {distinctColors.length > 0 && (
            <div className={styles.selectorGroup}>
              <span className={styles.selectorTitle}>Couleur :</span>
              <div className={styles.optionsGrid}>
                {distinctColors.map((color) => {
                  const isActive = selectedColor === color;
                  return (
                    <button
                      key={color}
                      type="button"
                      className={[
                        styles.optionBox,
                        isActive ? styles.optionActive : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => setSelectedColor(color)}
                    >
                      {color}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Sélecteur de taille (masqué si "Unique" est la seule taille) */}
          {!isOnlyUniqueSize && distinctSizes.length > 0 && (
            <div className={styles.selectorGroup} ref={sizeSectionRef}>
              <div className={styles.selectorHeader}>
                <span className={styles.selectorTitle}>Taille / Pointure :</span>
                {/* Guide des tailles : seulement s'il est renseigné */}
                {Boolean(productSizeGuide) && (
                  <button
                    type="button"
                    className={styles.sizeGuideBtn}
                    onClick={() => setShowSizeGuide(true)}
                  >
                    Guide des tailles
                  </button>
                )}
              </div>
              <div className={styles.optionsGrid}>
                {distinctSizes.map((size) => {
                  const isActive = selectedSize === size;
                  const matchingVar = variants.find(
                    (v) =>
                      v.size === size &&
                      (selectedColor ? v.color === selectedColor : true)
                  );
                  const isSoldOut = matchingVar ? matchingVar.stock <= 0 : false;

                  return (
                    <button
                      key={size}
                      type="button"
                      className={[
                        styles.optionBox,
                        isActive ? styles.optionActive : "",
                        isSoldOut ? styles.optionDisabled : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      disabled={isSoldOut}
                      onClick={() => setSelectedSize(size)}
                      aria-pressed={isActive}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Indication informative de stock */}
          {selectedVariant && (
            <div className={styles.stockNote}>
              {selectedVariant.stock > 5 ? (
                <span>En stock</span>
              ) : selectedVariant.stock > 0 ? (
                <span style={{ color: "var(--color-accent)" }}>
                  Plus que {selectedVariant.stock} exemplaire(s) disponible(s)
                </span>
              ) : (
                <span style={{ color: "var(--color-error)" }}>Épuisé</span>
              )}
            </div>
          )}

          {/* Boutons d'action desktop */}
          <div className={styles.actionButtons}>
            <Button
              variant="primary"
              size="lg"
              disabled={
                !isSelectionComplete &&
                Boolean(
                  (distinctSizes.length > 0 && !isOnlyUniqueSize && selectedSize) ||
                    (distinctColors.length > 0 && selectedColor)
                )
              }
              onClick={handleAddToCart}
            >
              {isAddingToCart ? "Ajout en cours…" : "AJOUTER AU SAC"}
            </Button>
          </div>
        </div>
      </div>

      {/* Guide des tailles Modal — affiché seulement si renseigné */}
      {showSizeGuide && productSizeGuide && (
        <div
          className={styles.sizeGuideModal}
          onClick={() => setShowSizeGuide(false)}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3
                style={{
                  fontFamily: "var(--font-display)",
                  textTransform: "uppercase",
                }}
              >
                Guide des tailles
              </h3>
              <button
                type="button"
                onClick={() => setShowSizeGuide(false)}
                style={{ background: "none", border: "none", cursor: "pointer" }}
                aria-label="Fermer"
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ whiteSpace: "pre-wrap", fontSize: "var(--text-sm)" }}>
              {productSizeGuide}
            </div>
          </div>
        </div>
      )}

      {/* 3. Section « À associer » */}
      {complementaryProducts.length > 0 && (
        <section className={styles.similarSection}>
          <h2 className={styles.similarTitle}>À associer</h2>
          <div className={styles.similarGrid}>
            {complementaryProducts.map((p) => {
              const cardData: ProductCardData = {
                id: p.id,
                slug: p.slug,
                name: p.name,
                reference: p.slug.toUpperCase(),
                price: p.price,
                currency: p.currency,
                originalPrice: p.compare_at_price,
                image: p.primary_image?.url ?? "",
                imageAlt: p.primary_image?.alt_text ?? p.name,
                secondaryImage: p.secondary_image_url ?? null,
                sizes: [],
                badge: p.compare_at_price ? "sale" : null,
              };
              return <ProductCard key={p.id} product={cardData} />;
            })}
          </div>
        </section>
      )}

      {/* 3. Barre d'achat fixe en bas sur mobile (prix + AJOUTER AU SAC) */}
      <aside
        className={styles.mobilePurchaseBar}
        aria-label="Acheter ce produit sur mobile"
      >
        <div className={styles.mobileBarPriceWrap}>
          <span
            className={
              hasDiscount ? styles.mobileBarPriceDiscount : styles.mobileBarPrice
            }
          >
            {currentPrice.toLocaleString("fr-FR")} {currencyLabel}
          </span>
          {hasDiscount && (
            <span className={styles.mobileBarOriginalPrice}>
              {product.compare_at_price!.toLocaleString("fr-FR")} {currencyLabel}
            </span>
          )}
        </div>
        <Button
          variant="primary"
          size="md"
          className={styles.mobileBarBtn}
          onClick={handleAddToCart}
          disabled={isAddingToCart}
        >
          {isAddingToCart ? "Ajout…" : "AJOUTER AU SAC"}
        </Button>
      </aside>
    </div>
  );
}
