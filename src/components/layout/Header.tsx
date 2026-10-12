import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useCategories } from "@/lib/hooks";
import { Drawer } from "@/components/ui";
import { Menu, Search, Heart, ShoppingBag, User } from "lucide-react";
import styles from "./Header.module.css";

interface HeaderProps {
  storeName: string;
}

export function Header({ storeName }: HeaderProps) {
  const { user } = useAuth();
  const { data: categories } = useCategories();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const navigate = useNavigate();

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
            {(categories ?? []).slice(0, 6).map((cat) => (
              <Link
                key={cat.id}
                to={`/categorie/${cat.slug}`}
                className={styles.navLink}
              >
                {cat.name}
              </Link>
            ))}
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
            <Link
              to="/panier"
              className={styles.iconBtn}
              aria-label="Panier"
            >
              <ShoppingBag size={18} strokeWidth={1.5} />
              <span className={styles.cartCount}>0</span>
            </Link>
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
