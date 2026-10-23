import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useCategories } from "@/lib/hooks";
import { ProductCard, Skeleton, EmptyState, ErrorState, Button, Breadcrumb } from "@/components/ui";
import { SEO } from "@/components/SEO";
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

  // Mobile drawer state
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

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
        return next;
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, setSearchParams]);

  // Current filters from URL
  const selectedCategorySlug = slug || searchParams.get("categorie") || "";
  const selectedSize = searchParams.get("taille") || "";
  const selectedSort = searchParams.get("tri") || "newest";

  // States
  const [products, setProducts] = useState<ProductWithImage[]>([]);
  const [productVariants, setProductVariants] = useState<Record<string, ProductVariant[]>>({});
  const [secondaryImages, setSecondaryImages] = useState<Record<string, string>>({});
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
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

  // Helper to build product query
  const buildQuery = useCallback(
    (from: number, to: number) => {
      let q = supabase
        .from("products")
        .select(
          "id, name, slug, description, price, compare_at_price, currency, category_id, is_archived, is_featured, sort_order, created_at, categories(name, slug)",
          { count: "exact" }
        )
        .eq("is_archived", false);

      if (currentCategory) {
        q = q.eq("category_id", currentCategory.id);
      }

      if (debouncedSearch.trim()) {
        q = q.ilike("name", `%${debouncedSearch.trim()}%`);
      }

      if (selectedSort === "price_asc") {
        q = q.order("price", { ascending: true });
      } else if (selectedSort === "price_desc") {
        q = q.order("price", { ascending: false });
      } else {
        q = q.order("created_at", { ascending: false });
      }

      return q.range(from, to);
    },
    [currentCategory, debouncedSearch, selectedSort]
  );

  // Helper to enrich raw products with images and variants
  const enrichProducts = useCallback(
    async (rawProducts: any[]) => {
      if (!rawProducts || rawProducts.length === 0) {
        return { enriched: [], variantsMap: {}, secondaryMap: {} };
      }

      const productIds = rawProducts.map((p) => p.id);

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

      const primaryMap = new Map<string, any>();
      const secMap: Record<string, string> = {};

      for (const img of images ?? []) {
        if (!primaryMap.has(img.product_id)) {
          primaryMap.set(img.product_id, img);
        } else if (!secMap[img.product_id]) {
          secMap[img.product_id] = img.url;
        }
      }

      const varsMap: Record<string, ProductVariant[]> = {};
      for (const v of (variants as ProductVariant[]) ?? []) {
        if (!varsMap[v.product_id]) varsMap[v.product_id] = [];
        varsMap[v.product_id].push(v);
      }

      let filtered = rawProducts;
      if (selectedSize && !isNoSizeCategory(selectedCategorySlug)) {
        filtered = filtered.filter((p) =>
          varsMap[p.id]?.some((v) => v.size === selectedSize && v.stock > 0)
        );
      }

      const enriched: ProductWithImage[] = filtered.map((p) => ({
        ...p,
        primary_image: primaryMap.get(p.id) ?? null,
        category: Array.isArray(p.categories)
          ? p.categories[0]
          : (p.categories as unknown as { name: string; slug: string } | null),
      }));

      return { enriched, variantsMap: varsMap, secondaryMap: secMap };
    },
    [selectedSize, selectedCategorySlug]
  );

  // Initial fetch on filters change
  const fetchInitialProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: rawProducts, count, error: fetchErr } = await buildQuery(
        0,
        PAGE_SIZE - 1
      );

      if (fetchErr) throw fetchErr;

      setTotalCount(count ?? 0);

      const { enriched, variantsMap, secondaryMap } = await enrichProducts(
        rawProducts ?? []
      );

      setProducts(enriched);
      setProductVariants(variantsMap);
      setSecondaryImages(secondaryMap);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur de chargement";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [buildQuery, enrichProducts]);

  useEffect(() => {
    fetchInitialProducts();
  }, [fetchInitialProducts]);

  // Load more (VOIR PLUS)
  const handleLoadMore = async () => {
    if (isLoadingMore || products.length >= totalCount) return;
    setIsLoadingMore(true);

    try {
      const from = products.length;
      const to = from + PAGE_SIZE - 1;

      const { data: rawProducts, error: fetchErr } = await buildQuery(from, to);
      if (fetchErr) throw fetchErr;

      const { enriched, variantsMap, secondaryMap } = await enrichProducts(
        rawProducts ?? []
      );

      setProducts((prev) => [...prev, ...enriched]);
      setProductVariants((prev) => ({ ...prev, ...variantsMap }));
      setSecondaryImages((prev) => ({ ...prev, ...secondaryMap }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur de chargement";
      setError(msg);
    } finally {
      setIsLoadingMore(false);
    }
  };

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
      return next;
    });
  };

  const handleClearAll = () => {
    setSearchInput("");
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("categorie");
      next.delete("taille");
      next.delete("q");
      return next;
    });
  };

  // Active filters count for mobile button "FILTRER (n)"
  const activeFiltersCount =
    (selectedCategorySlug ? 1 : 0) +
    (selectedSize ? 1 : 0) +
    (debouncedSearch.trim() ? 1 : 0);

  // Close drawer on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileDrawerOpen(false);
    };
    if (mobileDrawerOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileDrawerOpen]);

  const pageTitle = currentCategory ? currentCategory.name : "Catalogue Boutique";
  const pageDescription = currentCategory?.description || "Explorez le catalogue de pièces streetwear contemporaines de JACOB DE JESUS.";

  return (
    <div className={styles.page}>
      <SEO
        title={pageTitle}
        description={pageDescription}
      />
      {/* 4. Fil d'Ariane */}
      <Breadcrumb
        items={[
          { label: "Accueil", href: "/" },
          ...(currentCategory
            ? [
                { label: "Boutique", href: "/boutique" },
                { label: currentCategory.name },
              ]
            : [{ label: "Boutique" }]),
        ]}
        className={styles.breadcrumb}
      />

      {/* 2. En-tête de catégorie avec le nombre d'articles */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <h1 className={styles.title}>
            {currentCategory ? currentCategory.name : "Catalogue"}
          </h1>
          <span className={styles.articleCount}>
            {totalCount} {totalCount > 1 ? "articles" : "article"}
          </span>
        </div>
        {currentCategory?.description && (
          <p className={styles.description}>{currentCategory.description}</p>
        )}
      </header>

      <div className={styles.contentLayout}>
        {/* 2. Filtres en barre latérale sur ordinateur */}
        <aside className={styles.sidebar}>
          {/* Catégories */}
          <section className={styles.filterSection}>
            <h2 className={styles.filterSectionTitle}>Catégories</h2>
            <div className={styles.filterList}>
              <button
                type="button"
                className={[
                  styles.filterButton,
                  !selectedCategorySlug ? styles.filterButtonActive : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => handleCategorySelect("")}
              >
                <span>Tous</span>
              </button>
              {categories?.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={[
                    styles.filterButton,
                    selectedCategorySlug === cat.slug
                      ? styles.filterButtonActive
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => handleCategorySelect(cat.slug)}
                >
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Filtre de taille limité aux tailles existantes, masqué pour Bijoux et Lunettes */}
          {!isNoSizeCategory(selectedCategorySlug) && availableSizes.length > 0 && (
            <section className={styles.filterSection}>
              <h2 className={styles.filterSectionTitle}>Tailles</h2>
              <div className={styles.sizeGrid}>
                {availableSizes.map((size) => {
                  const isActive = selectedSize === size;
                  return (
                    <button
                      key={size}
                      type="button"
                      className={[
                        styles.sizeButton,
                        isActive ? styles.sizeButtonActive : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => handleSizeClick(size)}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </aside>

        {/* Colonne principale */}
        <main className={styles.mainCol}>
          {/* Barre d'outils (recherche, tri, bouton mobile FILTRER) */}
          <div className={styles.toolbar}>
            <div className={styles.toolbarLeft}>
              <div className={styles.searchWrap}>
                <Search size={16} className={styles.searchIcon} />
                <input
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Rechercher une pièce…"
                  className={styles.searchInput}
                />
              </div>
            </div>

            <div className={styles.toolbarRight}>
              {/* Bouton mobile FILTRER (n) */}
              <button
                type="button"
                className={styles.mobileFilterBtn}
                onClick={() => setMobileDrawerOpen(true)}
              >
                <SlidersHorizontal size={14} />
                <span>FILTRER</span>
                {activeFiltersCount > 0 && (
                  <span className={styles.mobileFilterBtnBadge}>
                    {activeFiltersCount}
                  </span>
                )}
              </button>

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
          </div>

          {/* 2. Puces des filtres actifs supprimables */}
          {activeFiltersCount > 0 && (
            <div className={styles.activeFiltersRow}>
              <span className={styles.activeFiltersLabel}>Filtres actifs :</span>
              <div className={styles.chipsWrap}>
                {selectedCategorySlug && (
                  <span className={styles.filterChip}>
                    Catégorie : {currentCategory?.name || selectedCategorySlug}
                    <button
                      type="button"
                      onClick={() => handleCategorySelect("")}
                      aria-label="Supprimer le filtre de catégorie"
                      className={styles.chipRemove}
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                {selectedSize && (
                  <span className={styles.filterChip}>
                    Taille : {selectedSize}
                    <button
                      type="button"
                      onClick={() => handleSizeClick(selectedSize)}
                      aria-label="Supprimer le filtre de taille"
                      className={styles.chipRemove}
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                {debouncedSearch && (
                  <span className={styles.filterChip}>
                    Recherche : « {debouncedSearch} »
                    <button
                      type="button"
                      onClick={() => setSearchInput("")}
                      aria-label="Supprimer la recherche"
                      className={styles.chipRemove}
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                <button
                  type="button"
                  className={styles.clearAllBtn}
                  onClick={handleClearAll}
                >
                  Effacer tout
                </button>
              </div>
            </div>
          )}

          {/* Contenu principal */}
          {isLoading ? (
            <div className={styles.grid}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  style={{ display: "flex", flexDirection: "column", gap: "12px" }}
                >
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
                <Button variant="outline" size="sm" onClick={fetchInitialProducts}>
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
                  : "Aucun produit n'est disponible avec ces filtres."
              }
              action={
                activeFiltersCount > 0 ? (
                  <Button variant="outline" size="sm" onClick={handleClearAll}>
                    Effacer tous les filtres
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <div className={styles.grid}>
                {products.map((p) => {
                  const vars = productVariants[p.id] || [];
                  const rawSizes = Array.from(
                    new Set(
                      vars
                        .map((v) => v.size)
                        .filter((s): s is string => Boolean(s))
                    )
                  );
                  const sortedSizes = sortSizes(rawSizes);

                  const hasDiscount =
                    p.compare_at_price != null && p.compare_at_price > p.price;
                  const isSoldOut =
                    vars.length > 0 && vars.every((v) => v.stock <= 0);

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
                    secondaryImage: secondaryImages[p.id] ?? null,
                    sizes: sortedSizes,
                    badge: isSoldOut
                      ? "soldout"
                      : hasDiscount
                      ? "sale"
                      : p.is_featured
                      ? "new"
                      : null,
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

              {/* 2. Bouton VOIR PLUS */}
              {products.length < totalCount && (
                <div className={styles.loadMoreWrap}>
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className={styles.loadMoreBtn}
                  >
                    {isLoadingMore ? "Chargement…" : "VOIR PLUS"}
                  </Button>
                  <p className={styles.loadMoreCount}>
                    {products.length} sur {totalCount} articles
                  </p>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* 2. Tiroir sur mobile (Drawer) */}
      {mobileDrawerOpen && (
        <>
          <div
            className={styles.drawerBackdrop}
            onClick={() => setMobileDrawerOpen(false)}
            aria-hidden="true"
          />
          <div
            className={styles.drawerPanel}
            role="dialog"
            aria-modal="true"
            aria-label="Filtres"
          >
            <div className={styles.drawerHeader}>
              <h2 className={styles.drawerTitle}>Filtres</h2>
              <button
                type="button"
                className={styles.drawerCloseBtn}
                onClick={() => setMobileDrawerOpen(false)}
                aria-label="Fermer les filtres"
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles.drawerBody}>
              {/* Catégories dans le tiroir */}
              <section className={styles.filterSection}>
                <h3 className={styles.filterSectionTitle}>Catégories</h3>
                <div className={styles.filterList}>
                  <button
                    type="button"
                    className={[
                      styles.filterButton,
                      !selectedCategorySlug ? styles.filterButtonActive : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => handleCategorySelect("")}
                  >
                    <span>Tous</span>
                  </button>
                  {categories?.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      className={[
                        styles.filterButton,
                        selectedCategorySlug === cat.slug
                          ? styles.filterButtonActive
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => handleCategorySelect(cat.slug)}
                    >
                      <span>{cat.name}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Tailles dans le tiroir (masqué pour Bijoux et Lunettes) */}
              {!isNoSizeCategory(selectedCategorySlug) && availableSizes.length > 0 && (
                <section className={styles.filterSection}>
                  <h3 className={styles.filterSectionTitle}>Tailles</h3>
                  <div className={styles.sizeGrid}>
                    {availableSizes.map((size) => {
                      const isActive = selectedSize === size;
                      return (
                        <button
                          key={size}
                          type="button"
                          className={[
                            styles.sizeButton,
                            isActive ? styles.sizeButtonActive : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          onClick={() => handleSizeClick(size)}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>

            <div className={styles.drawerFooter}>
              {activeFiltersCount > 0 && (
                <Button
                  variant="outline"
                  size="md"
                  onClick={handleClearAll}
                  style={{ flex: 1 }}
                >
                  Effacer
                </Button>
              )}
              <Button
                variant="primary"
                size="md"
                onClick={() => setMobileDrawerOpen(false)}
                style={{ flex: 1 }}
              >
                Appliquer
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
