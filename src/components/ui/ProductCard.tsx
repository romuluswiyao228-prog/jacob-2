import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useCurrency } from "@/lib/currency-context";
import { supabase } from "@/lib/supabase";
import { sortSizes } from "@/lib/sizes";
import { getColorHex, isLightColor } from "@/lib/colors";
import styles from "./ProductCard.module.css";
import { Badge } from "./Badge";
import type { ProductCardProps } from "./product-types";

export function ProductCard({
  product,
  onSizeSelect,
  selectedSize,
  onToggleFavorite,
}: ProductCardProps) {
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const [internalSize, setInternalSize] = useState<string | undefined>(
    selectedSize
  );

  const [loadedSizes, setLoadedSizes] = useState<string[]>(product.sizes ?? []);
  const [loadedColors, setLoadedColors] = useState<string[]>(product.colors ?? []);
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
    const needsImage = product.secondaryImage === undefined;

    if (!needsSizes && !needsColors && !needsImage) return;
    if (!product.id) return;

    let isMounted = true;
    async function loadExtra() {
      try {
        const [varRes, imgRes] = await Promise.all([
          needsSizes || needsColors
            ? supabase
                .from("product_variants")
                .select("size, color, stock")
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
  }, [product.id, product.sizes, product.colors, product.secondaryImage]);

  const handleSize = (size: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const next = internalSize === size ? undefined : size;
    setInternalSize(next);
    onSizeSelect?.(product.id, next || "");
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!user) {
      navigate("/connexion");
      return;
    }
    onToggleFavorite?.(product.id);
  };

  const hasDiscount =
    product.originalPrice != null && product.originalPrice > product.price;

  const isSoldOut = product.isSoldOut || internalSoldOut;
  const secondary = product.secondaryImage ?? hoverImage;

  // Determine badge: NOUVEAU / SOLDE (rouge) / ÉPUISÉ
  let computedBadge: { variant: "new" | "sale" | "soldout"; label: string } | null = null;
  if (isSoldOut || product.badge === "soldout") {
    computedBadge = { variant: "soldout", label: "ÉPUISÉ" };
  } else if (hasDiscount || product.badge === "sale") {
    computedBadge = { variant: "sale", label: "SOLDE" };
  } else if (product.badge === "new") {
    computedBadge = { variant: "new", label: "NOUVEAU" };
  }

  const productLink = `/produit/${product.slug || product.id}`;

  const effectiveSizes = product.sizes && product.sizes.length > 0 ? product.sizes : loadedSizes;
  const visibleSizes = effectiveSizes.filter(
    (s) => s && s.trim().toLowerCase() !== "unique"
  );

  const effectiveColors = product.colors && product.colors.length > 0 ? product.colors : loadedColors;
  const visibleColors = effectiveColors.filter(Boolean);

  return (
    <article
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
                <circle cx="8.5" cy="8.5" r="1.5" />
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
    </article>
  );
}
