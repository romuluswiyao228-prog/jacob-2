import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types";
import {
  AuthForm,
  AuthField,
  AuthAlert,
  AuthSubmit,
} from "@/components/auth";
import { Skeleton, ErrorState, Button } from "@/components/ui";
import { AccountLayout } from "@/components/account/AccountLayout";

const schema = z.object({
  full_name: z.string().min(2, "Veuillez saisir votre nom complet."),
  phone: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const loadProfile = async () => {
    if (!user) return;
    setLoadingProfile(true);
    setServerError(null);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error || !data) {
        setServerError("Impossible de charger le profil.");
      } else {
        setProfile(data);
        reset({ full_name: data.full_name, phone: data.phone ?? "" });
      }
    } catch {
      setServerError("Erreur lors de la récupération du profil.");
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [user]);

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    setSuccessMessage(null);
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: data.full_name, phone: data.phone ?? null })
      .eq("id", user.id);

    if (error) {
      setServerError("La mise à jour a échoué. Veuillez réessayer.");
      return;
    }
    setSuccessMessage("Profil mis à jour avec succès.");
  };

  return (
    <AccountLayout
      title="Mon profil"
      subtitle={profile?.email ? `Connecté avec ${profile.email}` : undefined}
    >
      <div style={{ maxWidth: "560px", margin: "0 auto" }}>
        {loadingProfile ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <Skeleton variant="text" width="60%" height="24px" />
            <Skeleton variant="rect" width="100%" height="56px" />
            <Skeleton variant="rect" width="100%" height="56px" />
            <Skeleton variant="rect" width="140px" height="44px" />
          </div>
        ) : serverError && !profile ? (
          <ErrorState
            title="Erreur de chargement"
            message={serverError}
            action={
              <Button variant="outline" size="sm" onClick={loadProfile}>
                Réessayer
              </Button>
            }
          />
        ) : (
          <div
            style={{
              background: "var(--color-surface)",
              border: "var(--border-width) solid var(--color-border)",
              borderRadius: "var(--radius)",
              padding: "var(--space-6)",
            }}
          >
            <AuthForm onSubmit={handleSubmit(onSubmit)} noValidate>
              {serverError && <AuthAlert>{serverError}</AuthAlert>}
              {successMessage && (
                <AuthAlert tone="success">{successMessage}</AuthAlert>
              )}
              <AuthField
                label="Nom complet"
                type="text"
                autoComplete="name"
                error={errors.full_name?.message}
                {...register("full_name")}
              />
              <AuthField
                label="Téléphone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                hint="Votre e-mail et votre identifiant ne sont pas modifiables depuis cette page."
                error={errors.phone?.message}
                {...register("phone")}
              />
              <AuthSubmit loading={isSubmitting} loadingLabel="Mise à jour…">
                Enregistrer les modifications
              </AuthSubmit>
            </AuthForm>
          </div>
        )}
      </div>
    </AccountLayout>
  );
}
