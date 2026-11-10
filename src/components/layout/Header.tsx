import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { useCategories, useCollections } from "@/lib/hooks";
import { supabase } from "@/lib/supabase";
import { Drawer } from "@/components/ui";
import { Menu, Search, Heart, ShoppingBag, User, ChevronDown } from "lucide-react";
import { LanguageButton } from "@/components/i18n/LanguageButton";
import { CurrencyButton } from "@/components/currency/CurrencyButton";
import styles from "./Header.module.css";

interface HeaderProps {
  storeName: string;
}

export function calculateVisibleCategoriesCount(
  width: number,
  totalCategories: number,
  hasCollections: boolean
): number {
  if (totalCategories <= 0) return 0;

  const colBonus = hasCollections ? 0 : 1;

  let maxVisible: number;
  if (width >= 1550) {
    maxVisible = 9;
  } else if (width >= 1400) {
    maxVisible = 7 + colBonus;
  } else if (width >= 1250) {
    maxVisible = 5 + colBonus;
  } else if (width >= 1100) {
    maxVisible = 4 + colBonus;
  } else if (width >= 950) {
    maxVisible = 3 + colBonus;
  } else {
    maxVisible = 2;
  }

  return Math.min(maxVisible, totalCategories);
}

export function Header({ storeName }: HeaderProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { totalItems, openCart } = useCart();
  const { data: categories } = useCategories();
  const { data: collections } = useCollections(20);

  const prevTotalItemsRef = useRef(totalItems);
  const [cartPulse, setCartPulse] = useState(false);

  useEffect(() => {
    if (totalItems > prevTotalItemsRef.current) {
      setCartPulse(true);
      const timer = setTimeout(() => setCartPulse(false), 300);
      return () => clearTimeout(timer);
    }
    prevTotalItemsRef.current = totalItems;
  }, [totalItems]);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [collectionsOpen, setCollectionsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [windowWidth, setWindowWidth] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 1200
  );

  const collectionsRef = useRef<HTMLDivElement>(null);
  const collectionsBtnRef = useRef<HTMLButtonElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Fermer les menus lors d'un changement de route
  useEffect(() => {
    setMobileOpen(false);
    setMobileSearchOpen(false);
    setCollectionsOpen(false);
    setMoreOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleCloseMobile = () => setMobileOpen(false);
    window.addEventListener("close-mobile-menu", handleCloseMobile);
    return () => window.removeEventListener("close-mobile-menu", handleCloseMobile);
  }, []);

  // Recalcul sur redimensionnement de la fenêtre
  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // État compact après 40 px de défilement (64 px -> 52 px)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Clavier : Échap pour fermer les menus collections ou plus
  useEffect(() => {
    if (!collectionsOpen && !moreOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (collectionsOpen) {
          setCollectionsOpen(false);
          collectionsBtnRef.current?.focus();
        }
        if (moreOpen) {
          setMoreOpen(false);
          moreBtnRef.current?.focus();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [collectionsOpen, moreOpen]);

  // Clic extérieur pour fermer les menus collections ou plus
  useEffect(() => {
    if (!collectionsOpen && !moreOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (
        collectionsOpen &&
        collectionsRef.current &&
        !collectionsRef.current.contains(e.target as Node)
      ) {
        setCollectionsOpen(false);
      }
      if (
        moreOpen &&
        moreRef.current &&
        !moreRef.current.contains(e.target as Node)
      ) {
        setMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [collectionsOpen, moreOpen]);

  // Compteur favoris : utilisateur connecté uniquement
  useEffect(() => {
    if (!user) {
      setFavoriteCount(0);
      return;
    }
    let isMounted = true;
    async function loadFavoritesCount() {
      try {
        const { data, error } = await supabase
          .from("favorites")
          .select("product_id")
          .eq("user_id", user!.id);
        if (!error && data && isMounted) {
          setFavoriteCount(data.length);
        }
      } catch {
        // En cas d'erreur réseau, ne pas bloquer
      }
    }
    loadFavoritesCount();

    const handleFavUpdated = () => loadFavoritesCount();
    window.addEventListener("favorites-updated", handleFavUpdated);
    return () => {
      isMounted = false;
      window.removeEventListener("favorites-updated", handleFavUpdated);
    };
  }, [user]);

  // Catégories actives sans Polo
  const activeCategories = (categories ?? []).filter(
    (c) =>
      c.is_active !== false &&
      c.slug.toLowerCase() !== "polo" &&
      c.name.toLowerCase() !== "polo"
  );

  // Collections actives
  const activeCollections = (collections ?? []).filter(
    (col) => col.is_active !== false
  );

  const visibleCount = calculateVisibleCategoriesCount(
    windowWidth,
    activeCategories.length,
    activeCollections.length > 0
  );
  const visibleCategories = activeCategories.slice(0, visibleCount);
  const extraCategories = activeCategories.slice(visibleCount);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      navigate(`/boutique?q=${encodeURIComponent(searchValue.trim())}`);
      setMobileSearchOpen(false);
      setSearchValue("");
    }
  };

  return (
    <>
      <header
        className={`${styles.header} ${scrolled ? styles.headerScrolled : ""}`}
      >
        <div className={styles.inner}>
          {/* Gauche : Bouton menu mobile & Logo */}
          <div className={styles.leftGroup}>
            <button
              className={styles.menuBtn}
              onClick={() => setMobileOpen(true)}
              aria-label={t("header.menuAria", "Menu")}
            >
              <Menu size={20} strokeWidth={1.5} />
            </button>

            <Link to="/" className={styles.logo}>
              {storeName}
            </Link>

            {/* Navigation des catégories sur ordinateur */}
            <nav
              className={styles.nav}
              aria-label={t("header.categories", "Catégories")}
            >
              {visibleCategories.map((cat) => (
                <Link
                  key={cat.id}
                  to={`/categorie/${cat.slug}`}
                  className={styles.navLink}
                >
                  {cat.name}
                </Link>
              ))}

              {/* Menu déroulant Plus : catégories qui ne tiennent pas */}
              {extraCategories.length > 0 && (
                <div className={styles.moreWrap} ref={moreRef}>
                  <button
                    ref={moreBtnRef}
                    type="button"
                    className={styles.moreBtn}
                    onClick={() => {
                      setMoreOpen((o) => !o);
                      setCollectionsOpen(false);
                    }}
                    aria-expanded={moreOpen}
                    aria-haspopup="true"
                    aria-label={t("common.more", "Plus")}
                  >
                    <span>{t("common.more", "Plus")}</span>
                    <ChevronDown
                      size={14}
                      className={moreOpen ? styles.chevronRotated : ""}
                      aria-hidden="true"
                    />
                  </button>
                  {moreOpen && (
                    <div className={styles.moreDropdown} role="menu">
                      {extraCategories.map((cat) => (
                        <Link
                          key={cat.id}
                          to={`/categorie/${cat.slug}`}
                          className={styles.moreLink}
                          role="menuitem"
                          onClick={() => setMoreOpen(false)}
                        >
                          {cat.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Menu déroulant Collections : masqué s'il n'y en a aucune */}
              {activeCollections.length > 0 && (
                <div className={styles.collectionsWrap} ref={collectionsRef}>
                  <button
                    ref={collectionsBtnRef}
                    type="button"
                    className={styles.collectionsBtn}
                    onClick={() => {
                      setCollectionsOpen((o) => !o);
                      setMoreOpen(false);
                    }}
                    aria-expanded={collectionsOpen}
                    aria-haspopup="true"
                    aria-label={t("home.collections", "Collections")}
                  >
                    <span>{t("home.collections", "Collections")}</span>
                    <ChevronDown
                      size={14}
                      className={
                        collectionsOpen ? styles.chevronRotated : ""
                      }
                      aria-hidden="true"
                    />
                  </button>
                  {collectionsOpen && (
                    <div
                      className={styles.collectionsDropdown}
                      role="menu"
                    >
                      {activeCollections.map((col) => (
                        <Link
                          key={col.id}
                          to={`/collection/${col.slug}`}
                          className={styles.collectionsLink}
                          role="menuitem"
                          onClick={() => setCollectionsOpen(false)}
                        >
                          {col.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </nav>
          </div>

          {/* Centre ordinateur : champ de recherche large */}
          <div className={styles.searchCenter}>
            <form
              onSubmit={handleSearch}
              className={styles.desktopSearchForm}
              role="search"
            >
              <Search
                size={16}
                className={styles.desktopSearchIcon}
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder={t(
                  "header.searchPlaceholder",
                  "Rechercher un produit…"
                )}
                className={styles.desktopSearchInput}
                aria-label={t(
                  "header.searchPlaceholder",
                  "Rechercher un produit…"
                )}
              />
            </form>
          </div>

          {/* Droite : Compte, Favoris, Panier, Sélecteurs */}
          <div className={styles.actions}>
            {/* Recherche mobile (accessible en un geste) */}
            <button
              className={styles.mobileSearchBtn}
              onClick={() => setMobileSearchOpen((s) => !s)}
              aria-label={t("header.searchAria", "Recherche")}
            >
              <Search size={18} strokeWidth={1.5} />
            </button>

            {/* Compte utilisateur (ordinateur) */}
            <Link
              to={user ? "/compte" : "/connexion"}
              className={`${styles.iconBtn} ${styles.desktopOnly}`}
              aria-label={
                user
                  ? t("header.accountAria", "Mon compte")
                  : t("header.loginAria", "Connexion")
              }
            >
              <User size={18} strokeWidth={1.5} />
            </Link>

            {/* Favoris (avec compteur visible si > 0) */}
            <Link
              to="/favoris"
              className={styles.iconBtn}
              aria-label={t("header.favoritesAria", "Favoris")}
            >
              <Heart size={18} strokeWidth={1.5} />
              {favoriteCount > 0 && (
                <span className={styles.badge}>{favoriteCount}</span>
              )}
            </Link>

            {/* Panier (avec compteur visible si > 0) */}
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
              {totalItems > 0 && (
                <span
                  className={[
                    styles.badge,
                    cartPulse ? styles.cartPulse : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {totalItems}
                </span>
              )}
            </button>

            {/* Sélecteurs de langue et de devise (ordinateur) */}
            <div className={styles.desktopOnly}>
              <LanguageButton variant="header" />
            </div>
            <div className={styles.desktopOnly}>
              <CurrencyButton variant="header" />
            </div>
          </div>
        </div>

        {/* Barre de recherche déroulante pour mobile */}
        {mobileSearchOpen && (
          <div className={styles.mobileSearchBar}>
            <form onSubmit={handleSearch} className={styles.mobileSearchForm}>
              <input
                type="search"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder={t(
                  "header.searchPlaceholder",
                  "Rechercher un produit…"
                )}
                className={styles.mobileSearchInput}
                autoFocus
              />
              <button type="submit" className={styles.mobileSearchSubmit}>
                {t("header.searchSubmit", "Rechercher")}
              </button>
            </form>
          </div>
        )}
      </header>

      {/* Tiroir mobile latéral avec catégories, collections, compte, langue et devise */}
      <Drawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        title={t("common.menu", "Menu")}
        side="left"
      >
        <nav className={styles.mobileNav}>
          {/* Catégories actives sans Polo */}
          <div className={styles.mobileSectionTitle}>
            {t("header.categories", "Catégories")}
          </div>
          {activeCategories.map((cat) => (
            <Link
              key={cat.id}
              to={`/categorie/${cat.slug}`}
              className={styles.mobileLink}
              onClick={() => setMobileOpen(false)}
            >
              {cat.name}
            </Link>
          ))}

          {/* Collections actives si existantes */}
          {activeCollections.length > 0 && (
            <>
              <div
                className={styles.mobileSectionTitle}
                style={{ marginTop: "var(--space-4)" }}
              >
                {t("home.collections", "Collections")}
              </div>
              {activeCollections.map((col) => (
                <Link
                  key={col.id}
                  to={`/collection/${col.slug}`}
                  className={styles.mobileLink}
                  onClick={() => setMobileOpen(false)}
                >
                  {col.name}
                </Link>
              ))}
            </>
          )}

          {/* Compte */}
          <div
            className={styles.mobileSectionTitle}
            style={{ marginTop: "var(--space-4)" }}
          >
            {user
              ? t("header.accountAria", "Mon compte")
              : t("header.loginAria", "Connexion")}
          </div>
          <Link
            to={user ? "/compte" : "/connexion"}
            className={styles.mobileLink}
            onClick={() => setMobileOpen(false)}
          >
            {user
              ? t("header.accountAria", "Mon compte")
              : t("header.loginAria", "Connexion")}
          </Link>

          {/* Sélecteurs de langue et de devise */}
          <div className={styles.mobileSelectors}>
            <LanguageButton variant="header" />
            <CurrencyButton variant="header" />
          </div>
        </nav>
      </Drawer>
    </>
  );
}
