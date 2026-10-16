import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types";
import {
  AuthShell,
  AuthForm,
  AuthField,
  AuthAlert,
  AuthSubmit,
  AuthText,
} from "@/components/auth";

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

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          setServerError("Impossible de charger le profil.");
        } else {
          setProfile(data);
          reset({ full_name: data.full_name, phone: data.phone ?? "" });
        }
        setLoadingProfile(false);
      });
  }, [user, reset]);

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

  if (loadingProfile) {
    return (
      <AuthShell variant="page" title="Mon profil">
        <AuthText>Chargement…</AuthText>
      </AuthShell>
    );
  }

  return (
    <AuthShell variant="page" title="Mon profil" subtitle={profile?.email}>
      <AuthForm onSubmit={handleSubmit(onSubmit)} noValidate>
        {serverError && <AuthAlert>{serverError}</AuthAlert>}
        {successMessage && <AuthAlert tone="success">{successMessage}</AuthAlert>}
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
          Enregistrer
        </AuthSubmit>
      </AuthForm>
    </AuthShell>
  );
}
