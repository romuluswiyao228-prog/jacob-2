import type { ReactNode } from "react";
import styles from "./ErrorState.module.css";

export interface ErrorStateProps {
  title?: string;
  message: string;
  action?: ReactNode;
}

export function ErrorState({
  title = "ERREUR",
  message,
  action,
}: ErrorStateProps) {
  return (
    <div className={styles.container} role="alert">
      <div className={styles.indicator}>!</div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.message}>{message}</p>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
