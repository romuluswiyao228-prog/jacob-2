/*
# Migration : place_order_preorder_stock
# CREATE OR REPLACE de public.place_order (memes parametres, memes droits,
# SECURITY DEFINER, search_path = public, pg_temp). Identique a
# 20261111130000_place_order_sale_price.sql sauf une correction :
#
# - Decrementation du stock bornee a zero : GREATEST(0, stock - qty).
#   La contrainte product_variants_stock_check interdit le stock negatif ;
#   en precommande (allow_preorder), la commande est acceptee mais le stock
#   reste a 0 au lieu de devenir negatif.
*/

CREATE OR REPLACE FUNCTION public.place_order(
  p_items jsonb,
  p_customer jsonb,
  p_shipping_address jsonb,
  p_payment_method text,
  p_promo_code text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  -- Variables client
  v_full_name text;
  v_first_name text;
  v_last_name text;
  v_email text;
  v_phone text;
  v_clean_phone text;
  v_notes text;

  -- Variables adresse livraison
  v_line1 text;
  v_line2 text;
  v_city text;
  v_region text;
  v_postal_code text;
  v_country text;
  v_weight_g int;
  v_lat_text text;
  v_lng_text text;
  v_lat numeric;
  v_lng numeric;
  v_maps_link text;
  v_maps_host text;
  v_maps_path text;
  v_maps_ok boolean;
  v_landmark text;

  -- Variables commande
  v_order_id uuid;
  v_order_number text;
  v_user_id uuid;
  v_guest_token_clear text := NULL;
  v_guest_token_hash text := NULL;
  v_clean_shipping_address jsonb;

  -- Variables calculs
  v_subtotal bigint := 0;
  v_shipping_fee bigint := 0;
  v_shipping_zone_id uuid;
  v_shipping_rate_id uuid;
  v_discount_total bigint := 0;
  v_promo_id uuid := NULL;
  v_total bigint := 0;

  -- Variables verification items
  v_item_count int;
  v_distinct_input_count int;
  v_locked_count int := 0;
  v_processed_items jsonb := '[]'::jsonb;
  v_elem jsonb;
  v_elem_qty numeric;

  -- Curseur / record pour variante
  r_variant record;
  r_item record;

  -- Record promotion
  v_promo record;
BEGIN
  -- ------------------------------------------------------------
  -- 1. Verification de la methode de paiement (cash_on_delivery uniquement)
  -- ------------------------------------------------------------
  IF p_payment_method IS NULL OR LOWER(TRIM(p_payment_method)) <> 'cash_on_delivery' THEN
    RAISE EXCEPTION 'Methode de paiement non supportee : seule la methode cash_on_delivery est acceptee';
  END IF;

  -- ------------------------------------------------------------
  -- 2. Validation des entrees
  -- ------------------------------------------------------------

  -- Validation du panier (items)
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'La liste des articles doit etre un tableau JSON valide';
  END IF;

  v_item_count := jsonb_array_length(p_items);
  IF v_item_count < 1 OR v_item_count > 50 THEN
    RAISE EXCEPTION 'Le nombre d''articles distincts doit etre compris entre 1 et 50';
  END IF;

  -- Validation individuelle de chaque element du panier
  FOR v_elem IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    IF jsonb_typeof(v_elem) <> 'object' THEN
      RAISE EXCEPTION 'Chaque article doit etre un objet JSON valide';
    END IF;

    IF NULLIF(TRIM(COALESCE(v_elem->>'variant_id', '')), '') IS NULL THEN
      RAISE EXCEPTION 'Identifiant de variante manquant pour l''un des articles';
    END IF;

    IF (v_elem->>'variant_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RAISE EXCEPTION 'Identifiant de variante invalide : %', v_elem->>'variant_id';
    END IF;

    IF jsonb_typeof(v_elem->'quantity') <> 'number' THEN
      RAISE EXCEPTION 'La quantite doit etre un nombre entier pour la variante %', v_elem->>'variant_id';
    END IF;

    v_elem_qty := (v_elem->>'quantity')::numeric;
    IF v_elem_qty % 1 <> 0 THEN
      RAISE EXCEPTION 'La quantite doit etre un entier strict pour la variante %', v_elem->>'variant_id';
    END IF;

    IF v_elem_qty < 1 OR v_elem_qty > 20 THEN
      RAISE EXCEPTION 'La quantite doit etre comprise entre 1 et 20 par article';
    END IF;
  END LOOP;

  -- Validation des coordonnees client
  IF p_customer IS NULL OR jsonb_typeof(p_customer) <> 'object' THEN
    RAISE EXCEPTION 'Les coordonnees client doivent etre un objet JSON valide';
  END IF;

  -- Nom : full_name prioritaire (2 a 100 caracteres), sinon compatibilite
  -- first_name + last_name (comportement historique).
  v_full_name := TRIM(COALESCE(p_customer->>'full_name', ''));
  v_first_name := TRIM(COALESCE(p_customer->>'first_name', ''));
  v_last_name := TRIM(COALESCE(p_customer->>'last_name', ''));

  IF v_full_name <> '' THEN
    IF length(v_full_name) < 2 OR length(v_full_name) > 100 THEN
      RAISE EXCEPTION 'Le nom complet doit contenir entre 2 et 100 caracteres';
    END IF;
  ELSE
    IF v_first_name = '' THEN
      RAISE EXCEPTION 'Le prenom du client est obligatoire';
    END IF;
    IF length(v_first_name) > 100 THEN
      RAISE EXCEPTION 'Le prenom ne doit pas depasser 100 caracteres';
    END IF;
    IF v_last_name = '' THEN
      RAISE EXCEPTION 'Le nom du client est obligatoire';
    END IF;
    IF length(v_last_name) > 100 THEN
      RAISE EXCEPTION 'Le nom ne doit pas depasser 100 caracteres';
    END IF;
    v_full_name := v_first_name || ' ' || v_last_name;
  END IF;

  -- Email facultatif : valide uniquement s'il est fourni.
  v_email := LOWER(TRIM(COALESCE(p_customer->>'email', '')));
  IF v_email <> '' THEN
    IF length(v_email) > 255 THEN
      RAISE EXCEPTION 'L''adresse e-mail ne doit pas depasser 255 caracteres';
    END IF;
    IF v_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
      RAISE EXCEPTION 'Adresse e-mail invalide : %', v_email;
    END IF;
  END IF;

  v_phone := TRIM(COALESCE(p_customer->>'phone', ''));
  IF v_phone = '' THEN
    RAISE EXCEPTION 'Le numero de telephone est obligatoire';
  END IF;
  IF length(v_phone) > 30 THEN
    RAISE EXCEPTION 'Le numero de telephone ne doit pas depasser 30 caracteres';
  END IF;

  v_clean_phone := regexp_replace(v_phone, '[^0-9]', '', 'g');
  IF length(v_clean_phone) < 8 OR length(v_clean_phone) > 15 THEN
    RAISE EXCEPTION 'Numero de telephone invalide : %', v_phone;
  END IF;

  -- Validation de l adresse de livraison
  IF p_shipping_address IS NULL OR jsonb_typeof(p_shipping_address) <> 'object' THEN
    RAISE EXCEPTION 'L''adresse de livraison doit etre un objet JSON valide';
  END IF;

  -- Ligne d'adresse desormais facultative.
  v_line1 := TRIM(COALESCE(p_shipping_address->>'line1', p_shipping_address->>'address', ''));
  IF length(v_line1) > 255 THEN
    RAISE EXCEPTION 'L''adresse de livraison ne doit pas depasser 255 caracteres';
  END IF;

  v_city := TRIM(COALESCE(p_shipping_address->>'city', ''));
  IF v_city = '' THEN
    RAISE EXCEPTION 'La ville de livraison est obligatoire';
  END IF;
  IF length(v_city) > 100 THEN
    RAISE EXCEPTION 'La ville de livraison ne doit pas depasser 100 caracteres';
  END IF;

  -- Pays facultatif : 'Togo' par defaut.
  v_country := NULLIF(TRIM(COALESCE(p_shipping_address->>'country', '')), '');
  IF v_country IS NULL THEN
    v_country := 'Togo';
  END IF;
  IF length(v_country) > 100 THEN
    RAISE EXCEPTION 'Le pays de livraison ne doit pas depasser 100 caracteres';
  END IF;

  v_line2 := TRIM(COALESCE(p_shipping_address->>'line2', ''));
  IF length(v_line2) > 255 THEN
    RAISE EXCEPTION 'Le complement d''adresse ne doit pas depasser 255 caracteres';
  END IF;

  v_postal_code := TRIM(COALESCE(p_shipping_address->>'postal_code', ''));
  IF length(v_postal_code) > 20 THEN
    RAISE EXCEPTION 'Le code postal ne doit pas depasser 20 caracteres';
  END IF;

  v_region := TRIM(COALESCE(p_shipping_address->>'region', ''));
  IF length(v_region) > 100 THEN
    RAISE EXCEPTION 'La region ne doit pas depasser 100 caracteres';
  END IF;

  -- Coordonnees GPS : latitude et longitude doivent etre fournies ensemble.
  v_lat_text := NULLIF(TRIM(COALESCE(p_shipping_address->>'lat', '')), '');
  v_lng_text := NULLIF(TRIM(COALESCE(p_shipping_address->>'lng', p_shipping_address->>'lon', '')), '');

  IF (v_lat_text IS NULL) <> (v_lng_text IS NULL) THEN
    RAISE EXCEPTION 'La latitude et la longitude doivent etre fournies ensemble';
  END IF;

  IF v_lat_text IS NOT NULL THEN
    IF v_lat_text !~ '^-?[0-9]+(\.[0-9]+)?$' OR v_lng_text !~ '^-?[0-9]+(\.[0-9]+)?$' THEN
      RAISE EXCEPTION 'Les coordonnees GPS doivent etre des nombres valides';
    END IF;
    v_lat := v_lat_text::numeric;
    v_lng := v_lng_text::numeric;
    IF v_lat < -90 OR v_lat > 90 THEN
      RAISE EXCEPTION 'La latitude doit etre comprise entre -90 et 90';
    END IF;
    IF v_lng < -180 OR v_lng > 180 THEN
      RAISE EXCEPTION 'La longitude doit etre comprise entre -180 et 180';
    END IF;
  ELSE
    v_lat := NULL;
    v_lng := NULL;
  END IF;

  -- Lien de position : 300 caracteres max, https:// obligatoire, domaines Google
  -- Maps autorises uniquement.
  v_maps_link := NULLIF(TRIM(COALESCE(p_shipping_address->>'maps_link', '')), '');
  IF v_maps_link IS NOT NULL THEN
    IF length(v_maps_link) > 300 THEN
      RAISE EXCEPTION 'Le lien de position ne doit pas depasser 300 caracteres';
    END IF;
    IF lower(v_maps_link) !~ '^https://' THEN
      RAISE EXCEPTION 'Le lien de position doit commencer par https://';
    END IF;

    v_maps_ok := false;
    DECLARE
      v_rest text;
      v_slash_pos int;
    BEGIN
      v_rest := lower(substring(v_maps_link from 9));
      v_slash_pos := position('/' in v_rest);
      IF v_slash_pos = 0 THEN
        v_maps_host := v_rest;
        v_maps_path := '/';
      ELSE
        v_maps_host := substring(v_rest, 1, v_slash_pos - 1);
        v_maps_path := substring(v_rest, v_slash_pos);
      END IF;

      -- maps.app.goo.gl et maps.google.com : tout chemin accepte
      IF v_maps_host = 'maps.app.goo.gl' OR v_maps_host = 'maps.google.com' THEN
        v_maps_ok := true;
      -- goo.gl et google.com (et sous-domaines) : le chemin doit viser /maps
      ELSIF (v_maps_host = 'goo.gl' OR v_maps_host LIKE '%.goo.gl'
             OR v_maps_host = 'google.com' OR v_maps_host LIKE '%.google.com')
            AND v_maps_path LIKE '/maps%' THEN
        v_maps_ok := true;
      END IF;
    END;

    IF NOT v_maps_ok THEN
      RAISE EXCEPTION 'Le lien de position doit pointer vers Google Maps (maps.app.goo.gl, goo.gl/maps, google.com/maps ou maps.google.com)';
    END IF;
  END IF;

  -- Point de repere : 200 caracteres max, sans caracteres de controle.
  v_landmark := NULLIF(TRIM(COALESCE(p_shipping_address->>'landmark', '')), '');
  IF v_landmark IS NOT NULL THEN
    IF length(v_landmark) > 200 THEN
      RAISE EXCEPTION 'Le point de repere ne doit pas depasser 200 caracteres';
    END IF;
    IF v_landmark ~ '[\x00-\x1F\x7F]' THEN
      RAISE EXCEPTION 'Le point de repere contient des caracteres invalides';
    END IF;
  END IF;

  -- Au moins un element de position est exige : GPS, lien Google Maps
  -- ou point de repere d'au moins 5 caracteres.
  IF v_lat_text IS NULL
     AND v_maps_link IS NULL
     AND (v_landmark IS NULL OR length(v_landmark) < 5) THEN
    RAISE EXCEPTION 'Indiquez votre position ou un point de repère';
  END IF;

  v_notes := TRIM(COALESCE(p_customer->>'notes', p_shipping_address->>'notes', ''));
  IF length(v_notes) > 1000 THEN
    RAISE EXCEPTION 'Les remarques ne doivent pas depasser 1000 caracteres';
  END IF;

  v_weight_g := COALESCE((p_shipping_address->>'weight_g')::int, 0);
  IF v_weight_g < 0 THEN
    v_weight_g := 0;
  END IF;

  -- ------------------------------------------------------------
  -- 3. Verrouillage FOR UPDATE des variantes par ordre croissant d id
  -- Recalcul des prix depuis la base (aucun prix client accepte)
  -- Verification stock et archivage, et decrementation immediate
  -- ------------------------------------------------------------

  SELECT count(DISTINCT (elem->>'variant_id')::uuid)
  INTO v_distinct_input_count
  FROM jsonb_array_elements(p_items) elem;

  FOR r_variant IN
    SELECT
      v.id AS variant_id,
      v.stock,
      v.price AS variant_price,
      v.sale_price AS variant_sale_price,
      v.allow_preorder,
      v.size,
      v.color,
      v.sku,
      p.id AS product_id,
      p.name AS product_name,
      p.description AS product_description,
      p.price AS product_price,
      p.is_archived,
      agg.req_qty
    FROM (
      SELECT
        (elem->>'variant_id')::uuid AS v_id,
        SUM((elem->>'quantity')::int)::int AS req_qty
      FROM jsonb_array_elements(p_items) elem
      GROUP BY (elem->>'variant_id')::uuid
    ) agg
    JOIN public.product_variants v ON v.id = agg.v_id
    JOIN public.products p ON p.id = v.product_id
    ORDER BY v.id ASC
    FOR UPDATE OF v
  LOOP
    v_locked_count := v_locked_count + 1;

    -- Verification quantite totale cumulee
    IF r_variant.req_qty > 20 THEN
      RAISE EXCEPTION 'La quantite totale commandee pour l''article "%" ne peut pas depasser 20', r_variant.product_name;
    END IF;

    -- Verification produit non archive
    IF r_variant.is_archived THEN
      RAISE EXCEPTION 'L''article "%" est archive et n''est plus disponible a la commande', r_variant.product_name;
    END IF;

    -- Verification stock suffisant (contournee si precommande autorisee)
    IF r_variant.stock < r_variant.req_qty AND NOT COALESCE(r_variant.allow_preorder, false) THEN
      RAISE EXCEPTION 'Stock insuffisant pour l''article "%" (stock disponible : %, demande : %)',
        r_variant.product_name, r_variant.stock, r_variant.req_qty;
    END IF;

    -- Calcul du prix unitaire : prix promo (sale_price) prioritaire,
    -- puis prix de la variante, sinon prix du produit.
    DECLARE
      v_effective_unit_price bigint;
      v_line_total bigint;
    BEGIN
      v_effective_unit_price := COALESCE(r_variant.variant_sale_price, r_variant.variant_price, r_variant.product_price);
      v_line_total := v_effective_unit_price * r_variant.req_qty;
      v_subtotal := v_subtotal + v_line_total;

      -- Decrementation du stock bornee a zero (contrainte stock >= 0 ;
      -- en precommande la commande passe sans rendre le stock negatif)
      UPDATE public.product_variants
      SET stock = GREATEST(0, stock - r_variant.req_qty)
      WHERE id = r_variant.variant_id;

      -- Stockage de l instantane pour creation ulterieure de la ligne
      v_processed_items := v_processed_items || jsonb_build_object(
        'product_id', r_variant.product_id,
        'variant_id', r_variant.variant_id,
        'product_name', r_variant.product_name,
        'product_description', r_variant.product_description,
        'unit_price', v_effective_unit_price,
        'quantity', r_variant.req_qty,
        'size', r_variant.size,
        'color', r_variant.color,
        'sku', r_variant.sku,
        'line_total', v_line_total
      );
    END;
  END LOOP;

  IF v_locked_count <> v_distinct_input_count THEN
    RAISE EXCEPTION 'Un ou plusieurs articles demandes sont introuvables en base de donnees';
  END IF;

  -- ------------------------------------------------------------
  -- 4. Calcul des frais de livraison depuis shipping_zones et shipping_rates
  -- ------------------------------------------------------------
  SELECT r.price, z.id, r.id
  INTO v_shipping_fee, v_shipping_zone_id, v_shipping_rate_id
  FROM public.shipping_rates r
  JOIN public.shipping_zones z ON z.id = r.zone_id
  WHERE z.is_active = true
    AND r.is_active = true
    AND EXISTS (
      SELECT 1 FROM unnest(z.countries) c
      WHERE LOWER(TRIM(c)) = LOWER(v_country)
    )
    AND (
      (z.regions IS NOT NULL AND cardinality(z.regions) > 0 AND EXISTS (
        SELECT 1 FROM unnest(z.regions) reg
        WHERE LOWER(TRIM(reg)) = LOWER(v_city)
      ))
      OR (z.regions IS NULL OR cardinality(z.regions) = 0)
    )
    AND r.min_weight_g <= v_weight_g
    AND (r.max_weight_g IS NULL OR r.max_weight_g >= v_weight_g)
  ORDER BY
    (CASE
      WHEN z.regions IS NOT NULL AND cardinality(z.regions) > 0 AND EXISTS (
        SELECT 1 FROM unnest(z.regions) reg
        WHERE LOWER(TRIM(reg)) = LOWER(v_city)
      ) THEN 1
      ELSE 2
    END),
    r.price ASC
  LIMIT 1;

  IF v_shipping_fee IS NULL THEN
    RAISE EXCEPTION 'livraison non disponible pour cette destination';
  END IF;

  -- ------------------------------------------------------------
  -- 5. Validation et application du code promo cote serveur
  -- ------------------------------------------------------------
  IF p_promo_code IS NOT NULL AND TRIM(p_promo_code) <> '' THEN
    SELECT *
    INTO v_promo
    FROM public.promotions
    WHERE UPPER(TRIM(code)) = UPPER(TRIM(p_promo_code))
    FOR UPDATE;

    IF v_promo.id IS NULL THEN
      RAISE EXCEPTION 'Code promotionnel "%" invalide', p_promo_code;
    END IF;

    IF NOT v_promo.is_active THEN
      RAISE EXCEPTION 'Le code promotionnel "%" n''est plus actif', p_promo_code;
    END IF;

    IF v_promo.starts_at IS NOT NULL AND now() < v_promo.starts_at THEN
      RAISE EXCEPTION 'Le code promotionnel "%" n''est pas encore valide', p_promo_code;
    END IF;

    IF v_promo.ends_at IS NOT NULL AND now() > v_promo.ends_at THEN
      RAISE EXCEPTION 'Le code promotionnel "%" a expire', p_promo_code;
    END IF;

    IF v_promo.max_uses IS NOT NULL AND v_promo.used_count >= v_promo.max_uses THEN
      RAISE EXCEPTION 'Le code promotionnel "%" a atteint sa limite maximale d''utilisation', p_promo_code;
    END IF;

    IF v_promo.min_order_amount IS NOT NULL AND v_subtotal < v_promo.min_order_amount THEN
      RAISE EXCEPTION 'Le montant minimum d''achat pour le code "%" est de % XOF', p_promo_code, v_promo.min_order_amount;
    END IF;

    IF v_promo.discount_type = 'percentage' THEN
      v_discount_total := ROUND((v_subtotal * v_promo.discount_value)::numeric / 100);
      IF v_discount_total > v_subtotal THEN
        v_discount_total := v_subtotal;
      END IF;
    ELSIF v_promo.discount_type = 'fixed_amount' THEN
      v_discount_total := LEAST(v_promo.discount_value, v_subtotal);
    ELSE
      v_discount_total := 0;
    END IF;

    v_promo_id := v_promo.id;

    -- Increment du compteur d utilisation dans la meme transaction
    UPDATE public.promotions
    SET used_count = used_count + 1
    WHERE id = v_promo.id;
  ELSE
    v_discount_total := 0;
    v_promo_id := NULL;
  END IF;

  -- Calcul du montant final
  v_total := GREATEST(0, v_subtotal - v_discount_total + v_shipping_fee);

  -- ------------------------------------------------------------
  -- 6. Identification utilisateur / generation jeton invite
  -- ------------------------------------------------------------
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    -- Generation d un jeton aleatoire securise (pgcrypto)
    v_guest_token_clear := encode(extensions.gen_random_bytes(32), 'hex');
    -- Seul le hash SHA-256 est conserve en base de donnees
    v_guest_token_hash := encode(extensions.digest(convert_to(v_guest_token_clear, 'UTF8'), 'sha256'), 'hex');
  ELSE
    v_guest_token_clear := NULL;
    v_guest_token_hash := NULL;
  END IF;

  v_order_id := gen_random_uuid();
  v_order_number := public.next_order_number();

  v_clean_shipping_address := jsonb_build_object(
    'full_name', v_full_name,
    'first_name', NULLIF(v_first_name, ''),
    'last_name', NULLIF(v_last_name, ''),
    'email', NULLIF(v_email, ''),
    'phone', v_phone,
    'line1', NULLIF(v_line1, ''),
    'line2', NULLIF(v_line2, ''),
    'city', v_city,
    'region', NULLIF(v_region, ''),
    'postal_code', NULLIF(v_postal_code, ''),
    'country', v_country,
    'lat', v_lat,
    'lng', v_lng,
    'maps_link', v_maps_link,
    'landmark', v_landmark
  );

  -- ------------------------------------------------------------
  -- 7. Insertion de la commande
  -- ------------------------------------------------------------
  INSERT INTO public.orders (
    id,
    order_number,
    user_id,
    guest_token,
    status,
    subtotal,
    shipping_total,
    discount_total,
    total,
    currency,
    promotion_id,
    shipping_address,
    billing_address,
    notes
  ) VALUES (
    v_order_id,
    v_order_number,
    v_user_id,
    v_guest_token_hash,
    'pending'::order_status,
    v_subtotal,
    v_shipping_fee,
    v_discount_total,
    v_total,
    'XOF',
    v_promo_id,
    v_clean_shipping_address,
    v_clean_shipping_address,
    NULLIF(v_notes, '')
  );

  -- ------------------------------------------------------------
  -- 8. Insertion des lignes de commande avec instantane complet
  -- ------------------------------------------------------------
  FOR r_item IN SELECT * FROM jsonb_to_recordset(v_processed_items) AS (
    product_id uuid,
    variant_id uuid,
    product_name text,
    product_description text,
    unit_price bigint,
    quantity int,
    size text,
    color text,
    sku text,
    line_total bigint
  )
  LOOP
    INSERT INTO public.order_items (
      order_id,
      product_id,
      variant_id,
      product_name,
      product_description,
      unit_price,
      quantity,
      size,
      color,
      sku,
      line_total,
      currency
    ) VALUES (
      v_order_id,
      r_item.product_id,
      r_item.variant_id,
      r_item.product_name,
      r_item.product_description,
      r_item.unit_price,
      r_item.quantity,
      r_item.size,
      r_item.color,
      r_item.sku,
      r_item.line_total,
      'XOF'
    );
  END LOOP;

  -- ------------------------------------------------------------
  -- 9. Insertion de l historique de statut
  -- ------------------------------------------------------------
  INSERT INTO public.order_status_history (
    order_id,
    status,
    changed_by,
    note
  ) VALUES (
    v_order_id,
    'pending'::order_status,
    v_user_id,
    'Creation de la commande via place_order'
  );

  -- ------------------------------------------------------------
  -- 10. Insertion du paiement (toujours pending, jamais marque paye)
  -- ------------------------------------------------------------
  INSERT INTO public.payments (
    order_id,
    provider,
    method,
    provider_reference,
    idempotency_key,
    amount,
    currency,
    status
  ) VALUES (
    v_order_id,
    'cash_on_delivery',
    'cash_on_delivery'::payment_method,
    'COD-' || v_order_number,
    'COD-PAY-' || v_order_number || '-' || encode(extensions.gen_random_bytes(8), 'hex'),
    v_total,
    'XOF',
    'pending'::payment_status
  );

  -- ------------------------------------------------------------
  -- 11. Retour du resultat (jeton en clair uniquement renvoye ici)
  -- ------------------------------------------------------------
  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'subtotal', v_subtotal,
    'shipping_total', v_shipping_fee,
    'discount_total', v_discount_total,
    'total', v_total,
    'currency', 'XOF',
    'guest_token', v_guest_token_clear
  );
END;
$$;

-- Droits d execution identiques a la version precedente
REVOKE EXECUTE ON FUNCTION public.place_order(jsonb, jsonb, jsonb, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_order(jsonb, jsonb, jsonb, text, text) TO anon, authenticated;
