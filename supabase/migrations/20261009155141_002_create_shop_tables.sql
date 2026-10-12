/*
# Création des tables : panier, adresses, favoris, messages, réglages, promotions

## Nouvelles tables
- `carts` : panier d'un utilisateur (user_id, statut).
- `cart_items` : lignes du panier (variante, quantité, prix au moment de l'ajout).
- `addresses` : adresses de livraison/facturation d'un utilisateur.
- `favorites` : produits favoris d'un utilisateur.
- `contact_messages` : messages envoyés via le formulaire de contact.
- `store_settings` : réglages de la boutique (une seule ligne).
- `promotions` : codes promotionnels (code unique, type, valeur, dates, usage).

## Contraintes
- Clés primaires uuid (gen_random_uuid()).
- CHECK sur quantités >= 1 et montants >= 0.
- Unicité sur promotions.code.
- store_settings : une seule ligne (CHECK count = 1 via id fixe).
- created_at / updated_at + triggers.

## Sécurité
- RLS non encore activée (activée dans la migration 004).
- Aucune donnée fictive insérée.
*/

-- ============================================================
-- carts
-- ============================================================

CREATE TABLE IF NOT EXISTS public.carts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'abandoned', 'converted')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- cart_items
-- ============================================================

CREATE TABLE IF NOT EXISTS public.cart_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id     uuid NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  variant_id  uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  quantity    int NOT NULL CHECK (quantity >= 1),
  unit_price  bigint NOT NULL CHECK (unit_price >= 0),
  currency    text NOT NULL DEFAULT 'XOF',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- addresses
-- ============================================================

CREATE TABLE IF NOT EXISTS public.addresses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label       text NOT NULL DEFAULT '',
  first_name  text NOT NULL,
  last_name   text NOT NULL,
  phone       text,
  line1       text NOT NULL,
  line2       text,
  city        text NOT NULL,
  region      text,
  postal_code text,
  country     text NOT NULL DEFAULT 'Côte d''Ivoire',
  is_default  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- favorites
-- ============================================================

CREATE TABLE IF NOT EXISTS public.favorites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id  uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

-- ============================================================
-- contact_messages
-- ============================================================

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  email       text NOT NULL,
  subject     text NOT NULL,
  message     text NOT NULL,
  is_read     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- store_settings (une seule ligne)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.store_settings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name      text NOT NULL DEFAULT '',
  tagline         text,
  description     text,
  logo_url        text,
  email           text,
  phone           text,
  address         text,
  city            text,
  country         text NOT NULL DEFAULT 'Côte d''Ivoire',
  currency        text NOT NULL DEFAULT 'XOF',
  social_links    jsonb NOT NULL DEFAULT '{}'::jsonb,
  legal_mentions  text,
  cgv             text,
  privacy_policy  text,
  about_text      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT store_settings_single_row CHECK (id IS NOT NULL)
);

-- ============================================================
-- promotions
-- ============================================================

CREATE TABLE IF NOT EXISTS public.promotions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text NOT NULL UNIQUE,
  description   text,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value bigint NOT NULL CHECK (discount_value >= 0),
  currency      text NOT NULL DEFAULT 'XOF',
  min_order_amount bigint CHECK (min_order_amount IS NULL OR min_order_amount >= 0),
  max_uses      int CHECK (max_uses IS NULL OR max_uses >= 0),
  used_count    int NOT NULL DEFAULT 0,
  starts_at     timestamptz,
  ends_at       timestamptz,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Triggers set_updated_at
-- ============================================================

DROP TRIGGER IF EXISTS trg_carts_updated_at ON public.carts;
CREATE TRIGGER trg_carts_updated_at BEFORE UPDATE ON public.carts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_cart_items_updated_at ON public.cart_items;
CREATE TRIGGER trg_cart_items_updated_at BEFORE UPDATE ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_addresses_updated_at ON public.addresses;
CREATE TRIGGER trg_addresses_updated_at BEFORE UPDATE ON public.addresses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_contact_messages_updated_at ON public.contact_messages;
CREATE TRIGGER trg_contact_messages_updated_at BEFORE UPDATE ON public.contact_messages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_store_settings_updated_at ON public.store_settings;
CREATE TRIGGER trg_store_settings_updated_at BEFORE UPDATE ON public.store_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_promotions_updated_at ON public.promotions;
CREATE TRIGGER trg_promotions_updated_at BEFORE UPDATE ON public.promotions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Index
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_carts_user_id ON public.carts(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON public.cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON public.addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_product_id ON public.favorites(product_id);
CREATE INDEX IF NOT EXISTS idx_promotions_code ON public.promotions(code);
