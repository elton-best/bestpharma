import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiHttpError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
export function messageConnexion(error: unknown): string {
  if (error instanceof ApiHttpError) {
    if (error.status === 401) return "La connexion enregistrée n’est plus reconnue. Reconnectez-vous pour retrouver vos documents.";
    if (error.status === 403) return "Votre compte n’a pas accès à cette officine. Vérifiez l’officine sélectionnée ou vos habilitations.";
    if (error.status === 404) return "Le service demandé n’est pas disponible sur cette version du serveur.";
    if (error.status === 423) return "Votre session est verrouillée. Reconnectez-vous pour poursuivre.";
    if (error.status >= 500) return "Le serveur est momentanément indisponible ou ne renvoie pas les données attendues. Votre connexion est conservée.";
  }
  return "La communication avec le serveur a été interrompue. Votre connexion est conservée.";
}
export function ConnexionDonnees({ erreur, reessayer, titre = "Chargement interrompu" }: { erreur: unknown; reessayer: () => unknown; titre?: string }) {
  const qc = useQueryClient();
  const [enCours, setEnCours] = useState(false);
  const [diagnostic, setDiagnostic] = useState<unknown>(null);
  async function verifier() {
    setEnCours(true); setDiagnostic(null);
    try {
      await api.synchroniserSession();
      await qc.invalidateQueries({ predicate: q => q.queryKey[0] !== "connexion-serveur" });
      await reessayer();
    } catch (e) { setDiagnostic(e); }
    finally { setEnCours(false); }
  }
  const probleme = diagnostic ?? erreur;
  const reconnecter = probleme instanceof ApiHttpError && [401,423].includes(probleme.status);
  return <section role="alert" className="grid gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
    <h2 className="font-bold">{titre}</h2><p className="text-sm">{messageConnexion(probleme)}</p>
    <div className="flex flex-wrap gap-3"><Button variant="outline" className="min-h-12" disabled={enCours} onClick={verifier}>{enCours ? "Vérification…" : "Vérifier et recharger"}</Button>
      {reconnecter && <Button className="min-h-12" onClick={() => { qc.clear(); api.logout(); window.location.assign("/auth"); }}>Se reconnecter</Button>}
      <Button variant="outline" className="min-h-12" onClick={() => window.location.reload()}>Actualiser l’application</Button>
    </div>
  </section>;
}
/** Contrôle non bloquant, même quand un profil ancien est déjà présent localement. */
export function EtatConnexion() {
  const qc = useQueryClient();
  const etat = useQuery({ queryKey: ["connexion-serveur", api.getToken()], queryFn: async () => { await api.synchroniserSession(); return true; }, retry: false, staleTime: 60_000, refetchOnMount: "always", refetchOnWindowFocus: true });
  useEffect(() => {
    if (etat.isSuccess) void qc.invalidateQueries({ queryKey: ["rattachements"] });
  }, [etat.dataUpdatedAt, etat.isSuccess, qc]);
  return etat.isError ? <div className="mb-4"><ConnexionDonnees erreur={etat.error} reessayer={() => etat.refetch()} titre="Connexion à vérifier" /></div> : null;
}
