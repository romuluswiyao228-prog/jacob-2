-- Migration 018: categories chaussures, bijoux, sacs, lunettes
-- Sans accents dans les commentaires pour compatibilite

-- 1. Desactiver la categorie Polo
UPDATE public.categories
SET is_active = false
WHERE slug = 'polo';

-- 2. Inserer les nouvelles categories avec gestion de conflit sur slug
INSERT INTO public.categories (name, slug, sort_order, is_active)
VALUES
  ('Chaussures', 'chaussures', 6, true),
  ('Sacs', 'sacs', 7, true),
  ('Bijoux', 'bijoux', 8, true),
  ('Lunettes', 'lunettes', 9, true)
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

-- 3. Mettre a jour l ordre d affichage coherent pour toutes les categories actives
UPDATE public.categories SET sort_order = 1 WHERE slug = 't-shirts';
UPDATE public.categories SET sort_order = 2 WHERE slug = 'chemises';
UPDATE public.categories SET sort_order = 3 WHERE slug = 'pantalons';
UPDATE public.categories SET sort_order = 4 WHERE slug = 'shorts';
UPDATE public.categories SET sort_order = 5 WHERE slug = 'vestes-manteaux';
UPDATE public.categories SET sort_order = 6 WHERE slug = 'chaussures';
UPDATE public.categories SET sort_order = 7 WHERE slug = 'sacs';
UPDATE public.categories SET sort_order = 8 WHERE slug = 'bijoux';
UPDATE public.categories SET sort_order = 9 WHERE slug = 'lunettes';
