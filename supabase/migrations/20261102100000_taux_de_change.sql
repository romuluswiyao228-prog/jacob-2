/*
Migration taux_de_change

1. Table exchange_rates :
   - devise : code ISO 4217 (ex: 'EUR', 'USD'), clé primaire
   - taux : numeric, taux de conversion XOF vers cette devise (1 XOF = taux devise)
   - mis_a_jour : timestamptz avec valeur par défaut now()
   - RLS : SELECT pour anon et authenticated, écriture (INSERT/UPDATE/DELETE) réservée à public.is_admin_aal2()

2. store_settings :
   - enabled_currencies text[] NOT NULL DEFAULT '{XOF,EUR,USD}'::text[]

3. Vue public_store_settings :
   - Re-créée en conservant dynamiquement son mode de sécurité actuel (security_invoker)
   - Expose enabled_currencies

4. Taux de l'euro :
   - Le franc CFA est arrimé à l'euro (1 EUR = 655,957 XOF, parité fixe).
   - Utilise cette valeur exacte pour l'EUR (1 XOF = 1 / 655.957 EUR).
*/

-- 1. Table exchange_rates
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  devise text PRIMARY KEY CHECK (length(devise) = 3),
  taux numeric NOT NULL CHECK (taux > 0),
  mis_a_jour timestamptz NOT NULL DEFAULT now()
);

-- RLS sur exchange_rates
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_exchange_rates_public" ON public.exchange_rates;
CREATE POLICY "select_exchange_rates_public" ON public.exchange_rates
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "modify_exchange_rates_admin_aal2" ON public.exchange_rates;
CREATE POLICY "modify_exchange_rates_admin_aal2" ON public.exchange_rates
  FOR ALL TO authenticated
  USING (public.is_admin_aal2())
  WITH CHECK (public.is_admin_aal2());

GRANT SELECT ON public.exchange_rates TO anon, authenticated;
GRANT ALL ON public.exchange_rates TO authenticated;

-- Insertion parité fixe EUR (1 EUR = 655.957 XOF) et devises initiales
INSERT INTO public.exchange_rates (devise, taux, mis_a_jour)
VALUES
  ('XOF', 1.0, now()),
  ('EUR', (1.0 / 655.957)::numeric, now()),
  ('USD', (1.08 / 655.957)::numeric, now())
ON CONFLICT (devise) DO UPDATE
  SET taux = EXCLUDED.taux,
      mis_a_jour = EXCLUDED.mis_a_jour;

-- 2. Colonne enabled_currencies dans store_settings
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS enabled_currencies text[] NOT NULL DEFAULT '{XOF,EUR,USD}'::text[];

-- 3. Mise à jour de la vue public_store_settings en préservant le mode security_invoker existant
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
      returns_policy,
      enabled_currencies
    FROM public.store_settings
  $v$, v_invoker);

  EXECUTE 'GRANT SELECT ON public.public_store_settings TO anon, authenticated';
END $$;

