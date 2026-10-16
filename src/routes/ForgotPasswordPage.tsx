import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/auth-context";
import {
  AuthShell,
  AuthForm,
  AuthField,
  AuthAlert,
  AuthSubmit,
  AuthText,
  AuthButtonLink,
  AuthLink,
} from "@/components/auth";

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
      <AuthShell title="E-mail envoyé" pitch="Vérifiez votre boîte de réception.">
        <AuthText>
          Si un compte existe avec cette adresse, un e-mail de réinitialisation
          vous a été envoyé. Pensez à regarder dans vos courriers indésirables.
        </AuthText>
        <AuthButtonLink to="/connexion">Retour à la connexion</AuthButtonLink>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Mot de passe oublié"
      subtitle="Saisissez votre e-mail pour recevoir un lien de réinitialisation."
      pitch="Ça arrive. On vous renvoie un lien."
      footer={
        <p>
          <AuthLink to="/connexion">Retour à la connexion</AuthLink>
        </p>
      }
    >
      <AuthForm onSubmit={handleSubmit(onSubmit)} noValidate>
        {serverError && <AuthAlert>{serverError}</AuthAlert>}
        <AuthField
          label="E-mail"
          type="email"
          autoComplete="email"
          inputMode="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <AuthSubmit loading={isSubmitting} loadingLabel="Envoi…">
          Envoyer le lien
        </AuthSubmit>
      </AuthForm>
    </AuthShell>
  );
}
