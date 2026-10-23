import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { Button, Skeleton, EmptyState, ErrorState } from "@/components/ui";
import { AccountLayout } from "@/components/account/AccountLayout";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_STYLES,
  formatXOF,
  formatDate,
  type OrderStatus,
} from "./OrdersHistoryPage";
import styles from "./CustomerOrderDetailPage.module.css";

interface OrderDetail {
  id: string;
  order_number: string;
  created_at: string;
  status: OrderStatus;
  subtotal: number;
  shipping_total: number;
  discount_total: number;
  total: number;
  currency: string;
  shipping_address: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    line1?: string;
    line2?: string;
    city?: string;
    region?: string;
    postal_code?: string;
    country?: string;
    notes?: string;
  } | null;
  notes?: string | null;
}

interface OrderItem {
  id: string;
  product_name: string;
  product_description?: string | null;
  unit_price: number;
  quantity: number;
  size?: string | null;
  color?: string | null;
  sku?: string | null;
  line_total: number;
  currency: string;
}

interface StatusHistoryItem {
  id: string;
  status: OrderStatus;
  note?: string | null;
  created_at: string;
}

interface PaymentItem {
  id: string;
  provider: string;
  method: string | null;
  provider_reference: string | null;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
}

interface ShipmentItem {
  id: string;
  carrier: string | null;
  tracking_number: string | null;
  status: string;
  shipped_at: string | null;
  delivered_at: string | null;
  created_at: string;
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  paid: "Payé",
  failed: "Échoué",
  cancelled: "Annulé",
  refunded: "Remboursé",
};

const SHIPMENT_STATUS_LABELS: Record<string, string> = {
  pending: "En préparation",
  packed: "Colis préparé",
  shipped: "Expédié",
  in_transit: "En transit",
  out_for_delivery: "En cours de livraison",
  delivered: "Livré",
  returned: "Retourné",
  cancelled: "Annulé",
};

export default function CustomerOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [history, setHistory] = useState<StatusHistoryItem[]>([]);
  const [payment, setPayment] = useState<PaymentItem | null>(null);
  const [shipment, setShipment] = useState<ShipmentItem | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrderDetail = useCallback(async () => {
    if (!id || !user) return;
    setIsLoading(true);
    setError(null);

    try {
      const [orderRes, itemsRes, historyRes, payRes, shipRes] = await Promise.all([
        supabase
          .from("orders")
          .select("*")
          .eq("id", id)
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("order_items")
          .select("*")
          .eq("order_id", id),
        supabase
          .from("order_status_history")
          .select("*")
          .eq("order_id", id)
          .order("created_at", { ascending: true }),
        supabase
          .from("payments")
          .select("*")
          .eq("order_id", id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("shipments")
          .select("*")
          .eq("order_id", id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (orderRes.error) throw orderRes.error;
      if (!orderRes.data) {
        setOrder(null);
        return;
      }

      setOrder(orderRes.data as OrderDetail);
      setItems((itemsRes.data as OrderItem[]) ?? []);
      setHistory((historyRes.data as StatusHistoryItem[]) ?? []);
      setPayment((payRes.data as PaymentItem) ?? null);
      setShipment((shipRes.data as ShipmentItem) ?? null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur de chargement de la commande.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    loadOrderDetail();
  }, [loadOrderDetail]);

  const breadcrumbs = [
    { label: "Accueil", href: "/" },
    { label: "Mon compte", href: "/compte" },
    { label: "Mes commandes", href: "/compte/commandes" },
    { label: order ? order.order_number : "Commande" },
  ];

  return (
    <AccountLayout
      title={order ? `Commande ${order.order_number}` : "Détail de la commande"}
      breadcrumbItems={breadcrumbs}
    >
      <div className={styles.topNav}>
        <Link to="/compte/commandes" className={styles.backLink}>
          <ArrowLeft size={14} />
          <span>Toutes mes commandes</span>
        </Link>

        {order && (
          <Link
            to={`/contact?commande=${encodeURIComponent(order.order_number)}`}
            className={styles.contactBtn}
          >
            <MessageCircle size={14} />
            <span>Contacter la boutique au sujet de cette commande</span>
          </Link>
        )}
      </div>

      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <Skeleton variant="rect" width="100%" height="80px" />
          <Skeleton variant="rect" width="100%" height="280px" />
        </div>
      ) : error ? (
        <ErrorState
          title="Impossible de charger cette commande"
          message={error}
          action={
            <Button variant="outline" size="sm" onClick={loadOrderDetail}>
              Réessayer
            </Button>
          }
        />
      ) : !order ? (
        <EmptyState
          title="Commande introuvable"
          description="Cette commande n'existe pas ou vous n'avez pas l'autorisation d'y accéder."
          action={
            <Link to="/compte/commandes">
              <Button variant="primary">Retour aux commandes</Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className={styles.orderHeader}>
            <div className={styles.headerLeft}>
              <h2 className={styles.orderNumber}>{order.order_number}</h2>
              <span
                className={[
                  styles.badge,
                  ORDER_STATUS_STYLES[order.status] || "",
                ].join(" ")}
              >
                {ORDER_STATUS_LABELS[order.status] || order.status}
              </span>
            </div>
            <span className={styles.orderDate}>
              Commandé le {formatDate(order.created_at)}
            </span>
          </div>

          <div className={styles.layout}>
            {/* Colonne Principale */}
            <div className={styles.mainColumn}>
              {/* Articles commandés */}
              <section className={styles.card}>
                <h3 className={styles.cardTitle}>Articles commandés</h3>
                <div className={styles.itemsList}>
                  {items.map((it) => (
                    <div key={it.id} className={styles.itemRow}>
                      <div className={styles.itemDetails}>
                        <h4 className={styles.itemName}>{it.product_name}</h4>
                        <div className={styles.itemMeta}>
                          {it.size && <span>Taille : {it.size}</span>}
                          {it.size && it.color && <span> · </span>}
                          {it.color && <span>Couleur : {it.color}</span>}
                          {it.sku && <span> (SKU: {it.sku})</span>}
                        </div>
                        <div className={styles.itemMeta}>
                          Quantité : {it.quantity} × {formatXOF(it.unit_price)}
                        </div>
                      </div>
                      <div className={styles.itemPrice}>
                        {formatXOF(it.line_total)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className={styles.totalsList}>
                  <div className={styles.totalRow}>
                    <span>Sous-total articles</span>
                    <span>{formatXOF(order.subtotal)}</span>
                  </div>
                  <div className={styles.totalRow}>
                    <span>Frais de livraison</span>
                    <span>
                      {order.shipping_total > 0
                        ? formatXOF(order.shipping_total)
                        : "Gratuit"}
                    </span>
                  </div>
                  {order.discount_total > 0 && (
                    <div className={styles.totalRow} style={{ color: "var(--color-accent)" }}>
                      <span>Réduction</span>
                      <span>-{formatXOF(order.discount_total)}</span>
                    </div>
                  )}
                  <div className={styles.grandTotalRow}>
                    <span>Total payé</span>
                    <span>{formatXOF(order.total)}</span>
                  </div>
                </div>
              </section>

              {/* Historique des statuts */}
              <section className={styles.card}>
                <h3 className={styles.cardTitle}>Historique des statuts</h3>
                {history.length === 0 ? (
                  <p className={styles.infoText}>Aucun historique disponible.</p>
                ) : (
                  <div className={styles.timeline}>
                    {history.map((h) => {
                      const label = ORDER_STATUS_LABELS[h.status] || h.status;
                      const statusStyle = ORDER_STATUS_STYLES[h.status] || "";
                      return (
                        <div key={h.id} className={styles.timelineItem}>
                          <span className={styles.timelineDot} />
                          <div className={styles.timelineHeader}>
                            <span className={[styles.badge, statusStyle].join(" ")}>
                              {label}
                            </span>
                            <span className={styles.timelineDate}>
                              {formatDate(h.created_at)}
                            </span>
                          </div>
                          {h.note && (
                            <p className={styles.timelineNote}>{h.note}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>

            {/* Colonne Latérale */}
            <div className={styles.sideColumn}>
              {/* Adresse de livraison */}
              <section className={styles.card}>
                <h3 className={styles.cardTitle}>Adresse de livraison</h3>
                {order.shipping_address ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <p className={styles.infoText} style={{ fontWeight: "bold" }}>
                      {order.shipping_address.first_name} {order.shipping_address.last_name}
                    </p>
                    <p className={styles.infoText}>{order.shipping_address.line1}</p>
                    {order.shipping_address.line2 && (
                      <p className={styles.infoText}>{order.shipping_address.line2}</p>
                    )}
                    <p className={styles.infoText}>
                      {[
                        order.shipping_address.postal_code,
                        order.shipping_address.city,
                        order.shipping_address.region,
                        order.shipping_address.country,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                    {order.shipping_address.phone && (
                      <p className={styles.infoMono}>
                        Tél : {order.shipping_address.phone}
                      </p>
                    )}
                    {order.shipping_address.notes && (
                      <p className={styles.infoMono} style={{ fontStyle: "italic", marginTop: "6px" }}>
                        Note : {order.shipping_address.notes}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className={styles.infoText}>Aucune adresse renseignée.</p>
                )}
              </section>

              {/* Paiement */}
              <section className={styles.card}>
                <h3 className={styles.cardTitle}>Paiement</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className={styles.infoText}>Mode</span>
                    <span className={styles.infoMono} style={{ fontWeight: "bold" }}>
                      {payment?.method === "cash_on_delivery"
                        ? "Paiement à la livraison"
                        : payment?.method || "Paiement à la livraison"}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className={styles.infoText}>Statut</span>
                    <span className={styles.badge}>
                      {payment ? (PAYMENT_STATUS_LABELS[payment.status] || payment.status) : "En attente"}
                    </span>
                  </div>
                  {payment?.provider_reference && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className={styles.infoText}>Réf.</span>
                      <span className={styles.infoMono}>{payment.provider_reference}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className={styles.infoText}>Montant</span>
                    <span className={styles.infoMono} style={{ fontWeight: "bold" }}>
                      {formatXOF(order.total)}
                    </span>
                  </div>
                </div>
              </section>

              {/* Expédition et suivi */}
              <section className={styles.card}>
                <h3 className={styles.cardTitle}>Expédition & Suivi</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className={styles.infoText}>Statut</span>
                    <span className={styles.badge}>
                      {shipment
                        ? SHIPMENT_STATUS_LABELS[shipment.status] || shipment.status
                        : "En préparation"}
                    </span>
                  </div>
                  {shipment?.carrier && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className={styles.infoText}>Transporteur</span>
                      <span className={styles.infoMono}>{shipment.carrier}</span>
                    </div>
                  )}
                  {shipment?.tracking_number && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className={styles.infoText}>N° de suivi</span>
                      <span className={styles.infoMono} style={{ fontWeight: "bold" }}>
                        {shipment.tracking_number}
                      </span>
                    </div>
                  )}
                  {shipment?.shipped_at && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className={styles.infoText}>Expédié le</span>
                      <span className={styles.infoMono}>{formatDate(shipment.shipped_at)}</span>
                    </div>
                  )}
                  {shipment?.delivered_at && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className={styles.infoText}>Livré le</span>
                      <span className={styles.infoMono}>{formatDate(shipment.delivered_at)}</span>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </>
      )}
    </AccountLayout>
  );
}
