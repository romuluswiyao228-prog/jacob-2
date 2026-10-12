import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

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

      if (enrollError || cancelled) return;
      if (!data) return;

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

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-900 px-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <h1 className="text-2xl font-bold text-green-400">MFA activée</h1>
          <p className="text-sm text-neutral-400">
            La double authentification est maintenant active. Redirection…
          </p>
          <p className="text-xs text-neutral-500">
            Conservez votre clé manuelle dans un gestionnaire de mots de passe
            en lieu sûr — elle sera nécessaire si vous perdez votre téléphone.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-900 px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Activer la MFA</h1>
          <p className="mt-2 text-sm text-neutral-400">
            Scannez ce QR code avec votre application d'authentification
            (Google Authenticator, Authy, etc.), puis saisissez le code généré.
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-950 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {qrUrl && (
          <div className="flex flex-col items-center space-y-4">
            <div className="rounded-lg bg-white p-4">
              <img src={qrUrl} alt="QR code MFA" className="h-48 w-48" />
            </div>
            {secret && (
              <div className="w-full rounded-lg bg-neutral-800 p-3">
                <p className="text-xs text-neutral-400">
                  Clé manuelle (si le QR code ne fonctionne pas) :
                </p>
                <p className="mt-1 break-all font-mono text-sm text-neutral-200">
                  {secret}
                </p>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-6">
          <div>
            <label htmlFor="verify-code" className="block text-sm font-medium text-neutral-300">
              Code de vérification
            </label>
            <input
              id="verify-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
              required
              className="mt-1 block w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-center text-2xl tracking-widest text-white focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 transition hover:bg-neutral-200 disabled:opacity-50"
          >
            {loading ? "Activation…" : "Activer la MFA"}
          </button>
        </form>

        <button
          onClick={() => {
            signOut();
            navigate("/admin/connexion", { replace: true });
          }}
          className="w-full text-center text-sm text-neutral-500 underline"
        >
          Annuler et se déconnecter
        </button>
      </div>
    </div>
  );
}
