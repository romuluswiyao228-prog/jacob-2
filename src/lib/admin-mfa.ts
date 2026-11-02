import { supabase } from "@/lib/supabase";

/**
 * Demande a la base si l'administration exige la double authentification.
 * Par prudence, en cas d'erreur on considere qu'elle est exigee.
 */
export async function fetchAdminRequiresMfa(): Promise<boolean> {
  const { data, error } = await supabase.rpc("admin_requires_mfa");
  if (error || typeof data !== "boolean") return true;
  return data;
}
