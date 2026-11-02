import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Trash2, Plus, Minus, ShoppingBag, AlertTriangle } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useCurrency } from "@/lib/currency-context";
import { Drawer, Button, Skeleton, EmptyState, ErrorState } from "@/components/ui";
import styles from "./CartDrawer.module.css";

export function CartDrawer() {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const {
    items,
    subtotal,
    isOpen,
    isLoading,
    error,
    closeCart,
    removeItem,
    updateQuantity,
    clearAlerts,
    retry,
  } = useCart();

  const hasAlerts = items.some((i) => i.alert);

  return (
    <Drawer open={isOpen} onClose={closeCart} title={t("cart.drawerTitle", "Votre Sac")} side="right">
      <div className={styles.inner}>
        {/* Alertes de revalidation */}
        {hasAlerts && (
          <div className={styles.alertBanner}>
            <AlertTriangle size={16} />
            <span>
              {t("cart.alertChange")}{" "}
              <button className={styles.alertDismiss} onClick={clearAlerts}>
                {t("cart.understood")}
              </button>
            </span>
          </div>
        )}

        {/* Corps */}
        <div className={styles.body}>
          {isLoading ? (
            <div className={styles.skeletons}>
              {[1, 2, 3].map((k) => (
                <div key={k} className={styles.skeletonRow}>
                  <Skeleton variant="rect" width="72px" height="96px" />
                  <div className={styles.skeletonText}>
                    <Skeleton variant="text" width="70%" height="16px" />
                    <Skeleton variant="text" width="40%" height="14px" />
                    <Skeleton variant="text" width="30%" height="14px" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <ErrorState
              title={t("cart.loadError")}
              message={error}
              action={
                <Button variant="outline" size="sm" onClick={() => void retry()}>
                  {t("common.retry")}
                </Button>
              }
            />
          ) : items.length === 0 ? (
            <EmptyState
              icon={<ShoppingBag size={40} strokeWidth={1} />}
              title={t("cart.emptyTitle")}
              description={t("cart.emptyDesc")}
              action={
                <Link to="/boutique" onClick={closeCart}>
                  <Button variant="primary" size="md">
                    {t("cart.goToShop")}
                  </Button>
                </Link>
              }
            />
          ) : (
            <ul className={styles.list}>
              {items.map((item) => {
                const isBad = item.alert === "out_of_stock" || item.alert === "removed";
                const isChanged = item.alert === "price_changed";
                const effectivePrice = isChanged && item.new_price != null ? item.new_price : item.unit_price;

                return (
                  <li key={item.id} className={[styles.row, isBad ? styles.rowBad : ""].filter(Boolean).join(" ")}>
                    <Link to={"/produit/" + item.product_slug} onClick={closeCart} className={styles.imgLink}>
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.product_name} className={styles.img} />
                      ) : (
                        <div className={styles.imgPlaceholder}>
                          <ShoppingBag size={20} strokeWidth={1} />
                        </div>
                      )}
                    </Link>

                    <div className={styles.info}>
                      <Link to={"/produit/" + item.product_slug} onClick={closeCart} className={styles.name}>
                        {item.product_name}
                      </Link>

                      {(item.size || item.color) && (
                        <span className={styles.variant}>
                          {[item.size, item.color].filter(Boolean).join(" — ")}
                        </span>
                      )}

                      {item.alert === "removed" && (
                        <span className={styles.alertTag}>{t("cart.itemRemoved")}</span>
                      )}
                      {item.alert === "out_of_stock" && (
                        <span className={styles.alertTag}>{t("product.soldOut")}</span>
                      )}
                      {isChanged && item.new_price != null && (
                        <span className={styles.alertTagPrice}>
                          {t("cart.priceUpdated", { price: formatPrice(item.new_price) })}
                        </span>
                      )}

                      <div className={styles.priceRow}>
                        <span className={styles.price}>{formatPrice(effectivePrice * item.quantity)}</span>
                        {!isBad && (
                          <div className={styles.qty}>
                            <button
                              className={styles.qtyBtn}
                              onClick={() => void updateQuantity(item.id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              aria-label="Diminuer"
                            >
                              <Minus size={12} />
                            </button>
                            <span className={styles.qtyValue}>{item.quantity}</span>
                            <button
                              className={styles.qtyBtn}
                              onClick={() => void updateQuantity(item.id, item.quantity + 1)}
                              disabled={item.quantity >= item.stock}
                              aria-label="Augmenter"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      className={styles.removeBtn}
                      onClick={() => void removeItem(item.id)}
                      aria-label={t("cart.remove")}
                    >
                      <Trash2 size={15} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer total */}
        {items.length > 0 && !isLoading && !error && (
          <div className={styles.footer}>
            <div className={styles.totalRow}>
              <span className={styles.totalLabel}>{t("cart.subtotal")}</span>
              <span className={styles.totalAmount}>{formatPrice(subtotal)}</span>
            </div>
            <p className={styles.shippingNote}>
              {t("cart.shippingCalculated")}
            </p>
            <Link to="/panier" onClick={closeCart} className={styles.viewCartLink}>
              <Button variant="outline" size="lg" style={{ width: "100%", marginBottom: "var(--space-2)" }}>
                {t("cart.viewCart")}
              </Button>
            </Link>
            <Link to="/commande" onClick={closeCart} className={styles.checkoutLink}>
              <Button variant="primary" size="lg" style={{ width: "100%" }}>
                {t("cart.checkout")}
              </Button>
            </Link>
          </div>
        )}
      </div>
    </Drawer>
  );
}
