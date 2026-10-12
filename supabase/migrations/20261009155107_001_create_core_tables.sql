/*
# Création des tables : profils, rôles, catégories, produits, variantes, images, collections

## Nouvelles tables
- `profiles` : profil utilisateur (id lié à auth.users, email, nom, téléphone, avatar).
- `user_roles` : rôle applicatif (owner ou customer) par utilisateur. Une seule ligne par utilisateur.
- `categories` : catégories de produits (nom, slug unique, description, ordre d'affichage).
- `products` : produits (nom, slug unique, description, prix en XOF entier, catégorie, archivage logique).
- `product_variants` : déclinaisons produit (taille, couleur, SKU unique, stock >= 0, prix optionnel).
- `product_images` : images associées à un produit (URL, ordre, image principale).
- `collections` : collections groupant des produits (nom, slug unique, description, dates).
- `collection_products` : table de jointure entre collections et produits.

## Contraintes
- Clés primaires uuid (gen_random_uuid()).
- Clés étrangères avec ON DELETE explicite (CASCADE pour les enfants, SET NULL pour les optionnels).
- CHECK sur stock >= 0 et prix >= 0.
- Unicité sur slug (categories, products, collections), sku (product_variants).
- created_at / updated_at sur toutes les tables + trigger set_updated_at.

## Sécurité
- RLS non encore activée (activée dans la migration 004).
- Aucune donnée fictive insérée.

## Notes
1. product_variants.price est optionnel : si NULL, le prix du produit parent est utilisé.
2. products.is_archived permet l'archivage logique sans casser l'historique des commandes.
3. product_images.is_primary : une seule image principale par produit (à gérer au niveau applicatif).
*/

-- ============================================================
-- profiles
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text NOT NULL,
  full_name   text NOT NULL DEFAULT '',
  phone       text,
  avatar_url  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- user_roles
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id     uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        app_role NOT NULL DEFAULT 'customer'::app_role,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- categories
-- ============================================================

CREATE TABLE IF NOT EXISTS public.categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text NOT NULL UNIQUE,
  description text,
  sort_order  int NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- products
-- ============================================================

CREATE TABLE IF NOT EXISTS public.products (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  slug          text NOT NULL UNIQUE,
  description   text,
  price         bigint NOT NULL CHECK (price >= 0),
  currency      text NOT NULL DEFAULT 'XOF',
  category_id   uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  is_archived   boolean NOT NULL DEFAULT false,
  is_featured   boolean NOT NULL DEFAULT false,
  sort_order    int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- product_variants
-- ============================================================

CREATE TABLE IF NOT EXISTS public.product_variants (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  size          text,
  color         text,
  sku           text NOT NULL UNIQUE,
  stock         int NOT NULL DEFAULT 0 CHECK (stock >= 0),
  price         bigint CHECK (price IS NULL OR price >= 0),
  currency      text NOT NULL DEFAULT 'XOF',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- product_images
-- ============================================================

CREATE TABLE IF NOT EXISTS public.product_images (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url         text NOT NULL,
  alt_text    text,
  sort_order  int NOT NULL DEFAULT 0,
  is_primary  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- collections
-- ============================================================

CREATE TABLE IF NOT EXISTS public.collections (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  slug         text NOT NULL UNIQUE,
  description  text,
  image_url    text,
  is_active    boolean NOT NULL DEFAULT true,
  starts_at    timestamptz,
  ends_at      timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- collection_products
-- ============================================================

CREATE TABLE IF NOT EXISTS public.collection_products (
  collection_id  uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  product_id     uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sort_order     int NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_id, product_id)
);

-- ============================================================
-- Triggers set_updated_at
-- ============================================================

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_user_roles_updated_at ON public.user_roles;
CREATE TRIGGER trg_user_roles_updated_at BEFORE UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_categories_updated_at ON public.categories;
CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_product_variants_updated_at ON public.product_variants;
CREATE TRIGGER trg_product_variants_updated_at BEFORE UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_product_images_updated_at ON public.product_images;
CREATE TRIGGER trg_product_images_updated_at BEFORE UPDATE ON public.product_images
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_collections_updated_at ON public.collections;
CREATE TRIGGER trg_collections_updated_at BEFORE UPDATE ON public.collections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Index
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_archived ON public.products(is_archived);
CREATE INDEX IF NOT EXISTS idx_products_is_featured ON public.products(is_featured);
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON public.product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON public.product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_collection_products_product_id ON public.collection_products(product_id);
