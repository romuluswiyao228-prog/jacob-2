import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isLoading, user, isAdmin, aalLevel } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-900">
        <p className="text-neutral-400">Chargement…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/connexion" state={{ from: location.pathname }} replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/admin/connexion" replace />;
  }

  if (aalLevel !== "aal2") {
    return <Navigate to="/admin/mfa-setup" replace />;
  }

  return <>{children}</>;
}
