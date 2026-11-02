/*
Migration mfa_optionnelle

La double authentification (MFA) de l'administration devient un interrupteur.

- admin_requires_mfa() : false = mot de passe seul, true = mot de passe + code
  a 6 chiffres. Valeur actuelle : false.
- is_admin_aal2() (nom conserve, car toutes les politiques et fonctions
  d'administration l'utilisent) exige le role owner, et le niveau aal2
  seulement si admin_requires_mfa() est vrai.

Pour remettre la MFA obligatoire, executer dans le SQL Editor :

  CREATE OR REPLACE FUNCTION public.admin_requires_mfa()
  RETURNS boolean LANGUAGE sql STABLE
  SET search_path TO 'public', 'pg_temp'
  AS $$ SELECT true; $$;
*/

CREATE OR REPLACE FUNCTION public.admin_requires_mfa()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public', 'pg_temp'
AS $$ SELECT false; $$;

REVOKE ALL ON FUNCTION public.admin_requires_mfa() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_requires_mfa() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_admin_aal2()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'owner'::app_role
  )
  AND (
    NOT public.admin_requires_mfa()
    OR COALESCE(auth.jwt() ->> 'aal', '') = 'aal2'
  );
$$;

COMMENT ON FUNCTION public.is_admin_aal2() IS
  'Proprietaire de la boutique ; exige aussi la MFA (aal2) si admin_requires_mfa() est vrai.';
