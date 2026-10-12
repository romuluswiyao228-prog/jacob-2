/*
# Création des types énumérés et de la fonction trigger set_updated_at

## Types énumérés
- `app_role` : rôles applicatifs (owner, customer).
- `order_status` : statuts de commande (pending, confirmed, processing, shipped, delivered, cancelled, refunded, on_hold).
- `payment_status` : statuts de paiement (pending, paid, failed, cancelled, refunded).
- `payment_method` : moyens de paiement (card, mobile_money, cash_on_delivery).
- `shipment_status` : statuts d'expédition (pending, packed, shipped, in_transit, out_for_delivery, delivered, returned, cancelled).

## Fonctions
- `set_updated_at()` : trigger fonction qui met à jour `updated_at` à `now()`.

## Notes
1. Les enums sont créés avec DO block pour l'idempotence.
2. Les fonctions is_admin, handle_new_user, next_order_number seront créées
   dans une migration ultérieure (après la création des tables).
*/

-- ============================================================
-- 1. Types énumérés
-- ============================================================

DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('owner', 'customer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded', 'on_hold');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'cancelled', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('card', 'mobile_money', 'cash_on_delivery');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE shipment_status AS ENUM ('pending', 'packed', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'returned', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 2. Fonction trigger set_updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- 3. Séquence pour les numéros de commande
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START 1;
