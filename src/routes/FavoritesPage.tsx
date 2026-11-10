import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { ProductCard, Skeleton, EmptyState, ErrorState, Button } from "@/components/ui";
import { AccountLayout } from "@/components/account/AccountLayout";
import { SEO } from "@/components/SEO";
import type { ProductWithImage } from "@/lib/db-types";
import type { ProductCardData } from "@/components/ui";
import styles from "./FavoritesPage.module.css";

export default function FavoritesPage() {
  const { t } = useTranslation();
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

  const breadcrumbs = [
    { label: t("common.home", "Accueil"), href: "/" },
    { label: t("account.title", "Mon compte"), href: "/compte" },
    { label: t("account.favoritesTitle", "Favoris") },
  ];

  return (
    <AccountLayout
      title={t("account.favoritesTitle", "Favoris")}
      subtitle={
        favoriteProducts.length > 0
          ? `${favoriteProducts.length} pièce${favoriteProducts.length > 1 ? "s" : ""} enregistrée${favoriteProducts.length > 1 ? "s" : ""}`
          : undefined
      }
      breadcrumbItems={breadcrumbs}
    >
      <SEO
        title={t("account.favoritesTitle", "Favoris")}
        description="Retrouvez toutes les pièces que vous avez enregistrées dans votre liste d'envies JACOB DE JESUS."
      />

      {authLoading || isLoading ? (
        <div className={styles.skeletons}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="rect" width="100%" height="340px" />
          ))}
        </div>
      ) : !user ? (
        <EmptyState
          title={t("auth.loginTitle", "Connexion requise")}
          description={t("account.noFavoritesDesc", "Connectez-vous pour retrouver et gérer vos pièces favorites.")}
          action={
            <Link to="/connexion">
              <Button variant="primary" size="md">
                {t("auth.signInLink", "Se connecter")}
              </Button>
            </Link>
          }
        />
      ) : error ? (
        <ErrorState
          title="Erreur"
          message={error}
          action={
            <Button variant="outline" size="sm" onClick={loadFavorites}>
              {t("common.retry", "Réessayer")}
            </Button>
          }
        />
      ) : favoriteProducts.length === 0 ? (
        <EmptyState
          title={t("account.noFavorites", "Aucun favori")}
          description={t("account.noFavoritesDesc", "Vous n'avez pas encore ajouté de pièces à vos favoris.")}
          action={
            <Link to="/boutique">
              <Button variant="primary" size="md">
                {t("cart.goToShop", "DÉCOUVRIR LA BOUTIQUE")}
              </Button>
            </Link>
          }
        />
      ) : (
        <div className={styles.grid}>
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
    </AccountLayout>
  );
}
