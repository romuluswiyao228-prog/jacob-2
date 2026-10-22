/*
# Migration admin_settings_shipping_messages

1. store_settings :
   - latitude (double precision)
   - longitude (double precision)
   - opening_hours (text)
   - returns_policy (text)

2. contact_messages :
   - status (text: 'unread', 'read', 'processed', 'archived')

3. shipping_zones & shipping_rates :
   - shipping_zones.cities (text[] pour les villes ciblées)
   - shipping_rates.estimated_delivery (text pour libellé de délai estimé)

4. public_store_settings :
   - Mise à jour de la vue pour exposer les nouvelles colonnes publiques
     en conservant dynamiquement son mode de sécurité actuel (security_invoker).
*/

-- 1. store_settings : latitude, longitude, opening_hours, returns_policy
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS opening_hours text,
  ADD COLUMN IF NOT EXISTS returns_policy text;

-- 2. contact_messages : statut des messages
ALTER TABLE public.contact_messages
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'unread'
  CHECK (status IN ('unread', 'read', 'processed', 'archived'));

UPDATE public.contact_messages
SET status = 'read'
WHERE is_read = true AND status = 'unread';

-- 3. shipping_zones : villes
ALTER TABLE public.shipping_zones
  ADD COLUMN IF NOT EXISTS cities text[] NOT NULL DEFAULT ARRAY[]::text[];

-- 4. shipping_rates : délai estimé lisible
ALTER TABLE public.shipping_rates
  ADD COLUMN IF NOT EXISTS estimated_delivery text;

-- 5. Vue public_store_settings
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
      returns_policy
    FROM public.store_settings
  $v$, v_invoker);

  EXECUTE 'GRANT SELECT ON public.public_store_settings TO anon, authenticated';
END $$;
