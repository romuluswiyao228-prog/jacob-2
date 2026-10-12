import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types";

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
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <p className="text-neutral-500">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-neutral-900">Mon profil</h1>
          <p className="mt-2 text-sm text-neutral-600">
            {profile?.email}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {serverError && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {serverError}
            </div>
          )}
          {successMessage && (
            <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
              {successMessage}
            </div>
          )}

          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-neutral-700">
              Nom complet
            </label>
            <input
              id="full_name"
              type="text"
              {...register("full_name")}
              className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
            />
            {errors.full_name && (
              <p className="mt-1 text-sm text-red-600">{errors.full_name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-neutral-700">
              Téléphone
            </label>
            <input
              id="phone"
              type="tel"
              {...register("phone")}
              className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
            )}
          </div>

          <div className="rounded-lg bg-neutral-100 p-3 text-xs text-neutral-500">
            Votre e-mail et votre identifiant ne sont pas modifiables depuis cette page.
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50"
          >
            {isSubmitting ? "Mise à jour…" : "Enregistrer"}
          </button>
        </form>
      </div>
    </div>
  );
}
