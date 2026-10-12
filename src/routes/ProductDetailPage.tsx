import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Heart, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { Button, Skeleton, EmptyState, ErrorState, ProductCard } from "@/components/ui";
import { sortSizes } from "@/lib/sizes";
import type { Product, ProductImage, ProductVariant, ProductWithImage } from "@/lib/db-types";
import type { ProductCardData } from "@/components/ui";
import styles from "./ProductDetailPage.module.css";

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [categoryName, setCategoryName] = useState<string>("");
  const [similarProducts, setSimilarProducts] = useState<ProductWithImage[]>([]);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProduct = useCallback(async () => {
    if (!slug) return;
    setIsLoading(true);
    setError(null);

    try {
      // 1. Fetch product
      const { data: prod, error: prodErr } = await supabase
        .from("products")
        .select("id, name, slug, description, price, compare_at_price, currency, category_id, is_archived, is_featured, sort_order, created_at")
        .eq("slug", slug)
        .eq("is_archived", false)
        .maybeSingle();

      if (prodErr) throw prodErr;
      if (!prod) {
        setProduct(null);
        return;
      }
      setProduct(prod);

      // 2. Fetch images, variants, category & check favorite in parallel
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
      if (catRes.data) setCategoryName(catRes.data.name);

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

      // 3. Similar products
      if (prod.category_id) {
        const { data: simProds } = await supabase
          .from("products")
          .select("id, name, slug, description, price, compare_at_price, currency, category_id, is_archived, is_featured, sort_order, created_at")
          .eq("category_id", prod.category_id)
          .eq("is_archived", false)
          .neq("id", prod.id)
          .limit(4);

        if (simProds && simProds.length > 0) {
          const simIds = simProds.map((p) => p.id);
          const { data: simImgs } = await supabase
            .from("product_images")
            .select("id, product_id, url, alt_text, sort_order, is_primary")
            .in("product_id", simIds)
            .order("is_primary", { ascending: false })
            .order("sort_order", { ascending: true });

          const simImgMap = new Map<string, ProductImage>();
          for (const img of simImgs ?? []) {
            if (!simImgMap.has(img.product_id)) {
              simImgMap.set(img.product_id, img);
            }
          }

          setSimilarProducts(
            simProds.map((sp) => ({
              ...sp,
              primary_image: simImgMap.get(sp.id) ?? null,
              category: { name: catRes.data?.name ?? "", slug: catRes.data?.slug ?? "" },
            }))
          );
        }
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

  // Distinct sizes & colors
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
        : selectedSize ? v.size === selectedSize : true;
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
  }, [isOnlyUniqueSize, distinctSizes, distinctColors, selectedSize, selectedColor, selectedVariant]);

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

  return (
    <div className={styles.page}>
      {/* Fil d'Ariane */}
      <nav className={styles.breadcrumb} aria-label="Fil d'Ariane">
        <Link to="/boutique" style={{ color: "var(--color-neutral-500)", textDecoration: "none" }}>
          Boutique
        </Link>
        {categoryName && (
          <>
            <span style={{ margin: "0 8px", color: "var(--color-neutral-400)" }}>/</span>
            <span style={{ color: "var(--color-neutral-500)" }}>{categoryName}</span>
          </>
        )}
        <span style={{ margin: "0 8px", color: "var(--color-neutral-400)" }}>/</span>
        <span style={{ color: "var(--color-text)", fontWeight: "var(--weight-bold)" }}>
          {product.name}
        </span>
      </nav>

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
                className={[styles.mainImage, isZoomed ? styles.zoomed : ""].filter(Boolean).join(" ")}
                loading="lazy"
              />
            ) : (
              <div className={styles.placeholderWrap}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
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
                  <img src={img.url} alt={img.alt_text ?? ""} className={styles.thumbImg} />
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
              className={[styles.favButton, isFavorite ? styles.favButtonActive : ""].filter(Boolean).join(" ")}
              onClick={handleToggleFavorite}
              aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            >
              <Heart size={20} fill={isFavorite ? "currentColor" : "none"} strokeWidth={1.5} />
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
                      className={[styles.optionBox, isActive ? styles.optionActive : ""].filter(Boolean).join(" ")}
                      onClick={() => setSelectedColor(color)}
                    >
                      {color}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sélecteur de taille (masqué si "Unique" est la seule taille) */}
          {!isOnlyUniqueSize && distinctSizes.length > 0 && (
            <div className={styles.selectorGroup}>
              <div className={styles.selectorHeader}>
                <span className={styles.selectorTitle}>Taille / Pointure :</span>
                <button
                  type="button"
                  className={styles.sizeGuideBtn}
                  onClick={() => setShowSizeGuide(true)}
                >
                  Guide des tailles
                </button>
              </div>
              <div className={styles.optionsGrid}>
                {distinctSizes.map((size) => {
                  const isActive = selectedSize === size;
                  // Check if this size is sold out in the selected color
                  const matchingVar = variants.find(
                    (v) => v.size === size && (selectedColor ? v.color === selectedColor : true)
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
                <span style={{ color: "var(--color-danger, #dc2626)" }}>Épuisé</span>
              )}
            </div>
          )}

          {/* Boutons d'action */}
          <div className={styles.actionButtons}>
            <Button
              variant="primary"
              size="lg"
              disabled={!isSelectionComplete}
              title={
                !isSelectionComplete
                  ? "Veuillez choisir une variante disponible"
                  : "Le panier sera bientôt activé"
              }
            >
              Ajouter au sac — Bientôt disponible
            </Button>
            <Button
              variant="outline"
              size="lg"
              disabled={!isSelectionComplete}
              onClick={() => {
                if (!isSelectionComplete) return;
                alert("La commande directe sera bientôt disponible.");
              }}
            >
              Acheter maintenant
            </Button>
          </div>
        </div>
      </div>

      {/* Guide des tailles Modal */}
      {showSizeGuide && (
        <div className={styles.sizeGuideModal} onClick={() => setShowSizeGuide(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 style={{ fontFamily: "var(--font-display)", textTransform: "uppercase" }}>
                Guide des tailles
              </h3>
              <button
                type="button"
                onClick={() => setShowSizeGuide(false)}
                style={{ background: "none", border: "none", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th>Taille</th>
                  <th>Tour de poitrine (cm)</th>
                  <th>Tour de taille (cm)</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>S</td><td>88 - 94</td><td>76 - 82</td></tr>
                <tr><td>M</td><td>95 - 101</td><td>83 - 89</td></tr>
                <tr><td>L</td><td>102 - 108</td><td>90 - 96</td></tr>
                <tr><td>XL</td><td>109 - 115</td><td>97 - 103</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Produits similaires */}
      {similarProducts.length > 0 && (
        <section className={styles.similarSection}>
          <h2 className={styles.similarTitle}>Vous aimerez aussi</h2>
          <div className={styles.similarGrid}>
            {similarProducts.map((p) => {
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
                sizes: [],
                badge: p.compare_at_price ? "sale" : null,
              };
              return <ProductCard key={p.id} product={cardData} />;
            })}
          </div>
        </section>
      )}
    </div>
  );
}
