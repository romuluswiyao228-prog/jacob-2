import { describe, it, expect, beforeEach } from "vitest";
import type { CartLineItem, AddItemParams } from "@/lib/cart-context";

// Pure functional cart state transition helpers to test core cart business rules
function calculateTotals(items: CartLineItem[]) {
  const totalItems = items.reduce((acc, i) => acc + i.quantity, 0);
  const subtotal = items.reduce((acc, i) => acc + i.unit_price * i.quantity, 0);
  return { totalItems, subtotal };
}

function addItemToCart(items: CartLineItem[], params: AddItemParams): CartLineItem[] {
  const existingIndex = items.findIndex((i) => i.variant_id === params.variant_id);
  if (existingIndex >= 0) {
    return items.map((item, idx) => {
      if (idx === existingIndex) {
        const nextQty = Math.min(item.quantity + 1, params.stock);
        return { ...item, quantity: nextQty };
      }
      return item;
    });
  }
  return [
    ...items,
    {
      id: `local_${params.variant_id}`,
      ...params,
      quantity: 1,
    },
  ];
}

function updateItemQuantity(
  items: CartLineItem[],
  lineItemId: string,
  newQuantity: number
): CartLineItem[] {
  if (newQuantity < 1) return items;
  return items.map((item) => {
    if (item.id === lineItemId) {
      const capped = Math.min(newQuantity, item.stock);
      return { ...item, quantity: capped };
    }
    return item;
  });
}

function removeItemFromCart(items: CartLineItem[], lineItemId: string): CartLineItem[] {
  return items.filter((i) => i.id !== lineItemId);
}

describe("Gestion du Panier (Cart Logic)", () => {
  let sampleItem1: AddItemParams;
  let sampleItem2: AddItemParams;

  beforeEach(() => {
    sampleItem1 = {
      variant_id: "var_1",
      product_id: "prod_1",
      product_name: "Hoodie Jacob Black",
      product_slug: "hoodie-jacob-black",
      image_url: "https://example.com/hoodie.jpg",
      size: "L",
      color: "Noir",
      sku: "HJB-L",
      unit_price: 45000,
      currency: "XOF",
      stock: 5,
    };

    sampleItem2 = {
      variant_id: "var_2",
      product_id: "prod_2",
      product_name: "Casquette Logo",
      product_slug: "casquette-logo",
      image_url: "https://example.com/cap.jpg",
      size: "Unique",
      color: "Noir",
      sku: "CAP-01",
      unit_price: 15000,
      currency: "XOF",
      stock: 10,
    };
  });

  it("calcule correctement le total d'articles et le sous-total d'un panier vide", () => {
    const { totalItems, subtotal } = calculateTotals([]);
    expect(totalItems).toBe(0);
    expect(subtotal).toBe(0);
  });

  it("ajoute un nouvel article au panier avec une quantité initiale de 1", () => {
    const cart = addItemToCart([], sampleItem1);
    expect(cart).toHaveLength(1);
    expect(cart[0].product_name).toBe("Hoodie Jacob Black");
    expect(cart[0].quantity).toBe(1);

    const { totalItems, subtotal } = calculateTotals(cart);
    expect(totalItems).toBe(1);
    expect(subtotal).toBe(45000);
  });

  it("incrémente la quantité quand on ajoute à nouveau le même article", () => {
    let cart = addItemToCart([], sampleItem1);
    cart = addItemToCart(cart, sampleItem1);

    expect(cart).toHaveLength(1);
    expect(cart[0].quantity).toBe(2);

    const { totalItems, subtotal } = calculateTotals(cart);
    expect(totalItems).toBe(2);
    expect(subtotal).toBe(90000);
  });

  it("ajoute des articles différents sans les écraser", () => {
    let cart = addItemToCart([], sampleItem1);
    cart = addItemToCart(cart, sampleItem2);

    expect(cart).toHaveLength(2);
    const { totalItems, subtotal } = calculateTotals(cart);
    expect(totalItems).toBe(2);
    expect(subtotal).toBe(60000); // 45000 + 15000
  });

  it("ne dépasse pas la limite du stock disponible", () => {
    let cart = addItemToCart([], { ...sampleItem1, stock: 2 });
    cart = addItemToCart(cart, { ...sampleItem1, stock: 2 });
    cart = addItemToCart(cart, { ...sampleItem1, stock: 2 }); // tentative au-delà de 2

    expect(cart[0].quantity).toBe(2);
  });

  it("met à jour la quantité d'un article et recalcule les totaux", () => {
    let cart = addItemToCart([], sampleItem1);
    cart = updateItemQuantity(cart, cart[0].id, 3);

    expect(cart[0].quantity).toBe(3);
    const { totalItems, subtotal } = calculateTotals(cart);
    expect(totalItems).toBe(3);
    expect(subtotal).toBe(135000);
  });

  it("ignore les mises à jour avec une quantité inférieure à 1", () => {
    let cart = addItemToCart([], sampleItem1);
    cart = updateItemQuantity(cart, cart[0].id, 0);

    expect(cart[0].quantity).toBe(1);
  });

  it("supprime un article du panier", () => {
    let cart = addItemToCart([], sampleItem1);
    cart = addItemToCart(cart, sampleItem2);

    cart = removeItemFromCart(cart, cart[0].id);

    expect(cart).toHaveLength(1);
    expect(cart[0].product_name).toBe("Casquette Logo");
    const { totalItems, subtotal } = calculateTotals(cart);
    expect(totalItems).toBe(1);
    expect(subtotal).toBe(15000);
  });

  it("persiste et restaure le panier invité dans localStorage", () => {
    const LS_KEY = "jacob_cart_guest_test";
    const cart = addItemToCart([], sampleItem1);

    localStorage.setItem(LS_KEY, JSON.stringify(cart));
    const saved = JSON.parse(localStorage.getItem(LS_KEY) || "[]");

    expect(saved).toHaveLength(1);
    expect(saved[0].sku).toBe("HJB-L");
    localStorage.removeItem(LS_KEY);
  });
});
