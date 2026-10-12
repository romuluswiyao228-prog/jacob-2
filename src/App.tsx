import { lazy, Suspense, type ComponentType } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth-context";
import { RequireAuth } from "@/components/RequireAuth";
import { RequireAdmin } from "@/components/RequireAdmin";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Layout } from "@/components/layout/Layout";
import { ToastProvider } from "@/components/ui/Toast";

const LoginPage = lazy(() => import("@/routes/LoginPage"));
const SignUpPage = lazy(() => import("@/routes/SignUpPage"));
const ForgotPasswordPage = lazy(() => import("@/routes/ForgotPasswordPage"));
const ProfilePage = lazy(() => import("@/routes/ProfilePage"));

const AdminLoginPage = lazy(() => import("@/routes/admin/AdminLoginPage"));
const MfaSetupPage = lazy(() => import("@/routes/admin/MfaSetupPage"));
const AdminDashboardPage = lazy(() => import("@/routes/admin/AdminDashboardPage"));

const HomePage = lazy(() => import("@/routes/HomePage"));
const NotFoundPage = lazy(() => import("@/routes/NotFoundPage"));
const NetworkErrorPage = lazy(() => import("@/routes/NetworkErrorPage"));

function PageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50">
      <p className="text-neutral-500">Chargement…</p>
    </div>
  );
}

function DevOnlyRoute({
  component: Component,
}: {
  component: ComponentType;
}) {
  if (!import.meta.env.DEV) return null;
  return <Component />;
}

let DesignSystemPage: ComponentType | null = null;
if (import.meta.env.DEV) {
  DesignSystemPage = lazy(() => import("@/routes/DesignSystemPage"));
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <Layout>
              <Suspense fallback={<PageFallback />}>
                <Routes>
                  {/* Home */}
                  <Route path="/" element={<HomePage />} />

                  {/* Auth routes */}
                  <Route path="/connexion" element={<LoginPage />} />
                  <Route path="/inscription" element={<SignUpPage />} />
                  <Route path="/mot-de-passe-oublie" element={<ForgotPasswordPage />} />

                  {/* Protected client route */}
                  <Route
                    path="/compte"
                    element={
                      <RequireAuth>
                        <ProfilePage />
                      </RequireAuth>
                    }
                  />

                  {/* Admin routes */}
                  <Route path="/admin/connexion" element={<AdminLoginPage />} />
                  <Route path="/admin/mfa-setup" element={<MfaSetupPage />} />
                  <Route
                    path="/admin"
                    element={
                      <RequireAdmin>
                        <AdminDashboardPage />
                      </RequireAdmin>
                    }
                  />

                  {/* Errors */}
                  <Route path="/erreur-reseau" element={<NetworkErrorPage />} />

                  {/* Design system — dev only, tree-shaken in production */}
                  {DesignSystemPage && (
                    <Route
                      path="/design-system"
                      element={<DevOnlyRoute component={DesignSystemPage} />}
                    />
                  )}

                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            </Layout>
          </ErrorBoundary>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
