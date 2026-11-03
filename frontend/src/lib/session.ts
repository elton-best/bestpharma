import type { QueryClient } from "@tanstack/react-query";
import type { AnyRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { oublierAppareil } from "@/lib/appareil";

/**
 * Déconnexion en quatre étapes ordonnées :
 * 1. on arrête les requêtes en vol (sinon elles 401 après la purge de session),
 * 2. on vide le cache (le retour arrière ne doit pas restaurer des données protégées),
 * 3. on purge la session côté Supabase,
 * 4. on repart vers /auth en REPLACE (l'historique ne garde pas la page protégée).
 */
export async function deconnecter(
  queryClient: QueryClient,
  router: AnyRouter,
  options: { verrouille?: boolean } = {},
) {
  await queryClient.cancelQueries();
  queryClient.clear();
  await supabase.auth.signOut();
  oublierAppareil();
  router.navigate({
    to: "/auth",
    search: options.verrouille ? { verrouille: true } : {},
    replace: true,
  });
}
