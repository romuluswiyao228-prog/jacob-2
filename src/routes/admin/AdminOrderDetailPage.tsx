import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import styles from "./AdminOrderDetailPage.module.css";

// ── Types ──────────────────────────────────────────────────────────────────

type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded"
  | "on_hold";

type PaymentStatus = "pending" | "paid" | "failed" | "cancelled" | "refunded";
type ShipmentStatus =
  | "pending"
  | "packed"
  | "shipped"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "returned"
  | "cancelled";

interface OrderItem {
  id: string;
  product_name: string;
  product_description: string | null;
  size: string | null;
  color: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
  currency: string;
}

interface Payment {
  id: string;
  provider: string;
  method: string | null;
  provider_reference: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  created_at: string;
}

interface Shipment {
  id: string;
  carrier: string | null;
  tracking_number: string | null;
  status: ShipmentStatus;
  shipped_at: string | null;
  delivered_at: string | null;
}

interface StatusHistoryEntry {
  id: string;
  status: OrderStatus;
  note: string | null;
  created_at: string;
}

interface OrderDetail {
  id: string;
  order_number: string;
  status: OrderStatus;
  subtotal: number;
  shipping_total: number;
  discount_total: number;
  total: number;
  currency: string;
  notes: string | null;
  shipping_address: Record<string, string> | null;
  billing_address: Record<string, string> | null;
  created_at: string;
  updated_at: string;
  customer_name: string | null;
  customer_email: string | null;
  items: OrderItem[];
  payments: Payment[];
  shipments: Shipment[];
  history: StatusHistoryEntry[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  processing: "En cours",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
  refunded: "Remboursée",
  on_hold: "En pause",
};

const STATUS_CSS: Record<OrderStatus, string> = {
  pending: styles.statusPending,
  confirmed: styles.statusConfirmed,
  processing: styles.statusProcessing,
  shipped: styles.statusShipped,
  delivered: styles.statusDelivered,
  cancelled: styles.statusCancelled,
  refunded: styles.statusRefunded,
  on_hold: styles.statusOnHold,
};

// Allowed transitions for the current status
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled", "on_hold"],
  confirmed: ["processing", "cancelled", "on_hold"],
  processing: ["shipped", "cancelled", "on_hold"],
  shipped: ["delivered", "on_hold"],
  delivered: ["refunded"],
  on_hold: ["confirmed", "cancelled"],
  cancelled: [],
  refunded: [],
};

const SHIPMENT_STATUSES: ShipmentStatus[] = [
  "pending",
  "packed",
  "shipped",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "returned",
  "cancelled",
];

function formatXOF(amount: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AddressBlock({ addr }: { addr: Record<string, string> | null }) {
  if (!addr) return <span style={{ color: "var(--color-neutral-500)" }}>—</span>;
  const lines = [
    addr.full_name ?? addr.name,
    addr.line1,
    addr.line2,
    [addr.postal_code, addr.city].filter(Boolean).join(" "),
    addr.country,
    addr.phone,
  ].filter(Boolean);
  return (
    <div className={styles.addressBlock}>
      {lines.map((l, i) => (
        <div key={i}>{l}</div>
      ))}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Status update state
  const [newStatus, setNewStatus] = useState<OrderStatus | "">("");
  const [statusNote, setStatusNote] = useState("");
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  // COD payment state
  const [codRef, setCodRef] = useState("");
  const [codBusy, setCodBusy] = useState(false);
  const [codMsg, setCodMsg] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  // Shipment state
  const [carrier, setCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [shipmentStatus, setShipmentStatus] =
    useState<ShipmentStatus>("pending");
  const [shipBusy, setShipBusy] = useState(false);
  const [shipMsg, setShipMsg] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const { data: o, error: oErr } = await supabase
        .from("orders")
        .select(
          `
          id, order_number, status,
          subtotal, shipping_total, discount_total, total, currency,
          notes, shipping_address, billing_address,
          created_at, updated_at,
          user_id,
          profiles:user_id ( full_name, email ),
          order_items ( id, product_name, product_description, size, color, unit_price, quantity, line_total, currency ),
          payments ( id, provider, method, provider_reference, amount, currency, status, created_at ),
          shipments ( id, carrier, tracking_number, status, shipped_at, delivered_at ),
          order_status_history ( id, status, note, created_at )
        `
        )
        .eq("id", id)
        .single();

      if (oErr) throw oErr;

      const profile = Array.isArray(o.profiles) ? o.profiles[0] : o.profiles;

      const detail: OrderDetail = {
        id: o.id,
        order_number: o.order_number,
        status: o.status,
        subtotal: o.subtotal,
        shipping_total: o.shipping_total,
        discount_total: o.discount_total,
        total: o.total,
        currency: o.currency,
        notes: o.notes,
        shipping_address: o.shipping_address,
        billing_address: o.billing_address,
        created_at: o.created_at,
        updated_at: o.updated_at,
        customer_name: profile?.full_name ?? null,
        customer_email: profile?.email ?? null,
        items: o.order_items ?? [],
        payments: o.payments ?? [],
        shipments: o.shipments ?? [],
        history: [...(o.order_status_history ?? [])].sort(
          (a: StatusHistoryEntry, b: StatusHistoryEntry) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
      };

      setOrder(detail);

      // Pre-fill shipment form if one exists
      const ship = (o.shipments ?? [])[0];
      if (ship) {
        setCarrier(ship.carrier ?? "");
        setTrackingNumber(ship.tracking_number ?? "");
        setShipmentStatus(ship.status ?? "pending");
      }
    } catch (e: any) {
      setError(e.message ?? "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Actions ──────────────────────────────────────────────────────────────

  async function handleStatusUpdate() {
    if (!newStatus || !id) return;
    setStatusBusy(true);
    setStatusMsg(null);
    try {
      const { error: fnErr } = await supabase.rpc(
        "admin_update_order_status",
        {
          p_order_id: id,
          p_new_status: newStatus,
          p_note: statusNote.trim() || null,
        }
      );
      if (fnErr) throw fnErr;
      setStatusMsg({ type: "ok", text: "Statut mis à jour." });
      setNewStatus("");
      setStatusNote("");
      await load();
    } catch (e: any) {
      setStatusMsg({ type: "err", text: e.message });
    } finally {
      setStatusBusy(false);
    }
  }

  async function handleCodPaid() {
    if (!codRef.trim() || !id) return;
    setCodBusy(true);
    setCodMsg(null);
    try {
      const { error: fnErr } = await supabase.rpc("admin_mark_cod_paid", {
        p_order_id: id,
        p_payment_reference: codRef.trim(),
      });
      if (fnErr) throw fnErr;
      setCodMsg({ type: "ok", text: "Paiement enregistré." });
      setCodRef("");
      await load();
    } catch (e: any) {
      setCodMsg({ type: "err", text: e.message });
    } finally {
      setCodBusy(false);
    }
  }

  async function handleSetShipment() {
    if (!id) return;
    setShipBusy(true);
    setShipMsg(null);
    try {
      const { error: fnErr } = await supabase.rpc("admin_set_shipment", {
        p_order_id: id,
        p_carrier: carrier.trim(),
        p_tracking_number: trackingNumber.trim(),
        p_status: shipmentStatus,
      });
      if (fnErr) throw fnErr;
      setShipMsg({ type: "ok", text: "Expédition enregistrée." });
      await load();
    } catch (e: any) {
      setShipMsg({ type: "err", text: e.message });
    } finally {
      setShipBusy(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.loading}>Chargement…</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className={styles.page}>
        <div className={styles.alertBox}>{error ?? "Commande introuvable."}</div>
      </div>
    );
  }

  const allowedNext = ALLOWED_TRANSITIONS[order.status] ?? [];
  const hasCodPending = order.payments.some(
    (p) => p.method === "cash_on_delivery" && p.status === "pending"
  );

  return (
    <div className={styles.page}>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb}>
        <Link to="/admin/commandes" className={styles.breadcrumbLink}>
          Commandes
        </Link>
        <span className={styles.breadcrumbSep}>/</span>
        <span className={styles.breadcrumbCurrent}>{order.order_number}</span>
      </nav>

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>{order.order_number}</h1>
          <div className={styles.titleMeta}>
            <span
              className={`${styles.statusBadge} ${STATUS_CSS[order.status] ?? ""}`}
            >
              {STATUS_LABELS[order.status] ?? order.status}
            </span>
            <span className={styles.dateText}>
              {formatDateTime(order.created_at)}
            </span>
          </div>
        </div>
      </header>

      {/* Main grid */}
      <div className={styles.grid}>
        {/* Client */}
        <div className={styles.card}>
          <p className={styles.cardTitle}>Client</p>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Nom</span>
            <span className={styles.infoValue}>
              {order.customer_name ?? "Invité"}
            </span>
          </div>
          {order.customer_email && (
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Email</span>
              <span className={styles.infoValue}>{order.customer_email}</span>
            </div>
          )}
          {order.notes && (
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Note client</span>
              <span className={styles.infoValue}>{order.notes}</span>
            </div>
          )}
        </div>

        {/* Addresses */}
        <div className={styles.card}>
          <p className={styles.cardTitle}>Adresses</p>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Livraison</span>
            <AddressBlock addr={order.shipping_address} />
          </div>
          {order.billing_address && (
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Facturation</span>
              <AddressBlock addr={order.billing_address} />
            </div>
          )}
        </div>

        {/* Paiements */}
        <div className={styles.card}>
          <p className={styles.cardTitle}>Paiements</p>
          {order.payments.length === 0 ? (
            <p style={{ color: "var(--color-neutral-500)", fontSize: "var(--text-sm)" }}>
              Aucun paiement enregistré.
            </p>
          ) : (
            order.payments.map((p) => (
              <div key={p.id}>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Méthode</span>
                  <span className={styles.infoValueMono}>{p.method ?? p.provider}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Statut</span>
                  <span className={styles.infoValueMono}>{p.status}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Montant</span>
                  <span className={styles.infoValueMono}>{formatXOF(p.amount)}</span>
                </div>
                {p.provider_reference && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Référence</span>
                    <span className={styles.infoValueMono}>{p.provider_reference}</span>
                  </div>
                )}
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Date</span>
                  <span className={styles.infoValue}>{formatDateTime(p.created_at)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Expédition */}
        <div className={styles.card}>
          <p className={styles.cardTitle}>Expédition</p>
          {order.shipments.length === 0 ? (
            <p style={{ color: "var(--color-neutral-500)", fontSize: "var(--text-sm)" }}>
              Aucune expédition enregistrée.
            </p>
          ) : (
            order.shipments.map((s) => (
              <div key={s.id}>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Transporteur</span>
                  <span className={styles.infoValue}>{s.carrier ?? "—"}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Numéro suivi</span>
                  <span className={styles.infoValueMono}>{s.tracking_number ?? "—"}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Statut</span>
                  <span className={styles.infoValueMono}>{s.status}</span>
                </div>
                {s.shipped_at && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Expédié le</span>
                    <span className={styles.infoValue}>{formatDateTime(s.shipped_at)}</span>
                  </div>
                )}
                {s.delivered_at && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Livré le</span>
                    <span className={styles.infoValue}>{formatDateTime(s.delivered_at)}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Articles */}
        <div className={`${styles.card} ${styles.gridFull}`}>
          <p className={styles.cardTitle}>Articles commandés</p>
          <table className={styles.itemsTable}>
            <thead>
              <tr>
                <th>Produit</th>
                <th>Taille / Couleur</th>
                <th>Prix unitaire</th>
                <th>Qté</th>
                <th>Total ligne</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className={styles.itemName}>{item.product_name}</div>
                    {item.product_description && (
                      <div className={styles.itemVariant}>{item.product_description}</div>
                    )}
                  </td>
                  <td>
                    <div className={styles.itemVariant}>
                      {[item.size, item.color].filter(Boolean).join(" / ") || "—"}
                    </div>
                  </td>
                  <td>
                    <span className={styles.itemPrice}>{formatXOF(item.unit_price)}</span>
                  </td>
                  <td>{item.quantity}</td>
                  <td>
                    <span className={styles.itemTotal}>{formatXOF(item.line_total)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totaux */}
          <div className={styles.totalsBlock}>
            <div className={styles.totalRow}>
              <span className={styles.totalLabel}>Sous-total</span>
              <span className={styles.totalValue}>{formatXOF(order.subtotal)}</span>
            </div>
            {order.shipping_total > 0 && (
              <div className={styles.totalRow}>
                <span className={styles.totalLabel}>Livraison</span>
                <span className={styles.totalValue}>{formatXOF(order.shipping_total)}</span>
              </div>
            )}
            {order.discount_total > 0 && (
              <div className={styles.totalRow}>
                <span className={styles.totalLabel}>Réduction</span>
                <span className={styles.totalValue}>- {formatXOF(order.discount_total)}</span>
              </div>
            )}
            <div className={styles.totalRow}>
              <span className={styles.totalLabel}>Total</span>
              <span className={`${styles.totalValue} ${styles.totalGrand}`}>
                {formatXOF(order.total)}
              </span>
            </div>
          </div>
        </div>

        {/* Actions admin */}
        <div className={`${styles.actionsCard} ${styles.gridFull}`}>
          <p className={styles.cardTitle} style={{ margin: 0, border: "none" }}>
            Actions administrateur
          </p>

          <hr className={styles.divider} />

          {/* Changer le statut */}
          <div className={styles.actionSection}>
            <p className={styles.actionSectionTitle}>Changer le statut</p>
            {allowedNext.length === 0 ? (
              <p style={{ color: "var(--color-neutral-500)", fontSize: "var(--text-sm)" }}>
                Aucune transition autorisée depuis « {STATUS_LABELS[order.status]} ».
              </p>
            ) : (
              <>
                <div className={styles.actionRow}>
                  <select
                    id="action-new-status"
                    className={styles.actionSelect}
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as OrderStatus | "")}
                  >
                    <option value="">Choisir un statut…</option>
                    {allowedNext.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </div>
                <textarea
                  id="action-status-note"
                  className={styles.actionTextarea}
                  placeholder="Note interne (facultatif)…"
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                />
                {statusMsg && (
                  <div
                    className={
                      statusMsg.type === "ok" ? styles.successBox : styles.alertBox
                    }
                  >
                    {statusMsg.text}
                  </div>
                )}
                <div className={styles.actionRow}>
                  <button
                    id="action-update-status"
                    className={styles.actionBtn}
                    disabled={!newStatus || statusBusy}
                    onClick={handleStatusUpdate}
                  >
                    {statusBusy ? "Mise à jour…" : "Mettre à jour le statut"}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* COD */}
          {hasCodPending && (
            <>
              <hr className={styles.divider} />
              <div className={styles.actionSection}>
                <p className={styles.actionSectionTitle}>
                  Paiement à la livraison (COD) — encaissement
                </p>
                <div className={styles.actionRow}>
                  <input
                    id="action-cod-ref"
                    type="text"
                    className={styles.actionInput}
                    placeholder="Référence du versement…"
                    value={codRef}
                    onChange={(e) => setCodRef(e.target.value)}
                  />
                  <button
                    id="action-cod-paid"
                    className={styles.actionBtn}
                    disabled={!codRef.trim() || codBusy}
                    onClick={handleCodPaid}
                  >
                    {codBusy ? "Enregistrement…" : "Encaisser"}
                  </button>
                </div>
                {codMsg && (
                  <div
                    className={
                      codMsg.type === "ok" ? styles.successBox : styles.alertBox
                    }
                  >
                    {codMsg.text}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Expédition */}
          <hr className={styles.divider} />
          <div className={styles.actionSection}>
            <p className={styles.actionSectionTitle}>Expédition</p>
            <div className={styles.actionRow}>
              <input
                id="action-carrier"
                type="text"
                className={styles.actionInput}
                placeholder="Transporteur (ex. DHL, La Poste…)"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
              />
              <input
                id="action-tracking"
                type="text"
                className={styles.actionInput}
                placeholder="Numéro de suivi"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
              />
            </div>
            <div className={styles.actionRow}>
              <select
                id="action-shipment-status"
                className={styles.actionSelect}
                value={shipmentStatus}
                onChange={(e) => setShipmentStatus(e.target.value as ShipmentStatus)}
              >
                {SHIPMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button
                id="action-set-shipment"
                className={styles.actionBtn}
                disabled={shipBusy}
                onClick={handleSetShipment}
              >
                {shipBusy ? "Enregistrement…" : "Enregistrer l'expédition"}
              </button>
            </div>
            {shipMsg && (
              <div
                className={
                  shipMsg.type === "ok" ? styles.successBox : styles.alertBox
                }
              >
                {shipMsg.text}
              </div>
            )}
          </div>
        </div>

        {/* Historique des statuts */}
        <div className={`${styles.card} ${styles.gridFull}`}>
          <p className={styles.cardTitle}>Historique des statuts</p>
          {order.history.length === 0 ? (
            <p style={{ color: "var(--color-neutral-500)", fontSize: "var(--text-sm)" }}>
              Aucun historique.
            </p>
          ) : (
            <div className={styles.historyList}>
              {order.history.map((h, idx) => (
                <div key={h.id} className={styles.historyItem}>
                  <div
                    className={`${styles.historyDot} ${idx > 0 ? styles.historyDotOld : ""}`}
                  />
                  <div className={styles.historyContent}>
                    <div className={styles.historyStatus}>
                      {STATUS_LABELS[h.status] ?? h.status}
                    </div>
                    <div className={styles.historyMeta}>
                      {formatDateTime(h.created_at)}
                    </div>
                    {h.note && (
                      <div className={styles.historyNote}>{h.note}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

