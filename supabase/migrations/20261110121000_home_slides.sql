-- Migration : home_slides
-- Table pour les deux cadres photo portrait de la bannière d'accueil.
-- À ne pas appliquer sans relecture de l'administrateur.

-- ── Table ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.home_slides (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url   text        NOT NULL,
  alt_text    text        NOT NULL DEFAULT '',
  side        text        NOT NULL CHECK (side IN ('left', 'right')),
  sort_order  int         NOT NULL DEFAULT 0,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.home_slides ENABLE ROW LEVEL SECURITY;

-- ── Trigger : maximum 6 photos actives par côté ──────────────────────────────

CREATE OR REPLACE FUNCTION public.check_home_slides_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  IF NEW.is_active = true THEN
    SELECT COUNT(*) INTO v_count
      FROM public.home_slides
     WHERE side      = NEW.side
       AND is_active = true
       AND id IS DISTINCT FROM NEW.id;   -- exclure la ligne elle-même en UPDATE

    IF v_count >= 6 THEN
      RAISE EXCEPTION
        'Maximum 6 photos actives par côté. Le côté « % » en est déjà à 6.',
        NEW.side;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_home_slides_limit
  BEFORE INSERT OR UPDATE ON public.home_slides
  FOR EACH ROW
  EXECUTE FUNCTION public.check_home_slides_limit();

-- ── Permissions ──────────────────────────────────────────────────────────────

REVOKE ALL ON public.home_slides FROM anon, authenticated;

GRANT SELECT                 ON public.home_slides TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.home_slides TO authenticated;

-- ── RLS : lecture publique (lignes actives uniquement) ───────────────────────

CREATE POLICY "home_slides_select_public" ON public.home_slides
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- ── RLS : lecture admin (toutes lignes, actives ou non) ──────────────────────

CREATE POLICY "home_slides_select_admin" ON public.home_slides
  FOR SELECT TO authenticated
  USING (public.is_admin_aal2());

-- ── RLS : écriture réservée à is_admin_aal2() ────────────────────────────────

CREATE POLICY "home_slides_insert_admin" ON public.home_slides
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_aal2());

CREATE POLICY "home_slides_update_admin" ON public.home_slides
  FOR UPDATE TO authenticated
  USING  (public.is_admin_aal2())
  WITH CHECK (public.is_admin_aal2());

CREATE POLICY "home_slides_delete_admin" ON public.home_slides
  FOR DELETE TO authenticated
  USING (public.is_admin_aal2());

