import { Link } from "react-router-dom";
import { Trash2, Plus, Minus, ShoppingBag, AlertTriangle } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { Button, Skeleton, EmptyState, ErrorState } from "@/components/ui";
import styles from "./CartPage.module.css";

function formatXOF(amount: number): string {
  return amount.toLocaleString("fr-FR") + "\u00a0XOF";
}

export default function CartPage() {
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
      <div className={styles.container}>
        <header className={styles.pageHeader}>
          <h1 className={styles.title}>Mon Panier</h1>
          <span className={styles.count}>
            {items.reduce((a, i) => a + i.quantity, 0)} article(s)
          </span>
        </header>

        {hasAlerts && (
          <div className={styles.alertBanner}>
            <AlertTriangle size={18} />
            <span>
              Certains articles ont ete mis a jour (prix ou stock).{" "}
              <button className={styles.alertDismiss} onClick={clearAlerts}>
                Compris
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
            title="Impossible de charger le panier"
            message={error}
            action={
              <Button variant="outline" size="sm" onClick={() => void retry()}>
                Reessayer
              </Button>
            }
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag size={48} strokeWidth={1} />}
            title="Votre panier est vide"
            description="Parcourez notre catalogue pour trouver vos articles."
            action={
              <Link to="/boutique">
                <Button variant="primary" size="md">
                  Voir le catalogue
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
                          <span className={styles.alertTag}>Produit retire</span>
                        )}
                        {item.alert === "out_of_stock" && (
                          <span className={styles.alertTag}>Epuise</span>
                        )}
                        {isChanged && item.new_price != null && (
                          <span className={styles.alertTagPrice}>
                            Nouveau prix : {formatXOF(item.new_price)}
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
                            aria-label="Retirer du panier"
                          >
                            <Trash2 size={14} />
                            <span>Retirer</span>
                          </button>
                        </div>
                      </div>

                      <div className={styles.lineTotal}>
                        {formatXOF(effectivePrice * item.quantity)}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Recapitulatif */}
            <aside className={styles.summary}>
              <div className={styles.summaryCard}>
                <h2 className={styles.summaryTitle}>Recapitulatif</h2>

                <div className={styles.summaryRow}>
                  <span>Sous-total</span>
                  <span className={styles.mono}>{formatXOF(subtotal)}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span>Livraison</span>
                  <span className={styles.muted}>Calculee a l&apos;etape suivante</span>
                </div>
                <div className={styles.summaryDivider} />
                <div className={[styles.summaryRow, styles.summaryTotal].join(" ")}>
                  <span>Total estimatif</span>
                  <span className={styles.mono}>{formatXOF(subtotal)}</span>
                </div>
                <p className={styles.summaryNote}>
                  Le montant final sera calcule au moment de la commande.
                </p>

                <Link to="/commande" style={{ display: "block", textDecoration: "none" }}>
                  <Button variant="primary" size="lg" style={{ width: "100%" }}>
                    Passer la commande
                  </Button>
                </Link>
                <Link to="/boutique" style={{ display: "block", textDecoration: "none", marginTop: "var(--space-2)" }}>
                  <Button variant="ghost" size="md" style={{ width: "100%" }}>
                    Continuer mes achats
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
