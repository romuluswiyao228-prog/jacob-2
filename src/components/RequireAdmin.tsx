import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { fetchAdminRequiresMfa } from "@/lib/admin-mfa";
import styles from "./RequireAdmin.module.css";

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isLoading, user, isAdmin, aalLevel } = useAuth();
  const location = useLocation();
  // null = pas encore connu. La base decide si la MFA est exigee.
  const [requiresMfa, setRequiresMfa] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user || !isAdmin) return;
    let cancelled = false;
    fetchAdminRequiresMfa().then((value) => {
      if (!cancelled) setRequiresMfa(value);
    });
    return () => {
      cancelled = true;
    };
  }, [user, isAdmin]);

  if (isLoading || (user && isAdmin && requiresMfa === null)) {
    return (
      <div className={styles.loading}>
        <p className={styles.loadingText}>Chargement…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/connexion" state={{ from: location.pathname }} replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/admin/connexion" replace />;
  }

  if (requiresMfa && aalLevel !== "aal2") {
    return <Navigate to="/admin/mfa-setup" replace />;
  }

  return <>{children}</>;
}
