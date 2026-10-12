/*
# Buckets de stockage — product-images et store-assets

## Buckets créés
- `product-images` : images des produits (lecture publique, écriture admin).
- `store-assets` : assets de la boutique — logo, bannières, etc. (lecture publique, écriture admin).

## Politiques de stockage
- Lecture publique (anon + authenticated) sur les deux buckets.
- Écriture réservée à l'admin (is_admin()) sur les deux buckets.
*/

-- ============================================================
-- Création des buckets
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('store-assets', 'store-assets', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Politiques — product-images
-- ============================================================

DROP POLICY IF EXISTS "select_product_images_public" ON storage.objects;
CREATE POLICY "select_product_images_public" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "insert_product_images_admin" ON storage.objects;
CREATE POLICY "insert_product_images_admin" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (
    bucket_id = 'product-images' AND public.is_admin()
  );

DROP POLICY IF EXISTS "update_product_images_admin" ON storage.objects;
CREATE POLICY "update_product_images_admin" ON storage.objects FOR UPDATE
  TO authenticated USING (
    bucket_id = 'product-images' AND public.is_admin()
  ) WITH CHECK (
    bucket_id = 'product-images' AND public.is_admin()
  );

DROP POLICY IF EXISTS "delete_product_images_admin" ON storage.objects;
CREATE POLICY "delete_product_images_admin" ON storage.objects FOR DELETE
  TO authenticated USING (
    bucket_id = 'product-images' AND public.is_admin()
  );

-- ============================================================
-- Politiques — store-assets
-- ============================================================

DROP POLICY IF EXISTS "select_store_assets_public" ON storage.objects;
CREATE POLICY "select_store_assets_public" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'store-assets');

DROP POLICY IF EXISTS "insert_store_assets_admin" ON storage.objects;
CREATE POLICY "insert_store_assets_admin" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (
    bucket_id = 'store-assets' AND public.is_admin()
  );

DROP POLICY IF EXISTS "update_store_assets_admin" ON storage.objects;
CREATE POLICY "update_store_assets_admin" ON storage.objects FOR UPDATE
  TO authenticated USING (
    bucket_id = 'store-assets' AND public.is_admin()
  ) WITH CHECK (
    bucket_id = 'store-assets' AND public.is_admin()
  );

DROP POLICY IF EXISTS "delete_store_assets_admin" ON storage.objects;
CREATE POLICY "delete_store_assets_admin" ON storage.objects FOR DELETE
  TO authenticated USING (
    bucket_id = 'store-assets' AND public.is_admin()
  );
