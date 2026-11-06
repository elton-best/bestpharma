import { useId, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { telechargerCsv } from "@/lib/export-utils";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SelecteurFiltrable } from "@/components/ui/selecteur-filtrable";
import { Champ, ColonneFiche, ModaleFiche } from "@/components/modules/modale";
interface ChampSuivi { cle: string; libelle: string; type: string; obligatoire?: boolean; obligatoire_realise?: boolean }
interface Definition {
  titre: string; aide: string; champs: ChampSuivi[]; champ_titre: string; champ_date: string; peut_ecrire: boolean; mode_demo?: boolean;
  source: { fichier: string; reference: string; feuille: string; sha256: string };
  equipements: { id: string; designation: string; code_interne: string }[];
}
interface Suivi { id: string; revision: number; statut: string; donnees: Record<string, string>; motif_modification?: string }
const ETATS = [{ valeur: "planifie", libelle: "Planifié" }, { valeur: "realise", libelle: "Réalisé" }, { valeur: "annule", libelle: "Annulé" }];
const libelleStatut = (s: string) => ETATS.find(e => e.valeur === s)?.libelle ?? "État inconnu";
export function RegistreDocumentaire({ officine, type }: { officine: string; type: "formations" | "maintenance" }) {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [annee, setAnnee] = useState(String(new Date().getFullYear()));
  const [statut, setStatut] = useState("tous");
  const [recherche, setRecherche] = useState("");
  const [edition, setEdition] = useState<Suivi | null | undefined>(undefined);
  const base = `/officines/${officine}/suivis-documentaires/${type}`;
  const definition = useQuery({ queryKey: ["definition-suivi", officine, type], queryFn: () => api.get<Definition>(`${base}/definition`) });
  const registre = useQuery({ queryKey: ["registre-suivi", officine, type, page, annee, statut, recherche], queryFn: () => {
    const p = new URLSearchParams({ page: String(page) });
    if (annee) p.set("annee", annee);
    if (statut !== "tous") p.set("statut", statut);
    if (recherche) p.set("q", recherche);
    return api.get<{ data: Suivi[]; current_page: number; last_page: number; total: number }>(`${base}?${p}`);
  }});
  const d = definition.data;
  if (definition.isError) return <p role="alert">Le formulaire numérique ne peut pas être chargé. Aucun suivi ne peut être attesté.</p>;
  if (!d) return <p role="status">Chargement du formulaire numérique…</p>;
  const lignes = registre.data?.data ?? [];
  const valeur = (r: Suivi, c: ChampSuivi) => {
    const v = c.type === "equipement" ? r.donnees.equipement_nom : r.donnees[c.cle];
    return v ? c.type === "date" ? formatDate(v) : v : "Non renseigné";
  };
  return <section className="grid gap-4">
    <header className="flex flex-wrap justify-between gap-3"><div><h2 className="text-lg font-bold">{d.titre}</h2><p className="text-sm text-muted-foreground">{d.aide}</p></div>
      {d.peut_ecrire && <Button className="min-h-12" onClick={() => setEdition(null)}>Ajouter une fiche</Button>}
    </header>
    {d.mode_demo && <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Aperçu de démonstration : ces saisies sont temporaires et ne constituent pas les registres d’une officine réelle.</p>}
    <details className="rounded-xl border p-3 text-xs"><summary>Origine du formulaire</summary><p>{d.source.fichier} · {d.source.feuille} · {d.source.reference}</p><p className="break-all font-mono">{d.source.sha256}</p><p>Adaptation numérique du modèle, pas import automatique des lignes historiques du classeur.</p></details>
    <div className="grid gap-3 md:grid-cols-3">
      <label className="grid gap-1 text-sm">Année prévue<input aria-label="Année prévue" type="number" min="2000" max="2100" className="min-h-12 rounded-xl border px-3" value={annee} onChange={e => { setAnnee(e.target.value); setPage(1); }} /></label>
      <SelecteurFiltrable etiquette="État du suivi" valeur={statut} onChange={v => { setStatut(v); setPage(1); }} options={[{ valeur: "tous", libelle: "Tous les états" }, ...ETATS]} />
      <label className="grid gap-1 text-sm">Recherche<input aria-label="Rechercher un suivi" maxLength={150} className="min-h-12 rounded-xl border px-3" value={recherche} onChange={e => { setRecherche(e.target.value); setPage(1); }} /></label>
    </div>
    <Button variant="outline" className="min-h-12 justify-self-start" disabled={!lignes.length || registre.isError || registre.isFetching} onClick={() => {
      const donnees = lignes.map(r => Object.fromEntries([["statut", libelleStatut(r.statut)], ...d.champs.map(c => [c.cle, valeur(r, c)])]));
      telechargerCsv(donnees, `registre-${type}-page-consultee`, [{ cle: "statut", label: "État" }, ...d.champs.map(c => ({ cle: c.cle, label: c.libelle }))]);
    }}>Exporter la page consultée</Button>
    {registre.isLoading && <p role="status">Chargement du registre…</p>}
    {registre.isError && <p role="alert">Le registre ne peut pas être consulté. Ne considérez pas cette absence de données comme un suivi à jour.</p>}
    {!registre.isLoading && !registre.isError && !lignes.length && <p>Aucun suivi enregistré pour ces critères.</p>}
    {!registre.isError && lignes.map(r => <article key={r.id} className="grid gap-3 rounded-xl border bg-white p-4">
      <div className="flex flex-wrap justify-between gap-3"><strong>{r.donnees[d.champ_titre]}</strong><span>{libelleStatut(r.statut)}</span></div>
      <dl className="grid gap-2 text-sm md:grid-cols-2">{d.champs.filter(c => r.donnees[c.cle]).map(c => <div key={c.cle}><dt className="text-xs text-muted-foreground">{c.libelle}</dt><dd className="whitespace-pre-wrap">{valeur(r, c)}</dd></div>)}</dl>
      {r.donnees.motif_annulation && <p className="text-sm">Motif d’annulation : {r.donnees.motif_annulation}</p>}
      {r.motif_modification && <p className="text-xs">Dernière correction : {r.motif_modification}</p>}
      {d.peut_ecrire && <Button className="min-h-12 justify-self-start" variant="outline" onClick={() => setEdition(r)}>Mettre à jour ou corriger</Button>}
    </article>)}
    <nav aria-label="Pagination du registre" className="flex items-center gap-3"><Button className="min-h-12" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Précédente</Button><span>Page {registre.data?.current_page ?? page} sur {registre.data?.last_page ?? 1}</span><Button className="min-h-12" variant="outline" disabled={page >= (registre.data?.last_page ?? 1)} onClick={() => setPage(p => p + 1)}>Suivante</Button></nav>
    {edition !== undefined && <EditeurSuivi key={edition?.id ?? "nouveau"} definition={d} ligne={edition} base={base} fermer={() => setEdition(undefined)} actualiser={async () => { await qc.invalidateQueries({ queryKey: ["registre-suivi", officine, type] }); }} />}
  </section>;
}
function EditeurSuivi({ definition: d, ligne, base, fermer, actualiser }: { definition: Definition; ligne: Suivi | null; base: string; fermer: () => void; actualiser: () => Promise<void> }) {
  const [donnees, setDonnees] = useState<Record<string, string>>(ligne?.donnees ?? {});
  const [statut, setStatut] = useState(ligne?.statut ?? "planifie");
  const [motif, setMotif] = useState("");
  const [erreur, setErreur] = useState("");
  const [enCours, setEnCours] = useState(false);
  const form = useId();
  const classe = "min-h-12 w-full rounded-xl border px-3 text-sm";
  const construire = (champs: ChampSuivi[]) => champs.map(c => {
    const requis = c.obligatoire || (c.obligatoire_realise && statut === "realise");
    const change = (v: string) => setDonnees(ds => ({ ...ds, [c.cle]: v }));
    return <Champ key={c.cle} label={c.libelle} obligatoire={requis}>
      {c.type === "textarea" ? <textarea aria-label={c.libelle} className="min-h-28 w-full rounded-xl border p-3 text-sm" maxLength={5000} required={requis} value={donnees[c.cle] ?? ""} onChange={e => change(e.target.value)} /> : c.type === "equipement" ? <select aria-label={c.libelle} className={classe} required={requis} value={donnees[c.cle] ?? ""} onChange={e => change(e.target.value)}><option value="">Choisir le matériel</option>{d.equipements.map(e => <option key={e.id} value={e.id}>{e.designation} · {e.code_interne}</option>)}</select> : <input aria-label={c.libelle} className={classe} type={c.type === "date" ? "date" : "text"} required={requis} maxLength={5000} value={donnees[c.cle] ?? ""} onChange={e => change(e.target.value)} />}
    </Champ>;
  });
  const milieu = Math.ceil(d.champs.length / 2);
  return <Dialog open onOpenChange={v => { if (!v && !enCours) fermer(); }}>
    <ModaleFiche titre={ligne ? "Mettre à jour le suivi" : "Enregistrer un suivi"} sousTitre="La saisie est conservée dans le registre de l’officine et ses modifications sont tracées."
      pied={<div className="flex justify-end gap-3"><Button className="min-h-12" variant="outline" disabled={enCours} onClick={fermer}>Annuler</Button><Button className="min-h-12" type="submit" form={form} disabled={enCours}>{enCours ? "Enregistrement…" : "Enregistrer"}</Button></div>}>
      <form id={form} className="grid gap-4 md:grid-cols-2" onSubmit={async e => {
        e.preventDefault(); if (enCours) return; setEnCours(true); setErreur("");
        try {
          const champs = [...d.champs.map(c => c.cle), "motif_annulation"];
          const propres = Object.fromEntries(champs.filter(c => donnees[c]?.trim()).map(c => [c, donnees[c].trim()]));
          const payload = { statut, donnees: propres, ...(ligne ? { revision: ligne.revision, motif_modification: motif } : {}) };
          if (ligne) await api.put(`${base}/${ligne.id}`, payload); else await api.post(base, payload);
          await actualiser(); fermer();
        } catch (e) { setErreur(e instanceof Error ? e.message : "Enregistrement refusé."); }
        finally { setEnCours(false); }
      }}>
        <ColonneFiche titre="Préparation et identification">{construire(d.champs.slice(0, milieu))}</ColonneFiche>
        <ColonneFiche titre="Réalisation et suivi">
          {construire(d.champs.slice(milieu))}
          <Champ label="État"><select aria-label="État du suivi" className={classe} value={statut} onChange={e => setStatut(e.target.value)}>{ETATS.filter(e => !ligne || ligne.statut === "planifie" || e.valeur === ligne.statut).map(e => <option key={e.valeur} value={e.valeur}>{e.libelle}</option>)}</select></Champ>
          {statut === "annule" && <Champ label="Motif d’annulation" obligatoire><textarea aria-label="Motif d’annulation" className={classe} required value={donnees.motif_annulation ?? ""} onChange={e => setDonnees(v => ({ ...v, motif_annulation: e.target.value }))} /></Champ>}
          {ligne && <Champ label="Motif de la mise à jour ou correction" obligatoire><textarea aria-label="Motif de la mise à jour ou correction" className={classe} required minLength={5} maxLength={5000} value={motif} onChange={e => setMotif(e.target.value)} /></Champ>}
          {erreur && <p role="alert" className="text-sm text-red-700">{erreur}</p>}
        </ColonneFiche>
      </form>
    </ModaleFiche>
  </Dialog>;
}
