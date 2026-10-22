/*
# Migration admin_commandes

## Fonctions SECURITY DEFINER créées
1. admin_update_order_status(order_id, new_status, note)
   Transitions autorisées :
     pending      → confirmed, cancelled, on_hold
     confirmed    → processing, cancelled, on_hold
     processing   → shipped, cancelled, on_hold
     shipped      → delivered, on_hold
     delivered    → refunded
     on_hold      → confirmed, cancelled
     cancelled    → (aucune)
     refunded     → (aucune)
   Ajoute une ligne dans order_status_history.
   Si new_status = 'cancelled', remet le stock en place (product_variants.stock)
   dans la même transaction. Écrit dans admin_audit_log.

2. admin_mark_cod_paid(order_id, payment_reference)
   Passe le paiement COD au statut 'paid'. Écrit dans admin_audit_log.

3. admin_set_shipment(order_id, carrier, tracking_number, shipment_status)
   Upsert sur shipments. Écrit dans admin_audit_log.

4. admin_dashboard_stats(date_from, date_to)
   Renvoie orders_count, pending_count, paid_count,
   sales_total (XOF), new_customers, top_products (jsonb).

## Sécurité
- Toutes les fonctions vérifient is_admin_aal2() en tête.
- SECURITY DEFINER, search_path = public, pg_temp.
*/

-- ============================================================
-- 1. admin_update_order_status
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_update_order_status(
  p_order_id   uuid,
  p_new_status order_status,
  p_note       text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current_status order_status;
  v_allowed        boolean := false;
BEGIN
  IF NOT public.is_admin_aal2() THEN
    RAISE EXCEPTION 'Accès refusé : authentification MFA (aal2) requise';
  END IF;

  SELECT status INTO v_current_status
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commande introuvable : %', p_order_id;
  END IF;

  v_allowed := CASE v_current_status
    WHEN 'pending'::order_status    THEN p_new_status IN ('confirmed', 'cancelled', 'on_hold')
    WHEN 'confirmed'::order_status  THEN p_new_status IN ('processing', 'cancelled', 'on_hold')
    WHEN 'processing'::order_status THEN p_new_status IN ('shipped', 'cancelled', 'on_hold')
    WHEN 'shipped'::order_status    THEN p_new_status IN ('delivered', 'on_hold')
    WHEN 'delivered'::order_status  THEN p_new_status IN ('refunded')
    WHEN 'on_hold'::order_status    THEN p_new_status IN ('confirmed', 'cancelled')
    ELSE false
  END;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Transition interdite : % -> %', v_current_status, p_new_status;
  END IF;

  UPDATE public.orders
  SET status = p_new_status, updated_at = now()
  WHERE id = p_order_id;

  INSERT INTO public.order_status_history (order_id, status, changed_by, note)
  VALUES (p_order_id, p_new_status, auth.uid(), p_note);

  -- Annulation : remettre le stock en place
  IF p_new_status = 'cancelled'::order_status THEN
    UPDATE public.product_variants pv
    SET stock = pv.stock + oi.quantity
    FROM public.order_items oi
    WHERE oi.order_id = p_order_id
      AND oi.variant_id = pv.id;
  END IF;

  INSERT INTO public.admin_audit_log (admin_id, action, table_name, record_id, old_values, new_values)
  VALUES (
    auth.uid(),
    'update_order_status',
    'orders',
    p_order_id::text,
    jsonb_build_object('status', v_current_status),
    jsonb_build_object('status', p_new_status, 'note', p_note)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_update_order_status(uuid, order_status, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_update_order_status(uuid, order_status, text) TO authenticated;

-- ============================================================
-- 2. admin_mark_cod_paid
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_mark_cod_paid(
  p_order_id          uuid,
  p_payment_reference text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_payment_id uuid;
BEGIN
  IF NOT public.is_admin_aal2() THEN
    RAISE EXCEPTION 'Accès refusé : authentification MFA (aal2) requise';
  END IF;

  SELECT id INTO v_payment_id
  FROM public.payments
  WHERE order_id = p_order_id
    AND method = 'cash_on_delivery'::payment_method
    AND status = 'pending'::payment_status
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aucun paiement COD en attente pour la commande %', p_order_id;
  END IF;

  UPDATE public.payments
  SET
    status             = 'paid'::payment_status,
    provider_reference = p_payment_reference,
    updated_at         = now()
  WHERE id = v_payment_id;

  INSERT INTO public.admin_audit_log (admin_id, action, table_name, record_id, old_values, new_values)
  VALUES (
    auth.uid(),
    'mark_cod_paid',
    'payments',
    v_payment_id::text,
    jsonb_build_object('status', 'pending'),
    jsonb_build_object('status', 'paid', 'provider_reference', p_payment_reference)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_mark_cod_paid(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_mark_cod_paid(uuid, text) TO authenticated;

-- ============================================================
-- 3. admin_set_shipment
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_set_shipment(
  p_order_id        uuid,
  p_carrier         text,
  p_tracking_number text,
  p_status          shipment_status
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_shipment_id  uuid;
  v_shipped_at   timestamptz;
  v_delivered_at timestamptz;
BEGIN
  IF NOT public.is_admin_aal2() THEN
    RAISE EXCEPTION 'Accès refusé : authentification MFA (aal2) requise';
  END IF;

  v_shipped_at   := CASE WHEN p_status IN ('shipped', 'in_transit', 'out_for_delivery', 'delivered') THEN now() ELSE NULL END;
  v_delivered_at := CASE WHEN p_status = 'delivered' THEN now() ELSE NULL END;

  SELECT id INTO v_shipment_id
  FROM public.shipments
  WHERE order_id = p_order_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.shipments
    SET
      carrier         = p_carrier,
      tracking_number = p_tracking_number,
      status          = p_status,
      shipped_at      = COALESCE(shipped_at, v_shipped_at),
      delivered_at    = COALESCE(v_delivered_at, delivered_at),
      updated_at      = now()
    WHERE id = v_shipment_id;
  ELSE
    INSERT INTO public.shipments (order_id, carrier, tracking_number, status, shipped_at, delivered_at)
    VALUES (p_order_id, p_carrier, p_tracking_number, p_status, v_shipped_at, v_delivered_at)
    RETURNING id INTO v_shipment_id;
  END IF;

  INSERT INTO public.admin_audit_log (admin_id, action, table_name, record_id, new_values)
  VALUES (
    auth.uid(),
    'set_shipment',
    'shipments',
    v_shipment_id::text,
    jsonb_build_object(
      'carrier', p_carrier,
      'tracking_number', p_tracking_number,
      'status', p_status
    )
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_set_shipment(uuid, text, text, shipment_status) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_set_shipment(uuid, text, text, shipment_status) TO authenticated;

-- ============================================================
-- 4. admin_dashboard_stats(date_from, date_to)
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_dashboard_stats(
  p_date_from timestamptz DEFAULT (now() - interval '30 days'),
  p_date_to   timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_orders_count              bigint;
  v_pending_count             bigint;
  v_paid_count                bigint;
  v_orders_amount_total       bigint;
  v_payments_confirmed_total  bigint;
  v_cancelled_refunded_count  bigint;
  v_cancelled_refunded_total  bigint;
  v_shipping_fees_total       bigint;
  v_new_customers             bigint;
  v_top_products              jsonb;
  v_low_stock_products        jsonb;
  v_recent_orders             jsonb;
BEGIN
  IF NOT public.is_admin_aal2() THEN
    RAISE EXCEPTION 'Accès refusé : authentification MFA (aal2) requise';
  END IF;

  -- 1. Nombre total de commandes sur la période
  SELECT COUNT(*) INTO v_orders_count
  FROM public.orders
  WHERE created_at BETWEEN p_date_from AND p_date_to;

  -- 2. Commandes en attente ou en cours
  SELECT COUNT(*) INTO v_pending_count
  FROM public.orders
  WHERE status IN ('pending', 'confirmed', 'processing', 'on_hold')
    AND created_at BETWEEN p_date_from AND p_date_to;

  -- 3. Commandes payées (ayant au moins un paiement validé 'paid')
  SELECT COUNT(DISTINCT o.id) INTO v_paid_count
  FROM public.orders o
  JOIN public.payments p ON p.order_id = o.id
  WHERE p.status = 'paid'
    AND o.created_at BETWEEN p_date_from AND p_date_to;

  -- 4. Montant brut total des commandes créées sur la période
  SELECT COALESCE(SUM(total), 0) INTO v_orders_amount_total
  FROM public.orders
  WHERE created_at BETWEEN p_date_from AND p_date_to;

  -- 5. Paiements confirmés / encaissés sur la période
  SELECT COALESCE(SUM(p.amount), 0) INTO v_payments_confirmed_total
  FROM public.payments p
  WHERE p.status = 'paid'
    AND p.created_at BETWEEN p_date_from AND p_date_to;

  -- 6. Commandes annulées ou remboursées
  SELECT
    COUNT(*),
    COALESCE(SUM(total), 0)
  INTO
    v_cancelled_refunded_count,
    v_cancelled_refunded_total
  FROM public.orders
  WHERE status IN ('cancelled', 'refunded')
    AND created_at BETWEEN p_date_from AND p_date_to;

  -- 7. Frais de livraison séparés (commandes non annulées)
  SELECT COALESCE(SUM(shipping_total), 0) INTO v_shipping_fees_total
  FROM public.orders
  WHERE status NOT IN ('cancelled', 'refunded')
    AND created_at BETWEEN p_date_from AND p_date_to;

  -- 8. Nouveaux clients distincts ayant commandé sur la période
  SELECT COUNT(DISTINCT user_id) INTO v_new_customers
  FROM public.orders
  WHERE user_id IS NOT NULL
    AND created_at BETWEEN p_date_from AND p_date_to;

  -- 9. Produits en rupture ou stock faible (stock <= 5)
  SELECT jsonb_agg(ls) INTO v_low_stock_products
  FROM (
    SELECT
      pv.id AS variant_id,
      p.id  AS product_id,
      p.name AS product_name,
      pv.sku,
      pv.size,
      pv.color,
      pv.stock
    FROM public.product_variants pv
    JOIN public.products p ON p.id = pv.product_id
    WHERE p.is_archived = false
      AND pv.stock <= 5
    ORDER BY pv.stock ASC, p.name ASC
    LIMIT 10
  ) ls;

  -- 10. Dernières commandes (5 plus récentes)
  SELECT jsonb_agg(ro) INTO v_recent_orders
  FROM (
    SELECT
      o.id,
      o.order_number,
      o.status,
      o.total,
      o.currency,
      o.created_at,
      COALESCE(pr.full_name, pr.email, 'Client invité') AS customer_name
    FROM public.orders o
    LEFT JOIN public.profiles pr ON pr.id = o.user_id
    ORDER BY o.created_at DESC
    LIMIT 5
  ) ro;

  -- 11. Produits les plus vendus
  SELECT jsonb_agg(t) INTO v_top_products
  FROM (
    SELECT
      oi.product_name,
      SUM(oi.quantity)   AS total_qty,
      SUM(oi.line_total) AS total_revenue
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE o.created_at BETWEEN p_date_from AND p_date_to
      AND o.status NOT IN ('cancelled', 'refunded')
    GROUP BY oi.product_name
    ORDER BY total_qty DESC
    LIMIT 5
  ) t;

  RETURN jsonb_build_object(
    'orders_count',              v_orders_count,
    'pending_count',             v_pending_count,
    'paid_count',                v_paid_count,
    'orders_amount_total',       v_orders_amount_total,
    'payments_confirmed_total',  v_payments_confirmed_total,
    'cancelled_refunded_count',  v_cancelled_refunded_count,
    'cancelled_refunded_total',  v_cancelled_refunded_total,
    'shipping_fees_total',       v_shipping_fees_total,
    'sales_total',               v_payments_confirmed_total,
    'new_customers',             v_new_customers,
    'low_stock_products',        COALESCE(v_low_stock_products, '[]'::jsonb),
    'recent_orders',             COALESCE(v_recent_orders, '[]'::jsonb),
    'top_products',              COALESCE(v_top_products, '[]'::jsonb)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_dashboard_stats(timestamptz, timestamptz) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_dashboard_stats(timestamptz, timestamptz) TO authenticated;


