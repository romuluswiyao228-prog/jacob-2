import { Link } from "react-router-dom";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Breadcrumb } from "@/components/ui";
import { SEO } from "@/components/SEO";
import styles from "./NetworkErrorPage.module.css";

export default function NetworkErrorPage() {
  const handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <div className={styles.page}>
      <SEO
        title="Erreur réseau"
        description="Une erreur de connexion est survenue. Veuillez vérifier votre connexion internet."
      />
      <div className={styles.inner}>
        <Breadcrumb
          items={[
            { label: "Accueil", href: "/" },
            { label: "Erreur réseau" },
          ]}
          style={{ marginBottom: "var(--space-6)", justifyContent: "center" }}
        />
        <div className={styles.indicator} aria-hidden="true">
          <AlertTriangle size={32} />
        </div>
        <h1 className={styles.title}>Erreur de connexion</h1>
        <p className={styles.text}>
          Impossible d'établir la communication avec le serveur. Vérifiez votre connexion
          internet et réessayez.
        </p>
        <div className={styles.actions}>
          <button type="button" onClick={handleReload} className={styles.btnPrimary}>
            <RefreshCw size={14} aria-hidden="true" />
            Réessayer
          </button>
          <Link to="/" className={styles.btnSecondary}>
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
