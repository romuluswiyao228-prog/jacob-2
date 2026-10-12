/*
# Phase 2 — RLS : remplacer is_admin() par is_admin_aal2() — partie 2

## Tables concernées
- carts, cart_items, addresses, favorites (SELECT admin)
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
*/

-- ============================================================
-- carts — SELECT admin
-- ============================================================

DROP POLICY IF EXISTS "select_own_carts" ON public.carts;
CREATE POLICY "select_own_carts" ON public.carts FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.is_admin_aal2());

-- ============================================================
-- cart_items — SELECT admin
-- ============================================================

DROP POLICY IF EXISTS "select_own_cart_items" ON public.cart_items;
CREATE POLICY "select_own_cart_items" ON public.cart_items FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.carts c
      WHERE c.id = cart_items.cart_id AND c.user_id = auth.uid()
    ) OR public.is_admin_aal2()
  );

-- ============================================================
-- addresses — SELECT admin
-- ============================================================

DROP POLICY IF EXISTS "select_own_addresses" ON public.addresses;
CREATE POLICY "select_own_addresses" ON public.addresses FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.is_admin_aal2());

-- ============================================================
-- favorites — SELECT admin
-- ============================================================

DROP POLICY IF EXISTS "select_own_favorites" ON public.favorites;
CREATE POLICY "select_own_favorites" ON public.favorites FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.is_admin_aal2());

-- ============================================================
-- contact_messages — politiques admin
-- ============================================================

DROP POLICY IF EXISTS "select_contact_messages_admin" ON public.contact_messages;
CREATE POLICY "select_contact_messages_admin" ON public.contact_messages FOR SELECT
  TO authenticated USING (public.is_admin_aal2());

DROP POLICY IF EXISTS "update_contact_messages_admin" ON public.contact_messages;
CREATE POLICY "update_contact_messages_admin" ON public.contact_messages FOR UPDATE
  TO authenticated USING (public.is_admin_aal2()) WITH CHECK (public.is_admin_aal2());

DROP POLICY IF EXISTS "delete_contact_messages_admin" ON public.contact_messages;
CREATE POLICY "delete_contact_messages_admin" ON public.contact_messages FOR DELETE
  TO authenticated USING (public.is_admin_aal2());

-- ============================================================
-- promotions — politiques admin
-- ============================================================

DROP POLICY IF EXISTS "select_promotions_admin" ON public.promotions;
CREATE POLICY "select_promotions_admin" ON public.promotions FOR SELECT
  TO authenticated USING (public.is_admin_aal2());

DROP POLICY IF EXISTS "insert_promotions_admin" ON public.promotions;
CREATE POLICY "insert_promotions_admin" ON public.promotions FOR INSERT
  TO authenticated WITH CHECK (public.is_admin_aal2());

DROP POLICY IF EXISTS "update_promotions_admin" ON public.promotions;
CREATE POLICY "update_promotions_admin" ON public.promotions FOR UPDATE
  TO authenticated USING (public.is_admin_aal2()) WITH CHECK (public.is_admin_aal2());

DROP POLICY IF EXISTS "delete_promotions_admin" ON public.promotions;
CREATE POLICY "delete_promotions_admin" ON public.promotions FOR DELETE
  TO authenticated USING (public.is_admin_aal2());

-- ============================================================
-- orders — politiques admin
-- ============================================================

DROP POLICY IF EXISTS "select_own_orders" ON public.orders;
CREATE POLICY "select_own_orders" ON public.orders FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.is_admin_aal2());

DROP POLICY IF EXISTS "insert_orders_admin" ON public.orders;
CREATE POLICY "insert_orders_admin" ON public.orders FOR INSERT
  TO authenticated WITH CHECK (public.is_admin_aal2());

DROP POLICY IF EXISTS "update_orders_admin" ON public.orders;
CREATE POLICY "update_orders_admin" ON public.orders FOR UPDATE
  TO authenticated USING (public.is_admin_aal2()) WITH CHECK (public.is_admin_aal2());

DROP POLICY IF EXISTS "delete_orders_admin" ON public.orders;
CREATE POLICY "delete_orders_admin" ON public.orders FOR DELETE
  TO authenticated USING (public.is_admin_aal2());

-- ============================================================
-- order_items — politiques admin
-- ============================================================

DROP POLICY IF EXISTS "select_own_order_items" ON public.order_items;
CREATE POLICY "select_own_order_items" ON public.order_items FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND (o.user_id = auth.uid() OR public.is_admin_aal2())
    )
  );

DROP POLICY IF EXISTS "insert_order_items_admin" ON public.order_items;
CREATE POLICY "insert_order_items_admin" ON public.order_items FOR INSERT
  TO authenticated WITH CHECK (public.is_admin_aal2());

DROP POLICY IF EXISTS "update_order_items_admin" ON public.order_items;
CREATE POLICY "update_order_items_admin" ON public.order_items FOR UPDATE
  TO authenticated USING (public.is_admin_aal2()) WITH CHECK (public.is_admin_aal2());

DROP POLICY IF EXISTS "delete_order_items_admin" ON public.order_items;
CREATE POLICY "delete_order_items_admin" ON public.order_items FOR DELETE
  TO authenticated USING (public.is_admin_aal2());

-- ============================================================
-- order_status_history — politiques admin
-- ============================================================

DROP POLICY IF EXISTS "select_own_order_status_history" ON public.order_status_history;
CREATE POLICY "select_own_order_status_history" ON public.order_status_history FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_status_history.order_id
        AND (o.user_id = auth.uid() OR public.is_admin_aal2())
    )
  );

DROP POLICY IF EXISTS "insert_order_status_history_admin" ON public.order_status_history;
CREATE POLICY "insert_order_status_history_admin" ON public.order_status_history FOR INSERT
  TO authenticated WITH CHECK (public.is_admin_aal2());

-- ============================================================
-- payments — SELECT admin
-- ============================================================

DROP POLICY IF EXISTS "select_own_payments" ON public.payments;
CREATE POLICY "select_own_payments" ON public.payments FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = payments.order_id
        AND (o.user_id = auth.uid() OR public.is_admin_aal2())
    )
  );

-- ============================================================
-- shipping_zones — politiques admin
-- ============================================================

DROP POLICY IF EXISTS "select_shipping_zones_admin" ON public.shipping_zones;
CREATE POLICY "select_shipping_zones_admin" ON public.shipping_zones FOR SELECT
  TO authenticated USING (public.is_admin_aal2());

DROP POLICY IF EXISTS "insert_shipping_zones_admin" ON public.shipping_zones;
CREATE POLICY "insert_shipping_zones_admin" ON public.shipping_zones FOR INSERT
  TO authenticated WITH CHECK (public.is_admin_aal2());

DROP POLICY IF EXISTS "update_shipping_zones_admin" ON public.shipping_zones;
CREATE POLICY "update_shipping_zones_admin" ON public.shipping_zones FOR UPDATE
  TO authenticated USING (public.is_admin_aal2()) WITH CHECK (public.is_admin_aal2());

DROP POLICY IF EXISTS "delete_shipping_zones_admin" ON public.shipping_zones;
CREATE POLICY "delete_shipping_zones_admin" ON public.shipping_zones FOR DELETE
  TO authenticated USING (public.is_admin_aal2());

-- ============================================================
-- shipping_rates — politiques admin
-- ============================================================

DROP POLICY IF EXISTS "select_shipping_rates_admin" ON public.shipping_rates;
CREATE POLICY "select_shipping_rates_admin" ON public.shipping_rates FOR SELECT
  TO authenticated USING (public.is_admin_aal2());

DROP POLICY IF EXISTS "insert_shipping_rates_admin" ON public.shipping_rates;
CREATE POLICY "insert_shipping_rates_admin" ON public.shipping_rates FOR INSERT
  TO authenticated WITH CHECK (public.is_admin_aal2());

DROP POLICY IF EXISTS "update_shipping_rates_admin" ON public.shipping_rates;
CREATE POLICY "update_shipping_rates_admin" ON public.shipping_rates FOR UPDATE
  TO authenticated USING (public.is_admin_aal2()) WITH CHECK (public.is_admin_aal2());

DROP POLICY IF EXISTS "delete_shipping_rates_admin" ON public.shipping_rates;
CREATE POLICY "delete_shipping_rates_admin" ON public.shipping_rates FOR DELETE
  TO authenticated USING (public.is_admin_aal2());

-- ============================================================
-- shipments — politiques admin
-- ============================================================

DROP POLICY IF EXISTS "select_own_shipments" ON public.shipments;
CREATE POLICY "select_own_shipments" ON public.shipments FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = shipments.order_id
        AND (o.user_id = auth.uid() OR public.is_admin_aal2())
    )
  );

DROP POLICY IF EXISTS "insert_shipments_admin" ON public.shipments;
CREATE POLICY "insert_shipments_admin" ON public.shipments FOR INSERT
  TO authenticated WITH CHECK (public.is_admin_aal2());

DROP POLICY IF EXISTS "update_shipments_admin" ON public.shipments;
CREATE POLICY "update_shipments_admin" ON public.shipments FOR UPDATE
  TO authenticated USING (public.is_admin_aal2()) WITH CHECK (public.is_admin_aal2());

DROP POLICY IF EXISTS "delete_shipments_admin" ON public.shipments;
CREATE POLICY "delete_shipments_admin" ON public.shipments FOR DELETE
  TO authenticated USING (public.is_admin_aal2());

-- ============================================================
-- stock_reservations — SELECT admin
-- ============================================================

DROP POLICY IF EXISTS "select_stock_reservations_admin" ON public.stock_reservations;
CREATE POLICY "select_stock_reservations_admin" ON public.stock_reservations FOR SELECT
  TO authenticated USING (public.is_admin_aal2());

-- ============================================================
-- admin_audit_log — SELECT admin
-- ============================================================

DROP POLICY IF EXISTS "select_admin_audit_log" ON public.admin_audit_log;
CREATE POLICY "select_admin_audit_log" ON public.admin_audit_log FOR SELECT
  TO authenticated USING (public.is_admin_aal2());

-- ============================================================
-- Storage — mettre à jour les politiques avec is_admin_aal2
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
