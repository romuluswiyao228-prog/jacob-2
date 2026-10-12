-- ============================================================
-- Script de création du compte propriétaire (owner)
-- ============================================================
--
-- DESCRIPTION
--   Attribue le rôle 'owner' à un compte utilisateur existant.
--   À exécuter manuellement une seule fois dans le SQL Editor de
--   Supabase (ou via psql avec le service_role).
--
--   AUCUNE route ni fonction publique ne peut accorder ce rôle.
--
-- SÉCURITÉ
--   - Ce script nécessite le service_role (bypass RLS).
--   - Ne pas inclure ce script dans le code côté client.
--   - Refuse de s'exécuter s'il existe déjà un owner, sauf si
--     force_override est défini à true (cas de récupération).
--
-- UTILISATION
--   1. Remplacer 'owner@example.com' par votre e-mail.
--   2. Exécuter ce script dans le SQL Editor de Supabase.
--   3. Le script écrit une ligne dans admin_audit_log.
-- ============================================================

-- Paramètre : mettre à true SEULEMENT pour remplacer un owner existant
DO $$
DECLARE
  target_user_id uuid;
  existing_owner_count int;
  v_force boolean := false;  -- Mettre à true pour forcer (récupération)
BEGIN
  -- Vérifier qu'un utilisateur existe avec cet email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = 'owner@example.com';

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Aucun utilisateur trouvé avec cet email. Inscrivez-vous d''abord sur le site, confirmez votre e-mail, puis réexécutez ce script.';
  END IF;

  -- Vérifier qu'il n'existe pas déjà un owner
  SELECT count(*) INTO existing_owner_count
  FROM public.user_roles
  WHERE role = 'owner'::app_role;

  IF existing_owner_count > 0 AND v_force = false THEN
    RAISE EXCEPTION 'Un compte propriétaire existe déjà (%). Si vous devez le remplacer (récupération), mettez v_force à true dans ce script.', existing_owner_count;
  END IF;

  -- Attribuer le rôle owner
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'owner'::app_role)
  ON CONFLICT (user_id)
  DO UPDATE SET role = 'owner'::app_role, updated_at = now();

  -- Journaliser l'action
  INSERT INTO public.admin_audit_log (admin_id, action, table_name, record_id, new_values)
  VALUES (
    target_user_id,
    'OWNER_ROLE_GRANTED',
    'user_roles',
    target_user_id::text,
    jsonb_build_object('role', 'owner', 'email', 'owner@example.com', 'forced', v_force)
  );

  RAISE NOTICE 'Rôle owner attribué à l''utilisateur : %', target_user_id;
  RAISE NOTICE 'Action journalisée dans admin_audit_log.';
  RAISE NOTICE 'IMPORTANT : Connectez-vous sur /admin/connexion puis activez la MFA (étape 2.5 du cadrage).';
END $$;
