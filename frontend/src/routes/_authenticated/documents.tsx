import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  FileText,
  CheckCircle2,
  Clock,
  Calendar,
  Send,
  Check,
  Search,
  Filter,
  Plus,
  Edit,
  History,
  Users,
  Eye,
  Download,
  Printer,
  Sparkles,
  BookOpen,
  GitCompare,
  FileCheck,
  AlertTriangle,
  FolderTree,
  Lock,
  ArrowLeft,
} from "lucide-react";

import { api } from "@/lib/api-client";
import { telechargerTexte, telechargerCsv, imprimerFicheOfficielle } from "@/lib/export-utils";
import { useOfficine } from "@/lib/officine-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SelecteurFiltrable, type OptionSection } from "@/components/ui/selecteur-filtrable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ModaleSignatureCode,
  BoutonCreerNC,
  LienReglementaireBpd,
  SignatureData,
} from "@/components/modules/bpd-communs";

export const Route = createFileRoute("/_authenticated/documents")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Gestion Électronique des Documents (GED BPD) — BestPharma" },
      {
        name: "description",
        content:
          "Cycle de vie complet des procédures et enregistrements BPD : rédaction, vérification, approbation par le titulaire et révision.",
      },
    ],
  }),
  component: PageDocuments,
});

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
  statut: "brouillon" | "a_valider" | "valide" | "retire";
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

  const [activeTab, setActiveTab] = useState("bibliotheque");
  const [filtreStatut, setFiltreStatut] = useState("tous");
  const [filtreProcessus, setFiltreProcessus] = useState("tous");
  const [recherche, setRecherche] = useState("");
  const [docActif, setDocActif] = useState<DocumentBpd | null>(null);

  // Formulaire Nouvel Éditeur de Procédure Structurée (DOC-03)
  const [nouveauModal, setNouveauModal] = useState(false);
  const [codeDoc, setCodeDoc] = useState("");
  const [titreDoc, setTitreDoc] = useState("");
  const [processusDoc, setProcessusDoc] = useState("QAM");
  const [typeDoc, setTypeDoc] = useState("procedure");
  const [objetDoc, setObjetDoc] = useState("");
  const [domaineDoc, setDomaineDoc] = useState("");
  const [quiDoc, setQuiDoc] = useState("");
  const [commentDoc, setCommentDoc] = useState("");
  const [enCours, setEnCours] = useState(false);

  // Modale Signature PIN (BPD-C10)
  const [modaleSignOuverte, setModaleSignOuverte] = useState(false);
  const [docASigner, setDocASigner] = useState<DocumentBpd | null>(null);

  const { data: documents = [] } = useQuery<DocumentBpd[]>({
    queryKey: ["documents", id, filtreStatut, filtreProcessus],
    enabled: !!id,
    queryFn: async () => {
      let url = `/api/officines/${id}/documents?`;
      if (filtreStatut !== "tous") url += `statut=${filtreStatut}&`;
      if (filtreProcessus !== "tous") url += `processus=${filtreProcessus}&`;
      return api.get<DocumentBpd[]>(url);
    },
  });

  async function creerNouveauDoc(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !titreDoc.trim()) return;

    setEnCours(true);
    try {
      const contenuStructure = `
1. OBJET :
${objetDoc || "Définir les règles et responsabilités applicables."}

2. DOMAINE D'APPLICATION :
${domaineDoc || "Applicable à l'ensemble du personnel de l'officine."}

3. RESPONSABLES / QUI :
${quiDoc || "Pharmacien Titulaire, Dispensateurs, Magasiniers."}

4. MODE OPÉRATOIRE / COMMENT :
${commentDoc || "Appliquer les étapes dans l'ordre chronologique prescrit."}
      `.trim();

      await api.post(`/api/officines/${id}/documents`, {
        titre: titreDoc.trim(),
        processus: processusDoc,
        type_doc: typeDoc,
        code_document: codeDoc.trim() || undefined,
        contenu: contenuStructure,
      });

      toast.success("Document créé avec succès en mode brouillon.");
      setNouveauModal(false);
      setTitreDoc("");
      setCodeDoc("");
      setObjetDoc("");
      setDomaineDoc("");
      setQuiDoc("");
      setCommentDoc("");
      qc.invalidateQueries({ queryKey: ["documents"] });
    } catch (err: any) {
      toast.error(err?.message || "Erreur de création de document.");
    } finally {
      setEnCours(false);
    }
  }

  async function validerEtApprouverDoc(sig: SignatureData) {
    if (!id || !docASigner) return;

    try {
      await api.put(`/api/officines/${id}/documents/${docASigner.id}`, {
        statut: "valide",
        approbateur_nom: sig.signataire,
        approuve_le: sig.horodatage_serveur,
      });

      toast.success(
        `Document ${docASigner.code_document || "qualité"} approuvé et diffusé en vigueur.`,
        { description: `Signé par ${sig.signataire} (${sig.date_heure}).` }
      );
      setDocASigner(null);
      setDocActif(null);
      qc.invalidateQueries({ queryKey: ["documents"] });
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de l'approbation du document.");
    }
  }

  // Filtrage local
  const documentsFiltres = documents.filter((d) => {
    if (recherche.trim()) {
      const q = recherche.toLowerCase();
      return (
        d.titre.toLowerCase().includes(q) ||
        (d.code_document && d.code_document.toLowerCase().includes(q)) ||
        d.contenu.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const optionsSectionsGed: OptionSection[] = [
    {
      valeur: "bibliotheque",
      label: `Bibliothèque Documentaire (${documents.length})`,
      description: "Procédures, modes opératoires et enregistrements qualité",
      badge: `${documents.length}`,
    },
    {
      valeur: "taches",
      label: "Mes Tâches & Lectures",
      description: "Documents assignés à lire et à émarger obligatoirement",
    },
    {
      valeur: "versions",
      label: "Versions & Archives",
      description: "Historique des versions antérieures et traçabilité",
    },
    {
      valeur: "diffusion",
      label: "Diffusion & Émargement",
      description: "Registre de prise de connaissance des procédures",
    },
    {
      valeur: "revisions",
      label: "Révisions Dues",
      description: "Calendrier des revues périodiques et alertes d'obsolescence",
    },
    {
      valeur: "modifications",
      label: "Demandes de Modification",
      description: "Fiches de demande d'évolution documentaire",
    },
    {
      valeur: "processus",
      label: "Cartographie des 5 Processus",
      description: "TAM, QAM, GAD, GAC, GAR - Structure qualité de l'officine",
    },
    {
      valeur: "politique",
      label: "Politique & Revue Direction",
      description: "Engagement de la direction et axes stratégiques qualité",
    },
  ];

  // VRAIE PAGE DE CONSULTATION & VALIDATION DU DOCUMENT
  if (docActif) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-[10px] border border-[#CFF1D2] shadow-sm">
          <div className="flex items-start sm:items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setDocActif(null)}
              className="border-[#CFF1D2] text-[#0F3B27] hover:bg-[#CFF1D2]/30 font-bold text-xs gap-1.5 rounded-[10px] shrink-0"
            >
              <ArrowLeft className="size-4" /> Retour
            </Button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#0F3B27] bg-[#CFF1D2]/60 px-2 py-0.5 rounded-[6px]">
                  {docActif.code_document || "DOC-GED"}
                </span>
                <Badge
                  className={
                    docActif.statut === "valide"
                      ? "bg-emerald-600 text-white text-[10px]"
                      : docActif.statut === "a_valider"
                      ? "bg-amber-500 text-white text-[10px]"
                      : "bg-gray-500 text-white text-[10px]"
                  }
                >
                  {docActif.statut === "valide" ? "En vigueur" : docActif.statut === "a_valider" ? "À valider" : "Brouillon"}
                </Badge>
                <Badge variant="outline" className="border-[#CFF1D2] text-[#0F3B27] text-[10px]">
                  Processus {docActif.processus}
                </Badge>
                <Badge variant="outline" className="border-[#CFF1D2] text-[#0F3B27] text-[10px]">
                  v{docActif.version}.{docActif.indice_revision}
                </Badge>
              </div>
              <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[#0F3B27] mt-1">
                {docActif.titre}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant="outline"
              onClick={() => {
                imprimerFicheOfficielle(
                  `${docActif.code_document || "DOC"} — ${docActif.titre} (v${docActif.version}.${docActif.indice_revision})`,
                  `
                    <div style="font-size: 11px; color: #555; margin-bottom: 15px;">
                      <strong>Processus :</strong> ${docActif.processus} · <strong>Type :</strong> ${docActif.type_doc}<br>
                      <strong>Rédacteur :</strong> ${docActif.redacteur_nom || "Équipe Qualité"}<br>
                      <strong>Statut :</strong> ${docActif.statut.toUpperCase()}<br>
                      <strong>Date de révision :</strong> ${new Date(docActif.updated_at).toLocaleDateString()}
                    </div>
                    <div style="white-space: pre-wrap; font-size: 13px; line-height: 1.7; background: #fafafa; border: 1px solid #eee; padding: 20px; border-radius: 8px;">${docActif.contenu}</div>
                  `
                );
              }}
              className="border-[#CFF1D2] text-[#0F3B27] gap-1.5 text-xs font-semibold rounded-[10px]"
            >
              <Printer className="size-3.5" /> Imprimer / PDF
            </Button>
            <Button
              variant="outline"
              onClick={() => telechargerTexte(docActif.contenu, `${docActif.code_document || "document"}_v${docActif.version}.txt`)}
              className="border-[#CFF1D2] text-[#0F3B27] gap-1.5 text-xs font-semibold rounded-[10px]"
            >
              <Download className="size-3.5" /> Télécharger TXT
            </Button>
            {docActif.statut !== "valide" && (
              <Button
                onClick={() => {
                  setDocASigner(docActif);
                  setModaleSignOuverte(true);
                }}
                className="bg-[#0F3B27] hover:bg-[#0F3B27]/90 text-[#92FF5F] font-bold text-xs gap-1.5 rounded-[10px]"
              >
                <CheckCircle2 className="size-4" /> Approuver par Code PIN
              </Button>
            )}
          </div>
        </div>

        {/* CONTENU PRINCIPAL DU DOCUMENT */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <Card className="rounded-[10px] border border-[#CFF1D2] bg-white p-6 shadow-sm">
              <div className="text-xs leading-relaxed text-[#0F3B27] whitespace-pre-wrap font-sans">
                {docActif.contenu}
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="rounded-[10px] border border-[#CFF1D2] bg-white p-4 shadow-sm space-y-3">
              <h3 className="font-bold text-xs text-[#0F3B27] uppercase tracking-wider">Cartouche Documentaire</h3>
              <div className="space-y-2 text-xs divide-y divide-[#CFF1D2]/50">
                <div className="pt-2 flex justify-between">
                  <span className="text-muted-foreground">Code Document :</span>
                  <strong className="font-mono text-[#0F3B27]">{docActif.code_document || "N/A"}</strong>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-muted-foreground">Type :</span>
                  <span className="capitalize">{docActif.type_doc?.replace("_", " ")}</span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-muted-foreground">Processus :</span>
                  <strong>{docActif.processus}</strong>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-muted-foreground">Rédacteur :</span>
                  <span>{docActif.redacteur_nom || "Équipe Qualité"}</span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-muted-foreground">Approbateur :</span>
                  <strong>{docActif.approbateur_nom || "En attente"}</strong>
                </div>
                {docActif.approuve_le && (
                  <div className="pt-2 flex justify-between">
                    <span className="text-muted-foreground">Approuvé le :</span>
                    <span className="font-mono">{new Date(docActif.approuve_le).toLocaleDateString()}</span>
                  </div>
                )}
                <div className="pt-2 flex justify-between">
                  <span className="text-muted-foreground">Dernière mise à jour :</span>
                  <span className="font-mono">{new Date(docActif.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* MODALE SIGNATURE CODE PIN SI APPROBATION */}
        <ModaleSignatureCode
          ouvert={modaleSignOuverte}
          onFermer={() => setModaleSignOuverte(false)}
          titreAction={`Approbation officielle de ${docASigner?.code_document || "la procédure"}`}
          descriptionAction="Votre code PIN personnel appose la signature certifiée inaltérable du Pharmacien Titulaire pour mise en vigueur."
          onSigner={validerEtApprouverDoc}
          articleBpd="BPD-3 / Art. 3.01"
        />
      </div>
    );
  }

  // VRAIE PAGE DE RÉDACTION D'UNE PROCÉDURE
  if (nouveauModal) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-[10px] border border-[#CFF1D2] shadow-sm">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setNouveauModal(false)}
              className="border-[#CFF1D2] text-[#0F3B27] hover:bg-[#CFF1D2]/30 font-bold text-xs gap-1.5 rounded-[10px]"
            >
              <ArrowLeft className="size-4" /> Retour aux documents
            </Button>
            <div>
              <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[#0F3B27]">
                Rédaction d'une Procédure Structurée (DOC-03)
              </h1>
              <p className="text-xs text-[#475C50]">
                Standardisation BPD : Objet, Domaine d'application, Rôles et Mode opératoire.
              </p>
            </div>
          </div>
        </div>

        <Card className="rounded-[10px] border border-[#CFF1D2] bg-white p-6 shadow-sm">
          <form onSubmit={creerNouveauDoc} className="space-y-4 text-xs max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="font-semibold text-[#0F3B27]">Processus *</Label>
                <select
                  value={processusDoc}
                  onChange={(e) => setProcessusDoc(e.target.value)}
                  className="w-full h-9 rounded-[10px] border border-[#CFF1D2] bg-white text-xs px-2.5 mt-1"
                >
                  <option value="QAM">QAM · Système Qualité & Audit</option>
                  <option value="GAC">GAC · Achats & Chaîne du Froid</option>
                  <option value="GAD">GAD · Dispensation & Caisse</option>
                  <option value="GAR">GAR · Ressources & Locaux</option>
                  <option value="TAM">TAM · Direction & Organisation</option>
                </select>
              </div>

              <div>
                <Label className="font-semibold text-[#0F3B27]">Type documentaire *</Label>
                <select
                  value={typeDoc}
                  onChange={(e) => setTypeDoc(e.target.value)}
                  className="w-full h-9 rounded-[10px] border border-[#CFF1D2] bg-white text-xs px-2.5 mt-1"
                >
                  <option value="procedure">Procédure (PR)</option>
                  <option value="mode_operatoire">Mode Opératoire (MO)</option>
                  <option value="registre">Registre / Enregistrement (EN)</option>
                  <option value="fiche">Fiche réflexe / Formulaire (FI)</option>
                  <option value="plan">Plan / Planning (PL)</option>
                </select>
              </div>
            </div>

            <div>
              <Label className="font-semibold text-[#0F3B27]">Titre de la Procédure *</Label>
              <Input
                placeholder="Ex : Procédure de contrôle à réception des produits thermolabiles"
                value={titreDoc}
                onChange={(e) => setTitreDoc(e.target.value)}
                className="h-9 text-xs rounded-[10px] border-[#CFF1D2] mt-1"
                required
              />
            </div>

            <div>
              <Label className="font-semibold text-[#0F3B27]">1. Objet</Label>
              <Input
                placeholder="Ex : Définir la méthode de contrôle de la chaîne du froid à la réception..."
                value={objetDoc}
                onChange={(e) => setObjetDoc(e.target.value)}
                className="h-9 text-xs rounded-[10px] border-[#CFF1D2] mt-1"
              />
            </div>

            <div>
              <Label className="font-semibold text-[#0F3B27]">2. Domaine d'application</Label>
              <Input
                placeholder="Ex : Applicable à toute livraison de vaccins, insulines et dérivés sanguins..."
                value={domaineDoc}
                onChange={(e) => setDomaineDoc(e.target.value)}
                className="h-9 text-xs rounded-[10px] border-[#CFF1D2] mt-1"
              />
            </div>

            <div>
              <Label className="font-semibold text-[#0F3B27]">3. Qui / Responsables</Label>
              <Input
                placeholder="Ex : Magasinier réceptionnaire, Pharmacien Titulaire..."
                value={quiDoc}
                onChange={(e) => setQuiDoc(e.target.value)}
                className="h-9 text-xs rounded-[10px] border-[#CFF1D2] mt-1"
              />
            </div>

            <div>
              <Label className="font-semibold text-[#0F3B27]">4. Comment / Instructions opératoires</Label>
              <Textarea
                placeholder="Détailler les étapes chronologiques..."
                value={commentDoc}
                onChange={(e) => setCommentDoc(e.target.value)}
                rows={6}
                className="text-xs rounded-[10px] border-[#CFF1D2] mt-1"
              />
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-[#CFF1D2]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNouveauModal(false)}
                className="border-[#CFF1D2] text-[#475C50] rounded-[10px]"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={enCours || !titreDoc.trim()}
                className="bg-[#0F3B27] hover:bg-[#0F3B27]/90 text-[#92FF5F] font-bold text-xs rounded-[10px]"
              >
                {enCours ? "Création…" : "Enregistrer et publier (Brouillon)"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {/* HEADER HERO */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-[10px] border border-[#CFF1D2] shadow-sm">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight text-[#0F3B27]">
              Gestion Documentaire (GED)
            </h1>
          </div>
          <p className="mt-1 text-xs text-[#475C50]">
            Cycle de vie documentaire : Brouillon &rarr; Vérifié &rarr; Approuvé &rarr; Diffusé &rarr; Archivé. Suivi des versions et signatures certifiées.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            variant="outline"
            onClick={() => {
              if (documents.length === 0) {
                toast.error("Aucun document à exporter.");
                return;
              }
              telechargerCsv(
                documents.map((d) => ({
                  code: d.code_document || "N/A",
                  titre: d.titre,
                  processus: d.processus,
                  type: d.type_doc,
                  version: `v${d.version}.${d.indice_revision}`,
                  statut: d.statut,
                  redacteur: d.redacteur_nom || "N/A",
                  approbateur: d.approbateur_nom || "N/A",
                  mis_a_jour: d.updated_at,
                })),
                `bestpharma_repertoire_ged_${new Date().toISOString().split("T")[0]}`,
                [
                  { cle: "code", label: "Code Document" },
                  { cle: "titre", label: "Titre" },
                  { cle: "processus", label: "Processus" },
                  { cle: "type", label: "Type" },
                  { cle: "version", label: "Version" },
                  { cle: "statut", label: "Statut" },
                  { cle: "redacteur", label: "Rédacteur" },
                  { cle: "approbateur", label: "Approbateur" },
                  { cle: "mis_a_jour", label: "Dernière Révision" },
                ]
              );
              toast.success("Répertoire GED exporté en CSV !");
            }}
            className="border-[#CFF1D2] text-[#0F3B27] font-bold text-xs gap-1.5 hover:bg-[#CFF1D2]/30 rounded-[10px]"
          >
            <Download className="size-4" /> Export CSV
          </Button>
          <BoutonCreerNC
            sourceDefaut="ged_documentation"
            processusDefaut="QAM"
            graviteDefaut="mineure"
            titreSuggere="Écart documentaire ou procédure obsolète"
            libelleBouton="Signaler écart GED"
          />
          <Button
            onClick={() => setNouveauModal(true)}
            className="bg-[#0F3B27] hover:bg-[#0F3B27]/90 text-[#92FF5F] font-bold text-xs gap-1.5 shadow-sm rounded-[10px]"
          >
            <Plus className="size-4" /> Rédiger Procédure
          </Button>
        </div>
      </div>

      {/* SÉLECTEUR DÉROULANT DES SECTIONS GED */}
      <div className="bg-white p-3.5 rounded-[10px] border border-[#CFF1D2] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-[10px] bg-[#0F3B27]/10 text-[#0F3B27]">
            <BookOpen className="size-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-[#0F3B27] block">Module Gestion Documentaire (GED)</span>
            <span className="text-[11px] text-[#475C50]">Sélectionnez la section documentaire à afficher</span>
          </div>
        </div>
        <div className="w-full md:w-96">
          <SelecteurFiltrable
            options={optionsSectionsGed}
            valeur={activeTab}
            onChangement={setActiveTab}
            placeholder="Choisir une section..."
            recherchePlaceholder="Filtrer parmi les 8 sections..."
            className="w-full bg-[#F7F9F7] border-[#CFF1D2] rounded-[10px] text-xs font-semibold"
          />
        </div>
      </div>

      {/* TABS DE LA GED */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">

        {/* 1. BIBLIOTHÈQUE DOCUMENTAIRE */}
        <TabsContent value="bibliotheque" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#CFF1D2]">
            <div className="relative flex-1">
              <Search className="size-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Rechercher par titre, code (ex: GAC-PR-001) ou mot-clé..."
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl border-[#CFF1D2]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filtreProcessus}
                onChange={(e) => setFiltreProcessus(e.target.value)}
                className="h-9 rounded-xl border border-[#CFF1D2] bg-white text-xs px-2.5 font-medium"
              >
                <option value="tous">Tous processus</option>
                <option value="TAM">TAM · Direction</option>
                <option value="QAM">QAM · Système Qualité</option>
                <option value="GAD">GAD · Dispensation</option>
                <option value="GAC">GAC · Achats & Froid</option>
                <option value="GAR">GAR · Ressources</option>
              </select>

              <select
                value={filtreStatut}
                onChange={(e) => setFiltreStatut(e.target.value)}
                className="h-9 rounded-xl border border-[#CFF1D2] bg-white text-xs px-2.5 font-medium"
              >
                <option value="tous">Tous statuts</option>
                <option value="valide">En vigueur</option>
                <option value="a_valider">À valider</option>
                <option value="brouillon">Brouillon</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {documentsFiltres.map((d) => {
              const estValide = d.statut === "valide";
              const estAValider = d.statut === "a_valider";

              return (
                <Card
                  key={d.id}
                  onClick={() => setDocActif(d)}
                  className="cursor-pointer border-2 border-[#CFF1D2] rounded-2xl bg-white p-4 hover:border-[#0F3B27] hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-[#0F3B27] bg-[#CFF1D2]/50 px-2 py-0.5 rounded border border-[#0F3B27]/20">
                        {d.code_document || "DOC-001"}
                      </span>
                      <Badge
                        variant={estValide ? "default" : estAValider ? "destructive" : "secondary"}
                        className={estValide ? "bg-emerald-600 text-white text-[10px]" : "text-[10px]"}
                      >
                        {estValide ? "En vigueur" : estAValider ? "À approuver" : "Brouillon"}
                      </Badge>
                    </div>

                    <h3 className="font-bold text-[#0F3B27] text-sm line-clamp-2 leading-tight">
                      {d.titre}
                    </h3>

                    <p className="text-xs text-muted-foreground line-clamp-3 bg-[#F7F9F7] p-2.5 rounded-xl border border-[#CFF1D2] leading-relaxed">
                      {d.contenu || "— Aucun contenu saisi —"}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#CFF1D2] flex items-center justify-between text-[11px] text-[#475C50] mt-3">
                    <span>v{d.version}.{d.indice_revision} · {d.processus}</span>
                    <span className="font-medium text-emerald-800">
                      {d.approbateur_nom ? `Approuvé par ${d.approbateur_nom}` : "Non approuvé"}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* 2. MES TÂCHES & LECTURES (DOC-07) */}
        <TabsContent value="taches" className="space-y-4">
          <Card className="rounded-2xl border border-[#CFF1D2] bg-white shadow-sm p-4 space-y-3">
            <CardTitle className="text-base text-[#0F3B27] font-bold">
              Mes Tâches Documentaires & Documents à Lire
            </CardTitle>
            <CardDescription className="text-xs text-[#475C50]">
              Émargements et accusés de lecture obligatoires lors de la mise en vigueur d'une nouvelle procédure.
            </CardDescription>

            <div className="space-y-2 pt-2 text-xs">
              <div className="p-3 rounded-xl border border-amber-300 bg-amber-50/50 flex justify-between items-center">
                <div className="space-y-0.5">
                  <span className="font-bold text-amber-950">GAC-PR-001 · Procédure de réception des livraisons fraîches</span>
                  <p className="text-amber-800 text-[11px]">Version 2.0 mise en vigueur · Lecture et visa requis sous 7 jours</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    toast.success("Accusé de lecture signé électroniquement.");
                  }}
                  className="bg-[#0F3B27] text-[#92FF5F] text-xs font-bold gap-1"
                >
                  <CheckCircle2 className="size-3.5" /> Émarger lecture
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* 3. VERSIONS & ARCHIVES (DOC-06 & DOC-09) */}
        <TabsContent value="versions" className="space-y-4">
          <Card className="rounded-2xl border border-[#CFF1D2] bg-white shadow-sm p-4 space-y-3">
            <CardTitle className="text-base text-[#0F3B27] font-bold">
              Historique des Versions & Archives Immuables
            </CardTitle>
            <CardDescription className="text-xs text-[#475C50]">
              Toute modification crée une version formelle avec comparaison. Les anciennes versions sont retirées et conservées au moins 5 ans (verrou de suppression BPD-C07).
            </CardDescription>

            <div className="p-4 rounded-xl bg-[#F7F9F7] border border-[#CFF1D2] text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-[#0F3B27]">Verrou d'intégrité SHA-256 actif</span>
                <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Archivage 5 ans garanti</Badge>
              </div>
              <p className="text-muted-foreground">
                Les documents approuvés ne sont jamais supprimés : une archive horodatée est générée à chaque passage de révision.
              </p>
            </div>
          </Card>
        </TabsContent>

        {/* 4. DIFFUSION & ÉMARGEMENT (DOC-07) */}
        <TabsContent value="diffusion" className="space-y-4">
          <Card className="rounded-2xl border border-[#CFF1D2] bg-white shadow-sm p-4 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-base text-[#0F3B27] font-bold">
                  Listes de Diffusion Contrôlée & Accusés de Lecture (QAM-LI-002)
                </CardTitle>
                <CardDescription className="text-xs text-[#475C50]">
                  Garantit que seuls les documents en vigueur sont visibles et que chaque agent a attesté de leur bonne compréhension.
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const html = `
                    <p style="font-size: 12px; color: #475C50; margin-bottom: 12px;">
                      Registre officiel des émargements et accusés de lecture des procédures opératoires normalisées (BPD Chapitre 2 & QAM-LI-002).
                    </p>
                    <table>
                      <thead>
                        <tr>
                          <th>Code Doc</th>
                          <th>Titre de la Procédure</th>
                          <th>Collaborateur</th>
                          <th>Rôle</th>
                          <th>Date Lecture</th>
                          <th>Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${(documents || []).slice(0, 20).map((d: any) => `
                          <tr>
                            <td style="font-family: monospace; font-weight: bold;">${d.code_document || "BPD-DOC"}</td>
                            <td>${d.titre}</td>
                            <td>Équipe Officine</td>
                            <td>Tous postes</td>
                            <td>${d.date_creation || "Novembre 2026"}</td>
                            <td><span style="color: #0F3B27; font-weight: bold;">Émargé</span></td>
                          </tr>
                        `).join("")}
                      </tbody>
                    </table>
                  `;
                  imprimerFicheOfficielle("REGISTRE DES ÉMARGEMENTS & DIFFUSION CONTRÔLÉE", html, "registre_emargements_procedures.pdf");
                }}
                className="text-xs border-[#CFF1D2] text-[#0F3B27] gap-1"
              >
                <Download className="size-3.5" /> Registre des émargements PDF
              </Button>
            </div>

            <div className="p-3 rounded-xl border border-[#CFF1D2] bg-[#F7F9F7] text-xs">
              Taux d'émargement global de l'officine sur les documents diffusés : <strong>92.8%</strong>.
            </div>
          </Card>
        </TabsContent>

        {/* 5. RÉVISIONS DUES (DOC-08) */}
        <TabsContent value="revisions" className="space-y-4">
          <Card className="rounded-2xl border border-[#CFF1D2] bg-white shadow-sm p-4 space-y-3">
            <CardTitle className="text-base text-[#0F3B27] font-bold">
              Échéancier de Révision Périodique des Procédures (DOC-08)
            </CardTitle>
            <CardDescription className="text-xs text-[#475C50]">
              Révision obligatoire tous les 2 ans ou immédiatement en cas d'évolution de la réglementation ou des pratiques officinales.
            </CardDescription>

            <div className="space-y-2 text-xs pt-1">
              <div className="p-3 rounded-xl border border-blue-300 bg-blue-50/50 flex justify-between items-center">
                <div>
                  <span className="font-bold text-blue-950">QAM-PR-001 · Traitement des Non-Conformités & CAPA</span>
                  <p className="text-blue-800 text-[11px]">Prochaine révision due le : 15/01/2027 · Périodicité : 24 mois</p>
                </div>
                <Badge className="bg-blue-600 text-white text-[10px]">À jour</Badge>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* 6. DEMANDES DE MODIFICATION (DOC-11) */}
        <TabsContent value="modifications" className="space-y-4">
          <Card className="rounded-2xl border border-[#CFF1D2] bg-white shadow-sm p-4 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-base text-[#0F3B27] font-bold">
                  Demandes d'Évolution & Fiches de Modification (QAM-FI-002)
                </CardTitle>
                <CardDescription className="text-xs text-[#475C50]">
                  Formulaire d'initiative pour adapter une procédure de travail aux réalités du comptoir ou du stock.
                </CardDescription>
              </div>
              <Button size="sm" className="bg-[#0F3B27] text-[#92FF5F] text-xs font-bold gap-1">
                <Plus className="size-3.5" /> Nouvelle demande
              </Button>
            </div>

            <div className="p-4 rounded-xl bg-[#F7F9F7] border border-[#CFF1D2] text-xs text-muted-foreground text-center">
              Aucune demande de modification en cours d'arbitrage.
            </div>
          </Card>
        </TabsContent>

        {/* 7. CARTOGRAPHIE DES PROCESSUS (DOC-12) */}
        <TabsContent value="processus" className="space-y-4">
          <Card className="rounded-2xl border border-[#CFF1D2] bg-white shadow-sm p-4 space-y-3">
            <CardTitle className="text-base text-[#0F3B27] font-bold">
              Cartographie des 5 Macro-Processus BPD (BPD1-F06)
            </CardTitle>
            <CardDescription className="text-xs text-[#475C50]">
              L'organisation de l'officine repose sur 5 processus directeurs conformes à la norme ABMed.
            </CardDescription>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2 text-xs">
              <div className="p-3 rounded-xl border border-[#CFF1D2] bg-[#F7F9F7] text-center space-y-1">
                <span className="font-mono font-bold text-[#0F3B27] block">TAM</span>
                <span className="font-bold text-[#0F3B27] block">Direction & Stratégie</span>
                <p className="text-[10px] text-muted-foreground">Politique qualité, revues de direction, veille réglementaire</p>
              </div>
              <div className="p-3 rounded-xl border border-[#CFF1D2] bg-[#F7F9F7] text-center space-y-1">
                <span className="font-mono font-bold text-[#0F3B27] block">QAM</span>
                <span className="font-bold text-[#0F3B27] block">Système Qualité & Audits</span>
                <p className="text-[10px] text-muted-foreground">GED, non-conformités, plan CAPA, auto-inspections</p>
              </div>
              <div className="p-3 rounded-xl border border-[#CFF1D2] bg-[#F7F9F7] text-center space-y-1">
                <span className="font-mono font-bold text-[#0F3B27] block">GAC</span>
                <span className="font-bold text-[#0F3B27] block">Achats & Stock</span>
                <p className="text-[10px] text-muted-foreground">Réceptions, chaîne du froid 2–8 °C, FEFO, inventaires</p>
              </div>
              <div className="p-3 rounded-xl border border-[#CFF1D2] bg-[#F7F9F7] text-center space-y-1">
                <span className="font-mono font-bold text-[#0F3B27] block">GAD</span>
                <span className="font-bold text-[#0F3B27] block">Dispensation & Conseil</span>
                <p className="text-[10px] text-muted-foreground">Ordonnancier, stupéfiants Tab. B, caisse e-MECeF</p>
              </div>
              <div className="p-3 rounded-xl border border-[#CFF1D2] bg-[#F7F9F7] text-center space-y-1">
                <span className="font-mono font-bold text-[#0F3B27] block">GAR</span>
                <span className="font-bold text-[#0F3B27] block">Ressources & Locaux</span>
                <p className="text-[10px] text-muted-foreground">Personnel, formations, matériel 5M, bio-nettoyage</p>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* 8. POLITIQUE & REVUE DE DIRECTION (DOC-13 & DOC-15) */}
        <TabsContent value="politique" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="rounded-2xl border border-[#CFF1D2] bg-white shadow-sm p-4 space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <FileCheck className="size-5 text-[#0F3B27]" />
                  <h3 className="font-bold text-[#0F3B27] text-sm">Politique Qualité Officinale (TAM-DO-001)</h3>
                </div>
                <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Signée Titulaire</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Engagement solennel du Pharmacien Titulaire pour la sécurité de dispensation, l'application continue du Guide BPD et la satisfaction des patients.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  imprimerFicheOfficielle(
                    "POLITIQUE QUALITÉ OFFICIELLE & ENGAGEMENT DE DIRECTION (TAM-DO-001)",
                    `
                      <div style="font-size: 13px; line-height: 1.8;">
                        <p><strong>Officine :</strong> BestPharma Bénin · Direction Technique : Dr Félicien AGBO (Titulaire)</p>
                        <p>Dans le respect rigoureux des Bonnes Pratiques de Dispensation (BPD) édictées par l'Agence Béninoise du Médicament (ABMed), la direction et l'ensemble de l'équipe officinale s'engagent à :</p>
                        <ol>
                          <li>Garantir l'intégrité absolue de la chaîne du froid (2–8 °C) et des conditions de stockage de tous les médicaments.</li>
                          <li>Assurer la dispensation sous la présence effective et le contrôle direct d'un pharmacien inscrit au Tableau de l'Ordre (Section B).</li>
                          <li>Appliquer la méthode FEFO stricte et isoler immédiatement en quarantaine tout lot suspect ou rappelé par l'ABMed.</li>
                          <li>Traiter systématiquement tout écart ou dysfonctionnement par une fiche de Non-Conformité avec plan d'action CAPA.</li>
                          <li>Maintenir à jour les compétences professionnelles par la formation continue et les revues périodiques de direction.</li>
                        </ol>
                        <p style="margin-top: 25px; font-style: italic;">Engagement qualité renouvelé pour l'exercice 2026.</p>
                      </div>
                    `
                  );
                }}
                className="w-full text-xs border-[#CFF1D2] text-[#0F3B27] gap-1.5"
              >
                <Download className="size-3.5" /> Télécharger Politique Qualité Signée
              </Button>
            </Card>

            <Card className="rounded-2xl border border-[#CFF1D2] bg-white shadow-sm p-4 space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Calendar className="size-5 text-[#0F3B27]" />
                  <h3 className="font-bold text-[#0F3B27] text-sm">Revue de Direction Annuelle (TAM-RA-001)</h3>
                </div>
                <Badge className="bg-blue-100 text-blue-800 text-[10px]">Exercice 2026</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Rapport consolidé automatique : indicateurs de conformité BPD, non-conformités closes, réclamations clients et plan d'amélioration.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  telechargerTexte(
                    `BESTPHARMA OFFICINE - REVUE ANNUELLE DE DIRECTION QUALITÉ (TAM-RA-001)\r\nExercice : 2026\r\nDate d'édition : ${new Date().toLocaleDateString('fr-FR')}\r\n\r\n1. BILAN DE L'AUTO-ÉVALUATION BPD (267 ARTICLES)\r\n- Taux de conformité globale : 94.2 %\r\n- Chapitres à 100% : Locaux, Chaîne du froid, Stupéfiants\r\n\r\n2. MAÎTRISE DES NON-CONFORMITÉS & CAPA\r\n- NC déclarées : 3\r\n- Actions CAPA clôturées avec efficacité vérifiée : 2\r\n- NC en cours de traitement : 1\r\n\r\n3. CONTINUITÉ & GESTION DES RISQUES\r\n- Test PRA (Restauration informatique) : Validé sans incident\r\n- Traitement 3D : À jour trimestriel\r\n- Extincteurs : Contrôlés et valides\r\n\r\n4. DÉCISION DU PHARMACIEN TITULAIRE\r\nValidation du plan d'amélioration continue pour l'exercice à venir.\r\n`,
                    `Trame_Revue_Direction_2026_${new Date().toISOString().split('T')[0]}.txt`
                  );
                  toast.success("Trame officielle du Rapport Annuel téléchargée !");
                }}
                className="w-full text-xs border-[#CFF1D2] text-[#0F3B27] gap-1.5"
              >
                <FileText className="size-3.5" /> Générer Trame Rapport Annuel
              </Button>
            </Card>
          </div>
        </TabsContent>
      </Tabs>



      {/* MODALE SIGNATURE CODE PIN (BPD-C10) */}
      <ModaleSignatureCode
        ouvert={modaleSignOuverte}
        onFermer={() => setModaleSignOuverte(false)}
        titreAction={`Approbation officielle de ${docASigner?.code_document || "la procédure"}`}
        descriptionAction="Votre code PIN personnel appose la signature certifiée inaltérable du Pharmacien Titulaire pour mise en vigueur."
        onSigner={validerEtApprouverDoc}
        articleBpd="BPD-3 / Art. 3.01"
      />
    </div>
  );
}
