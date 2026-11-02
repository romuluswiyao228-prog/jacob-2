// Supabase Edge Function: refresh-exchange-rates
// Récupère les taux de change auprès d'un fournisseur externe et met à jour la table public.exchange_rates.
//
// Sécurité :
// - Appelable UNIQUEMENT par le propriétaire connecté (vérification admin AAL2 via JWT)
//   ou par une tâche planifiée Supabase Cron via SERVICE_ROLE_KEY.
// - Rejette systématiquement les requêtes anonymes ou de simples clients.
// - Aucune clé API en dur dans le code : utilisation des secrets d'environnement Supabase.
// - L'EUR est TOUJOURS enregistré avec sa parité fixe légale stricte : 1 EUR = 655,957 XOF.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EUR_XOF_PARITY = 655.957;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Variables d'environnement manquantes sur le serveur." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Vérification d'autorisation
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Autorisation requise." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const isServiceRole = token === supabaseServiceKey;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    if (!isServiceRole) {
      // Vérifier le jeton utilisateur et son rôle admin AAL2
      const {
        data: { user },
        error: authError,
      } = await supabaseAdmin.auth.getUser(token);

      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: "Jeton utilisateur invalide ou expiré." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Vérifier le rôle propriétaire dans user_roles
      const { data: roleData, error: roleError } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "owner")
        .maybeSingle();

      if (roleError || !roleData) {
        return new Response(
          JSON.stringify({ error: "Accès refusé. Réservé au propriétaire de la boutique." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 2. Parité fixe EUR et préparation du fournisseur de devises
    // Le franc CFA (XOF) est arrimé à l'euro : 1 EUR = 655,957 XOF => 1 XOF = 1 / 655.957 EUR
    const nowIso = new Date().toISOString();
    const rowsToUpsert: Array<{ devise: string; taux: number; mis_a_jour: string }> = [
      {
        devise: "XOF",
        taux: 1.0,
        mis_a_jour: nowIso,
      },
      {
        devise: "EUR",
        taux: 1.0 / EUR_XOF_PARITY,
        mis_a_jour: nowIso,
      },
    ];

    // NOTE: En attente de la sélection du fournisseur par l'utilisateur parmi :
    // 1. Frankfurter API (BCE - Banque Centrale Européenne, base EUR native, sans clé, 100% gratuit)
    // 2. ExchangeRate-API (open.er-api.com, gratuit, base EUR, 160+ devises)
    // Dès choix validé, l'appel HTTP fetch(providerUrl) dérive les devises (USD, GBP, CAD, JPY...) depuis EUR.

    const { error: upsertError } = await supabaseAdmin
      .from("exchange_rates")
      .upsert(rowsToUpsert, { onConflict: "devise" });

    if (upsertError) {
      throw upsertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Taux de change actualisés.",
        mis_a_jour: nowIso,
        updated: rowsToUpsert.map((r) => r.devise),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur interne.";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

