/*
# Création des tables : commandes, lignes de commande, paiements, livraison, stock, audit

## Nouvelles tables
- `orders` : commandes (numéro lisible JDJ-AAAA-000123, user_id nullable pour invités,
  guest_token haché, totaux en XOF entier, statut).
- `order_items` : lignes de commande avec instantané du produit (nom, description, prix,
  taille, couleur au moment de l'achat).
- `order_status_history` : historique des changements de statut d'une commande.
- `payments` : paiements (provider, provider_reference, idempotency_key unique,
  raw_event jsonb, statut). AUCUNE donnée de carte ou CVV.
- `shipping_zones` : zones de livraison (nom, pays, régions).
- `shipping_rates` : tarifs de livraison par zone (poids/min/max, prix).
- `shipments` : expéditions liées à une commande (statut, suivi, transporteur).
- `stock_reservations` : réservations de stock (variante, quantité, expiration, order_id).
- `admin_audit_log` : journal d'audit admin (action, table concernée, anciennes/nouvelles valeurs).

## Contraintes
- Clés primaires uuid (gen_random_uuid()).
- CHECK sur quantités >= 0 et montants >= 0.
- orders.order_number unique.
- payments.idempotency_key unique.
- stock_reservations.quantity >= 1.
- created_at / updated_at + triggers.

## Sécurité
- RLS non encore activée (activée dans la migration 004).
- Aucune donnée fictive insérée.
*/

-- ============================================================
-- orders
-- ============================================================

CREATE TABLE IF NOT EXISTS public.orders (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number     text NOT NULL UNIQUE,
  user_id          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_token      text,
  status           order_status NOT NULL DEFAULT 'pending'::order_status,
  subtotal         bigint NOT NULL CHECK (subtotal >= 0),
  shipping_total   bigint NOT NULL DEFAULT 0 CHECK (shipping_total >= 0),
  discount_total   bigint NOT NULL DEFAULT 0 CHECK (discount_total >= 0),
  total            bigint NOT NULL CHECK (total >= 0),
  currency         text NOT NULL DEFAULT 'XOF',
  promotion_id     uuid REFERENCES public.promotions(id) ON DELETE SET NULL,
  shipping_address jsonb,
  billing_address  jsonb,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- order_items
-- ============================================================

CREATE TABLE IF NOT EXISTS public.order_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id      uuid REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id      uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  product_name    text NOT NULL,
  product_description text,
  unit_price      bigint NOT NULL CHECK (unit_price >= 0),
  quantity        int NOT NULL CHECK (quantity >= 1),
  size            text,
  color           text,
  line_total      bigint NOT NULL CHECK (line_total >= 0),
  currency        text NOT NULL DEFAULT 'XOF',
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- order_status_history
-- ============================================================

CREATE TABLE IF NOT EXISTS public.order_status_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status      order_status NOT NULL,
  changed_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- payments
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  provider          text NOT NULL,
  method            payment_method,
  provider_reference text,
  idempotency_key   text UNIQUE,
  amount            bigint NOT NULL CHECK (amount >= 0),
  currency          text NOT NULL DEFAULT 'XOF',
  status            payment_status NOT NULL DEFAULT 'pending'::payment_status,
  raw_event         jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- shipping_zones
-- ============================================================

CREATE TABLE IF NOT EXISTS public.shipping_zones (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  countries   text[] NOT NULL DEFAULT ARRAY[]::text[],
  regions     text[],
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- shipping_rates
-- ============================================================

CREATE TABLE IF NOT EXISTS public.shipping_rates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id         uuid NOT NULL REFERENCES public.shipping_zones(id) ON DELETE CASCADE,
  name            text NOT NULL,
  min_weight_g    int NOT NULL DEFAULT 0 CHECK (min_weight_g >= 0),
  max_weight_g    int CHECK (max_weight_g IS NULL OR max_weight_g >= 0),
  price           bigint NOT NULL CHECK (price >= 0),
  currency        text NOT NULL DEFAULT 'XOF',
  estimated_days  int,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- shipments
-- ============================================================

CREATE TABLE IF NOT EXISTS public.shipments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  zone_id         uuid REFERENCES public.shipping_zones(id) ON DELETE SET NULL,
  carrier         text,
  tracking_number text,
  status          shipment_status NOT NULL DEFAULT 'pending'::shipment_status,
  shipped_at      timestamptz,
  delivered_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- stock_reservations
-- ============================================================

CREATE TABLE IF NOT EXISTS public.stock_reservations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id  uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  order_id    uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  quantity    int NOT NULL CHECK (quantity >= 1),
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- admin_audit_log
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action      text NOT NULL,
  table_name  text NOT NULL,
  record_id   text,
  old_values  jsonb,
  new_values  jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Triggers set_updated_at (sur les tables qui ont updated_at)
-- ============================================================

DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_payments_updated_at ON public.payments;
CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_shipping_zones_updated_at ON public.shipping_zones;
CREATE TRIGGER trg_shipping_zones_updated_at BEFORE UPDATE ON public.shipping_zones
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_shipping_rates_updated_at ON public.shipping_rates;
CREATE TRIGGER trg_shipping_rates_updated_at BEFORE UPDATE ON public.shipping_rates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_shipments_updated_at ON public.shipments;
CREATE TRIGGER trg_shipments_updated_at BEFORE UPDATE ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Index
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON public.order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_order_id ON public.shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON public.shipments(status);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_variant_id ON public.stock_reservations(variant_id);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_order_id ON public.stock_reservations(order_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_id ON public.admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON public.admin_audit_log(created_at);
