import { type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { User, MapPin, Package, Heart, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Breadcrumb } from "@/components/ui";
import { SEO } from "@/components/SEO";
import styles from "./AccountLayout.module.css";

interface AccountLayoutProps {
  title: string;
  subtitle?: string;
  breadcrumbItems?: { label: string; href?: string }[];
  children: ReactNode;
}

export function AccountLayout({
  title,
  subtitle,
  breadcrumbItems,
  children,
}: AccountLayoutProps) {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/connexion", { replace: true });
  };

  const navItems = [
    { label: t("account.navProfile", "Profil"), href: "/compte", icon: User, exact: true },
    { label: t("account.navAddresses", "Adresses"), href: "/compte/adresses", icon: MapPin },
    { label: t("account.navOrders", "Commandes"), href: "/compte/commandes", icon: Package },
    { label: t("account.navFavorites", "Favoris"), href: "/favoris", icon: Heart },
  ];

  const defaultBreadcrumbs = [
    { label: t("common.home", "Accueil"), href: "/" },
    { label: t("account.title", "Mon compte"), href: "/compte" },
    ...(title !== "Mon profil" && title !== t("account.profileTitle", "Mon profil") ? [{ label: title }] : []),
  ];

  return (
    <div className={styles.container}>
      <SEO
        title={title}
        description={subtitle || "Espace client sécurisé JACOB DE JESUS."}
      />
      <Breadcrumb
        items={breadcrumbItems || defaultBreadcrumbs}
        className={styles.breadcrumb}
      />

      <header className={styles.header}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.subtitle}>
            {subtitle || (user ? `Connecté avec ${user.email}` : "")}
          </p>
        </div>
      </header>

      <div className={styles.layoutWrapper}>
        <aside className={styles.sidebar}>
          {/* Menu de compte : Profil, Adresses, Commandes, Favoris + bouton Déconnexion */}
          <nav className={styles.nav} aria-label="Menu du compte">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? location.pathname === item.href
                : location.pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={[
                    styles.navLink,
                    isActive ? styles.navLinkActive : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            <button
              type="button"
              onClick={handleLogout}
              className={styles.logoutBtn}
              title={t("account.logout", "Déconnexion")}
            >
              <LogOut size={16} />
              <span>{t("account.logout", "Déconnexion")}</span>
            </button>
          </nav>
        </aside>

        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
