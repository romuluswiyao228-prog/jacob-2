/*
# RLS — tables utilisateur (panier, adresses, favoris, contact, promotions)

## Tables concernées
- carts : le client gère son propre panier.
- cart_items : gérés via la propriété du panier parent.
- addresses : le client gère ses propres adresses.
- favorites : le client gère ses propres favoris.
- contact_messages : INSERT public, lecture admin uniquement.
- promotions : lecture publique (codes actifs), gestion admin.

## Principes
- Client : lit et modifie uniquement ses propres données (panier, adresses, favoris).
- Public : peut insérer un message de contact et lire les promotions actives.
- Admin : gestion complète des promotions et messages.
- Aucune écriture directe sur les prix, stock, paiements depuis le client.
*/

-- ============================================================
-- Activer RLS
-- ============================================================

ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- carts — propriétaire du panier + admin
-- ============================================================

DROP POLICY IF EXISTS "select_own_carts" ON public.carts;
CREATE POLICY "select_own_carts" ON public.carts FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "insert_own_carts" ON public.carts;
CREATE POLICY "insert_own_carts" ON public.carts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_carts" ON public.carts;
CREATE POLICY "update_own_carts" ON public.carts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_carts" ON public.carts;
CREATE POLICY "delete_own_carts" ON public.carts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- cart_items — via la propriété du panier parent
-- ============================================================

DROP POLICY IF EXISTS "select_own_cart_items" ON public.cart_items;
CREATE POLICY "select_own_cart_items" ON public.cart_items FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.carts c
      WHERE c.id = cart_items.cart_id AND c.user_id = auth.uid()
    ) OR public.is_admin()
  );

DROP POLICY IF EXISTS "insert_own_cart_items" ON public.cart_items;
CREATE POLICY "insert_own_cart_items" ON public.cart_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.carts c
      WHERE c.id = cart_items.cart_id AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_own_cart_items" ON public.cart_items;
CREATE POLICY "update_own_cart_items" ON public.cart_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.carts c
      WHERE c.id = cart_items.cart_id AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.carts c
      WHERE c.id = cart_items.cart_id AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_own_cart_items" ON public.cart_items;
CREATE POLICY "delete_own_cart_items" ON public.cart_items FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.carts c
      WHERE c.id = cart_items.cart_id AND c.user_id = auth.uid()
    )
  );

-- ============================================================
-- addresses — propriétaire uniquement
-- ============================================================

DROP POLICY IF EXISTS "select_own_addresses" ON public.addresses;
CREATE POLICY "select_own_addresses" ON public.addresses FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "insert_own_addresses" ON public.addresses;
CREATE POLICY "insert_own_addresses" ON public.addresses FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_addresses" ON public.addresses;
CREATE POLICY "update_own_addresses" ON public.addresses FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_addresses" ON public.addresses;
CREATE POLICY "delete_own_addresses" ON public.addresses FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- favorites — propriétaire uniquement
-- ============================================================

DROP POLICY IF EXISTS "select_own_favorites" ON public.favorites;
CREATE POLICY "select_own_favorites" ON public.favorites FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "insert_own_favorites" ON public.favorites;
CREATE POLICY "insert_own_favorites" ON public.favorites FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_favorites" ON public.favorites;
CREATE POLICY "delete_own_favorites" ON public.favorites FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- contact_messages — INSERT public, lecture/écriture admin
-- ============================================================

DROP POLICY IF EXISTS "insert_contact_messages_public" ON public.contact_messages;
CREATE POLICY "insert_contact_messages_public" ON public.contact_messages FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "select_contact_messages_admin" ON public.contact_messages;
CREATE POLICY "select_contact_messages_admin" ON public.contact_messages FOR SELECT
  TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "update_contact_messages_admin" ON public.contact_messages;
CREATE POLICY "update_contact_messages_admin" ON public.contact_messages FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "delete_contact_messages_admin" ON public.contact_messages;
CREATE POLICY "delete_contact_messages_admin" ON public.contact_messages FOR DELETE
  TO authenticated USING (public.is_admin());

-- ============================================================
-- promotions — lecture publique (actives), gestion admin
-- ============================================================

DROP POLICY IF EXISTS "select_promotions_public" ON public.promotions;
CREATE POLICY "select_promotions_public" ON public.promotions FOR SELECT
  TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "select_promotions_admin" ON public.promotions;
CREATE POLICY "select_promotions_admin" ON public.promotions FOR SELECT
  TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "insert_promotions_admin" ON public.promotions;
CREATE POLICY "insert_promotions_admin" ON public.promotions FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "update_promotions_admin" ON public.promotions;
CREATE POLICY "update_promotions_admin" ON public.promotions FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "delete_promotions_admin" ON public.promotions;
CREATE POLICY "delete_promotions_admin" ON public.promotions FOR DELETE
  TO authenticated USING (public.is_admin());
