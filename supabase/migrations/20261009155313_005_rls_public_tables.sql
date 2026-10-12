/*
# Activation de RLS et politiques — tables publiques (lecture seule pour le public)

## Tables concernées
- profiles, user_roles : accès utilisateur/admin uniquement (pas de lecture publique).
- categories : lecture publique des catégories actives, écriture admin.
- products : lecture publique des produits non archivés, écriture admin.
- product_variants : lecture publique, écriture admin.
- product_images : lecture publique, écriture admin.
- collections : lecture publique des collections actives, écriture admin.
- collection_products : lecture publique, écriture admin.
- store_settings : lecture publique, écriture admin.

## Principes
- Public (anon + authenticated) : lecture seule des données du catalogue actif.
- Admin (is_admin()) : gestion complète du catalogue et des réglages.
- user_roles : aucune écriture depuis le client, quel que soit le rôle.
- profiles : l'utilisateur lit et modifie uniquement son propre profil.

## Notes
1. Les politiques sont créées avec DROP IF EXISTS d'abord pour l'idempotence.
2. 4 politiques par table (SELECT, INSERT, UPDATE, DELETE) — pas de FOR ALL.
3. is_admin() est utilisé pour les politiques admin (SECURITY DEFINER).
*/

-- ============================================================
-- Activer RLS sur toutes les tables
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- profiles — l'utilisateur lit/modifie son profil, admin lit tout
-- ============================================================

DROP POLICY IF EXISTS "select_own_profile" ON public.profiles;
CREATE POLICY "select_own_profile" ON public.profiles FOR SELECT
  TO authenticated USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "insert_own_profile" ON public.profiles;
CREATE POLICY "insert_own_profile" ON public.profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

-- Pas d'INSERT pour anon : les profils sont créés par le trigger handle_new_user
-- L'admin ne crée pas de profils manuellement

DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;
CREATE POLICY "update_own_profile" ON public.profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Pas de DELETE sur les profils (le compte auth.users gère le cycle de vie)

-- ============================================================
-- user_roles — lecture par soi-même et admin, AUCUNE écriture client
-- ============================================================

DROP POLICY IF EXISTS "select_own_role" ON public.user_roles;
CREATE POLICY "select_own_role" ON public.user_roles FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.is_admin());

-- Aucune politique INSERT / UPDATE / DELETE pour user_roles depuis le client.
-- Les rôles sont gérés uniquement par :
-- - handle_new_user() (trigger, crée 'customer' à l'inscription)
-- - le script manuel create_owner.sql (rôle owner)
-- - le service_role (Edge Functions)

-- ============================================================
-- categories — lecture publique, écriture admin
-- ============================================================

DROP POLICY IF EXISTS "select_categories_public" ON public.categories;
CREATE POLICY "select_categories_public" ON public.categories FOR SELECT
  TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "select_categories_admin" ON public.categories;
CREATE POLICY "select_categories_admin" ON public.categories FOR SELECT
  TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "insert_categories_admin" ON public.categories;
CREATE POLICY "insert_categories_admin" ON public.categories FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "update_categories_admin" ON public.categories;
CREATE POLICY "update_categories_admin" ON public.categories FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "delete_categories_admin" ON public.categories;
CREATE POLICY "delete_categories_admin" ON public.categories FOR DELETE
  TO authenticated USING (public.is_admin());

-- ============================================================
-- products — lecture publique (non archivés), écriture admin
-- ============================================================

DROP POLICY IF EXISTS "select_products_public" ON public.products;
CREATE POLICY "select_products_public" ON public.products FOR SELECT
  TO anon, authenticated USING (is_archived = false);

DROP POLICY IF EXISTS "select_products_admin" ON public.products;
CREATE POLICY "select_products_admin" ON public.products FOR SELECT
  TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "insert_products_admin" ON public.products;
CREATE POLICY "insert_products_admin" ON public.products FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "update_products_admin" ON public.products;
CREATE POLICY "update_products_admin" ON public.products FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "delete_products_admin" ON public.products;
CREATE POLICY "delete_products_admin" ON public.products FOR DELETE
  TO authenticated USING (public.is_admin());

-- ============================================================
-- product_variants — lecture publique, écriture admin
-- ============================================================

DROP POLICY IF EXISTS "select_variants_public" ON public.product_variants;
CREATE POLICY "select_variants_public" ON public.product_variants FOR SELECT
  TO anon, authenticated USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_variants.product_id AND p.is_archived = false
    )
  );

DROP POLICY IF EXISTS "select_variants_admin" ON public.product_variants;
CREATE POLICY "select_variants_admin" ON public.product_variants FOR SELECT
  TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "insert_variants_admin" ON public.product_variants;
CREATE POLICY "insert_variants_admin" ON public.product_variants FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "update_variants_admin" ON public.product_variants;
CREATE POLICY "update_variants_admin" ON public.product_variants FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "delete_variants_admin" ON public.product_variants;
CREATE POLICY "delete_variants_admin" ON public.product_variants FOR DELETE
  TO authenticated USING (public.is_admin());

-- ============================================================
-- product_images — lecture publique, écriture admin
-- ============================================================

DROP POLICY IF EXISTS "select_images_public" ON public.product_images;
CREATE POLICY "select_images_public" ON public.product_images FOR SELECT
  TO anon, authenticated USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_images.product_id AND p.is_archived = false
    )
  );

DROP POLICY IF EXISTS "select_images_admin" ON public.product_images;
CREATE POLICY "select_images_admin" ON public.product_images FOR SELECT
  TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "insert_images_admin" ON public.product_images;
CREATE POLICY "insert_images_admin" ON public.product_images FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "update_images_admin" ON public.product_images;
CREATE POLICY "update_images_admin" ON public.product_images FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "delete_images_admin" ON public.product_images;
CREATE POLICY "delete_images_admin" ON public.product_images FOR DELETE
  TO authenticated USING (public.is_admin());

-- ============================================================
-- collections — lecture publique (actives), écriture admin
-- ============================================================

DROP POLICY IF EXISTS "select_collections_public" ON public.collections;
CREATE POLICY "select_collections_public" ON public.collections FOR SELECT
  TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "select_collections_admin" ON public.collections;
CREATE POLICY "select_collections_admin" ON public.collections FOR SELECT
  TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "insert_collections_admin" ON public.collections;
CREATE POLICY "insert_collections_admin" ON public.collections FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "update_collections_admin" ON public.collections;
CREATE POLICY "update_collections_admin" ON public.collections FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "delete_collections_admin" ON public.collections;
CREATE POLICY "delete_collections_admin" ON public.collections FOR DELETE
  TO authenticated USING (public.is_admin());

-- ============================================================
-- collection_products — lecture publique, écriture admin
-- ============================================================

DROP POLICY IF EXISTS "select_collection_products_public" ON public.collection_products;
CREATE POLICY "select_collection_products_public" ON public.collection_products FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_collection_products_admin" ON public.collection_products;
CREATE POLICY "insert_collection_products_admin" ON public.collection_products FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "update_collection_products_admin" ON public.collection_products;
CREATE POLICY "update_collection_products_admin" ON public.collection_products FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "delete_collection_products_admin" ON public.collection_products;
CREATE POLICY "delete_collection_products_admin" ON public.collection_products FOR DELETE
  TO authenticated USING (public.is_admin());

-- ============================================================
-- store_settings — lecture publique, écriture admin
-- ============================================================

DROP POLICY IF EXISTS "select_store_settings_public" ON public.store_settings;
CREATE POLICY "select_store_settings_public" ON public.store_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "update_store_settings_admin" ON public.store_settings;
CREATE POLICY "update_store_settings_admin" ON public.store_settings FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Pas d'INSERT ni DELETE sur store_settings (une seule ligne gérée par seed/init)
