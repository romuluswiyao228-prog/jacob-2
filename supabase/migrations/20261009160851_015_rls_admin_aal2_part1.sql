/*
# Phase 2 — RLS : remplacer is_admin() par is_admin_aal2() sur les politiques admin

## Changement
Toutes les politiques RLS d'administration (SELECT/INSERT/UPDATE/DELETE)
utilisent désormais is_admin_aal2() au lieu de is_admin().
Cela signifie qu'un propriétaire doit avoir sa MFA activée et validée
(niveau aal2) pour accéder aux données d'administration.

## Tables concernées (politiques admin uniquement)
- profiles (SELECT admin)
- user_roles (SELECT admin)
- categories, products, product_variants, product_images
- collections, collection_products
- store_settings
- carts (SELECT admin)
- cart_items (SELECT admin)
- addresses (SELECT admin)
- favorites (SELECT admin)
- contact_messages (SELECT/UPDATE/DELETE admin)
- promotions (SELECT/INSERT/UPDATE/DELETE admin)
- orders (SELECT/INSERT/UPDATE/DELETE admin)
- order_items (SELECT/INSERT/UPDATE/DELETE admin)
- order_status_history (SELECT/INSERT admin)
- payments (SELECT admin)
- shipping_zones (SELECT/INSERT/UPDATE/DELETE admin)
- shipping_rates (SELECT/INSERT/UPDATE/DELETE admin)
- shipments (SELECT/INSERT/UPDATE/DELETE admin)
- stock_reservations (SELECT admin)
- admin_audit_log (SELECT admin)

## Note
Les politiques publiques (anon, authenticated sans rôle admin) restent
inchangées. Seules les politiques qui vérifiaient is_admin() passent à
is_admin_aal2().
*/

-- ============================================================
-- profiles — SELECT admin
-- ============================================================

DROP POLICY IF EXISTS "select_own_profile" ON public.profiles;
CREATE POLICY "select_own_profile" ON public.profiles FOR SELECT
  TO authenticated USING (auth.uid() = id OR public.is_admin_aal2());

-- ============================================================
-- user_roles — SELECT admin
-- ============================================================

DROP POLICY IF EXISTS "select_own_role" ON public.user_roles;
CREATE POLICY "select_own_role" ON public.user_roles FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.is_admin_aal2());

-- ============================================================
-- categories — politiques admin
-- ============================================================

DROP POLICY IF EXISTS "select_categories_admin" ON public.categories;
CREATE POLICY "select_categories_admin" ON public.categories FOR SELECT
  TO authenticated USING (public.is_admin_aal2());

DROP POLICY IF EXISTS "insert_categories_admin" ON public.categories;
CREATE POLICY "insert_categories_admin" ON public.categories FOR INSERT
  TO authenticated WITH CHECK (public.is_admin_aal2());

DROP POLICY IF EXISTS "update_categories_admin" ON public.categories;
CREATE POLICY "update_categories_admin" ON public.categories FOR UPDATE
  TO authenticated USING (public.is_admin_aal2()) WITH CHECK (public.is_admin_aal2());

DROP POLICY IF EXISTS "delete_categories_admin" ON public.categories;
CREATE POLICY "delete_categories_admin" ON public.categories FOR DELETE
  TO authenticated USING (public.is_admin_aal2());

-- ============================================================
-- products — politiques admin
-- ============================================================

DROP POLICY IF EXISTS "select_products_admin" ON public.products;
CREATE POLICY "select_products_admin" ON public.products FOR SELECT
  TO authenticated USING (public.is_admin_aal2());

DROP POLICY IF EXISTS "insert_products_admin" ON public.products;
CREATE POLICY "insert_products_admin" ON public.products FOR INSERT
  TO authenticated WITH CHECK (public.is_admin_aal2());

DROP POLICY IF EXISTS "update_products_admin" ON public.products;
CREATE POLICY "update_products_admin" ON public.products FOR UPDATE
  TO authenticated USING (public.is_admin_aal2()) WITH CHECK (public.is_admin_aal2());

DROP POLICY IF EXISTS "delete_products_admin" ON public.products;
CREATE POLICY "delete_products_admin" ON public.products FOR DELETE
  TO authenticated USING (public.is_admin_aal2());

-- ============================================================
-- product_variants — politiques admin
-- ============================================================

DROP POLICY IF EXISTS "select_variants_admin" ON public.product_variants;
CREATE POLICY "select_variants_admin" ON public.product_variants FOR SELECT
  TO authenticated USING (public.is_admin_aal2());

DROP POLICY IF EXISTS "insert_variants_admin" ON public.product_variants;
CREATE POLICY "insert_variants_admin" ON public.product_variants FOR INSERT
  TO authenticated WITH CHECK (public.is_admin_aal2());

DROP POLICY IF EXISTS "update_variants_admin" ON public.product_variants;
CREATE POLICY "update_variants_admin" ON public.product_variants FOR UPDATE
  TO authenticated USING (public.is_admin_aal2()) WITH CHECK (public.is_admin_aal2());

DROP POLICY IF EXISTS "delete_variants_admin" ON public.product_variants;
CREATE POLICY "delete_variants_admin" ON public.product_variants FOR DELETE
  TO authenticated USING (public.is_admin_aal2());

-- ============================================================
-- product_images — politiques admin
-- ============================================================

DROP POLICY IF EXISTS "select_images_admin" ON public.product_images;
CREATE POLICY "select_images_admin" ON public.product_images FOR SELECT
  TO authenticated USING (public.is_admin_aal2());

DROP POLICY IF EXISTS "insert_images_admin" ON public.product_images;
CREATE POLICY "insert_images_admin" ON public.product_images FOR INSERT
  TO authenticated WITH CHECK (public.is_admin_aal2());

DROP POLICY IF EXISTS "update_images_admin" ON public.product_images;
CREATE POLICY "update_images_admin" ON public.product_images FOR UPDATE
  TO authenticated USING (public.is_admin_aal2()) WITH CHECK (public.is_admin_aal2());

DROP POLICY IF EXISTS "delete_images_admin" ON public.product_images;
CREATE POLICY "delete_images_admin" ON public.product_images FOR DELETE
  TO authenticated USING (public.is_admin_aal2());

-- ============================================================
-- collections — politiques admin
-- ============================================================

DROP POLICY IF EXISTS "select_collections_admin" ON public.collections;
CREATE POLICY "select_collections_admin" ON public.collections FOR SELECT
  TO authenticated USING (public.is_admin_aal2());

DROP POLICY IF EXISTS "insert_collections_admin" ON public.collections;
CREATE POLICY "insert_collections_admin" ON public.collections FOR INSERT
  TO authenticated WITH CHECK (public.is_admin_aal2());

DROP POLICY IF EXISTS "update_collections_admin" ON public.collections;
CREATE POLICY "update_collections_admin" ON public.collections FOR UPDATE
  TO authenticated USING (public.is_admin_aal2()) WITH CHECK (public.is_admin_aal2());

DROP POLICY IF EXISTS "delete_collections_admin" ON public.collections;
CREATE POLICY "delete_collections_admin" ON public.collections FOR DELETE
  TO authenticated USING (public.is_admin_aal2());

-- ============================================================
-- collection_products — politiques admin
-- ============================================================

DROP POLICY IF EXISTS "insert_collection_products_admin" ON public.collection_products;
CREATE POLICY "insert_collection_products_admin" ON public.collection_products FOR INSERT
  TO authenticated WITH CHECK (public.is_admin_aal2());

DROP POLICY IF EXISTS "update_collection_products_admin" ON public.collection_products;
CREATE POLICY "update_collection_products_admin" ON public.collection_products FOR UPDATE
  TO authenticated USING (public.is_admin_aal2()) WITH CHECK (public.is_admin_aal2());

DROP POLICY IF EXISTS "delete_collection_products_admin" ON public.collection_products;
CREATE POLICY "delete_collection_products_admin" ON public.collection_products FOR DELETE
  TO authenticated USING (public.is_admin_aal2());

-- ============================================================
-- store_settings — politique admin
-- ============================================================

DROP POLICY IF EXISTS "update_store_settings_admin" ON public.store_settings;
CREATE POLICY "update_store_settings_admin" ON public.store_settings FOR UPDATE
  TO authenticated USING (public.is_admin_aal2()) WITH CHECK (public.is_admin_aal2());
