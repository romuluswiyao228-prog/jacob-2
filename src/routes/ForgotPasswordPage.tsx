import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/auth-context";

const schema = z.object({
  email: z.string().email("Adresse e-mail invalide."),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    const { error } = await resetPassword(data.email);
    if (error) {
      setServerError(error);
      return;
    }
    setSuccess(true);
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <h1 className="text-2xl font-bold text-neutral-900">E-mail envoyé</h1>
          <p className="text-sm text-neutral-600">
            Si un compte existe avec cette adresse, un e-mail de réinitialisation
            vous a été envoyé. Vérifiez votre boîte de réception.
          </p>
          <Link
            to="/connexion"
            className="inline-block rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            Retour à la connexion
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-neutral-900">Mot de passe oublié</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Saisissez votre e-mail pour recevoir un lien de réinitialisation.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {serverError && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {serverError}
            </div>
          )}

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

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50"
          >
            {isSubmitting ? "Envoi…" : "Envoyer le lien"}
          </button>
        </form>

        <p className="text-center text-sm text-neutral-600">
          <Link to="/connexion" className="font-medium text-neutral-900 underline">
            Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}
