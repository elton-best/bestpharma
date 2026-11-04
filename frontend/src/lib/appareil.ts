import { api } from "@/lib/api-client";

/**
 * Un appareil = une session Sanctum. L'identifiant local n'a plus qu'un rôle de
 * confort : c'est la liste des jetons du backend qui fait foi, et la révocation
 * d'un jeton invalide immédiatement la session correspondante.
 */
const CLE = "begpharma.appareil";

/** Identifiant de session local (facultatif, utilisé pour l'affichage). */
export function appareilCourant(): string | null {
  try {
    return localStorage.getItem(CLE);
  } catch {
    return null;
  }
}

export function memoriserAppareil(id: string) {
  try {
    localStorage.setItem(CLE, id);
  } catch {}
}

/**
 * Vérifie que la session courante est toujours valide côté backend.
 * Retourne false UNIQUEMENT si elle a été révoquée à distance ; en cas
 * d'indisponibilité réseau on ne déconnecte jamais l'utilisateur.
 */
export async function verifierAppareil(): Promise<boolean> {
  if (!api.getToken()) return true;
  try {
    const reponse = await api.get<{ devices: { id: string | number; is_current: boolean }[] }>(
      "/auth/devices",
    );
    const courante = (reponse.devices ?? []).find((d) => d.is_current);
    if (!courante) {
      // Le jeton présenté ne correspond à aucune session : il a été révoqué.
      oublierAppareil();
      return false;
    }
    memoriserAppareil(String(courante.id));
    return true;
  } catch (erreur: any) {
    // 401 explicite = session expirée ; toute autre erreur est transitoire.
    if (/401|non authentifi/i.test(String(erreur?.message ?? ""))) {
      oublierAppareil();
      return false;
    }
    return true;
  }
}

/** Conservé pour la compatibilité des écrans existants. */
export async function enregistrerAppareil(_userId?: string): Promise<boolean> {
  return verifierAppareil();
}

export function oublierAppareil() {
  try {
    localStorage.removeItem(CLE);
  } catch {}
}
