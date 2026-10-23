-- Retire la categorie Polo et ajoute Chaussures, Sacs, Bijoux et Lunettes.
-- Rejouable : sans effet si les changements existent deja.

-- Retirer Polo : suppression si aucun produit ne l'utilise,
-- sinon desactivation si la colonne is_active existe.
DO $$
DECLARE
  used integer;
  has_active boolean;
BEGIN
  SELECT count(*) INTO used
  FROM public.products p
  JOIN public.categories c ON c.id = p.category_id
  WHERE c.slug = 'polo';

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'categories'
      AND column_name = 'is_active'
  ) INTO has_active;

  IF used = 0 THEN
    DELETE FROM public.categories WHERE slug = 'polo';
  ELSIF has_active THEN
    EXECUTE 'UPDATE public.categories SET is_active = false WHERE slug = ''polo''';
  ELSE
    RAISE EXCEPTION 'Des produits utilisent Polo et il n y a pas de colonne is_active : rien n a ete modifie';
  END IF;
END $$;

-- Nouvelles categories, sans doublon
INSERT INTO public.categories (name, slug)
SELECT v.name, v.slug
FROM (VALUES
  ('Chaussures', 'chaussures'),
  ('Sacs', 'sacs'),
  ('Bijoux', 'bijoux'),
  ('Lunettes', 'lunettes')
) AS v(name, slug)
WHERE NOT EXISTS (SELECT 1 FROM public.categories c WHERE c.slug = v.slug);
