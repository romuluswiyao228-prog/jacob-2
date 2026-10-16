import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import {
  AuthShell,
  AuthForm,
  AuthField,
  AuthAlert,
  AuthSubmit,
  AuthText,
  AuthGhostButton,
} from "@/components/auth";

export default function MfaSetupPage() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user || !isAdmin) {
      navigate("/admin/connexion", { replace: true });
      return;
    }

    let cancelled = false;

    async function enroll() {
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        issuer: "JACOB DE JESUS",
      });

      if (cancelled) return;
      if (enrollError || !data) {
        setError(
          "Impossible de préparer la double authentification. Rechargez la page."
        );
        return;
      }

      setFactorId(data.id);
      setQrUrl(data.totp.qr_code);
      setSecret(data.totp.secret);
    }

    enroll();

    return () => {
      cancelled = true;
    };
  }, [user, isAdmin, navigate]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!factorId) {
      setError("Veuillez scanner le QR code d'abord.");
      setLoading(false);
      return;
    }

    const { error: challengeError, data: challengeData } =
      await supabase.auth.mfa.challenge({ factorId });

    if (challengeError) {
      setError("Impossible de vérifier le code. Réessayez.");
      setLoading(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code: verifyCode,
    });

    if (verifyError) {
      setError("Code incorrect. Vérifiez votre application d'authentification.");
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);

    setTimeout(() => {
      navigate("/admin", { replace: true });
    }, 2000);
  };

  const copySecret = async () => {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Copie impossible : la clé reste affichée pour être recopiée à la main.
    }
  };

  if (success) {
    return (
      <AuthShell variant="admin" title="MFA activée" pitch="Espace propriétaire.">
        <AuthAlert tone="success">
          La double authentification est maintenant active. Redirection…
        </AuthAlert>
        <AuthText>
          Conservez votre clé manuelle dans un gestionnaire de mots de passe, en
          lieu sûr : elle sera nécessaire si vous perdez votre téléphone.
        </AuthText>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      variant="admin"
      title="Activer la MFA"
      subtitle="Scannez ce QR code avec votre application d'authentification (Google Authenticator, Authy…), puis saisissez le code généré."
      pitch="Espace propriétaire."
      footer={
        <p>
          <AuthGhostButton
            onClick={() => {
              signOut();
              navigate("/admin/connexion", { replace: true });
            }}
          >
            Annuler et se déconnecter
          </AuthGhostButton>
        </p>
      }
    >
      {error && <AuthAlert>{error}</AuthAlert>}

      {qrUrl && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <div
            style={{
              alignSelf: "flex-start",
              padding: "16px",
              background: "#fff",
              border: "2px solid #0a0a0a",
            }}
          >
            <img
              src={qrUrl}
              alt="QR code à scanner avec l'application d'authentification"
              width={192}
              height={192}
            />
          </div>
          {secret && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                padding: "12px 16px",
                background: "#f5f5f5",
                border: "1px solid #0a0a0a",
              }}
            >
              <span style={{ fontSize: "0.875rem" }}>
                Clé manuelle, si le QR code ne fonctionne pas :
              </span>
              <code
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.9375rem",
                  overflowWrap: "anywhere",
                }}
              >
                {secret}
              </code>
              <AuthGhostButton onClick={copySecret}>
                {copied ? "Copiée" : "Copier la clé"}
              </AuthGhostButton>
            </div>
          )}
        </div>
      )}

      <AuthForm onSubmit={handleVerify}>
        <AuthField
          id="verify-code"
          variant="code"
          label="Code de vérification"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          value={verifyCode}
          onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
          required
        />
        <AuthSubmit loading={loading} loadingLabel="Activation…">
          Activer la MFA
        </AuthSubmit>
      </AuthForm>
    </AuthShell>
  );
}
