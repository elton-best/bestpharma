import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { formatDateHeure, nombre } from "@/lib/format";
import { Button } from "@/components/ui/button";

interface Fichier {
  id: string; numero: number; nom_original: string; octets: number; sha256: string;
  version_document: number; indice_revision: number; depose_le: string;
}
export function FichiersDocumentaires({ officine, document, version, indice, statut, actualiser }: {
  officine: string; document: string; version: number; indice: number; statut: string;
  actualiser: () => Promise<void>;
}) {
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState("");
  const base = `/officines/${officine}/documents/${document}/fichiers`;
  const fichiers = useQuery({ queryKey: ["fichiers-document", officine, document], queryFn: () => api.get<Fichier[]>(base) });
  async function deposer(file?: File) {
    if (!file || enCours) return;
    setErreur(""); setMessage("");
    if (file.size > 30 * 1024 * 1024) { setErreur("Le fichier dépasse la taille maximale autorisée."); return; }
    setEnCours(true);
    try {
      await api.uploadFile(base, file, { version_document: String(version), indice_revision: String(indice) });
      await qc.invalidateQueries({ queryKey: ["fichiers-document", officine, document] });
      await qc.invalidateQueries({ queryKey: ["documents"] });
      await actualiser();
      setMessage("Fichier conservé. Relisez la version et ses pièces avant de demander l’approbation.");
    } catch (e) { setErreur(e instanceof Error ? e.message : "Dépôt impossible."); }
    finally { setEnCours(false); if (input.current) input.current.value = ""; }
  }
  async function telecharger(f: Fichier) {
    setErreur("");
    try {
      const blob = await api.telechargerFichier(`${base}/${f.id}/telecharger`);
      const url = URL.createObjectURL(blob);
      const lien = window.document.createElement("a"); lien.href = url; lien.download = f.nom_original;
      window.document.body.appendChild(lien); lien.click(); lien.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setErreur(e instanceof Error ? e.message : "Téléchargement impossible."); }
  }
  return <section className="grid gap-3 rounded-xl border p-4">
    <h2 className="font-bold">Pièces jointes</h2>
    <p className="text-xs text-muted-foreground">Joignez les justificatifs utiles à cette version.</p>
    {["brouillon", "a_valider"].includes(statut) ? <label className="grid gap-2 text-sm">Ajouter une pièce à la version en cours
      <input aria-label="Ajouter un fichier documentaire" ref={input} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.odt,.jpg,.jpeg,.png" disabled={enCours} className="min-h-12 rounded-xl border p-2" onChange={e => deposer(e.target.files?.[0])} />
    </label> : <p className="text-sm">Cette version est en lecture seule.</p>}
    {enCours && <p role="status">Dépôt et actualisation de la version…</p>}
    {message && <p role="status">{message}</p>}
    {erreur && <p role="alert">{erreur}</p>}
    {fichiers.isLoading && <p role="status">Chargement des fichiers…</p>}
    {fichiers.isError && <p role="alert">Les pièces jointes ne sont pas disponibles pour le moment.</p>}
    {fichiers.data?.length === 0 && <p className="text-sm">Aucun fichier conservé pour cette fiche.</p>}
    {fichiers.data?.map(f => <article key={f.id} className="grid gap-1 rounded-xl border p-3 text-sm">
      <strong className="break-words">{f.nom_original}</strong>
      <p>Version {f.version_document}.{f.indice_revision} · Dépôt {f.numero} · {nombre(f.octets)} octets</p>
      <p>{formatDateHeure(f.depose_le)}</p>
      <p className="break-all font-mono text-xs">{f.sha256}</p>
      <Button variant="outline" className="min-h-12 justify-self-start" onClick={() => telecharger(f)}>Vérifier et télécharger</Button>
    </article>)}
  </section>;
}
