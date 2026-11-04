import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  DocText,
  Copy,
  CopySuccess,
  CheckCircle,
  Clock,
  Calendar,
  Send,
  Check,
} from "reicon-react";
import { api } from "@/lib/api-client";
import { useOfficine } from "@/lib/officine-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SelecteurFiltrable } from "@/components/ui/selecteur-filtrable";
import { EnTete, Vide, dateFr, QUALITE } from "@/components/modules/commun";
import { Champ, ColonneFiche, ModaleFiche } from "@/components/modules/modale";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({
    meta: [
      { title: "Gestion Électronique des Documents (GED BPD) — BEGPHARMA" },
      {
        name: "description",
        content:
          "Cycle de vie des procédures et enregistrements BPD : rédaction, approbation par le titulaire et révision.",
      },
    ],
  }),
  component: PageDocuments,
});

export const statutDoc: Record<
  string,
  { label: string; variant: "outline" | "warning" | "success" }
> = {
  brouillon: { label: "Brouillon", variant: "outline" },
  a_valider: { label: "À valider", variant: "warning" },
  valide: { label: "Validé en vigueur", variant: "success" },
};

interface DocumentBpd {
  id: string;
  officine_id: string;
  titre: string;
  code_document?: string;
  type_doc: string;
  processus: string;
  contenu: string;
  version: number;
  indice_revision: number;
  statut: "brouillon" | "a_valider" | "valide";
  redacteur_nom?: string;
  approbateur_nom?: string;
  approuve_le?: string;
  valide_le?: string;
  updated_at: string;
}

function PageDocuments() {
  const { courante, aRole } = useOfficine();
  const id = courante?.officine_id;
  const qc = useQueryClient();
  const [filtre, setFiltre] = useState("tous");
  const [docActif, setDocActif] = useState<DocumentBpd | null>(null);
  const [copie, setCopie] = useState(false);

  const peutRediger = aRole(...QUALITE);
  const peutValider = aRole("pharmacien_titulaire", "promoteur");

  const { data: documents = [] } = useQuery<DocumentBpd[]>({
    queryKey: ["documents", id, filtre],
    enabled: !!id,
    queryFn: async () => {
      const q = filtre !== "tous" ? `?statut=${filtre}` : "";
      return api.get<DocumentBpd[]>(`/api/officines/${id}/documents${q}`);
    },
  });

  const maj = useMutation({
    mutationFn: async ({
      docId,
      champs,
    }: {
      docId: string;
      champs: Partial<DocumentBpd>;
    }) => {
      return api.put(`/api/officines/${id}/documents/${docId}`, champs);
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document qualité mis à jour avec succès.");
      if (docActif) {
        setDocActif((prev) => (prev ? { ...prev, ...data } : null));
      }
    },
    onError: (e: any) => toast.error(e.message || "Erreur lors de la mise à jour"),
  });

  const handleCopier = (texte: string) => {
    navigator.clipboard.writeText(texte);
    setCopie(true);
    toast.success("Contenu du document copié dans le presse-papier.");
    setTimeout(() => setCopie(false), 2000);
  };

  const compteBrouillon = documents.filter((d) => d.statut === "brouillon").length;
  const compteAValider = documents.filter((d) => d.statut === "a_valider").length;
  const compteValide = documents.filter((d) => d.statut === "valide").length;

  return (
    <div className="grid gap-6">
      <EnTete
        titre="Documents et procédures qualité"
        description="Standardisation du cycle documentaire qualité. Seul le Pharmacien Titulaire ou le Promoteur peut approuver la mise en vigueur officielle."
        action={peutRediger && id ? <NouveauDocument officineId={id} /> : null}
      />

      <div className="max-w-md">
        <SelecteurFiltrable
          options={[
            { valeur: "tous", libelle: `Tous les documents (${documents.length})`, motsCles: ["tout", "ensemble"] },
            { valeur: "brouillon", libelle: `Brouillons (${compteBrouillon})`, motsCles: ["rédaction", "en cours d'écriture"] },
            { valeur: "a_valider", libelle: `À valider (${compteAValider})`, motsCles: ["visa", "approbation", "pharmacien"] },
            { valeur: "valide", libelle: `En vigueur (${compteValide})`, motsCles: ["appliqué", "approuvé"] },
          ]}
          valeur={filtre}
          onChange={setFiltre}
          etiquette="État du document"
          placeholder="Tous les documents"
          placeholderRecherche="Filtrer : brouillon, à valider, en vigueur…"
        />
      </div>

      {documents.length === 0 ? (
        <Vide texte="Aucun document trouvé pour ce filtre de statut." />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((d) => {
            const stat = statutDoc[d.statut] || {
              label: d.statut,
              variant: "outline",
            };

            return (
              <Card
                key={d.id}
                onClick={() => setDocActif(d)}
                className="group cursor-pointer flex flex-col justify-between border border-[#0F3B27]/15 rounded-2xl bg-white p-5 hover:border-[#0F3B27]/40 hover:shadow-lg transition-all duration-200"
              >
                <div>
                  {/* Ligne En-tête : Référence, Version & Statut */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-[#0F3B27] bg-[#CFF1D2] px-2.5 py-0.5 rounded-md border border-[#0F3B27]/20">
                        {d.code_document || "DOC-N/A"}
                      </span>
                      <Badge variant="outline" className="text-[11px] font-mono font-bold">
                        v{d.version}.{d.indice_revision}
                      </Badge>
                    </div>
                    <Badge variant={stat.variant} className="text-[11px]">
                      {stat.label}
                    </Badge>
                  </div>

                  {/* Titre */}
                  <h3 className="text-base font-display font-bold text-[#0F3B27] leading-snug group-hover:text-[#0F3B27]/80 line-clamp-2 mb-2">
                    {d.titre}
                  </h3>

                  {/* Extrait lisible */}
                  <p className="text-xs text-slate-600 line-clamp-3 mb-4 bg-[#F7F9F7] p-3 rounded-xl border border-slate-200/60 leading-relaxed font-sans">
                    {d.contenu || "— Aucun texte renseigné —"}
                  </p>

                  {/* Auteur & Approbateur */}
                  <div className="space-y-1 text-xs text-slate-500 mb-2">
                    <div>
                      Rédigé par : <strong>{d.redacteur_nom || "—"}</strong>
                    </div>
                    {d.approbateur_nom && (
                      <div className="text-emerald-800 font-medium">
                        Validé par : <strong>{d.approbateur_nom}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer de la Card */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="text-[11px]">Processus : {d.processus}</span>

                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs font-semibold text-[#0F3B27] hover:bg-[#CFF1D2]/50 group-hover:bg-[#0F3B27] group-hover:text-[#92FF5F] transition-colors rounded-lg px-3"
                  >
                    Lire &gt;
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Consultation & Cycle Documentaire */}
      <Dialog open={!!docActif} onOpenChange={(open) => !open && setDocActif(null)}>
        {docActif && (
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl p-6">
            <DialogHeader className="pb-4 border-b border-slate-100">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="font-mono text-xs font-bold text-[#0F3B27] bg-[#CFF1D2] px-2.5 py-0.5 rounded-md border border-[#0F3B27]/20">
                  {docActif.code_document || "DOC-N/A"}
                </span>
                <Badge variant="outline" className="text-xs font-mono font-bold">
                  Version {docActif.version}.{docActif.indice_revision}
                </Badge>
                <Badge
                  variant={statutDoc[docActif.statut]?.variant || "outline"}
                  className="text-xs font-bold"
                >
                  {statutDoc[docActif.statut]?.label || docActif.statut}
                </Badge>
                <span className="text-xs text-slate-400 ml-auto">
                  Processus {docActif.processus}
                </span>
              </div>
              <DialogTitle className="text-xl font-display font-bold text-[#0F3B27]">
                {docActif.titre}
              </DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-4 text-sm">
              {/* Traçabilité & Signatures */}
              <div className="grid sm:grid-cols-2 gap-3 bg-[#CFF1D2]/25 p-4 rounded-2xl border border-[#CFF1D2]">
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-[#0F3B27] mb-1">
                    Rédaction
                  </h4>
                  <p className="text-xs text-slate-700">
                    Rédacteur : <strong>{docActif.redacteur_nom || "Non renseigné"}</strong>
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-[#0F3B27] mb-1">
                    Approbation Réglementaire
                  </h4>
                  {docActif.approbateur_nom ? (
                    <p className="text-xs text-emerald-800 font-medium">
                      Approuvé par <strong>{docActif.approbateur_nom}</strong>
                      {docActif.valide_le || docActif.approuve_le ? ` le ${dateFr(docActif.valide_le || docActif.approuve_le || "")}` : ""}
                    </p>
                  ) : (
                    <p className="text-xs text-amber-700 font-medium">
                      En attente du visa du Titulaire
                    </p>
                  )}
                </div>
              </div>

              {/* Contenu intégral du document */}
              <div className="rounded-2xl border border-[#0F3B27]/15 bg-white overflow-hidden shadow-sm">
                <div className="bg-[#0F3B27] text-white px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#92FF5F]">
                    <DocText className="w-4 h-4" /> Texte de la procédure en vigueur
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCopier(docActif.contenu)}
                    className="h-7 text-xs text-white hover:bg-white/10 gap-1.5 px-2"
                  >
                    {copie ? <CopySuccess className="w-3.5 h-3.5 text-[#92FF5F]" /> : <Copy className="w-3.5 h-3.5" />}
                    {copie ? "Copié !" : "Copier"}
                  </Button>
                </div>

                <div className="p-5 font-sans text-sm text-slate-800 whitespace-pre-line leading-relaxed max-h-[45vh] overflow-y-auto bg-slate-50/50">
                  {docActif.contenu || "— Aucun texte renseigné —"}
                </div>
              </div>
            </div>

            {/* Actions du cycle de vie documentaire */}
            <DialogFooter className="flex-col sm:flex-row gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() => setDocActif(null)}
                className="w-full sm:w-auto"
              >
                Fermer
              </Button>

              {peutRediger && docActif.statut === "brouillon" && (
                <Button
                  className="w-full sm:w-auto bg-[#0F3B27] text-[#92FF5F] hover:bg-[#0F3B27]/90 font-bold"
                  disabled={maj.isPending}
                  onClick={() =>
                    maj.mutate({
                      docId: docActif.id,
                      champs: { statut: "a_valider" },
                    })
                  }
                >
                  <Send className="w-4 h-4 mr-1.5" /> Soumettre à validation
                </Button>
              )}

              {peutValider && docActif.statut === "a_valider" && (
                <Button
                  className="w-full sm:w-auto bg-[#0F3B27] text-[#92FF5F] hover:bg-[#0F3B27]/90 font-bold"
                  disabled={maj.isPending}
                  onClick={() =>
                    maj.mutate({
                      docId: docActif.id,
                      champs: { statut: "valide" },
                    })
                  }
                >
                  <CheckCircle className="w-4 h-4 mr-1.5" /> Approuver & Mettre en vigueur (Titulaire)
                </Button>
              )}

              {peutRediger && docActif.statut === "valide" && (
                <Button
                  variant="outline"
                  className="w-full sm:w-auto font-semibold text-[#0F3B27] border-[#0F3B27]/30 hover:bg-[#CFF1D2]/40"
                  disabled={maj.isPending}
                  onClick={() =>
                    maj.mutate({
                      docId: docActif.id,
                      champs: { statut: "brouillon" },
                    })
                  }
                >
                  Créer une nouvelle révision
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

export function NouveauDocument({ officineId }: { officineId: string }) {
  const qc = useQueryClient();
  const [ouvert, setOuvert] = useState(false);
  const [titre, setTitre] = useState("");
  const [processus, setProcessus] = useState("QAM");
  const [typeDoc, setTypeDoc] = useState("PR");
  const [contenu, setContenu] = useState("");

  const creation = useMutation({
    mutationFn: async () => {
      return api.post(`/api/officines/${officineId}/documents`, {
        titre: titre.trim(),
        processus,
        type_doc: typeDoc,
        contenu,
      });
    },
    onSuccess: () => {
      toast.success("Document créé en brouillon avec codification automatique.");
      qc.invalidateQueries({ queryKey: ["documents"] });
      setOuvert(false);
      setTitre("");
      setContenu("");
    },
    onError: (e: any) => toast.error(e.message || "Erreur lors de la création"),
  });

  return (
    <Dialog open={ouvert} onOpenChange={setOuvert}>
      <DialogTrigger asChild>
        <Button className="h-10 bg-[#0F3B27] text-[#92FF5F] hover:bg-[#0F3B27]/90 font-bold rounded-xl shadow-sm">
          + Nouveau Document
        </Button>
      </DialogTrigger>
      <ModaleFiche
        titre="Rédiger un document qualité"
        sousTitre="Toute procédure, mode opératoire ou enregistrement de l'officine, classé par processus et par type."
        badge={<Badge variant="outline" className="border-[#CFF1D2] text-[#475C50]">Document BPD</Badge>}
        pied={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] text-[#475C50]">
              Le brouillon reste modifiable ; il ne devient applicable qu'après validation du pharmacien.
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={() => setOuvert(false)} className="h-12 rounded-xl sm:h-11">
                Annuler
              </Button>
              <Button
                type="submit"
                form="formulaire-document"
                disabled={creation.isPending}
                className="h-12 rounded-xl bg-[#0F3B27] font-bold text-white sm:h-11"
              >
                Enregistrer en brouillon
              </Button>
            </div>
          </div>
        }
      >
        <form id="formulaire-document" className="grid gap-4 md:grid-cols-2" onSubmit={(e) => {
          e.preventDefault();
          if (titre.trim()) creation.mutate();
        }}>
          <ColonneFiche titre="Identification" aide="Un titre explicite se retrouve d'un coup d'œil dans le classeur.">
            <Champ label="Titre du document" obligatoire>
              <Input
                id="doc-titre"
                required
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                className="h-11 rounded-xl border-[#CFF1D2]"
              />
            </Champ>
            <Champ label="Processus concerné" aide="Le processus oriente la diffusion et la relecture annuelle.">
              <Select value={processus} onValueChange={setProcessus}>
                <SelectTrigger className="h-11 rounded-xl border-[#CFF1D2]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TAM">TAM — direction et engagement</SelectItem>
                  <SelectItem value="QAM">QAM — qualité et amélioration</SelectItem>
                  <SelectItem value="GAD">GAD — accueil et dispensation</SelectItem>
                  <SelectItem value="GAC">GAC — stock et chaîne du froid</SelectItem>
                  <SelectItem value="GAR">GAR — ressources humaines et administration</SelectItem>
                </SelectContent>
              </Select>
            </Champ>
            <Champ label="Type documentaire">
              <Select value={typeDoc} onValueChange={setTypeDoc}>
                <SelectTrigger className="h-11 rounded-xl border-[#CFF1D2]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PR">Procédure</SelectItem>
                  <SelectItem value="MO">Mode opératoire</SelectItem>
                  <SelectItem value="EN">Registre ou enregistrement</SelectItem>
                  <SelectItem value="FI">Fiche technique</SelectItem>
                </SelectContent>
              </Select>
            </Champ>
          </ColonneFiche>

          <ColonneFiche titre="Corps du document" aide="Objet, domaine d'application, responsabilités, puis les étapes numérotées.">
            <Champ label="Contenu">
              <Textarea
                id="doc-contenu"
                rows={12}
                placeholder="Objet&#10;Domaine d'application&#10;Responsabilités&#10;Étapes…"
                value={contenu}
                onChange={(e) => setContenu(e.target.value)}
                className="rounded-xl border-[#CFF1D2]"
              />
            </Champ>
          </ColonneFiche>
        </form>
      </ModaleFiche>
    </Dialog>
  );
}
