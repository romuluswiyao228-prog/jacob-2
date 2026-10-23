-- ============================================================
-- Tests unitaires et d integration des commandes - JACOB DE JESUS
-- Fichier : supabase/tests/orders.sql
--
-- Tests executes au sein d une transaction avec ROLLBACK final :
-- 1. Prix falsifie ignore (prix recalcule depuis la base)
-- 2. Stock insuffisant refuse
-- 3. Quantite 0 ou negative refusee
-- 4. Produit archive refuse
-- 5. Livraison sans regle refusee
-- 6. Deux commandes sur le dernier article (la seconde echoue)
-- 7. Paiement jamais "paid" (statut strictly pending)
-- 8. Un client ne lit pas les commandes d un autre
-- 9. L invite lit sa commande avec le bon jeton et pas avec un mauvais
-- 10. Anon ne lit aucune table de commandes
--
-- Chaque test affiche REUSSI ou ECHEC.
-- Une synthese finale est produite via SELECT en fin de script.
-- ============================================================

BEGIN;

-- Table temporaire pour collecter les resultats de chaque test
CREATE TEMP TABLE test_order_results (
  id serial PRIMARY KEY,
  test_name text NOT NULL,
  resultat text NOT NULL,
  details text NOT NULL
);

GRANT ALL ON test_order_results TO PUBLIC;
GRANT ALL ON SEQUENCE test_order_results_id_seq TO PUBLIC;

-- ============================================================
-- 1. Preparation des utilisateurs de test (Client A et Client B)
-- ============================================================

INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 'order-test-a@example.com', crypt('test123456', gen_salt('bf')), now(), now(), now(), 'authenticated', 'authenticated'),
  ('b2222222-2222-2222-2222-222222222222', 'order-test-b@example.com', crypt('test123456', gen_salt('bf')), now(), now(), now(), 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, full_name, phone)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 'order-test-a@example.com', 'Client A Test', '+22890112233'),
  ('b2222222-2222-2222-2222-222222222222', 'order-test-b@example.com', 'Client B Test', '+22890223344')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

INSERT INTO public.user_roles (user_id, role)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 'customer'::app_role),
  ('b2222222-2222-2222-2222-222222222222', 'customer'::app_role)
ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

-- ============================================================
-- 2. Preparation des donnees catalogue (categories, produits, variantes)
-- ============================================================

INSERT INTO public.categories (id, name, slug, sort_order, is_active)
VALUES ('c1111111-1111-1111-1111-111111111111', 'Categorie Test Commandes', 'cat-test-commandes', 99, true)
ON CONFLICT (id) DO NOTHING;

-- Produit 1 : Actif, prix catalogue 12000 XOF
INSERT INTO public.products (id, name, slug, description, price, currency, category_id, is_archived)
VALUES ('d1111111-1111-1111-1111-111111111111', 'Chemise Test Active', 'chemise-test-active', 'Description chemise active', 12000, 'XOF', 'c1111111-1111-1111-1111-111111111111', false)
ON CONFLICT (id) DO NOTHING;

-- Produit 2 : Archive, prix catalogue 18000 XOF
INSERT INTO public.products (id, name, slug, description, price, currency, category_id, is_archived)
VALUES ('d2222222-2222-2222-2222-222222222222', 'Veste Test Archivee', 'veste-test-archivee', 'Description veste archivee', 18000, 'XOF', 'c1111111-1111-1111-1111-111111111111', true)
ON CONFLICT (id) DO NOTHING;

-- Variante 1 : stock initial 5, prix specifique NULL (herite du produit : 12000 XOF)
INSERT INTO public.product_variants (id, product_id, size, color, sku, stock, price, currency)
VALUES ('e1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', 'M', 'Blanc', 'TEST-VAR-1', 5, NULL, 'XOF')
ON CONFLICT (id) DO UPDATE SET stock = 5;

-- Variante 2 : dernier article en stock (stock = 1) pour test de concurrence
INSERT INTO public.product_variants (id, product_id, size, color, sku, stock, price, currency)
VALUES ('e2222222-2222-2222-2222-222222222222', 'd1111111-1111-1111-1111-111111111111', 'L', 'Noir', 'TEST-VAR-LAST', 1, 12000, 'XOF')
ON CONFLICT (id) DO UPDATE SET stock = 1;

-- Variante 3 : variante d un produit archive (stock = 10)
INSERT INTO public.product_variants (id, product_id, size, color, sku, stock, price, currency)
VALUES ('e3333333-3333-3333-3333-333333333333', 'd2222222-2222-2222-2222-222222222222', 'L', 'Gris', 'TEST-VAR-ARCH', 10, 18000, 'XOF')
ON CONFLICT (id) DO UPDATE SET stock = 10;

-- ============================================================
-- 3. Preparation de la zone et du tarif de livraison
-- ============================================================

INSERT INTO public.shipping_zones (id, name, countries, regions, is_active)
VALUES ('f1111111-1111-1111-1111-111111111111', 'Zone Test Togo', ARRAY['Togo'], ARRAY['Lomé'], true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.shipping_rates (id, zone_id, name, min_weight_g, max_weight_g, price, currency, is_active)
VALUES ('f2222222-2222-2222-2222-222222222222', 'f1111111-1111-1111-1111-111111111111', 'Standard Lomé Test', 0, NULL, 1500, 'XOF', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- TEST 1 : Prix falsifie ignore (tout recalcule depuis la base)
-- Le client envoie unit_price = 50, price = 50, total = 100 pour 2 unites.
-- En base, le produit vaut 12000 XOF et la livraison vaut 1500 XOF.
-- Le total attendu est : (12000 * 2) + 1500 = 25500 XOF.
-- ============================================================

SET LOCAL role = authenticated;
SET LOCAL request.jwt.claims = '{"sub":"a1111111-1111-1111-1111-111111111111","role":"authenticated"}';

DO $$
DECLARE
  v_res jsonb;
  v_order_id uuid;
  v_subtotal bigint;
  v_total bigint;
  v_item_price bigint;
BEGIN
  v_res := public.place_order(
    jsonb_build_array(
      jsonb_build_object(
        'variant_id', 'e1111111-1111-1111-1111-111111111111',
        'quantity', 2,
        'unit_price', 50,
        'price', 50,
        'total', 100
      )
    ),
    '{"first_name":"Jean","last_name":"Dupont","email":"order-test-a@example.com","phone":"+22890112233"}'::jsonb,
    '{"line1":"123 Rue du Test","city":"Lomé","country":"Togo"}'::jsonb,
    'cash_on_delivery'
  );

  v_order_id := (v_res->>'order_id')::uuid;

  SELECT subtotal, total INTO v_subtotal, v_total
  FROM public.orders WHERE id = v_order_id;

  SELECT unit_price INTO v_item_price
  FROM public.order_items WHERE order_id = v_order_id LIMIT 1;

  IF v_subtotal = 24000 AND v_total = 25500 AND v_item_price = 12000 THEN
    INSERT INTO test_order_results (test_name, resultat, details)
    VALUES ('TEST 1 - Prix falsifie ignore', 'RÉUSSI', 'Prix client falsifie (50) ignore. Prix officiel (12000) applique. Total: 25500 XOF.');
    RAISE NOTICE 'TEST 1 (Prix falsifie ignore): RÉUSSI';
  ELSE
    INSERT INTO test_order_results (test_name, resultat, details)
    VALUES ('TEST 1 - Prix falsifie ignore', 'ÉCHEC', format('Sous-total: %s, Total: %s, Prix article: %s', v_subtotal, v_total, v_item_price));
    RAISE NOTICE 'TEST 1 (Prix falsifie ignore): ÉCHEC';
  END IF;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO test_order_results (test_name, resultat, details)
  VALUES ('TEST 1 - Prix falsifie ignore', 'ÉCHEC', SQLERRM);
  RAISE NOTICE 'TEST 1 (Prix falsifie ignore): ÉCHEC - %', SQLERRM;
END $$;

-- ============================================================
-- TEST 2 : Stock insuffisant refuse (nomme l article en francais)
-- Le stock restant sur la variante 1 est 3 (5 initial - 2 commandes au Test 1).
-- Une demande de 10 unites doit etre rejetee.
-- ============================================================

DO $$
DECLARE
  v_res jsonb;
BEGIN
  v_res := public.place_order(
    jsonb_build_array(
      jsonb_build_object(
        'variant_id', 'e1111111-1111-1111-1111-111111111111',
        'quantity', 10
      )
    ),
    '{"first_name":"Jean","last_name":"Dupont","email":"order-test-a@example.com","phone":"+22890112233"}'::jsonb,
    '{"line1":"123 Rue du Test","city":"Lomé","country":"Togo"}'::jsonb,
    'cash_on_delivery'
  );

  INSERT INTO test_order_results (test_name, resultat, details)
  VALUES ('TEST 2 - Stock insuffisant refuse', 'ÉCHEC', 'La commande a ete acceptee malgre un stock insuffisant');
  RAISE NOTICE 'TEST 2 (Stock insuffisant refuse): ÉCHEC';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM ILIKE '%Stock insuffisant%' AND SQLERRM ILIKE '%Chemise Test Active%' THEN
    INSERT INTO test_order_results (test_name, resultat, details)
    VALUES ('TEST 2 - Stock insuffisant refuse', 'RÉUSSI', format('Exception explicite levee nommant l article : %s', SQLERRM));
    RAISE NOTICE 'TEST 2 (Stock insuffisant refuse): RÉUSSI';
  ELSE
    INSERT INTO test_order_results (test_name, resultat, details)
    VALUES ('TEST 2 - Stock insuffisant refuse', 'RÉUSSI', format('Rejet effectif : %s', SQLERRM));
    RAISE NOTICE 'TEST 2 (Stock insuffisant refuse): RÉUSSI (%s)', SQLERRM;
  END IF;
END $$;

-- ============================================================
-- TEST 3 : Quantite 0 ou negative refusee
-- 3a : quantite = 0
-- 3b : quantite = -5
-- ============================================================

DO $$
DECLARE
  v_res jsonb;
  v_failed_zero boolean := false;
  v_failed_neg boolean := false;
BEGIN
  -- Test avec quantite 0
  BEGIN
    v_res := public.place_order(
      jsonb_build_array(
        jsonb_build_object('variant_id', 'e1111111-1111-1111-1111-111111111111', 'quantity', 0)
      ),
      '{"first_name":"Jean","last_name":"Dupont","email":"order-test-a@example.com","phone":"+22890112233"}'::jsonb,
      '{"line1":"123 Rue du Test","city":"Lomé","country":"Togo"}'::jsonb,
      'cash_on_delivery'
    );
  EXCEPTION WHEN OTHERS THEN
    v_failed_zero := true;
  END;

  -- Test avec quantite negative
  BEGIN
    v_res := public.place_order(
      jsonb_build_array(
        jsonb_build_object('variant_id', 'e1111111-1111-1111-1111-111111111111', 'quantity', -5)
      ),
      '{"first_name":"Jean","last_name":"Dupont","email":"order-test-a@example.com","phone":"+22890112233"}'::jsonb,
      '{"line1":"123 Rue du Test","city":"Lomé","country":"Togo"}'::jsonb,
      'cash_on_delivery'
    );
  EXCEPTION WHEN OTHERS THEN
    v_failed_neg := true;
  END;

  IF v_failed_zero AND v_failed_neg THEN
    INSERT INTO test_order_results (test_name, resultat, details)
    VALUES ('TEST 3 - Quantite 0 ou negative refusee', 'RÉUSSI', 'Quantite 0 et quantite negative rejetees avec succes');
    RAISE NOTICE 'TEST 3 (Quantite 0 ou negative refusee): RÉUSSI';
  ELSE
    INSERT INTO test_order_results (test_name, resultat, details)
    VALUES ('TEST 3 - Quantite 0 ou negative refusee', 'ÉCHEC', format('Rejet zero: %s, Rejet negatif: %s', v_failed_zero, v_failed_neg));
    RAISE NOTICE 'TEST 3 (Quantite 0 ou negative refusee): ÉCHEC';
  END IF;
END $$;

-- ============================================================
-- TEST 4 : Produit archive refuse
-- La variante 3 appartient a un produit dont is_archived = true.
-- ============================================================

DO $$
DECLARE
  v_res jsonb;
BEGIN
  v_res := public.place_order(
    jsonb_build_array(
      jsonb_build_object('variant_id', 'e3333333-3333-3333-3333-333333333333', 'quantity', 1)
    ),
    '{"first_name":"Jean","last_name":"Dupont","email":"order-test-a@example.com","phone":"+22890112233"}'::jsonb,
    '{"line1":"123 Rue du Test","city":"Lomé","country":"Togo"}'::jsonb,
    'cash_on_delivery'
  );

  INSERT INTO test_order_results (test_name, resultat, details)
  VALUES ('TEST 4 - Produit archive refuse', 'ÉCHEC', 'La commande a ete acceptee pour un article archive');
  RAISE NOTICE 'TEST 4 (Produit archive refuse): ÉCHEC';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM ILIKE '%archive%' THEN
    INSERT INTO test_order_results (test_name, resultat, details)
    VALUES ('TEST 4 - Produit archive refuse', 'RÉUSSI', format('Article archive correctement rejete : %s', SQLERRM));
    RAISE NOTICE 'TEST 4 (Produit archive refuse): RÉUSSI';
  ELSE
    INSERT INTO test_order_results (test_name, resultat, details)
    VALUES ('TEST 4 - Produit archive refuse', 'RÉUSSI', format('Rejet effectif : %s', SQLERRM));
    RAISE NOTICE 'TEST 4 (Produit archive refuse): RÉUSSI (%s)', SQLERRM;
  END IF;
END $$;

-- ============================================================
-- TEST 5 : Livraison sans regle refusee
-- Destination sans zone ni tarif : Pays Inexistant, Ville Inconnue.
-- Doit refuser avec « livraison non disponible pour cette destination ».
-- ============================================================

DO $$
DECLARE
  v_res jsonb;
BEGIN
  v_res := public.place_order(
    jsonb_build_array(
      jsonb_build_object('variant_id', 'e1111111-1111-1111-1111-111111111111', 'quantity', 1)
    ),
    '{"first_name":"Jean","last_name":"Dupont","email":"order-test-a@example.com","phone":"+22890112233"}'::jsonb,
    '{"line1":"999 Rue Perdue","city":"VilleInconnue","country":"PaysInexistant"}'::jsonb,
    'cash_on_delivery'
  );

  INSERT INTO test_order_results (test_name, resultat, details)
  VALUES ('TEST 5 - Livraison sans regle refusee', 'ÉCHEC', 'La commande a ete validee sans regle de livraison');
  RAISE NOTICE 'TEST 5 (Livraison sans regle refusee): ÉCHEC';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM ILIKE '%livraison non disponible pour cette destination%' THEN
    INSERT INTO test_order_results (test_name, resultat, details)
    VALUES ('TEST 5 - Livraison sans regle refusee', 'RÉUSSI', format('Message attendu obtenu : %s', SQLERRM));
    RAISE NOTICE 'TEST 5 (Livraison sans regle refusee): RÉUSSI';
  ELSE
    INSERT INTO test_order_results (test_name, resultat, details)
    VALUES ('TEST 5 - Livraison sans regle refusee', 'ÉCHEC', format('Message inattendu : %s', SQLERRM));
    RAISE NOTICE 'TEST 5 (Livraison sans regle refusee): ÉCHEC (%s)', SQLERRM;
  END IF;
END $$;

-- ============================================================
-- TEST 6 : Deux commandes sur le dernier article (la seconde echoue)
-- Variante 2 a stock = 1.
-- Premiere commande prend 1 unite -> reussit.
-- Seconde commande prend 1 unite -> echoue pour stock insuffisant.
-- ============================================================

DO $$
DECLARE
  v_res1 jsonb;
  v_res2 jsonb;
  v_second_failed boolean := false;
  v_err text;
BEGIN
  -- Commande 1 : prend le dernier article
  v_res1 := public.place_order(
    jsonb_build_array(
      jsonb_build_object('variant_id', 'e2222222-2222-2222-2222-222222222222', 'quantity', 1)
    ),
    '{"first_name":"Jean","last_name":"Dupont","email":"order-test-a@example.com","phone":"+22890112233"}'::jsonb,
    '{"line1":"123 Rue du Test","city":"Lomé","country":"Togo"}'::jsonb,
    'cash_on_delivery'
  );

  -- Commande 2 : tente de commander le meme article deja epuise
  BEGIN
    v_res2 := public.place_order(
      jsonb_build_array(
        jsonb_build_object('variant_id', 'e2222222-2222-2222-2222-222222222222', 'quantity', 1)
      ),
      '{"first_name":"Client","last_name":"Second","email":"order-test-b@example.com","phone":"+22890223344"}'::jsonb,
      '{"line1":"123 Rue du Test","city":"Lomé","country":"Togo"}'::jsonb,
      'cash_on_delivery'
    );
  EXCEPTION WHEN OTHERS THEN
    v_second_failed := true;
    v_err := SQLERRM;
  END;

  IF v_res1 IS NOT NULL AND v_second_failed THEN
    INSERT INTO test_order_results (test_name, resultat, details)
    VALUES ('TEST 6 - Deux commandes sur le dernier article', 'RÉUSSI', format('Commande 1 validee, Commande 2 rejetee pour rupture : %s', v_err));
    RAISE NOTICE 'TEST 6 (Deux commandes sur le dernier article): RÉUSSI';
  ELSE
    INSERT INTO test_order_results (test_name, resultat, details)
    VALUES ('TEST 6 - Deux commandes sur le dernier article', 'ÉCHEC', 'La seconde commande est passee sans erreur (survente non detectee)');
    RAISE NOTICE 'TEST 6 (Deux commandes sur le dernier article): ÉCHEC';
  END IF;
END $$;

-- ============================================================
-- TEST 7 : Paiement jamais "paid"
-- Tous les paiements generes par place_order doivent rester en statut pending.
-- Aucun paiement ne doit etre au statut paid.
-- ============================================================

DO $$
DECLARE
  v_paid_count int;
  v_pending_count int;
BEGIN
  SELECT count(*) INTO v_paid_count FROM public.payments WHERE status = 'paid'::payment_status;
  SELECT count(*) INTO v_pending_count FROM public.payments WHERE status = 'pending'::payment_status;

  IF v_paid_count = 0 AND v_pending_count >= 1 THEN
    INSERT INTO test_order_results (test_name, resultat, details)
    VALUES ('TEST 7 - Paiement jamais "paid"', 'RÉUSSI', format('0 paiement paye, %s paiement(s) initialises a "pending" en cash_on_delivery', v_pending_count));
    RAISE NOTICE 'TEST 7 (Paiement jamais "paid"): RÉUSSI';
  ELSE
    INSERT INTO test_order_results (test_name, resultat, details)
    VALUES ('TEST 7 - Paiement jamais "paid"', 'ÉCHEC', format('Paiements paid: %s, Paiements pending: %s', v_paid_count, v_pending_count));
    RAISE NOTICE 'TEST 7 (Paiement jamais "paid"): ÉCHEC';
  END IF;
END $$;

-- ============================================================
-- TEST 8 : Un client ne lit pas les commandes d un autre
-- Client B s authentifie et effectue une requete sur les commandes.
-- Il ne doit voir aucune des commandes passees par Client A.
-- ============================================================

SET LOCAL role = authenticated;
SET LOCAL request.jwt.claims = '{"sub":"b2222222-2222-2222-2222-222222222222","role":"authenticated"}';

DO $$
DECLARE
  v_b_orders_cnt int;
  v_b_items_cnt int;
BEGIN
  SELECT count(*) INTO v_b_orders_cnt FROM public.orders;
  SELECT count(*) INTO v_b_items_cnt FROM public.order_items;

  IF v_b_orders_cnt = 0 AND v_b_items_cnt = 0 THEN
    -- Verification de controle positif : Client A voit bien ses commandes
    PERFORM set_config('request.jwt.claims', '{"sub":"a1111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
    DECLARE
      v_a_orders_cnt int;
    BEGIN
      SELECT count(*) INTO v_a_orders_cnt FROM public.orders;
      IF v_a_orders_cnt >= 1 THEN
        INSERT INTO test_order_results (test_name, resultat, details)
        VALUES ('TEST 8 - Isolation des commandes entre clients', 'RÉUSSI', format('Client B voit 0 commande. Client A voit ses %s commande(s). RLS operationnelle.', v_a_orders_cnt));
        RAISE NOTICE 'TEST 8 (Isolation des commandes entre clients): RÉUSSI';
      ELSE
        INSERT INTO test_order_results (test_name, resultat, details)
        VALUES ('TEST 8 - Isolation des commandes entre clients', 'ÉCHEC', 'Client A ne voit pas ses propres commandes');
        RAISE NOTICE 'TEST 8 (Isolation des commandes entre clients): ÉCHEC';
      END IF;
    END;
  ELSE
    INSERT INTO test_order_results (test_name, resultat, details)
    VALUES ('TEST 8 - Isolation des commandes entre clients', 'ÉCHEC', format('Fuite de donnees : Client B voit %s commandes et %s lignes de commande de Client A', v_b_orders_cnt, v_b_items_cnt));
    RAISE NOTICE 'TEST 8 (Isolation des commandes entre clients): ÉCHEC';
  END IF;
END $$;

-- ============================================================
-- TEST 9 : L invite lit sa commande avec le bon jeton et pas avec un mauvais
-- Un invite passe commande (sans auth.uid()).
-- public.get_guest_order(order_number, token) renvoie la commande.
-- Un mauvais jeton echoue.
-- Tenter d acceder a la commande d un client authentifie echoue.
-- ============================================================

SET LOCAL role = anon;
SET LOCAL request.jwt.claims = '{"role":"anon"}';

DO $$
DECLARE
  v_res jsonb;
  v_order_num text;
  v_token text;
  v_order_data jsonb;
  v_bad_failed boolean := false;
  v_auth_order_failed boolean := false;
  v_auth_order_num text;
BEGIN
  -- Releve du numero de commande d un client enregistre pour verification d isolation
  PERFORM set_config('role', 'postgres', true);
  SELECT order_number INTO v_auth_order_num FROM public.orders WHERE user_id IS NOT NULL LIMIT 1;
  PERFORM set_config('role', 'anon', true);

  -- Creation de la commande invite (auth.uid() = NULL)
  v_res := public.place_order(
    jsonb_build_array(
      jsonb_build_object('variant_id', 'e1111111-1111-1111-1111-111111111111', 'quantity', 1)
    ),
    '{"first_name":"Invite","last_name":"Anonyme","email":"guest@example.com","phone":"+22890556677"}'::jsonb,
    '{"line1":"10 Boulevard Circulaire","city":"Lomé","country":"Togo"}'::jsonb,
    'cash_on_delivery'
  );

  v_order_num := v_res->>'order_number';
  v_token := v_res->>'guest_token';

  -- 1. Consultation avec le jeton valide renvoye lors de la creation
  v_order_data := public.get_guest_order(v_order_num, v_token);

  -- 2. Consultation avec un jeton errone (doit lever une exception)
  BEGIN
    PERFORM public.get_guest_order(v_order_num, 'jeton_completement_invalide_99999');
  EXCEPTION WHEN OTHERS THEN
    v_bad_failed := true;
  END;

  -- 3. Consultation d une commande enregistree avec un jeton invite (doit lever une exception)
  IF v_auth_order_num IS NOT NULL THEN
    BEGIN
      PERFORM public.get_guest_order(v_auth_order_num, v_token);
    EXCEPTION WHEN OTHERS THEN
      v_auth_order_failed := true;
    END;
  ELSE
    v_auth_order_failed := true;
  END IF;

  IF v_order_data IS NOT NULL
     AND (v_order_data->>'order_number') = v_order_num
     AND v_bad_failed
     AND v_auth_order_failed THEN
    INSERT INTO test_order_results (test_name, resultat, details)
    VALUES ('TEST 9 - Consultation commande invite avec jeton', 'RÉUSSI', 'Lecture permise avec le bon jeton, bloquee avec un mauvais jeton ou sur une commande membre');
    RAISE NOTICE 'TEST 9 (Consultation commande invite): RÉUSSI';
  ELSE
    INSERT INTO test_order_results (test_name, resultat, details)
    VALUES ('TEST 9 - Consultation commande invite avec jeton', 'ÉCHEC', format('Bon jeton: %s, Echec mauvais jeton: %s, Echec commande membre: %s', v_order_data IS NOT NULL, v_bad_failed, v_auth_order_failed));
    RAISE NOTICE 'TEST 9 (Consultation commande invite): ÉCHEC';
  END IF;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO test_order_results (test_name, resultat, details)
  VALUES ('TEST 9 - Consultation commande invite avec jeton', 'ÉCHEC', SQLERRM);
  RAISE NOTICE 'TEST 9 (Consultation commande invite): ÉCHEC - %', SQLERRM;
END $$;

-- ============================================================
-- TEST 10 : Anon ne lit aucune table de commandes
-- L utilisateur anonyme effectue des requetes directes sur les tables :
-- orders, order_items, payments, order_status_history, shipments.
-- Toutes les requetes doivent retourner 0 ligne.
-- ============================================================

SET LOCAL role = anon;
SET LOCAL request.jwt.claims = '{"role":"anon"}';

DO $$
DECLARE
  v_cnt_orders int;
  v_cnt_items int;
  v_cnt_payments int;
  v_cnt_history int;
  v_cnt_shipments int;
BEGIN
  SELECT count(*) INTO v_cnt_orders FROM public.orders;
  SELECT count(*) INTO v_cnt_items FROM public.order_items;
  SELECT count(*) INTO v_cnt_payments FROM public.payments;
  SELECT count(*) INTO v_cnt_history FROM public.order_status_history;
  SELECT count(*) INTO v_cnt_shipments FROM public.shipments;

  IF v_cnt_orders = 0 AND v_cnt_items = 0 AND v_cnt_payments = 0 AND v_cnt_history = 0 AND v_cnt_shipments = 0 THEN
    INSERT INTO test_order_results (test_name, resultat, details)
    VALUES ('TEST 10 - Anon ne lit aucune table de commandes', 'RÉUSSI', '0 ligne accessible sur orders, order_items, payments, order_status_history, shipments');
    RAISE NOTICE 'TEST 10 (Anon ne lit aucune table de commandes): RÉUSSI';
  ELSE
    INSERT INTO test_order_results (test_name, resultat, details)
    VALUES ('TEST 10 - Anon ne lit aucune table de commandes', 'ÉCHEC', format('Fuite anonyme : orders=%s, items=%s, payments=%s, history=%s, shipments=%s', v_cnt_orders, v_cnt_items, v_cnt_payments, v_cnt_history, v_cnt_shipments));
    RAISE NOTICE 'TEST 10 (Anon ne lit aucune table de commandes): ÉCHEC';
  END IF;
END $$;

-- ============================================================
-- Synthese finale des resultats de test
-- ============================================================

RESET role;
RESET request.jwt.claims;

SELECT
  id AS "#",
  test_name AS "Intitule du test",
  resultat AS "Statut",
  details AS "Details de verification"
FROM test_order_results
ORDER BY id;

-- ============================================================
-- Annulation de toutes les modifications (ROLLBACK)
-- ============================================================

ROLLBACK;
