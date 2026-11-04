import type { QueryClient } from "@tanstack/react-query";
import type { AnyRouter } from "@tanstack/react-router";
import { api } from "@/lib/api-client";
import { oublierAppareil } from "@/lib/appareil";

/**
 * Déconnexion en quatre étapes ordonnées :
 * 1. on arrête les requêtes en vol (sinon elles échouent après la purge de session),
 * 2. on vide le cache (le retour arrière ne doit pas restaurer des données protégées),
 * 3. on révoque le jeton côté backend (POST /auth/logout),
 * 4. on repart vers /auth en REPLACE (l'historique ne garde pas la page protégée).
 */
export async function deconnecter(
  queryClient: QueryClient,
  router: AnyRouter,
  options: { verrouille?: boolean } = {},
) {
  await queryClient.cancelQueries();
  queryClient.clear();

  try {
    if (api.getToken()) await api.post("/auth/logout");
  } catch {}

  api.logout();
  oublierAppareil();

  router.navigate({
    to: "/auth",
    search: options.verrouille ? { verrouille: true } : {},
    replace: true,
  });
}
