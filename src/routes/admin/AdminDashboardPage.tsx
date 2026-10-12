import { useAuth } from "@/lib/auth-context";
import { useAdminInactivityTimeout } from "@/lib/use-inactivity-timeout";

export default function AdminDashboardPage() {
  const { user, signOut } = useAuth();
  useAdminInactivityTimeout(true);

  return (
    <div className="min-h-screen bg-neutral-900 px-4 py-12">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Tableau de bord</h1>
            <p className="mt-1 text-sm text-neutral-400">
              {user?.email}
            </p>
          </div>
          <button
            onClick={() => signOut()}
            className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 transition hover:bg-neutral-800"
          >
            Se déconnecter
          </button>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-850 p-8">
          <h2 className="text-lg font-semibold text-white">
            Administration — à venir
          </h2>
          <p className="mt-2 text-sm text-neutral-400">
            Les fonctionnalités d'administration (gestion du catalogue,
            commandes, clients, stock, livraisons, promotions, réglages)
            seront disponibles dans les prochaines phases.
          </p>
        </div>
      </div>
    </div>
  );
}
