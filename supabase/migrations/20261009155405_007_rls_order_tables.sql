/*
# RLS — tables de commandes, paiements, livraison, stock, audit

## Tables concernées
- orders : le client lit ses propres commandes ; admin lit/gère tout.
  INSERT/UPDATE/DELETE réservés à admin et Edge Functions (service_role).
- order_items : lecture via la propriété de la commande parent.
- order_status_history : lecture via la commande parent ; écriture admin uniquement.
- payments : lecture via la commande parent ; écriture réservée au service_role.
  Aucune politique INSERT/UPDATE/DELETE pour le client.
- shipping_zones, shipping_rates : lecture publique, écriture admin.
- shipments : lecture via la commande parent ; écriture admin.
- stock_reservations : pas d'accès client (gestion interne). Admin en lecture.
- admin_audit_log : admin uniquement.

## Principes
- Client : lit uniquement ses commandes, lignes, paiements et expéditions.
  Aucune écriture directe sur prix, stock, paiements, statuts de commande.
- Invité : aucun accès direct aux tables de commandes (via Edge Function avec guest_token).
- Admin : gestion des commandes, expéditions, statuts.
- Les écritures de paiement restent réservées au service_role côté Edge Functions.
*/

-- ============================================================
-- Activer RLS
-- ============================================================

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- orders — lecture client (ses commandes) + admin (tout)
-- ============================================================

DROP POLICY IF EXISTS "select_own_orders" ON public.orders;
CREATE POLICY "select_own_orders" ON public.orders FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.is_admin());

-- INSERT/UPDATE/DELETE : admin uniquement (la création de commande
-- se fera via Edge Function avec service_role en phase 4)
DROP POLICY IF EXISTS "insert_orders_admin" ON public.orders;
CREATE POLICY "insert_orders_admin" ON public.orders FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "update_orders_admin" ON public.orders;
CREATE POLICY "update_orders_admin" ON public.orders FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "delete_orders_admin" ON public.orders;
CREATE POLICY "delete_orders_admin" ON public.orders FOR DELETE
  TO authenticated USING (public.is_admin());

-- ============================================================
-- order_items — lecture via la commande parent
-- ============================================================

DROP POLICY IF EXISTS "select_own_order_items" ON public.order_items;
CREATE POLICY "select_own_order_items" ON public.order_items FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND (o.user_id = auth.uid() OR public.is_admin())
    )
  );

-- INSERT/UPDATE/DELETE : admin uniquement
DROP POLICY IF EXISTS "insert_order_items_admin" ON public.order_items;
CREATE POLICY "insert_order_items_admin" ON public.order_items FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "update_order_items_admin" ON public.order_items;
CREATE POLICY "update_order_items_admin" ON public.order_items FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "delete_order_items_admin" ON public.order_items;
CREATE POLICY "delete_order_items_admin" ON public.order_items FOR DELETE
  TO authenticated USING (public.is_admin());

-- ============================================================
-- order_status_history — lecture via commande parent, écriture admin
-- ============================================================

DROP POLICY IF EXISTS "select_own_order_status_history" ON public.order_status_history;
CREATE POLICY "select_own_order_status_history" ON public.order_status_history FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_status_history.order_id
        AND (o.user_id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "insert_order_status_history_admin" ON public.order_status_history;
CREATE POLICY "insert_order_status_history_admin" ON public.order_status_history FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

-- ============================================================
-- payments — lecture via commande parent, AUCUNE écriture client
-- ============================================================

DROP POLICY IF EXISTS "select_own_payments" ON public.payments;
CREATE POLICY "select_own_payments" ON public.payments FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = payments.order_id
        AND (o.user_id = auth.uid() OR public.is_admin())
    )
  );

-- Aucune politique INSERT/UPDATE/DELETE pour les paiements depuis le client.
-- Les paiements sont gérés uniquement par le service_role via Edge Functions.

-- ============================================================
-- shipping_zones — lecture publique, écriture admin
-- ============================================================

DROP POLICY IF EXISTS "select_shipping_zones_public" ON public.shipping_zones;
CREATE POLICY "select_shipping_zones_public" ON public.shipping_zones FOR SELECT
  TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "select_shipping_zones_admin" ON public.shipping_zones;
CREATE POLICY "select_shipping_zones_admin" ON public.shipping_zones FOR SELECT
  TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "insert_shipping_zones_admin" ON public.shipping_zones;
CREATE POLICY "insert_shipping_zones_admin" ON public.shipping_zones FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "update_shipping_zones_admin" ON public.shipping_zones;
CREATE POLICY "update_shipping_zones_admin" ON public.shipping_zones FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "delete_shipping_zones_admin" ON public.shipping_zones;
CREATE POLICY "delete_shipping_zones_admin" ON public.shipping_zones FOR DELETE
  TO authenticated USING (public.is_admin());

-- ============================================================
-- shipping_rates — lecture publique, écriture admin
-- ============================================================

DROP POLICY IF EXISTS "select_shipping_rates_public" ON public.shipping_rates;
CREATE POLICY "select_shipping_rates_public" ON public.shipping_rates FOR SELECT
  TO anon, authenticated USING (
    EXISTS (
      SELECT 1 FROM public.shipping_zones z
      WHERE z.id = shipping_rates.zone_id AND z.is_active = true
    )
  );

DROP POLICY IF EXISTS "select_shipping_rates_admin" ON public.shipping_rates;
CREATE POLICY "select_shipping_rates_admin" ON public.shipping_rates FOR SELECT
  TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "insert_shipping_rates_admin" ON public.shipping_rates;
CREATE POLICY "insert_shipping_rates_admin" ON public.shipping_rates FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "update_shipping_rates_admin" ON public.shipping_rates;
CREATE POLICY "update_shipping_rates_admin" ON public.shipping_rates FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "delete_shipping_rates_admin" ON public.shipping_rates;
CREATE POLICY "delete_shipping_rates_admin" ON public.shipping_rates FOR DELETE
  TO authenticated USING (public.is_admin());

-- ============================================================
-- shipments — lecture via commande parent, écriture admin
-- ============================================================

DROP POLICY IF EXISTS "select_own_shipments" ON public.shipments;
CREATE POLICY "select_own_shipments" ON public.shipments FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = shipments.order_id
        AND (o.user_id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "insert_shipments_admin" ON public.shipments;
CREATE POLICY "insert_shipments_admin" ON public.shipments FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "update_shipments_admin" ON public.shipments;
CREATE POLICY "update_shipments_admin" ON public.shipments FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "delete_shipments_admin" ON public.shipments;
CREATE POLICY "delete_shipments_admin" ON public.shipments FOR DELETE
  TO authenticated USING (public.is_admin());

-- ============================================================
-- stock_reservations — admin en lecture uniquement (gestion interne)
-- ============================================================

DROP POLICY IF EXISTS "select_stock_reservations_admin" ON public.stock_reservations;
CREATE POLICY "select_stock_reservations_admin" ON public.stock_reservations FOR SELECT
  TO authenticated USING (public.is_admin());

-- INSERT/UPDATE/DELETE via service_role uniquement (Edge Functions)

-- ============================================================
-- admin_audit_log — admin en lecture uniquement
-- ============================================================

DROP POLICY IF EXISTS "select_admin_audit_log" ON public.admin_audit_log;
CREATE POLICY "select_admin_audit_log" ON public.admin_audit_log FOR SELECT
  TO authenticated USING (public.is_admin());

-- INSERT via service_role uniquement (Edge Functions / triggers)
