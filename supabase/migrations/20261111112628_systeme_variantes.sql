/*
# Migration : systeme_variantes
# Systeme international de gestion des produits : tailles/pointures par
# categorie, catalogue de couleurs, prix et stock par variante.
#
# Nouvelles tables :
# - public.size_systems   : systemes de tailles (vetements, pantalons,
#                           pointures EU/US/UK, lingerie, accessoires)
# - public.size_options   : valeurs de chaque systeme (XXS..6XL, 26..50, EU30..50...)
# - public.colors         : catalogue de couleurs administrable
#                          (nom, code hexa pour echantillon, image optionnelle)
# - public.category_size_systems : liaison categorie <-> systemes de tailles
#
# Colonnes ajoutees :
# - public.products.size_system_id : systeme de tailles du produit
# - public.product_variants : color_id, size_option_id, sale_price,
#   compare_at_price, allow_preorder
#
# Securite : RLS active, lecture publique, ecriture reservee a is_admin_aal2().
# Aucune ancienne migration n'est modifiee.
*/

-- ============================================================
-- 1. systemes de tailles
-- ============================================================
CREATE TABLE IF NOT EXISTS public.size_systems (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text NOT NULL UNIQUE,
  name        text NOT NULL,
  description text,
  sort_order  int NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. options de tailles par systeme
-- ============================================================
CREATE TABLE IF NOT EXISTS public.size_options (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id   uuid NOT NULL REFERENCES public.size_systems(id) ON DELETE CASCADE,
  value       text NOT NULL,
  sort_order  int NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (system_id, value)
);

CREATE INDEX IF NOT EXISTS idx_size_options_system
  ON public.size_options(system_id, sort_order);

-- ============================================================
-- 3. catalogue de couleurs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.colors (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  hex_code    text CHECK (hex_code IS NULL OR hex_code ~ '^#[0-9A-Fa-f]{6}$'),
  image_url   text,
  is_active   boolean NOT NULL DEFAULT true,
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. liaison categorie <-> systemes de tailles
-- ============================================================
CREATE TABLE IF NOT EXISTS public.category_size_systems (
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  system_id   uuid NOT NULL REFERENCES public.size_systems(id) ON DELETE CASCADE,
  sort_order  int NOT NULL DEFAULT 0,
  PRIMARY KEY (category_id, system_id)
);

-- ============================================================
-- 5. Colonnes produits / variantes
-- ============================================================
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS size_system_id uuid
    REFERENCES public.size_systems(id) ON DELETE SET NULL;

ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS color_id uuid
    REFERENCES public.colors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS size_option_id uuid
    REFERENCES public.size_options(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sale_price bigint
    CHECK (sale_price IS NULL OR sale_price >= 0),
  ADD COLUMN IF NOT EXISTS compare_at_price bigint
    CHECK (compare_at_price IS NULL OR compare_at_price >= 0),
  ADD COLUMN IF NOT EXISTS allow_preorder boolean NOT NULL DEFAULT false;

-- Evite les doublons de variantes (produit + taille + couleur)
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_variants_size_color
  ON public.product_variants(
    product_id,
    COALESCE(size, ''),
    COALESCE(color, '')
  );

-- ============================================================
-- 6. Triggers updated_at
-- ============================================================
DROP TRIGGER IF EXISTS trg_size_systems_updated_at ON public.size_systems;
CREATE TRIGGER trg_size_systems_updated_at BEFORE UPDATE ON public.size_systems
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_colors_updated_at ON public.colors;
CREATE TRIGGER trg_colors_updated_at BEFORE UPDATE ON public.colors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 7. Donnees initiales : systemes de tailles
-- ============================================================
INSERT INTO public.size_systems (key, name, description, sort_order) VALUES
  ('vetements', 'Vetements (XS - 6XL)', 'Tailles internationales vetements : XXS, XS, S, M, L, XL, XXL/2XL, XXXL/3XL, 4XL, 5XL, 6XL', 1),
  ('pantalons', 'Pantalons (tour de taille)', 'Tailles numeriques 26 a 50+, tailles letter S-XXL, tour de taille W et longueur de jambe L', 2),
  ('pointures-eu', 'Pointures EU', 'Pointures europeennes 30 a 50+, demi-pointures incluses', 3),
  ('pointures-us', 'Pointures US', 'Pointures americaines hommes, femmes et enfants', 4),
  ('pointures-uk', 'Pointures UK', 'Pointures britanniques hommes, femmes et enfants', 5),
  ('lingerie', 'Sous-vetements & Lingerie', 'Tailles XS-XXL+, tailles de soutien-gorge (bonnets A a DD/E)', 6),
  ('accessoires', 'Accessoires', 'Taille unique, P/M/G, tailles de bagues, ceintures, casquettes, sacs', 7)
ON CONFLICT (key) DO NOTHING;

-- Options vetements
INSERT INTO public.size_options (system_id, value, sort_order)
SELECT s.id, v.value, v.ord
FROM public.size_systems s
JOIN (VALUES
  ('XXS',1),('XS',2),('S',3),('M',4),('L',5),('XL',6),
  ('XXL / 2XL',7),('XXXL / 3XL',8),('4XL',9),('5XL',10),('6XL',11)
) AS v(value, ord) ON s.key = 'vetements'
ON CONFLICT (system_id, value) DO NOTHING;

-- Options pantalons (numeriques + letters)
INSERT INTO public.size_options (system_id, value, sort_order)
SELECT s.id, v.value, v.ord
FROM public.size_systems s
JOIN (VALUES
  ('26',1),('27',2),('28',3),('29',4),('30',5),('31',6),('32',7),
  ('33',8),('34',9),('35',10),('36',11),('38',12),('40',13),('42',14),
  ('44',15),('46',16),('48',17),('50',18),('52',19),('54',20),
  ('S',21),('M',22),('L',23),('XL',24),('XXL',25)
) AS v(value, ord) ON s.key = 'pantalons'
ON CONFLICT (system_id, value) DO NOTHING;

-- Options pointures EU (entieres + demi-pointures)
INSERT INTO public.size_options (system_id, value, sort_order)
SELECT s.id, v.value, v.ord
FROM public.size_systems s
JOIN (VALUES
  ('30',1),('31',2),('32',3),('33',4),('34',5),('35',6),('35.5',7),
  ('36',8),('36.5',9),('37',10),('37.5',11),('38',12),('38.5',13),
  ('39',14),('39.5',15),('40',16),('40.5',17),('41',18),('41.5',19),
  ('42',20),('42.5',21),('43',22),('43.5',23),('44',24),('44.5',25),
  ('45',26),('45.5',27),('46',28),('46.5',29),('47',30),('47.5',31),
  ('48',32),('48.5',33),('49',34),('49.5',35),('50',36)
) AS v(value, ord) ON s.key = 'pointures-eu'
ON CONFLICT (system_id, value) DO NOTHING;

-- Options pointures US (hommes / femmes / enfants)
INSERT INTO public.size_options (system_id, value, sort_order)
SELECT s.id, v.value, v.ord
FROM public.size_systems s
JOIN (VALUES
  ('US 1 (enfant)',1),('US 2 (enfant)',2),('US 3 (enfant)',3),('US 4 (enfant)',4),
  ('US 5 (enfant)',5),('US 6 (enfant)',6),('US 7 (enfant)',7),('US 8 (enfant)',8),
  ('US 9 (enfant)',9),('US 10 (enfant)',10),('US 11 (enfant)',11),('US 12 (enfant)',12),
  ('US 13 (homme)',13),('US 14 (homme)',14),('US 15 (homme)',15),
  ('US 4 (femme)',16),('US 5 (femme)',17),('US 6 (femme)',18),('US 7 (femme)',19),
  ('US 8 (femme)',20),('US 9 (femme)',21),('US 10 (femme)',22),('US 11 (femme)',23)
) AS v(value, ord) ON s.key = 'pointures-us'
ON CONFLICT (system_id, value) DO NOTHING;

-- Options pointures UK (hommes / femmes / enfants)
INSERT INTO public.size_options (system_id, value, sort_order)
SELECT s.id, v.value, v.ord
FROM public.size_systems s
JOIN (VALUES
  ('UK 1 (enfant)',1),('UK 1.5 (enfant)',2),('UK 2 (enfant)',3),('UK 2.5 (enfant)',4),
  ('UK 3 (enfant)',5),('UK 3.5 (enfant)',6),('UK 4 (enfant)',7),('UK 4.5 (enfant)',8),
  ('UK 5 (enfant)',9),('UK 5.5 (enfant)',10),('UK 6 (enfant)',11),('UK 6.5 (enfant)',12),
  ('UK 7 (enfant)',13),('UK 7.5 (enfant)',14),('UK 8 (enfant)',15),('UK 8.5 (enfant)',16),
  ('UK 9 (enfant)',17),('UK 9.5 (enfant)',18),('UK 10 (enfant)',19),('UK 10.5 (enfant)',20),
  ('UK 11 (enfant)',21),('UK 11.5 (enfant)',22),('UK 12 (enfant)',23),
  ('UK 6 (homme)',24),('UK 7 (homme)',25),('UK 8 (homme)',26),('UK 9 (homme)',27),
  ('UK 10 (homme)',28),('UK 11 (homme)',29),('UK 12 (homme)',30),
  ('UK 3 (femme)',31),('UK 4 (femme)',32),('UK 5 (femme)',33),('UK 6 (femme)',34),
  ('UK 7 (femme)',35),('UK 8 (femme)',36)
) AS v(value, ord) ON s.key = 'pointures-uk'
ON CONFLICT (system_id, value) DO NOTHING;

-- Options lingerie (tailles + bonnets)
INSERT INTO public.size_options (system_id, value, sort_order)
SELECT s.id, v.value, v.ord
FROM public.size_systems s
JOIN (VALUES
  ('XS',1),('S',2),('M',3),('L',4),('XL',5),('XXL',6),('3XL',7),('4XL',8),
  ('Bonnet A',20),('Bonnet B',21),('Bonnet C',22),('Bonnet D',23),
  ('Bonnet DD/E',24),('Bonnet F',25),('Bonnet G',26)
) AS v(value, ord) ON s.key = 'lingerie'
ON CONFLICT (system_id, value) DO NOTHING;

-- Options accessoires
INSERT INTO public.size_options (system_id, value, sort_order)
SELECT s.id, v.value, v.ord
FROM public.size_systems s
JOIN (VALUES
  ('Taille unique',1),('Petite',2),('Moyenne',3),('Grande',4),
  ('Tour de bague 48',10),('Tour de bague 50',11),('Tour de bague 52',12),
  ('Tour de bague 54',13),('Tour de bague 56',14),('Tour de bague 58',15),('Tour de bague 60',16),
  ('Tour de taille 70',20),('Tour de taille 75',21),('Tour de taille 80',22),
  ('Tour de taille 85',23),('Tour de taille 90',24),('Tour de taille 95',25),
  ('Casquette S/M',30),('Casquette L/XL',31)
) AS v(value, ord) ON s.key = 'accessoires'
ON CONFLICT (system_id, value) DO NOTHING;

-- ============================================================
-- 8. Donnees initiales : catalogue de couleurs
-- ============================================================
INSERT INTO public.colors (name, hex_code, sort_order) VALUES
  ('Noir', '#111111', 1),
  ('Blanc', '#FFFFFF', 2),
  ('Rouge', '#C0392B', 3),
  ('Bleu', '#2E5FA3', 4),
  ('Bleu marine', '#1B2A4A', 5),
  ('Vert', '#2E7D32', 6),
  ('Kaki', '#8B7D4F', 7),
  ('Jaune', '#F1C40F', 8),
  ('Orange', '#E67E22', 9),
  ('Rose', '#E91E63', 10),
  ('Violet', '#7D3C98', 11),
  ('Gris', '#7F8C8D', 12),
  ('Marron', '#6D4C41', 13),
  ('Beige', '#D7CCC8', 14),
  ('Crème', '#FFF8E7', 15),
  ('Bordeaux', '#722F37', 16)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 9. Liaison categories <-> systemes de tailles (par slug)
-- ============================================================
INSERT INTO public.category_size_systems (category_id, system_id, sort_order)
SELECT c.id, s.id, v.ord
FROM public.categories c
JOIN (VALUES
  ('t-shirts', 'vetements', 1),
  ('polo', 'vetements', 1),
  ('chemises', 'vetements', 1),
  ('vestes-manteaux', 'vetements', 1),
  ('shorts', 'vetements', 1),
  ('pantalons', 'pantalons', 1),
  ('chaussures', 'pointures-eu', 1),
  ('chaussures', 'pointures-us', 2),
  ('chaussures', 'pointures-uk', 3),
  ('accessoires', 'accessoires', 1),
  ('sacs', 'accessoires', 1),
  ('bijoux', 'accessoires', 1),
  ('lunettes', 'accessoires', 1)
) AS v(cat_slug, sys_key, ord) ON c.slug = v.cat_slug
JOIN public.size_systems s ON s.key = v.sys_key
ON CONFLICT DO NOTHING;

-- ============================================================
-- 10. RLS : lecture publique, ecriture admin AAL2
-- ============================================================
ALTER TABLE public.size_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.size_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_size_systems ENABLE ROW LEVEL SECURITY;

-- size_systems
REVOKE ALL ON public.size_systems FROM anon, authenticated;
GRANT SELECT ON public.size_systems TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.size_systems TO authenticated;

CREATE POLICY size_systems_public_read ON public.size_systems
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY size_systems_admin_all ON public.size_systems
  FOR ALL TO authenticated
  USING (public.is_admin_aal2())
  WITH CHECK (public.is_admin_aal2());

-- size_options
REVOKE ALL ON public.size_options FROM anon, authenticated;
GRANT SELECT ON public.size_options TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.size_options TO authenticated;

CREATE POLICY size_options_public_read ON public.size_options
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY size_options_admin_all ON public.size_options
  FOR ALL TO authenticated
  USING (public.is_admin_aal2())
  WITH CHECK (public.is_admin_aal2());

-- colors
REVOKE ALL ON public.colors FROM anon, authenticated;
GRANT SELECT ON public.colors TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.colors TO authenticated;

CREATE POLICY colors_public_read ON public.colors
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY colors_admin_all ON public.colors
  FOR ALL TO authenticated
  USING (public.is_admin_aal2())
  WITH CHECK (public.is_admin_aal2());

-- category_size_systems (pas de is_active : lecture publique integrale)
REVOKE ALL ON public.category_size_systems FROM anon, authenticated;
GRANT SELECT ON public.category_size_systems TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.category_size_systems TO authenticated;

CREATE POLICY category_size_systems_public_read ON public.category_size_systems
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY category_size_systems_admin_all ON public.category_size_systems
  FOR ALL TO authenticated
  USING (public.is_admin_aal2())
  WITH CHECK (public.is_admin_aal2());
