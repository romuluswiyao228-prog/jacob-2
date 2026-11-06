import styles from "./Stripe.module.css";

interface StripeProps {
  className?: string;
}

/**
 * Bande « chantier » signature : 12 px de rayures jaune/noir.
 * Utilisée uniquement entre l'accueil et le pied de page,
 * et sous le titre de la page boutique.
 */
export function Stripe({ className }: StripeProps) {
  return (
    <div
      className={[styles.stripe, className].filter(Boolean).join(" ")}
      aria-hidden="true"
    />
  );
}

