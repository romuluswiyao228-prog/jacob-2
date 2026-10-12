-- =============================================================================
-- DONNEES DE DEMONSTRATION — JACOB DE JESUS
-- Fichier : supabase/seed/demo.sql (NON INCLUS DANS LES MIGRATIONS)
--
-- A executer manuellement dans le Supabase SQL Editor si besoin.
-- Contient 8 produits marques [DEMO] avec leurs variantes et images :
-- - 0 produit dans Polo
-- - 2 en promotion (compare_at_price > price)
-- - 3 mis en avant (is_featured = true)
-- - Produits pour Chaussures (pointures numeriques), Sacs (taille 'Unique'),
--   Bijoux ('Unique'), Lunettes ('Unique'), ainsi que Vetements (S, M, L, XL).
-- =============================================================================

DO $$
DECLARE
  cat_tshirts uuid;
  cat_chemises uuid;
  cat_pantalons uuid;
  cat_vestes uuid;
  cat_chaussures uuid;
  cat_sacs uuid;
  cat_bijoux uuid;
  cat_lunettes uuid;

  p1 uuid := gen_random_uuid();
  p2 uuid := gen_random_uuid();
  p3 uuid := gen_random_uuid();
  p4 uuid := gen_random_uuid();
  p5 uuid := gen_random_uuid();
  p6 uuid := gen_random_uuid();
  p7 uuid := gen_random_uuid();
  p8 uuid := gen_random_uuid();
BEGIN
  -- Recuperation des IDs des categories
  SELECT id INTO cat_tshirts FROM public.categories WHERE slug = 't-shirts';
  SELECT id INTO cat_chemises FROM public.categories WHERE slug = 'chemises';
  SELECT id INTO cat_pantalons FROM public.categories WHERE slug = 'pantalons';
  SELECT id INTO cat_vestes FROM public.categories WHERE slug = 'vestes-manteaux';
  SELECT id INTO cat_chaussures FROM public.categories WHERE slug = 'chaussures';
  SELECT id INTO cat_sacs FROM public.categories WHERE slug = 'sacs';
  SELECT id INTO cat_bijoux FROM public.categories WHERE slug = 'bijoux';
  SELECT id INTO cat_lunettes FROM public.categories WHERE slug = 'lunettes';

  -- 1. T-shirt Signature [DEMO] (Mis en avant)
  INSERT INTO public.products (id, name, slug, description, price, compare_at_price, currency, category_id, is_archived, is_featured, sort_order)
  VALUES (p1, 'T-shirt Signature Coton Lourd [DEMO]', 'demo-tshirt-signature', 'T-shirt oversize en jersey de coton lourd 280g/m2. Coupe contemporaine avec col ras-du-cou structure.', 25000, NULL, 'XOF', cat_tshirts, false, true, 1);

  INSERT INTO public.product_variants (product_id, size, color, sku, stock, price, currency) VALUES
    (p1, 'S', 'Noir', 'DEMO-TS-BLK-S', 10, 25000, 'XOF'),
    (p1, 'M', 'Noir', 'DEMO-TS-BLK-M', 15, 25000, 'XOF'),
    (p1, 'L', 'Noir', 'DEMO-TS-BLK-L', 8, 25000, 'XOF'),
    (p1, 'XL', 'Noir', 'DEMO-TS-BLK-XL', 4, 25000, 'XOF'),
    (p1, 'M', 'Blanc', 'DEMO-TS-WHT-M', 12, 25000, 'XOF'),
    (p1, 'L', 'Blanc', 'DEMO-TS-WHT-L', 0, 25000, 'XOF'); -- variante epuisee

  INSERT INTO public.product_images (product_id, url, alt_text, sort_order, is_primary) VALUES
    (p1, 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80', 'T-shirt Signature Noir', 1, true);

  -- 2. Chemise Col Cubain [DEMO] (En promotion)
  INSERT INTO public.products (id, name, slug, description, price, compare_at_price, currency, category_id, is_archived, is_featured, sort_order)
  VALUES (p2, 'Chemise Col Cubain en Soie [DEMO]', 'demo-chemise-cubain', 'Chemise fluide a manches courtes avec col cubain ouvert. Tissage doux et raffine.', 38000, 48000, 'XOF', cat_chemises, false, false, 2);

  INSERT INTO public.product_variants (product_id, size, color, sku, stock, price, currency) VALUES
    (p2, 'S', 'Ivoire', 'DEMO-CH-IVR-S', 6, 38000, 'XOF'),
    (p2, 'M', 'Ivoire', 'DEMO-CH-IVR-M', 8, 38000, 'XOF'),
    (p2, 'L', 'Ivoire', 'DEMO-CH-IVR-L', 5, 38000, 'XOF');

  INSERT INTO public.product_images (product_id, url, alt_text, sort_order, is_primary) VALUES
    (p2, 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&auto=format&fit=crop&q=80', 'Chemise Col Cubain Ivoire', 1, true);

  -- 3. Pantalon Tailleur Laine Froide [DEMO]
  INSERT INTO public.products (id, name, slug, description, price, compare_at_price, currency, category_id, is_archived, is_featured, sort_order)
  VALUES (p3, 'Pantalon Tailleur Taille Haute [DEMO]', 'demo-pantalon-tailleur', 'Coupe droite a pinces confectionnee dans un twill souple. Finitions surpiquées.', 45000, NULL, 'XOF', cat_pantalons, false, false, 3);

  INSERT INTO public.product_variants (product_id, size, color, sku, stock, price, currency) VALUES
    (p3, 'S', 'Anthracite', 'DEMO-PA-ANT-S', 7, 45000, 'XOF'),
    (p3, 'M', 'Anthracite', 'DEMO-PA-ANT-M', 11, 45000, 'XOF'),
    (p3, 'L', 'Anthracite', 'DEMO-PA-ANT-L', 5, 45000, 'XOF');

  INSERT INTO public.product_images (product_id, url, alt_text, sort_order, is_primary) VALUES
    (p3, 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800&auto=format&fit=crop&q=80', 'Pantalon Tailleur Anthracite', 1, true);

  -- 4. Veste Tailleur Non Doublée [DEMO] (Mis en avant)
  INSERT INTO public.products (id, name, slug, description, price, compare_at_price, currency, category_id, is_archived, is_featured, sort_order)
  VALUES (p4, 'Veste Croisee Deconstruite [DEMO]', 'demo-veste-croisee', 'Veste legere croisee sans epaulettes pour un porter souple au quotidien.', 65000, NULL, 'XOF', cat_vestes, false, true, 4);

  INSERT INTO public.product_variants (product_id, size, color, sku, stock, price, currency) VALUES
    (p4, 'S', 'Sable', 'DEMO-VE-SAB-S', 4, 65000, 'XOF'),
    (p4, 'M', 'Sable', 'DEMO-VE-SAB-M', 6, 65000, 'XOF'),
    (p4, 'L', 'Sable', 'DEMO-VE-SAB-L', 3, 65000, 'XOF');

  INSERT INTO public.product_images (product_id, url, alt_text, sort_order, is_primary) VALUES
    (p4, 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&auto=format&fit=crop&q=80', 'Veste Croisee Sable', 1, true);

  -- 5. Mocassins Cuir Glacé [DEMO] (Chaussures : pointures numeriques)
  INSERT INTO public.products (id, name, slug, description, price, compare_at_price, currency, category_id, is_archived, is_featured, sort_order)
  VALUES (p5, 'Mocassins Cuir Glace [DEMO]', 'demo-mocassins-cuir', 'Mocassins confectionnes a la main en cuir de veau lisse avec semelle en cuir patine.', 55000, NULL, 'XOF', cat_chaussures, false, true, 5);

  INSERT INTO public.product_variants (product_id, size, color, sku, stock, price, currency) VALUES
    (p5, '40', 'Noir', 'DEMO-MC-BLK-40', 3, 55000, 'XOF'),
    (p5, '41', 'Noir', 'DEMO-MC-BLK-41', 5, 55000, 'XOF'),
    (p5, '42', 'Noir', 'DEMO-MC-BLK-42', 6, 55000, 'XOF'),
    (p5, '43', 'Noir', 'DEMO-MC-BLK-43', 4, 55000, 'XOF'),
    (p5, '44', 'Noir', 'DEMO-MC-BLK-44', 2, 55000, 'XOF');

  INSERT INTO public.product_images (product_id, url, alt_text, sort_order, is_primary) VALUES
    (p5, 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=800&auto=format&fit=crop&q=80', 'Mocassins Cuir Noir', 1, true);

  -- 6. Sac Cabas Cuir & Toile [DEMO] (Sacs : taille 'Unique')
  INSERT INTO public.products (id, name, slug, description, price, compare_at_price, currency, category_id, is_archived, is_featured, sort_order)
  VALUES (p6, 'Sac Cabas Toile & Cuir [DEMO]', 'demo-sac-cabas', 'Grand cabas structure alliant toile de coton epaisse et empiecements en cuir tannage vegetal.', 42000, NULL, 'XOF', cat_sacs, false, false, 6);

  INSERT INTO public.product_variants (product_id, size, color, sku, stock, price, currency) VALUES
    (p6, 'Unique', 'Naturel / Fauve', 'DEMO-SC-NAT-U', 8, 42000, 'XOF'),
    (p6, 'Unique', 'Noir Intemporel', 'DEMO-SC-BLK-U', 5, 42000, 'XOF');

  INSERT INTO public.product_images (product_id, url, alt_text, sort_order, is_primary) VALUES
    (p6, 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=80', 'Sac Cabas Toile et Cuir', 1, true);

  -- 7. Chevaliere Argent Massif [DEMO] (Bijoux : taille 'Unique', en promotion)
  INSERT INTO public.products (id, name, slug, description, price, compare_at_price, currency, category_id, is_archived, is_featured, sort_order)
  VALUES (p7, 'Chevaliere Sceau Argent 925 [DEMO]', 'demo-chevaliere-argent', 'Bague chevaliere gravee a la main en argent 925. Plateau ovale sobre et minimaliste.', 29000, 39000, 'XOF', cat_bijoux, false, false, 7);

  INSERT INTO public.product_variants (product_id, size, color, sku, stock, price, currency) VALUES
    (p7, 'Unique', 'Argent Brillant', 'DEMO-CHEV-AG-U', 12, 29000, 'XOF');

  INSERT INTO public.product_images (product_id, url, alt_text, sort_order, is_primary) VALUES
    (p7, 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&auto=format&fit=crop&q=80', 'Chevaliere Argent 925', 1, true);

  -- 8. Lunettes de Soleil Acetate [DEMO] (Lunettes : taille 'Unique')
  INSERT INTO public.products (id, name, slug, description, price, compare_at_price, currency, category_id, is_archived, is_featured, sort_order)
  VALUES (p8, 'Lunettes de Soleil Carre Ecope [DEMO]', 'demo-lunettes-ecaille', 'Monture en acetate japonais haut de gamme. Verres proteges UV400 categorie 3.', 32000, NULL, 'XOF', cat_lunettes, false, false, 8);

  INSERT INTO public.product_variants (product_id, size, color, sku, stock, price, currency) VALUES
    (p8, 'Unique', 'Ecaille Foncee', 'DEMO-LUN-ECL-U', 10, 32000, 'XOF'),
    (p8, 'Unique', 'Noir Mat', 'DEMO-LUN-BLK-U', 7, 32000, 'XOF');

  INSERT INTO public.product_images (product_id, url, alt_text, sort_order, is_primary) VALUES
    (p8, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&auto=format&fit=crop&q=80', 'Lunettes de Soleil Ecaille', 1, true);

END $$;

-- =============================================================================
-- SECTION DE NETTOYAGE (A DECOMMENTER SI VOUS SOUHAITEZ RETIRER TOUTES LES DONNEES DE DEMO)
-- =============================================================================
/*
DELETE FROM public.products
WHERE name LIKE '%[DEMO]%' OR slug LIKE 'demo-%';
*/
