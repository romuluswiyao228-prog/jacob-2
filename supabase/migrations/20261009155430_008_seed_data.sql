/*
# Données initiales — 8 catégories et store_settings

## Données insérées
- 8 catégories du cadrage JACOB DE JESUS (avec slug et ordre d'affichage).
- 1 ligne store_settings vide (champs à configurer ultérieurement).

## Note
- AUCUN produit fictif, AUCUN tarif de livraison inventé, AUCUNE coordonnée inventée.
- Les catégories sont insérées avec ON CONFLICT DO NOTHING pour l'idempotence.
- La ligne store_settings est insérée avec des valeurs vides/par défaut.
*/

-- ============================================================
-- 8 catégories du cadrage
-- ============================================================

INSERT INTO public.categories (name, slug, sort_order, is_active) VALUES
  ('T-shirts', 't-shirts', 1, true),
  ('Polo', 'polo', 2, true),
  ('Chemises', 'chemises', 3, true),
  ('Pantalons', 'pantalons', 4, true),
  ('Shorts', 'shorts', 5, true),
  ('Vestes & Manteaux', 'vestes-manteaux', 6, true),
  ('Accessoires', 'accessoires', 7, true),
  ('Chaussures', 'chaussures', 8, true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 1 ligne store_settings vide
-- ============================================================

INSERT INTO public.store_settings (store_name)
SELECT 'JACOB DE JESUS'
WHERE NOT EXISTS (SELECT 1 FROM public.store_settings);
