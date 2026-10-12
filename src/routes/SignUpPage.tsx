import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/auth-context";

const schema = z.object({
  fullName: z.string().min(2, "Veuillez saisir votre nom complet."),
  email: z.string().email("Adresse e-mail invalide."),
  password: z.string().min(10, "Le mot de passe doit contenir au moins 10 caractères."),
});

type FormData = z.infer<typeof schema>;

export default function SignUpPage() {
  const { signUp } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    const { error, needsConfirmation } = await signUp(data.email, data.password, data.fullName);
    if (error) {
      setServerError(error);
      return;
    }
    if (needsConfirmation) {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <h1 className="text-2xl font-bold text-neutral-900">Compte créé</h1>
          <p className="text-sm text-neutral-600">
            Un e-mail de confirmation vous a été envoyé. Veuillez cliquer sur le
            lien dans l'e-mail pour activer votre compte, puis vous connecter.
          </p>
          <Link
            to="/connexion"
            className="inline-block rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            Aller à la connexion
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-neutral-900">Créer un compte</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Rejoignez JACOB DE JESUS.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {serverError && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {serverError}
            </div>
          )}

          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-neutral-700">
              Nom complet
            </label>
            <input
              id="fullName"
              type="text"
              autoComplete="name"
              {...register("fullName")}
              className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
            />
            {errors.fullName && (
              <p className="mt-1 text-sm text-red-600">{errors.fullName.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-neutral-700">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register("email")}
              className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-neutral-700">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register("password")}
              className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
            <p className="mt-1 text-xs text-neutral-500">
              Minimum 10 caractères.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50"
          >
            {isSubmitting ? "Création…" : "Créer mon compte"}
          </button>
        </form>

        <p className="text-center text-sm text-neutral-600">
          Déjà un compte ?{" "}
          <Link to="/connexion" className="font-medium text-neutral-900 underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
