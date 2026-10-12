import { Link } from "react-router-dom";
import { Button } from "@/components/ui";
import styles from "./NetworkErrorPage.module.css";

export default function NetworkErrorPage() {
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.indicator}>!</div>
        <h1 className={styles.title}>Erreur de connexion</h1>
        <p className={styles.text}>
          Impossible de se connecter au serveur. Vérifiez votre connexion
          internet et réessayez.
        </p>
        <Link to="/">
          <Button variant="primary">Réessayer</Button>
        </Link>
      </div>
    </div>
  );
}
