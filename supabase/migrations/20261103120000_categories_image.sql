-- Migration: categories_image
-- Description: Ajout de la colonne image_url sur la table categories pour illustrer les tuiles de categories
-- Ne pas appliquer directement (à appliquer via Supabase CLI ou tableau de bord par l'administrateur)

ALTER TABLE public.categories
ADD COLUMN IF NOT EXISTS image_url text;

COMMENT ON COLUMN public.categories.image_url IS 'URL de l''image de couverture de la catégorie stockée dans store-assets';

