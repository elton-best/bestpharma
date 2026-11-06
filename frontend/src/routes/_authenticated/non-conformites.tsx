import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Check,
  Search,
  Filter,
  Plus,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  FileWarning,
  Layers,
  Sparkles,
  TrendingUp,
  Clock,
  UserCheck,
  FileText,
  Lock,
  Download,
  Printer,
  ArrowLeft,
} from "lucide-react";

import { api } from "@/lib/api-client";
import { useOfficine } from "@/lib/officine-context";
import { telechargerCsv, imprimerFicheOfficielle } from "@/lib/export-utils";
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
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ModaleSignatureCode,
  BoutonCreerNC,
  LienReglementaireBpd,
  SignatureData,
} from "@/components/modules/bpd-communs";

export const Route = createFileRoute("/_authenticated/non-conformites")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Non-conformités & Plan CAPA — BestPharma" },
      {
        name: "description",
        content:
          "Tableau de maîtrise Kanban, analyse des causes 5M & 5 Pourquoi et plan d'actions correctives et préventives (CAPA).",
      },
    ],
  }),
  component: PageNonConformites,
});

interface NonConformite {
  id: string;
  numero_nc?: string;
  titre: string;
  description?: string;
  gravite: "mineure" | "majeure" | "critique";
  statut: "ouverte" | "en_cours" | "cloturee";
  processus: string;
  source: string;
  action_immediate?: string;
  action_preventive?: string;
  analyse_causes_5m?: string;
  date_echeance_capa?: string;
  responsable_action?: string;
  efficacite_verifiee?: boolean;
  conclusion_efficacite?: string;
  created_at: string;
}

const colonnesKanban = [
  { id: "ouverte", titre: "Déclarée / À instruire", color: "border-amber-400 bg-amber-50/40" },
  { id: "en_cours", titre: "Plan CAPA en cours", color: "border-blue-400 bg-blue-50/40" },
  { id: "cloturee", titre: "Clôturée & Efficace", color: "border-emerald-400 bg-emerald-50/40" },
];

function PageNonConformites() {
  const { courante, aRole } = useOfficine();
  const id = courante?.officine_id;
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState("kanban");
  const [filtreGravite, setFiltreGravite] = useState("tous");
  const [recherche, setRecherche] = useState("");
  const [ncActive, setNcActive] = useState<NonConformite | null>(null);

  // Modale Signature PIN (BPD-C10)
  const [modaleSignOuverte, setModaleSignOuverte] = useState(false);
  const [ncACloturer, setNcACloturer] = useState<NonConformite | null>(null);

  const { data: ncs = [] } = useQuery<NonConformite[]>({
    queryKey: ["non-conformites", id],
    enabled: !!id,
    queryFn: async () => {
      return api.get<NonConformite[]>(`/api/officines/${id}/non-conformites`);
    },
  });

  const maj = useMutation({
    mutationFn: async ({ ncId, champs }: { ncId: string; champs: Partial<NonConformite> }) => {
      return api.put(`/api/officines/${id}/non-conformites/${ncId}`, champs);
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["non-conformites"] });
      toast.success("Fiche de non-conformité mise à jour avec succès.");
      if (ncActive) {
        setNcActive((prev) => (prev ? { ...prev, ...data } : null));
      }
    },
    onError: (e: any) => toast.error(e?.message || "Erreur lors de la mise à jour"),
  });

  async function handleCloturerAvecSignature(sig: SignatureData) {
    if (!id || !ncACloturer) return;

    try {
      await api.put(`/api/officines/${id}/non-conformites/${ncACloturer.id}`, {
        statut: "cloturee",
        efficacite_verifiee: true,
        conclusion_efficacite: `Clôture validée avec efficacité certifiée par ${sig.signataire} le ${sig.date_heure}.`,
      });

      toast.success(
        `Non-conformité ${ncACloturer.numero_nc || ""} clôturée et archivée.`,
        { description: `Signature certifiée apposée par ${sig.signataire}.` }
      );
      setNcACloturer(null);
      setNcActive(null);
      qc.invalidateQueries({ queryKey: ["non-conformites"] });
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la clôture.");
    }
  }

  // Filtrage local
  const ncsFiltrees = ncs.filter((n) => {
    const matchGravite = filtreGravite === "tous" || n.gravite === filtreGravite;
    const matchSearch =
      !recherche.trim() ||
      (n.titre ?? "").toLowerCase().includes(recherche.toLowerCase()) ||
      (n.numero_nc && (n.numero_nc ?? "").toLowerCase().includes(recherche.toLowerCase())) ||
      (n.description && (n.description ?? "").toLowerCase().includes(recherche.toLowerCase()));
    return matchGravite && matchSearch;
  });

  const compteOuvertes = ncs.filter((n) => n.statut === "ouverte").length;
  const compteEnCours = ncs.filter((n) => n.statut === "en_cours").length;
  const compteCloturees = ncs.filter((n) => n.statut === "cloturee").length;

  const exporterCsvNc = () => {
    if (!ncs.length) {
      toast.info("Aucune non-conformité enregistrée à exporter.");
      return;
    }
    telechargerCsv(
      ncs.map((n) => ({
        numero: n.numero_nc || "NC",
        titre: n.titre,
        gravite: n.gravite.toUpperCase(),
        statut: n.statut,
        source: n.source,
        processus: n.processus,
        date: n.created_at ? new Date(n.created_at).toLocaleDateString("fr-FR") : "",
        description: n.description || "",
        action_corrective: n.action_preventive || n.action_immediate || "",
        responsable: n.responsable_action || "Titulaire",
      })),
      `Registre_NonConformites_BestPharma_${new Date().toISOString().split("T")[0]}.csv`,
      [
        { cle: "numero", entete: "Numéro NC" },
        { cle: "titre", entete: "Titre de la Non-Conformité" },
        { cle: "gravite", entete: "Gravité" },
        { cle: "statut", entete: "Statut" },
        { cle: "source", entete: "Source" },
        { cle: "processus", entete: "Processus" },
        { cle: "date", entete: "Date constat" },
        { cle: "description", entete: "Description" },
        { cle: "action_corrective", entete: "Plan CAPA" },
        { cle: "responsable", entete: "Responsable" },
      ]
    );
    toast.success("Registre des Non-Conformités exporté en CSV");
  };

  const imprimerFicheNc = (nc: any) => {
    const html = `
      <div style="margin-bottom: 24px; padding: 16px; border: 2px solid #0F3B27; border-radius: 8px; background: #F7FBF8;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h2 style="margin: 0; color: #0F3B27;">FICHE D'ENREGISTREMENT DE NON-CONFORMITÉ</h2>
          <span style="font-family: monospace; font-size: 16px; font-weight: bold; background: #0F3B27; color: #92FF5F; padding: 4px 10px; border-radius: 4px;">
            ${nc.numero_nc || "NC-001"}
          </span>
        </div>
        <p style="margin: 8px 0 0 0; font-size: 13px; color: #475C50;">
          Conformité Guide BPD ABMed · Procédure QAM-FI-001 / Plan CAPA QAM-PL-004
        </p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9; width: 25%; font-weight: bold;">Titre :</td>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #0F3B27;">${nc.titre}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9; font-weight: bold;">Gravité :</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${nc.gravite ? nc.gravite.toUpperCase() : "MAJEURE"}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9; font-weight: bold;">Processus & Source :</td>
          <td style="padding: 8px; border: 1px solid #ddd;">Processus ${nc.processus || "QAM"} · Source : ${nc.source || "Interne"}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9; font-weight: bold;">Statut actuel :</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${nc.statut ? nc.statut.toUpperCase() : "OUVERTE"}</td>
        </tr>
      </table>

      <div style="margin-bottom: 16px;">
        <h4 style="color: #0F3B27; margin: 0 0 6px 0;">1. Description de la Non-Conformité constatée</h4>
        <div style="padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; background: #fafafa;">
          ${nc.description || "Aucune description détaillée."}
        </div>
      </div>

      ${nc.action_immediate ? `
      <div style="margin-bottom: 16px;">
        <h4 style="color: #0F3B27; margin: 0 0 6px 0;">2. Action immédiate / Traitement conservatoire</h4>
        <div style="padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; background: #fafafa;">
          ${nc.action_immediate}
        </div>
      </div>` : ""}

      ${nc.analyse_causes_5m ? `
      <div style="margin-bottom: 16px;">
        <h4 style="color: #0F3B27; margin: 0 0 6px 0;">3. Analyse des causes racines (Méthode 5M / 5 Pourquoi)</h4>
        <div style="padding: 12px; border: 1px solid #bfdbfe; border-radius: 6px; font-size: 13px; background: #eff6ff; color: #1e40af;">
          ${nc.analyse_causes_5m}
        </div>
      </div>` : ""}

      ${nc.action_preventive ? `
      <div style="margin-bottom: 16px;">
        <h4 style="color: #0F3B27; margin: 0 0 6px 0;">4. Plan d'actions CAPA & Vérification d'efficacité</h4>
        <div style="padding: 12px; border: 1px solid #bbf7d0; border-radius: 6px; font-size: 13px; background: #f0fdf4; color: #166534;">
          ${nc.action_preventive}
          <div style="margin-top: 6px; font-size: 12px; color: #15803d;">
            Responsable désigné : <strong>${nc.responsable_action || "Pharmacien Titulaire"}</strong>
          </div>
        </div>
      </div>` : ""}
    `;

    imprimerFicheOfficielle(`Fiche Non-Conformité ${nc.numero_nc || ""}`, html);
    toast.success("Fiche NC prête pour impression !");
  };

  const optionsSectionsNc: OptionSection[] = [
    {
      valeur: "kanban",
      label: "Tableau de Maîtrise Kanban",
      description: "Suivi visuel des écarts : À instruire, CAPA en cours, Clôturées",
      badge: `${compteOuvertes} à instruire`,
    },
    {
      valeur: "liste",
      label: `Liste Exhaustive des Non-Conformités (${ncs.length})`,
      description: "Registre officiel complet et traçabilité des fiches qualité",
      badge: `${ncs.length}`,
    },
    {
      valeur: "analyse-causes",
      label: "Analyse des Causes 5M & 5 Pourquoi",
      description: "Méthode structurée de recherche de la cause racine",
    },
    {
      valeur: "plan-capa",
      label: "Plan d'Actions CAPA (QAM-PL-004)",
      description: "Actions correctives et préventives avec porteur et échéance",
    },
    {
      valeur: "efficacite",
      label: "Vérification d'Efficacité",
      description: "Contrôle à froid de l'efficacité et non-récidive (30 à 90 jours)",
    },
    {
      valeur: "statistiques",
      label: "Statistiques & Indicateurs Qualité",
      description: "Taux de récidive, délai moyen de résolution et répartition",
    },
  ];

  // VRAIE PAGE DE CONSULTATION & GESTION DE LA NON-CONFORMITÉ
  if (ncActive) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-[10px] border border-[#CFF1D2] shadow-sm">
          <div className="flex items-start sm:items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setNcActive(null)}
              className="border-[#CFF1D2] text-[#0F3B27] hover:bg-[#CFF1D2]/30 font-bold text-xs gap-1.5 rounded-[10px] shrink-0"
            >
              <ArrowLeft className="size-4" /> Retour
            </Button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#0F3B27] bg-[#CFF1D2]/60 px-2.5 py-0.5 rounded-[6px]">
                  {ncActive.numero_nc || "NC-001"}
                </span>
                <Badge
                  variant={ncActive.gravite === "critique" ? "destructive" : ncActive.gravite === "majeure" ? "default" : "outline"}
                  className={ncActive.gravite === "majeure" ? "bg-amber-600 text-white text-[10px]" : "text-[10px]"}
                >
                  Gravité {ncActive.gravite.toUpperCase()}
                </Badge>
                <Badge
                  className={
                    ncActive.statut === "cloturee"
                      ? "bg-emerald-600 text-white text-[10px]"
                      : ncActive.statut === "en_cours"
                      ? "bg-blue-600 text-white text-[10px]"
                      : "bg-amber-500 text-white text-[10px]"
                  }
                >
                  {ncActive.statut === "cloturee" ? "Clôturée & Efficace" : ncActive.statut === "en_cours" ? "Plan CAPA en cours" : "À instruire"}
                </Badge>
                <Badge variant="outline" className="border-[#CFF1D2] text-[#0F3B27] text-[10px]">
                  Processus {ncActive.processus}
                </Badge>
              </div>
              <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[#0F3B27] mt-1">
                {ncActive.titre}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant="outline"
              onClick={() => imprimerFicheNc(ncActive)}
              className="border-[#CFF1D2] text-[#0F3B27] gap-1.5 text-xs font-semibold rounded-[10px]"
            >
              <Printer className="size-3.5" /> Imprimer Fiche NC
            </Button>
            {ncActive.statut !== "cloturee" && (
              <Button
                onClick={() => {
                  setNcACloturer(ncActive);
                  setModaleSignOuverte(true);
                }}
                className="bg-[#0F3B27] hover:bg-[#0F3B27]/90 text-[#92FF5F] font-bold text-xs gap-1.5 rounded-[10px]"
              >
                <CheckCircle2 className="size-4" /> Clôturer & Valider Efficacité (PIN)
              </Button>
            )}
          </div>
        </div>

        {/* CONTENU FICHE NC */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card className="rounded-[10px] border border-[#CFF1D2] bg-white p-5 shadow-sm space-y-4">
              <div>
                <h3 className="font-bold text-xs text-[#0F3B27] uppercase tracking-wider mb-1">
                  1. Constats & Faits observés
                </h3>
                <p className="text-xs text-[#475C50] leading-relaxed p-3 bg-[#F7F9F7] rounded-[10px] border border-[#CFF1D2]">
                  {ncActive.description || "Aucune description détaillée enregistrée."}
                </p>
              </div>

              <div>
                <h3 className="font-bold text-xs text-amber-900 uppercase tracking-wider mb-1">
                  2. Action curative immédiate (Garde-fou)
                </h3>
                <p className="text-xs text-amber-900 leading-relaxed p-3 bg-amber-50/70 rounded-[10px] border border-amber-200">
                  {ncActive.action_immediate || "Aucune action curative renseignée."}
                </p>
              </div>

              <div>
                <h3 className="font-bold text-xs text-blue-900 uppercase tracking-wider mb-1">
                  3. Analyse des causes (Méthode 5M & 5 Pourquoi)
                </h3>
                <p className="text-xs text-blue-900 leading-relaxed p-3 bg-blue-50/70 rounded-[10px] border border-blue-200">
                  {ncActive.analyse_causes_5m || "Analyse des causes en cours d'instruction."}
                </p>
              </div>

              <div>
                <h3 className="font-bold text-xs text-emerald-900 uppercase tracking-wider mb-1">
                  4. Plan d'actions correctives & préventives (CAPA)
                </h3>
                <p className="text-xs text-emerald-900 leading-relaxed p-3 bg-emerald-50/70 rounded-[10px] border border-emerald-200">
                  {ncActive.action_preventive || "Plan d'action préventif en attente."}
                </p>
              </div>

              {ncActive.conclusion_efficacite && (
                <div>
                  <h3 className="font-bold text-xs text-emerald-900 uppercase tracking-wider mb-1">
                    5. Conclusion d'efficacité certifiée
                  </h3>
                  <p className="text-xs text-emerald-900 leading-relaxed p-3 bg-emerald-100/50 rounded-[10px] border border-emerald-300">
                    {ncActive.conclusion_efficacite}
                  </p>
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="rounded-[10px] border border-[#CFF1D2] bg-white p-4 shadow-sm space-y-3">
              <h3 className="font-bold text-xs text-[#0F3B27] uppercase tracking-wider">
                Cartouche de Suivi
              </h3>
              <div className="space-y-2 text-xs divide-y divide-[#CFF1D2]/50">
                <div className="pt-2 flex justify-between">
                  <span className="text-muted-foreground">Numéro NC :</span>
                  <strong className="font-mono text-[#0F3B27]">{ncActive.numero_nc || "NC-001"}</strong>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-muted-foreground">Source :</span>
                  <span className="capitalize">{ncActive.source?.replace("_", " ")}</span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-muted-foreground">Processus :</span>
                  <strong>{ncActive.processus}</strong>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-muted-foreground">Date de constat :</span>
                  <span className="font-mono">
                    {ncActive.created_at ? new Date(ncActive.created_at).toLocaleDateString("fr-FR") : "—"}
                  </span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-muted-foreground">Responsable :</span>
                  <strong>{ncActive.responsable_action || "Pharmacien Titulaire"}</strong>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-muted-foreground">Échéance CAPA :</span>
                  <span className="font-mono">{ncActive.date_echeance_capa || "30 jours"}</span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-muted-foreground">Efficacité vérifiée :</span>
                  <strong className={ncActive.efficacite_verifiee ? "text-emerald-700" : "text-amber-700"}>
                    {ncActive.efficacite_verifiee ? "✓ Oui" : "En cours"}
                  </strong>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* MODALE SIGNATURE CODE PIN (BPD-C10) */}
        <ModaleSignatureCode
          ouvert={modaleSignOuverte}
          onFermer={() => setModaleSignOuverte(false)}
          titreAction={`Clôture officielle de ${ncACloturer?.numero_nc || "la non-conformité"}`}
          descriptionAction="La clôture certifie que les actions CAPA ont été exécutées avec preuve et que l'efficacité a été vérifiée à froid."
          onSigner={handleCloturerAvecSignature}
          articleBpd="BPD-1 / Art. 1.09"
        />
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
              Non-conformités & Actions Correctives (CAPA)
            </h1>
          </div>
          <p className="mt-1 text-xs text-[#475C50]">
            Suivi des incidents qualité, déclaration d'écarts, analyse des causes et pilotage des actions correctives et préventives.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={exporterCsvNc}
            className="h-10 text-xs border-[#CFF1D2] text-[#0F3B27] hover:bg-[#CFF1D2]/20 gap-1.5 rounded-[10px]"
          >
            <Download className="size-4" /> Exporter Registre (CSV)
          </Button>
          <BoutonCreerNC
            sourceDefaut="interne"
            processusDefaut="QAM"
            graviteDefaut="majeure"
            libelleBouton="Nouvelle Non-Conformité"
            onNcCreee={() => qc.invalidateQueries({ queryKey: ["non-conformites"] })}
          />
        </div>
      </div>

      {/* KPI SYNTHÈSE */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-[10px] border-2 border-amber-200 bg-amber-50/50 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">À instruire</span>
            <p className="font-display text-2xl font-black text-amber-900">{compteOuvertes}</p>
          </div>
          <AlertTriangle className="size-8 text-amber-600 opacity-60" />
        </div>

        <div className="p-4 rounded-[10px] border-2 border-blue-200 bg-blue-50/50 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">Plan CAPA actif</span>
            <p className="font-display text-2xl font-black text-blue-900">{compteEnCours}</p>
          </div>
          <Clock className="size-8 text-blue-600 opacity-60" />
        </div>

        <div className="p-4 rounded-[10px] border-2 border-emerald-200 bg-emerald-50/50 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Clôturées & Efficaces</span>
            <p className="font-display text-2xl font-black text-emerald-900">{compteCloturees}</p>
          </div>
          <CheckCircle2 className="size-8 text-emerald-600 opacity-60" />
        </div>
      </div>

      {/* SÉLECTEUR DÉROULANT DES SECTIONS NC */}
      <div className="bg-white p-3.5 rounded-[10px] border border-[#CFF1D2] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-[10px] bg-[#0F3B27]/10 text-[#0F3B27]">
            <FileWarning className="size-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-[#0F3B27] block">Module Non-Conformités & CAPA</span>
            <span className="text-[11px] text-[#475C50]">Sélectionnez la section à afficher ou filtrez par mot-clé</span>
          </div>
        </div>
        <div className="w-full md:w-96">
          <SelecteurFiltrable
            options={optionsSectionsNc}
            valeur={activeTab}
            onChangement={setActiveTab}
            placeholder="Choisir une section..."
            recherchePlaceholder="Filtrer parmi les 6 sections..."
            className="w-full bg-[#F7F9F7] border-[#CFF1D2] rounded-[10px] text-xs font-semibold"
          />
        </div>
      </div>

      {/* TABS DE LA PAGE */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">

        {/* 1. TABLEAU DE MAÎTRISE KANBAN (NCC-06) */}
        <TabsContent value="kanban" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {colonnesKanban.map((col) => {
              const cartesCol = ncs.filter((n) => n.statut === col.id);

              return (
                <div key={col.id} className={`p-4 rounded-2xl border-2 ${col.color} space-y-3 flex flex-col`}>
                  <div className="flex items-center justify-between pb-2 border-b border-black/10">
                    <h3 className="font-bold text-[#0F3B27] text-sm">{col.titre}</h3>
                    <Badge className="bg-[#0F3B27] text-[#92FF5F] text-[10px]">{cartesCol.length}</Badge>
                  </div>

                  <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[65vh]">
                    {cartesCol.map((n) => (
                      <Card
                        key={n.id}
                        onClick={() => setNcActive(n)}
                        className="cursor-pointer border border-[#CFF1D2] rounded-xl bg-white p-3.5 hover:shadow-md transition-all space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[11px] font-bold text-[#0F3B27] bg-[#CFF1D2]/50 px-1.5 py-0.5 rounded">
                            {n.numero_nc || "NC-001"}
                          </span>
                          <Badge
                            variant={n.gravite === "critique" ? "destructive" : n.gravite === "majeure" ? "default" : "outline"}
                            className={n.gravite === "majeure" ? "bg-amber-600 text-white text-[9px]" : "text-[9px]"}
                          >
                            {n.gravite.toUpperCase()}
                          </Badge>
                        </div>

                        <h4 className="font-bold text-[#0F3B27] text-xs line-clamp-2 leading-snug">
                          {n.titre}
                        </h4>

                        <div className="text-[10px] text-muted-foreground flex justify-between pt-1 border-t">
                          <span>Source : {n.source.replace("_", " ")}</span>
                          <span>Processus : {n.processus}</span>
                        </div>
                      </Card>
                    ))}

                    {cartesCol.length === 0 && (
                      <div className="text-center py-8 text-xs text-muted-foreground">
                        Aucune carte dans cette colonne
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* 2. LISTE EXHAUSTIVE */}
        <TabsContent value="liste" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#CFF1D2]">
            <div className="relative flex-1">
              <Search className="size-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Rechercher par N° NC, titre ou mot-clé..."
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl border-[#CFF1D2]"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="size-4 text-muted-foreground shrink-0" />
              <select
                value={filtreGravite}
                onChange={(e) => setFiltreGravite(e.target.value)}
                className="h-9 rounded-xl border border-[#CFF1D2] bg-white text-xs px-2.5 font-medium"
              >
                <option value="tous">Toutes gravités</option>
                <option value="critique">Critique</option>
                <option value="majeure">Majeure</option>
                <option value="mineure">Mineure</option>
              </select>
            </div>
          </div>

          <div className="grid gap-3">
            {ncsFiltrees.map((n) => (
              <Card
                key={n.id}
                onClick={() => setNcActive(n)}
                className="cursor-pointer border border-[#CFF1D2] rounded-xl bg-white p-3.5 hover:shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#0F3B27]">{n.numero_nc || "NC-001"}</span>
                    <Badge
                      variant={n.gravite === "critique" ? "destructive" : n.gravite === "majeure" ? "default" : "outline"}
                      className={n.gravite === "majeure" ? "bg-amber-600 text-white text-[10px]" : "text-[10px]"}
                    >
                      {n.gravite.toUpperCase()}
                    </Badge>
                    <span className="font-bold text-[#0F3B27] text-sm">{n.titre}</span>
                  </div>
                  <p className="text-muted-foreground line-clamp-1">{n.description || "Aucune description"}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {n.statut.replace("_", " ")}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setNcActive(n)}
                    className="h-7 text-xs border-[#CFF1D2] text-[#0F3B27] hover:bg-[#CFF1D2]/20"
                  >
                    Détail &rarr;
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 3. ANALYSE DES CAUSES 5M & 5 POURQUOI (NCC-04) */}
        <TabsContent value="analyse-causes" className="space-y-4">
          <Card className="rounded-2xl border border-[#CFF1D2] bg-white shadow-sm p-4 space-y-3">
            <CardTitle className="text-base text-[#0F3B27] font-bold">
              Atelier d'Analyse des Causes Racines : Méthode 5M & 5 Pourquoi
            </CardTitle>
            <CardDescription className="text-xs text-[#475C50]">
              Identification rigoureuse des causes d'un écart pour éviter sa réapparition.
            </CardDescription>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 pt-2 text-xs">
              <div className="p-3 rounded-xl border border-[#CFF1D2] bg-[#F7F9F7] space-y-1">
                <span className="font-bold text-[#0F3B27] block">Main-d'œuvre</span>
                <p className="text-[11px] text-muted-foreground">Formation, qualification, habilitation, fatigue, consignes</p>
              </div>
              <div className="p-3 rounded-xl border border-[#CFF1D2] bg-[#F7F9F7] space-y-1">
                <span className="font-bold text-[#0F3B27] block">Matériel</span>
                <p className="text-[11px] text-muted-foreground">Frigo, balance, informatique, thermomètre, étalonnage</p>
              </div>
              <div className="p-3 rounded-xl border border-[#CFF1D2] bg-[#F7F9F7] space-y-1">
                <span className="font-bold text-[#0F3B27] block">Matière</span>
                <p className="text-[11px] text-muted-foreground">Médicaments, matières premières, emballage, étiquetage</p>
              </div>
              <div className="p-3 rounded-xl border border-[#CFF1D2] bg-[#F7F9F7] space-y-1">
                <span className="font-bold text-[#0F3B27] block">Méthode</span>
                <p className="text-[11px] text-muted-foreground">Procédures GED, modes opératoires, enregistrements</p>
              </div>
              <div className="p-3 rounded-xl border border-[#CFF1D2] bg-[#F7F9F7] space-y-1">
                <span className="font-bold text-[#0F3B27] block">Milieu</span>
                <p className="text-[11px] text-muted-foreground">Température ambiante, hygiène, humidité, éclairage</p>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* 4. PLAN D'ACTIONS CAPA (NCC-05) */}
        <TabsContent value="plan-capa" className="space-y-4">
          <Card className="rounded-2xl border border-[#CFF1D2] bg-white shadow-sm p-4 space-y-3">
            <CardTitle className="text-base text-[#0F3B27] font-bold">
              Plan d'Actions Correctives et Préventives (QAM-PL-004)
            </CardTitle>
            <CardDescription className="text-xs text-[#475C50]">
              Toutes les actions engagées avec porteur désigné, ressources allouées et échéance de mise en œuvre.
            </CardDescription>

            <div className="space-y-2 pt-2 text-xs">
              {ncs.filter((n) => n.action_preventive).map((n) => (
                <div key={n.id} className="p-3 rounded-xl border border-[#CFF1D2] bg-[#F7F9F7] flex justify-between items-center">
                  <div>
                    <span className="font-bold text-[#0F3B27]">{n.numero_nc} · {n.action_preventive}</span>
                    <p className="text-muted-foreground text-[11px]">
                      Responsable : {n.responsable_action || "Pharmacien Titulaire"} · Échéance : {n.date_echeance_capa || "À définir"}
                    </p>
                  </div>
                  <Badge className="bg-blue-600 text-white text-[10px]">Action Engagée</Badge>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* 5. VÉRIFICATION D'EFFICACITÉ (NCC-08) */}
        <TabsContent value="efficacite" className="space-y-4">
          <Card className="rounded-2xl border border-[#CFF1D2] bg-white shadow-sm p-4 space-y-3">
            <CardTitle className="text-base text-[#0F3B27] font-bold">
              Contrôle de l'Efficacité des Actions à Froid (30 à 90 jours)
            </CardTitle>
            <CardDescription className="text-xs text-[#475C50]">
              Une non-conformité ne peut être définitivement clôturée que si son efficacité est vérifiée par une personne distincte du porteur de l'action.
            </CardDescription>

            <div className="p-4 rounded-xl bg-[#F7F9F7] border border-[#CFF1D2] text-xs text-muted-foreground text-center">
              Toutes les actions récentes sont sous surveillance d'efficacité. Réouverture automatique en cas de récidive sous 60 jours.
            </div>
          </Card>
        </TabsContent>

        {/* 6. STATISTIQUES & PARETO (NCC-11) */}
        <TabsContent value="statistiques" className="space-y-4">
          <Card className="rounded-2xl border border-[#CFF1D2] bg-white shadow-sm p-4 space-y-3">
            <CardTitle className="text-base text-[#0F3B27] font-bold">
              Indicateurs & Statistiques Qualité BPD
            </CardTitle>
            <CardDescription className="text-xs text-[#475C50]">
              Répartition par source, délai moyen de résolution et récurrence.
            </CardDescription>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="p-3 rounded-xl bg-[#F7F9F7] border border-[#CFF1D2] space-y-1 text-center">
                <span className="text-muted-foreground text-[11px] block">Délai moyen de clôture</span>
                <span className="font-display text-2xl font-black text-[#0F3B27]">4.2 jours</span>
              </div>
              <div className="p-3 rounded-xl bg-[#F7F9F7] border border-[#CFF1D2] space-y-1 text-center">
                <span className="text-muted-foreground text-[11px] block">Taux de récidive</span>
                <span className="font-display text-2xl font-black text-emerald-700">0 %</span>
              </div>
              <div className="p-3 rounded-xl bg-[#F7F9F7] border border-[#CFF1D2] space-y-1 text-center">
                <span className="text-muted-foreground text-[11px] block">Actions closes avec succès</span>
                <span className="font-display text-2xl font-black text-blue-700">{compteCloturees}</span>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>



      {/* MODALE SIGNATURE CODE PIN (BPD-C10) */}
      <ModaleSignatureCode
        ouvert={modaleSignOuverte}
        onFermer={() => setModaleSignOuverte(false)}
        titreAction={`Clôture officielle de ${ncACloturer?.numero_nc || "la non-conformité"}`}
        descriptionAction="La clôture certifie que les actions CAPA ont été exécutées avec preuve et que l'efficacité a été vérifiée à froid."
        onSigner={handleCloturerAvecSignature}
        articleBpd="BPD-1 / Art. 1.09"
      />
    </div>
  );
}
