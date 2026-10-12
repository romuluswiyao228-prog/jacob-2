import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

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
      <div className="flex min-h-screen items-center justify-center bg-neutral-900 px-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">Administration</h1>
            <p className="mt-2 text-sm text-neutral-400">
              Accès réservé au propriétaire.
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            {error && (
              <div className="rounded-lg bg-red-950 p-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="admin-email" className="block text-sm font-medium text-neutral-300">
                E-mail
              </label>
              <input
                id="admin-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-white focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
              />
            </div>

            <div>
              <label htmlFor="admin-password" className="block text-sm font-medium text-neutral-300">
                Mot de passe
              </label>
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-white focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 transition hover:bg-neutral-200 disabled:opacity-50"
            >
              {loading ? "Connexion…" : "Continuer"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-900 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Double authentification</h1>
          <p className="mt-2 text-sm text-neutral-400">
            Saisissez le code à 6 chiffres de votre application d'authentification.
          </p>
        </div>

        <form onSubmit={handleTotpSubmit} className="space-y-6">
          {error && (
            <div className="rounded-lg bg-red-950 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="totp-code" className="block text-sm font-medium text-neutral-300">
              Code à 6 chiffres
            </label>
            <input
              id="totp-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
              required
              className="mt-1 block w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-center text-2xl tracking-widest text-white focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 transition hover:bg-neutral-200 disabled:opacity-50"
          >
            {loading ? "Vérification…" : "Valider"}
          </button>
        </form>
      </div>
    </div>
  );
}
