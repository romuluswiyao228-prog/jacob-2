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
      <AuthShell
        title="Compte créé"
        pitch="Plus qu'un clic pour activer votre compte."
      >
        <AuthText>
          Un e-mail de confirmation vous a été envoyé. Cliquez sur le lien
          qu'il contient pour activer votre compte, puis connectez-vous.
        </AuthText>
        <AuthButtonLink to="/connexion">Aller à la connexion</AuthButtonLink>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Créer un compte"
      subtitle="Rejoignez JACOB DE JESUS."
      pitch="Suivez vos commandes et gardez vos pièces préférées."
      footer={
        <p>
          Déjà un compte ? <AuthLink to="/connexion">Se connecter</AuthLink>
        </p>
      }
    >
      <AuthForm onSubmit={handleSubmit(onSubmit)} noValidate>
        {serverError && <AuthAlert>{serverError}</AuthAlert>}
        <AuthField
          label="Nom complet"
          type="text"
          autoComplete="name"
          error={errors.fullName?.message}
          {...register("fullName")}
        />
        <AuthField
          label="E-mail"
          type="email"
          autoComplete="email"
          inputMode="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <AuthField
          label="Mot de passe"
          type="password"
          autoComplete="new-password"
          hint="Minimum 10 caractères."
          error={errors.password?.message}
          {...register("password")}
        />
        <AuthSubmit loading={isSubmitting} loadingLabel="Création…">
          Créer mon compte
        </AuthSubmit>
      </AuthForm>
    </AuthShell>
  );
}
