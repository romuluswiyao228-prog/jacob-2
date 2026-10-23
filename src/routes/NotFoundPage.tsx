import { Link } from "react-router-dom";
import { Breadcrumb } from "@/components/ui";
import { SEO } from "@/components/SEO";
import styles from "./NotFoundPage.module.css";

export default function NotFoundPage() {
  return (
    <div className={styles.page}>
      <SEO
        title="Page introuvable (404)"
        description="La page demandée est introuvable sur le site JACOB DE JESUS."
      />
      <div className={styles.inner}>
        <Breadcrumb
          items={[
            { label: "Accueil", href: "/" },
            { label: "Page 404" },
          ]}
          style={{ marginBottom: "var(--space-6)", justifyContent: "center" }}
        />
        <p className={styles.code}>404</p>
        <h1 className={styles.title}>Page introuvable</h1>
        <p className={styles.text}>
          La page que vous cherchez n'existe pas ou a été déplacée.
        </p>
        <div className={styles.actions}>
          <Link to="/" className={styles.btnPrimary}>
            Retour à l'accueil
          </Link>
          <Link to="/boutique" className={styles.btnSecondary}>
            Découvrir la collection
          </Link>
        </div>
      </div>
    </div>
  );
}
