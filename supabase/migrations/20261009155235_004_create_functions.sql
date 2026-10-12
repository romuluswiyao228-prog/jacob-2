/*
# Fonctions SQL de base et trigger d'inscription

## Fonctions créées
- `is_admin()` : SECURITY DEFINER, search_path fixé, vérifie si l'utilisateur courant
  a le rôle 'owner' dans user_roles. Utilisée par les politiques RLS admin.
- `next_order_number()` : génère un numéro de commande lisible au format JDJ-AAAA-000123
  en utilisant la séquence order_number_seq.
- `handle_new_user()` : trigger SECURITY DEFINER qui crée automatiquement un profil
  et attribue le rôle 'customer' lors de l'inscription. Ne crée JAMAIS le rôle owner.

## Trigger
- `on_auth_user_created` : déclenche handle_new_user() après insertion dans auth.users.

## Sécurité
- is_admin() et handle_new_user() sont SECURITY DEFINER avec search_path fixé
  pour éviter les attaques par search_path.
- handle_new_user() ne peut attribuer que le rôle customer.
- Aucune route ni fonction publique ne peut accorder le rôle owner.
*/

-- ============================================================
-- is_admin() — SECURITY DEFINER, search_path fixé
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin()
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
  );
$$;

-- ============================================================
-- next_order_number() — génère JDJ-AAAA-000123
-- ============================================================

CREATE OR REPLACE FUNCTION public.next_order_number()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT 'JDJ-' || EXTRACT(YEAR FROM now())::text || '-' || LPAD(nextval('public.order_number_seq')::text, 6, '0');
$$;

-- ============================================================
-- handle_new_user() — crée profil + rôle customer
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Crée le profil
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;

  -- Attribue le rôle customer uniquement — JAMAIS owner
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer'::app_role)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ============================================================
-- Trigger sur auth.users
-- ============================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
