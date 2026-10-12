import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
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
  const navigate = useNavigate();
  const [internalSize, setInternalSize] = useState<string | undefined>(
    selectedSize
  );

  const handleSize = (size: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setInternalSize(size);
    onSizeSelect?.(product.id, size);
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

  const productLink = `/produit/${product.slug || product.id}`;
  const currencyLabel = product.currency || "FCFA";

  const visibleSizes = (product.sizes || []).filter((s) => s.toLowerCase() !== "unique");

  return (
    <article className={styles.card}>
      <Link to={productLink} className={styles.imageWrap}>
        {product.image ? (
          <img
            src={product.image}
            alt={product.imageAlt ?? product.name}
            className={styles.image}
            loading="lazy"
          />
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

        {product.badge && (
          <span className={styles.badgeOverlay}>
            <Badge variant={product.badge}>
              {product.badge === "new"
                ? "NOUVEAU"
                : product.badge === "sale"
                ? "SOLDE"
                : "ÉPUISÉ"}
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
      </Link>

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
            {product.price.toLocaleString("fr-FR")} {currencyLabel}
          </span>
          {hasDiscount && (
            <span className={styles.originalPrice}>
              {product.originalPrice!.toLocaleString("fr-FR")} {currencyLabel}
            </span>
          )}
        </div>

        {visibleSizes.length > 0 && (
          <div className={styles.sizes}>
            {visibleSizes.map((size) => {
              const isActive = internalSize === size;
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
                  disabled={product.isSoldOut}
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
