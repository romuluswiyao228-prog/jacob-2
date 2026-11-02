/**
 * Lit le niveau d'assurance (aal1 ou aal2) dans le jeton d'acces Supabase.
 * Il n'est pas expose dans l'objet utilisateur : il faut le lire dans le jeton.
 */
export function aalFromToken(token?: string | null): string | null {
  if (!token) return null;
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded)) as { aal?: unknown };
    return typeof payload.aal === "string" ? payload.aal : null;
  } catch {
    return null;
  }
}
