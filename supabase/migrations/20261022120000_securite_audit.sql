/*
Migration securite_audit

1. place_order : le poids du colis n'est plus lu depuis le navigateur
   (aucune colonne de poids n'existe en base : un client pouvait choisir
   la tranche de poids la moins chere en appelant la fonction directement).
   Les tarifs sont donc appliques par zone, tranche de poids 0.
2. log_admin_action : n'est plus appelable par les visiteurs ni par les
   clients (le journal d'audit ne peut etre ecrit que par les fonctions
   d'administration, qui verifient is_admin_aal2()).
3. Fonctions d'administration : revoke explicite pour anon.
4. admin_mark_cod_paid : refuse une commande annulee ou remboursee.
5. admin_update_order_status : une annulation passe le paiement en attente
   a "cancelled", un remboursement passe le paiement "paid" a "refunded".

Les fonctions 1, 4 et 5 sont corrigees par remplacement d'une ligne de leur
definition existante ; la migration est rejouable sans effet.
*/

DO $migration$
DECLARE
  v_def text;
  v_new text;
BEGIN
  -- 1. place_order : poids jamais fourni par le navigateur
  v_def := pg_get_functiondef('public.place_order(jsonb, jsonb, jsonb, text, text)'::regprocedure);
  v_new := replace(
    v_def,
    $old$v_weight_g := COALESCE((p_shipping_address->>'weight_g')::int, 0);$old$,
    $new$v_weight_g := 0; -- le poids ne vient jamais du navigateur$new$
  );
  IF v_new <> v_def THEN
    EXECUTE v_new;
  ELSIF position('v_weight_g := 0;' IN v_def) = 0 THEN
    RAISE EXCEPTION 'place_order : motif du poids introuvable, migration a revoir';
  END IF;

  -- 4. admin_mark_cod_paid : pas de paiement sur une commande annulee ou remboursee
  v_def := pg_get_functiondef('public.admin_mark_cod_paid(uuid, text)'::regprocedure);
  v_new := replace(
    v_def,
    $old$SELECT id INTO v_payment_id$old$,
    $new$IF EXISTS (
    SELECT 1 FROM public.orders
    WHERE id = p_order_id
      AND status IN ('cancelled'::order_status, 'refunded'::order_status)
  ) THEN
    RAISE EXCEPTION 'Commande annulee ou remboursee : paiement non modifiable';
  END IF;

  SELECT id INTO v_payment_id$new$
  );
  IF v_new <> v_def THEN
    EXECUTE v_new;
  ELSIF position('paiement non modifiable' IN v_def) = 0 THEN
    RAISE EXCEPTION 'admin_mark_cod_paid : motif introuvable, migration a revoir';
  END IF;

  -- 5. admin_update_order_status : le paiement suit la commande
  v_def := pg_get_functiondef('public.admin_update_order_status(uuid, order_status, text)'::regprocedure);
  v_new := replace(
    v_def,
    $old$IF p_new_status = 'cancelled'::order_status THEN$old$,
    $new$IF p_new_status = 'refunded'::order_status THEN
    UPDATE public.payments
    SET status = 'refunded'::payment_status, updated_at = now()
    WHERE order_id = p_order_id AND status = 'paid'::payment_status;
  END IF;

  IF p_new_status = 'cancelled'::order_status THEN
    UPDATE public.payments
    SET status = 'cancelled'::payment_status, updated_at = now()
    WHERE order_id = p_order_id AND status = 'pending'::payment_status;
$new$
  );
  IF v_new <> v_def THEN
    EXECUTE v_new;
  ELSIF position('''refunded''::payment_status' IN v_def) = 0 THEN
    RAISE EXCEPTION 'admin_update_order_status : motif introuvable, migration a revoir';
  END IF;
END
$migration$;

-- 2. Le journal d'audit n'est ecrit que par les fonctions d'administration
REVOKE EXECUTE ON FUNCTION public.log_admin_action(text, text, text, jsonb, jsonb)
  FROM PUBLIC, anon, authenticated;

-- 3. Les fonctions d'administration ne sont pas appelables sans connexion
REVOKE EXECUTE ON FUNCTION public.admin_update_order_status(uuid, order_status, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_mark_cod_paid(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_shipment(uuid, text, text, shipment_status) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_dashboard_stats(timestamptz, timestamptz) FROM anon;
