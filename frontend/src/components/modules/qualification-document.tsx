import { useId, useState } from "react";
import { api } from "@/lib/api-client";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Champ, ColonneFiche, ModaleFiche } from "@/components/modules/modale";
export function QualificationDocument({ officine, fiche, fermer, actualiser }: {
  officine: string; fiche: { id: string; titre: string; code_document?: string; type_doc: string; processus: string; contenu: string };
  fermer: () => void; actualiser: () => Promise<void>;
}) {
  const [titre, setTitre] = useState(fiche.titre);
  const [code, setCode] = useState(fiche.code_document?.startsWith("SRC-") ? "" : fiche.code_document ?? "");
  const [type, setType] = useState(fiche.type_doc === "piece_source" ? "procedure" : fiche.type_doc);
  const [processus, setProcessus] = useState(fiche.processus);
  const [contenu, setContenu] = useState(fiche.contenu);
  const [confirme, setConfirme] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  const form = useId();
  const champ = "min-h-12 w-full rounded-xl border px-3 text-sm";
  return <Dialog open onOpenChange={v => { if (!v && !enCours) fermer(); }}>
    <ModaleFiche titre="Qualifier la fiche documentaire" sousTitre="Vérifiez le cartouche du fichier avant d’attribuer un code et un processus. Cette étape ne vaut pas approbation."
      pied={<div className="flex justify-end gap-3"><Button className="min-h-12" variant="outline" disabled={enCours} onClick={fermer}>Annuler</Button><Button className="min-h-12" type="submit" form={form} disabled={enCours || !confirme || !code.trim() || code.startsWith("SRC-")}>Enregistrer la qualification</Button></div>}>
      <form id={form} className="grid gap-4 md:grid-cols-2" onSubmit={async e => {
        e.preventDefault(); if (!confirme || enCours) return;
        setEnCours(true); setErreur("");
        try {
          await api.put(`/officines/${officine}/documents/${fiche.id}`, { titre: titre.trim(), code_document: code.trim(), type_doc: type, processus, contenu });
          await actualiser(); fermer();
        } catch (e) { setErreur(e instanceof Error ? e.message : "Qualification refusée."); }
        finally { setEnCours(false); }
      }}>
        <ColonneFiche titre="Identification vérifiée">
          <Champ label="Titre" obligatoire><input aria-label="Titre documentaire" className={champ} value={titre} maxLength={255} required onChange={e => setTitre(e.target.value)} /></Champ>
          <Champ label="Code documentaire du cartouche" obligatoire><input aria-label="Code documentaire du cartouche" className={champ} value={code} maxLength={50} required onChange={e => setCode(e.target.value)} /></Champ>
          <Champ label="Type"><select aria-label="Type documentaire" className={champ} value={type} onChange={e => setType(e.target.value)}>{["procedure", "mode_operatoire", "registre", "fiche"].map(t => <option key={t} value={t}>{({ procedure: "Procédure", mode_operatoire: "Mode opératoire", registre: "Registre", fiche: "Fiche ou formulaire" })[t]}</option>)}</select></Champ>
          <Champ label="Processus"><select aria-label="Processus documentaire" className={champ} value={processus} onChange={e => setProcessus(e.target.value)}>{[{v:"TAM",l:"Pilotage"},{v:"QAM",l:"Qualité et documentation"},{v:"GAC",l:"Approvisionnement et stock"},{v:"GAD",l:"Dispensation"},{v:"GAR",l:"Ressources et équipements"}].map(p => <option key={p.v} value={p.v}>{p.l}</option>)}</select></Champ>
        </ColonneFiche>
        <ColonneFiche titre="Contenu et contrôle">
          <Champ label="Texte ou description de la procédure"><textarea aria-label="Description documentaire" className="min-h-40 w-full rounded-xl border p-3 text-sm" value={contenu} onChange={e => setContenu(e.target.value)} /></Champ>
          <label className="flex min-h-12 items-start gap-3 text-sm"><input type="checkbox" className="mt-1 size-5" checked={confirme} onChange={e => setConfirme(e.target.checked)} />J’ai contrôlé le fichier et son cartouche. Les codes cités dans le corps d’une procédure ne sont pas nécessairement son propre code.</label>
          {erreur && <p role="alert" className="text-sm text-red-700">{erreur}</p>}
        </ColonneFiche>
      </form>
    </ModaleFiche>
  </Dialog>;
}
