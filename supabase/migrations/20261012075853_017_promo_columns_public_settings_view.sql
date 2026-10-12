/*
Migration 017 - Colonnes promo, reglages boutique, vue publique

1. products.compare_at_price : ancien prix barre (XOF). Produit en promo si non NULL.
2. store_settings : announcement_text et whatsapp_number.
3. Vue public_store_settings : expose uniquement les colonnes publiques.
4. Lecture directe de store_settings reservee a l'admin avec MFA (aal2).
5. Pays par defaut : Togo.
*/

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS compare_at_price bigint
  CHECK (compare_at_price IS NULL OR compare_at_price > price);

ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS announcement_text text;

ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS whatsapp_number text
  CHECK (whatsapp_number IS NULL OR whatsapp_number ~ '^[0-9]{8,15}$');

DROP VIEW IF EXISTS public.public_store_settings;

CREATE VIEW public.public_store_settings
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
  legal_mentions,
  cgv,
  privacy_policy,
  announcement_text,
  whatsapp_number
FROM public.store_settings;

GRANT SELECT ON public.public_store_settings TO anon, authenticated;

DROP POLICY IF EXISTS "select_store_settings_public" ON public.store_settings;
DROP POLICY IF EXISTS "select_store_settings_admin" ON public.store_settings;

CREATE POLICY "select_store_settings_admin" ON public.store_settings
  FOR SELECT TO authenticated USING (public.is_admin_aal2());

REVOKE SELECT ON public.store_settings FROM anon;

ALTER TABLE public.store_settings ALTER COLUMN country SET DEFAULT 'Togo';
UPDATE public.store_settings SET country = 'Togo' WHERE country <> 'Togo';