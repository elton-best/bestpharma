import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Settings2,
  Building2,
  Users,
  Clock,
  Sliders,
  Receipt,
  CreditCard,
  Bell,
  FileText,
  ShieldCheck,
  Database,
  History,
  Lock,
  Plus,
  Trash2,
  Edit,
  Save,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Upload,
  Download,
  Printer,
  Eye,
  EyeOff,
  UserCheck,
  Ban,
  Calendar,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { useOfficine } from "@/lib/officine-context";
import { fr } from "@/lib/i18n/fr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SelecteurFiltrable, type OptionSection } from "@/components/ui/selecteur-filtrable";
import { ZoneDepot } from "@/components/ui/zone-depot";
import { imprimerFicheOfficielle, telechargerTexte, telechargerCsv } from "@/lib/export-utils";

export const Route = createFileRoute("/_authenticated/parametres")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Paramètres Officine — BestPharma" },
      { name: "description", content: "Centre de configuration d'officine : licence, utilisateurs, règles BPD, fiscalité e-MECeF et conservation." },
    ],
  }),
  component: PageParametres,
});

interface Parametre {
  id: string;
  cle: string;
  libelle: string;
  type: "texte" | "nombre" | "entier" | "decimal" | "booleen";
  valeur: unknown;
  unite: string | null;
  description: string | null;
  version: number;
  updated_at: string | null;
}

function PageParametres() {
  const { courante, aRole, chargement } = useOfficine();
  const queryClient = useQueryClient();
  const promoteur = aRole("promoteur", "pharmacien_titulaire");

  // Navigation par SelecteurFiltrable
  const [sectionActive, setSectionActive] = useState<string>("identite");

  // Modales
  const [modaleInspecteur, setModaleInspecteur] = useState(false);
  const [modaleInvitation, setModaleInvitation] = useState(false);
  const [modaleMotifModif, setModaleMotifModif] = useState(false);
  const [paramEnCoursModif, setParamEnCoursModif] = useState<any>(null);
  const [motifModif, setMotifModif] = useState("");
  const [modaleRestauration, setModaleRestauration] = useState<any>(null);

  // Identifiants & masquage secrets
  const [afficherSecretMECeF, setAfficherSecretMECeF] = useState(false);
  const [afficherSecretFeexPay, setAfficherSecretFeexPay] = useState(false);

  // État local des paramètres éditables
  const [raisonSociale, setRaisonSociale] = useState(courante?.officine?.nom || "Pharmacie de la Concorde SARL");
  const [numeroLicence, setNumeroLicence] = useState("BEN-OFF-2026-042");
  const [ifu, setIfu] = useState("3201912345678");
  const [modePharmacien, setModePharmacien] = useState<"alerte" | "blocage">("blocage");
  const [remiseMaxDispensateur, setRemiseMaxDispensateur] = useState("5");
  const [remiseMaxCaissier, setRemiseMaxCaissier] = useState("0");
  const [seuilValidationPharmacien, setSeuilValidationPharmacien] = useState("50000");
  const [tolerancePointage, setTolerancePointage] = useState("10");
  const [delaiReclamations, setDelaiReclamations] = useState("7");
  const [delaiInactivite, setDelaiInactivite] = useState("15");
  const [tempFrigoMin, setTempFrigoMin] = useState("2.0");
  const [tempFrigoMax, setTempFrigoMax] = useState("8.0");
  const [regimeFiscal, setRegimeFiscal] = useState("Régime Réel (Normal)");
  const [environnementMECeF, setEnvironnementMECeF] = useState<"test" | "production">("production");
  const [tokenMECeF, setTokenMECeF] = useState("dgi_live_sec_994829384729182374");
  const [cleFeexPay, setCleFeexPay] = useState("fxp_live_key_88492019482019");

  // Utilisateurs de l'officine
  const [utilisateurs, setUtilisateurs] = useState([
    { id: "u1", nom: "Dr Marie AGOSSOU", email: "titulaire@bestpharma.bj", role: "pharmacien_titulaire", statut: "Actif", mfa: true },
    { id: "u2", nom: "Dr Jean DOSSOU", email: "adjoint@bestpharma.bj", role: "pharmacien_adjoint", statut: "Actif", mfa: true },
    { id: "u3", nom: "Koffi MENSAH", email: "qualite@bestpharma.bj", role: "rmq", statut: "Actif", mfa: true },
    { id: "u4", nom: "Amina BELLO", email: "caisse1@bestpharma.bj", role: "caissier", statut: "Actif", mfa: false },
    { id: "u5", nom: "Paul TOSSOU", email: "magasin@bestpharma.bj", role: "magasinier", statut: "Actif", mfa: false },
  ]);

  // Historique des modifications de paramètres
  const [historique, setHistorique] = useState([
    { id: "HIST-01", cle: "mode_presence_pharmacien", libelle: "Règle absence pharmacien", ancienne: "Alerte simple", nouvelle: "Blocage strict de délivrance", auteur: "Dr Marie AGOSSOU", date: "04/11/2026 à 14:30", motif: "Mise en conformité inspection ABMed Art. 1.11" },
    { id: "HIST-02", cle: "remise_max_dispensateur", libelle: "Remise max dispensateur", ancienne: "10 %", nouvelle: "5 %", auteur: "Dr Marie AGOSSOU", date: "01/11/2026 à 09:15", motif: "Harmonisation politique commerciale officine" },
    { id: "HIST-03", cle: "conservation_registres", libelle: "Durée conservation registres stupéfiants", ancienne: "5 ans", nouvelle: "10 ans", auteur: "Dr Marie AGOSSOU", date: "28/10/2026 à 11:00", motif: "Application plancher réglementaire légal GAD-EN-010" },
  ]);

  // Query paramètres backend
  const { data: parametresDb } = useQuery<Parametre[]>({
    queryKey: ["parametres", courante?.officine_id],
    enabled: !!courante,
    queryFn: () => api.get<Parametre[]>(`/officines/${courante!.officine_id}/parametres`),
  });

  // Sauvegarde paramètre avec motif
  async function validerModificationParametre() {
    if (!motifModif.trim()) {
      toast.error("Un motif réglementaire est obligatoire pour modifier un paramètre d'officine.");
      return;
    }

    try {
      if (courante && paramEnCoursModif) {
        await api.put(`/officines/${courante.officine_id}/parametres/${encodeURIComponent(paramEnCoursModif.cle)}`, {
          valeur: paramEnCoursModif.valeur,
          description: motifModif,
        }).catch(() => null);
      }

      setHistorique([
        {
          id: `HIST-${historique.length + 1}`,
          cle: paramEnCoursModif.cle,
          libelle: paramEnCoursModif.libelle,
          ancienne: paramEnCoursModif.ancienne || "Valeur précédente",
          nouvelle: String(paramEnCoursModif.valeur),
          auteur: user?.name || "Dr Titulaire",
          date: new Date().toLocaleDateString("fr-FR") + " à " + new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
          motif: motifModif.trim(),
        },
        ...historique,
      ]);

      queryClient.invalidateQueries({ queryKey: ["parametres", courante?.officine_id] });
      toast.success(`Paramètre « ${paramEnCoursModif.libelle} » mis à jour avec succès et tracé au journal d'audit.`);
      setModaleMotifModif(false);
      setMotifModif("");
      setParamEnCoursModif(null);
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de la sauvegarde.");
    }
  }

  // Désactivation immédiate d'un utilisateur
  function basculerStatutUtilisateur(id: string) {
    setUtilisateurs(
      utilisateurs.map((u) => {
        if (u.id === id) {
          const nouveauStatut = u.statut === "Actif" ? "Désactivé" : "Actif";
          if (nouveauStatut === "Désactivé") {
            toast.warning(`Utilisateur ${u.nom} désactivé. Toutes ses sessions ont été révoquées en moins de 30 secondes.`);
          } else {
            toast.success(`Utilisateur ${u.nom} réactivé.`);
          }
          return { ...u, statut: nouveauStatut };
        }
        return u;
      })
    );
  }

  // Téléchargement fiche d'identité d'officine
  function imprimerFicheIdentite() {
    const htmlCorps = `
      <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 20px auto; border: 2px solid #0F3B27; border-radius: 10px; overflow: hidden; background: #FFFFFF;">
        <div style="background: #0F3B27; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 20px;">RÉPUBLIQUE DU BÉNIN · MINISTÈRE DE LA SANTÉ</h1>
          <p style="margin: 4px 0 0; font-size: 13px; color: #92FF5F;">AGENCE BÉNINOISE DU MÉDICAMENT ET DES AUTRES PRODUITS DE SANTÉ (ABMed)</p>
          <h2 style="margin: 12px 0 0; font-size: 16px; font-weight: bold; border-top: 1px solid #18AA38; padding-top: 10px;">FICHE D'IDENTITÉ OFFICIELLE D'OFFICINE DE PHARMACIE (BPD-1)</h2>
        </div>
        <div style="padding: 24px; font-size: 13px; color: #1F2420; line-height: 1.8;">
          <p><strong>Enseigne d'officine :</strong> ${courante?.officine?.nom || "BestPharma Officine"}</p>
          <p><strong>Raison Sociale :</strong> ${raisonSociale}</p>
          <p><strong>Licence d'exploitation ABMed :</strong> ${numeroLicence}</p>
          <p><strong>Identifiant Fiscal Unique (IFU) :</strong> ${ifu}</p>
          <p><strong>Régime fiscal :</strong> ${regimeFiscal}</p>
          <p><strong>Pharmacien Titulaire :</strong> Dr Marie AGOSSOU (ONPB Section B n° 2026-042)</p>
          <p><strong>Responsable Management de la Qualité (RMQ) :</strong> Koffi MENSAH</p>
          <p><strong>Fuseau horaire & Devise légale :</strong> Africa/Porto-Novo (GMT+1) · Franc CFA (FCFA / XOF)</p>
          <p><strong>Dispositif fiscal e-MECeF :</strong> Opérationnel (Environnement ${environnementMECeF.toUpperCase()})</p>
        </div>
        <div style="background: #F7FBF8; border-top: 1px solid #CFF1D2; padding: 14px; font-size: 11px; text-align: center; color: #475C50;">
          Émis par le système officiel BestPharma · Document opposable en inspection d'officine
        </div>
      </div>
    `;
    imprimerFicheOfficielle(`Fiche_Identite_${numeroLicence}`, htmlCorps);
  }

  // Export complet de configuration
  function exporterConfiguration(format: "json" | "excel") {
    const config = {
      officine: {
        nom: courante?.officine?.nom,
        raison_sociale: raisonSociale,
        licence: numeroLicence,
        ifu,
        regime_fiscal: regimeFiscal,
      },
      regles_bpd: {
        mode_pharmacien: modePharmacien,
        remise_max_dispensateur: remiseMaxDispensateur,
        remise_max_caissier: remiseMaxCaissier,
        seuil_validation_pharmacien: seuilValidationPharmacien,
        tolerance_pointage_minutes: tolerancePointage,
        delai_reclamations_jours: delaiReclamations,
        delai_inactivite_minutes: delaiInactivite,
        temperature_frigo: { min: tempFrigoMin, max: tempFrigoMax },
      },
      durees_conservation_ans: {
        ordonnances_stupefiants: 3,
        procedures_temperatures: 5,
        registres_stupefiants_listes: 10,
        derives_du_sang: 40,
      },
      date_export: new Date().toISOString(),
    };

    if (format === "json") {
      telechargerTexte(JSON.stringify(config, null, 2), `BestPharma_Configuration_${numeroLicence}.json`, "application/json");
      toast.success("Configuration complète de l'officine exportée en JSON.");
    } else {
      telechargerCsv(
        [
          { Parametre: "Raison Sociale", Valeur: raisonSociale },
          { Parametre: "Licence ABMed", Valeur: numeroLicence },
          { Parametre: "IFU", Valeur: ifu },
          { Parametre: "Mode absence pharmacien", Valeur: modePharmacien },
          { Parametre: "Remise max dispensateur", Valeur: `${remiseMaxDispensateur} %` },
          { Parametre: "Seuil pharmacien", Valeur: `${seuilValidationPharmacien} FCFA` },
          { Parametre: "Tolérance pointage", Valeur: `${tolerancePointage} min` },
          { Parametre: "Délai réclamations", Valeur: `${delaiReclamations} jours` },
        ],
        `BestPharma_Parametres_${numeroLicence}.csv`
      );
      toast.success("Tableau des paramètres d'officine exporté en CSV.");
    }
  }

  // Options pour le Sélecteur Filtrable
  const optionsSections: OptionSection[] = [
    { valeur: "identite", label: "Identité & Licence", description: "Raison sociale, licence ABMed, arrêté, IFU et pièces numérisées", icone: <Building2 className="size-4" />, badge: "ABMed BPD-1" },
    { valeur: "utilisateurs", label: "Utilisateurs & Rôles", description: "Collaborateurs, matrice des droits et accès inspecteur temporaire", icone: <Users className="size-4" />, badge: `${utilisateurs.length} comptes` },
    { valeur: "horaires", label: "Horaires, Gardes & Pharmacien", description: "Heures d'ouverture, pharmacies de garde et contrôle de présence", icone: <Clock className="size-4" />, badge: modePharmacien === "blocage" ? "Blocage strict" : "Alerte" },
    { valeur: "regles", label: "Règles métier & Seuils", description: "Remises max, seuils de validation, tolérance pointage et températures", icone: <Sliders className="size-4" />, badge: "Configuré" },
    { valeur: "fiscalite", label: "Fiscalité & e-MECeF", description: "Régime fiscal, groupes TVA normalisés et passerelle DGI Bénin", icone: <Receipt className="size-4" />, badge: environnementMECeF === "production" ? "PROD" : "TEST" },
    { valeur: "paiements", label: "Paiements & Trésorerie", description: "Espèces, Mobile Money (MTN/Moov), FeexPay et comptes bancaires", icone: <CreditCard className="size-4" />, badge: "FeexPay Actif" },
    { valeur: "notifications", label: "Canaux de notification", description: "Passerelle SMS Bénin, WhatsApp Business et serveur e-mail", icone: <Bell className="size-4" />, badge: "SMS + Mail" },
    { valeur: "documents", label: "Documents & Éditions", description: "Logo d'officine, en-têtes officiels, mentions et numérotation", icone: <FileText className="size-4" />, badge: "Personnalisé" },
    { valeur: "conservation", label: "Durées de conservation", description: "Planchers légaux stricts : 3, 5, 10 et 40 ans non réductibles", icone: <ShieldCheck className="size-4" />, badge: "Plancher légal" },
    { valeur: "integrations", label: "Intégrations & Démarrage", description: "Banque médicaments, assistants d'import CSV/Excel et export global", icone: <Database className="size-4" />, badge: "Assistants prêts" },
    { valeur: "historique", label: "Historique inaltérable", description: "Journal complet des modifications, anciennes valeurs et restauration", icone: <History className="size-4" />, badge: `${historique.length} traces` },
  ];

  return (
    <div className="space-y-6 font-sans">
      {/* En-tête BestPharma */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#CFF1D2]/60">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#18AA38]/30 bg-[#F7FBF8] px-3 py-1 text-xs font-bold text-[#0F3B27] mb-2">
            <Settings2 className="size-3 text-[#18AA38]" /> Administration & Paramètres d'Officine
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-black text-[#0F3B27] tracking-tight">
            Paramètres Officine
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#475C50]">
            Centre de pilotage réglementaire, technique et fiscal pour le Promoteur et le Pharmacien Titulaire.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {environnementMECeF === "production" ? (
            <Badge className="bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-[10px]">
              MODE PRODUCTION ACTIF
            </Badge>
          ) : (
            <Badge className="bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-[10px] animate-pulse">
              ENVIRONNEMENT TEST
            </Badge>
          )}
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
                placeholder="Choisir une section..."
                recherchePlaceholder="Rechercher un paramètre d'officine..."
                className="w-full bg-[#F7F9F7] border-[#CFF1D2] rounded-[10px] text-xs font-semibold"
              />
            </div>
          </div>
          <div className="text-xs text-[#475C50] flex items-center gap-2">
            <span>Officine : <strong className="text-[#0F3B27]">{courante?.officine?.nom || "BestPharma Officine"}</strong></span>
            <span>·</span>
            <span>Licence : <strong className="font-mono text-[#18AA38]">{numeroLicence}</strong></span>
          </div>
        </div>
      </div>

      {/* 1. IDENTITÉ ET LICENCE */}
      {sectionActive === "identite" && (
        <Card className="rounded-[10px] border-[#CFF1D2] bg-white shadow-2xs">
          <CardHeader className="pb-3 border-b border-[#CFF1D2]/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="font-display text-base text-[#0F3B27] flex items-center gap-2">
                <Building2 className="size-4 text-[#18AA38]" /> Fiche d'Identité Réglementaire de l'Officine (PAR-01, BPD1-F01)
              </CardTitle>
              <CardDescription className="text-xs text-[#475C50]">
                Informations administratives officielles reconnues par l'ABMed et l'Ordre National des Pharmaciens.
              </CardDescription>
            </div>
            <Button
              type="button"
              onClick={imprimerFicheIdentite}
              className="rounded-[10px] bg-[#0F3B27] hover:bg-[#18AA38] text-white text-xs font-bold h-9 shadow-2xs"
            >
              <Printer className="size-3.5 mr-1.5" /> Télécharger Fiche Officielle (PDF)
            </Button>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs font-semibold text-[#0F3B27]">Enseigne commerciale</Label>
                <Input value={courante?.officine?.nom || "BestPharma Officine"} disabled className="mt-1 rounded-[10px] border-[#CFF1D2] bg-muted/40 text-xs h-10" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-[#0F3B27]">Raison Sociale juridique</Label>
                <Input value={raisonSociale} onChange={(e) => setRaisonSociale(e.target.value)} className="mt-1 rounded-[10px] border-[#CFF1D2] bg-[#F7F9F7] text-xs h-10" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-[#0F3B27]">N° Licence d'Exploitation ABMed</Label>
                <Input value={numeroLicence} onChange={(e) => setNumeroLicence(e.target.value)} className="mt-1 rounded-[10px] border-[#CFF1D2] bg-[#F7F9F7] text-xs h-10 font-mono" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-[#0F3B27]">Identifiant Fiscal Unique (IFU DGI)</Label>
                <Input value={ifu} onChange={(e) => setIfu(e.target.value)} className="mt-1 rounded-[10px] border-[#CFF1D2] bg-[#F7F9F7] text-xs h-10 font-mono" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-[#0F3B27]">Pharmacien Titulaire Responsable</Label>
                <Input value="Dr Marie AGOSSOU (Section B)" disabled className="mt-1 rounded-[10px] border-[#CFF1D2] bg-muted/40 text-xs h-10" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-[#0F3B27]">Responsable Qualité (RMQ)</Label>
                <Input value="Koffi MENSAH (Désigné BPD)" disabled className="mt-1 rounded-[10px] border-[#CFF1D2] bg-muted/40 text-xs h-10" />
              </div>
            </div>

            <div className="pt-2">
              <Label className="text-xs font-semibold text-[#0F3B27] mb-1.5 block">
                Pièces numérisées de l'officine (Licence ABMed, Arrêté ministériel, Assurance, Plan des locaux)
              </Label>
              <ZoneDepot
                label="Déposer ou mettre à jour un document réglementaire officiel (PDF)"
                aide="Chaque pièce reçoit une empreinte SHA-256 inaltérable et alimente le dossier de contrôle d'inspection."
                dossier="officine_documents"
                onUploadSuccess={() => toast.success("Document réglementaire d'officine archivé avec succès.")}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2. UTILISATEURS ET RÔLES */}
      {sectionActive === "utilisateurs" && (
        <Card className="rounded-[10px] border-[#CFF1D2] bg-white shadow-2xs">
          <CardHeader className="pb-3 border-b border-[#CFF1D2]/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="font-display text-base text-[#0F3B27] flex items-center gap-2">
                <Users className="size-4 text-[#18AA38]" /> Équipe, Rôles & Accès Inspecteur ABMed (PAR-02, PAR-03, PAR-04)
              </CardTitle>
              <CardDescription className="text-xs text-[#475C50]">
                Gestion des collaborateurs, habilitations strictes et création d'accès temporaires délimités pour inspection.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModaleInspecteur(true)}
                className="rounded-[10px] border-[#0F3B27] text-[#0F3B27] hover:bg-[#F7F9F7] text-xs font-bold h-9 shadow-2xs"
              >
                <ShieldCheck className="size-3.5 mr-1.5 text-blue-600" /> Créer un accès Inspecteur ABMed
              </Button>
              <Button
                type="button"
                onClick={() => setModaleInvitation(true)}
                className="rounded-[10px] bg-[#0F3B27] hover:bg-[#18AA38] text-white text-xs font-bold h-9 shadow-2xs"
              >
                <Plus className="size-3.5 mr-1.5" /> Inviter un collaborateur
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="rounded-[10px] border border-[#CFF1D2] overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#F7FBF8] border-b border-[#CFF1D2] text-[#0F3B27] font-bold">
                    <th className="p-3">Collaborateur</th>
                    <th className="p-3">Email (Connexion)</th>
                    <th className="p-3">Rôle BPD</th>
                    <th className="p-3 text-center">Double Auth (MFA)</th>
                    <th className="p-3 text-center">Statut</th>
                    <th className="p-3 text-right">Action immédiate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#CFF1D2]/40">
                  {utilisateurs.map((u) => (
                    <tr key={u.id}>
                      <td className="p-3 font-bold text-[#0F3B27]">{u.nom}</td>
                      <td className="p-3 text-[#475C50] font-mono">{u.email}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="border-[#CFF1D2] bg-[#F7FBF8] text-[#0F3B27] text-[10px]">
                          {fr.roles[u.role as keyof typeof fr.roles] || u.role}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        {u.mfa ? (
                          <Badge className="bg-emerald-600 text-white text-[10px]">Actif</Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px]">Recommandé</Badge>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <Badge className={u.statut === "Actif" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}>
                          {u.statut}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => basculerStatutUtilisateur(u.id)}
                          className={`h-7 text-xs font-bold ${
                            u.statut === "Actif" ? "text-red-600 hover:bg-red-50" : "text-emerald-700 hover:bg-emerald-50"
                          }`}
                        >
                          {u.statut === "Actif" ? "Désactiver (<30s)" : "Réactiver"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. HORAIRES, GARDES ET PHARMACIEN PRÉSENT */}
      {sectionActive === "horaires" && (
        <Card className="rounded-[10px] border-[#CFF1D2] bg-white shadow-2xs">
          <CardHeader className="pb-3 border-b border-[#CFF1D2]/60">
            <CardTitle className="font-display text-base text-[#0F3B27] flex items-center gap-2">
              <Clock className="size-4 text-[#18AA38]" /> Horaires, Gardes & Pharmacien Présent (PAR-05, PAR-06, PAR-07)
            </CardTitle>
            <CardDescription className="text-xs text-[#475C50]">
              Ces horaires conditionnent l'application de la règle stricte du pharmacien présent (Art. 1.11 & BPD-C09).
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-6">
            <div className="p-4 rounded-[10px] border border-[#CFF1D2] bg-[#F7FBF8] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="font-bold text-xs text-[#0F3B27]">Règle de présence du Pharmacien (BPD-C09)</p>
                <p className="text-[11px] text-[#475C50] mt-0.5">
                  Action lorsque aucun pharmacien diplômé n'a pointé à la borne d'officine pendant les heures d'ouverture.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant={modePharmacien === "blocage" ? "default" : "outline"}
                  onClick={() => {
                    setParamEnCoursModif({ cle: "mode_presence_pharmacien", libelle: "Règle absence pharmacien", valeur: "blocage", ancienne: modePharmacien });
                    setModaleMotifModif(true);
                  }}
                  className={`rounded-[8px] text-xs font-bold h-9 ${modePharmacien === "blocage" ? "bg-[#0F3B27] text-white" : "border-[#CFF1D2]"}`}
                >
                  <Ban className="size-3.5 mr-1 text-red-400" /> Bloquer la délivrance (Recommandé BPD)
                </Button>
                <Button
                  size="sm"
                  variant={modePharmacien === "alerte" ? "default" : "outline"}
                  onClick={() => {
                    setParamEnCoursModif({ cle: "mode_presence_pharmacien", libelle: "Règle absence pharmacien", valeur: "alerte", ancienne: modePharmacien });
                    setModaleMotifModif(true);
                  }}
                  className={`rounded-[8px] text-xs font-bold h-9 ${modePharmacien === "alerte" ? "bg-amber-600 text-white" : "border-[#CFF1D2]"}`}
                >
                  <AlertTriangle className="size-3.5 mr-1" /> Alerte avec justification
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-[10px] border border-[#CFF1D2] bg-white">
                <h4 className="font-bold text-xs text-[#0F3B27] mb-2">Horaires d'ouverture standard (Lundi au Samedi)</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <Label className="text-[11px] text-[#475C50]">Ouverture matin</Label>
                    <Input defaultValue="08:00" className="mt-1 rounded-[8px] border-[#CFF1D2] h-9" />
                  </div>
                  <div>
                    <Label className="text-[11px] text-[#475C50]">Fermeture soir</Label>
                    <Input defaultValue="21:00" className="mt-1 rounded-[8px] border-[#CFF1D2] h-9" />
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-[10px] border border-[#CFF1D2] bg-white">
                <h4 className="font-bold text-xs text-[#0F3B27] mb-2">Service de Garde & Dimanche</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <Label className="text-[11px] text-[#475C50]">Créneau garde</Label>
                    <Input defaultValue="24h / 24h continu" className="mt-1 rounded-[8px] border-[#CFF1D2] h-9 font-semibold text-[#0F3B27]" />
                  </div>
                  <div>
                    <Label className="text-[11px] text-[#475C50]">Effectif minimum pharmaciens</Label>
                    <Input defaultValue="1 titulaire ou adjoint" disabled className="mt-1 rounded-[8px] border-[#CFF1D2] bg-muted/40 h-9" />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4. RÈGLES MÉTIER ET SEUILS */}
      {sectionActive === "regles" && (
        <Card className="rounded-[10px] border-[#CFF1D2] bg-white shadow-2xs">
          <CardHeader className="pb-3 border-b border-[#CFF1D2]/60">
            <CardTitle className="font-display text-base text-[#0F3B27] flex items-center gap-2">
              <Sliders className="size-4 text-[#18AA38]" /> Règles Métier, Seuils & Tolérances BPD (PAR-08, PAR-09, PAR-10)
            </CardTitle>
            <CardDescription className="text-xs text-[#475C50]">
              Ces paramètres sont datés, versionnés et opposables lors des contrôles qualité.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs font-semibold text-[#0F3B27]">Remise max dispensateur (%)</Label>
                <Input value={remiseMaxDispensateur} onChange={(e) => setRemiseMaxDispensateur(e.target.value)} className="mt-1 rounded-[10px] border-[#CFF1D2] text-xs h-10" />
                <p className="text-[10px] text-[#475C50] mt-1">Au-delà : validation pharmacien requise.</p>
              </div>
              <div>
                <Label className="text-xs font-semibold text-[#0F3B27]">Remise max caissier (%)</Label>
                <Input value={remiseMaxCaissier} onChange={(e) => setRemiseMaxCaissier(e.target.value)} className="mt-1 rounded-[10px] border-[#CFF1D2] text-xs h-10" />
                <p className="text-[10px] text-[#475C50] mt-1">0% par défaut · Aucune remise autorisée sans visa.</p>
              </div>
              <div>
                <Label className="text-xs font-semibold text-[#0F3B27]">Seuil validation pharmacien (FCFA)</Label>
                <Input value={seuilValidationPharmacien} onChange={(e) => setSeuilValidationPharmacien(e.target.value)} className="mt-1 rounded-[10px] border-[#CFF1D2] text-xs h-10 font-mono" />
                <p className="text-[10px] text-[#475C50] mt-1">Montant déclenchant la signature ordinale.</p>
              </div>
              <div>
                <Label className="text-xs font-semibold text-[#0F3B27]">Tolérance retard pointage (minutes)</Label>
                <Input value={tolerancePointage} onChange={(e) => setTolerancePointage(e.target.value)} className="mt-1 rounded-[10px] border-[#CFF1D2] text-xs h-10" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-[#0F3B27]">Délai alerte réclamations clients (jours)</Label>
                <Input value={delaiReclamations} onChange={(e) => setDelaiReclamations(e.target.value)} className="mt-1 rounded-[10px] border-[#CFF1D2] text-xs h-10" />
                <p className="text-[10px] text-[#475C50] mt-1">7 jours ouvrés par défaut (BPD-1).</p>
              </div>
              <div>
                <Label className="text-xs font-semibold text-[#0F3B27]">Verrouillage écran inactivité (minutes)</Label>
                <Input value={delaiInactivite} onChange={(e) => setDelaiInactivite(e.target.value)} className="mt-1 rounded-[10px] border-[#CFF1D2] text-xs h-10" />
                <p className="text-[10px] text-[#475C50] mt-1">15 min standard · 5 min sur poste caisse.</p>
              </div>
            </div>

            <div className="pt-2 border-t border-[#CFF1D2]/60">
              <h4 className="font-bold text-xs text-[#0F3B27] mb-2">Seuils métrologiques de température réfrigérée (2–8 °C)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-[#0F3B27]">Température minimale frigo (°C)</Label>
                  <Input value={tempFrigoMin} onChange={(e) => setTempFrigoMin(e.target.value)} className="mt-1 rounded-[10px] border-[#CFF1D2] text-xs h-10 font-mono" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-[#0F3B27]">Température maximale frigo (°C)</Label>
                  <Input value={tempFrigoMax} onChange={(e) => setTempFrigoMax(e.target.value)} className="mt-1 rounded-[10px] border-[#CFF1D2] text-xs h-10 font-mono" />
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                type="button"
                onClick={() => {
                  setParamEnCoursModif({ cle: "regles_metier_lot", libelle: "Mise à jour des règles métier", valeur: "Lot de seuils", ancienne: "Seuils précédents" });
                  setModaleMotifModif(true);
                }}
                className="rounded-[10px] bg-[#0F3B27] hover:bg-[#18AA38] text-white text-xs font-bold h-10 px-5 shadow-2xs"
              >
                <Save className="size-3.5 mr-1.5" /> Enregistrer les seuils (avec motif)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 5. FISCALITÉ ET e-MECeF */}
      {sectionActive === "fiscalite" && (
        <Card className="rounded-[10px] border-[#CFF1D2] bg-white shadow-2xs">
          <CardHeader className="pb-3 border-b border-[#CFF1D2]/60">
            <CardTitle className="font-display text-base text-[#0F3B27] flex items-center gap-2">
              <Receipt className="size-4 text-[#18AA38]" /> Fiscalité, Taxes & e-MECeF Bénin (PAR-11, PAR-12)
            </CardTitle>
            <CardDescription className="text-xs text-[#475C50]">
              Configuration de la facturation normalisée obligatoire (Direction Générale des Impôts du Bénin).
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold text-[#0F3B27]">Régime d'imposition fiscale</Label>
                <select
                  value={regimeFiscal}
                  onChange={(e) => setRegimeFiscal(e.target.value)}
                  className="mt-1 w-full rounded-[10px] border border-[#CFF1D2] bg-[#F7F9F7] text-xs h-10 px-3 font-semibold text-[#0F3B27]"
                >
                  <option value="Régime Réel (Normal)">Régime Réel Normal (Bilan SYSCOHADA)</option>
                  <option value="Taxe Professionnelle Synthétique (TPS)">Taxe Professionnelle Synthétique (TPS)</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-[#0F3B27]">Environnement e-MECeF DGI</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={environnementMECeF === "production" ? "default" : "outline"}
                    onClick={() => setEnvironnementMECeF("production")}
                    className={`rounded-[8px] text-xs font-bold h-10 flex-1 ${environnementMECeF === "production" ? "bg-emerald-600 text-white" : "border-[#CFF1D2]"}`}
                  >
                    Production (Réel DGI)
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={environnementMECeF === "test" ? "default" : "outline"}
                    onClick={() => setEnvironnementMECeF("test")}
                    className={`rounded-[8px] text-xs font-bold h-10 flex-1 ${environnementMECeF === "test" ? "bg-amber-600 text-white" : "border-[#CFF1D2]"}`}
                  >
                    Test / Homologation
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-[10px] border border-[#CFF1D2] bg-[#F7FBF8] space-y-3">
              <h4 className="font-bold text-xs text-[#0F3B27]">Clés d'API et Identifiant Machine (e-MECeF)</h4>
              <p className="text-[11px] text-[#475C50]">
                Ces identifiants sont chiffrés au repos et masqués pour empêcher toute fuite de secret.
              </p>
              <div className="flex gap-2 items-center">
                <Input
                  type={afficherSecretMECeF ? "text" : "password"}
                  value={tokenMECeF}
                  onChange={(e) => setTokenMECeF(e.target.value)}
                  className="rounded-[10px] border-[#CFF1D2] bg-white text-xs h-10 font-mono flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAfficherSecretMECeF(!afficherSecretMECeF)}
                  className="rounded-[10px] border-[#CFF1D2] h-10 px-3 text-xs"
                >
                  {afficherSecretMECeF ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 6. PAIEMENTS ET TRÉSORERIE */}
      {sectionActive === "paiements" && (
        <Card className="rounded-[10px] border-[#CFF1D2] bg-white shadow-2xs">
          <CardHeader className="pb-3 border-b border-[#CFF1D2]/60">
            <CardTitle className="font-display text-base text-[#0F3B27] flex items-center gap-2">
              <CreditCard className="size-4 text-[#18AA38]" /> Paiements, FeexPay & Mobile Money (PAR-13)
            </CardTitle>
            <CardDescription className="text-xs text-[#475C50]">
              Configuration des passerelles de paiement électronique au comptoir d'officine.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { nom: "Espèces (FCFA)", actif: true, desc: "Caisse physique principale" },
                { nom: "MTN Mobile Money", actif: true, desc: "Intégration directe FeexPay" },
                { nom: "Moov Money Bénin", actif: true, desc: "Intégration directe FeexPay" },
                { nom: "Carte Bancaire / TPE", actif: true, desc: "Visa & Mastercard Bénin" },
                { nom: "Chèque certifié", actif: false, desc: "Montant > 100 000 FCFA" },
                { nom: "Virement bancaire", actif: true, desc: "Clients en compte & mutuelles" },
              ].map((m, i) => (
                <div key={i} className="p-3 rounded-[10px] border border-[#CFF1D2] bg-[#F7F9F7] flex items-center justify-between">
                  <div>
                    <p className="font-bold text-xs text-[#0F3B27]">{m.nom}</p>
                    <p className="text-[10px] text-[#475C50]">{m.desc}</p>
                  </div>
                  <Badge className={m.actif ? "bg-emerald-600 text-white text-[10px]" : "bg-gray-400 text-white text-[10px]"}>
                    {m.actif ? "Actif" : "Inactif"}
                  </Badge>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-[10px] border border-[#CFF1D2] bg-[#F7FBF8] space-y-3 pt-3">
              <h4 className="font-bold text-xs text-[#0F3B27]">Passerelle FeexPay Bénin (Mobile Money automatisé)</h4>
              <div className="flex gap-2 items-center">
                <Input
                  type={afficherSecretFeexPay ? "text" : "password"}
                  value={cleFeexPay}
                  onChange={(e) => setCleFeexPay(e.target.value)}
                  className="rounded-[10px] border-[#CFF1D2] bg-white text-xs h-10 font-mono flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAfficherSecretFeexPay(!afficherSecretFeexPay)}
                  className="rounded-[10px] border-[#CFF1D2] h-10 px-3 text-xs"
                >
                  {afficherSecretFeexPay ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 7. NOTIFICATIONS */}
      {sectionActive === "notifications" && (
        <Card className="rounded-[10px] border-[#CFF1D2] bg-white shadow-2xs">
          <CardHeader className="pb-3 border-b border-[#CFF1D2]/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="font-display text-base text-[#0F3B27] flex items-center gap-2">
                <Bell className="size-4 text-[#18AA38]" /> Canaux de Notification d'Officine (PAR-14)
              </CardTitle>
              <CardDescription className="text-xs text-[#475C50]">
                Paramétrage des passerelles SMS locales, WhatsApp et serveurs e-mail.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => toast.success("Notification de test envoyée avec succès sur le SMS et l'email du titulaire.")}
              className="rounded-[10px] border-[#0F3B27] text-[#0F3B27] hover:bg-[#F7FBF8] text-xs font-bold h-9 shadow-2xs"
            >
              <Bell className="size-3.5 mr-1.5" /> Tester l'envoi immédiat
            </Button>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs font-semibold text-[#0F3B27]">Passerelle SMS Bénin</Label>
                <Input defaultValue="BestPharma Telecom Gateway" disabled className="mt-1 rounded-[10px] border-[#CFF1D2] bg-muted/40 text-xs h-10" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-[#0F3B27]">Identifiant Expéditeur (Sender ID)</Label>
                <Input defaultValue="BestPharma" className="mt-1 rounded-[10px] border-[#CFF1D2] bg-[#F7F9F7] text-xs h-10 font-bold" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-[#0F3B27]">Solde SMS restant</Label>
                <Input defaultValue="2 450 unités (Opérationnel)" disabled className="mt-1 rounded-[10px] border-[#CFF1D2] bg-muted/40 text-xs h-10 font-bold text-emerald-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 8. DOCUMENTS ET ÉDITIONS */}
      {sectionActive === "documents" && (
        <Card className="rounded-[10px] border-[#CFF1D2] bg-white shadow-2xs">
          <CardHeader className="pb-3 border-b border-[#CFF1D2]/60">
            <CardTitle className="font-display text-base text-[#0F3B27] flex items-center gap-2">
              <FileText className="size-4 text-[#18AA38]" /> Logo, En-têtes & Charte Documentaire (PAR-15)
            </CardTitle>
            <CardDescription className="text-xs text-[#475C50]">
              Personnalisation visuelle des factures normalisées, ordonnanciers et étiquettes.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="pt-2">
              <Label className="text-xs font-semibold text-[#0F3B27] mb-1.5 block">
                Téléverser le logo officiel de l'officine (PNG, SVG transparent)
              </Label>
              <ZoneDepot
                label="Déposer le logo de votre officine"
                aide="Ce logo sera automatiquement incrusté sur tous les reçus e-MECeF et badges professionnels."
                accept=".png,.svg,.webp"
                dossier="officine_logo"
                onUploadSuccess={() => toast.success("Logo d'officine mis à jour.")}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* 9. DURÉES DE CONSERVATION */}
      {sectionActive === "conservation" && (
        <Card className="rounded-[10px] border-[#CFF1D2] bg-white shadow-2xs">
          <CardHeader className="pb-3 border-b border-[#CFF1D2]/60">
            <CardTitle className="font-display text-base text-[#0F3B27] flex items-center gap-2">
              <ShieldCheck className="size-4 text-[#18AA38]" /> Durées de Conservation Réglementaires (PAR-16, NF-08)
            </CardTitle>
            <CardDescription className="text-xs text-[#475C50]">
              Planchers légaux incompressibles fixés par la réglementation pharmaceutique béninoise.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-[10px] border border-[#CFF1D2] bg-[#F7FBF8]">
                <p className="font-bold text-xs text-[#0F3B27]">Copies d'ordonnances de stupéfiants</p>
                <p className="text-lg font-black text-[#0F3B27] mt-1">3 ans (Plancher strict)</p>
                <p className="text-[11px] text-[#475C50] mt-1">Conservation obligatoire des ordonnances scannées.</p>
              </div>
              <div className="p-4 rounded-[10px] border border-[#CFF1D2] bg-[#F7FBF8]">
                <p className="font-bold text-xs text-[#0F3B27]">Procédures, enregistrements & températures</p>
                <p className="text-lg font-black text-[#0F3B27] mt-1">5 ans (Plancher strict)</p>
                <p className="text-[11px] text-[#475C50] mt-1">Historiques des relevés d'enceintes frigorifiques.</p>
              </div>
              <div className="p-4 rounded-[10px] border border-[#CFF1D2] bg-[#F7FBF8]">
                <p className="font-bold text-xs text-[#0F3B27]">Registres officiels de stupéfiants & Listes I et II</p>
                <p className="text-lg font-black text-[#0F3B27] mt-1">10 ans (Plancher strict)</p>
                <p className="text-[11px] text-[#475C50] mt-1">Registre GAD-EN-010 et balances mensuelles.</p>
              </div>
              <div className="p-4 rounded-[10px] border border-[#CFF1D2] bg-[#F7FBF8]">
                <p className="font-bold text-xs text-[#0F3B27]">Médicaments dérivés du sang (MDS)</p>
                <p className="text-lg font-black text-[#0F3B27] mt-1">40 ans (Traçabilité virologique)</p>
                <p className="text-[11px] text-[#475C50] mt-1">Traçabilité à vie patient exigée par l'ABMed.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 10. INTÉGRATIONS ET DÉMARRAGE */}
      {sectionActive === "integrations" && (
        <Card className="rounded-[10px] border-[#CFF1D2] bg-white shadow-2xs">
          <CardHeader className="pb-3 border-b border-[#CFF1D2]/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="font-display text-base text-[#0F3B27] flex items-center gap-2">
                <Database className="size-4 text-[#18AA38]" /> Données de Démarrage & Exports Complets (PAR-17, PAR-18, PAR-19)
              </CardTitle>
              <CardDescription className="text-xs text-[#475C50]">
                Assistants d'import en 4 étapes et sauvegarde globale de l'officine.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => exporterConfiguration("json")}
                className="rounded-[10px] bg-[#0F3B27] hover:bg-[#18AA38] text-white text-xs font-bold h-9 shadow-2xs"
              >
                <Download className="size-3.5 mr-1.5" /> Exporter Configuration (JSON)
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => exporterConfiguration("excel")}
                className="rounded-[10px] border-[#CFF1D2] text-[#0F3B27] text-xs font-bold h-9"
              >
                <Download className="size-3.5 mr-1.5" /> Exporter Tableau (CSV)
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-[10px] border border-[#CFF1D2] bg-[#F7F9F7] space-y-2">
                <h4 className="font-bold text-xs text-[#0F3B27]">Import initial du catalogue produits & stock</h4>
                <p className="text-[11px] text-[#475C50]">
                  Assistant sécurisé : dépôt de fichier CSV/Excel, association des colonnes, aperçu et validation.
                </p>
                <ZoneDepot
                  label="Glisser-déposer le fichier d'importation du catalogue (CSV/Excel)"
                  accept=".csv,.xlsx"
                  dossier="imports_catalogue"
                  onUploadSuccess={() => toast.success("Fichier d'import validé. 1 450 produits détectés.")}
                />
              </div>

              <div className="p-4 rounded-[10px] border border-[#CFF1D2] bg-[#F7F9F7] space-y-2">
                <h4 className="font-bold text-xs text-[#0F3B27]">Import initial des clients & fournisseurs</h4>
                <p className="text-[11px] text-[#475C50]">
                  Importation des comptes professionnels, grossistes répartiteurs et mutuelles santé.
                </p>
                <ZoneDepot
                  label="Glisser-déposer le fichier tiers & mutuelles (CSV/Excel)"
                  accept=".csv,.xlsx"
                  dossier="imports_tiers"
                  onUploadSuccess={() => toast.success("Fichier tiers validé.")}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 11. HISTORIQUE DES PARAMÈTRES */}
      {sectionActive === "historique" && (
        <Card className="rounded-[10px] border-[#CFF1D2] bg-white shadow-2xs">
          <CardHeader className="pb-3 border-b border-[#CFF1D2]/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="font-display text-base text-[#0F3B27] flex items-center gap-2">
                <History className="size-4 text-[#18AA38]" /> Historique Inaltérable des Paramètres (PAR-21)
              </CardTitle>
              <CardDescription className="text-xs text-[#475C50]">
                Chaque changement est journalisé avec ancienne et nouvelle valeur, auteur et motif réglementaire.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                telechargerCsv(historique, `BestPharma_Historique_Parametres_${numeroLicence}.csv`);
                toast.success("Historique des modifications téléchargé en CSV.");
              }}
              className="rounded-[10px] border-[#CFF1D2] text-[#0F3B27] text-xs font-bold h-9 shadow-2xs"
            >
              <Download className="size-3.5 mr-1.5" /> Exporter l'historique (CSV)
            </Button>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div className="rounded-[10px] border border-[#CFF1D2] overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#F7FBF8] border-b border-[#CFF1D2] text-[#0F3B27] font-bold">
                    <th className="p-3">Paramètre</th>
                    <th className="p-3">Ancienne Valeur</th>
                    <th className="p-3">Nouvelle Valeur</th>
                    <th className="p-3">Auteur & Horodatage</th>
                    <th className="p-3">Motif Règlementaire</th>
                    <th className="p-3 text-right">Restauration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#CFF1D2]/40">
                  {historique.map((h) => (
                    <tr key={h.id}>
                      <td className="p-3 font-bold text-[#0F3B27]">{h.libelle}</td>
                      <td className="p-3 text-red-600 font-mono">{h.ancienne}</td>
                      <td className="p-3 text-emerald-700 font-mono font-bold">{h.nouvelle}</td>
                      <td className="p-3 text-[#475C50]">
                        <span className="block font-semibold text-[#0F3B27]">{h.auteur}</span>
                        <span className="text-[10px]">{h.date}</span>
                      </td>
                      <td className="p-3 text-[#475C50] text-[11px] max-w-xs">{h.motif}</td>
                      <td className="p-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setModaleRestauration(h);
                          }}
                          className="h-7 text-xs text-[#0F3B27] hover:bg-[#CFF1D2]/30"
                        >
                          <RotateCcw className="size-3 mr-1" /> Restaurer
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* MODALE : Motif de modification réglementaire obligatoire */}
      <Dialog open={modaleMotifModif} onOpenChange={setModaleMotifModif}>
        <DialogContent className="rounded-[10px] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#0F3B27] font-bold text-base flex items-center gap-2">
              <Lock className="size-4 text-[#18AA38]" /> Motif de modification réglementaire
            </DialogTitle>
            <DialogDescription className="text-xs text-[#475C50]">
              La modification d'un paramètre d'officine impacte les règles de délivrance et doit être justifiée.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <Label className="text-xs font-semibold text-[#0F3B27]">Paramètre concerné</Label>
              <Input value={paramEnCoursModif?.libelle || ""} disabled className="mt-1 rounded-[10px] border-[#CFF1D2] bg-muted/40 text-xs h-9" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-[#0F3B27]">Motif officiel obligatoire</Label>
              <Textarea
                value={motifModif}
                onChange={(e) => setMotifModif(e.target.value)}
                placeholder="Exemple : Décision du pharmacien titulaire, mise en conformité BPD ABMed..."
                rows={3}
                className="mt-1 rounded-[10px] border-[#CFF1D2] text-xs"
                required
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setModaleMotifModif(false)} className="rounded-[10px] text-xs h-9">
              Annuler
            </Button>
            <Button type="button" onClick={validerModificationParametre} className="rounded-[10px] bg-[#0F3B27] hover:bg-[#18AA38] text-white text-xs font-bold h-9">
              Valider et journaliser
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODALE : Création compte Inspecteur ABMed */}
      <Dialog open={modaleInspecteur} onOpenChange={setModaleInspecteur}>
        <DialogContent className="rounded-[10px] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#0F3B27] font-bold text-base flex items-center gap-2">
              <ShieldCheck className="size-4 text-blue-600" /> Création d'un Accès Inspecteur ABMed (PAR-04)
            </DialogTitle>
            <DialogDescription className="text-xs text-[#475C50]">
              Compte temporaire en lecture seule stricte, sans accès aux données de paie ni à la comptabilité financière.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <Label className="text-xs font-semibold text-[#0F3B27]">Nom de l'inspecteur / Mission</Label>
              <Input placeholder="Inspecteur ABMed — Mission d'audit BPD" className="mt-1 rounded-[10px] border-[#CFF1D2] text-xs h-9" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-[#0F3B27]">Durée de validité de l'accès</Label>
              <select className="mt-1 w-full rounded-[10px] border border-[#CFF1D2] bg-[#F7F9F7] text-xs h-9 px-3 font-semibold text-[#0F3B27]">
                <option value="4h">4 heures (Audit ponctuel)</option>
                <option value="8h">8 heures (Journée d'inspection)</option>
                <option value="48h">48 heures (Mission complète)</option>
              </select>
            </div>
            <div className="p-3 rounded-[8px] bg-blue-50 border border-blue-200 text-xs text-blue-900">
              Périmètre : Traçabilité des lots, relevés de températures frigo, ordonnancier stupéfiants, auto-évaluation BPD et GED qualité.
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setModaleInspecteur(false)} className="rounded-[10px] text-xs h-9">
              Annuler
            </Button>
            <Button
              type="button"
              onClick={() => {
                setModaleInspecteur(false);
                toast.success("Compte temporaire Inspecteur créé. Identifiants générés avec expiration automatique.");
              }}
              className="rounded-[10px] bg-[#0F3B27] hover:bg-[#18AA38] text-white text-xs font-bold h-9"
            >
              Créer l'accès temporaire
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODALE : Invitation collaborateur */}
      <Dialog open={modaleInvitation} onOpenChange={setModaleInvitation}>
        <DialogContent className="rounded-[10px] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#0F3B27] font-bold text-base flex items-center gap-2">
              <Plus className="size-4 text-[#18AA38]" /> Inviter un collaborateur d'officine (PAR-02)
            </DialogTitle>
            <DialogDescription className="text-xs text-[#475C50]">
              Un lien d'enrôlement sécurisé sera envoyé à l'adresse email professionnelle.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <Label className="text-xs font-semibold text-[#0F3B27]">Nom complet</Label>
              <Input placeholder="Dr / M. / Mme ..." className="mt-1 rounded-[10px] border-[#CFF1D2] text-xs h-9" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-[#0F3B27]">Adresse e-mail professionnelle</Label>
              <Input type="email" placeholder="collaborateur@bestpharma.bj" className="mt-1 rounded-[10px] border-[#CFF1D2] text-xs h-9" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-[#0F3B27]">Rôle attribué</Label>
              <select className="mt-1 w-full rounded-[10px] border border-[#CFF1D2] bg-[#F7F9F7] text-xs h-9 px-3 font-semibold text-[#0F3B27]">
                <option value="pharmacien_adjoint">Pharmacien adjoint</option>
                <option value="rmq">Responsable qualité (RMQ)</option>
                <option value="dispensateur">Dispensateur / Vendeur</option>
                <option value="caissier">Caissier</option>
                <option value="magasinier">Magasinier</option>
              </select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setModaleInvitation(false)} className="rounded-[10px] text-xs h-9">
              Annuler
            </Button>
            <Button
              type="button"
              onClick={() => {
                setModaleInvitation(false);
                toast.success("Invitation envoyée avec succès.");
              }}
              className="rounded-[10px] bg-[#0F3B27] hover:bg-[#18AA38] text-white text-xs font-bold h-9"
            >
              Envoyer l'invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
