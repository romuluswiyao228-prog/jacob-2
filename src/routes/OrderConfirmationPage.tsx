import { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import {
  CheckCircle2,
  Copy,
  Check,
  Truck,
  ShoppingBag,
  Printer,
  Key,
} from "lucide-react";
import { Button, EmptyState } from "@/components/ui";
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
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    notes?: string | null;
  };
  shippingAddress: {
    line1: string;
    city: string;
    country: string;
    notes?: string | null;
  };
  items: CartLineItem[];
}

export default function OrderConfirmationPage() {
  const location = useLocation();
  const state = location.state as OrderConfirmationState | null;

  const [copiedNumber, setCopiedNumber] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // Aucune fausse confirmation si les données de commande réelle sont absentes
  if (!state || !state.orderNumber) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <EmptyState
            icon={<ShoppingBag size={56} strokeWidth={1} />}
            title="Aucune commande récente trouvée"
            description="Vous n'avez pas de commande en cours de confirmation. Si vous avez passé une commande, vérifiez votre boîte de réception ou connectez-vous à votre compte."
            action={
              <Link to="/boutique" style={{ textDecoration: "none" }}>
                <Button variant="primary" size="md">
                  Découvrir la boutique
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
      <div className={styles.container}>
        {/* Entête confirmation */}
        <header className={styles.header}>
          <div className={styles.successIconWrapper}>
            <CheckCircle2 size={36} strokeWidth={2.5} />
          </div>
          <h1 className={styles.title}>Merci pour votre commande !</h1>
          <p className={styles.subtitle}>
            Votre commande a été enregistrée avec succès sous le numéro ci-dessous.
            Un e-mail de confirmation récapitulatif a été transmis à{" "}
            <strong>{state.customer.email}</strong>.
          </p>
        </header>

        {/* Numéro de commande réel avec bouton de copie */}
        <div className={styles.orderNumberCard}>
          <div>
            <div className={styles.orderNumberLabel}>Numéro de commande officiel</div>
            <div className={styles.orderNumberValue}>{state.orderNumber}</div>
          </div>
          <button
            type="button"
            onClick={handleCopyOrderNumber}
            className={[styles.copyBtn, copiedNumber ? styles.copied : ""].join(" ")}
          >
            {copiedNumber ? <Check size={14} /> : <Copy size={14} />}
            <span>{copiedNumber ? "Copié !" : "Copier le numéro"}</span>
          </button>
        </div>

        {/* Jeton invité (uniquement si invité) */}
        {state.guestToken && (
          <div className={styles.guestTokenBox}>
            <div className={styles.guestTokenHeader}>
              <Key size={18} color="var(--color-accent, #e10600)" />
              <h2 className={styles.guestTokenTitle}>
                Votre jeton secret de suivi invité
              </h2>
            </div>
            <p className={styles.guestTokenDesc}>
              Vous avez commandé en mode invité (sans créer de compte). <strong>Conservez précieusement ce jeton</strong>.
              Il ne vous sera plus jamais affiché en clair et vous sera indispensable pour suivre ou consulter cette commande ultérieurement.
            </p>
            <div className={styles.guestTokenField}>
              <code className={styles.tokenCode}>{state.guestToken}</code>
              <button
                type="button"
                onClick={handleCopyGuestToken}
                className={[styles.copyBtn, copiedToken ? styles.copied : ""].join(" ")}
              >
                {copiedToken ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedToken ? "Copié !" : "Copier le jeton"}</span>
              </button>
            </div>
          </div>
        )}

        {/* Coordonnées & Adresse */}
        <div className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>Détails de la livraison</h2>
          <div className={styles.detailsGrid}>
            <div>
              <div className={styles.detailBlockLabel}>Destinataire</div>
              <div className={styles.detailBlockContent}>
                <strong>{state.customer.first_name} {state.customer.last_name}</strong>
                <div>{state.customer.phone}</div>
                <div>{state.customer.email}</div>
              </div>
            </div>

            <div>
              <div className={styles.detailBlockLabel}>Adresse de livraison</div>
              <div className={styles.detailBlockContent}>
                <div>{state.shippingAddress.line1}</div>
                <div>{state.shippingAddress.city}, {state.shippingAddress.country}</div>
                {state.customer.notes && (
                  <div style={{ marginTop: "4px", fontStyle: "italic", color: "var(--color-neutral-600)" }}>
                    Indications : {state.customer.notes}
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className={styles.detailBlockLabel}>Mode d&apos;expédition</div>
              <div className={styles.detailBlockContent}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Truck size={16} />
                  <span>Livraison à domicile</span>
                </div>
              </div>
            </div>

            <div>
              <div className={styles.detailBlockLabel}>Mode de règlement</div>
              <div className={styles.detailBlockContent}>
                <strong>Paiement en espèces à la livraison</strong>
                <div style={{ color: "var(--color-neutral-600)", fontSize: "0.8rem" }}>
                  À régler au transporteur au moment de la réception
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Articles commandés & Montants */}
        <div className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>Articles commandés</h2>
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
                    {item.size && <span>Taille : {item.size} </span>}
                    {item.color && <span>· Couleur : {item.color} </span>}
                    <span>· Quantité : {item.quantity}</span>
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
              <span>Sous-total articles</span>
              <span className={styles.totalsVal}>{formatXOF(state.subtotal)}</span>
            </div>
            <div className={styles.totalsRow}>
              <span>Frais de livraison</span>
              <span className={styles.totalsVal}>
                {state.shippingTotal === 0 ? "Gratuit" : formatXOF(state.shippingTotal)}
              </span>
            </div>
            {state.discountTotal > 0 && (
              <div className={styles.totalsRow}>
                <span>Remise appliquée</span>
                <span className={styles.discountVal}>-{formatXOF(state.discountTotal)}</span>
              </div>
            )}
            <div className={styles.grandTotalRow}>
              <span className={styles.grandTotalLabel}>Montant total dû</span>
              <span className={styles.grandTotalVal}>{formatXOF(state.total)}</span>
            </div>
          </div>
        </div>

        {/* Prochaines étapes */}
        <div className={styles.stepsBox}>
          <div className={styles.stepsTitle}>Prochaines étapes :</div>
          <ol className={styles.stepsList}>
            <li>Votre commande est transmise à notre atelier pour préparation.</li>
            <li>Le livreur vous contactera par téléphone au <strong>{state.customer.phone}</strong> avant son passage.</li>
            <li>Préparez le montant exact de <strong>{formatXOF(state.total)}</strong> en espèces à la livraison.</li>
          </ol>
        </div>

        {/* Actions */}
        <div className={styles.actionsRow}>
          <Link to="/boutique" style={{ textDecoration: "none" }}>
            <Button variant="primary" size="lg">
              Continuer mes achats
            </Button>
          </Link>
          <Button variant="outline" size="lg" onClick={handlePrint}>
            <Printer size={16} style={{ marginRight: 6 }} />
            Imprimer le récapitulatif
          </Button>
        </div>
      </div>
    </main>
  );
}
