-- Banniere de la page d'accueil : photo plein ecran choisie par le proprietaire.
-- La vue publique est recreee avec la colonne en plus, en conservant son mode
-- de securite actuel (security_invoker vrai ou faux), quel qu'il soit.

alter table public.store_settings
  add column if not exists banner_url text;

do $$
declare
  invoker text;
begin
  select coalesce(
    (select split_part(o, '=', 2)
       from unnest(c.reloptions) as o
      where o like 'security_invoker=%'
      limit 1),
    'false')
    into invoker
    from pg_class c
   where c.oid = 'public.public_store_settings'::regclass;

  execute 'drop view if exists public.public_store_settings';

  execute format($v$
    create view public.public_store_settings
      with (security_invoker = %s) as
    select
      store_name, tagline, description, logo_url, email, phone, address,
      city, country, currency, social_links, about_text, legal_mentions,
      cgv, privacy_policy, announcement_text, whatsapp_number, banner_url
    from public.store_settings
  $v$, invoker);

  execute 'grant select on public.public_store_settings to anon, authenticated';
end $$;
