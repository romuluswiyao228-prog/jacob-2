import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { useCurrency } from "@/lib/currency-context";
import { supabase } from "@/lib/supabase";
import { sortSizes } from "@/lib/sizes";
import { getColorHex, isLightColor } from "@/lib/colors";
import styles from "./ProductCard.module.css";
import { Badge } from "./Badge";
import { Reveal } from "./Reveal";
import type { ProductCardProps, ProductCardVariant } from "./product-types";

export function ProductCard({
  product,
  onSizeSelect,
  selectedSize,
  onToggleFavorite,
  revealDelay,
}: ProductCardProps) {
  const { user } = useAuth();
  const { addItem, openCart } = useCart();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const [internalSize, setInternalSize] = useState<string | undefined>(
    selectedSize
  );

  const [loadedSizes, setLoadedSizes] = useState<string[]>(product.sizes ?? []);
  const [loadedColors, setLoadedColors] = useState<string[]>(product.colors ?? []);
  const [loadedVariants, setLoadedVariants] = useState<ProductCardVariant[]>(
    product.variants ?? []
  );
  const [internalSoldOut, setInternalSoldOut] = useState<boolean>(product.isSoldOut ?? false);
  const [hoverImage, setHoverImage] = useState<string | null>(product.secondaryImage ?? null);

  // Sync internal state if props change
  useEffect(() => {
    if (product.sizes && product.sizes.length > 0) {
      setLoadedSizes(product.sizes);
    }
  }, [product.sizes]);

  useEffect(() => {
    if (product.colors && product.colors.length > 0) {
      setLoadedColors(product.colors);
    }
  }, [product.colors]);

  useEffect(() => {
    if (product.variants && product.variants.length > 0) {
      setLoadedVariants(product.variants);
    }
  }, [product.variants]);

  useEffect(() => {
    if (product.secondaryImage !== undefined) {
      setHoverImage(product.secondaryImage);
    }
  }, [product.secondaryImage]);

  useEffect(() => {
    if (product.isSoldOut !== undefined) {
      setInternalSoldOut(product.isSoldOut);
    }
  }, [product.isSoldOut]);

  // Dynamically load variants and secondary image if not already provided
  useEffect(() => {
    const needsSizes = !product.sizes || product.sizes.length === 0;
    const needsColors = !product.colors || product.colors.length === 0;
    const needsVariants = !product.variants || product.variants.length === 0;
    const needsImage = product.secondaryImage === undefined;

    if (!needsSizes && !needsColors && !needsVariants && !needsImage) return;
    if (!product.id) return;

    let isMounted = true;
    async function loadExtra() {
      try {
        const [varRes, imgRes] = await Promise.all([
          needsSizes || needsColors || needsVariants
            ? supabase
                .from("product_variants")
                .select("id, size, color, stock, sku, price")
                .eq("product_id", product.id)
            : Promise.resolve({ data: null }),
          needsImage
            ? supabase
                .from("product_images")
                .select("url")
                .eq("product_id", product.id)
                .order("is_primary", { ascending: false })
                .order("sort_order", { ascending: true })
                .limit(2)
            : Promise.resolve({ data: null }),
        ]);

        if (!isMounted) return;

        if (varRes.data && varRes.data.length > 0) {
          if (needsVariants) {
            setLoadedVariants(varRes.data as ProductCardVariant[]);
          }
          if (needsSizes) {
            const rawSizes = Array.from(
              new Set(
                varRes.data
                  .map((v) => v.size)
                  .filter((s): s is string => Boolean(s) && s.trim().toLowerCase() !== "unique")
              )
            );
            setLoadedSizes(sortSizes(rawSizes));
          }
          if (needsColors) {
            const rawColors = Array.from(
              new Set(
                varRes.data
                  .map((v) => v.color)
                  .filter((c): c is string => Boolean(c))
              )
            );
            setLoadedColors(rawColors);
          }
          const allSoldOut = varRes.data.every((v) => (v.stock ?? 0) <= 0);
          if (allSoldOut) setInternalSoldOut(true);
        }

        if (imgRes.data && imgRes.data.length > 1) {
          setHoverImage(imgRes.data[1].url);
        }
      } catch {
        // Fallback silently
      }
    }

    loadExtra();
    return () => {
      isMounted = false;
    };
  }, [product.id, product.sizes, product.colors, product.variants, product.secondaryImage]);

  const handleSize = (size: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const next = internalSize === size ? undefined : size;
    setInternalSize(next);
    onSizeSelect?.(product.id, next || "");
  };

  const [heartBouncing, setHeartBouncing] = useState(false);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setHeartBouncing(true);
    setTimeout(() => setHeartBouncing(false), 150);
    if (!user) {
      navigate("/connexion");
      return;
    }
    onToggleFavorite?.(product.id);
  };

  const effectiveVariants =
    product.variants && product.variants.length > 0
      ? product.variants
      : loadedVariants;

  const inStockVariants = effectiveVariants.filter((v) => (v.stock ?? 0) > 0);
  const isSoldOut =
    product.isSoldOut ||
    internalSoldOut ||
    (effectiveVariants.length > 0 && inStockVariants.length === 0);

  const hasDiscount =
    product.originalPrice != null && product.originalPrice > product.price;

  const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
  const isNew = product.createdAt
    ? Date.now() - new Date(product.createdAt).getTime() < FOURTEEN_DAYS_MS
    : product.badge === "new";

  const secondary = product.secondaryImage ?? hoverImage;

  // Determine badge: NOUVEAU / SOLDE (rouge) / ÉPUISÉ
  let computedBadge: { variant: "new" | "sale" | "soldout"; label: string } | null = null;
  if (isSoldOut || product.badge === "soldout") {
    computedBadge = { variant: "soldout", label: "ÉPUISÉ" };
  } else if (hasDiscount || product.badge === "sale") {
    computedBadge = { variant: "sale", label: "SOLDE" };
  } else if (isNew) {
    computedBadge = { variant: "new", label: "NOUVEAU" };
  }

  const productLink = `/produit/${product.slug || product.id}`;

  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (inStockVariants.length !== 1) return;
    const v = inStockVariants[0];
    await addItem({
      variant_id: v.id,
      product_id: product.id,
      product_name: product.name,
      product_slug: product.slug || product.id,
      image_url: product.image || null,
      size: v.size,
      color: v.color,
      sku: v.sku || product.reference,
      unit_price: v.price ?? product.price,
      currency: product.currency || "XOF",
      stock: v.stock,
    });
    openCart();
  };

  const effectiveSizes = product.sizes && product.sizes.length > 0 ? product.sizes : loadedSizes;
  const visibleSizes = effectiveSizes.filter(
    (s) => s && s.trim().toLowerCase() !== "unique"
  );

  const effectiveColors = product.colors && product.colors.length > 0 ? product.colors : loadedColors;
  const visibleColors = effectiveColors.filter(Boolean);

  return (
    <Reveal
      as="article"
      delay={revealDelay}
      className={[
        styles.card,
        isSoldOut ? styles.cardSoldOut : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={styles.imageWrap}>
        <Link to={productLink} className={styles.imageLink} aria-label={product.name}>
          {product.image ? (
            <>
              <img
                src={product.image}
                alt={product.imageAlt ?? product.name}
                className={[styles.image, secondary ? styles.hasSecondary : ""].filter(Boolean).join(" ")}
                loading="lazy"
                width="400"
                height="500"
              />
              {secondary && (
                <img
                  src={secondary}
                  alt={`${product.name} - seconde photo`}
                  className={styles.secondaryImage}
                  loading="lazy"
                  width="400"
                  height="500"
                />
              )}
            </>
          ) : (
            <div className={styles.placeholderWrap}>
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span>Jacob de Jesus</span>
            </div>
          )}
        </Link>

        {computedBadge && (
          <span className={styles.badgeOverlay}>
            <Badge variant={computedBadge.variant}>
              {computedBadge.label}
            </Badge>
          </span>
        )}

        <button
          type="button"
          onClick={handleFavoriteClick}
          className={[
            styles.favoriteBtn,
            product.isFavorite ? styles.favoriteBtnActive : "",
            heartBouncing ? styles.favoriteBtnBouncing : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-label={
            product.isFavorite
              ? "Retirer des favoris"
              : "Ajouter aux favoris"
          }
        >
          <Heart
            size={16}
            fill={product.isFavorite ? "currentColor" : "none"}
            strokeWidth={1.5}
          />
        </button>

        {/* Bouton d'action : Ajout rapide ou Choisir la taille */}
        {!isSoldOut && inStockVariants.length === 1 && (
          <button
            type="button"
            className={styles.quickActionBtn}
            onClick={handleQuickAdd}
            aria-label={`Ajout rapide - ${product.name}`}
          >
            Ajout rapide
          </button>
        )}
        {!isSoldOut && inStockVariants.length > 1 && (
          <Link
            to={productLink}
            className={styles.quickActionBtn}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Choisir la taille - ${product.name}`}
          >
            Choisir la taille
          </Link>
        )}
      </div>

      <div className={styles.body}>
        <p className={styles.reference}>{product.reference}</p>
        <h3 className={styles.name}>
          <Link to={productLink} style={{ color: "inherit", textDecoration: "none" }}>
            {product.name}
          </Link>
        </h3>

        <div className={styles.priceRow}>
          <span
            className={hasDiscount ? styles.priceDiscount : styles.price}
          >
            {formatPrice(product.price)}
          </span>
          {hasDiscount && (
            <span className={styles.originalPrice}>
              {formatPrice(product.originalPrice!)}
            </span>
          )}
        </div>

        {visibleColors.length > 0 && (
          <div className={styles.colors} aria-label="Couleurs disponibles">
            {visibleColors.map((color) => {
              const hex = getColorHex(color);
              const light = isLightColor(hex);
              return (
                <span
                  key={color}
                  className={styles.colorDot}
                  style={{
                    backgroundColor: hex,
                    border: light ? "1px solid var(--color-border)" : "1px solid transparent",
                  }}
                  title={color}
                />
              );
            })}
          </div>
        )}

        {visibleSizes.length > 0 && (
          <div className={styles.sizes}>
            {visibleSizes.map((size) => {
              const isActive = (selectedSize || internalSize) === size;
              return (
                <button
                  key={size}
                  type="button"
                  className={[
                    styles.sizeBox,
                    isActive ? styles.sizeActive : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={(e) => handleSize(size, e)}
                  disabled={isSoldOut}
                  aria-pressed={isActive}
                >
                  {size}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Reveal>
  );
}
