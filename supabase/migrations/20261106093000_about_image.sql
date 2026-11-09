-- Migration about_image
-- Ajoute store_settings.about_image_url (text, nullable) et recree la vue
-- public_store_settings en conservant son mode de securite actuel et toutes
-- ses colonnes (y compris banner_mobile_url), plus about_image_url.

ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS about_image_url text;

DO $$
DECLARE
  v_invoker text;
BEGIN
  SELECT COALESCE(
    (SELECT split_part(o, '=', 2)
       FROM unnest(c.reloptions) AS o
      WHERE o LIKE 'security_invoker=%'
      LIMIT 1),
    'false')
    INTO v_invoker
    FROM pg_class c
   WHERE c.oid = 'public.public_store_settings'::regclass;

  EXECUTE 'DROP VIEW IF EXISTS public.public_store_settings';

  EXECUTE format($v$
    CREATE VIEW public.public_store_settings
      WITH (security_invoker = %s) AS
    SELECT
      store_name,
      tagline,
      description,
      logo_url,
      banner_url,
      banner_mobile_url,
      about_image_url,
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
      whatsapp_number,
      latitude,
      longitude,
      opening_hours,
      returns_policy,
      enabled_currencies
    FROM public.store_settings
  $v$, v_invoker);

  EXECUTE 'GRANT SELECT ON public.public_store_settings TO anon, authenticated';
END $$;

