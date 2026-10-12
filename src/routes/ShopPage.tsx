import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useCategories } from "@/lib/hooks";
import { ProductCard, Skeleton, EmptyState, ErrorState, Button } from "@/components/ui";
import { sortSizes, isNoSizeCategory } from "@/lib/sizes";
import type { ProductWithImage, ProductVariant } from "@/lib/db-types";
import type { ProductCardData } from "@/components/ui";
import styles from "./ShopPage.module.css";

const PAGE_SIZE = 12;

export default function ShopPage() {
  const { slug } = useParams<{ slug?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { data: categories } = useCategories();

  // Search input with debounce 300ms
  const queryParam = searchParams.get("q") || "";
  const [searchInput, setSearchInput] = useState(queryParam);
  const [debouncedSearch, setDebouncedSearch] = useState(queryParam);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (searchInput.trim()) {
          next.set("q", searchInput.trim());
        } else {
          next.delete("q");
        }
        next.set("page", "1");
        return next;
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, setSearchParams]);

  // Current filters from URL
  const selectedCategorySlug = slug || searchParams.get("categorie") || "";
  const selectedSize = searchParams.get("taille") || "";
  const selectedSort = searchParams.get("tri") || "newest";
  const currentPage = parseInt(searchParams.get("page") || "1", 10);

  // States
  const [products, setProducts] = useState<ProductWithImage[]>([]);
  const [productVariants, setProductVariants] = useState<Record<string, ProductVariant[]>>({});
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  // Category object
  const currentCategory = useMemo(() => {
    return categories?.find((c) => c.slug === selectedCategorySlug) || null;
  }, [categories, selectedCategorySlug]);

  // Fetch available sizes for the selected category
  const [availableSizes, setAvailableSizes] = useState<string[]>([]);

  useEffect(() => {
    async function loadCategorySizes() {
      if (isNoSizeCategory(selectedCategorySlug)) {
        setAvailableSizes([]);
        return;
      }

      let q = supabase
        .from("product_variants")
        .select("size, products!inner(category_id, is_archived, categories!inner(slug))")
        .not("size", "is", null)
        .eq("products.is_archived", false);

      if (selectedCategorySlug) {
        q = q.eq("products.categories.slug", selectedCategorySlug);
      }

      const { data } = await q.limit(200);
      if (data) {
        const unique = Array.from(
          new Set(
            data
              .map((row) => (row as { size: string | null }).size)
              .filter((s): s is string => Boolean(s) && s!.toLowerCase() !== "unique")
          )
        );
        setAvailableSizes(sortSizes(unique));
      }
    }
    loadCategorySizes();
  }, [selectedCategorySlug]);

  // Load user favorites
  useEffect(() => {
    if (!user) {
      setFavoriteIds(new Set());
      return;
    }
    async function loadFavorites() {
      const { data } = await supabase
        .from("favorites")
        .select("product_id")
        .eq("user_id", user!.id);
      if (data) {
        setFavoriteIds(new Set(data.map((f) => f.product_id)));
      }
    }
    loadFavorites();
  }, [user]);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("products")
        .select(
          "id, name, slug, description, price, compare_at_price, currency, category_id, is_archived, is_featured, sort_order, created_at, categories(name, slug)",
          { count: "exact" }
        )
        .eq("is_archived", false);

      if (currentCategory) {
        query = query.eq("category_id", currentCategory.id);
      }

      if (debouncedSearch.trim()) {
        query = query.ilike("name", `%${debouncedSearch.trim()}%`);
      }

      // Sort
      if (selectedSort === "price_asc") {
        query = query.order("price", { ascending: true });
      } else if (selectedSort === "price_desc") {
        query = query.order("price", { ascending: false });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      const { data: rawProducts, count, error: fetchErr } = await query.range(from, to);

      if (fetchErr) throw fetchErr;

      setTotalCount(count ?? 0);

      if (!rawProducts || rawProducts.length === 0) {
        setProducts([]);
        setProductVariants({});
        return;
      }

      const productIds = rawProducts.map((p) => p.id);

      // Fetch primary images and variants in parallel
      const [{ data: images }, { data: variants }] = await Promise.all([
        supabase
          .from("product_images")
          .select("id, product_id, url, alt_text, sort_order, is_primary")
          .in("product_id", productIds)
          .order("is_primary", { ascending: false })
          .order("sort_order", { ascending: true }),
        supabase
          .from("product_variants")
          .select("id, product_id, size, color, sku, stock, price, currency")
          .in("product_id", productIds),
      ]);

      const imageMap = new Map<string, NonNullable<typeof images>[number]>();
      for (const img of images ?? []) {
        if (!imageMap.has(img.product_id)) {
          imageMap.set(img.product_id, img);
        }
      }

      const variantsMap: Record<string, ProductVariant[]> = {};
      for (const v of (variants as ProductVariant[]) ?? []) {
        if (!variantsMap[v.product_id]) variantsMap[v.product_id] = [];
        variantsMap[v.product_id].push(v);
      }
      setProductVariants(variantsMap);

      // Filter by size client-side if a specific size is picked
      let filtered = rawProducts;
      if (selectedSize && !isNoSizeCategory(selectedCategorySlug)) {
        filtered = filtered.filter((p) =>
          variantsMap[p.id]?.some((v) => v.size === selectedSize && v.stock > 0)
        );
      }

      const enriched: ProductWithImage[] = filtered.map((p) => ({
        ...p,
        primary_image: imageMap.get(p.id) ?? null,
        category: Array.isArray(p.categories) ? p.categories[0] : (p.categories as unknown as { name: string; slug: string } | null),
      }));

      setProducts(enriched);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur de chargement";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, currentCategory, debouncedSearch, selectedSort, selectedSize, selectedCategorySlug]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Toggle favorite
  const handleToggleFavorite = async (productId: string) => {
    if (!user) return;
    const isFav = favoriteIds.has(productId);

    if (isFav) {
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
      await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("product_id", productId);
    } else {
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        next.add(productId);
        return next;
      });
      await supabase
        .from("favorites")
        .insert({ user_id: user.id, product_id: productId });
    }
  };

  const handleSortChange = (newSort: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tri", newSort);
      next.set("page", "1");
      return next;
    });
  };

  const handleSizeClick = (size: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (selectedSize === size) {
        next.delete("taille");
      } else {
        next.set("taille", size);
      }
      next.set("page", "1");
      return next;
    });
  };

  const handleCategorySelect = (catSlug: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (catSlug) {
        next.set("categorie", catSlug);
      } else {
        next.delete("categorie");
      }
      next.delete("taille");
      next.set("page", "1");
      return next;
    });
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className={styles.page}>
      {/* En-tête de catalogue */}
      <div className={styles.header}>
        <h1 className={styles.title}>
          {currentCategory ? currentCategory.name : "Catalogue"}
        </h1>
        {currentCategory?.description && (
          <p className={styles.description}>{currentCategory.description}</p>
        )}
      </div>

      {/* Barre d'outils (recherche & tri) */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Rechercher par nom…"
            className={styles.searchInput}
          />
        </div>

        <select
          value={selectedSort}
          onChange={(e) => handleSortChange(e.target.value)}
          className={styles.sortSelect}
          aria-label="Trier par"
        >
          <option value="newest">Nouveautés</option>
          <option value="price_asc">Prix croissant</option>
          <option value="price_desc">Prix décroissant</option>
        </select>
      </div>

      {/* Filtres de catégorie (pills) si on est sur la boutique générale */}
      {!slug && categories && categories.length > 0 && (
        <div className={styles.filtersRow}>
          <span className={styles.filterLabel}>Catégorie :</span>
          <div className={styles.filterGroup}>
            <button
              type="button"
              className={[
                styles.pill,
                !selectedCategorySlug ? styles.pillActive : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => handleCategorySelect("")}
            >
              Tous
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={[
                  styles.pill,
                  selectedCategorySlug === cat.slug ? styles.pillActive : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => handleCategorySelect(cat.slug)}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filtres de taille (masqués si catégorie sans taille comme Bijoux, Lunettes) */}
      {!isNoSizeCategory(selectedCategorySlug) && availableSizes.length > 0 && (
        <div className={styles.filtersRow}>
          <span className={styles.filterLabel}>Taille :</span>
          <div className={styles.filterGroup}>
            {availableSizes.map((size) => (
              <button
                key={size}
                type="button"
                className={[
                  styles.pill,
                  selectedSize === size ? styles.pillActive : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => handleSizeClick(size)}
              >
                {size}
              </button>
            ))}
            {selectedSize && (
              <button
                type="button"
                className={styles.clearFilters}
                onClick={() => handleSizeClick(selectedSize)}
              >
                Effacer
              </button>
            )}
          </div>
        </div>
      )}

      {/* Contenu principal */}
      {isLoading ? (
        <div className={styles.grid}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <Skeleton variant="rect" width="100%" height="320px" />
              <Skeleton variant="text" width="60%" />
              <Skeleton variant="text" width="40%" />
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState
          title="Impossible de charger les produits"
          message={error}
          action={
            <Button variant="outline" size="sm" onClick={fetchProducts}>
              Réessayer
            </Button>
          }
        />
      ) : products.length === 0 ? (
        <EmptyState
          title="Aucun produit trouvé"
          description={
            debouncedSearch
              ? `Aucun résultat ne correspond à la recherche « ${debouncedSearch} ».`
              : "Aucun produit n'est disponible dans cette sélection."
          }
        />
      ) : (
        <>
          <div className={styles.grid}>
            {products.map((p) => {
              const vars = productVariants[p.id] || [];
              const rawSizes = Array.from(
                new Set(vars.map((v) => v.size).filter((s): s is string => Boolean(s)))
              );
              const sortedSizes = sortSizes(rawSizes);

              const hasDiscount =
                p.compare_at_price != null && p.compare_at_price > p.price;
              const isSoldOut = vars.length > 0 && vars.every((v) => v.stock <= 0);

              const cardData: ProductCardData = {
                id: p.id,
                slug: p.slug,
                name: p.name,
                reference: p.slug.toUpperCase(),
                price: p.price,
                currency: p.currency,
                originalPrice: hasDiscount ? p.compare_at_price : null,
                image: p.primary_image?.url ?? "",
                imageAlt: p.primary_image?.alt_text ?? p.name,
                sizes: sortedSizes,
                badge: isSoldOut ? "soldout" : hasDiscount ? "sale" : p.is_featured ? "new" : null,
                isSoldOut,
                isFavorite: favoriteIds.has(p.id),
              };

              return (
                <ProductCard
                  key={p.id}
                  product={cardData}
                  onToggleFavorite={handleToggleFavorite}
                />
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() =>
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev);
                    next.set("page", String(currentPage - 1));
                    return next;
                  })
                }
              >
                Précédent
              </Button>
              <span className={styles.pageInfo}>
                Page {currentPage} sur {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() =>
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev);
                    next.set("page", String(currentPage + 1));
                    return next;
                  })
                }
              >
                Suivant
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
