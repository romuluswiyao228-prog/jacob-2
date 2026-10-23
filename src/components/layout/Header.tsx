import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { useCategories } from "@/lib/hooks";
import { Drawer } from "@/components/ui";
import { Menu, Search, Heart, ShoppingBag, User, ChevronDown } from "lucide-react";
import styles from "./Header.module.css";

interface HeaderProps {
  storeName: string;
}

export function Header({ storeName }: HeaderProps) {
  const { user } = useAuth();
  const { totalItems, openCart } = useCart();
  const { data: categories } = useCategories();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const navigate = useNavigate();

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
      <header className={styles.header}>
        <div className={styles.inner}>
          {/* Mobile menu button */}
          <button
            className={styles.menuBtn}
            onClick={() => setMobileOpen(true)}
            aria-label="Menu"
          >
            <Menu size={20} strokeWidth={1.5} />
          </button>

          {/* Logo */}
          <Link to="/" className={styles.logo}>
            {storeName}
          </Link>

          {/* Desktop nav */}
          <nav className={styles.nav} aria-label="Catégories">
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
                  <span>Plus</span>
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
            <button
              className={styles.iconBtn}
              onClick={() => setSearchOpen((s) => !s)}
              aria-label="Recherche"
            >
              <Search size={18} strokeWidth={1.5} />
            </button>
            <Link
              to="/favoris"
              className={styles.iconBtn}
              aria-label="Favoris"
            >
              <Heart size={18} strokeWidth={1.5} />
            </Link>
            <button
              type="button"
              onClick={openCart}
              className={styles.iconBtn}
              aria-label={`Panier (${totalItems} article${totalItems > 1 ? "s" : ""})`}
            >
              <ShoppingBag size={18} strokeWidth={1.5} />
              {totalItems > 0 && <span className={styles.cartCount}>{totalItems}</span>}
            </button>
            <Link
              to={user ? "/compte" : "/connexion"}
              className={styles.iconBtn}
              aria-label={user ? "Mon compte" : "Connexion"}
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
                placeholder="Rechercher un produit…"
                className={styles.searchInput}
                autoFocus
              />
              <button type="submit" className={styles.searchSubmit}>
                Rechercher
              </button>
            </form>
          </div>
        )}
      </header>

      {/* Mobile drawer */}
      <Drawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        title="Menu"
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
            {user ? "Mon compte" : "Connexion"}
          </Link>
        </nav>
      </Drawer>
    </>
  );
}
