import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import {
  AuthShell,
  AuthForm,
  AuthField,
  AuthAlert,
  AuthSubmit,
} from "@/components/auth";

export default function AdminLoginPage() {
  const { signIn, refreshRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [step, setStep] = useState<"password" | "totp">("password");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [factorId, setFactorId] = useState<string>("");
  const [challengeId, setChallengeId] = useState<string>("");
  const from = (location.state as { from?: string })?.from ?? "/admin";

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await signIn(email, password);
    if (signInError) {
      setError(signInError);
      setLoading(false);
      return;
    }

    await refreshRole();

    // Check if user has MFA factors
    const { data: factorsData } = await supabase.auth.mfa.listFactors();
    const totpFactor = factorsData?.totp?.[0];

    if (!totpFactor) {
      navigate("/admin/mfa-setup", { replace: true });
      return;
    }

    setFactorId(totpFactor.id);

    const { error: challengeError, data: challengeData } =
      await supabase.auth.mfa.challenge({ factorId: totpFactor.id });

    if (challengeError) {
      setError("Impossible d'initialiser la vérification. Réessayez.");
      setLoading(false);
      return;
    }

    setChallengeId(challengeData.id);
    setStep("totp");
    setLoading(false);
  };

  const handleTotpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code: totpCode,
    });

    if (verifyError) {
      setError("Code incorrect. Vérifiez votre application d'authentification.");
      setLoading(false);
      return;
    }

    navigate(from, { replace: true });
  };

  if (step === "password") {
    return (
      <AuthShell
        variant="admin"
        title="Administration"
        subtitle="Accès réservé au propriétaire."
        pitch="Espace propriétaire."
      >
        <AuthForm onSubmit={handlePasswordSubmit}>
          {error && <AuthAlert>{error}</AuthAlert>}
          <AuthField
            id="admin-email"
            label="E-mail"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <AuthField
            id="admin-password"
            label="Mot de passe"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <AuthSubmit loading={loading} loadingLabel="Connexion…">
            Continuer
          </AuthSubmit>
        </AuthForm>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      variant="admin"
      title="Double authentification"
      subtitle="Saisissez le code à 6 chiffres de votre application d'authentification."
      pitch="Espace propriétaire."
    >
      <AuthForm onSubmit={handleTotpSubmit}>
        {error && <AuthAlert>{error}</AuthAlert>}
        <AuthField
          id="totp-code"
          variant="code"
          label="Code à 6 chiffres"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          value={totpCode}
          onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
          required
        />
        <AuthSubmit loading={loading} loadingLabel="Vérification…">
          Valider
        </AuthSubmit>
      </AuthForm>
    </AuthShell>
  );
}
