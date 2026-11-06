import { useEffect, useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { formatDateHeure } from "@/lib/format";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ModaleFiche, ColonneFiche, Champ } from "@/components/modules/modale";

export function ApprobationDocument({ ouvert, onFermer, onSigner, titreAction }: {
  ouvert: boolean; onFermer: () => void; onSigner: (motDePasse: string) => Promise<void>; titreAction: string;
}) {
  const [motDePasse, setMotDePasse] = useState("");
  const [confirme, setConfirme] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  const formulaire = useId();
  useEffect(() => { if (!ouvert) { setMotDePasse(""); setConfirme(false); setErreur(""); } }, [ouvert]);
  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    if (!confirme || !motDePasse || enCours) return;
    setEnCours(true); setErreur("");
    try { await onSigner(motDePasse); setMotDePasse(""); onFermer(); }
    catch (e) { setMotDePasse(""); setErreur(e instanceof Error ? e.message : "Approbation refusée. Réessayez après vérification."); }
    finally { setEnCours(false); }
  }
  return <Dialog open={ouvert} onOpenChange={v => { if (!v && !enCours) onFermer(); }}>
    <ModaleFiche titre={titreAction} sousTitre="Confirmez l’approbation de la version que vous venez de consulter."
      pied={<div className="flex flex-wrap justify-end gap-3">
        <Button type="button" variant="outline" className="min-h-12" disabled={enCours} onClick={onFermer}>Annuler</Button>
        <Button type="submit" form={formulaire} className="min-h-12" disabled={enCours || !confirme || !motDePasse}>{enCours ? "Vérification serveur…" : "Confirmer l’approbation"}</Button>
      </div>}>
      <form id={formulaire} onSubmit={soumettre} className="grid gap-4 md:grid-cols-2">
        <ColonneFiche titre="Confirmation de votre identité">
          <Champ label="Mot de passe de votre compte" obligatoire>
            <input aria-label="Mot de passe de votre compte" className="min-h-12 w-full rounded-xl border px-3" type="password" autoComplete="current-password" required maxLength={1024} value={motDePasse} onChange={e => setMotDePasse(e.target.value)} disabled={enCours} />
          </Champ>
          {erreur && <p role="alert" className="text-sm text-red-700">{erreur}</p>}
        </ColonneFiche>
        <ColonneFiche titre="Portée de l’approbation">
          <label className="flex min-h-12 items-start gap-3 text-sm"><input type="checkbox" className="mt-1 size-5" checked={confirme} disabled={enCours} onChange={e => setConfirme(e.target.checked)} />J’ai relu ce document et je confirme mon intention d’approuver cette version.</label>
          <p className="text-xs text-muted-foreground">Le serveur vérifie votre habilitation et le contenu consulté. L’approbation conserve une copie du texte, votre identité et l’heure serveur. Elle ne constitue pas une signature électronique qualifiée ni un accusé de diffusion.</p>
        </ColonneFiche>
      </form>
    </ModaleFiche>
  </Dialog>;
}

interface Approbation {
  id: string; version: number; signataire_nom: string; approuve_le: string;
  empreinte_contenu: string; empreinte_verifiee: boolean;
}
export function HistoriqueApprobations({ officine, document }: { officine: string; document: string }) {
  const requete = useQuery({ queryKey: ["approbations-document", officine, document],
    queryFn: () => api.get<Approbation[]>(`/officines/${officine}/documents/${document}/approbations`) });
  if (requete.isLoading) return <p role="status">Chargement des approbations…</p>;
  if (requete.isError) return <p role="alert">Les validations ne sont pas disponibles pour le moment.</p>;
  return <section className="grid gap-3 rounded-xl border p-4"><h2 className="font-bold">Approbations enregistrées</h2>
    {!requete.data?.length && <p className="text-sm">Aucune approbation vérifiable enregistrée. Un ancien statut approuvé ne constitue pas une preuve de signature.</p>}
    {requete.data?.map(a => <article key={a.id} className="grid gap-1 text-sm">
      <p>Version {a.version} · {a.signataire_nom} · {formatDateHeure(a.approuve_le)}</p>
      <p>{a.empreinte_verifiee ? "Empreinte de la copie conservée vérifiée par le serveur" : "Empreinte incohérente : faire examiner cette approbation"}</p>
      <p className="break-all font-mono text-xs">{a.empreinte_contenu}</p>
    </article>)}
  </section>;
}
