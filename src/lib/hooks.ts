import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type {
  Category,
  ProductWithImage,
  Collection,
  PublicStoreSettings,
  BestSeller,
} from "@/lib/db-types";

type QueryState<T> = {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
};

function useQuery<T>(
  fetcher: () => Promise<{ data: T | null; error: string | null }>,
  deps: unknown[] = []
): QueryState<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchCount, setRefetchCount] = useState(0);

  const refetch = useCallback(() => setRefetchCount((c) => c + 1), []);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    fetcher()
      .then((result) => {
        if (!mounted) return;
        setData(result.data);
        setError(result.error);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, refetchCount]);

  return { data, isLoading, error, refetch };
}

export function useCategories(): QueryState<Category[]> {
  return useQuery(async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, slug, description, sort_order, is_active")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .limit(20);

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  });
}

export function useStoreSettings(): QueryState<PublicStoreSettings> {
  return useQuery(async () => {
    const { data, error } = await supabase
      .from("public_store_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  });
}

export function useNewProducts(limit = 8): QueryState<ProductWithImage[]> {
  return useQuery(async () => {
    const { data: products, error } = await supabase
      .from("products")
      .select("id, name, slug, description, price, compare_at_price, currency, category_id, is_archived, is_featured, sort_order, created_at")
      .eq("is_archived", false)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return { data: null, error: error.message };
    if (!products || products.length === 0) return { data: [], error: null };

    const productIds = products.map((p) => p.id);
    const [{ data: images }, { data: categories }] = await Promise.all([
      supabase
        .from("product_images")
        .select("id, product_id, url, alt_text, sort_order, is_primary")
        .in("product_id", productIds)
        .order("is_primary", { ascending: false })
        .order("sort_order", { ascending: true }),
      supabase
        .from("categories")
        .select("name, slug")
        .in("id", products.map((p) => p.category_id).filter(Boolean) as string[]),
    ]);

    const imageMap = new Map<string, NonNullable<typeof images>[number]>();
    for (const img of images ?? []) {
      if (!imageMap.has(img.product_id)) {
        imageMap.set(img.product_id, img);
      }
    }

    const categoryMap = new Map<string, NonNullable<typeof categories>[number]>();
    for (const cat of categories ?? []) {
      categoryMap.set(cat.slug, cat);
    }

    const enriched: ProductWithImage[] = products.map((p) => {
      const img = imageMap.get(p.id) ?? null;
      const cat = p.category_id
        ? (categories?.find((c) => c.slug !== undefined) ?? null)
        : null;
      return {
        ...p,
        primary_image: img,
        category: cat,
      };
    });

    return { data: enriched, error: null };
  }, [limit]);
}

export function useFeaturedProducts(limit = 8): QueryState<ProductWithImage[]> {
  return useQuery(async () => {
    const { data: products, error } = await supabase
      .from("products")
      .select("id, name, slug, description, price, compare_at_price, currency, category_id, is_archived, is_featured, sort_order, created_at")
      .eq("is_archived", false)
      .eq("is_featured", true)
      .order("sort_order", { ascending: true })
      .limit(limit);

    if (error) return { data: null, error: error.message };
    if (!products || products.length === 0) return { data: [], error: null };

    const productIds = products.map((p) => p.id);
    const { data: images } = await supabase
      .from("product_images")
      .select("id, product_id, url, alt_text, sort_order, is_primary")
      .in("product_id", productIds)
      .order("is_primary", { ascending: false })
      .order("sort_order", { ascending: true });

    const imageMap = new Map<string, NonNullable<typeof images>[number]>();
    for (const img of images ?? []) {
      if (!imageMap.has(img.product_id)) {
        imageMap.set(img.product_id, img);
      }
    }

    const enriched: ProductWithImage[] = products.map((p) => ({
      ...p,
      primary_image: imageMap.get(p.id) ?? null,
      category: null,
    }));

    return { data: enriched, error: null };
  }, [limit]);
}

export function useBestSellers(limit = 8): QueryState<BestSeller[]> {
  return useQuery(async () => {
    const { data, error } = await supabase
      .from("order_items")
      .select(`
        product_id,
        quantity,
        product:products!inner (
          id, name, slug, price, currency, is_archived, is_featured
        )
      `)
      .limit(500);

    if (error) return { data: null, error: error.message };
    if (!data || data.length === 0) return { data: [], error: null };

    const salesMap = new Map<string, { total: number; product: BestSeller }>();
    for (const item of data) {
      const product = item.product as unknown as {
        id: string;
        name: string;
        slug: string;
        price: number;
        currency: string;
        is_archived: boolean;
        is_featured: boolean;
      };
      if (product.is_archived) continue;
      const existing = salesMap.get(product.id);
      if (existing) {
        existing.total += item.quantity;
      } else {
        salesMap.set(product.id, {
          total: item.quantity,
          product: {
            product_id: product.id,
            total_sold: 0,
            name: product.name,
            slug: product.slug,
            price: product.price,
            currency: product.currency,
            is_featured: product.is_featured,
          },
        });
      }
    }

    const sorted = Array.from(salesMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, limit)
      .map((entry) => ({
        ...entry.product,
        total_sold: entry.total,
      }));

    return { data: sorted, error: null };
  }, [limit]);
}

export function usePromoProducts(limit = 8): QueryState<ProductWithImage[]> {
  return useQuery(async () => {
    const { data: products, error } = await supabase
      .from("products")
      .select("id, name, slug, description, price, compare_at_price, currency, category_id, is_archived, is_featured, sort_order, created_at")
      .eq("is_archived", false)
      .not("compare_at_price", "is", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return { data: null, error: error.message };
    if (!products || products.length === 0) return { data: [], error: null };

    const productIds = products.map((p) => p.id);
    const { data: images } = await supabase
      .from("product_images")
      .select("id, product_id, url, alt_text, sort_order, is_primary")
      .in("product_id", productIds)
      .order("is_primary", { ascending: false })
      .order("sort_order", { ascending: true });

    const imageMap = new Map<string, NonNullable<typeof images>[number]>();
    for (const img of images ?? []) {
      if (!imageMap.has(img.product_id)) {
        imageMap.set(img.product_id, img);
      }
    }

    const enriched: ProductWithImage[] = products.map((p) => ({
      ...p,
      primary_image: imageMap.get(p.id) ?? null,
      category: null,
    }));

    return { data: enriched, error: null };
  }, [limit]);
}

export function useCollections(limit = 6): QueryState<Collection[]> {
  return useQuery(async () => {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("collections")
      .select("id, name, slug, description, image_url, is_active, starts_at, ends_at")
      .eq("is_active", true)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  }, [limit]);
}
