import styles from "./AdminPlaceholderPage.module.css";

interface Props {
  title: string;
  description?: string;
}

export default function AdminPlaceholderPage({
  title,
  description = "Ce module d'administration sera disponible dans une prochaine phase.",
}: Props) {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{title}</h1>
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Module en préparation</h2>
        <p className={styles.cardText}>{description}</p>
      </div>
    </div>
  );
}
