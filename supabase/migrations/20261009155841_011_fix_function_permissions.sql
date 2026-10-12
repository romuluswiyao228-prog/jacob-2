/*
# Correction définitive des avertissements de sécurité

## Changements
1. `set_updated_at()` → SECURITY INVOKER (n'a pas besoin de DEFINER,
   les triggers s'exécutent avec les privilèges du propriétaire de la table).
2. `handle_new_user()` → REVOKE FROM PUBLIC (uniquement appelée par le
   trigger sur auth.users, qui s'exécute en tant que propriétaire de la table).
3. `is_admin()` → REVOKE FROM PUBLIC, GRANT à authenticated uniquement
   (nécessaire pour les politiques RLS qui l'appellent). anon n'y a pas accès.
4. `next_order_number()` → REVOKE FROM PUBLIC (uniquement appelée par
   le service_role lors de la création de commande).
*/

-- ============================================================
-- 1. set_updated_at → SECURITY INVOKER
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- 2. handle_new_user → REVOKE FROM PUBLIC
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;

-- ============================================================
-- 3. is_admin → REVOKE FROM PUBLIC, GRANT à authenticated
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ============================================================
-- 4. next_order_number → REVOKE FROM PUBLIC
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.next_order_number() FROM PUBLIC;
