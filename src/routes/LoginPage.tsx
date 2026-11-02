import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
      title={t("auth.loginTitle")}
      subtitle={t("auth.loginSubtitle")}
      pitch="Vos commandes et vos favoris, au même endroit."
      breadcrumb={
        <Breadcrumb
          items={[
            { label: t("common.home"), href: "/" },
            { label: t("auth.loginTitle") },
          ]}
        />
      }
      footer={
        <>
          <p>
            {t("auth.noAccount")}{" "}
            <AuthLink to="/inscription">{t("auth.createAccount")}</AuthLink>
          </p>
          <p>
            <AuthLink to="/mot-de-passe-oublie">{t("auth.forgotPassword")}</AuthLink>
          </p>
        </>
      }
    >
      <AuthForm onSubmit={handleSubmit(onSubmit)} noValidate>
        {serverError && <AuthAlert>{serverError}</AuthAlert>}
        <AuthField
          label={t("auth.email")}
          type="email"
          autoComplete="email"
          inputMode="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <AuthField
          label={t("auth.password")}
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />
        <AuthSubmit loading={isSubmitting} loadingLabel="Connexion…">
          {t("auth.loginBtn")}
        </AuthSubmit>
      </AuthForm>
    </AuthShell>
  );
}
