-- ============================================================
-- Tests d'authentification et de roles - JACOB DE JESUS
-- Fichier : supabase/tests/auth.sql
--
-- A COLLER ENTIEREMENT dans le SQL Editor de Supabase, puis Run.
--
-- Le script ne laisse RIEN dans la base : il se termine volontairement
-- par une erreur (RAISE EXCEPTION) qui annule toutes les donnees de test
-- et affiche le resultat de chaque verification.
-- Lisez le message : "RESULTAT : N reussis, 0 echecs" = tout va bien.
-- ============================================================

CREATE TEMP TABLE t_res (n serial PRIMARY KEY, test text, ok boolean, detail text);
GRANT ALL ON t_res TO PUBLIC;
GRANT ALL ON SEQUENCE t_res_n_seq TO PUBLIC;

-- Execute une instruction sous un role et des claims JWT donnes.
-- Renvoie 'rows:N' ou 'error:SQLSTATE'. Le role est toujours reinitialise.
CREATE FUNCTION pg_temp.try_as(p_role text, p_claims text, p_sql text) RETURNS text
LANGUAGE plpgsql AS $f$
DECLARE
  rc int;
BEGIN
  PERFORM set_config('request.jwt.claims', p_claims, true);
  EXECUTE 'SET LOCAL ROLE ' || quote_ident(p_role);
  BEGIN
    EXECUTE p_sql;
    GET DIAGNOSTICS rc = ROW_COUNT;
    EXECUTE 'RESET ROLE';
    RETURN 'rows:' || rc;
  EXCEPTION WHEN OTHERS THEN
    EXECUTE 'RESET ROLE';
    RETURN 'error:' || SQLSTATE;
  END;
END
$f$;

CREATE FUNCTION pg_temp.rec(p_test text, p_ok boolean, p_detail text) RETURNS void
LANGUAGE sql AS $f$
  INSERT INTO t_res (test, ok, detail) VALUES (p_test, p_ok, p_detail);
$f$;

-- ------------------------------------------------------------
-- Donnees de test (le trigger handle_new_user cree profil + role customer)
-- ------------------------------------------------------------
INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at, aud, role)
VALUES
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'authtest-a@example.com', now(), now(), now(), 'authenticated', 'authenticated'),
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 'authtest-b@example.com', now(), now(), now(), 'authenticated', 'authenticated'),
  ('c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', 'authtest-owner@example.com', now(), now(), now(), 'authenticated', 'authenticated'),
  ('d4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4', 'authtest-d@example.com', now(), now(), now(), 'authenticated', 'authenticated');

UPDATE public.user_roles SET role = 'owner'::app_role
WHERE user_id = 'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3';

INSERT INTO public.products (id, name, slug, price, is_archived) VALUES
  ('e1e1e1e1-e1e1-e1e1-e1e1-e1e1e1e1e1e1', 'AuthTest visible', 'authtest-visible', 5000, false),
  ('e2e2e2e2-e2e2-e2e2-e2e2-e2e2e2e2e2e2', 'AuthTest archive', 'authtest-archived', 3000, true);

INSERT INTO public.addresses (user_id, first_name, last_name, line1, city) VALUES
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'A', 'A', 'AUTHTEST adresse A', 'Lome'),
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 'B', 'B', 'AUTHTEST adresse B', 'Lome');

INSERT INTO public.contact_messages (name, email, subject, message)
VALUES ('Test', 'test@example.com', 'AUTHTEST', 'AUTHTEST');

-- ------------------------------------------------------------
-- Tests
-- ------------------------------------------------------------
DO $$
DECLARE
  claims_a  text := '{"sub":"a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1","role":"authenticated","aal":"aal1"}';
  claims_d  text := '{"sub":"d4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4","role":"authenticated","aal":"aal1"}';
  owner1    text := '{"sub":"c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3","role":"authenticated","aal":"aal1"}';
  owner2    text := '{"sub":"c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3","role":"authenticated","aal":"aal2"}';
  r text;
  n int;
  v text;
BEGIN
  -- TEST 1 : un client inscrit a uniquement le role customer
  SELECT count(*), min(role::text) INTO n, v FROM public.user_roles
   WHERE user_id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
  PERFORM pg_temp.rec('1 client inscrit = customer uniquement', n = 1 AND v = 'customer', n || ' ligne(s), role ' || v);

  -- TEST 2a : un client ne peut pas s'inserer un role owner (on retire d'abord sa ligne)
  DELETE FROM public.user_roles WHERE user_id = 'd4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4';
  r := pg_temp.try_as('authenticated', claims_d,
    $q$INSERT INTO public.user_roles (user_id, role) VALUES ('d4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4', 'owner'::app_role)$q$);
  SELECT count(*) INTO n FROM public.user_roles WHERE user_id = 'd4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4';
  PERFORM pg_temp.rec('2a INSERT user_roles bloque', r IN ('error:42501', 'rows:0') AND n = 0, r || ', lignes creees : ' || n);

  -- TEST 2b : un client ne peut pas modifier son role
  r := pg_temp.try_as('authenticated', claims_a,
    $q$UPDATE public.user_roles SET role = 'owner'::app_role WHERE user_id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'$q$);
  SELECT role::text INTO v FROM public.user_roles WHERE user_id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
  PERFORM pg_temp.rec('2b UPDATE user_roles bloque', r IN ('error:42501', 'rows:0') AND v = 'customer', r || ', role apres : ' || v);

  -- TEST 2c : un client ne peut pas supprimer son role
  r := pg_temp.try_as('authenticated', claims_a,
    $q$DELETE FROM public.user_roles WHERE user_id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'$q$);
  SELECT count(*) INTO n FROM public.user_roles WHERE user_id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
  PERFORM pg_temp.rec('2c DELETE user_roles bloque', r IN ('error:42501', 'rows:0') AND n = 1, r || ', lignes restantes : ' || n);

  -- TEST 3 : role=owner dans les metadonnees d'inscription = ignore
  INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at, aud, role, raw_user_meta_data)
  VALUES ('f6f6f6f6-f6f6-f6f6-f6f6-f6f6f6f6f6f6', 'authtest-meta@example.com', now(), now(), now(),
          'authenticated', 'authenticated', '{"role":"owner","full_name":"Hacker"}');
  SELECT count(*), min(role::text) INTO n, v FROM public.user_roles
   WHERE user_id = 'f6f6f6f6-f6f6-f6f6-f6f6-f6f6f6f6f6f6';
  PERFORM pg_temp.rec('3 metadonnees owner ignorees', n = 1 AND v = 'customer', n || ' ligne(s), role ' || coalesce(v, 'aucun'));

  -- TEST 4a : le journal d'audit n'est pas ecrivable par un client ni un visiteur
  PERFORM pg_temp.rec('4a log_admin_action non executable (anon, client)',
    NOT has_function_privilege('anon', 'public.log_admin_action(text,text,text,jsonb,jsonb)', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'public.log_admin_action(text,text,text,jsonb,jsonb)', 'EXECUTE'),
    'verifie les droits d''execution');

  -- TEST 4b : les fonctions d'administration refusent client et proprietaire sans MFA
  r := pg_temp.try_as('authenticated', claims_a, $q$SELECT public.admin_dashboard_stats()$q$);
  PERFORM pg_temp.rec('4b admin_dashboard_stats refuse un client', r LIKE 'error:%', r);
  r := pg_temp.try_as('authenticated', owner1, $q$SELECT public.admin_dashboard_stats()$q$);
  PERFORM pg_temp.rec('4c admin_dashboard_stats refuse le proprietaire sans MFA', r LIKE 'error:%', r);
  r := pg_temp.try_as('authenticated', owner2, $q$SELECT public.admin_dashboard_stats()$q$);
  PERFORM pg_temp.rec('4d admin_dashboard_stats accepte le proprietaire avec MFA', r = 'rows:1', r);

  -- TEST 5 : proprietaire SANS MFA (aal1) : aucune donnee d'administration
  SELECT count(*) INTO n FROM public.store_settings;
  PERFORM pg_temp.rec('5 prerequis : une ligne store_settings existe', n >= 1, n || ' ligne(s)');
  r := pg_temp.try_as('authenticated', owner1, $q$SELECT 1 FROM public.contact_messages$q$);
  PERFORM pg_temp.rec('5a aal1 ne lit pas contact_messages', r = 'rows:0', r);
  r := pg_temp.try_as('authenticated', owner1, $q$SELECT 1 FROM public.products WHERE slug = 'authtest-archived'$q$);
  PERFORM pg_temp.rec('5b aal1 ne lit pas les produits archives', r = 'rows:0', r);
  r := pg_temp.try_as('authenticated', owner1, $q$UPDATE public.products SET is_featured = true WHERE slug = 'authtest-visible'$q$);
  PERFORM pg_temp.rec('5c aal1 ne modifie pas les produits', r IN ('rows:0', 'error:42501'), r);
  r := pg_temp.try_as('authenticated', owner1, $q$UPDATE public.store_settings SET store_name = store_name$q$);
  PERFORM pg_temp.rec('5d aal1 ne modifie pas store_settings', r IN ('rows:0', 'error:42501'), r);

  -- TEST 6 : proprietaire AVEC MFA (aal2) : acces complet
  r := pg_temp.try_as('authenticated', owner2, $q$SELECT 1 FROM public.products WHERE slug = 'authtest-archived'$q$);
  PERFORM pg_temp.rec('6a aal2 lit les produits archives', r = 'rows:1', r);
  r := pg_temp.try_as('authenticated', owner2, $q$UPDATE public.products SET is_featured = true WHERE slug = 'authtest-visible'$q$);
  PERFORM pg_temp.rec('6b aal2 modifie un produit', r = 'rows:1', r);
  r := pg_temp.try_as('authenticated', owner2, $q$SELECT 1 FROM public.contact_messages$q$);
  PERFORM pg_temp.rec('6c aal2 lit contact_messages', r = 'rows:1', r);
  r := pg_temp.try_as('authenticated', owner2, $q$UPDATE public.store_settings SET store_name = store_name$q$);
  PERFORM pg_temp.rec('6d aal2 modifie store_settings', r = 'rows:1', r);

  -- TEST 7 : un client ne voit que ses propres donnees
  r := pg_temp.try_as('authenticated', claims_a, $q$SELECT 1 FROM public.profiles$q$);
  PERFORM pg_temp.rec('7a le client ne lit que son profil', r = 'rows:1', r);
  r := pg_temp.try_as('authenticated', claims_a,
    $q$SELECT 1 FROM public.addresses WHERE user_id = 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2'$q$);
  PERFORM pg_temp.rec('7b le client ne lit pas les adresses d''un autre', r = 'rows:0', r);
  r := pg_temp.try_as('authenticated', claims_a,
    $q$SELECT 1 FROM public.addresses WHERE user_id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'$q$);
  PERFORM pg_temp.rec('7c le client lit ses propres adresses', r = 'rows:1', r);
  r := pg_temp.try_as('authenticated', claims_a, $q$SELECT 1 FROM public.orders$q$);
  PERFORM pg_temp.rec('7d le client ne lit pas les commandes des autres', r = 'rows:0', r);
  r := pg_temp.try_as('authenticated', claims_a,
    $q$UPDATE public.profiles SET email = 'pirate@example.com' WHERE id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'$q$);
  PERFORM pg_temp.rec('7e le client ne peut pas changer son e-mail de profil', r LIKE 'error:%' OR r = 'rows:0', r);

  -- TEST 8 : la redirection de l'interface est couverte par les tests Vitest
END
$$;

-- ------------------------------------------------------------
-- Resume : erreur VOULUE, elle annule toutes les donnees de test
-- ------------------------------------------------------------
DO $$
DECLARE
  nb_ok int;
  nb_ko int;
  lignes text;
BEGIN
  SELECT count(*) FILTER (WHERE ok), count(*) FILTER (WHERE NOT ok) INTO nb_ok, nb_ko FROM t_res;
  SELECT string_agg(CASE WHEN ok THEN 'REUSSI ' ELSE 'ECHEC  ' END || test || '  [' || detail || ']', E'\n' ORDER BY n)
    INTO lignes FROM t_res;
  RAISE EXCEPTION E'RESULTAT : % reussis, % echecs (cette erreur est voulue : elle annule les donnees de test)\n\n%',
    nb_ok, nb_ko, lignes;
END
$$;
