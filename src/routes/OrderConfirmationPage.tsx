import { useState, useMemo } from "react";
import { useLocation, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  Copy,
  Check,
  Truck,
  ShoppingBag,
  Printer,
  Key,
  MessageCircle,
} from "lucide-react";
import { Button, EmptyState, Breadcrumb } from "@/components/ui";
import { SEO } from "@/components/SEO";
import { useStoreSettings } from "@/lib/hooks";
import { useCurrency } from "@/lib/currency-context";
import { whatsappLink, orderWhatsAppMessage } from "@/lib/whatsapp";
import type { CartLineItem } from "@/lib/cart-context";
import styles from "./OrderConfirmationPage.module.css";

function formatXOF(amount: number): string {
  return amount.toLocaleString("fr-FR") + "\u00a0XOF";
}

interface OrderConfirmationState {
  orderId: string;
  orderNumber: string;
  subtotal: number;
  shippingTotal: number;
  discountTotal: number;
  total: number;
  currency: string;
  guestToken?: string | null;
  customer: {
    full_name: string;
    phone: string;
  };
  shippingAddress: {
    city: string;
    country: string;
    landmark?: string | null;
    maps_link?: string | null;
    lat?: number | null;
    lng?: number | null;
  };
  items: CartLineItem[];
}

export default function OrderConfirmationPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const state = location.state as OrderConfirmationState | null;

  const [copiedNumber, setCopiedNumber] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const { data: settings } = useStoreSettings();
  const { currency, formatPrice } = useCurrency();

  const mapsUrl = useMemo(() => {
    if (!state) return null;
    const addr = state.shippingAddress;
    if (addr.maps_link) return addr.maps_link;
    if (addr.lat != null && addr.lng != null) {
      return `https://www.google.com/maps?q=${addr.lat},${addr.lng}`;
    }
    return null;
  }, [state]);

  const whatsappUrl = useMemo(() => {
    if (!state) return null;
    let msg = orderWhatsAppMessage({
      orderNumber: state.orderNumber,
      total: formatXOF(state.total),
      customerName: state.customer.full_name,
      city: state.shippingAddress.city,
    });
    if (mapsUrl) {
      msg += `\nPosition : ${mapsUrl}`;
    }
    return whatsappLink(settings?.whatsapp_number, msg);
  }, [settings?.whatsapp_number, state, mapsUrl]);

  // Aucune fausse confirmation si les données de commande réelle sont absentes
  if (!state || !state.orderNumber) {
    return (
      <main className={styles.page}>
        <SEO
          title={t("confirmation.pageTitle")}
          description="Consultez le récapitulatif de votre commande JACOB DE JESUS."
        />
        <div className={styles.container}>
          <Breadcrumb
            items={[
              { label: t("common.home"), href: "/" },
              { label: t("common.shop"), href: "/boutique" },
              { label: t("confirmation.pageTitle") },
            ]}
            style={{ marginBottom: "var(--space-4)" }}
          />
          <EmptyState
            icon={<ShoppingBag size={56} strokeWidth={1} />}
            title={t("confirmation.noOrderTitle")}
            description={t("confirmation.noOrderDesc")}
            action={
              <Link to="/boutique" style={{ textDecoration: "none" }}>
                <Button variant="primary" size="md">
                  {t("cart.goToShop")}
                </Button>
              </Link>
            }
          />
        </div>
      </main>
    );
  }

  const handleCopyOrderNumber = () => {
    navigator.clipboard.writeText(state.orderNumber);
    setCopiedNumber(true);
    setTimeout(() => setCopiedNumber(false), 2000);
  };

  const handleCopyGuestToken = () => {
    if (!state.guestToken) return;
    navigator.clipboard.writeText(state.guestToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <main className={styles.page}>
      <SEO
        title={`Commande ${state.orderNumber} confirmée`}
        description="Votre commande a bien été enregistrée sur JACOB DE JESUS."
      />
      <div className={styles.container}>
        <Breadcrumb
          items={[
            { label: t("common.home"), href: "/" },
            { label: t("common.shop"), href: "/boutique" },
            { label: t("confirmation.pageTitle") },
          ]}
          style={{ marginBottom: "var(--space-4)" }}
        />
        {/* Entête confirmation */}
        <header className={styles.header}>
          <div className={styles.successIconWrapper}>
            <CheckCircle2 size={36} strokeWidth={2.5} />
          </div>
          <h1 className={styles.title}>{t("confirmation.headerTitle")}</h1>
          <p className={styles.subtitle}>
            {t("confirmation.headerSubtitle")}
          </p>
        </header>

        {/* Numéro de commande réel avec bouton de copie */}
        <div className={styles.orderNumberCard}>
          <div>
            <div className={styles.orderNumberLabel}>{t("confirmation.officialNumber")}</div>
            <div className={styles.orderNumberValue}>{state.orderNumber}</div>
          </div>
          <button
            type="button"
            onClick={handleCopyOrderNumber}
            className={[styles.copyBtn, copiedNumber ? styles.copied : ""].join(" ")}
          >
            {copiedNumber ? <Check size={14} /> : <Copy size={14} />}
            <span>{copiedNumber ? t("confirmation.copied") : t("confirmation.copyNumber")}</span>
          </button>
        </div>

        {/* Jeton invité (uniquement si invité) */}
        {state.guestToken && (
          <div className={styles.guestTokenBox}>
            <div className={styles.guestTokenHeader}>
              <Key size={18} color="var(--color-accent, #e10600)" />
              <h2 className={styles.guestTokenTitle}>
                {t("confirmation.guestTokenTitle")}
              </h2>
            </div>
            <p className={styles.guestTokenDesc}>
              {t("confirmation.guestTokenDesc")}
            </p>
            <div className={styles.guestTokenField}>
              <code className={styles.tokenCode}>{state.guestToken}</code>
              <button
                type="button"
                onClick={handleCopyGuestToken}
                className={[styles.copyBtn, copiedToken ? styles.copied : ""].join(" ")}
              >
                {copiedToken ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedToken ? t("confirmation.copied") : t("confirmation.copyToken")}</span>
              </button>
            </div>
          </div>
        )}

        {/* Envoi WhatsApp (affiché uniquement si un numéro WhatsApp valide est configuré) */}
        {whatsappUrl && (
          <div className={styles.whatsappCard}>
            <div className={styles.whatsappCardContent}>
              <div className={styles.whatsappCardHeader}>
                <MessageCircle size={20} className={styles.whatsappIcon} />
                <span className={styles.whatsappCardTitle}>
                  {t("confirmation.whatsappTitle")}
                </span>
              </div>
              <p className={styles.whatsappCardText}>
                {t("confirmation.whatsappDesc")}
              </p>
            </div>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.whatsappBtn}
            >
              <MessageCircle size={18} />
              <span>{t("confirmation.whatsappBtn")}</span>
            </a>
          </div>
        )}

        {/* Coordonnées & Adresse */}
        <div className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>{t("confirmation.shippingDetails")}</h2>
          <div className={styles.detailsGrid}>
            <div>
              <div className={styles.detailBlockLabel}>{t("confirmation.recipient")}</div>
              <div className={styles.detailBlockContent}>
                <strong>{state.customer.full_name}</strong>
                <div>{state.customer.phone}</div>
              </div>
            </div>

            <div>
              <div className={styles.detailBlockLabel}>{t("confirmation.shippingAddress")}</div>
              <div className={styles.detailBlockContent}>
                <div>{state.shippingAddress.city}, {state.shippingAddress.country}</div>
                {state.shippingAddress.landmark && (
                  <div>Point de repère : {state.shippingAddress.landmark}</div>
                )}
                {mapsUrl && (
                  <div>
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "inherit", fontWeight: 700 }}
                    >
                      {t("confirmation.viewOnMaps", "Voir sur Google Maps")}
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className={styles.detailBlockLabel}>{t("confirmation.shippingMethod")}</div>
              <div className={styles.detailBlockContent}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Truck size={16} />
                  <span>{t("confirmation.homeDelivery")}</span>
                </div>
              </div>
            </div>

            <div>
              <div className={styles.detailBlockLabel}>{t("confirmation.paymentMethod")}</div>
              <div className={styles.detailBlockContent}>
                <strong>{t("confirmation.cashDelivery")}</strong>
                <div style={{ color: "var(--color-neutral-600)", fontSize: "0.8rem" }}>
                  {t("confirmation.cashDeliveryNote")}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Articles commandés & Montants */}
        <div className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>{t("confirmation.orderedItems")}</h2>
          <ul className={styles.itemsList}>
            {state.items.map((item) => (
              <li key={item.id} className={styles.itemRow}>
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.product_name}
                    className={styles.itemThumb}
                  />
                ) : (
                  <div className={styles.itemThumb} />
                )}
                <div className={styles.itemInfo}>
                  <div className={styles.itemName}>{item.product_name}</div>
                  <div className={styles.itemMeta}>
                    {item.size && <span>{t("cart.sizeLabel")} {item.size} </span>}
                    {item.color && <span>· {t("cart.colorLabel")} {item.color} </span>}
                    <span>· {t("cart.qty")} : {item.quantity}</span>
                  </div>
                </div>
                <div className={styles.itemTotal}>
                  {formatXOF(item.unit_price * item.quantity)}
                </div>
              </li>
            ))}
          </ul>

          <div className={styles.totalsList}>
            <div className={styles.totalsRow}>
              <span>{t("confirmation.subtotal")}</span>
              <span className={styles.totalsVal}>{formatXOF(state.subtotal)}</span>
            </div>
            <div className={styles.totalsRow}>
              <span>{t("confirmation.shippingFee")}</span>
              <span className={styles.totalsVal}>
                {state.shippingTotal === 0 ? t("confirmation.free") : formatXOF(state.shippingTotal)}
              </span>
            </div>
            {state.discountTotal > 0 && (
              <div className={styles.totalsRow}>
                <span>{t("confirmation.discount")}</span>
                <span className={styles.discountVal}>-{formatXOF(state.discountTotal)}</span>
              </div>
            )}
            <div className={styles.grandTotalRow}>
              <span className={styles.grandTotalLabel}>{t("confirmation.totalDue")}</span>
              <div style={{ textAlign: "end" }}>
                <span className={styles.grandTotalVal}>{formatXOF(state.total)}</span>
                {currency !== "XOF" && (
                  <div style={{ fontSize: "var(--text-sm)", color: "var(--color-neutral-600)", marginTop: "2px" }}>
                    {formatPrice(state.total)}
                  </div>
                )}
              </div>
            </div>
            {currency !== "XOF" && (
              <p style={{ fontSize: "var(--text-xs)", color: "var(--color-neutral-500)", marginTop: "var(--space-2)", fontStyle: "italic", textAlign: "end" }}>
                Vous serez facturé en XOF ; la conversion est indicative.
              </p>
            )}
          </div>
        </div>

        {/* Prochaines étapes */}
        <div className={styles.stepsBox}>
          <div className={styles.stepsTitle}>{t("confirmation.nextSteps")}</div>
          <ol className={styles.stepsList}>
            <li>{t("confirmation.step1")}</li>
            <li>{t("confirmation.step2", { phone: state.customer.phone })}</li>
            <li>{t("confirmation.step3", { total: formatXOF(state.total) })}</li>
          </ol>
        </div>

        {/* Actions */}
        <div className={styles.actionsRow}>
          <Link to="/boutique" style={{ textDecoration: "none" }}>
            <Button variant="primary" size="lg">
              {t("confirmation.continueShopping")}
            </Button>
          </Link>
          <Button variant="outline" size="lg" onClick={handlePrint}>
            <Printer size={16} style={{ marginRight: 6 }} />
            {t("confirmation.print")}
          </Button>
        </div>
      </div>
    </main>
  );
}
