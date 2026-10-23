import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  AuthLink,
} from "@/components/auth";
import { Breadcrumb } from "@/components/ui";

const schema = z.object({
  email: z.string().email("Adresse e-mail invalide."),
  password: z.string().min(10, "Le mot de passe doit contenir au moins 10 caractères."),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);
  const from = (location.state as { from?: string })?.from ?? "/compte";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    const { error } = await signIn(data.email, data.password);
    if (error) {
      setServerError(error);
      return;
    }
    navigate(from, { replace: true });
  };

  return (
    <AuthShell
      title="Connexion"
      subtitle="Connectez-vous à votre compte JACOB DE JESUS."
      pitch="Vos commandes et vos favoris, au même endroit."
      breadcrumb={
        <Breadcrumb
          items={[
            { label: "Accueil", href: "/" },
            { label: "Connexion" },
          ]}
        />
      }
      footer={
        <>
          <p>
            Pas encore de compte ?{" "}
            <AuthLink to="/inscription">Créer un compte</AuthLink>
          </p>
          <p>
            <AuthLink to="/mot-de-passe-oublie">Mot de passe oublié ?</AuthLink>
          </p>
        </>
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
        <AuthField
          label="Mot de passe"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />
        <AuthSubmit loading={isSubmitting} loadingLabel="Connexion…">
          Se connecter
        </AuthSubmit>
      </AuthForm>
    </AuthShell>
  );
}
