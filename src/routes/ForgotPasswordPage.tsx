import { useState } from "react";
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
  AuthText,
  AuthButtonLink,
  AuthLink,
} from "@/components/auth";
import { Breadcrumb } from "@/components/ui";

const schema = z.object({
  email: z.string().email("Adresse e-mail invalide."),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
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

  const breadcrumbEl = (
    <Breadcrumb
      items={[
        { label: t("common.home"), href: "/" },
        { label: t("auth.forgotPassword") },
      ]}
    />
  );

  if (success) {
    return (
      <AuthShell
        title="E-mail envoyé"
        pitch="Vérifiez votre boîte de réception."
        breadcrumb={breadcrumbEl}
      >
        <AuthText>
          Si un compte existe avec cette adresse, un e-mail de réinitialisation
          vous a été envoyé. Pensez à regarder dans vos courriers indésirables.
        </AuthText>
        <AuthButtonLink to="/connexion">{t("auth.backToLogin")}</AuthButtonLink>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={t("auth.resetTitle")}
      breadcrumb={breadcrumbEl}
      subtitle={t("auth.resetSubtitle")}
      pitch="Ça arrive. On vous renvoie un lien."
      footer={
        <p>
          <AuthLink to="/connexion">{t("auth.backToLogin")}</AuthLink>
        </p>
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
        <AuthSubmit loading={isSubmitting} loadingLabel="Envoi…">
          {t("auth.resetBtn")}
        </AuthSubmit>
      </AuthForm>
    </AuthShell>
  );
}
