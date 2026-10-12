/*
# Correction des avertissements de sécurité du linter

## Problèmes corrigés
1. `set_updated_at()` : search_path non fixé → ajout de SET search_path.
2. `handle_new_user()`, `is_admin()`, `next_order_number()` : exécutables par
   anon et authenticated via l'API REST → révocation de EXECUTE pour anon
   et authenticated (ces fonctions sont internes, appelées uniquement par
   des triggers ou le service_role).

## Sécurité
- set_updated_at devient SECURITY DEFINER avec search_path fixé (nécessaire
  car c'est une fonction trigger appelée sur toutes les tables).
- Les fonctions is_admin, handle_new_user et next_order_number ne sont
  plus appelables via l'API REST par anon ou authenticated.
- is_admin reste utilisable dans les politiques RLS car elle s'exécute
  dans le contexte de la politique, pas via un appel RPC direct.
*/

-- ============================================================
-- 1. set_updated_at : fixer le search_path
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- 2. Révoquer EXECUTE sur les fonctions SECURITY DEFINER
-- ============================================================

-- handle_new_user : uniquement appelée par le trigger sur auth.users
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;

-- is_admin : utilisée dans les politiques RLS, pas d'appel RPC direct nécessaire
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon, authenticated;

-- next_order_number : appelée par le service_role uniquement (création de commande)
REVOKE EXECUTE ON FUNCTION public.next_order_number() FROM anon, authenticated;
