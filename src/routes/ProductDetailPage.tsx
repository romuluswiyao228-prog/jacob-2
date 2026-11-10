import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Heart, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { useCurrency } from "@/lib/currency-context";
import { useStoreSettings } from "@/lib/hooks";
import {
  Button,
  Skeleton,
  EmptyState,
  ErrorState,
  ProductCard,
  Breadcrumb,
  Badge,
  Carousel,
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
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addItem, openCart } = useCart();
  const { formatPrice } = useCurrency();
  const { data: storeSettings } = useStoreSettings();

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
  const [isBuyingNow, setIsBuyingNow] = useState(false);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sizeSectionRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const mobileCarouselRef = useRef<HTMLDivElement>(null);

  const handleMobileScroll = () => {
    if (!mobileCarouselRef.current) return;
    const { scrollLeft, offsetWidth } = mobileCarouselRef.current;
    if (offsetWidth > 0) {
      const newIndex = Math.round(scrollLeft / offsetWidth);
      if (newIndex !== activeImageIndex && newIndex >= 0 && newIndex < images.length) {
        setActiveImageIndex(newIndex);
      }
    }
  };

  const scrollToMobileSlide = (index: number) => {
    if (!mobileCarouselRef.current) return;
    mobileCarouselRef.current.scrollTo({
      left: index * mobileCarouselRef.current.offsetWidth,
      behavior: "smooth",
    });
    setActiveImageIndex(index);
  };

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

      // 3. Section « Complétez le look » : vrais produits en stock d'autres catégories
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
      const { data: compCandidates } = await compQuery.limit(10);

      // Filtrer pour ne garder que des produits réellement en stock
      let inStockComp: typeof compCandidates = [];
      if (compCandidates && compCandidates.length > 0) {
        const candidateIds = compCandidates.map((c) => c.id);
        const { data: varData } = await supabase
          .from("product_variants")
          .select("product_id, stock")
          .in("product_id", candidateIds)
          .gt("stock", 0);

        const inStockProductIds = new Set((varData ?? []).map((v) => v.product_id));
        inStockComp = compCandidates.filter((c) => inStockProductIds.has(c.id));
      }

      let finalComp = (inStockComp ?? []).slice(0, 4);
      if (finalComp.length < 4) {
        const { data: fallbackCandidates } = await supabase
          .from("products")
          .select(
            "id, name, slug, description, price, compare_at_price, currency, category_id, is_archived, is_featured, sort_order, created_at"
          )
          .eq("is_archived", false)
          .neq("id", prod.id)
          .limit(10);

        if (fallbackCandidates && fallbackCandidates.length > 0) {
          const alreadyIds = new Set(finalComp.map((p) => p.id));
          const fIds = fallbackCandidates
            .filter((p) => !alreadyIds.has(p.id))
            .map((p) => p.id);

          if (fIds.length > 0) {
            const { data: fVarData } = await supabase
              .from("product_variants")
              .select("product_id, stock")
              .in("product_id", fIds)
              .gt("stock", 0);

            const inStockFIds = new Set((fVarData ?? []).map((v) => v.product_id));
            const additions = fallbackCandidates.filter(
              (p) => inStockFIds.has(p.id) && !alreadyIds.has(p.id)
            );
            finalComp = [...finalComp, ...additions].slice(0, 4);
          }
        }
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

  const maxStock = selectedVariant ? Math.max(0, selectedVariant.stock) : 99;

  useEffect(() => {
    if (selectedVariant) {
      if (selectedVariant.stock <= 0) {
        setQuantity(0);
      } else {
        setQuantity((q) => Math.min(Math.max(1, q), selectedVariant.stock));
      }
    } else {
      setQuantity(1);
    }
  }, [selectedVariant]);

  const handleDecrementQty = () => {
    setQuantity((q) => Math.max(1, q - 1));
  };

  const handleIncrementQty = () => {
    setQuantity((q) => Math.min(maxStock > 0 ? maxStock : 1, q + 1));
  };

  // Disparition du message d'erreur dès que la sélection change
  useEffect(() => {
    setSelectionError(null);
  }, [selectedSize, selectedColor]);

  // Défilement automatique vers le message d'erreur lorsqu'il apparaît
  useEffect(() => {
    if (selectionError && errorRef.current) {
      errorRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [selectionError]);

  // Validation de la sélection avec message explicite
  const validateSelection = ():
    | { valid: true; variant: ProductVariant }
    | { valid: false; message: string } => {
    const needsSize = !isOnlyUniqueSize && distinctSizes.length > 0;
    const needsColor = distinctColors.length > 0;

    if (needsSize && !selectedSize) {
      return { valid: false, message: t("product.errSelectSize") };
    }
    if (needsColor && !selectedColor) {
      return { valid: false, message: t("product.errSelectColor") };
    }

    const matchingVariant = variants.find((v) => {
      const sizeMatches = isOnlyUniqueSize
        ? true
        : needsSize
        ? v.size === selectedSize
        : true;
      const colorMatches = needsColor ? v.color === selectedColor : true;
      return sizeMatches && colorMatches;
    });

    if (!matchingVariant && variants.length > 0) {
      return {
        valid: false,
        message: t("product.errComboUnavailable"),
      };
    }

    if (matchingVariant && matchingVariant.stock <= 0) {
      return { valid: false, message: t("product.errVariantSoldOut") };
    }

    if (!matchingVariant) {
      return { valid: false, message: t("product.errVariantSoldOut") };
    }

    return { valid: true, variant: matchingVariant };
  };

  // Add to cart handler (ouvre le panneau du panier)
  const handleAddToCart = async () => {
    const result = validateSelection();
    if (!result.valid) {
      setSelectionError(result.message);
      setTimeout(() => {
        errorRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 0);
      return;
    }

    if (!product) return;

    setIsAddingToCart(true);
    try {
      await addItem({
        variant_id: result.variant.id,
        product_id: product.id,
        product_name: product.name,
        product_slug: product.slug,
        image_url: activeImage?.url ?? null,
        size: result.variant.size ?? null,
        color: result.variant.color ?? null,
        sku: result.variant.sku,
        unit_price: result.variant.price ?? product.price,
        currency: result.variant.currency || product.currency || "XOF",
        stock: result.variant.stock,
        quantity: Math.max(1, quantity),
      });
      openCart();
    } finally {
      setIsAddingToCart(false);
    }
  };

  // Acheter maintenant handler (même validation, ajoute l'article puis va à /commande)
  const handleBuyNow = async () => {
    const result = validateSelection();
    if (!result.valid) {
      setSelectionError(result.message);
      setTimeout(() => {
        errorRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 0);
      return;
    }

    if (!product) return;

    setIsBuyingNow(true);
    try {
      await addItem({
        variant_id: result.variant.id,
        product_id: product.id,
        product_name: product.name,
        product_slug: product.slug,
        image_url: activeImage?.url ?? null,
        size: result.variant.size ?? null,
        color: result.variant.color ?? null,
        sku: result.variant.sku,
        unit_price: result.variant.price ?? product.price,
        currency: result.variant.currency || product.currency || "XOF",
        stock: result.variant.stock,
        quantity: Math.max(1, quantity),
      });
      navigate("/commande");
    } finally {
      setIsBuyingNow(false);
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
          title={t("product.loadError")}
          message={error}
          action={
            <Button variant="outline" size="sm" onClick={loadProduct}>
              {t("common.retry")}
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
          title={t("product.notFound")}
          description={t("product.notFoundDesc")}
        />
      </div>
    );
  }

  const hasDiscount =
    product.compare_at_price != null && product.compare_at_price > product.price;
  const currentPrice = selectedVariant?.price ?? product.price;
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
          { label: t("common.home"), href: "/" },
          { label: t("common.shop"), href: "/boutique" },
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
          {/* Version Mobile : défilement horizontal avec scroll-snap et indicateur */}
          <div className={styles.mobileGallery}>
            <div
              className={styles.mobileCarousel}
              ref={mobileCarouselRef}
              onScroll={handleMobileScroll}
            >
              {images.length > 0 ? (
                images.map((img, idx) => (
                  <div
                    key={img.id}
                    className={styles.mobileCarouselSlide}
                    onClick={() => setIsZoomed((z) => !z)}
                  >
                    <img
                      src={img.url}
                      alt={img.alt_text ?? product.name}
                      className={[
                        styles.mainImage,
                        isZoomed && activeImageIndex === idx ? styles.zoomed : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      loading={idx === 0 ? "eager" : "lazy"}
                      width="400"
                      height="500"
                    />
                  </div>
                ))
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
              <div className={styles.mobileIndicator} aria-hidden="true">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={[
                      styles.indicatorDot,
                      activeImageIndex === idx ? styles.indicatorDotActive : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => scrollToMobileSlide(idx)}
                    aria-label={`Photo ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Version Desktop : miniatures verticales et grande image sticky */}
          <div className={styles.desktopGallery}>
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
                      loading="lazy"
                      width="72"
                      height="90"
                    />
                  </button>
                ))}
              </div>
            )}

            <div
              className={styles.mainImageWrap}
              onClick={() => setIsZoomed((z) => !z)}
              title={t("product.zoomHint")}
            >
              {activeImage ? (
                <img
                  src={activeImage.url}
                  alt={activeImage.alt_text ?? product.name}
                  className={[styles.mainImage, isZoomed ? styles.zoomed : ""]
                    .filter(Boolean)
                    .join(" ")}
                  loading="eager"
                  width="600"
                  height="750"
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
          </div>
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
                isFavorite ? t("product.removeFavorite") : t("product.addFavorite")
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
              {formatPrice(currentPrice)}
            </span>
            {hasDiscount && (
              <span className={styles.originalPrice}>
                {formatPrice(product.compare_at_price!)}
              </span>
            )}
            {hasDiscount && (
              <Badge variant="sale">SOLDE</Badge>
            )}
          </div>

          {/* Description */}
          {product.description && (
            <p className={styles.description}>{product.description}</p>
          )}

          {/* Sélecteur de couleur */}
          {distinctColors.length > 0 && (
            <div className={styles.selectorGroup}>
              <span className={styles.selectorTitle}>{t("product.color")}</span>
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
                <span className={styles.selectorTitle}>{t("product.size")}</span>
                {/* Guide des tailles : seulement s'il est renseigné */}
                {Boolean(productSizeGuide) && (
                  <button
                    type="button"
                    className={styles.sizeGuideBtn}
                    onClick={() => setShowSizeGuide(true)}
                  >
                    {t("product.sizeGuide")}
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
                <span>{t("product.inStock")}</span>
              ) : selectedVariant.stock > 0 ? (
                <span style={{ color: "var(--color-accent)" }}>
                  {t("product.stockRemaining", { count: selectedVariant.stock })}
                </span>
              ) : (
                <span style={{ color: "var(--color-error)" }}>{t("product.soldOut")}</span>
              )}
            </div>
          )}

          {/* Message d'erreur sélection */}
          {selectionError && (
            <div
              ref={errorRef}
              role="alert"
              className={styles.selectionError}
            >
              {selectionError}
            </div>
          )}

          {/* Sélecteur de quantité (plus, moins, borné au stock) */}
          <div className={styles.selectorGroup}>
            <span className={styles.selectorTitle}>Quantité</span>
            <div className={styles.quantityPicker}>
              <button
                type="button"
                className={styles.quantityBtn}
                onClick={handleDecrementQty}
                disabled={quantity <= 1 || maxStock <= 0}
                aria-label="Diminuer la quantité"
              >
                -
              </button>
              <span
                className={styles.quantityValue}
                aria-live="polite"
                data-testid="quantity-value"
              >
                {quantity}
              </span>
              <button
                type="button"
                className={styles.quantityBtn}
                onClick={handleIncrementQty}
                disabled={quantity >= maxStock || maxStock <= 0}
                aria-label="Augmenter la quantité"
              >
                +
              </button>
            </div>
          </div>

          {/* Boutons d'action desktop */}
          <div className={styles.actionButtons}>
            <Button
              variant="primary"
              size="lg"
              disabled={isAddingToCart || isBuyingNow}
              onClick={handleAddToCart}
            >
              {isAddingToCart ? t("product.addingToCart") : t("product.addToCart")}
            </Button>
            <Button
              variant="outline"
              size="lg"
              disabled={isAddingToCart || isBuyingNow}
              onClick={handleBuyNow}
            >
              {isBuyingNow ? t("product.redirecting") : t("product.buyNow")}
            </Button>
          </div>

          {/* Bandeau de réassurance (informations réelles uniquement) */}
          <div className={styles.reassurance}>
            <div className={styles.reassuranceItem}>
              <span className={styles.reassuranceBullet}>✓</span>
              <span>Paiement à la livraison</span>
            </div>
            {storeSettings?.whatsapp_number && (
              <a
                href={`https://wa.me/${storeSettings.whatsapp_number.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.reassuranceLink}
              >
                <span className={styles.reassuranceBullet}>✓</span>
                <span>Contact WhatsApp : {storeSettings.whatsapp_number}</span>
              </a>
            )}
          </div>

          {/* Rubriques dépliables : Détails, Entretien, Livraison, Retours */}
          <div className={styles.accordions}>
            {Boolean(product.description && product.description.trim()) && (
              <details className={styles.accordion} open>
                <summary className={styles.accordionSummary}>
                  <span>Détails</span>
                  <span className={styles.accordionIcon} aria-hidden="true">+</span>
                </summary>
                <div className={styles.accordionContent}>
                  <p>{product.description}</p>
                </div>
              </details>
            )}

            {Boolean(
              ((product as any).care_instructions && (product as any).care_instructions.trim()) ||
              ((product as any).entretien && (product as any).entretien.trim())
            ) && (
              <details className={styles.accordion}>
                <summary className={styles.accordionSummary}>
                  <span>Entretien</span>
                  <span className={styles.accordionIcon} aria-hidden="true">+</span>
                </summary>
                <div className={styles.accordionContent}>
                  <p>{(product as any).care_instructions || (product as any).entretien}</p>
                </div>
              </details>
            )}

            {Boolean(
              ((storeSettings as any)?.shipping_policy && (storeSettings as any).shipping_policy.trim()) ||
              ((product as any)?.shipping_info && (product as any).shipping_info.trim())
            ) && (
              <details className={styles.accordion}>
                <summary className={styles.accordionSummary}>
                  <span>Livraison</span>
                  <span className={styles.accordionIcon} aria-hidden="true">+</span>
                </summary>
                <div className={styles.accordionContent}>
                  <p>{(storeSettings as any)?.shipping_policy || (product as any)?.shipping_info}</p>
                </div>
              </details>
            )}

            {Boolean(storeSettings?.returns_policy && storeSettings.returns_policy.trim()) && (
              <details className={styles.accordion}>
                <summary className={styles.accordionSummary}>
                  <span>Retours</span>
                  <span className={styles.accordionIcon} aria-hidden="true">+</span>
                </summary>
                <div className={styles.accordionContent}>
                  <p>{storeSettings!.returns_policy}</p>
                </div>
              </details>
            )}
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

      {/* 3. Section « À associer » dans Carousel */}
      {complementaryProducts.length > 0 && (
        <section className={styles.similarSection}>
          <h2 className={styles.similarTitle}>{t("product.complementary")}</h2>
          <Carousel ariaLabel="Produits associés">
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
          </Carousel>
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
            {formatPrice(currentPrice)}
          </span>
          {hasDiscount && (
            <span className={styles.mobileBarOriginalPrice}>
              {formatPrice(product.compare_at_price!)}
            </span>
          )}
        </div>
        <Button
          variant="primary"
          size="md"
          className={styles.mobileBarBtn}
          onClick={handleAddToCart}
          disabled={isAddingToCart || isBuyingNow}
        >
          {isAddingToCart ? t("product.addingToCart") : t("product.addToCart")}
        </Button>
      </aside>
    </div>
  );
}
