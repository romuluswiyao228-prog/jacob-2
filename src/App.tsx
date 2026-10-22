import { lazy, Suspense, type ComponentType } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth-context";
import { CartProvider } from "@/lib/cart-context";
import { RequireAuth } from "@/components/RequireAuth";
import { RequireAdmin } from "@/components/RequireAdmin";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Layout } from "@/components/layout/Layout";
import { ToastProvider } from "@/components/ui/Toast";
import styles from "./App.module.css";

const LoginPage = lazy(() => import("@/routes/LoginPage"));
const SignUpPage = lazy(() => import("@/routes/SignUpPage"));
const ForgotPasswordPage = lazy(() => import("@/routes/ForgotPasswordPage"));
const ProfilePage = lazy(() => import("@/routes/ProfilePage"));

const AdminLoginPage = lazy(() => import("@/routes/admin/AdminLoginPage"));
const MfaSetupPage = lazy(() => import("@/routes/admin/MfaSetupPage"));
const AdminDashboardPage = lazy(() => import("@/routes/admin/AdminDashboardPage"));
const AdminProductsPage = lazy(() => import("@/routes/admin/AdminProductsPage"));
const AdminProductEditPage = lazy(() => import("@/routes/admin/AdminProductEditPage"));
const AdminCategoriesPage = lazy(() => import("@/routes/admin/AdminCategoriesPage"));
const AdminCollectionsPage = lazy(() => import("@/routes/admin/AdminCollectionsPage"));
const AdminOrdersPage = lazy(() => import("@/routes/admin/AdminOrdersPage"));
const AdminOrderDetailPage = lazy(() => import("@/routes/admin/AdminOrderDetailPage"));
const AdminShippingPage = lazy(() => import("@/routes/admin/AdminShippingPage"));
const AdminPromotionsPage = lazy(() => import("@/routes/admin/AdminPromotionsPage"));
const AdminMessagesPage = lazy(() => import("@/routes/admin/AdminMessagesPage"));
const AdminSettingsPage = lazy(() => import("@/routes/admin/AdminSettingsPage"));

const HomePage = lazy(() => import("@/routes/HomePage"));
const ShopPage = lazy(() => import("@/routes/ShopPage"));
const ProductDetailPage = lazy(() => import("@/routes/ProductDetailPage"));
const FavoritesPage = lazy(() => import("@/routes/FavoritesPage"));
const CartPage = lazy(() => import("@/routes/CartPage"));
const CheckoutPage = lazy(() => import("@/routes/CheckoutPage"));
const OrderConfirmationPage = lazy(() => import("@/routes/OrderConfirmationPage"));
const NotFoundPage = lazy(() => import("@/routes/NotFoundPage"));
const NetworkErrorPage = lazy(() => import("@/routes/NetworkErrorPage"));

function PageFallback() {
  return (
    <div className={styles.fallback}>
      <p className={styles.fallbackText}>Chargement…</p>
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
      <CartProvider>
        <ToastProvider>
          <BrowserRouter>
            <ErrorBoundary>
              <Layout>
                <Suspense fallback={<PageFallback />}>
                  <Routes>
                    {/* Home */}
                    <Route path="/" element={<HomePage />} />

                    {/* Catalogue & Produit */}
                    <Route path="/boutique" element={<ShopPage />} />
                    <Route path="/categorie/:slug" element={<ShopPage />} />
                    <Route path="/collection/:slug" element={<ShopPage />} />
                    <Route path="/produit/:slug" element={<ProductDetailPage />} />
                    <Route path="/favoris" element={<FavoritesPage />} />

                    {/* Panier & Commande */}
                    <Route path="/panier" element={<CartPage />} />
                    <Route path="/commande" element={<CheckoutPage />} />
                    <Route path="/commande/confirmation" element={<OrderConfirmationPage />} />

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

                    {/* Admin public/auth routes */}
                    <Route path="/admin/connexion" element={<AdminLoginPage />} />
                    <Route path="/admin/mfa-setup" element={<MfaSetupPage />} />

                    {/* Admin protected routes in AdminLayout */}
                    <Route
                      path="/admin"
                      element={
                        <RequireAdmin>
                          <AdminLayout />
                        </RequireAdmin>
                      }
                    >
                      <Route index element={<AdminDashboardPage />} />
                      <Route path="produits" element={<AdminProductsPage />} />
                      <Route path="produits/nouveau" element={<AdminProductEditPage />} />
                      <Route path="produits/:id" element={<AdminProductEditPage />} />
                      <Route path="categories" element={<AdminCategoriesPage />} />
                      <Route path="collections" element={<AdminCollectionsPage />} />
                      <Route path="commandes" element={<AdminOrdersPage />} />
                      <Route path="commandes/:id" element={<AdminOrderDetailPage />} />
                      <Route path="livraison" element={<AdminShippingPage />} />
                      <Route path="promotions" element={<AdminPromotionsPage />} />
                      <Route path="messages" element={<AdminMessagesPage />} />
                      <Route path="reglages" element={<AdminSettingsPage />} />
                    </Route>

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
      </CartProvider>
    </AuthProvider>
  );
}
