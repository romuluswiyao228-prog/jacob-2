import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Search,
  Edit2,
  Archive,
  RotateCcw,
  Package,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatXOF } from "@/lib/admin-utils";
import type { Product, Category, ProductImage } from "@/lib/db-types";
import styles from "./AdminProductsPage.module.css";

interface ProductRow extends Product {
  category?: Category | null;
  primary_image?: ProductImage | null;
  variants_count: number;
  total_stock: number;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showArchived, setShowArchived] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch categories
      const { data: catData, error: catErr } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order", { ascending: true });
      if (catErr) throw catErr;
      setCategories(catData ?? []);

      // 2. Fetch products
      let query = supabase
        .from("products")
        .select("*, category:categories(*)")
        .order("created_at", { ascending: false });

      const { data: prodData, error: prodErr } = await query;
      if (prodErr) throw prodErr;

      // 3. Fetch primary images
      const { data: imgData } = await supabase
        .from("product_images")
        .select("*")
        .order("is_primary", { ascending: false })
        .order("sort_order", { ascending: true });

      const imgMap = new Map<string, ProductImage>();
      for (const img of imgData ?? []) {
        if (!imgMap.has(img.product_id)) {
          imgMap.set(img.product_id, img);
        }
      }

      // 4. Fetch variants for stock & count
      const { data: varData } = await supabase
        .from("product_variants")
        .select("product_id, stock");

      const stockMap = new Map<string, { count: number; total: number }>();
      for (const v of varData ?? []) {
        const cur = stockMap.get(v.product_id) ?? { count: 0, total: 0 };
        stockMap.set(v.product_id, {
          count: cur.count + 1,
          total: cur.total + (v.stock || 0),
        });
      }

      const rows: ProductRow[] = (prodData ?? []).map((p: any) => ({
        ...p,
        category: p.category,
        primary_image: imgMap.get(p.id) ?? null,
        variants_count: stockMap.get(p.id)?.count ?? 0,
        total_stock: stockMap.get(p.id)?.total ?? 0,
      }));

      setProducts(rows);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors du chargement";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Archive / unarchive product
  const toggleArchive = async (prod: ProductRow) => {
    const nextArchived = !prod.is_archived;
    const confirmMsg = nextArchived
      ? `Archiver le produit « ${prod.name} » ? Il ne sera plus visible par les clients.`
      : `Restaurer le produit « ${prod.name} » ? Il sera à nouveau visible en boutique.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const { error: updateErr } = await supabase
        .from("products")
        .update({ is_archived: nextArchived })
        .eq("id", prod.id);

      if (updateErr) throw updateErr;

      setProducts((prev) =>
        prev.map((p) =>
          p.id === prod.id ? { ...p, is_archived: nextArchived } : p
        )
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de la modification";
      setError(msg);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Archive filter
      if (!showArchived && p.is_archived) {
        return false;
      }
      // Category filter
      if (selectedCategory !== "all" && p.category_id !== selectedCategory) {
        return false;
      }
      // Search
      if (search.trim()) {
        const s = search.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(s);
        const matchesSlug = p.slug.toLowerCase().includes(s);
        return matchesName || matchesSlug;
      }
      return true;
    });
  }, [products, showArchived, selectedCategory, search]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Produits</h1>
          <p className={styles.subtitle}>
            Gestion du catalogue ({products.length} produits au total, dont{" "}
            {products.filter((p) => p.is_archived).length} archivés).
          </p>
        </div>
        <Link to="/admin/produits/nouveau" className={styles.primaryBtn}>
          <Plus size={16} />
          <span>Nouveau produit</span>
        </Link>
      </header>

      {error && <div className={styles.alertBox}>{error}</div>}

      <div className={styles.filtersBar}>
        <div className={styles.filtersLeft}>
          <div className={styles.searchWrap}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Rechercher par nom, référence ou slug…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={styles.select}
          >
            <option value="all">Toutes les catégories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.checkboxRow}>
          <input
            id="show-archived"
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className={styles.checkbox}
          />
          <label htmlFor="show-archived" className={styles.checkboxLabel}>
            Afficher les archivés
          </label>
        </div>
      </div>

      <div className={styles.tableContainer}>
        {loading ? (
          <div className={styles.emptyState}>Chargement du catalogue…</div>
        ) : filteredProducts.length === 0 ? (
          <div className={styles.emptyState}>
            Aucun produit ne correspond à vos filtres.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Visuel</th>
                <th>Produit</th>
                <th>Catégorie</th>
                <th>Prix</th>
                <th>Stock / Variantes</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.primary_image?.url ? (
                      <img
                        src={p.primary_image.url}
                        alt={p.primary_image.alt_text ?? p.name}
                        className={styles.thumbImg}
                      />
                    ) : (
                      <div className={styles.thumbPlaceholder}>
                        <Package size={20} />
                      </div>
                    )}
                  </td>
                  <td>
                    <Link
                      to={`/admin/produits/${p.id}`}
                      className={styles.productNameLink}
                    >
                      {p.name}
                    </Link>
                    <div className={styles.slugText}>{p.slug}</div>
                  </td>
                  <td>
                    {p.category ? (
                      <span className={styles.catBadge}>{p.category.name}</span>
                    ) : (
                      <span style={{ color: "var(--color-neutral-500)" }}>—</span>
                    )}
                  </td>
                  <td>
                    <span className={styles.priceText}>
                      {formatXOF(p.price)}
                    </span>
                    {p.compare_at_price && p.compare_at_price > p.price && (
                      <span className={styles.originalPrice}>
                        {formatXOF(p.compare_at_price)}
                      </span>
                    )}
                  </td>
                  <td>
                    <div className={styles.stockBadge}>
                      <strong>{p.total_stock}</strong> en stock
                      <div style={{ color: "var(--color-neutral-400)" }}>
                        {p.variants_count} déclinaison(s)
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className={styles.statusBadges}>
                      {p.is_archived ? (
                        <span className={styles.badgeArchived}>Archivé</span>
                      ) : (
                        <span className={styles.badgeActive}>En ligne</span>
                      )}
                      {p.is_featured && (
                        <span className={styles.badgeFeatured}>En avant</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className={styles.actionsCell}>
                      <Link
                        to={`/admin/produits/${p.id}`}
                        className={styles.editBtn}
                      >
                        <Edit2 size={13} />
                        <span>Modifier</span>
                      </Link>
                      {p.is_archived ? (
                        <button
                          type="button"
                          onClick={() => toggleArchive(p)}
                          className={styles.unarchiveBtn}
                          title="Restaurer le produit"
                        >
                          <RotateCcw size={13} />
                          <span>Restaurer</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggleArchive(p)}
                          className={styles.archiveBtn}
                          title="Archiver le produit au lieu de le supprimer"
                        >
                          <Archive size={13} />
                          <span>Archiver</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
