import { useState, useEffect } from "react";
import { NavLink, Outlet, useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Layers,
  ShoppingBag,
  Truck,
  Percent,
  MessageSquare,
  Settings,
  Menu,
  X,
  ExternalLink,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useAdminInactivityTimeout } from "@/lib/use-inactivity-timeout";
import styles from "./AdminLayout.module.css";

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Tableau de bord", path: "/admin", icon: LayoutDashboard, exact: true },
  { label: "Produits", path: "/admin/produits", icon: Package },
  { label: "Catégories", path: "/admin/categories", icon: FolderTree },
  { label: "Collections", path: "/admin/collections", icon: Layers },
  { label: "Commandes", path: "/admin/commandes", icon: ShoppingBag },
  { label: "Livraison", path: "/admin/livraison", icon: Truck },
  { label: "Promotions", path: "/admin/promotions", icon: Percent },
  { label: "Messages", path: "/admin/messages", icon: MessageSquare },
  { label: "Réglages", path: "/admin/reglages", icon: Settings },
];

export function AdminLayout() {
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Inactivity timeout for administrative sessions
  useAdminInactivityTimeout(true);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const renderNavLinks = () => (
    <nav className={styles.nav} aria-label="Navigation administration">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.exact}
            className={({ isActive }) =>
              [styles.navLink, isActive ? styles.navLinkActive : ""]
                .filter(Boolean)
                .join(" ")
            }
          >
            <Icon size={18} className={styles.navIcon} />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );

  const renderBottomSection = () => (
    <div className={styles.bottomSection}>
      <Link
        to="/"
        target="_blank"
        rel="noopener noreferrer"
        className={styles.shopLink}
        title="Ouvrir la boutique dans un nouvel onglet"
      >
        <span>Boutique publique</span>
        <ExternalLink size={14} />
      </Link>

      <div className={styles.userBox}>
        <span className={styles.userLabel}>Propriétaire</span>
        <span className={styles.userEmail} title={user?.email ?? ""}>
          {user?.email}
        </span>
      </div>

      <button
        type="button"
        onClick={() => signOut()}
        className={styles.logoutBtn}
      >
        <LogOut size={14} />
        <span>Se déconnecter</span>
      </button>
    </div>
  );

  return (
    <div className={styles.layout}>
      {/* Desktop Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.brandTitle}>JACOB DE JESUS</div>
          <div className={styles.brandSubtitle}>Administration</div>
        </div>
        {renderNavLinks()}
        {renderBottomSection()}
      </aside>

      {/* Mobile Header */}
      <div className={styles.mainWrapper}>
        <header className={styles.mobileHeader}>
          <div className={styles.mobileHeaderLeft}>
            <button
              type="button"
              className={styles.menuToggle}
              onClick={() => setMobileOpen(true)}
              aria-label="Ouvrir le menu de navigation"
            >
              <Menu size={20} />
            </button>
            <span className={styles.mobileBrand}>JACOB ADMIN</span>
          </div>

          <button
            type="button"
            onClick={() => signOut()}
            className={styles.logoutBtn}
            style={{ width: "auto" }}
            title="Se déconnecter"
          >
            <LogOut size={16} />
          </button>
        </header>

        {/* Mobile Drawer */}
        {mobileOpen && (
          <>
            <div
              className={styles.drawerOverlay}
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            <div
              className={styles.drawerPanel}
              role="dialog"
              aria-modal="true"
              aria-label="Menu d'administration"
            >
              <div className={styles.drawerHeader}>
                <div>
                  <div className={styles.brandTitle}>JACOB DE JESUS</div>
                  <div className={styles.brandSubtitle}>Administration</div>
                </div>
                <button
                  type="button"
                  className={styles.drawerCloseBtn}
                  onClick={() => setMobileOpen(false)}
                  aria-label="Fermer le menu"
                >
                  <X size={20} />
                </button>
              </div>
              {renderNavLinks()}
              {renderBottomSection()}
            </div>
          </>
        )}

        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
