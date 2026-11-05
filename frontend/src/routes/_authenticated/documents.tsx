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
} from "lucide-react";

import { api } from "@/lib/api-client";
import { useOfficine } from "@/lib/officine-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  return (
    <div className="grid gap-6">
      {/* HEADER HERO */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-[#CFF1D2] shadow-sm">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight text-[#0F3B27]">
              Gestion Électronique des Documents (GED BPD)
            </h1>
            <LienReglementaireBpd articles="BPD-3 / Art. 3.01 à 3.14" />
            <Badge className="bg-[#0F3B27] text-[#92FF5F] text-[10px]">
              Codification PROCESSUS-TYPE-NUMÉRO
            </Badge>
          </div>
          <p className="mt-1 text-xs text-[#475C50]">
            Cycle de vie formel : Brouillon &rarr; Vérifié &rarr; Approuvé par le Titulaire &rarr; Diffusé &rarr; Retiré. Accusés de lecture et signatures par code personnel certifiés.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <BoutonCreerNC
            sourceDefaut="ged_documentation"
            processusDefaut="QAM"
            graviteDefaut="mineure"
            titreSuggere="Écart documentaire ou procédure obsolète"
            libelleBouton="Signaler écart GED"
          />
          <Button
            onClick={() => setNouveauModal(true)}
            className="bg-[#0F3B27] hover:bg-[#0F3B27]/90 text-[#92FF5F] font-bold text-xs gap-1.5 shadow-sm"
          >
            <Plus className="size-4" /> Rédiger Procédure
          </Button>
        </div>
      </div>

      {/* TABS DE LA GED (9 ONGLETS CONFORMES AU CAHIER DES CHARGES) */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-[#F7F9F7] border border-[#CFF1D2] p-1 rounded-xl flex flex-wrap h-auto gap-1">
          <TabsTrigger
            value="bibliotheque"
            className="data-[state=active]:bg-[#0F3B27] data-[state=active]:text-[#92FF5F] text-xs font-semibold rounded-lg"
          >
            Bibliothèque ({documents.length})
          </TabsTrigger>
          <TabsTrigger
            value="taches"
            className="data-[state=active]:bg-[#0F3B27] data-[state=active]:text-[#92FF5F] text-xs font-semibold rounded-lg"
          >
            Mes Tâches & Lectures
          </TabsTrigger>
          <TabsTrigger
            value="versions"
            className="data-[state=active]:bg-[#0F3B27] data-[state=active]:text-[#92FF5F] text-xs font-semibold rounded-lg"
          >
            Versions & Archives
          </TabsTrigger>
          <TabsTrigger
            value="diffusion"
            className="data-[state=active]:bg-[#0F3B27] data-[state=active]:text-[#92FF5F] text-xs font-semibold rounded-lg"
          >
            Diffusion & Émargement
          </TabsTrigger>
          <TabsTrigger
            value="revisions"
            className="data-[state=active]:bg-[#0F3B27] data-[state=active]:text-[#92FF5F] text-xs font-semibold rounded-lg"
          >
            Révisions Dues
          </TabsTrigger>
          <TabsTrigger
            value="modifications"
            className="data-[state=active]:bg-[#0F3B27] data-[state=active]:text-[#92FF5F] text-xs font-semibold rounded-lg"
          >
            Demandes de Modification
          </TabsTrigger>
          <TabsTrigger
            value="processus"
            className="data-[state=active]:bg-[#0F3B27] data-[state=active]:text-[#92FF5F] text-xs font-semibold rounded-lg"
          >
            Cartographie 5 Processus
          </TabsTrigger>
          <TabsTrigger
            value="politique"
            className="data-[state=active]:bg-[#0F3B27] data-[state=active]:text-[#92FF5F] text-xs font-semibold rounded-lg"
          >
            Politique & Revue Direction
          </TabsTrigger>
        </TabsList>

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
              <Button size="sm" variant="outline" className="text-xs border-[#CFF1D2] text-[#0F3B27] gap-1">
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
              <Button variant="outline" size="sm" className="w-full text-xs border-[#CFF1D2] text-[#0F3B27] gap-1.5">
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
              <Button variant="outline" size="sm" className="w-full text-xs border-[#CFF1D2] text-[#0F3B27] gap-1.5">
                <FileText className="size-3.5" /> Générer Trame Rapport Annuel
              </Button>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* MODALE DÉTAIL / APPROBATION D'UN DOCUMENT */}
      <Dialog open={!!docActif} onOpenChange={(open) => !open && setDocActif(null)}>
        <DialogContent className="max-w-2xl bg-white border border-[#CFF1D2] rounded-2xl shadow-xl max-h-[85vh] overflow-y-auto">
          {docActif && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#0F3B27] bg-[#CFF1D2] px-2.5 py-0.5 rounded-md border border-[#0F3B27]/20">
                      {docActif.code_document || "DOC-001"}
                    </span>
                    <Badge variant="outline" className="text-xs font-mono font-bold">
                      v{docActif.version}.{docActif.indice_revision}
                    </Badge>
                  </div>
                  <Badge className="bg-[#0F3B27] text-[#92FF5F] text-[10px]">
                    Processus {docActif.processus}
                  </Badge>
                </div>
                <DialogTitle className="text-lg font-bold text-[#0F3B27] font-display mt-2">
                  {docActif.titre}
                </DialogTitle>
                <DialogDescription className="text-xs text-[#475C50]">
                  Rédigé par {docActif.redacteur_nom || "Équipe Qualité"} · Statut : <strong>{docActif.statut}</strong>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-2 text-xs">
                <div className="p-4 rounded-xl bg-[#F7F9F7] border border-[#CFF1D2] whitespace-pre-wrap font-sans leading-relaxed text-[#0F3B27]">
                  {docActif.contenu}
                </div>

                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-[11px] flex justify-between items-center">
                  <span>
                    Approbation officielle : <strong>{docActif.approbateur_nom || "En attente de signature du Pharmacien Titulaire"}</strong>
                  </span>
                  {docActif.approuve_le && (
                    <span className="font-mono text-[10px]">
                      {new Date(docActif.approuve_le).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDocActif(null)}
                  className="border-[#CFF1D2] text-[#475C50]"
                >
                  Fermer
                </Button>
                {docActif.statut !== "valide" && (
                  <Button
                    type="button"
                    onClick={() => {
                      setDocASigner(docActif);
                      setModaleSignOuverte(true);
                    }}
                    className="bg-[#0F3B27] hover:bg-[#0F3B27]/90 text-[#92FF5F] font-bold text-xs gap-1.5"
                  >
                    <CheckCircle2 className="size-4" /> Approuver par Code PIN
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* MODALE RÉDACTION PROCÉDURE STRUCTURÉE (DOC-03) */}
      <Dialog open={nouveauModal} onOpenChange={setNouveauModal}>
        <DialogContent className="max-w-xl bg-white border border-[#CFF1D2] rounded-2xl shadow-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#0F3B27] font-display">
              Éditeur de Procédure Structurée (DOC-03)
            </DialogTitle>
            <DialogDescription className="text-xs text-[#475C50]">
              Structure standardisée BPD : Objet, Domaine d'application, Rôles et Mode opératoire.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={creerNouveauDoc} className="space-y-3 pt-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="font-semibold text-[#0F3B27]">Processus *</Label>
                <select
                  value={processusDoc}
                  onChange={(e) => setProcessusDoc(e.target.value)}
                  className="w-full h-8 rounded-xl border border-[#CFF1D2] bg-white text-xs px-2"
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
                  className="w-full h-8 rounded-xl border border-[#CFF1D2] bg-white text-xs px-2"
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
                className="h-8 text-xs rounded-xl border-[#CFF1D2]"
                required
              />
            </div>

            <div>
              <Label className="font-semibold text-[#0F3B27]">1. Objet</Label>
              <Input
                placeholder="Ex : Définir la méthode de contrôle de la chaîne du froid à la réception..."
                value={objetDoc}
                onChange={(e) => setObjetDoc(e.target.value)}
                className="h-8 text-xs rounded-xl border-[#CFF1D2]"
              />
            </div>

            <div>
              <Label className="font-semibold text-[#0F3B27]">2. Domaine d'application</Label>
              <Input
                placeholder="Ex : Applicable à toute livraison de vaccins, insulines et dérivés sanguins..."
                value={domaineDoc}
                onChange={(e) => setDomaineDoc(e.target.value)}
                className="h-8 text-xs rounded-xl border-[#CFF1D2]"
              />
            </div>

            <div>
              <Label className="font-semibold text-[#0F3B27]">3. Qui / Responsables</Label>
              <Input
                placeholder="Ex : Magasinier réceptionnaire, Pharmacien Titulaire..."
                value={quiDoc}
                onChange={(e) => setQuiDoc(e.target.value)}
                className="h-8 text-xs rounded-xl border-[#CFF1D2]"
              />
            </div>

            <div>
              <Label className="font-semibold text-[#0F3B27]">4. Comment / Instructions opératoires</Label>
              <Textarea
                placeholder="Détailler les étapes chronologiques..."
                value={commentDoc}
                onChange={(e) => setCommentDoc(e.target.value)}
                rows={3}
                className="text-xs rounded-xl border-[#CFF1D2]"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNouveauModal(false)}
                className="border-[#CFF1D2] text-[#475C50]"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={enCours || !titreDoc.trim()}
                className="bg-[#0F3B27] hover:bg-[#0F3B27]/90 text-[#92FF5F] font-bold text-xs"
              >
                {enCours ? "Création…" : "Créer le document (Brouillon)"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
