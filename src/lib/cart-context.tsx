/**
 * CartContext — gestion du panier
 *
 * Invite   -> localStorage (cle: "jacob_cart_guest")
 * Connecte -> tables carts + cart_items (Supabase, RLS)
 * Fusion   -> a la connexion, les articles locaux sont ajoutes au panier Supabase
 * Revalidation -> a chaque ouverture du tiroir, prix et stocks sont verifies
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

// --- Types -------------------------------------------------------------------

export interface CartLineItem {
  id: string;
  variant_id: string;
  product_id: string;
  product_name: string;
  product_slug: string;
  image_url: string | null;
  size: string | null;
  color: string | null;
  sku: string;
  unit_price: number;
  currency: string;
  quantity: number;
  stock: number;
  alert?: "price_changed" | "out_of_stock" | "removed";
  new_price?: number;
}

export interface AddItemParams {
  variant_id: string;
  product_id: string;
  product_name: string;
  product_slug: string;
  image_url: string | null;
  size: string | null;
  color: string | null;
  sku: string;
  unit_price: number;
  currency: string;
  stock: number;
}

export interface CartContextValue {
  items: CartLineItem[];
  totalItems: number;
  subtotal: number;
  currency: string;
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;
  openCart: () => void;
  closeCart: () => void;
  addItem: (params: AddItemParams) => Promise<void>;
  removeItem: (lineItemId: string) => Promise<void>;
  updateQuantity: (lineItemId: string, quantity: number) => Promise<void>;
  clearAlerts: () => void;
  retry: () => Promise<void>;
}

// --- LocalStorage helpers ----------------------------------------------------

const LS_KEY = "jacob_cart_guest";

function readLocalCart(): CartLineItem[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CartLineItem[];
  } catch {
    return [];
  }
}

function writeLocalCart(items: CartLineItem[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

function clearLocalCart() {
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    // ignore
  }
}

// --- Supabase helpers --------------------------------------------------------

async function ensureCart(userId: string): Promise<string> {
  const { data, error } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (data) return data.id as string;

  const { data: newCart, error: createErr } = await supabase
    .from("carts")
    .insert({ user_id: userId, status: "active" })
    .select("id")
    .single();

  if (createErr) throw createErr;
  return (newCart as { id: string }).id;
}

async function loadRemoteCartItems(cartId: string): Promise<CartLineItem[]> {
  const { data, error } = await supabase
    .from("cart_items")
    .select(`
      id,
      variant_id,
      quantity,
      unit_price,
      currency,
      product_variants (
        id,
        size,
        color,
        sku,
        stock,
        price,
        product_id,
        products (
          id,
          name,
          slug,
          product_images ( url, is_primary, sort_order )
        )
      )
    `)
    .eq("cart_id", cartId);

  if (error) throw error;
  if (!data) return [];

  type RawRow = {
    id: string;
    variant_id: string;
    quantity: number;
    unit_price: number;
    currency: string;
    product_variants: {
      id: string;
      size: string | null;
      color: string | null;
      sku: string;
      stock: number;
      price: number | null;
      product_id: string;
      products: {
        id: string;
        name: string;
        slug: string;
        product_images: { url: string; is_primary: boolean; sort_order: number }[];
      } | null;
    } | null;
  };

  return (data as RawRow[]).flatMap((r) => {
    if (!r.product_variants || !r.product_variants.products) return [];
    const pv = r.product_variants;
    const prod = pv.products!;
    const imgs = (prod.product_images ?? []).sort(
      (a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || a.sort_order - b.sort_order
    );
    return [{
      id: r.id,
      variant_id: r.variant_id,
      product_id: pv.product_id,
      product_name: prod.name,
      product_slug: prod.slug,
      image_url: imgs[0]?.url ?? null,
      size: pv.size,
      color: pv.color,
      sku: pv.sku,
      unit_price: r.unit_price,
      currency: r.currency,
      quantity: r.quantity,
      stock: pv.stock,
    }] as CartLineItem[];
  });
}

async function revalidateItems(items: CartLineItem[]): Promise<CartLineItem[]> {
  if (items.length === 0) return [];

  const variantIds = [...new Set(items.map((i) => i.variant_id))];

  const { data } = await supabase
    .from("product_variants")
    .select("id, stock, price, currency, products(is_archived)")
    .in("id", variantIds);

  type LiveRow = { id: string; stock: number; price: number | null; currency: string; products: { is_archived: boolean } | null };

  const liveMap = new Map<string, LiveRow>();
  (data as LiveRow[] ?? []).forEach((v) => liveMap.set(v.id, v));

  return items.map((item) => {
    const live = liveMap.get(item.variant_id);
    if (!live || live.products?.is_archived) {
      return { ...item, stock: 0, alert: "removed" as const };
    }
    if (live.stock <= 0) {
      return { ...item, stock: 0, alert: "out_of_stock" as const };
    }
    const livePrice = live.price ?? item.unit_price;
    if (livePrice !== item.unit_price) {
      return { ...item, stock: live.stock, alert: "price_changed" as const, new_price: livePrice };
    }
    return { ...item, stock: live.stock, alert: undefined };
  });
}

// --- Context -----------------------------------------------------------------

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartLineItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cartIdRef = useRef<string | null>(null);
  const loadingRef = useRef(false);

  const loadCart = useCallback(async (revalidate = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setError(null);
    try {
      if (user) {
        const cartId = await ensureCart(user.id);
        cartIdRef.current = cartId;
        let remoteItems = await loadRemoteCartItems(cartId);
        if (revalidate) remoteItems = await revalidateItems(remoteItems);
        setItems(remoteItems);
      } else {
        let localItems = readLocalCart();
        if (revalidate) {
          localItems = await revalidateItems(localItems);
          writeLocalCart(localItems);
        }
        setItems(localItems);
        cartIdRef.current = null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement du panier");
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  }, [user]);

  const mergeGuestCart = useCallback(async (cartId: string) => {
    const guestItems = readLocalCart();
    if (guestItems.length === 0) return;
    for (const item of guestItems) {
      const { data: existing } = await supabase
        .from("cart_items")
        .select("id, quantity")
        .eq("cart_id", cartId)
        .eq("variant_id", item.variant_id)
        .maybeSingle();
      if (existing) {
        await supabase
          .from("cart_items")
          .update({ quantity: Math.min((existing as { quantity: number }).quantity + item.quantity, item.stock) })
          .eq("id", (existing as { id: string }).id);
      } else {
        await supabase.from("cart_items").insert({
          cart_id: cartId,
          variant_id: item.variant_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          currency: item.currency,
        });
      }
    }
    clearLocalCart();
  }, []);

  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const prevId = prevUserIdRef.current;
    const currId = user?.id ?? null;
    prevUserIdRef.current = currId;

    (async () => {
      setIsLoading(true);
      if (currId && prevId !== currId) {
        try {
          const cartId = await ensureCart(currId);
          cartIdRef.current = cartId;
          await mergeGuestCart(cartId);
        } catch {
          // non-critical
        }
      }
      await loadCart(false);
    })();
  }, [user, loadCart, mergeGuestCart]);

  const openCart = useCallback(() => {
    setIsOpen(true);
    loadCart(true);
  }, [loadCart]);

  const closeCart = useCallback(() => setIsOpen(false), []);

  const addItem = useCallback(async (params: AddItemParams) => {
    setError(null);
    try {
      if (user && cartIdRef.current) {
        const cartId = cartIdRef.current;
        const { data: existing } = await supabase
          .from("cart_items")
          .select("id, quantity")
          .eq("cart_id", cartId)
          .eq("variant_id", params.variant_id)
          .maybeSingle();

        if (existing) {
          const newQty = Math.min((existing as { quantity: number }).quantity + 1, params.stock);
          await supabase.from("cart_items").update({ quantity: newQty }).eq("id", (existing as { id: string }).id);
        } else {
          await supabase.from("cart_items").insert({
            cart_id: cartId,
            variant_id: params.variant_id,
            quantity: 1,
            unit_price: params.unit_price,
            currency: params.currency,
          });
        }
        await loadCart(false);
      } else {
        setItems((prev) => {
          const idx = prev.findIndex((i) => i.variant_id === params.variant_id);
          let next: CartLineItem[];
          if (idx >= 0) {
            next = prev.map((item, i) =>
              i === idx ? { ...item, quantity: Math.min(item.quantity + 1, params.stock) } : item
            );
          } else {
            const newLine: CartLineItem = {
              id: `local_${params.variant_id}_${Date.now()}`,
              ...params,
              quantity: 1,
            };
            next = [...prev, newLine];
          }
          writeLocalCart(next);
          return next;
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d ajouter l article");
      throw err;
    }
  }, [user, loadCart]);

  const removeItem = useCallback(async (lineItemId: string) => {
    setError(null);
    try {
      if (user) {
        await supabase.from("cart_items").delete().eq("id", lineItemId);
        setItems((prev) => prev.filter((i) => i.id !== lineItemId));
      } else {
        setItems((prev) => {
          const next = prev.filter((i) => i.id !== lineItemId);
          writeLocalCart(next);
          return next;
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de retirer l article");
    }
  }, [user]);

  const updateQuantity = useCallback(async (lineItemId: string, quantity: number) => {
    if (quantity < 1) return;
    setError(null);
    try {
      if (user) {
        await supabase.from("cart_items").update({ quantity }).eq("id", lineItemId);
        setItems((prev) => prev.map((i) => (i.id === lineItemId ? { ...i, quantity } : i)));
      } else {
        setItems((prev) => {
          const next = prev.map((i) => (i.id === lineItemId ? { ...i, quantity } : i));
          writeLocalCart(next);
          return next;
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de modifier la quantite");
    }
  }, [user]);

  const clearAlerts = useCallback(() => {
    setItems((prev) => prev.map((i) => ({ ...i, alert: undefined, new_price: undefined })));
  }, []);

  const totalItems = items.reduce((acc, i) => acc + i.quantity, 0);
  const currency = items[0]?.currency ?? "XOF";
  const subtotal = items.reduce((acc, i) => acc + i.unit_price * i.quantity, 0);
  const retry = useCallback(() => loadCart(true), [loadCart]);

  return (
    <CartContext.Provider
      value={{
        items,
        totalItems,
        subtotal,
        currency,
        isOpen,
        isLoading,
        error,
        openCart,
        closeCart,
        addItem,
        removeItem,
        updateQuantity,
        clearAlerts,
        retry,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
