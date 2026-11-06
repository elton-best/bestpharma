import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useOfficine } from "@/lib/officine-context";
import { Button } from "@/components/ui/button";
import { SelecteurFiltrable } from "@/components/ui/selecteur-filtrable";
import { Dialog } from "@/components/ui/dialog";
import { ModaleFiche, ColonneFiche } from "@/components/modules/modale";
interface Cellule { cle: string; texte: string; largeur: number; hauteur: number; images?: string[]; imbriques?: Bloc[] }
interface Bloc { cle: string; type: "paragraphe" | "tableau"; texte?: string; gras?: boolean; alignement?: string; images?: string[]; lignes?: Cellule[][]; largeurs?: number[] }
export interface Canevas { id: string; titre: string; rubrique: string; fichier: string; sha256: string; parties: { origine: string; blocs: Bloc[] }[]; images: Record<string, string> }
interface Rempli { schema: string; canevas: Canevas; valeurs: Record<string, string> }
export function lireCanevas(contenu: string): Rempli | null {
  try {
    const c = JSON.parse(contenu);
    return c?.schema === "begpharma.canevas-rempli.v1" && Array.isArray(c.canevas?.parties) && c.valeurs && typeof c.valeurs === "object" ? c : null;
  } catch { return null; }
}
export function ContenuCanevas({ canevas, valeurs, changer }: { canevas: Canevas; valeurs: Record<string, string>; changer?: (cle: string, valeur: string) => void }) {
  const texte = (cle: string, original = "") => valeurs[cle] ?? original;
  const zone = (cle: string, original: string, label: string) => changer ? <textarea aria-label={label} className="min-h-12 w-full min-w-0 resize-y rounded border border-emerald-200 bg-white p-2 text-sm leading-relaxed focus:border-emerald-700" rows={Math.min(15, Math.max(2, original.split("\n").length))} value={texte(cle, original)} onChange={e => changer(cle, e.target.value)} /> : <span className="whitespace-pre-wrap">{texte(cle, original) || "\u00a0"}</span>;
  const blocs = (liste: Bloc[]) => liste.map((b, i) => b.type === "tableau" ? <div key={b.cle} className="max-w-full overflow-x-auto"><table className="w-full border-collapse border border-slate-300 text-sm"><colgroup>{b.largeurs?.map((largeur, i) => <col key={i} style={{ width: `${largeur / b.largeurs!.reduce((a, v) => a + v, 0) * 100}%` }} />)}</colgroup><tbody>{b.lignes?.map((ligne, l) => <tr key={l}>{ligne.map((cell, c) => <td key={cell.cle} colSpan={cell.largeur} rowSpan={cell.hauteur} className="min-w-32 border border-slate-300 p-2 align-top">
    {cell.images?.map(image => canevas.images[image] && <img key={image} src={canevas.images[image]} alt="Illustration du modèle source" className="max-h-32 max-w-full object-contain" />)}
    {zone(cell.cle, cell.texte, `Cellule du tableau, ligne ${l + 1}, colonne ${c + 1}`)}{cell.imbriques && blocs(cell.imbriques)}
  </td>)}</tr>)}</tbody></table></div> : <div key={b.cle} className={b.gras ? "font-bold" : ""} style={{ textAlign: ["center", "right", "justify"].includes(b.alignement ?? "") ? b.alignement as "center" | "right" | "justify" : "left" }}>
    {b.images?.map(image => canevas.images[image] && <img key={image} src={canevas.images[image]} alt="Illustration du modèle source" className="max-h-32 max-w-full object-contain" />)}
    {zone(b.cle, b.texte ?? "", `Paragraphe du modèle ${i + 1}`)}
  </div>);
  return <div className="grid min-w-0 gap-5">{canevas.parties.map(partie => <section key={partie.origine} className="grid min-w-0 gap-3">{blocs(partie.blocs)}</section>)}</div>;
}
export function CanevasCatalogue({ officine, filtre = "tous", creer = true }: { officine: string; filtre?: "tous" | "procedures" | "qualite"; creer?: boolean }) {
  const qc = useQueryClient();
  const [choix, setChoix] = useState("");
  const [processus, setProcessus] = useState("");
  const [typeDoc, setTypeDoc] = useState("procedure");
  const [ouvert, setOuvert] = useState(false);
  const [valeurs, setValeurs] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [enCours, setEnCours] = useState(false);
  const liste = useQuery({ queryKey: ["canevas-catalogue", officine], queryFn: async () => { const donnees = await api.get<Canevas[]>(`/officines/${officine}/canevas`); if (!Array.isArray(donnees)) throw new Error("Catalogue indisponible."); return donnees; } });
  const modele = useQuery({ queryKey: ["canevas", officine, choix], enabled: !!choix, queryFn: () => api.get<Canevas>(`/officines/${officine}/canevas/${choix}`) });
  const candidats = (liste.data ?? []).filter(c => filtre === "tous" || (filtre === "procedures" ? /^(PRO|CANEVAS)/i.test(c.titre) : /non.conform|amélioration|auto.inspection|réclamation/i.test(c.titre)));
  async function enregistrer() {
    setMessage(""); setEnCours(true);
    try {
      const resultat = await api.post<{ mode_demo?: boolean }>(`/officines/${officine}/canevas/${choix}/documents`, { valeurs, processus, type_doc: typeDoc });
      await qc.invalidateQueries({ queryKey: ["documents"] });
      await qc.invalidateQueries({ queryKey: ["documents-adoptions"] });
      setOuvert(false); setValeurs({}); setMessage(resultat.mode_demo ? "Brouillon de démonstration enregistré temporairement. Il sera perdu au redémarrage de l’aperçu." : "Brouillon enregistré dans les documents de l’officine. Vous pouvez le relire puis demander son approbation.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Enregistrement impossible."); }
    finally { setEnCours(false); }
  }
  return <section className="grid gap-3 rounded-xl border border-emerald-100 bg-white p-4">
    <h2 className="text-lg font-bold">Canevas à compléter</h2>
    <p className="text-sm text-muted-foreground">Choisissez le modèle du dossier fourni et complétez ses zones directement. Les noms et informations du modèle doivent être adaptés à votre officine.</p>
    {liste.isError ? <p role="alert">Les canevas ne peuvent pas être chargés. Réessayez lorsque la connexion est rétablie.</p> : <SelecteurFiltrable etiquette="Modèle source" valeur={choix} options={candidats.map(c => ({ valeur: c.id, libelle: c.titre, description: c.rubrique }))} onChange={c => { setChoix(c); setValeurs({}); setMessage(""); }} />}
    <Button variant="outline" className="min-h-12 justify-self-start" disabled={!modele.data || modele.isError} onClick={() => setOuvert(true)}>{creer ? "Ouvrir et compléter le canevas" : "Consulter le canevas"}</Button>
    {modele.isError && <p role="alert">Ce canevas ne peut pas être ouvert.</p>}
    {message && <p role="status">{message}</p>}
    <Dialog open={ouvert} onOpenChange={o => { if (!enCours) setOuvert(o); }}><ModaleFiche titre={modele.data?.titre ?? "Canevas"} sousTitre="Complétez le modèle avant de l’enregistrer comme brouillon." pied={<div className="flex flex-wrap justify-end gap-3"><Button variant="outline" className="min-h-12" disabled={enCours} onClick={() => setOuvert(false)}>Fermer</Button>{creer && <Button className="min-h-12" disabled={enCours || !processus} onClick={enregistrer}>{enCours ? "Enregistrement…" : "Enregistrer le brouillon"}</Button>}</div>}>
      {modele.data && <div className="grid min-w-0 gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]"><ColonneFiche titre="Document source">{creer && <><SelecteurFiltrable etiquette="Nature du document" valeur={typeDoc} onChange={setTypeDoc} options={[{ valeur: "procedure", libelle: "Procédure" }, { valeur: "enregistrement", libelle: "Formulaire ou enregistrement" }, { valeur: "fiche_poste", libelle: "Fiche de poste" }]} /><SelecteurFiltrable etiquette="Processus à confirmer" valeur={processus} onChange={setProcessus} options={[{ valeur: "TAM", libelle: "Management" }, { valeur: "QAM", libelle: "Qualité et amélioration" }, { valeur: "GAD", libelle: "Dispensation" }, { valeur: "GAC", libelle: "Approvisionnement et stocks" }, { valeur: "GAR", libelle: "Ressources et locaux" }]} /></>}<p className="break-words text-sm">{modele.data.fichier}</p><p className="text-xs text-muted-foreground">L’ordre des textes et les tableaux du fichier Word sont conservés. L’affichage web adapte la pagination et la typographie.</p>{message && <p role="alert">{message}</p>}</ColonneFiche><ColonneFiche titre="Zones du canevas"><ContenuCanevas canevas={modele.data} valeurs={valeurs} changer={creer ? (cle, valeur) => setValeurs(v => ({ ...v, [cle]: valeur })) : undefined} /></ColonneFiche></div>}
    </ModaleFiche></Dialog>
  </section>;
}
export function PageCatalogueCanevas() {
  const { courante, aRole } = useOfficine();
  return <div className="grid gap-5"><h1 className="text-2xl font-bold">Bibliothèque des modèles qualité</h1>{courante && <CanevasCatalogue key={courante.officine_id} officine={courante.officine_id} creer={aRole("promoteur", "pharmacien_titulaire", "pharmacien_adjoint", "rmq")} />}</div>;
}
export const echapperCanevas = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
export function htmlCanevas(contenu: string): string {
  const r = lireCanevas(contenu);
  if (!r) return `<p style="white-space:pre-wrap">${echapperCanevas(contenu)}</p>`;
  const blocs = (liste: Bloc[]): string => liste.map(b => b.type === "tableau" ? `<table style="width:100%;border-collapse:collapse"><tbody>${b.lignes?.map(l => `<tr>${l.map(c => `<td colspan="${c.largeur}" rowspan="${c.hauteur}" style="border:1px solid #aaa;padding:8px;white-space:pre-wrap">${echapperCanevas(r.valeurs[c.cle] ?? c.texte)}${c.imbriques ? blocs(c.imbriques) : ""}</td>`).join("")}</tr>`).join("")}</tbody></table>` : `<p style="white-space:pre-wrap">${echapperCanevas(r.valeurs[b.cle] ?? b.texte ?? "")}</p>`).join("");
  return r.canevas.parties.map(p => blocs(p.blocs)).join("\n");
}
export function texteCanevas(contenu: string): string {
  const r = lireCanevas(contenu);
  if (!r) return contenu;
  const blocs = (liste: Bloc[]): string => liste.map(b => b.type === "tableau" ? b.lignes?.map(l => l.map(c => (r.valeurs[c.cle] ?? c.texte) + (c.imbriques ? blocs(c.imbriques) : "")).join(" | ")).join("\n") : r.valeurs[b.cle] ?? b.texte ?? "").join("\n");
  return r.canevas.parties.map(p => blocs(p.blocs)).join("\n");
}
export function EditionCanevas({ contenu, officine, document, empreinte, actualiser }: { contenu: string; officine: string; document: string; empreinte: string; actualiser: () => Promise<void> }) {
  const r = lireCanevas(contenu);
  const [ouvert, setOuvert] = useState(false);
  const [valeurs, setValeurs] = useState(r?.valeurs ?? {});
  const [erreur, setErreur] = useState("");
  const [enCours, setEnCours] = useState(false);
  if (!r) return null;
  return <><Button variant="outline" className="min-h-12" onClick={() => { setValeurs(r.valeurs); setErreur(""); setOuvert(true); }}>Compléter les zones du document</Button>
    <Dialog open={ouvert} onOpenChange={o => { if (!enCours) setOuvert(o); }}><ModaleFiche titre="Compléter le document" sousTitre="Les modifications restent dans le brouillon de l’officine." pied={<div className="flex justify-end gap-3"><Button variant="outline" className="min-h-12" disabled={enCours} onClick={() => setOuvert(false)}>Annuler</Button><Button className="min-h-12" disabled={enCours} onClick={async () => {
      setEnCours(true); setErreur("");
      try { await api.put(`/officines/${officine}/documents/${document}`, { contenu: JSON.stringify({ ...r, valeurs }), empreinte_edition: empreinte }); await actualiser(); setOuvert(false); }
      catch (e) { setErreur(e instanceof Error ? e.message : "Enregistrement impossible."); }
      finally { setEnCours(false); }
    }}>Enregistrer les modifications</Button></div>}><div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]"><ColonneFiche titre="Version de travail"><p className="text-sm">Relisez les zones complétées avant de demander l’approbation.</p>{erreur && <p role="alert">{erreur}</p>}</ColonneFiche><ColonneFiche titre="Canevas"><ContenuCanevas canevas={r.canevas} valeurs={valeurs} changer={(cle, valeur) => setValeurs(v => ({ ...v, [cle]: valeur }))} /></ColonneFiche></div></ModaleFiche></Dialog></>;
}
