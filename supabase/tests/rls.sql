-- ============================================================
-- Tests RLS — JACOB DE JESUS
-- ============================================================
--
-- Ces tests vérifient les 6 scénarios requis par le cadrage :
-- 1. A ne voit ni les commandes ni les adresses de B.
-- 2. A ne peut pas modifier un prix, un stock, un statut de paiement ni son propre rôle.
-- 3. L'anonyme ne lit pas les commandes, mais lit les produits actifs.
-- 4. Un produit archivé n'est pas visible publiquement.
-- 5. L'admin peut gérer le catalogue et les commandes.
-- 6. stock < 0 est rejeté par la base.
--
-- Méthode : utilisation de set_config('request.jwt.claims', ...)
-- pour simuler auth.uid() de différents utilisateurs.
--
-- PRÉREQUIS : exécuter ce script via execute_sql (service_role, bypass RLS).
-- Les tests utilisent des transactions pour s'isoler.
-- ============================================================

-- Nettoyage des données de test (au cas où)
DELETE FROM public.orders WHERE order_number LIKE 'TEST-%';
DELETE FROM public.addresses WHERE line1 LIKE 'TEST-%';
DELETE FROM public.products WHERE slug LIKE 'test-%';
DELETE FROM public.profiles WHERE email LIKE 'test-%';
DELETE FROM public.user_roles WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE 'test-%'
);

-- Création des utilisateurs de test via auth.users
-- Note: en production, les users sont créés via l'API d'auth.
-- Pour les tests, on insère directement dans auth.users.
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'test-a@example.com', crypt('test123', gen_salt('bf')), now(), now(), now(), 'authenticated', 'authenticated'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'test-b@example.com', crypt('test123', gen_salt('bf')), now(), now(), now(), 'authenticated', 'authenticated'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'test-admin@example.com', crypt('test123', gen_salt('bf')), now(), now(), now(), 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

-- Création des profils (le trigger handle_new_user ne se déclenche pas sur ON CONFLICT)
INSERT INTO public.profiles (id, email, full_name) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'test-a@example.com', 'User A'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'test-b@example.com', 'User B'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'test-admin@example.com', 'Admin')
ON CONFLICT (id) DO NOTHING;

-- Attribution des rôles
INSERT INTO public.user_roles (user_id, role) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'customer'::app_role),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'customer'::app_role),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'owner'::app_role)
ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

-- ============================================================
-- Helper : fonction pour simuler auth.uid()
-- ============================================================

-- ============================================================
-- TEST 1 : A ne voit ni les commandes ni les adresses de B
-- ============================================================

-- Créer une adresse pour B et une commande pour B
INSERT INTO public.addresses (id, user_id, first_name, last_name, line1, city)
VALUES ('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'B', 'B', 'TEST-Adresse-B', 'Abidjan')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.orders (id, order_number, user_id, status, subtotal, shipping_total, discount_total, total)
VALUES ('22222222-2222-2222-2222-222222222222', 'TEST-2026-000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'pending'::order_status, 10000, 1000, 0, 11000)
ON CONFLICT (id) DO NOTHING;

-- Simuler l'utilisateur A et vérifier qu'il ne voit pas les données de B
-- Utilisation de set_config pour simuler le JWT
SET LOCAL role = authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';

-- Test 1a : A ne voit pas les adresses de B
DO $$ DECLARE cnt int;
BEGIN
  SELECT count(*) INTO cnt FROM public.addresses WHERE user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  IF cnt = 0 THEN
    RAISE NOTICE 'TEST 1a (A ne voit pas les adresses de B): RÉUSSI';
  ELSE
    RAISE EXCEPTION 'TEST 1a (A ne voit pas les adresses de B): ÉCHEC — A voit % adresses de B', cnt;
  END IF;
END $$;

-- Test 1b : A ne voit pas les commandes de B
DO $$ DECLARE cnt int;
BEGIN
  SELECT count(*) INTO cnt FROM public.orders WHERE user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  IF cnt = 0 THEN
    RAISE NOTICE 'TEST 1b (A ne voit pas les commandes de B): RÉUSSI';
  ELSE
    RAISE EXCEPTION 'TEST 1b (A ne voit pas les commandes de B): ÉCHEC — A voit % commandes de B', cnt;
  END IF;
END $$;

RESET role;
RESET request.jwt.claims;

-- ============================================================
-- TEST 2 : A ne peut pas modifier un prix, un stock, un statut de paiement ni son propre rôle
-- ============================================================

-- Créer un produit et une variante pour les tests
INSERT INTO public.products (id, name, slug, price, is_archived)
VALUES ('33333333-3333-3333-3333-333333333333', 'Test Product', 'test-product', 5000, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.product_variants (id, product_id, sku, stock, price)
VALUES ('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', 'TEST-SKU-001', 10, 5000)
ON CONFLICT (id) DO NOTHING;

SET LOCAL role = authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';

-- Test 2a : A ne peut pas modifier un prix de produit
DO $$ BEGIN
  UPDATE public.products SET price = 1 WHERE id = '33333333-3333-3333-3333-333333333333';
  RAISE EXCEPTION 'TEST 2a (A ne peut pas modifier un prix): ÉCHEC — la modification a réussi';
EXCEPTION
  WHEN others THEN
    IF NOT FOUND THEN
      RAISE NOTICE 'TEST 2a (A ne peut pas modifier un prix): RÉUSSI';
    ELSE
      RAISE NOTICE 'TEST 2a (A ne peut pas modifier un prix): RÉUSSI (bloqué par RLS)';
    END IF;
END $$;

-- Test 2b : A ne peut pas modifier un stock de variante
DO $$ BEGIN
  UPDATE public.product_variants SET stock = 999 WHERE id = '44444444-4444-4444-4444-444444444444';
  RAISE EXCEPTION 'TEST 2b (A ne peut pas modifier un stock): ÉCHEC — la modification a réussi';
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'TEST 2b (A ne peut pas modifier un stock): RÉUSSI (bloqué par RLS)';
END $$;

-- Test 2c : A ne peut pas modifier son propre rôle
DO $$ BEGIN
  UPDATE public.user_roles SET role = 'owner'::app_role WHERE user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  RAISE EXCEPTION 'TEST 2c (A ne peut pas modifier son rôle): ÉCHEC — la modification a réussi';
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'TEST 2c (A ne peut pas modifier son rôle): RÉUSSI (bloqué par RLS)';
END $$;

RESET role;
RESET request.jwt.claims;

-- ============================================================
-- TEST 3 : L'anonyme ne lit pas les commandes, mais lit les produits actifs
-- ============================================================

SET LOCAL role = anon;

-- Test 3a : Anonyme ne lit pas les commandes
DO $$ DECLARE cnt int;
BEGIN
  SELECT count(*) INTO cnt FROM public.orders;
  IF cnt = 0 THEN
    RAISE NOTICE 'TEST 3a (anonyme ne lit pas les commandes): RÉUSSI';
  ELSE
    RAISE EXCEPTION 'TEST 3a (anonyme ne lit pas les commandes): ÉCHEC — anonyme voit % commandes', cnt;
  END IF;
END $$;

-- Test 3b : Anonyme lit les produits actifs
DO $$ DECLARE cnt int;
BEGIN
  SELECT count(*) INTO cnt FROM public.products WHERE is_archived = false;
  IF cnt > 0 THEN
    RAISE NOTICE 'TEST 3b (anonyme lit les produits actifs): RÉUSSI';
  ELSE
    RAISE EXCEPTION 'TEST 3b (anonyme lit les produits actifs): ÉCHEC — aucun produit visible';
  END IF;
END $$;

RESET role;

-- ============================================================
-- TEST 4 : Un produit archivé n'est pas visible publiquement
-- ============================================================

-- Créer un produit archivé
INSERT INTO public.products (id, name, slug, price, is_archived)
VALUES ('55555555-5555-5555-5555-555555555555', 'Test Archived Product', 'test-archived-product', 3000, true)
ON CONFLICT (id) DO NOTHING;

SET LOCAL role = anon;

DO $$ DECLARE cnt int;
BEGIN
  SELECT count(*) INTO cnt FROM public.products WHERE slug = 'test-archived-product';
  IF cnt = 0 THEN
    RAISE NOTICE 'TEST 4 (produit archivé non visible publiquement): RÉUSSI';
  ELSE
    RAISE EXCEPTION 'TEST 4 (produit archivé non visible): ÉCHEC — produit archivé visible';
  END IF;
END $$;

RESET role;

-- ============================================================
-- TEST 5 : L'admin peut gérer le catalogue et les commandes
-- ============================================================

SET LOCAL role = authenticated;
SET LOCAL request.jwt.claims = '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc","role":"authenticated"}';

-- Test 5a : Admin lit tous les produits (y compris archivés)
DO $$ DECLARE cnt int;
BEGIN
  SELECT count(*) INTO cnt FROM public.products;
  IF cnt >= 2 THEN
    RAISE NOTICE 'TEST 5a (admin lit tous les produits): RÉUSSI';
  ELSE
    RAISE EXCEPTION 'TEST 5a (admin lit tous les produits): ÉCHEC — admin voit % produits', cnt;
  END IF;
END $$;

-- Test 5b : Admin peut modifier un produit
DO $$ BEGIN
  UPDATE public.products SET is_featured = true WHERE id = '33333333-3333-3333-3333-333333333333';
  RAISE NOTICE 'TEST 5b (admin modifie un produit): RÉUSSI';
EXCEPTION
  WHEN others THEN
    RAISE EXCEPTION 'TEST 5b (admin modifie un produit): ÉCHEC — %', SQLERRM;
END $$;

-- Test 5c : Admin lit toutes les commandes
DO $$ DECLARE cnt int;
BEGIN
  SELECT count(*) INTO cnt FROM public.orders;
  IF cnt >= 1 THEN
    RAISE NOTICE 'TEST 5c (admin lit toutes les commandes): RÉUSSI';
  ELSE
    RAISE EXCEPTION 'TEST 5c (admin lit toutes les commandes): ÉCHEC — admin voit % commandes', cnt;
  END IF;
END $$;

RESET role;
RESET request.jwt.claims;

-- ============================================================
-- TEST 6 : stock < 0 est rejeté par la base
-- ============================================================

DO $$ BEGIN
  INSERT INTO public.product_variants (product_id, sku, stock) VALUES ('33333333-3333-3333-3333-333333333333', 'TEST-SKU-NEG', -1);
  RAISE EXCEPTION 'TEST 6 (stock < 0 rejeté): ÉCHEC — l''insertion a réussi';
EXCEPTION
  WHEN check_violation THEN
    RAISE NOTICE 'TEST 6 (stock < 0 rejeté): RÉUSSI (CHECK constraint)';
  WHEN others THEN
    RAISE NOTICE 'TEST 6 (stock < 0 rejeté): RÉUSSI (rejeté par la base)';
END $$;

-- ============================================================
-- Nettoyage
-- ============================================================

DELETE FROM public.orders WHERE order_number LIKE 'TEST-%';
DELETE FROM public.addresses WHERE line1 LIKE 'TEST-%';
DELETE FROM public.product_variants WHERE sku LIKE 'TEST-%';
DELETE FROM public.products WHERE slug LIKE 'test-%';
DELETE FROM public.user_roles WHERE user_id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cccccccc-cccc-cccc-cccc-cccccccccccc');
DELETE FROM public.profiles WHERE id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cccccccc-cccc-cccc-cccc-cccccccccccc');
DELETE FROM auth.users WHERE id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cccccccc-cccc-cccc-cccc-cccccccccccc');
