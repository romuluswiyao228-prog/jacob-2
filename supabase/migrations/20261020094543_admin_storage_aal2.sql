/*
# Migration admin_storage_aal2 — Politiques d'écriture storage avec is_admin_aal2()

Remplace is_admin() par is_admin_aal2() pour l'écriture (INSERT, UPDATE, DELETE)
sur les buckets 'product-images' et 'store-assets'.
*/

-- ============================================================
-- Politiques — product-images
-- ============================================================

DROP POLICY IF EXISTS "insert_product_images_admin" ON storage.objects;
CREATE POLICY "insert_product_images_admin" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (
    bucket_id = 'product-images' AND public.is_admin_aal2()
  );

DROP POLICY IF EXISTS "update_product_images_admin" ON storage.objects;
CREATE POLICY "update_product_images_admin" ON storage.objects FOR UPDATE
  TO authenticated USING (
    bucket_id = 'product-images' AND public.is_admin_aal2()
  ) WITH CHECK (
    bucket_id = 'product-images' AND public.is_admin_aal2()
  );

DROP POLICY IF EXISTS "delete_product_images_admin" ON storage.objects;
CREATE POLICY "delete_product_images_admin" ON storage.objects FOR DELETE
  TO authenticated USING (
    bucket_id = 'product-images' AND public.is_admin_aal2()
  );

-- ============================================================
-- Politiques — store-assets
-- ============================================================

DROP POLICY IF EXISTS "insert_store_assets_admin" ON storage.objects;
CREATE POLICY "insert_store_assets_admin" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (
    bucket_id = 'store-assets' AND public.is_admin_aal2()
  );

DROP POLICY IF EXISTS "update_store_assets_admin" ON storage.objects;
CREATE POLICY "update_store_assets_admin" ON storage.objects FOR UPDATE
  TO authenticated USING (
    bucket_id = 'store-assets' AND public.is_admin_aal2()
  ) WITH CHECK (
    bucket_id = 'store-assets' AND public.is_admin_aal2()
  );

DROP POLICY IF EXISTS "delete_store_assets_admin" ON storage.objects;
CREATE POLICY "delete_store_assets_admin" ON storage.objects FOR DELETE
  TO authenticated USING (
    bucket_id = 'store-assets' AND public.is_admin_aal2()
  );
