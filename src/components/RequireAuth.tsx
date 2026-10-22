import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import styles from "./RequireAuth.module.css";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <p className={styles.loadingText}>Chargement…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/connexion" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}
