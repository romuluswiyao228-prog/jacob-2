import { useState, useEffect, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  AuthForm,
  AuthField,
  AuthAlert,
  AuthSubmit,
} from "@/components/auth";
import { Breadcrumb } from "@/components/ui";
import { SEO } from "@/components/SEO";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_STYLES,
  formatXOF,
  formatDate,
  type OrderStatus,
} from "./OrdersHistoryPage";
import styles from "./GuestOrderTrackingPage.module.css";

interface GuestOrderItem {
  id: string;
  product_name: string;
  size?: string | null;
  color?: string | null;
  sku?: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
  currency: string;
}

interface GuestOrderResult {
  id: string;
  order_number: string;
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
  created_at: string;
  items: GuestOrderItem[];
  payment?: {
    provider: string;
    method: string;
    status: string;
    amount: number;
    currency: string;
  } | null;
}

export default function GuestOrderTrackingPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const queryOrder =
    searchParams.get("numero") ||
    searchParams.get("commande") ||
    searchParams.get("order") ||
    "";
  const queryToken = searchParams.get("token") || "";

  const [orderNumber, setOrderNumber] = useState(queryOrder);
  const [guestToken, setGuestToken] = useState(queryToken);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<GuestOrderResult | null>(null);

  const fetchGuestOrder = useCallback(
    async (numberToSearch: string, tokenToSearch: string) => {
      const num = numberToSearch.trim();
      const tok = tokenToSearch.trim();
      if (!num || !tok) {
        setError("Veuillez renseigner le numéro de commande et le jeton de suivi.");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const { data, error: rpcErr } = await supabase.rpc("get_guest_order", {
          p_order_number: num,
          p_guest_token: tok,
        });

        if (rpcErr || !data) {
          // Message générique en cas d'échec
          setError(
            "Commande introuvable ou jeton invalide. Veuillez vérifier les informations saisies."
          );
          setOrderData(null);
          return;
        }

        setOrderData(data as GuestOrderResult);
      } catch {
        setError(
          "Commande introuvable ou jeton invalide. Veuillez vérifier les informations saisies."
        );
        setOrderData(null);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Auto-search if both params provided in URL
  useEffect(() => {
    if (queryOrder && queryToken) {
      fetchGuestOrder(queryOrder, queryToken);
    }
  }, [queryOrder, queryToken, fetchGuestOrder]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSearchParams({
      numero: orderNumber.trim(),
      token: guestToken.trim(),
    });
    fetchGuestOrder(orderNumber, guestToken);
  };

  const handleReset = () => {
    setOrderNumber("");
    setGuestToken("");
    setOrderData(null);
    setError(null);
    setSearchParams({});
  };

  return (
    <div className={styles.page}>
      <SEO
        title="Suivi de commande invité"
        description="Suivez l'état de préparation et de livraison de votre commande invité JACOB DE JESUS."
      />
      <Breadcrumb
        items={[
          { label: "Accueil", href: "/" },
          { label: "Suivi de commande" },
        ]}
        className={styles.breadcrumb}
      />

      <header className={styles.header}>
        <h1 className={styles.title}>Suivi de commande invité</h1>
        <p className={styles.subtitle}>
          Consultez l'état d'avancement et les détails de votre commande grâce à votre
          numéro de commande et votre jeton secret remis lors de votre achat.
        </p>
      </header>

      {/* Formulaire de recherche */}
      {!orderData ? (
        <div className={styles.searchContainer}>
          <AuthForm onSubmit={handleSubmit} noValidate>
            {error && <AuthAlert tone="error">{error}</AuthAlert>}

            <AuthField
              label="Numéro de commande"
              placeholder="ex. JDJ-2026-000123"
              type="text"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              required
            />

            <AuthField
              label="Jeton de suivi invité"
              placeholder="Saisissez ou collez votre jeton secret"
              type="text"
              value={guestToken}
              onChange={(e) => setGuestToken(e.target.value)}
              hint="Le jeton unique affiché lors de la confirmation de votre commande."
              required
            />

            <AuthSubmit loading={isLoading} loadingLabel="Recherche en cours…">
              Suivre ma commande
            </AuthSubmit>
          </AuthForm>
        </div>
      ) : (
        /* Résultat de la commande */
        <div className={styles.resultContainer}>
          <div className={styles.resultHeader}>
            <div className={styles.resultHeaderLeft}>
              <h2 className={styles.orderNumber}>{orderData.order_number}</h2>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "2px 8px",
                  fontSize: "11px",
                  fontWeight: "bold",
                  fontFamily: "var(--font-mono)",
                  textTransform: "uppercase",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid currentColor",
                }}
                className={ORDER_STATUS_STYLES[orderData.status] || ""}
              >
                {ORDER_STATUS_LABELS[orderData.status] || orderData.status}
              </span>
              <span className={styles.orderDate}>
                Commandé le {formatDate(orderData.created_at)}
              </span>
            </div>

            <div className={styles.resultActions}>
              <Link
                to={`/contact?commande=${encodeURIComponent(orderData.order_number)}`}
                className={styles.contactBtn}
              >
                <MessageCircle size={14} />
                <span>Contacter la boutique au sujet de cette commande</span>
              </Link>
              <button
                type="button"
                className={styles.resetBtn}
                onClick={handleReset}
              >
                Autre recherche
              </button>
            </div>
          </div>

          <div className={styles.layout}>
            {/* Articles */}
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
              <section className={styles.card}>
                <h3 className={styles.cardTitle}>Articles de votre commande</h3>
                <div className={styles.itemsList}>
                  {orderData.items.map((it) => (
                    <div key={it.id} className={styles.itemRow}>
                      <div className={styles.itemDetails}>
                        <h4 className={styles.itemName}>{it.product_name}</h4>
                        <div className={styles.itemMeta}>
                          {it.size && <span>Taille : {it.size}</span>}
                          {it.size && it.color && <span> · </span>}
                          {it.color && <span>Couleur : {it.color}</span>}
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
                    <span>{formatXOF(orderData.subtotal)}</span>
                  </div>
                  <div className={styles.totalRow}>
                    <span>Frais de livraison</span>
                    <span>
                      {orderData.shipping_total > 0
                        ? formatXOF(orderData.shipping_total)
                        : "Gratuit"}
                    </span>
                  </div>
                  {orderData.discount_total > 0 && (
                    <div
                      className={styles.totalRow}
                      style={{ color: "var(--color-accent)" }}
                    >
                      <span>Réduction</span>
                      <span>-{formatXOF(orderData.discount_total)}</span>
                    </div>
                  )}
                  <div className={styles.grandTotalRow}>
                    <span>Total à régler</span>
                    <span>{formatXOF(orderData.total)}</span>
                  </div>
                </div>
              </section>
            </div>

            {/* Informations de livraison & paiement */}
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
              <section className={styles.card}>
                <h3 className={styles.cardTitle}>Adresse de livraison</h3>
                {orderData.shipping_address ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <p className={styles.infoText} style={{ fontWeight: "bold" }}>
                      {orderData.shipping_address.first_name}{" "}
                      {orderData.shipping_address.last_name}
                    </p>
                    <p className={styles.infoText}>{orderData.shipping_address.line1}</p>
                    {orderData.shipping_address.line2 && (
                      <p className={styles.infoText}>
                        {orderData.shipping_address.line2}
                      </p>
                    )}
                    <p className={styles.infoText}>
                      {[
                        orderData.shipping_address.postal_code,
                        orderData.shipping_address.city,
                        orderData.shipping_address.region,
                        orderData.shipping_address.country,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                    {orderData.shipping_address.phone && (
                      <p className={styles.infoMono}>
                        Tél : {orderData.shipping_address.phone}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className={styles.infoText}>Aucune adresse renseignée.</p>
                )}
              </section>

              <section className={styles.card}>
                <h3 className={styles.cardTitle}>Règlement</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span className={styles.infoText}>Mode</span>
                    <span className={styles.infoMono} style={{ fontWeight: "bold" }}>
                      Paiement à la livraison
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span className={styles.infoText}>Statut</span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "11px",
                        padding: "2px 6px",
                        border: "1px solid var(--color-border)",
                        borderRadius: "var(--radius-sm)",
                      }}
                    >
                      {orderData.payment?.status === "paid" ? "Payé" : "À la livraison"}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span className={styles.infoText}>Montant total</span>
                    <span className={styles.infoMono} style={{ fontWeight: "bold" }}>
                      {formatXOF(orderData.total)}
                    </span>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
