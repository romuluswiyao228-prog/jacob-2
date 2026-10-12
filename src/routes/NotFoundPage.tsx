import { Link } from "react-router-dom";
import { Button } from "@/components/ui";
import styles from "./NotFoundPage.module.css";

export default function NotFoundPage() {
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <p className={styles.code}>404</p>
        <h1 className={styles.title}>Page introuvable</h1>
        <p className={styles.text}>
          La page que vous cherchez n'existe pas ou a été déplacée.
        </p>
        <Link to="/">
          <Button variant="primary">Retour à l'accueil</Button>
        </Link>
      </div>
    </div>
  );
}
