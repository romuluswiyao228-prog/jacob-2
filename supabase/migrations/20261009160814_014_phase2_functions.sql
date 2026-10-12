/*
# Phase 2 — is_admin_aal2(), protection colonnes profil, log_admin_action()

## Nouvelles fonctions
- `is_admin_aal2()` : SECURITY DEFINER, search_path fixé. Vérifie que
  l'utilisateur a le rôle 'owner' ET que son niveau d'authentification
  est 'aal2' (MFA activée et validée). Utilisée par toutes les politiques
  RLS d'administration (lecture ET écriture).
- `log_admin_action()` : SECURITY DEFINER, search_path fixé. Insère une
  ligne dans admin_audit_log. Uniquement appelée par le service_role ou
  des triggers, jamais depuis le client.

## Trigger
- `protect_profile_columns()` : BEFORE UPDATE sur profiles. Empêche la
  modification de id, email, created_at par le client. Seul le service_role
  (qui bypass RLS et les triggers via BYPASSRLS) peut modifier ces colonnes.

## Sécurité
- is_admin_aal2() utilise auth.jwt() ->> 'aal' pour vérifier le niveau AAL.
- Un propriétaire en aal1 (sans MFA validée) n'obtient jamais true.
- log_admin_action() n'est pas exécutable par anon ni authenticated.
- protect_profile_columns() lève une exception si une colonne protégée
  change de valeur et que l'appelant n'est pas le service_role.
*/

-- ============================================================
-- 1. is_admin_aal2() — owner + AAL2 requis
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin_aal2()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'owner'::app_role
  )
  AND COALESCE(auth.jwt() ->> 'aal', '') = 'aal2';
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_aal2() TO authenticated;

-- ============================================================
-- 2. log_admin_action() — audit log via SECURITY DEFINER
-- ============================================================

CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action text,
  p_table_name text,
  p_record_id text DEFAULT NULL,
  p_old_values jsonb DEFAULT NULL,
  p_new_values jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.admin_audit_log (admin_id, action, table_name, record_id, old_values, new_values)
  VALUES (auth.uid(), p_action, p_table_name, p_record_id, p_old_values, p_new_values);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_admin_action(text, text, text, jsonb, jsonb) FROM PUBLIC;

-- ============================================================
-- 3. protect_profile_columns() — empêche la modification de colonnes sensibles
-- ============================================================

CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Seul le service_role (qui a BYPASSRLS) peut modifier ces colonnes.
  -- On détecte le service_role en vérifiant que la session n'a pas d'auth.uid()
  -- (le service_role bypass auth.uid() qui retourne NULL).
  -- Pour les utilisateurs authentifiés, on bloque les colonnes sensibles.
  IF auth.uid() IS NOT NULL THEN
    IF NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'Modification de l''identifiant interdite';
    END IF;
    IF NEW.email IS DISTINCT FROM OLD.email THEN
      RAISE EXCEPTION 'Modification de l''email interdite. Contactez le support.';
    END IF;
    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Modification de la date de création interdite';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_columns ON public.profiles;
CREATE TRIGGER trg_protect_profile_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_columns();
