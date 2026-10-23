import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { ProductCard, Skeleton, EmptyState, ErrorState, Button, Breadcrumb } from "@/components/ui";
import { SEO } from "@/components/SEO";
import type { ProductWithImage } from "@/lib/db-types";
import type { ProductCardData } from "@/components/ui";

export default function FavoritesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [favoriteProducts, setFavoriteProducts] = useState<ProductWithImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFavorites = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: favs, error: favErr } = await supabase
        .from("favorites")
        .select("product_id")
        .eq("user_id", user.id);

      if (favErr) throw favErr;
      if (!favs || favs.length === 0) {
        setFavoriteProducts([]);
        return;
      }

      const productIds = favs.map((f) => f.product_id);
      const { data: prods, error: prodErr } = await supabase
        .from("products")
        .select("id, name, slug, description, price, compare_at_price, currency, category_id, is_archived, is_featured, sort_order, created_at")
        .in("id", productIds)
        .eq("is_archived", false);

      if (prodErr) throw prodErr;
      if (!prods || prods.length === 0) {
        setFavoriteProducts([]);
        return;
      }

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

      const enriched: ProductWithImage[] = prods.map((p) => ({
        ...p,
        primary_image: imageMap.get(p.id) ?? null,
        category: null,
      }));

      setFavoriteProducts(enriched);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur de chargement";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      loadFavorites();
    }
  }, [authLoading, loadFavorites]);

  const handleToggleFavorite = async (productId: string) => {
    if (!user) return;
    setFavoriteProducts((prev) => prev.filter((p) => p.id !== productId));
    await supabase
      .from("favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("product_id", productId);
  };

  if (authLoading || isLoading) {
    return (
      <div style={{ maxWidth: "var(--max-width)", margin: "0 auto", padding: "var(--space-8) var(--space-5)" }}>
        <h1 style={{ fontFamily: "var(--font-display)", textTransform: "uppercase", marginBottom: "var(--space-6)" }}>
          Mes Favoris
        </h1>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "var(--space-5)" }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="rect" width="100%" height="320px" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ maxWidth: "var(--max-width)", margin: "0 auto", padding: "var(--space-12) var(--space-5)", textAlign: "center" }}>
        <EmptyState
          title="Connectez-vous pour voir vos favoris"
          description="Enregistrez vos articles préférés pour les retrouver à tout moment."
          action={
            <Link to="/connexion">
              <Button variant="primary" size="md">
                Se connecter
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: "var(--max-width)", margin: "0 auto", padding: "var(--space-8) var(--space-5)" }}>
        <ErrorState
          title="Erreur"
          message={error}
          action={
            <Button variant="outline" size="sm" onClick={loadFavorites}>
              Réessayer
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "var(--max-width)", margin: "0 auto", padding: "var(--space-8) var(--space-5)" }}>
      <SEO
        title="Mes Favoris"
        description="Retrouvez toutes les pièces que vous avez enregistrées dans votre liste d'envies JACOB DE JESUS."
      />
      <Breadcrumb
        items={[
          { label: "Accueil", href: "/" },
          { label: "Favoris" },
        ]}
        style={{ marginBottom: "var(--space-5)" }}
      />
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-3xl)",
          fontWeight: "var(--weight-bold)",
          textTransform: "uppercase",
          letterSpacing: "var(--tracking-display)",
          marginBottom: "var(--space-6)",
        }}
      >
        Mes Favoris ({favoriteProducts.length})
      </h1>

      {favoriteProducts.length === 0 ? (
        <EmptyState
          title="Votre liste de favoris est vide"
          description="Explorez nos collections et appuyez sur le cœur pour enregistrer vos coups de cœur."
          action={
            <Link to="/boutique">
              <Button variant="primary" size="md">
                Explorer la boutique
              </Button>
            </Link>
          }
        />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: "var(--space-5)",
          }}
        >
          {favoriteProducts.map((p) => {
            const hasDiscount =
              p.compare_at_price != null && p.compare_at_price > p.price;
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
              sizes: [],
              badge: hasDiscount ? "sale" : null,
              isFavorite: true,
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
      )}
    </div>
  );
}
