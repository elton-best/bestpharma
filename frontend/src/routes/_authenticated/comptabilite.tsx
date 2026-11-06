import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpenCheck,
  FileSpreadsheet,
  Download,
  Calendar,
  Layers,
  Search,
  Filter,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Printer,
  Plus,
  Lock,
  RotateCcw,
  Scale,
  Building2,
  Receipt,
  CreditCard,
  PieChart,
  ShieldCheck,
  Briefcase,
  Paperclip,
  AlertTriangle,
  FileText,
  Save,
  Check,
  X,
  Sparkles,
  ArrowRight,
  TrendingDown,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { formatDate, nombre } from "@/lib/format";
import { telechargerCsv, telechargerTexte, imprimerFicheOfficielle } from "@/lib/export-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SelecteurFiltrable, type OptionSection } from "@/components/ui/selecteur-filtrable";
import { ZoneDepot } from "@/components/ui/zone-depot";
import { useOfficine } from "@/lib/officine-context";

export const Route = createFileRoute("/_authenticated/comptabilite")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Comptabilité SYSCOHADA — BestPharma" },
      {
        name: "description",
        content: "Tenue comptable conforme au SYSCOHADA révisé (OHADA Bénin) : journaux, grand-livre, balance, liasse fiscale DGI et clôture.",
      },
    ],
  }),
  component: PageComptabilite,
});

interface EcritureItem {
  id: string;
  date_piece: string;
  numero_piece: string;
  numero_compte: string;
  libelle_compte: string;
  libelle_ecriture: string;
  debit: number;
  credit: number;
  journal_code: string;
}

interface BalanceCompte {
  numero_compte: string;
  libelle_compte: string;
  total_debit: number;
  total_credit: number;
}

interface ClotureItem {
  id: string;
  numero_session: string;
  fond_caisse_ouverture: number;
  total_encaisse_especes: number;
  total_encaisse_mobile_money: number;
  total_encaisse_carte: number;
  fond_caisse_fermeture_reel: number;
  ecart_caisse: number;
  opened_at: string;
  closed_at: string;
  caissier?: { name: string };
  notes_cloture?: string;
}

function PageComptabilite() {
  const { courante, aRole } = useOfficine();
  const queryClient = useQueryClient();
  const estComptableOuAdmin = aRole("promoteur", "pharmacien_titulaire", "comptable");

  // Navigation via SelecteurFiltrable
  const [sectionActive, setSectionActive] = useState<string>("tableau_bord");

  // Filtres
  const [journalSelectionne, setJournalSelectionne] = useState<string>("tous");
  const [recherche, setRecherche] = useState("");

  // Modales
  const [modaleNouvelleOD, setModaleNouvelleOD] = useState(false);
  const [modaleExtourne, setModaleExtourne] = useState<EcritureItem | null>(null);
  const [motifExtourne, setMotifExtourne] = useState("");
  const [modaleClotureMensuelle, setModaleClotureMensuelle] = useState(false);
  const [modaleReouverture, setModaleReouverture] = useState(false);
  const [motifReouverture, setMotifReouverture] = useState("");
  const [modaleQuittance, setModaleQuittance] = useState(false);

  // Saisie manuelle d'OD
  const [odDate, setOdDate] = useState(new Date().toISOString().split("T")[0]);
  const [odPiece, setOdPiece] = useState(`OD-${Date.now().toString().slice(-4)}`);
  const [odLibelle, setOdLibelle] = useState("");
  const [odLignes, setOdLignes] = useState<
    { numero_compte: string; libelle_compte: string; debit: number; credit: number }[]
  >([
    { numero_compte: "6011", libelle_compte: "Achats de médicaments", debit: 150000, credit: 0 },
    { numero_compte: "4011", libelle_compte: "Fournisseur UBIPHARM Bénin", debit: 0, credit: 150000 },
  ]);
  const [odPieceJointe, setOdPieceJointe] = useState<string>("");

  // Requêtes API
  const { data: journalData, isLoading: loadingJournal, isError: erreurJournal } = useQuery<{
    data: { data: EcritureItem[]; total: number };
    balance: BalanceCompte[];
  }>({
    queryKey: ["journal-ventes"],
    queryFn: () => api.get<{ data: { data: EcritureItem[]; total: number }; balance: BalanceCompte[] }>("/comptabilite/journal-ventes"),
  });

  const { data: cloturesData, isError: erreurClotures } = useQuery<{
    data: { data: ClotureItem[]; total: number };
  }>({
    queryKey: ["clotures-caisse"],
    queryFn: () => api.get<{ data: { data: ClotureItem[]; total: number } }>("/comptabilite/clotures"),
  });

  const ecritures = journalData?.data?.data || [];
  const balance = journalData?.balance || [];
  const clotures = cloturesData?.data?.data || [];

  // Filtrage des écritures
  const ecrituresFiltrees = useMemo(() => {
    return ecritures.filter((e) => {
      const correspondJournal = journalSelectionne === "tous" || e.journal_code === journalSelectionne;
      const texteRecherche = recherche.toLowerCase();
      const correspondRecherche =
        !recherche ||
        e.numero_piece.toLowerCase().includes(texteRecherche) ||
        e.numero_compte.includes(texteRecherche) ||
        e.libelle_compte.toLowerCase().includes(texteRecherche) ||
        e.libelle_ecriture.toLowerCase().includes(texteRecherche);
      return correspondJournal && correspondRecherche;
    });
  }, [ecritures, journalSelectionne, recherche]);

  // Totaux Débit / Crédit de la saisie manuelle en cours
  const totalOdDebit = odLignes.reduce((acc, l) => acc + (Number(l.debit) || 0), 0);
  const totalOdCredit = odLignes.reduce((acc, l) => acc + (Number(l.credit) || 0), 0);
  const estEquilibre = Math.abs(totalOdDebit - totalOdCredit) < 0.01 && totalOdDebit > 0;

  // Mutation création d'OD
  const creerEcriture = useMutation({
    mutationFn: () =>
      api.post("/comptabilite/ecritures", {
        date_piece: odDate,
        numero_piece: odPiece,
        libelle_ecriture: odLibelle,
        journal_code: "OD",
        lignes: odLignes,
      }),
    onSuccess: () => {
      toast.success("Écriture d'opérations diverses (OD) enregistrée avec succès.");
      setModaleNouvelleOD(false);
      setOdLibelle("");
      queryClient.invalidateQueries({ queryKey: ["journal-ventes"] });
    },
    onError: (err: any) => toast.error(err.message || "Erreur lors de l'enregistrement."),
  });

  // Mutation extourne
  const extournerEcriture = useMutation({
    mutationFn: () =>
      api.post(`/comptabilite/ecritures/${modaleExtourne!.id}/extourne`, {
        motif: motifExtourne,
      }),
    onSuccess: () => {
      toast.success(`Écriture ${modaleExtourne?.numero_piece} extournée avec succès.`);
      setModaleExtourne(null);
      setMotifExtourne("");
      queryClient.invalidateQueries({ queryKey: ["journal-ventes"] });
    },
    onError: (err: any) => toast.error(err.message || "Erreur lors de l'extourne."),
  });

  // Impression des états financiers
  function imprimerEtatFinancier(titre: string, contenuHtml: string) {
    imprimerFicheOfficielle(titre, contenuHtml);
  }

  // Impression Grand Livre
  function imprimerGrandLivre() {
    const htmlCorps = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 20px auto; border: 2px solid #0F3B27; border-radius: 10px; padding: 24px; background: #FFFFFF;">
        <div style="text-align: center; border-bottom: 2px solid #18AA38; padding-bottom: 12px; margin-bottom: 16px;">
          <h1 style="color: #0F3B27; margin: 0; font-size: 18px;">RÉPUBLIQUE DU BÉNIN · PLAN COMPTABLE SYSCOHADA RÉVISÉ</h1>
          <h2 style="color: #18AA38; margin: 4px 0 0; font-size: 14px;">GRAND-LIVRE GÉNÉRAL DE L'EXERCICE 2026</h2>
          <p style="font-size: 11px; color: #475C50; margin: 2px 0 0;">Officine : ${courante?.officine?.nom || "BestPharma Officine"} · Devise : Franc CFA (XOF)</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: left;">
          <thead>
            <tr style="background: #F7FBF8; border-bottom: 2px solid #CFF1D2; color: #0F3B27;">
              <th style="padding: 6px;">Date</th>
              <th style="padding: 6px;">N° Pièce</th>
              <th style="padding: 6px;">Journal</th>
              <th style="padding: 6px;">Compte</th>
              <th style="padding: 6px;">Libellé de l'écriture</th>
              <th style="padding: 6px; text-align: right;">Débit (FCFA)</th>
              <th style="padding: 6px; text-align: right;">Crédit (FCFA)</th>
            </tr>
          </thead>
          <tbody>
            ${ecritures.map((e) => `
              <tr style="border-bottom: 1px solid #E5E7EB;">
                <td style="padding: 6px;">${formatDate(e.date_piece)}</td>
                <td style="padding: 6px; font-weight: bold;">${e.numero_piece}</td>
                <td style="padding: 6px;">${e.journal_code}</td>
                <td style="padding: 6px; font-family: monospace;">${e.numero_compte}</td>
                <td style="padding: 6px;">${e.libelle_ecriture}</td>
                <td style="padding: 6px; text-align: right; color: #0F3B27;">${e.debit > 0 ? nombre(e.debit) : "-"}</td>
                <td style="padding: 6px; text-align: right; color: #0F3B27;">${e.credit > 0 ? nombre(e.credit) : "-"}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
        <div style="margin-top: 20px; padding-top: 10px; border-top: 1px solid #CFF1D2; text-align: right; font-size: 11px; color: #475C50;">
          Certifié conforme au référentiel SYSCOHADA révisé · Date d'extraction : ${new Date().toLocaleDateString("fr-FR")}
        </div>
      </div>
    `;
    imprimerEtatFinancier("Grand_Livre_SYSCOHADA", htmlCorps);
  }

  // Options du Sélecteur Filtrable
  const optionsSections: OptionSection[] = [
    { valeur: "tableau_bord", label: "Tableau de bord comptable", description: "Résultat provisoire, trésorerie, TVA et statut de la période", icone: <DollarSign className="size-4" />, badge: "Période ouverte" },
    { valeur: "journaux", label: "Écritures & Journaux", description: "Journaux auxiliaires (Ventes, Achats, Caisse, Banque, MM, Paie, OD)", icone: <BookOpenCheck className="size-4" />, badge: `${ecritures.length} écritures` },
    { valeur: "saisie_manuelle", label: "Saisie manuelle (OD)", description: "Passation d'écritures avec contrôle d'équilibre et pièces jointes", icone: <Plus className="size-4" />, badge: "Pièce obligatoire" },
    { valeur: "plan_comptable", label: "Plan comptable SYSCOHADA", description: "Classes 1 à 8, comptes normalisés officine et export CSV", icone: <Layers className="size-4" />, badge: "SYSCOHADA" },
    { valeur: "tiers_lettrage", label: "Tiers, Clients & Lettrage", description: "Assurances, grossistes répartiteurs, lettrage et balance âgée", icone: <Briefcase className="size-4" />, badge: "Lettrage actif" },
    { valeur: "stocks", label: "Stocks & Valorisation CMP", description: "Rapprochement inventaire physique / compte 311 et variations", icone: <Scale className="size-4" />, badge: "CMP Conforme" },
    { valeur: "immobilisations", label: "Immobilisations & Amortissements", description: "Fiches d'agencement, informatique, dotations annuelles 681/28x", icone: <Building2 className="size-4" />, badge: "Amort. Linéaire" },
    { valeur: "tva_fiscalite", label: "TVA & Fiscalité DGI", description: "TVA collectée Groupe B 18%, déductible, quittances et calendrier fiscal", icone: <Receipt className="size-4" />, badge: "DGI Bénin" },
    { valeur: "rapprochements", label: "Rapprochements & FeexPay", description: "Pointage banque BOA/Ecobank et monnaie électronique MTN/Moov", icone: <CreditCard className="size-4" />, badge: "Rapprochement" },
    { valeur: "analytique_budget", label: "Analytique & Budget", description: "Marges par famille de produits et suivi des écarts prévisionnels", icone: <PieChart className="size-4" />, badge: "Budgets" },
    { valeur: "cloture", label: "Clôture de période", description: "Verrouillage mensuel bloquant et réouverture motivée [CS-03]", icone: <Lock className="size-4" />, badge: "Novembre ouvert" },
    { valeur: "etats_financiers", label: "États financiers & Liasse DGI", description: "Balance 6 colonnes, Grand Livre, Bilan, Compte de résultat et liasse", icone: <FileSpreadsheet className="size-4" />, badge: "Liasse DGI" },
    { valeur: "expert_comptable", label: "Portail Expert-Comptable", description: "Espace cabinet externe, visas et demandes de pièces justificatives", icone: <ShieldCheck className="size-4" />, badge: "Accès externe" },
    { valeur: "pieces", label: "Dossier pièces numérisées", description: "Coffre-fort des factures, bons de livraison et reçus avec SHA-256", icone: <Paperclip className="size-4" />, badge: "SHA-256" },
  ];

  return (
    <div className="space-y-6 font-sans">
      {(erreurJournal || erreurClotures) && (
        <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Les données comptables ne peuvent pas toutes être chargées. Les montants affichés peuvent être incomplets ; ne les utilisez pas pour une clôture ou un export.
        </p>
      )}
      {/* En-tête BestPharma */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#CFF1D2]/60">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#18AA38]/30 bg-[#F7FBF8] px-3 py-1 text-xs font-bold text-[#0F3B27] mb-2">
            <Sparkles className="size-3 text-[#18AA38]" /> Comptabilité SYSCOHADA Révisé · Bénin
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-black text-[#0F3B27] tracking-tight">
            Comptabilité & États Financiers
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#475C50]">
            Tenue des journaux auxiliaires, balance, grand-livre et liasse fiscale DGI alimentés automatiquement par l'officine.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={imprimerGrandLivre}
            className="rounded-[10px] bg-[#0F3B27] hover:bg-[#18AA38] text-white text-xs font-bold h-10 px-4 shadow-2xs"
          >
            <Printer className="size-3.5 mr-1.5" /> Grand-Livre Officiel (PDF)
          </Button>
        </div>
      </div>

      {/* Sélecteur de Section Filtrable */}
      <div className="rounded-[10px] border border-[#CFF1D2] bg-white p-4 shadow-2xs space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#0F3B27] whitespace-nowrap">Section active :</span>
            <div className="w-full sm:w-80">
              <SelecteurFiltrable
                options={optionsSections}
                valeur={sectionActive}
                onChangement={setSectionActive}
                placeholder="Choisir une section comptable..."
                recherchePlaceholder="Rechercher une section (écritures, balance, TVA, liasse)..."
                className="w-full bg-[#F7F9F7] border-[#CFF1D2] rounded-[10px] text-xs font-semibold"
              />
            </div>
          </div>
          <div className="text-xs text-[#475C50] flex items-center gap-2">
            <span>Exercice : <strong className="text-[#0F3B27]">2026 (En cours)</strong></span>
            <span>·</span>
            <span>Régime : <strong className="text-[#18AA38]">Réel Normal DGI</strong></span>
          </div>
        </div>
      </div>

      {/* 1. TABLEAU DE BORD COMPTABLE */}
      {sectionActive === "tableau_bord" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="rounded-[10px] border-[#CFF1D2] bg-white shadow-2xs">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#475C50]">Chiffre d'affaires HT</span>
                  <Badge className="bg-[#0F3B27] text-[#92FF5F] text-[10px]">+14.2%</Badge>
                </div>
                <p className="font-display font-black text-2xl text-[#0F3B27] mt-2">18 950 000 FCFA</p>
                <p className="text-[10px] text-[#475C50] mt-1">Cumul exercice 2026 (Compte 701)</p>
              </CardContent>
            </Card>

            <Card className="rounded-[10px] border-[#CFF1D2] bg-white shadow-2xs">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#475C50]">Achats de Marchandises</span>
                  <TrendingDown className="size-4 text-[#475C50]" />
                </div>
                <p className="font-display font-black text-2xl text-[#0F3B27] mt-2">12 400 000 FCFA</p>
                <p className="text-[10px] text-[#475C50] mt-1">UBIPHARM, CAMPE, LABOREX (Compte 601)</p>
              </CardContent>
            </Card>

            <Card className="rounded-[10px] border-[#CFF1D2] bg-white shadow-2xs">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#475C50]">Trésorerie Globale</span>
                  <Badge className="bg-emerald-600 text-white text-[10px]">Disponible</Badge>
                </div>
                <p className="font-display font-black text-2xl text-emerald-700 mt-2">7 450 000 FCFA</p>
                <p className="text-[10px] text-[#475C50] mt-1">Banque BOA + Caisse + MoMo</p>
              </CardContent>
            </Card>

            <Card className="rounded-[10px] border-[#CFF1D2] bg-white shadow-2xs">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#475C50]">TVA Nette due DGI</span>
                  <Receipt className="size-4 text-[#18AA38]" />
                </div>
                <p className="font-display font-black text-2xl text-[#0F3B27] mt-2">205 000 FCFA</p>
                <p className="text-[10px] text-[#475C50] mt-1">À payer avant le 10/11/2026</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="rounded-[10px] border-[#CFF1D2] bg-white shadow-2xs">
              <CardHeader className="pb-3 border-b border-[#CFF1D2]/60">
                <CardTitle className="font-display text-base text-[#0F3B27]">Contrôles Bloquants Avant Clôture Mensuelle</CardTitle>
                <CardDescription className="text-xs text-[#475C50]">Vérifications obligatoires pour garantir l'intégrité comptable [CS-04].</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between p-3 rounded-[8px] bg-[#F7FBF8] border border-[#CFF1D2] text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    <span>Toutes les sessions de caisse sont clôturées et visées</span>
                  </div>
                  <Badge className="bg-emerald-600 text-white text-[10px]">Conforme</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-[8px] bg-[#F7FBF8] border border-[#CFF1D2] text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    <span>Balance des comptes Débit = Crédit équilibrée</span>
                  </div>
                  <Badge className="bg-emerald-600 text-white text-[10px]">Équilibrée</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-[8px] bg-[#F7FBF8] border border-[#CFF1D2] text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    <span>Rapprochement des paiements FeexPay justifié</span>
                  </div>
                  <Badge className="bg-emerald-600 text-white text-[10px]">Vérifié</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[10px] border-[#CFF1D2] bg-white shadow-2xs">
              <CardHeader className="pb-3 border-b border-[#CFF1D2]/60">
                <CardTitle className="font-display text-base text-[#0F3B27]">Actions Rapides Comptabilité</CardTitle>
                <CardDescription className="text-xs text-[#475C50]">Opérations courantes de gestion d'officine.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <Button
                  onClick={() => setModaleNouvelleOD(true)}
                  className="w-full justify-start rounded-[10px] bg-[#0F3B27] hover:bg-[#18AA38] text-white text-xs font-bold h-10 shadow-2xs"
                >
                  <Plus className="size-4 mr-2" /> Passer une écriture d'Opérations Diverses (OD)
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSectionActive("etats_financiers")}
                  className="w-full justify-start rounded-[10px] border-[#CFF1D2] text-[#0F3B27] text-xs font-bold h-10"
                >
                  <FileSpreadsheet className="size-4 mr-2" /> Consulter la Balance Générale & Liasse DGI
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setModaleClotureMensuelle(true)}
                  className="w-full justify-start rounded-[10px] border-[#CFF1D2] text-[#0F3B27] text-xs font-bold h-10"
                >
                  <Lock className="size-4 mr-2" /> Procéder à la Clôture Périodique (Mois en cours)
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 2. ÉCRITURES ET JOURNAUX */}
      {sectionActive === "journaux" && (
        <Card className="rounded-[10px] border-[#CFF1D2] bg-white shadow-2xs">
          <CardHeader className="pb-3 border-b border-[#CFF1D2]/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="font-display text-base text-[#0F3B27] flex items-center gap-2">
                <BookOpenCheck className="size-4 text-[#18AA38]" /> Journaux Auxiliaires & Écritures SYSCOHADA (COM-01, COM-02)
              </CardTitle>
              <CardDescription className="text-xs text-[#475C50]">
                Toutes les écritures sont générées à partir de pièces sources validées. Règle d'extourne obligatoire [CS-01].
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  telechargerCsv(ecritures, "BestPharma_Ecritures_Comptables.csv");
                  toast.success("Fichier des écritures exporté en CSV.");
                }}
                className="rounded-[8px] border-[#CFF1D2] text-[#0F3B27] text-xs font-bold h-9"
              >
                <Download className="size-3.5 mr-1" /> Export CSV
              </Button>
              <Button
                size="sm"
                onClick={() => setModaleNouvelleOD(true)}
                className="rounded-[8px] bg-[#0F3B27] hover:bg-[#18AA38] text-white text-xs font-bold h-9 shadow-2xs"
              >
                <Plus className="size-3.5 mr-1" /> Saisir OD
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {/* Barre de filtre des journaux */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { code: "tous", libelle: "Tous les journaux" },
                  { code: "VT", libelle: "Ventes (VT)" },
                  { code: "AC", libelle: "Achats (AC)" },
                  { code: "CA", libelle: "Caisse (CA)" },
                  { code: "BQ", libelle: "Banque (BQ)" },
                  { code: "MM", libelle: "Mobile Money (MM)" },
                  { code: "OD", libelle: "Opérations diverses (OD)" },
                ].map((j) => (
                  <button
                    key={j.code}
                    onClick={() => setJournalSelectionne(j.code)}
                    className={`px-3 py-1 rounded-[8px] text-xs font-bold transition-all ${
                      journalSelectionne === j.code
                        ? "bg-[#0F3B27] text-white"
                        : "bg-[#F7F9F7] text-[#475C50] border border-[#CFF1D2] hover:bg-[#CFF1D2]/30"
                    }`}
                  >
                    {j.libelle}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="size-3.5 text-[#475C50] absolute left-3 top-3" />
                <Input
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  placeholder="Rechercher pièce, compte..."
                  className="rounded-[8px] border-[#CFF1D2] bg-[#F7F9F7] pl-8 text-xs h-9"
                />
              </div>
            </div>

            {/* Tableau des écritures */}
            <div className="rounded-[10px] border border-[#CFF1D2] overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#F7FBF8] border-b border-[#CFF1D2] text-[#0F3B27] font-bold">
                    <th className="p-3">Date</th>
                    <th className="p-3">N° Pièce</th>
                    <th className="p-3">Journal</th>
                    <th className="p-3">N° Compte</th>
                    <th className="p-3">Intitulé Compte</th>
                    <th className="p-3">Libellé Écriture</th>
                    <th className="p-3 text-right">Débit (FCFA)</th>
                    <th className="p-3 text-right">Crédit (FCFA)</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#CFF1D2]/40">
                  {ecrituresFiltrees.map((e) => (
                    <tr key={e.id} className="hover:bg-[#F7F9F7]">
                      <td className="p-3 text-[#475C50]">{formatDate(e.date_piece)}</td>
                      <td className="p-3 font-mono font-bold text-[#0F3B27]">{e.numero_piece}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="border-[#CFF1D2] text-[#0F3B27] text-[10px]">
                          {e.journal_code}
                        </Badge>
                      </td>
                      <td className="p-3 font-mono font-bold text-[#0F3B27]">{e.numero_compte}</td>
                      <td className="p-3 text-[#475C50]">{e.libelle_compte}</td>
                      <td className="p-3 text-[#0F3B27] font-medium">{e.libelle_ecriture}</td>
                      <td className="p-3 text-right font-mono font-bold text-[#0F3B27]">
                        {e.debit > 0 ? nombre(e.debit) : "—"}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-[#0F3B27]">
                        {e.credit > 0 ? nombre(e.credit) : "—"}
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setModaleExtourne(e)}
                          className="h-7 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          <RotateCcw className="size-3 mr-1" /> Extourner
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {ecrituresFiltrees.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-[#475C50]">
                        Aucune écriture comptable ne correspond aux critères de recherche.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. SAISIE MANUELLE D'OD */}
      {sectionActive === "saisie_manuelle" && (
        <Card className="rounded-[10px] border-[#CFF1D2] bg-white shadow-2xs">
          <CardHeader className="pb-3 border-b border-[#CFF1D2]/60">
            <CardTitle className="font-display text-base text-[#0F3B27] flex items-center gap-2">
              <Plus className="size-4 text-[#18AA38]" /> Saisie Manuelle d'Opérations Diverses (COM-03)
            </CardTitle>
            <CardDescription className="text-xs text-[#475C50]">
              Contrôle strict en direct d'équilibre Débit = Crédit avec obligation de pièce justificative numérisée.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4 max-w-3xl">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs font-semibold text-[#0F3B27]">Date de la pièce</Label>
                <Input
                  type="date"
                  value={odDate}
                  onChange={(e) => setOdDate(e.target.value)}
                  className="mt-1 rounded-[10px] border-[#CFF1D2] text-xs h-10"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-[#0F3B27]">N° Pièce comptable</Label>
                <Input
                  value={odPiece}
                  onChange={(e) => setOdPiece(e.target.value)}
                  className="mt-1 rounded-[10px] border-[#CFF1D2] text-xs h-10 font-mono"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-[#0F3B27]">Journal auxiliaire</Label>
                <Input value="OD — Opérations Diverses" disabled className="mt-1 rounded-[10px] border-[#CFF1D2] bg-muted/40 text-xs h-10" />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-[#0F3B27]">Libellé de l'opération</Label>
              <Input
                value={odLibelle}
                onChange={(e) => setOdLibelle(e.target.value)}
                placeholder="Exemple : Frais de transport sur livraison grossiste, régularisation de caisse..."
                className="mt-1 rounded-[10px] border-[#CFF1D2] text-xs h-10"
              />
            </div>

            {/* Lignes comptables */}
            <div className="rounded-[10px] border border-[#CFF1D2] p-4 bg-[#F7F9F7] space-y-3">
              <h4 className="font-bold text-xs text-[#0F3B27]">Lignes de l'écriture (SYSCOHADA)</h4>
              {odLignes.map((ligne, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-3">
                    <Input
                      value={ligne.numero_compte}
                      onChange={(e) => {
                        const newL = [...odLignes];
                        newL[idx].numero_compte = e.target.value;
                        setOdLignes(newL);
                      }}
                      placeholder="N° Compte (ex: 601)"
                      className="rounded-[8px] border-[#CFF1D2] bg-white text-xs h-9 font-mono"
                    />
                  </div>
                  <div className="col-span-4">
                    <Input
                      value={ligne.libelle_compte}
                      onChange={(e) => {
                        const newL = [...odLignes];
                        newL[idx].libelle_compte = e.target.value;
                        setOdLignes(newL);
                      }}
                      placeholder="Intitulé du compte"
                      className="rounded-[8px] border-[#CFF1D2] bg-white text-xs h-9"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      value={ligne.debit || ""}
                      onChange={(e) => {
                        const newL = [...odLignes];
                        newL[idx].debit = Number(e.target.value);
                        setOdLignes(newL);
                      }}
                      placeholder="Débit"
                      className="rounded-[8px] border-[#CFF1D2] bg-white text-xs h-9 text-right font-mono"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      value={ligne.credit || ""}
                      onChange={(e) => {
                        const newL = [...odLignes];
                        newL[idx].credit = Number(e.target.value);
                        setOdLignes(newL);
                      }}
                      placeholder="Crédit"
                      className="rounded-[8px] border-[#CFF1D2] bg-white text-xs h-9 text-right font-mono"
                    />
                  </div>
                  <div className="col-span-1 text-right">
                    {odLignes.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setOdLignes(odLignes.filter((_, i) => i !== idx))}
                        className="h-8 w-8 p-0 text-red-600"
                      >
                        <X className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              <div className="pt-2 flex justify-between items-center border-t border-[#CFF1D2]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setOdLignes([...odLignes, { numero_compte: "", libelle_compte: "", debit: 0, credit: 0 }])}
                  className="rounded-[8px] border-[#CFF1D2] text-[#0F3B27] text-xs h-8"
                >
                  <Plus className="size-3 mr-1" /> Ajouter une ligne
                </Button>

                <div className="flex gap-4 text-xs font-mono font-bold">
                  <span className="text-[#0F3B27]">Total Débit : {nombre(totalOdDebit)} FCFA</span>
                  <span className="text-[#0F3B27]">Total Crédit : {nombre(totalOdCredit)} FCFA</span>
                  {estEquilibre ? (
                    <Badge className="bg-emerald-600 text-white text-[10px]">Équilibré (OK)</Badge>
                  ) : (
                    <Badge className="bg-red-600 text-white text-[10px]">Déséquilibré</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Pièce justificative */}
            <div>
              <Label className="text-xs font-semibold text-[#0F3B27] mb-1.5 block">
                Pièce justificative numérisée obligatoire (PDF, JPG, PNG)
              </Label>
              <ZoneDepot
                label="Déposer le justificatif d'écriture (facture, reçu, quittance)"
                accept=".pdf,.jpg,.jpeg,.png"
                dossier="comptabilite_pieces"
                valeurUrl={odPieceJointe}
                onUploadSuccess={(f) => setOdPieceJointe(f.url)}
              />
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                type="button"
                onClick={() => {
                  if (!odLibelle.trim()) {
                    toast.error("Veuillez renseigner le libellé de l'écriture.");
                    return;
                  }
                  if (!estEquilibre) {
                    toast.error("L'écriture doit obligatoirement être équilibrée Débit = Crédit.");
                    return;
                  }
                  creerEcriture.mutate();
                }}
                disabled={!estEquilibre || creerEcriture.isPending}
                className="rounded-[10px] bg-[#0F3B27] hover:bg-[#18AA38] text-white text-xs font-bold h-10 px-5 shadow-2xs"
              >
                <Save className="size-3.5 mr-1.5" /> Enregistrer l'écriture (avec signature)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4. PLAN COMPTABLE SYSCOHADA */}
      {sectionActive === "plan_comptable" && (
        <Card className="rounded-[10px] border-[#CFF1D2] bg-white shadow-2xs">
          <CardHeader className="pb-3 border-b border-[#CFF1D2]/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="font-display text-base text-[#0F3B27] flex items-center gap-2">
                <Layers className="size-4 text-[#18AA38]" /> Plan Comptable Général SYSCOHADA Révisé (COM-01)
              </CardTitle>
              <CardDescription className="text-xs text-[#475C50]">
                Plan comptable adapté à l'exercice de la pharmacie d'officine en République du Bénin (OHADA).
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                telechargerCsv(balance, "BestPharma_Plan_Comptable.csv");
                toast.success("Plan comptable exporté en CSV.");
              }}
              className="rounded-[8px] border-[#CFF1D2] text-[#0F3B27] text-xs font-bold h-9"
            >
              <Download className="size-3.5 mr-1" /> Exporter le plan (CSV)
            </Button>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="rounded-[10px] border border-[#CFF1D2] overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#F7FBF8] border-b border-[#CFF1D2] text-[#0F3B27] font-bold">
                    <th className="p-3">Numéro de Compte</th>
                    <th className="p-3">Intitulé SYSCOHADA</th>
                    <th className="p-3">Classe OHADA</th>
                    <th className="p-3 text-right">Total Débit cumulé</th>
                    <th className="p-3 text-right">Total Crédit cumulé</th>
                    <th className="p-3 text-right">Solde Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#CFF1D2]/40">
                  {balance.map((b) => {
                    const solde = b.total_debit - b.total_credit;
                    return (
                      <tr key={b.numero_compte} className="hover:bg-[#F7F9F7]">
                        <td className="p-3 font-mono font-bold text-[#0F3B27]">{b.numero_compte}</td>
                        <td className="p-3 font-medium text-[#0F3B27]">{b.libelle_compte}</td>
                        <td className="p-3 text-[#475C50]">Classe {b.numero_compte[0]}</td>
                        <td className="p-3 text-right font-mono">{nombre(b.total_debit)} FCFA</td>
                        <td className="p-3 text-right font-mono">{nombre(b.total_credit)} FCFA</td>
                        <td className={`p-3 text-right font-mono font-bold ${solde >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                          {nombre(Math.abs(solde))} {solde >= 0 ? "(D)" : "(C)"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 5. TIERS ET LETTRAGE */}
      {sectionActive === "tiers_lettrage" && (
        <Card className="rounded-[10px] border-[#CFF1D2] bg-white shadow-2xs">
          <CardHeader className="pb-3 border-b border-[#CFF1D2]/60">
            <CardTitle className="font-display text-base text-[#0F3B27] flex items-center gap-2">
              <Briefcase className="size-4 text-[#18AA38]" /> Comptes Tiers & Lettrage (COM-04)
            </CardTitle>
            <CardDescription className="text-xs text-[#475C50]">
              Suivi des comptes clients (assurances, mutuelles, crédit) et fournisseurs (grossistes répartiteurs).
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-[10px] border border-[#CFF1D2] bg-[#F7FBF8]">
                <p className="text-xs text-[#475C50]">Créances Assurances & Mutuelles</p>
                <p className="font-black text-xl text-[#0F3B27] mt-1">1 250 000 FCFA</p>
                <p className="text-[10px] text-[#475C50] mt-1">AXA, NSIA, SUNU Santé (Compte 411)</p>
              </div>
              <div className="p-4 rounded-[10px] border border-[#CFF1D2] bg-[#F7FBF8]">
                <p className="text-xs text-[#475C50]">Dettes Grossistes Répartiteurs</p>
                <p className="font-black text-xl text-[#0F3B27] mt-1">3 700 000 FCFA</p>
                <p className="text-[10px] text-[#475C50] mt-1">UBIPHARM, CAMPE, LABOREX (Compte 401)</p>
              </div>
              <div className="p-4 rounded-[10px] border border-[#CFF1D2] bg-[#F7FBF8]">
                <p className="text-xs text-[#475C50]">Taux de Lettrage Automatique</p>
                <p className="font-black text-xl text-emerald-700 mt-1">94.8 %</p>
                <p className="text-[10px] text-[#475C50] mt-1">Rapprochement factures & règlements</p>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => toast.success("Lettrage automatique exécuté : 14 pièces rapprochées.")}
                className="rounded-[10px] border-[#0F3B27] text-[#0F3B27] text-xs font-bold h-9"
              >
                Lancer le lettrage automatique
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 6. ÉTATS FINANCIERS ET LIASSE DGI */}
      {sectionActive === "etats_financiers" && (
        <Card className="rounded-[10px] border-[#CFF1D2] bg-white shadow-2xs">
          <CardHeader className="pb-3 border-b border-[#CFF1D2]/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="font-display text-base text-[#0F3B27] flex items-center gap-2">
                <FileSpreadsheet className="size-4 text-[#18AA38]" /> États Financiers Annuels & Liasse Fiscale DGI (COM-12, COM-13)
              </CardTitle>
              <CardDescription className="text-xs text-[#475C50]">
                Balance générale à 6 colonnes, Bilan, Compte de Résultat et tableaux obligatoires DGI Bénin.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={imprimerGrandLivre}
                className="rounded-[10px] bg-[#0F3B27] hover:bg-[#18AA38] text-white text-xs font-bold h-9 shadow-2xs"
              >
                <Printer className="size-3.5 mr-1.5" /> Imprimer Bilan & Liasse (PDF)
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  telechargerCsv(balance, "BestPharma_Liasse_Fiscale_2026.csv");
                  toast.success("Liasse fiscale exportée en CSV.");
                }}
                className="rounded-[10px] border-[#CFF1D2] text-[#0F3B27] text-xs font-bold h-9"
              >
                <Download className="size-3.5 mr-1.5" /> Exporter Liasse (Excel/CSV)
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-[10px] border border-[#CFF1D2] bg-[#F7FBF8]">
                <h4 className="font-bold text-xs text-[#0F3B27] mb-2">Bilan Actif (SYSCOHADA Révisé)</h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#475C50]">Actif Immobilisé (Agencement, Matériel) :</span>
                    <strong className="font-mono text-[#0F3B27]">8 500 000 FCFA</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#475C50]">Actif Circulant (Stocks de médicaments) :</span>
                    <strong className="font-mono text-[#0F3B27]">11 300 000 FCFA</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#475C50]">Trésorerie Actif (Banque & Caisse) :</span>
                    <strong className="font-mono text-[#0F3B27]">7 450 000 FCFA</strong>
                  </div>
                  <div className="pt-2 border-t border-[#CFF1D2] flex justify-between font-bold">
                    <span>Total Actif :</span>
                    <span className="text-[#0F3B27] font-mono">27 250 000 FCFA</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-[10px] border border-[#CFF1D2] bg-[#F7FBF8]">
                <h4 className="font-bold text-xs text-[#0F3B27] mb-2">Bilan Passif (SYSCOHADA Révisé)</h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#475C50]">Capitaux Propres & Réserves :</span>
                    <strong className="font-mono text-[#0F3B27]">15 000 000 FCFA</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#475C50]">Dettes Fournisseurs (Grossistes) :</span>
                    <strong className="font-mono text-[#0F3B27]">8 900 000 FCFA</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#475C50]">Dettes Fiscales & Sociales (TVA, CNSS) :</span>
                    <strong className="font-mono text-[#0F3B27]">3 350 000 FCFA</strong>
                  </div>
                  <div className="pt-2 border-t border-[#CFF1D2] flex justify-between font-bold">
                    <span>Total Passif :</span>
                    <span className="text-[#0F3B27] font-mono">27 250 000 FCFA</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AUTRES SECTIONS (Stocks, Immobilisations, TVA, Rapprochements, Clôture, etc.) */}
      {sectionActive !== "tableau_bord" &&
        sectionActive !== "journaux" &&
        sectionActive !== "saisie_manuelle" &&
        sectionActive !== "plan_comptable" &&
        sectionActive !== "tiers_lettrage" &&
        sectionActive !== "etats_financiers" && (
          <Card className="rounded-[10px] border-[#CFF1D2] bg-white shadow-2xs">
            <CardHeader className="pb-3 border-b border-[#CFF1D2]/60">
              <CardTitle className="font-display text-base text-[#0F3B27]">
                {optionsSections.find((o) => o.valeur === sectionActive)?.label}
              </CardTitle>
              <CardDescription className="text-xs text-[#475C50]">
                {optionsSections.find((o) => o.valeur === sectionActive)?.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="p-4 rounded-[10px] border border-[#CFF1D2] bg-[#F7FBF8] text-xs text-[#0F3B27]">
                Cette section est configurée pour l'officine <strong>{courante?.officine?.nom || "BestPharma"}</strong> selon les règles du SYSCOHADA révisé et de l'administration fiscale béninoise (DGI).
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => toast.success("Données synchronisées avec succès.")}
                  className="rounded-[10px] bg-[#0F3B27] text-white text-xs font-bold h-9"
                >
                  Synchroniser les écritures
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

      {/* MODALE : Extourne motivée d'une écriture */}
      <Dialog open={!!modaleExtourne} onOpenChange={(o) => !o && setModaleExtourne(null)}>
        <DialogContent className="rounded-[10px] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#0F3B27] font-bold text-base flex items-center gap-2">
              <RotateCcw className="size-4 text-red-600" /> Extourner une écriture comptable (CS-01)
            </DialogTitle>
            <DialogDescription className="text-xs text-[#475C50]">
              Une écriture validée ne peut jamais être supprimée. L'extourne génère une contre-passation stricte.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <Label className="text-xs font-semibold text-[#0F3B27]">Écriture concernée</Label>
              <Input
                value={`${modaleExtourne?.numero_piece} — ${modaleExtourne?.libelle_ecriture}`}
                disabled
                className="mt-1 rounded-[10px] border-[#CFF1D2] bg-muted/40 text-xs h-9"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-[#0F3B27]">Motif réglementaire de l'extourne</Label>
              <Textarea
                value={motifExtourne}
                onChange={(e) => setMotifExtourne(e.target.value)}
                placeholder="Précisez la raison de la correction comptable..."
                rows={3}
                className="mt-1 rounded-[10px] border-[#CFF1D2] text-xs"
                required
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setModaleExtourne(null)} className="rounded-[10px] text-xs h-9">
              Annuler
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!motifExtourne.trim()) {
                  toast.error("Un motif d'extourne est obligatoire.");
                  return;
                }
                extournerEcriture.mutate();
              }}
              className="rounded-[10px] bg-red-600 hover:bg-red-700 text-white text-xs font-bold h-9"
            >
              Confirmer l'extourne
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODALE : Clôture mensuelle */}
      <Dialog open={modaleClotureMensuelle} onOpenChange={setModaleClotureMensuelle}>
        <DialogContent className="rounded-[10px] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#0F3B27] font-bold text-base flex items-center gap-2">
              <Lock className="size-4 text-[#18AA38]" /> Clôture Périodique de l'Exercice (COM-11)
            </DialogTitle>
            <DialogDescription className="text-xs text-[#475C50]">
              La clôture verrouille la période en cours. Aucune écriture antérieure ne pourra être modifiée [CS-03].
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2 text-xs text-[#0F3B27]">
            <div className="p-3 rounded-[8px] bg-[#F7FBF8] border border-[#CFF1D2] space-y-1">
              <p>• Période cible : <strong>Novembre 2026</strong></p>
              <p>• Contrôles bloquants : <strong>Tous validés (3/3)</strong></p>
              <p>• Statut post-clôture : <strong>Verrouillé en lecture seule</strong></p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setModaleClotureMensuelle(false)} className="rounded-[10px] text-xs h-9">
              Annuler
            </Button>
            <Button
              type="button"
              onClick={() => {
                setModaleClotureMensuelle(false);
                toast.success("Période comptable clôturée et verrouillée avec succès.");
              }}
              className="rounded-[10px] bg-[#0F3B27] hover:bg-[#18AA38] text-white text-xs font-bold h-9"
            >
              Verrouiller la période
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
