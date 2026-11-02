/**
 * WhatsApp helpers for customer communication and order confirmation.
 */

export interface OrderWhatsAppMessageParams {
  orderNumber: string;
  total: number | string;
  customerName?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
}

/**
 * Validates whether a phone number has between 8 and 15 digits.
 * Allows optional leading '+', spaces, dashes, dots, or parentheses.
 */
export function isValidWhatsAppNumber(
  phone: string | null | undefined
): boolean {
  if (!phone) return false;
  const trimmed = phone.trim();
  if (!trimmed) return false;

  // Disallow letters or unexpected symbols
  if (!/^\+?[0-9\s\-().]+$/.test(trimmed)) {
    return false;
  }

  const digits = trimmed.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}

/**
 * Builds a pre-filled WhatsApp message for an order.
 * Contains: order number, customer name, city, total in XOF, and confirmation request.
 */
export function orderWhatsAppMessage(
  params: OrderWhatsAppMessageParams
): string;
export function orderWhatsAppMessage(
  orderNumber: string,
  total: number | string,
  customerName: string,
  city: string
): string;
export function orderWhatsAppMessage(
  first: OrderWhatsAppMessageParams | string,
  second?: number | string,
  third?: string,
  fourth?: string
): string {
  let orderNumber = "";
  let total: number | string = "";
  let customerName = "";
  let city = "";

  if (typeof first === "object" && first !== null) {
    orderNumber = first.orderNumber ?? "";
    total = first.total ?? "";
    customerName =
      first.customerName ??
      [first.firstName, first.lastName].filter(Boolean).join(" ");
    city = first.city ?? "";
  } else {
    orderNumber = first ?? "";
    total = second ?? "";
    customerName = third ?? "";
    city = fourth ?? "";
  }

  const cleanOrderNumber = orderNumber.trim();
  const cleanName = customerName.trim();
  const cleanCity = city.trim();

  let formattedTotal = "";
  if (typeof total === "number") {
    formattedTotal = `${total.toLocaleString("fr-FR").replace(/[\u00a0\u202f]/g, " ")} XOF`;
  } else {
    const str = String(total).replace(/[\u00a0\u202f]/g, " ").trim();
    formattedTotal = str.includes("XOF") ? str : `${str} XOF`;
  }

  const lines: string[] = [
    `Bonjour, voici ma commande n° ${cleanOrderNumber}.`,
  ];
  if (cleanName) {
    lines.push(`Nom : ${cleanName}`);
  }
  if (cleanCity) {
    lines.push(`Ville : ${cleanCity}`);
  }
  lines.push(`Total : ${formattedTotal}`);
  lines.push("");
  lines.push("Pouvez-vous me confirmer la livraison ?");

  return lines.join("\n");
}

/**
 * Generates a wa.me URL with an optional encoded text parameter.
 * Returns null if the phone number is not valid (8 to 15 digits).
 */
export function whatsappLink(
  phone: string | null | undefined,
  message?: string
): string | null {
  if (!isValidWhatsAppNumber(phone)) {
    return null;
  }

  const digits = phone!.replace(/\D/g, "");
  if (!message) {
    return `https://wa.me/${digits}`;
  }

  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
