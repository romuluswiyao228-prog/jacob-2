-- Migration : community_photos
-- Table pour les photos « Porté par la communauté ».
-- À ne pas appliquer sans relecture de l'administrateur.

-- ── Table ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.community_photos (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url         text        NOT NULL,
  alt_text          text        NOT NULL DEFAULT '',
  caption           text,
  link_path         text        CHECK (link_path IS NULL OR link_path ~ '^/[a-z0-9/_-]*$'),
  sort_order        int         NOT NULL DEFAULT 0,
  is_active         boolean     NOT NULL DEFAULT false,
  consent_confirmed boolean     NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT check_active_requires_consent CHECK (NOT is_active OR consent_confirmed)
);

ALTER TABLE public.community_photos ENABLE ROW LEVEL SECURITY;

-- ── Permissions ──────────────────────────────────────────────────────────────

REVOKE ALL ON public.community_photos FROM anon, authenticated;

GRANT SELECT                 ON public.community_photos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.community_photos TO authenticated;

-- ── RLS : lecture publique (lignes actives uniquement) ───────────────────────

CREATE POLICY "community_photos_select_public" ON public.community_photos
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- ── RLS : lecture admin (toutes lignes, actives ou non) ──────────────────────

CREATE POLICY "community_photos_select_admin" ON public.community_photos
  FOR SELECT TO authenticated
  USING (public.is_admin_aal2());

-- ── RLS : écriture réservée à is_admin_aal2() ────────────────────────────────

CREATE POLICY "community_photos_insert_admin" ON public.community_photos
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_aal2());

CREATE POLICY "community_photos_update_admin" ON public.community_photos
  FOR UPDATE TO authenticated
  USING  (public.is_admin_aal2())
  WITH CHECK (public.is_admin_aal2());

CREATE POLICY "community_photos_delete_admin" ON public.community_photos
  FOR DELETE TO authenticated
  USING (public.is_admin_aal2());

