import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Search, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { supabase } from "@/lib/supabase";
import styles from "./AdminOrdersPage.module.css";

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

interface OrderRow {
  id: string;
  order_number: string;
  status: OrderStatus;
  total: number;
  currency: string;
  created_at: string;
  customer_name: string | null;
  customer_email: string | null;
  payment_status: PaymentStatus | null;
  payment_method: string | null;
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

const PAYMENT_CSS: Record<PaymentStatus, string> = {
  pending: styles.paymentPending,
  paid: styles.paymentPaid,
  failed: styles.paymentFailed,
  cancelled: styles.paymentPending,
  refunded: styles.paymentPending,
};

function formatXOF(amount: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const PAGE_SIZE = 20;

// ── Component ──────────────────────────────────────────────────────────────

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Build query for orders joined with profiles and payments
      // We query orders and join manually since Supabase doesn't do lateral easily
      let query = supabase
        .from("orders")
        .select(
          `
          id,
          order_number,
          status,
          total,
          currency,
          created_at,
          user_id,
          profiles:user_id ( full_name, email ),
          payments ( status, method )
        `,
          { count: "exact" }
        )
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (statusFilter) query = query.eq("status", statusFilter);

      if (dateFrom) query = query.gte("created_at", dateFrom);
      if (dateTo)
        query = query.lte(
          "created_at",
          new Date(dateTo + "T23:59:59").toISOString()
        );

      // Search by order_number (ilike) — we handle customer search after
      if (search.trim()) {
        const s = search.trim();
        // Try to match order_number; customer name search is done client-side
        query = query.ilike("order_number", `%${s}%`);
      }

      const { data, count, error: qErr } = await query;
      if (qErr) throw qErr;

      // Map data
      const rows: OrderRow[] = (data ?? []).map((o: any) => {
        const profile = Array.isArray(o.profiles) ? o.profiles[0] : o.profiles;
        const payment = Array.isArray(o.payments) ? o.payments[0] : o.payments;
        return {
          id: o.id,
          order_number: o.order_number,
          status: o.status,
          total: o.total,
          currency: o.currency,
          created_at: o.created_at,
          customer_name: profile?.full_name ?? null,
          customer_email: profile?.email ?? null,
          payment_status: payment?.status ?? null,
          payment_method: payment?.method ?? null,
        };
      });

      // Client-side payment filter (since payments is a separate table)
      const filtered = paymentFilter
        ? rows.filter((r) => r.payment_status === paymentFilter)
        : rows;

      setOrders(filtered);
      setTotal(count ?? 0);
    } catch (e: any) {
      setError(e.message ?? "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, paymentFilter, dateFrom, dateTo, page]);

  useEffect(() => {
    setPage(0);
  }, [search, statusFilter, paymentFilter, dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Commandes</h1>
          <p className={styles.subtitle}>
            {loading ? "Chargement…" : `${total} commande${total !== 1 ? "s" : ""} au total`}
          </p>
        </div>
      </header>

      {error && <div className={styles.alertBox}>{error}</div>}

      {/* Filters */}
      <div className={styles.filtersBar}>
        <div className={styles.filtersLeft}>
          <div className={styles.searchWrap}>
            <Search size={16} className={styles.searchIcon} />
            <input
              id="orders-search"
              type="search"
              className={styles.searchInput}
              placeholder="Numéro de commande…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            id="orders-status-filter"
            className={styles.select}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as OrderStatus | "")}
          >
            <option value="">Tous les statuts</option>
            {(Object.keys(STATUS_LABELS) as OrderStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>

          <select
            id="orders-payment-filter"
            className={styles.select}
            value={paymentFilter}
            onChange={(e) =>
              setPaymentFilter(e.target.value as PaymentStatus | "")
            }
          >
            <option value="">Tout paiement</option>
            <option value="pending">En attente</option>
            <option value="paid">Payé</option>
            <option value="failed">Échoué</option>
          </select>
        </div>

        <div className={styles.dateRange}>
          <input
            id="orders-date-from"
            type="date"
            className={styles.dateInput}
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <span className={styles.dateSep}>→</span>
          <input
            id="orders-date-to"
            type="date"
            className={styles.dateInput}
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Numéro</th>
              <th>Client</th>
              <th>Date</th>
              <th>Statut</th>
              <th>Paiement</th>
              <th>Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className={styles.emptyState}>
                  Chargement…
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={7} className={styles.emptyState}>
                  Aucune commande trouvée.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <Link
                      to={`/admin/commandes/${order.id}`}
                      className={styles.orderNumberLink}
                    >
                      {order.order_number}
                    </Link>
                  </td>
                  <td>
                    <div className={styles.customerName}>
                      {order.customer_name ?? "Invité"}
                    </div>
                    {order.customer_email && (
                      <div className={styles.customerEmail}>
                        {order.customer_email}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={styles.dateText}>
                      {formatDate(order.created_at)}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`${styles.statusBadge} ${STATUS_CSS[order.status] ?? ""}`}
                    >
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                  </td>
                  <td>
                    {order.payment_status ? (
                      <span
                        className={`${styles.paymentBadge} ${PAYMENT_CSS[order.payment_status] ?? styles.paymentPending}`}
                      >
                        {order.payment_status}
                      </span>
                    ) : (
                      <span className={styles.paymentBadge}>—</span>
                    )}
                  </td>
                  <td>
                    <span className={styles.totalText}>
                      {formatXOF(order.total)}
                    </span>
                  </td>
                  <td>
                    <Link
                      to={`/admin/commandes/${order.id}`}
                      className={styles.viewBtn}
                    >
                      <Eye size={13} />
                      Voir
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            id="orders-prev-page"
            className={styles.pageBtn}
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft size={15} />
            Préc.
          </button>
          <span className={styles.pageInfo}>
            Page {page + 1} / {totalPages}
          </span>
          <button
            id="orders-next-page"
            className={styles.pageBtn}
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Suiv.
            <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

