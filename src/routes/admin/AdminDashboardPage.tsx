import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Package,
  FolderTree,
  Layers,
  Plus,
  ShoppingBag,
  ArrowRight,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { formatXOF } from "@/lib/admin-utils";
import styles from "./AdminDashboardPage.module.css";

interface LowStockItem {
  variant_id: string;
  product_id: string;
  product_name: string;
  sku: string;
  size: string;
  color: string;
  stock: number;
}

interface RecentOrder {
  id: string;
  order_number: string;
  status: string;
  total: number;
  currency: string;
  created_at: string;
  customer_name: string;
}

interface TopProduct {
  product_name: string;
  total_qty: number;
  total_revenue: number;
}

interface DashboardStats {
  productsTotal: number;
  productsActive: number;
  productsArchived: number;
  categoriesTotal: number;
  collectionsTotal: number;
  totalStock: number;
  // Order stats
  ordersCount: number;
  ordersPending: number;
  ordersPaid: number;
  ordersAmountTotal: number;
  paymentsConfirmedTotal: number;
  cancelledRefundedCount: number;
  cancelledRefundedTotal: number;
  shippingFeesTotal: number;
  newCustomers: number;
  lowStockProducts: LowStockItem[];
  recentOrders: RecentOrder[];
  topProducts: TopProduct[];
}

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  processing: "En cours",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
  refunded: "Remboursée",
  on_hold: "En pause",
};

const STATUS_CSS: Record<string, string> = {
  pending: styles.statusPending,
  confirmed: styles.statusConfirmed,
  processing: styles.statusProcessing,
  shipped: styles.statusShipped,
  delivered: styles.statusDelivered,
  cancelled: styles.statusCancelled,
  refunded: styles.statusRefunded,
  on_hold: styles.statusOnHold,
};

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    productsTotal: 0,
    productsActive: 0,
    productsArchived: 0,
    categoriesTotal: 0,
    collectionsTotal: 0,
    totalStock: 0,
    ordersCount: 0,
    ordersPending: 0,
    ordersPaid: 0,
    ordersAmountTotal: 0,
    paymentsConfirmedTotal: 0,
    cancelledRefundedCount: 0,
    cancelledRefundedTotal: 0,
    shippingFeesTotal: 0,
    newCustomers: 0,
    lowStockProducts: [],
    recentOrders: [],
    topProducts: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [
          { data: prods },
          { data: cats },
          { data: cols },
          { data: vars },
          { data: orderStats },
        ] = await Promise.all([
          supabase.from("products").select("id, is_archived"),
          supabase.from("categories").select("id, is_active"),
          supabase.from("collections").select("id, is_active"),
          supabase.from("product_variants").select("stock"),
          supabase.rpc("admin_dashboard_stats"),
        ]);

        const allProds = prods ?? [];
        const activeProds = allProds.filter((p) => !p.is_archived).length;
        const archivedProds = allProds.length - activeProds;
        const totalStock = (vars ?? []).reduce(
          (acc, v) => acc + (Number(v.stock) || 0),
          0
        );

        const os = orderStats as {
          orders_count?: number;
          pending_count?: number;
          paid_count?: number;
          orders_amount_total?: number;
          payments_confirmed_total?: number;
          cancelled_refunded_count?: number;
          cancelled_refunded_total?: number;
          shipping_fees_total?: number;
          sales_total?: number;
          new_customers?: number;
          low_stock_products?: LowStockItem[];
          recent_orders?: RecentOrder[];
          top_products?: TopProduct[];
        } | null;

        setStats({
          productsTotal: allProds.length,
          productsActive: activeProds,
          productsArchived: archivedProds,
          categoriesTotal: (cats ?? []).length,
          collectionsTotal: (cols ?? []).length,
          totalStock,
          ordersCount: Number(os?.orders_count) || 0,
          ordersPending: Number(os?.pending_count) || 0,
          ordersPaid: Number(os?.paid_count) || 0,
          ordersAmountTotal: Number(os?.orders_amount_total) || 0,
          paymentsConfirmedTotal:
            Number(os?.payments_confirmed_total) ||
            Number(os?.sales_total) ||
            0,
          cancelledRefundedCount: Number(os?.cancelled_refunded_count) || 0,
          cancelledRefundedTotal: Number(os?.cancelled_refunded_total) || 0,
          shippingFeesTotal: Number(os?.shipping_fees_total) || 0,
          newCustomers: Number(os?.new_customers) || 0,
          lowStockProducts: Array.isArray(os?.low_stock_products)
            ? os!.low_stock_products
            : [],
          recentOrders: Array.isArray(os?.recent_orders)
            ? os!.recent_orders
            : [],
          topProducts: Array.isArray(os?.top_products)
            ? os!.top_products
            : [],
        });
      } catch (e) {
        console.error("Erreur de chargement des statistiques", e);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Tableau de bord</h1>
          <p className={styles.subtitle}>
            Espace propriétaire — {user?.email}
          </p>
        </div>
        <div className={styles.periodBadge}>
          <Calendar size={14} />
          <span>Période : 30 derniers jours</span>
        </div>
      </header>

      {/* Note comptable sur le CA vs Bénéfice */}
      <div className={styles.noticeBanner}>
        <strong>Note de gestion financière :</strong> Les montants présentés reflètent le <em>chiffre d'affaires brut encaissé</em> (paiements confirmés). Ils ne doivent en aucun cas être interprétés comme un bénéfice net (achats, logistique et taxes non déduits).
      </div>

      {/* Stats Cards Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Commandes (30 j.)</span>
          <span className={styles.statValue}>
            {loading ? "…" : stats.ordersCount}
          </span>
          <span className={styles.statMeta}>
            {stats.ordersPending} en cours • {stats.ordersPaid} payées
          </span>
        </div>

        <div className={styles.statCard}>
          <span className={styles.statLabel}>Chiffre d'affaires encaissé</span>
          <span className={styles.statValue}>
            {loading ? "…" : formatXOF(stats.paymentsConfirmedTotal)}
          </span>
          <span className={styles.statMeta}>
            Paiements confirmés sur la période
          </span>
        </div>

        <div className={styles.statCard}>
          <span className={styles.statLabel}>Montant brut commandé</span>
          <span className={styles.statValue}>
            {loading ? "…" : formatXOF(stats.ordersAmountTotal)}
          </span>
          <span className={styles.statMeta}>
            Total brut de toutes les commandes
          </span>
        </div>

        <div className={styles.statCard}>
          <span className={styles.statLabel}>Frais d'expédition perçus</span>
          <span className={styles.statValue}>
            {loading ? "…" : formatXOF(stats.shippingFeesTotal)}
          </span>
          <span className={styles.statMeta}>
            Frais de livraison facturés
          </span>
        </div>

        <div className={styles.statCard}>
          <span className={styles.statLabel}>Annulations / Remboursements</span>
          <span className={styles.statValue}>
            {loading ? "…" : stats.cancelledRefundedCount}
          </span>
          <span className={styles.statMeta}>
            {formatXOF(stats.cancelledRefundedTotal)} annulé ou remboursé
          </span>
        </div>

        <div className={styles.statCard}>
          <span className={styles.statLabel}>Catalogue & Stock</span>
          <span className={styles.statValue}>
            {loading ? "…" : stats.productsTotal}
          </span>
          <span className={styles.statMeta}>
            {stats.productsActive} actifs • {stats.totalStock} unités en stock
          </span>
        </div>
      </div>

      {/* Two columns grid: Dernières commandes & Produits les plus vendus */}
      <div className={styles.gridTwoCols}>
        {/* Dernières commandes */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>Dernières commandes</span>
            <Link to="/admin/commandes" className={styles.panelLink}>
              <span>Voir tout</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className={styles.tableContainer}>
            {loading ? (
              <p className={styles.emptyMessage}>Chargement des commandes…</p>
            ) : stats.recentOrders.length === 0 ? (
              <p className={styles.emptyMessage}>Aucune commande enregistrée.</p>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>N° Commande</th>
                    <th>Client</th>
                    <th>Date</th>
                    <th>Montant</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentOrders.map((ord) => (
                    <tr key={ord.id}>
                      <td>
                        <Link
                          to={`/admin/commandes/${ord.id}`}
                          className={styles.orderLink}
                        >
                          {ord.order_number}
                        </Link>
                      </td>
                      <td>{ord.customer_name}</td>
                      <td className={styles.monoText}>
                        {new Date(ord.created_at).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </td>
                      <td className={styles.monoText}>
                        {formatXOF(ord.total)}
                      </td>
                      <td>
                        <span
                          className={`${styles.statusBadge} ${
                            STATUS_CSS[ord.status] || ""
                          }`}
                        >
                          {STATUS_LABELS[ord.status] || ord.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Produits les plus vendus */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>Produits les plus vendus</span>
            <span className={styles.statMeta}>Sur la période</span>
          </div>

          <div className={styles.tableContainer}>
            {loading ? (
              <p className={styles.emptyMessage}>Chargement des ventes…</p>
            ) : stats.topProducts.length === 0 ? (
              <p className={styles.emptyMessage}>Aucune vente enregistrée sur la période.</p>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Produit</th>
                    <th>Qté vendue</th>
                    <th>Chiffre d'affaires</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topProducts.map((p, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{p.product_name}</td>
                      <td className={styles.monoText}>{p.total_qty} ex.</td>
                      <td className={styles.monoText}>
                        {formatXOF(p.total_revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Alerte stock faible */}
      <div className={styles.stockAlertPanel}>
        <div className={styles.stockAlertHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={18} color="var(--color-brand)" />
            <span className={styles.panelTitle}>
              Alertes stock faible (≤ 5 unités)
            </span>
          </div>
          <Link to="/admin/produits" className={styles.panelLink}>
            <span>Gérer le stock</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className={styles.tableContainer}>
          {loading ? (
            <p className={styles.emptyMessage}>Vérification des stocks…</p>
          ) : stats.lowStockProducts.length === 0 ? (
            <p className={styles.emptyMessage} style={{ color: "var(--color-success)" }}>
              ✓ Tous les articles en catalogue disposent d'un stock suffisant (&gt; 5 unités).
            </p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Déclinaison</th>
                  <th>SKU</th>
                  <th>Stock restant</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {stats.lowStockProducts.map((item) => (
                  <tr key={item.variant_id}>
                    <td style={{ fontWeight: 600 }}>{item.product_name}</td>
                    <td>
                      {item.size || "—"} {item.color ? `• ${item.color}` : ""}
                    </td>
                    <td className={styles.monoText}>{item.sku}</td>
                    <td>
                      {item.stock <= 0 ? (
                        <span className={styles.stockBadgeOut}>Rupture (0)</span>
                      ) : (
                        <span className={styles.stockBadgeLow}>
                          {item.stock} restante{item.stock > 1 ? "s" : ""}
                        </span>
                      )}
                    </td>
                    <td>
                      <Link
                        to={`/admin/produits/${item.product_id}`}
                        className={styles.editLink}
                      >
                        Réapprovisionner
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className={styles.quickActionsGrid}>
        <Link to="/admin/produits/nouveau" className={styles.actionCard}>
          <div className={styles.actionCardTitle}>
            <span>Nouveau produit</span>
            <Plus size={20} color="var(--color-brand)" />
          </div>
          <p className={styles.actionCardDesc}>
            Ajoutez un nouvel article avec ses déclinaisons de tailles/couleurs et ses photos optimisées.
          </p>
        </Link>

        <Link to="/admin/produits" className={styles.actionCard}>
          <div className={styles.actionCardTitle}>
            <span>Gérer les produits</span>
            <Package size={20} color="var(--color-brand)" />
          </div>
          <p className={styles.actionCardDesc}>
            Consultez le catalogue, ajustez les prix, stocks et activez l'archivage sans suppression.
          </p>
        </Link>

        <Link to="/admin/commandes" className={styles.actionCard}>
          <div className={styles.actionCardTitle}>
            <span>Commandes</span>
            <ShoppingBag size={20} color="var(--color-brand)" />
          </div>
          <p className={styles.actionCardDesc}>
            Consultez et gérez les commandes, expéditions et paiements à la livraison.
          </p>
        </Link>

        <Link to="/admin/categories" className={styles.actionCard}>
          <div className={styles.actionCardTitle}>
            <span>Catégories</span>
            <FolderTree size={20} color="var(--color-brand)" />
          </div>
          <p className={styles.actionCardDesc}>
            Créez et ordonnez les catégories de vêtements, chaussures, bijoux et lunettes.
          </p>
        </Link>

        <Link to="/admin/collections" className={styles.actionCard}>
          <div className={styles.actionCardTitle}>
            <span>Collections</span>
            <Layers size={20} color="var(--color-brand)" />
          </div>
          <p className={styles.actionCardDesc}>
            Gérez les drops événementiels, bannières et périodes de validité.
          </p>
        </Link>
      </div>

      <div className={styles.infoCard}>
        <span className={styles.infoCardTitle}>
          Sécurité & Droits d'accès
        </span>
        <p className={styles.infoCardText}>
          Toutes les modifications sont protégées par les politiques RLS de PostgreSQL avec vérification du rôle propriétaire et de la double authentification MFA (niveau <code>aal2</code>). Aucune clé d'administration n'est exposée côté client.
        </p>
      </div>
    </div>
  );
}
