/*
# Migration 017 — Colonnes promo, réglages boutique, vue publique

## Changements
1. products : ajout compare_at_price (bigint, nullable, XOF) — ancien prix barré.
   CHECK : compare_at_price IS NULL OR compare_at_price > price.
   Un produit est « en promo » si compare_at_price n'est pas NULL.
2. store_settings : ajout announcement_text (text, nullable) et whatsapp_number (text, nullable).
3. Création de la vue public_store_settings (SECURITY DEFINER) : expose uniquement
   les colonnes publiques de store_settings. Lecture accordée à anon + authenticated.
4. Restriction de la lecture directe de store_settings à l'admin uniquement.
   L'ancienne politique select_store_settings_public (USING true) est supprimée.
5. Révocation du SELECT sur store_settings pour le rôle anon.

## Colonne non exposée dans la vue
- legal_mentions, cgv, privacy_policy : non exposés dans la vue publique
  (accès via routes dédiées ou admin uniquement).
- id, created_at, updated_at : champs internes non exposés.

## Note sur shipping_zones / shipping_rates
- La lecture publique est déjà en place (migration 007, lignes 126-173).
  shipping_zones : SELECT public où is_active = true.
  shipping_rates : SELECT public où la zone parent est active.
*/

-- ============================================================
-- 1. products : compare_at_price
-- ============================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS compare_at_price bigint
  CHECK (compare_at_price IS NULL OR compare_at_price > price);

-- ============================================================
-- 2. store_settings : announcement_text, whatsapp_number
-- ============================================================

ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS announcement_text text;

ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS whatsapp_number text;

-- ============================================================
-- 3. Vue publique public_store_settings (SECURITY DEFINER)
-- ============================================================

DROP VIEW IF EXISTS public.public_store_settings;

CREATE OR REPLACE VIEW public.public_store_settings
  WITH (security_invoker = false) AS
SELECT
  store_name,
  tagline,
  description,
  logo_url,
  email,
  phone,
  address,
  city,
  country,
  currency,
  social_links,
  about_text,
  announcement_text,
  whatsapp_number
FROM public.store_settings;

GRANT SELECT ON public.public_store_settings TO anon, authenticated;

-- ============================================================
-- 4. Restriction de la lecture directe de store_settings à l'admin
-- ============================================================

DROP POLICY IF EXISTS "select_store_settings_public" ON public.store_settings;
DROP POLICY IF EXISTS "select_store_settings_admin" ON public.store_settings;

CREATE POLICY "select_store_settings_admin" ON public.store_settings FOR SELECT
  TO authenticated USING (public.is_admin());

-- La politique update reste inchangée (update_store_settings_admin, déjà en place)

-- ============================================================
-- 5. Révoquer la lecture directe de store_settings pour anon
-- ============================================================

REVOKE SELECT ON public.store_settings FROM anon;
