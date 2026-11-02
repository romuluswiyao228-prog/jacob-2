import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Trash2, Plus, Minus, ShoppingBag, AlertTriangle } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useCurrency } from "@/lib/currency-context";
import { Button, Skeleton, EmptyState, ErrorState, Breadcrumb } from "@/components/ui";
import { SEO } from "@/components/SEO";
import styles from "./CartPage.module.css";

export default function CartPage() {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const {
    items,
    subtotal,
    isLoading,
    error,
    removeItem,
    updateQuantity,
    clearAlerts,
    retry,
  } = useCart();

  const hasAlerts = items.some((i) => i.alert);

  return (
    <main className={styles.page}>
      <SEO
        title={t("cart.pageTitle")}
        description="Consultez et modifiez les articles de votre panier d'achat JACOB DE JESUS."
      />
      <div className={styles.container}>
        <Breadcrumb
          items={[
            { label: t("common.home"), href: "/" },
            { label: t("common.shop"), href: "/boutique" },
            { label: t("cart.pageTitle") },
          ]}
          style={{ marginBottom: "var(--space-4)" }}
        />
        <header className={styles.pageHeader}>
          <h1 className={styles.title}>{t("cart.pageTitle")}</h1>
          <span className={styles.count}>
            {t("cart.item", { count: items.reduce((a, i) => a + i.quantity, 0) })}
          </span>
        </header>

        {hasAlerts && (
          <div className={styles.alertBanner}>
            <AlertTriangle size={18} />
            <span>
              {t("cart.alertChange")}{" "}
              <button className={styles.alertDismiss} onClick={clearAlerts}>
                {t("cart.understood")}
              </button>
            </span>
          </div>
        )}

        {isLoading ? (
          <div className={styles.grid}>
            <div className={styles.itemsCol}>
              {[1, 2, 3].map((k) => (
                <div key={k} className={styles.skeletonRow}>
                  <Skeleton variant="rect" width="96px" height="128px" />
                  <div className={styles.skeletonText}>
                    <Skeleton variant="text" width="60%" height="18px" />
                    <Skeleton variant="text" width="35%" height="14px" />
                    <Skeleton variant="text" width="25%" height="14px" />
                  </div>
                </div>
              ))}
            </div>
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
            icon={<ShoppingBag size={48} strokeWidth={1} />}
            title={t("cart.emptyTitle")}
            description={t("cart.emptyDesc")}
            action={
              <Link to="/boutique">
                <Button variant="primary" size="md">
                  {t("cart.goToShop")}
                </Button>
              </Link>
            }
          />
        ) : (
          <div className={styles.grid}>
            {/* Liste des articles */}
            <div className={styles.itemsCol}>
              <ul className={styles.list}>
                {items.map((item) => {
                  const isBad = item.alert === "out_of_stock" || item.alert === "removed";
                  const isChanged = item.alert === "price_changed";
                  const effectivePrice =
                    isChanged && item.new_price != null ? item.new_price : item.unit_price;

                  return (
                    <li
                      key={item.id}
                      className={[styles.row, isBad ? styles.rowBad : ""].filter(Boolean).join(" ")}
                    >
                      <Link
                        to={"/produit/" + item.product_slug}
                        className={styles.imgLink}
                      >
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.product_name}
                            className={styles.img}
                          />
                        ) : (
                          <div className={styles.imgPlaceholder}>
                            <ShoppingBag size={24} strokeWidth={1} />
                          </div>
                        )}
                      </Link>

                      <div className={styles.info}>
                        <Link
                          to={"/produit/" + item.product_slug}
                          className={styles.name}
                        >
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

                        <div className={styles.actions}>
                          {!isBad && (
                            <div className={styles.qty}>
                              <button
                                className={styles.qtyBtn}
                                onClick={() => void updateQuantity(item.id, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                                aria-label="Diminuer la quantite"
                              >
                                <Minus size={13} />
                              </button>
                              <span className={styles.qtyValue}>{item.quantity}</span>
                              <button
                                className={styles.qtyBtn}
                                onClick={() => void updateQuantity(item.id, item.quantity + 1)}
                                disabled={item.quantity >= item.stock}
                                aria-label="Augmenter la quantite"
                              >
                                <Plus size={13} />
                              </button>
                            </div>
                          )}
                          <button
                            className={styles.removeBtn}
                            onClick={() => void removeItem(item.id)}
                            aria-label={t("cart.remove")}
                          >
                            <Trash2 size={14} />
                            <span>{t("cart.remove")}</span>
                          </button>
                        </div>
                      </div>

                      <div className={styles.lineTotal}>
                        {formatPrice(effectivePrice * item.quantity)}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Recapitulatif */}
            <aside className={styles.summary}>
              <div className={styles.summaryCard}>
                <h2 className={styles.summaryTitle}>{t("checkout.summarySection")}</h2>

                <div className={styles.summaryRow}>
                  <span>{t("cart.subtotal")}</span>
                  <span className={styles.mono}>{formatPrice(subtotal)}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span>{t("checkout.shippingFee")}</span>
                  <span className={styles.muted}>{t("cart.shippingCalculated")}</span>
                </div>
                <div className={styles.summaryDivider} />
                <div className={[styles.summaryRow, styles.summaryTotal].join(" ")}>
                  <span>{t("cart.estimatedTotal")}</span>
                  <span className={styles.mono}>{formatPrice(subtotal)}</span>
                </div>
                <p className={styles.summaryNote}>
                  {t("cart.finalAmountNote")}
                </p>

                <Link to="/commande" style={{ display: "block", textDecoration: "none" }}>
                  <Button variant="primary" size="lg" style={{ width: "100%" }}>
                    {t("cart.checkout")}
                  </Button>
                </Link>
                <Link to="/boutique" style={{ display: "block", textDecoration: "none", marginTop: "var(--space-2)" }}>
                  <Button variant="ghost" size="md" style={{ width: "100%" }}>
                    {t("cart.continueShopping")}
                  </Button>
                </Link>
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
