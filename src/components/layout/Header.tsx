import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { useCategories } from "@/lib/hooks";
import { Drawer } from "@/components/ui";
import { Menu, Search, Heart, ShoppingBag, User, ChevronDown } from "lucide-react";
import { LanguageButton } from "@/components/i18n/LanguageButton";
import { CurrencyButton } from "@/components/currency/CurrencyButton";
import styles from "./Header.module.css";

interface HeaderProps {
  storeName: string;
}

export function Header({ storeName }: HeaderProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { totalItems, openCart } = useCart();
  const { data: categories } = useCategories();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Fermer le menu mobile et les panneaux lors d'un changement de route
  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
    setMoreOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleCloseMobile = () => setMobileOpen(false);
    window.addEventListener("close-mobile-menu", handleCloseMobile);
    return () => window.removeEventListener("close-mobile-menu", handleCloseMobile);
  }, []);

  // Compact header on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const mainCategories = (categories ?? []).slice(0, 5);
  const extraCategories = (categories ?? []).slice(5);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      navigate(`/boutique?q=${encodeURIComponent(searchValue.trim())}`);
      setSearchOpen(false);
      setSearchValue("");
    }
  };

  return (
    <>
      <header className={`${styles.header} ${scrolled ? styles.headerScrolled : ""}`}>
        <div className={styles.inner}>
          {/* Mobile menu button */}
          <button
            className={styles.menuBtn}
            onClick={() => setMobileOpen(true)}
            aria-label={t("header.menuAria", "Menu")}
          >
            <Menu size={20} strokeWidth={1.5} />
          </button>

          {/* Logo */}
          <Link to="/" className={styles.logo}>
            {storeName}
          </Link>

          {/* Desktop nav */}
          <nav className={styles.nav} aria-label={t("header.categories", "Catégories")}>
            {mainCategories.map((cat) => (
              <Link
                key={cat.id}
                to={`/categorie/${cat.slug}`}
                className={styles.navLink}
              >
                {cat.name}
              </Link>
            ))}

            {extraCategories.length > 0 && (
              <div className={styles.moreWrap}>
                <button
                  type="button"
                  className={styles.moreBtn}
                  onClick={() => setMoreOpen((o) => !o)}
                  aria-expanded={moreOpen}
                  aria-haspopup="true"
                >
                  <span>{t("header.more", "Plus")}</span>
                  <ChevronDown size={14} />
                </button>
                {moreOpen && (
                  <div className={styles.moreDropdown}>
                    {extraCategories.map((cat) => (
                      <Link
                        key={cat.id}
                        to={`/categorie/${cat.slug}`}
                        className={styles.moreLink}
                        onClick={() => setMoreOpen(false)}
                      >
                        {cat.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </nav>

          {/* Actions */}
          <div className={styles.actions}>
            <LanguageButton variant="header" />
            <CurrencyButton variant="header" />

            <button
              className={styles.iconBtn}
              onClick={() => setSearchOpen((s) => !s)}
              aria-label={t("header.searchAria", "Recherche")}
            >
              <Search size={18} strokeWidth={1.5} />
            </button>
            <Link
              to="/favoris"
              className={styles.iconBtn}
              aria-label={t("header.favoritesAria", "Favoris")}
            >
              <Heart size={18} strokeWidth={1.5} />
            </Link>
            <button
              type="button"
              onClick={openCart}
              className={styles.iconBtn}
              aria-label={t("header.cartAria", {
                count: totalItems,
                defaultValue: `Panier (${totalItems} article${totalItems > 1 ? "s" : ""})`,
              })}
            >
              <ShoppingBag size={18} strokeWidth={1.5} />
              {totalItems > 0 && <span className={styles.cartCount}>{totalItems}</span>}
            </button>
            <Link
              to={user ? "/compte" : "/connexion"}
              className={styles.iconBtn}
              aria-label={
                user
                  ? t("header.accountAria", "Mon compte")
                  : t("header.loginAria", "Connexion")
              }
            >
              <User size={18} strokeWidth={1.5} />
            </Link>
          </div>
        </div>

        {/* Search bar (collapsible) */}
        {searchOpen && (
          <div className={styles.searchBar}>
            <form onSubmit={handleSearch} className={styles.searchForm}>
              <input
                type="search"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder={t("header.searchPlaceholder", "Rechercher un produit…")}
                className={styles.searchInput}
                autoFocus
              />
              <button type="submit" className={styles.searchSubmit}>
                {t("header.searchSubmit", "Rechercher")}
              </button>
            </form>
          </div>
        )}
      </header>

      {/* Mobile drawer */}
      <Drawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        title={t("common.menu", "Menu")}
        side="left"
      >
        <nav className={styles.mobileNav}>
          {(categories ?? []).map((cat) => (
            <Link
              key={cat.id}
              to={`/categorie/${cat.slug}`}
              className={styles.mobileLink}
              onClick={() => setMobileOpen(false)}
            >
              {cat.name}
            </Link>
          ))}
          <Link
            to={user ? "/compte" : "/connexion"}
            className={styles.mobileLink}
            onClick={() => setMobileOpen(false)}
          >
            {user
              ? t("header.accountAria", "Mon compte")
              : t("header.loginAria", "Connexion")}
          </Link>
          <div style={{ marginTop: "var(--space-4)" }}>
            <LanguageButton variant="header" />
          </div>
        </nav>
      </Drawer>
    </>
  );
}
