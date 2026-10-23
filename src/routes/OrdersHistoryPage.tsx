import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, ShoppingBag } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { Button, Skeleton, EmptyState, ErrorState } from "@/components/ui";
import { AccountLayout } from "@/components/account/AccountLayout";
import styles from "./OrdersHistoryPage.module.css";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded"
  | "on_hold";

export interface OrderItemSummary {
  id: string;
  order_number: string;
  created_at: string;
  status: OrderStatus;
  total: number;
  currency: string;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  processing: "En cours",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
  refunded: "Remboursée",
  on_hold: "En pause",
};

export const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  pending: styles.statusPending,
  confirmed: styles.statusConfirmed,
  processing: styles.statusProcessing,
  shipped: styles.statusShipped,
  delivered: styles.statusDelivered,
  cancelled: styles.statusCancelled,
  refunded: styles.statusRefunded,
  on_hold: styles.statusOnHold,
};

export function formatXOF(amount: number): string {
  return amount.toLocaleString("fr-FR") + "\u00a0XOF";
}

export function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function OrdersHistoryPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderItemSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchErr } = await supabase
        .from("orders")
        .select("id, order_number, created_at, status, total, currency")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (fetchErr) throw fetchErr;
      setOrders((data as OrderItemSummary[]) ?? []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors du chargement des commandes.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  return (
    <AccountLayout
      title="Mes commandes"
      subtitle={`${orders.length} commande${orders.length > 1 ? "s" : ""} passée${orders.length > 1 ? "s" : ""}`}
    >
      {isLoading ? (
        <div className={styles.ordersList}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                background: "var(--color-surface)",
                border: "var(--border-width) solid var(--color-border)",
                padding: "var(--space-5)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "40%" }}>
                <Skeleton variant="text" width="60%" height="20px" />
                <Skeleton variant="text" width="40%" height="14px" />
              </div>
              <Skeleton variant="rect" width="120px" height="36px" />
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState
          title="Impossible de charger vos commandes"
          message={error}
          action={
            <Button variant="outline" size="sm" onClick={loadOrders}>
              Réessayer
            </Button>
          }
        />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag size={48} strokeWidth={1} />}
          title="Vous n'avez pas encore passé de commande"
          description="Retrouvez ici toutes vos pièces commandées et leur avancement."
          action={
            <Link to="/boutique" style={{ textDecoration: "none" }}>
              <Button variant="primary" size="md">
                Découvrir la boutique
              </Button>
            </Link>
          }
        />
      ) : (
        <div className={styles.ordersList}>
          {orders.map((order) => {
            const statusLabel = ORDER_STATUS_LABELS[order.status] || order.status;
            const statusClass = ORDER_STATUS_STYLES[order.status] || styles.statusPending;

            return (
              <article key={order.id} className={styles.orderCard}>
                <div className={styles.orderMeta}>
                  <div className={styles.orderNumberRow}>
                    <Link
                      to={`/compte/commandes/${order.id}`}
                      className={styles.orderNumber}
                    >
                      {order.order_number}
                    </Link>
                    <span className={[styles.statusBadge, statusClass].join(" ")}>
                      {statusLabel}
                    </span>
                  </div>
                  <span className={styles.orderDate}>
                    Passée le {formatDate(order.created_at)}
                  </span>
                </div>

                <div className={styles.orderRight}>
                  <span className={styles.orderTotal}>
                    {formatXOF(order.total)}
                  </span>
                  <Link
                    to={`/compte/commandes/${order.id}`}
                    className={styles.detailsLink}
                  >
                    <span>Détails</span>
                    <ChevronRight size={14} />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </AccountLayout>
  );
}
