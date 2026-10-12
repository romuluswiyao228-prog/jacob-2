import { useState } from "react";
import styles from "./ProductCard.module.css";
import { Badge } from "./Badge";
import type { ProductCardProps } from "./product-types";

export function ProductCard({
  product,
  onSizeSelect,
  selectedSize,
}: ProductCardProps) {
  const [internalSize, setInternalSize] = useState<string | undefined>(
    selectedSize
  );

  const handleSize = (size: string) => {
    setInternalSize(size);
    onSizeSelect?.(product.id, size);
  };

  const hasDiscount =
    product.originalPrice != null && product.originalPrice > product.price;

  return (
    <article className={styles.card}>
      <div className={styles.imageWrap}>
        <img
          src={product.image}
          alt={product.imageAlt ?? product.name}
          className={styles.image}
          loading="lazy"
        />
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
      </div>

      <div className={styles.body}>
        <p className={styles.reference}>{product.reference}</p>
        <h3 className={styles.name}>{product.name}</h3>

        <div className={styles.priceRow}>
          <span
            className={hasDiscount ? styles.priceDiscount : styles.price}
          >
            {product.price.toFixed(2)} €
          </span>
          {hasDiscount && (
            <span className={styles.originalPrice}>
              {product.originalPrice!.toFixed(2)} €
            </span>
          )}
        </div>

        <div className={styles.sizes}>
          {product.sizes.map((size) => {
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
                onClick={() => handleSize(size)}
                disabled={product.isSoldOut}
                aria-pressed={isActive}
              >
                {size}
              </button>
            );
          })}
        </div>
      </div>
    </article>
  );
}
