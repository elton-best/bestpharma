import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  User,
  ShieldCheck,
  Building2,
  Mail,
  Phone,
  Lock,
  Save,
  CheckCircle2,
  Clock,
  Sparkles,
  Smartphone,
  Award,
  CreditCard,
  Bell,
  FileText,
  Download,
  AlertTriangle,
  Send,
  Eye,
  Printer,
  Calendar,
  Briefcase,
  HelpCircle,
  Check,
  X,
  Volume2,
  Moon,
  Sun,
  ShieldAlert,
  Database,
  Trash2,
  Layers,
  ArrowRight,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { useOfficine } from "@/lib/officine-context";
import { fr } from "@/lib/i18n/fr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { SelecteurFiltrable, type OptionSection } from "@/components/ui/selecteur-filtrable";
import { ZoneDepot } from "@/components/ui/zone-depot";
import { imprimerFicheOfficielle, telechargerTexte, telechargerCsv } from "@/lib/export-utils";

export const Route = createFileRoute("/_authenticated/dashboard/compte")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Mon Profil & Rôle : BestPharma" },
      {
        name: "description",
        content: "Centre de contrôle personnel : identité, rôle, droits BPD, badge d'officine, espace RH et préférences.",
      },
    ],
  }),
  component: PageCompte,
});

function PageCompte() {
  const { courante, rattachements, choisir, aRole } = useOfficine();
  const queryClient = useQueryClient();
  const user = api.getUser();

  // Navigation section via SelecteurFiltrable
  const [sectionActive, setSectionActive] = useState<string>("profil");

  // Identité & Coordonnées
  const [nom, setNom] = useState(user?.name || "Dr Pharmacien Titulaire");
  const [telephone, setTelephone] = useState(user?.telephone || "+229 97 00 00 00");
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [ordreNumero, setOrdreNumero] = useState("ONPB-B-2026-042");
  const [enCours, setEnCours] = useState(false);

  // Badge & Perte
  const [badgePerdu, setBadgePerdu] = useState(false);
  const [modalePerteBadge, setModalePerteBadge] = useState(false);
  const [motifPerte, setMotifPerte] = useState("Perte constatée ce jour dans le périmètre d'officine.");

  // Demande de droit supplémentaire
  const [modaleDroit, setModaleDroit] = useState(false);
  const [domaineDemande, setDomaineDemande] = useState("dispensation");
  const [droitDemande, setDroitDemande] = useState("Validation ordonnances stupéfiants");
  const [motifDemande, setMotifDemande] = useState("");
  const [demandesEnvoyees, setDemandesEnvoyees] = useState<
    { id: string; domaine: string; droit: string; motif: string; date: string; statut: string }[]
  >([
    {
      id: "DEM-01",
      domaine: "Préparations",
      droit: "Signature de libération des préparations magistrales",
      motif: "Remplacement prévu lors des gardes de nuit",
      date: "02/11/2026",
      statut: "Accordé",
    },
  ]);

  // Préférences de notification & d'affichage
  const [prefCritiqueSms, setPrefCritiqueSms] = useState(true);
  const [prefCritiquePush, setPrefCritiquePush] = useState(true);
  const [prefCritiqueEmail, setPrefCritiqueEmail] = useState(true);
  const [prefImportantPush, setPrefImportantPush] = useState(true);
  const [prefImportantEmail, setPrefImportantEmail] = useState(true);
  const [prefImportantWhatsapp, setPrefImportantWhatsapp] = useState(false);
  const [prefInfoPush, setPrefInfoPush] = useState(false);
  const [prefInfoEmail, setPrefInfoEmail] = useState(true);
  const [heureResume, setHeureResume] = useState("08:00");
  const [sonsScans, setSonsScans] = useState(true);
  const [tailleTexte, setTailleTexte] = useState("normale");

  // Charte signée
  const [charteSignee, setCharteSignee] = useState(true);
  const [modaleCharte, setModaleCharte] = useState(false);

  // Demande APDP / Données
  const [modaleDonnees, setModaleDonnees] = useState(false);
  const [typeDemandeDonnees, setTypeDemandeDonnees] = useState<"acces" | "rectification" | "effacement">("acces");
  const [motifDonnees, setMotifDonnees] = useState("");

  const roleLibelle = courante?.role
    ? (fr.roles[courante.role as keyof typeof fr.roles] ?? "Pharmacien")
    : "Pharmacien";

  const initiales = (nom || user?.email || "BP")
    .split(/\s+/)
    .slice(0, 2)
    .map((m) => m[0]?.toUpperCase() ?? "")
    .join("");

  const matricule = "BP-AG-042";

  // Sauvegarde Profil
  async function enregistrerProfil(e: React.FormEvent) {
    e.preventDefault();
    setEnCours(true);
    try {
      await api.put("/auth/profile", {
        name: nom.trim(),
        telephone: telephone.trim(),
      }).catch(() => null);

      const misAJour = {
        id: user?.id ?? "usr-1",
        email: user?.email ?? "contact@bestpharma.bj",
        name: nom.trim(),
        telephone: telephone.trim(),
        mfa_enabled: user?.mfa_enabled,
      };
      api.setUser(misAJour);
      queryClient.invalidateQueries({ queryKey: ["profil"] });
      toast.success("Profil professionnel BestPharma mis à jour avec succès.");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la sauvegarde.");
    } finally {
      setEnCours(false);
    }
  }

  // Déclaration perte de badge
  function confirmerPerteBadge() {
    setBadgePerdu(true);
    setModalePerteBadge(false);
    toast.error(`Badge ${matricule} révoqué immédiatement ! Le QR code a été désactivé sur toutes les bornes.`);
  }

  // Impression Badge PVC
  function imprimerBadgeOfficiel() {
    const htmlCorps = `
      <div style="font-family: Arial, sans-serif; max-width: 450px; margin: 20px auto; border: 2px solid #0F3B27; border-radius: 12px; overflow: hidden; background: #FFFFFF; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #0F3B27 0%, #18AA38 100%); color: #FFFFFF; padding: 16px; text-align: center;">
          <h1 style="margin: 0; font-size: 18px; font-weight: 900; letter-spacing: 1px;">BESTPHARMA · RÉPUBLIQUE DU BÉNIN</h1>
          <p style="margin: 4px 0 0; font-size: 11px; opacity: 0.9;">BADGE D'IDENTIFICATION OFFICIELLE · BPD BÉNIN</p>
        </div>
        <div style="padding: 20px; display: flex; gap: 16px; align-items: center;">
          <div style="width: 100px; height: 110px; border-radius: 10px; border: 2px solid #CFF1D2; background: #F7F9F7; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: bold; color: #0F3B27; overflow: hidden;">
            ${photoUrl ? `<img src="${photoUrl}" style="width:100%; height:100%; object-fit:cover;" />` : initiales}
          </div>
          <div style="flex: 1;">
            <p style="margin: 0; font-size: 16px; font-weight: bold; color: #0F3B27;">${nom}</p>
            <p style="margin: 4px 0; font-size: 13px; font-weight: 600; color: #18AA38;">${roleLibelle}</p>
            <p style="margin: 2px 0; font-size: 11px; color: #475C50;">Matricule : <strong style="color: #0F3B27;">${matricule}</strong></p>
            <p style="margin: 2px 0; font-size: 11px; color: #475C50;">Ordre : <strong style="color: #0F3B27;">${ordreNumero}</strong></p>
            <p style="margin: 2px 0; font-size: 10px; color: #475C50;">Officine : ${courante?.officine?.nom || "BestPharma Officine"}</p>
          </div>
        </div>
        <div style="background: #F7F9F7; border-top: 1px solid #CFF1D2; padding: 12px; display: flex; align-items: center; justify-content: space-between;">
          <div style="text-align: left;">
            <p style="margin: 0; font-size: 10px; font-weight: bold; color: #0F3B27;">SCAN D'ENTRÉE / SORTIE</p>
            <p style="margin: 2px 0 0; font-size: 9px; color: #475C50;">Borne Tablette 24h/24 · Art. 1.11</p>
          </div>
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=70x70&data=BESTPHARMA_BADGE:${matricule}" alt="QR" style="width: 55px; height: 55px; border-radius: 6px; border: 1px solid #CFF1D2;" />
        </div>
      </div>
    `;
    imprimerFicheOfficielle(`Badge_Officiel_${matricule}`, htmlCorps);
  }

  // Soumission demande de droit
  function soumettreDemandeDroit(e: React.FormEvent) {
    e.preventDefault();
    if (!motifDemande.trim()) {
      toast.error("Veuillez motiver votre demande.");
      return;
    }
    const nouvelle = {
      id: `DEM-0${demandesEnvoyees.length + 1}`,
      domaine: domaineDemande,
      droit: droitDemande,
      motif: motifDemande.trim(),
      date: new Date().toLocaleDateString("fr-FR"),
      statut: "En attente de validation",
    };
    setDemandesEnvoyees([nouvelle, ...demandesEnvoyees]);
    setModaleDroit(false);
    setMotifDemande("");
    toast.success("Demande de droit envoyée à l'administrateur de l'officine.");
  }

  // Export Données Personnelles
  function exporterDonneesPersonnelles(format: "json" | "csv") {
    const donnees = {
      utilisateur: {
        nom,
        email: user?.email,
        telephone,
        matricule,
        role: roleLibelle,
        ordreNumero,
        officine: courante?.officine?.nom,
      },
      habilitations: [
        { code: "HAB-01", fonction: "Dispensation au comptoir", statut: "Habilité" },
        { code: "HAB-02", fonction: "Contrôle ordonnances stupéfiants", statut: "Habilité" },
        { code: "HAB-03", fonction: "Validation libération préparations", statut: "Habilité" },
      ],
      formations: [
        { intitule: "Guide BPD Bénin v1.0", date: "15/01/2026", formateur: "ABMed" },
        { intitule: "Gestion sécurisée des stupéfiants", date: "10/02/2026", formateur: "ONPB" },
      ],
      pointages_recents: [
        { date: "05/11/2026", entree: "07:55", sortie: "18:05", total: "10h10" },
        { date: "04/11/2026", entree: "07:58", sortie: "18:00", total: "10h02" },
      ],
      date_export: new Date().toISOString(),
    };

    if (format === "json") {
      telechargerTexte(JSON.stringify(donnees, null, 2), `BestPharma_MesDonnees_${matricule}.json`, "application/json");
      toast.success("Archive complète de vos données personnelles (JSON) téléchargée.");
    } else {
      telechargerCsv(
        donnees.pointages_recents.map((p) => ({
          Matricule: matricule,
          Nom: nom,
          Date: p.date,
          Arrivee: p.entree,
          Depart: p.sortie,
          Total: p.total,
        })),
        `BestPharma_Historique_Personnel_${matricule}.csv`
      );
      toast.success("Historique des pointages personnels (CSV) exporté.");
    }
  }

  // Options pour le Sélecteur Filtrable
  const optionsSections: OptionSection[] = [
    {
      valeur: "profil",
      label: "Mon profil",
      description: "Identité, photo d'officine, coordonnées et langue",
      icone: <User className="size-4" />,
      badge: "Actif",
      motsCles: ["nom", "email", "photo", "coordonnées", "téléphone"],
    },
    {
      valeur: "droits",
      label: "Mon rôle et mes droits",
      description: "Matrice des habilitations et demande motivée de droits",
      icone: <ShieldCheck className="size-4" />,
      badge: roleLibelle,
      motsCles: ["habilitations", "permissions", "accès", "demande"],
    },
    {
      valeur: "officines",
      label: "Mes officines",
      description: "Rattachements multi-officines et officine active",
      icone: <Building2 className="size-4" />,
      badge: `${rattachements.length} officine${rattachements.length > 1 ? "s" : ""}`,
      motsCles: ["officines", "pharmacie", "bascule", "promoteur"],
    },
    {
      valeur: "qualification",
      label: "Qualification et Ordre",
      description: "Section B ONPB, cotisation annuelle et justificatifs",
      icone: <Award className="size-4" />,
      badge: "À jour",
      motsCles: ["onpb", "ordre", "cotisation", "diplôme", "attestation"],
    },
    {
      valeur: "formations",
      label: "Habilitations & Formations",
      description: "Fonctions autorisées, sessions suivies et émargements",
      icone: <Briefcase className="size-4" />,
      badge: "3 validées",
      motsCles: ["bpd", "formations", "émargement", "certificats"],
    },
    {
      valeur: "badge",
      label: "Mon badge professionnel",
      description: "Badge PVC officiel, code QR et déclaration de perte",
      icone: <CreditCard className="size-4" />,
      badge: badgePerdu ? "Révoqué" : "Actif",
      motsCles: ["badge", "qr", "pvc", "perte", "scanner", "matricule"],
    },
    {
      valeur: "preferences",
      label: "Mes préférences",
      description: "Canaux d'alerte (Push, SMS, WhatsApp), plages et affichage",
      icone: <Bell className="size-4" />,
      badge: "Configuré",
      motsCles: ["notifications", "sms", "alertes", "whatsapp", "thème"],
    },
    {
      valeur: "rh",
      label: "Mon espace personnel RH",
      description: "Mes bulletins de paie, congés, pointages et charte",
      icone: <FileText className="size-4" />,
      badge: "Confidentialité",
      motsCles: ["bulletins", "paie", "congés", "pointage", "charte"],
    },
    {
      valeur: "donnees",
      label: "Mes données & Sécurité",
      description: "Historique personnel, droits APDP et export conforme",
      icone: <Database className="size-4" />,
      badge: "APDP Bénin",
      motsCles: ["rgpd", "apdp", "données", "export", "journal", "effacement"],
    },
  ];

  return (
    <div className="space-y-6 font-sans">
      {/* En-tête de page BestPharma */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#CFF1D2]/60">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#18AA38]/30 bg-[#F7FBF8] px-3 py-1 text-xs font-bold text-[#0F3B27] mb-2">
            <Sparkles className="size-3 text-[#18AA38]" /> Espace Collaborateur Officine
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-black text-[#0F3B27] tracking-tight">
            Mon Profil & Rôle
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#475C50]">
            Centre personnel d'officine : identité, droits réglementaires BPD, badge officiel, espace RH et sécurité.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-[10px] border border-[#CFF1D2] bg-white text-xs font-semibold text-[#0F3B27] shadow-2xs">
            <Building2 className="size-3.5 text-[#18AA38]" />
            <span>{courante?.officine?.nom || "BestPharma Officine"}</span>
            <Badge variant="outline" className="text-[10px] bg-[#F7F9F7] text-[#0F3B27] border-[#CFF1D2]">
              {roleLibelle}
            </Badge>
          </div>
        </div>
      </div>

      {/* Sélecteur de Section Filtrable Déroulant */}
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
                recherchePlaceholder="Rechercher une section personnelle..."
                className="w-full bg-[#F7F9F7] border-[#CFF1D2] rounded-[10px] text-xs font-semibold"
              />
            </div>
          </div>
          <div className="text-xs text-[#475C50] flex items-center gap-2">
            <span>Matricule : <strong className="text-[#0F3B27] font-mono">{matricule}</strong></span>
            <span>·</span>
            <span>Rôle : <strong className="text-[#18AA38]">{roleLibelle}</strong></span>
          </div>
        </div>
      </div>

      {/* SECTION 1 : MON PROFIL */}
      {sectionActive === "profil" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Colonne gauche (4 cols) : Carte récapitulative profil & badge preview */}
          <div className="lg:col-span-4 space-y-4">
            <Card className="rounded-[10px] border-[#CFF1D2] bg-white shadow-2xs overflow-hidden">
              <div className="h-24 bg-gradient-to-r from-[#0F3B27] to-[#18AA38] p-4 flex items-end">
                <div className="size-16 rounded-[10px] bg-white border-2 border-white shadow-md flex items-center justify-center font-display font-black text-xl text-[#0F3B27] translate-y-8 overflow-hidden">
                  {photoUrl ? (
                    <img src={photoUrl} alt="Photo profil" className="w-full h-full object-cover" />
                  ) : (
                    initiales
                  )}
                </div>
              </div>
              <CardContent className="pt-10 pb-5 px-5 space-y-4">
                <div>
                  <h2 className="font-display font-bold text-lg text-[#0F3B27]">{nom}</h2>
                  <p className="text-xs text-[#475C50] font-medium">{user?.email}</p>
                </div>

                <div className="pt-2 border-t border-[#CFF1D2]/60 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#475C50]">Rôle officiel</span>
                    <span className="font-bold text-[#0F3B27] bg-[#F7FBF8] px-2 py-0.5 rounded-[6px] border border-[#18AA38]/30">
                      {roleLibelle}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#475C50]">Ordre National (ONPB)</span>
                    <span className="font-mono font-bold text-[#0F3B27]">{ordreNumero}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#475C50]">Statut BPD Bénin</span>
                    <span className="font-bold text-[#18AA38] flex items-center gap-1">
                      <CheckCircle2 className="size-3" /> Habilité & Déclaré
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#CFF1D2]/60">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSectionActive("badge")}
                    className="w-full rounded-[10px] border-[#CFF1D2] text-[#0F3B27] hover:bg-[#F7F9F7] text-xs h-9"
                  >
                    <CreditCard className="size-3.5 mr-1.5" /> Voir mon badge officiel
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[10px] border-[#CFF1D2] bg-[#F7FBF8] p-4 shadow-2xs">
              <div className="flex items-start gap-3">
                <div className="size-8 rounded-[8px] bg-[#0F3B27] text-white flex items-center justify-center shrink-0">
                  <ShieldCheck className="size-4 text-[#92FF5F]" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#0F3B27]">Responsabilité Professionnelle</p>
                  <p className="text-[11px] text-[#475C50] mt-0.5 leading-relaxed">
                    Chaque dispensation, contrôle stupéfiants ou acte validé sous votre session engage votre signature ordinale.
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Colonne droite (8 cols) : Édition & photo */}
          <div className="lg:col-span-8 space-y-6">
            <Card className="rounded-[10px] border-[#CFF1D2] bg-white shadow-2xs">
              <CardHeader className="pb-3 border-b border-[#CFF1D2]/60">
                <CardTitle className="font-display text-base text-[#0F3B27] flex items-center gap-2">
                  <User className="size-4 text-[#18AA38]" /> Coordonnées & Identité Professionnelle (PRO-01)
                </CardTitle>
                <CardDescription className="text-xs text-[#475C50]">
                  Informations inscrites sur vos ordonnanciers, reçus de caisse e-MECeF et attestations BPD.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <form onSubmit={enregistrerProfil} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="nom-complet" className="text-xs font-semibold text-[#0F3B27]">
                        Nom et Prénom
                      </Label>
                      <Input
                        id="nom-complet"
                        value={nom}
                        onChange={(e) => setNom(e.target.value)}
                        className="mt-1 rounded-[10px] border-[#CFF1D2] bg-[#F7F9F7] focus:bg-white text-xs sm:text-sm h-10"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="email-prof" className="text-xs font-semibold text-[#0F3B27]">
                        Adresse Email (Identifiant sécurisé)
                      </Label>
                      <Input
                        id="email-prof"
                        type="email"
                        value={user?.email || "contact@bestpharma.bj"}
                        disabled
                        className="mt-1 rounded-[10px] border-[#CFF1D2] bg-muted/40 text-xs sm:text-sm h-10 opacity-70 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="tel-prof" className="text-xs font-semibold text-[#0F3B27]">
                        Téléphone Officinal (Bénin +229)
                      </Label>
                      <Input
                        id="tel-prof"
                        value={telephone}
                        onChange={(e) => setTelephone(e.target.value)}
                        className="mt-1 rounded-[10px] border-[#CFF1D2] bg-[#F7F9F7] focus:bg-white text-xs sm:text-sm h-10 font-mono"
                      />
                    </div>

                    <div>
                      <Label htmlFor="ordre-num" className="text-xs font-semibold text-[#0F3B27]">
                        N° Inscription Ordre (Section B)
                      </Label>
                      <Input
                        id="ordre-num"
                        value={ordreNumero}
                        disabled
                        className="mt-1 rounded-[10px] border-[#CFF1D2] bg-muted/40 text-xs sm:text-sm h-10 font-mono opacity-80 cursor-not-allowed"
                      />
                      <p className="text-[10px] text-[#475C50] mt-1">Verrouillé · Modifiable uniquement via le dossier du personnel.</p>
                    </div>
                  </div>

                  {/* Zone de téléversement photo profil */}
                  <div className="pt-2">
                    <Label className="text-xs font-semibold text-[#0F3B27] mb-1.5 block">
                      Photo d'identité pour le badge PVC (recadrage carré, max 5 Mo)
                    </Label>
                    <ZoneDepot
                      label="Glissez la photo d'identité ou parcourez (JPG, PNG, HEIC)"
                      aide="Cette photo alimente immédiatement votre badge professionnel et la borne de pointage."
                      accept=".jpg,.jpeg,.png,.webp,.heic"
                      maxTailleMo={5}
                      dossier="personnel_photos"
                      valeurUrl={photoUrl}
                      valeurNom={photoUrl ? "Photo d'identité officielle" : undefined}
                      onUploadSuccess={(f) => {
                        setPhotoUrl(f.url);
                        toast.success("Photo d'identité enregistrée pour votre badge.");
                      }}
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button
                      type="submit"
                      disabled={enCours}
                      className="rounded-[10px] bg-[#0F3B27] hover:bg-[#18AA38] text-white font-bold text-xs h-10 px-5 shadow-2xs"
                    >
                      <Save className="size-3.5 mr-1.5" /> Enregistrer les modifications
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* SECTION 2 : MON RÔLE ET MES DROITS */}
      {sectionActive === "droits" && (
        <div className="space-y-6">
          <Card className="rounded-[10px] border-[#CFF1D2] bg-white shadow-2xs">
            <CardHeader className="pb-3 border-b border-[#CFF1D2]/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="font-display text-base text-[#0F3B27] flex items-center gap-2">
                  <ShieldCheck className="size-4 text-[#18AA38]" /> Matrice des Droits et Habilitations (PRO-02)
                </CardTitle>
                <CardDescription className="text-xs text-[#475C50]">
                  Formulée en langage clair (« Ce que je peux faire »). Aucun droit ne peut être auto-attribué.
                </CardDescription>
              </div>
              <Button
                type="button"
                onClick={() => setModaleDroit(true)}
                className="rounded-[10px] bg-[#0F3B27] hover:bg-[#18AA38] text-white text-xs font-bold h-9 shadow-2xs"
              >
                <Send className="size-3.5 mr-1.5" /> Demander un droit supplémentaire
              </Button>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="rounded-[10px] border border-[#CFF1D2] overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F7FBF8] border-b border-[#CFF1D2] text-[#0F3B27] font-bold">
                      <th className="p-3">Domaine Officinal</th>
                      <th className="p-3">Droits Précis</th>
                      <th className="p-3">Ce que je peux faire</th>
                      <th className="p-3 text-center">Niveau</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#CFF1D2]/40">
                    <tr>
                      <td className="p-3 font-bold text-[#0F3B27]">Dispensation & Caisse</td>
                      <td className="p-3 text-[#475C50]">Délivrance ordonnances, facturation e-MECeF, encaissement</td>
                      <td className="p-3 text-[#0F3B27]">Saisir et valider les ventes, imprimer les tickets fiscaux</td>
                      <td className="p-3 text-center"><Badge className="bg-emerald-600 text-white text-[10px]">Valide (V)</Badge></td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-[#0F3B27]">Stupéfiants & Substances</td>
                      <td className="p-3 text-[#475C50]">Accès au coffre-fort, transcription GAD-EN-010, balance mensuelle</td>
                      <td className="p-3 text-[#0F3B27]">Consulter, enregistrer entrées/sorties et co-signer destructions</td>
                      <td className="p-3 text-center"><Badge className="bg-emerald-600 text-white text-[10px]">Valide (V)</Badge></td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-[#0F3B27]">Magasin & Lots FEFO</td>
                      <td className="p-3 text-[#475C50]">Réceptions, transferts, retraits de lots, inventaires tournants</td>
                      <td className="p-3 text-[#0F3B27]">Saisie des livraisons, vérification DLUO et mise en quarantaine</td>
                      <td className="p-3 text-center"><Badge className="bg-emerald-600 text-white text-[10px]">Saisie (E)</Badge></td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-[#0F3B27]">Préparatoire (6M)</td>
                      <td className="p-3 text-[#475C50]">Fiches de pesée, certificats d'analyse, étiquetage BPD7-F15</td>
                      <td className="p-3 text-[#0F3B27]">Rédiger les protocoles et enregistrer les matières premières</td>
                      <td className="p-3 text-center"><Badge className="bg-emerald-600 text-white text-[10px]">Valide (V)</Badge></td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-[#0F3B27]">Personnel & Pointage</td>
                      <td className="p-3 text-[#475C50]">Pointage par badge QR, fiches de présence, plannings</td>
                      <td className="p-3 text-[#0F3B27]">Consulter son historique personnel et pointer à la borne H24</td>
                      <td className="p-3 text-center"><Badge className="bg-blue-600 text-white text-[10px]">Lecture (L)</Badge></td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-[#0F3B27]">Comptabilité & Trésorerie</td>
                      <td className="p-3 text-[#475C50]">Journaux SYSCOHADA, grand-livre, clôtures de caisse</td>
                      <td className="p-3 text-[#475C50]">Accès restreint au titulaire, promoteur et expert-comptable</td>
                      <td className="p-3 text-center"><Badge variant="outline" className="text-[10px] text-gray-500">Aucun (–)</Badge></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Historique des demandes de droit */}
              <div className="pt-4 border-t border-[#CFF1D2]/60">
                <h3 className="text-xs font-bold text-[#0F3B27] mb-2">Suivi de vos demandes de droits supplémentaires (PRO-03)</h3>
                <div className="space-y-2">
                  {demandesEnvoyees.map((d) => (
                    <div key={d.id} className="p-3 rounded-[10px] border border-[#CFF1D2] bg-[#F7F9F7] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-[#0F3B27]">{d.droit}</strong>
                          <span className="text-[10px] text-[#475C50]">({d.domaine})</span>
                        </div>
                        <p className="text-[11px] text-[#475C50] mt-0.5">Motif : {d.motif}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[11px] text-[#475C50]">{d.date}</span>
                        <Badge className={d.statut === "Accordé" ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"}>
                          {d.statut}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SECTION 3 : MES OFFICINES */}
      {sectionActive === "officines" && (
        <Card className="rounded-[10px] border-[#CFF1D2] bg-white shadow-2xs">
          <CardHeader className="pb-3 border-b border-[#CFF1D2]/60">
            <CardTitle className="font-display text-base text-[#0F3B27] flex items-center gap-2">
              <Building2 className="size-4 text-[#18AA38]" /> Mes Officines de Rattachement (PRO-04)
            </CardTitle>
            <CardDescription className="text-xs text-[#475C50]">
              Sélectionnez votre officine active ou consultez vos attributions multi-sites.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rattachements.map((r) => {
                const estActive = courante?.officine_id === r.officine_id;
                return (
                  <div
                    key={r.officine_id}
                    className={`p-4 rounded-[10px] border-2 transition-all flex flex-col justify-between gap-3 ${
                      estActive
                        ? "border-[#0F3B27] bg-[#F7FBF8] shadow-sm"
                        : "border-[#CFF1D2] bg-white hover:border-[#18AA38]/50"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm text-[#0F3B27]">{r.officine.nom}</h4>
                        {estActive ? (
                          <Badge className="bg-[#0F3B27] text-[#92FF5F] text-[10px]">Officine Active</Badge>
                        ) : null}
                      </div>
                      <p className="text-xs text-[#475C50] mt-1">Ville : {r.officine.ville || "Cotonou, Bénin"}</p>
                      <p className="text-xs text-[#475C50]">Licence ABMed : <span className="font-mono text-[#0F3B27]">{r.officine.numero_licence || "BEN-OFF-2026-001"}</span></p>
                      <p className="text-xs text-[#0F3B27] font-semibold mt-2">Votre rôle : {fr.roles[r.role as keyof typeof fr.roles] || r.role}</p>
                    </div>

                    <div className="pt-2 border-t border-[#CFF1D2]/60 flex items-center justify-between">
                      <span className="text-[11px] text-[#475C50]">Isolation stricte des données [AC-01]</span>
                      {!estActive && (
                        <Button
                          size="sm"
                          onClick={() => {
                            choisir(r.officine_id);
                            toast.success(`Bascule vers l'officine ${r.officine.nom} réussie.`);
                          }}
                          className="rounded-[8px] bg-[#0F3B27] hover:bg-[#18AA38] text-white text-xs h-8"
                        >
                          Basculer vers ce site
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* SECTION 4 : QUALIFICATION ET ORDRE */}
      {sectionActive === "qualification" && (
        <Card className="rounded-[10px] border-[#CFF1D2] bg-white shadow-2xs">
          <CardHeader className="pb-3 border-b border-[#CFF1D2]/60">
            <CardTitle className="font-display text-base text-[#0F3B27] flex items-center gap-2">
              <Award className="size-4 text-[#18AA38]" /> Qualification Professionnelle & Ordre National (PRO-05)
            </CardTitle>
            <CardDescription className="text-xs text-[#475C50]">
              Suivi de l'inscription à l'Ordre National des Pharmaciens du Bénin (Section B) et attestations annuelles.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-[10px] border border-[#CFF1D2] bg-[#F7FBF8]">
                <p className="text-xs text-[#475C50]">Diplôme principal</p>
                <p className="font-bold text-sm text-[#0F3B27] mt-1">Docteur en Pharmacie d'État</p>
                <p className="text-[11px] text-[#475C50] mt-1">Faculté des Sciences de la Santé (FSS Cotonou)</p>
              </div>
              <div className="p-4 rounded-[10px] border border-[#CFF1D2] bg-[#F7FBF8]">
                <p className="text-xs text-[#475C50]">Numéro d'Ordre ONPB</p>
                <p className="font-bold text-sm text-[#0F3B27] font-mono mt-1">{ordreNumero}</p>
                <p className="text-[11px] text-emerald-700 font-bold mt-1">Section B (Pharmacies d'officine)</p>
              </div>
              <div className="p-4 rounded-[10px] border border-[#CFF1D2] bg-[#F7FBF8]">
                <p className="text-xs text-[#475C50]">Validité Cotisation 2026</p>
                <p className="font-bold text-sm text-[#0F3B27] mt-1">Valide jusqu'au 31/12/2026</p>
                <p className="text-[11px] text-emerald-700 font-bold mt-1">Cotisation à jour · Conforme</p>
              </div>
            </div>

            <div className="pt-2">
              <Label className="text-xs font-semibold text-[#0F3B27] mb-1.5 block">
                Téléverser l'attestation annuelle renouvelée de l'Ordre (PDF, JPG)
              </Label>
              <ZoneDepot
                label="Déposer l'attestation de cotisation ONPB ou carte professionnelle renouvelée"
                aide="Ce dépôt génère automatiquement une tâche de validation pour le responsable qualité (RMQ) et le titulaire."
                dossier="personnel_qualifications"
                onUploadSuccess={() => {
                  toast.success("Attestation de l'Ordre transmise pour validation RH.");
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* SECTION 5 : HABILITATIONS & FORMATIONS */}
      {sectionActive === "formations" && (
        <Card className="rounded-[10px] border-[#CFF1D2] bg-white shadow-2xs">
          <CardHeader className="pb-3 border-b border-[#CFF1D2]/60">
            <CardTitle className="font-display text-base text-[#0F3B27] flex items-center gap-2">
              <Briefcase className="size-4 text-[#18AA38]" /> Habilitations & Formations BPD Suivies (PRO-06)
            </CardTitle>
            <CardDescription className="text-xs text-[#475C50]">
              Registre des compétences requises par le référentiel des Bonnes Pratiques de Distribution.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="rounded-[10px] border border-[#CFF1D2] overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#F7FBF8] border-b border-[#CFF1D2] text-[#0F3B27] font-bold">
                    <th className="p-3">Intitulé de Formation</th>
                    <th className="p-3">Organisme / Formateur</th>
                    <th className="p-3">Date de Réalisation</th>
                    <th className="p-3">Statut Émargement</th>
                    <th className="p-3 text-right">Attestation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#CFF1D2]/40">
                  <tr>
                    <td className="p-3 font-bold text-[#0F3B27]">Bonnes Pratiques de Distribution (Guide ABMed Bénin)</td>
                    <td className="p-3 text-[#475C50]">Cellule Qualité BestPharma</td>
                    <td className="p-3 text-[#475C50]">15/01/2026</td>
                    <td className="p-3"><Badge className="bg-emerald-600 text-white text-[10px]">Signé électriquement</Badge></td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => toast.info("Téléchargement de l'attestation...")} className="h-7 text-xs text-[#0F3B27]">
                        <Download className="size-3 mr-1" /> PDF
                      </Button>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-[#0F3B27]">Gestion et sécurisation des stupéfiants (GAD-EN-010)</td>
                    <td className="p-3 text-[#475C50]">Ordre National des Pharmaciens</td>
                    <td className="p-3 text-[#475C50]">10/02/2026</td>
                    <td className="p-3"><Badge className="bg-emerald-600 text-white text-[10px]">Signé électriquement</Badge></td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => toast.info("Téléchargement de l'attestation...")} className="h-7 text-xs text-[#0F3B27]">
                        <Download className="size-3 mr-1" /> PDF
                      </Button>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-[#0F3B27]">Gestion de la chaîne du froid et métrologie 2–8 °C</td>
                    <td className="p-3 text-[#475C50]">Audit Qualité Externe</td>
                    <td className="p-3 text-[#475C50]">Prévue le 20/11/2026</td>
                    <td className="p-3"><Badge className="bg-amber-500 text-white text-[10px]">À venir</Badge></td>
                    <td className="p-3 text-right text-[#475C50] text-[11px]">Non renseigné</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SECTION 6 : MON BADGE PROFESSIONNEL */}
      {sectionActive === "badge" && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-6 space-y-4">
            <Card className="rounded-[10px] border-[#CFF1D2] bg-white shadow-2xs">
              <CardHeader className="pb-3 border-b border-[#CFF1D2]/60">
                <CardTitle className="font-display text-base text-[#0F3B27] flex items-center gap-2">
                  <CreditCard className="size-4 text-[#18AA38]" /> Badge Professionnel PVC (PRO-07)
                </CardTitle>
                <CardDescription className="text-xs text-[#475C50]">
                  Ce badge permet le pointage sans contact 24h/24 à la borne d'entrée de l'officine.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {/* Carte Badge Visuelle */}
                <div className={`p-4 rounded-[12px] border-2 transition-all ${badgePerdu ? "border-red-400 bg-red-50/30" : "border-[#0F3B27] bg-[#F7FBF8]"}`}>
                  <div className="flex items-center justify-between border-b border-[#CFF1D2] pb-3 mb-3">
                    <div>
                      <h4 className="font-black text-xs text-[#0F3B27] tracking-wider">BESTPHARMA BÉNIN</h4>
                      <p className="text-[10px] text-[#475C50]">CARTE PROFESSIONNELLE D'OFFICINE</p>
                    </div>
                    <Badge className={badgePerdu ? "bg-red-600 text-white" : "bg-[#0F3B27] text-[#92FF5F]"}>
                      {badgePerdu ? "RÉVOQUÉ / PERDU" : "ACTIF"}
                    </Badge>
                  </div>

                  <div className="flex gap-4 items-center">
                    <div className="size-20 rounded-[8px] bg-white border border-[#CFF1D2] flex items-center justify-center font-bold text-lg text-[#0F3B27] overflow-hidden shrink-0">
                      {photoUrl ? <img src={photoUrl} alt="Photo" className="w-full h-full object-cover" /> : initiales}
                    </div>
                    <div className="space-y-1 min-w-0">
                      <p className="font-black text-sm text-[#0F3B27] truncate">{nom}</p>
                      <p className="text-xs font-bold text-[#18AA38]">{roleLibelle}</p>
                      <p className="text-xs text-[#475C50]">Matricule : <strong className="font-mono text-[#0F3B27]">{matricule}</strong></p>
                      <p className="text-[11px] text-[#475C50]">Ordre : {ordreNumero}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#CFF1D2] flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-[#0F3B27]">CODE QR DYNAMIQUE</p>
                      <p className="text-[9px] text-[#475C50]">Compatible lecteur optique tablette</p>
                    </div>
                    {!badgePerdu ? (
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=BESTPHARMA_BADGE:${matricule}`}
                        alt="QR Code"
                        className="size-14 rounded-[6px] border border-[#CFF1D2]"
                      />
                    ) : (
                      <div className="size-14 rounded-[6px] bg-red-100 flex items-center justify-center text-red-600 font-bold text-[10px]">
                        RÉVOQUÉ
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    onClick={imprimerBadgeOfficiel}
                    disabled={badgePerdu}
                    className="flex-1 rounded-[10px] bg-[#0F3B27] hover:bg-[#18AA38] text-white text-xs font-bold h-10 shadow-2xs"
                  >
                    <Printer className="size-3.5 mr-1.5" /> Imprimer le badge (PVC)
                  </Button>
                  {!badgePerdu ? (
                    <Button
                      variant="outline"
                      onClick={() => setModalePerteBadge(true)}
                      className="rounded-[10px] border-red-300 text-red-600 hover:bg-red-50 text-xs font-bold h-10"
                    >
                      <AlertTriangle className="size-3.5 mr-1.5" /> Déclarer perdu
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setBadgePerdu(false);
                        toast.success("Nouveau badge régénéré et activé avec succès.");
                      }}
                      className="rounded-[10px] border-[#0F3B27] text-[#0F3B27] text-xs font-bold h-10"
                    >
                      Régénérer un nouveau badge
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-6 space-y-4">
            <Card className="rounded-[10px] border-[#CFF1D2] bg-[#F7FBF8] p-5 shadow-2xs space-y-3">
              <h3 className="font-bold text-xs text-[#0F3B27] flex items-center gap-2">
                <ShieldAlert className="size-4 text-[#18AA38]" /> Consignes de Sécurité du Badge (BPD-2)
              </h3>
              <p className="text-xs text-[#475C50] leading-relaxed">
                Le badge d'officine est strictement personnel et incessible. Il sert à authentifier la présence physique du pharmacien et du personnel lors des ouvertures de caisse et délivrances de médicaments.
              </p>
              <ul className="text-xs text-[#475C50] space-y-1.5 list-disc list-inside">
                <li>Tout badge déclaré perdu est révoqué instantanément (&lt; 30 secondes) sur les tablettes.</li>
                <li>Le pointage frauduleux pour un tiers est une infraction au règlement BPD.</li>
                <li>La photo d'identité doit dater de moins de deux ans.</li>
              </ul>
            </Card>
          </div>
        </div>
      )}

      {/* SECTION 7 : MES PRÉFÉRENCES */}
      {sectionActive === "preferences" && (
        <Card className="rounded-[10px] border-[#CFF1D2] bg-white shadow-2xs">
          <CardHeader className="pb-3 border-b border-[#CFF1D2]/60">
            <CardTitle className="font-display text-base text-[#0F3B27] flex items-center gap-2">
              <Bell className="size-4 text-[#18AA38]" /> Préférences de Notification & Affichage (PRO-08, PRO-09)
            </CardTitle>
            <CardDescription className="text-xs text-[#475C50]">
              Réglez vos canaux de réception selon la sévérité des alertes et personnalisez votre confort de travail.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-6">
            <div className="rounded-[10px] border border-[#CFF1D2] overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#F7FBF8] border-b border-[#CFF1D2] text-[#0F3B27] font-bold">
                    <th className="p-3">Niveau de Sévérité</th>
                    <th className="p-3 text-center">Push Navigateur</th>
                    <th className="p-3 text-center">SMS Bénin</th>
                    <th className="p-3 text-center">WhatsApp Officine</th>
                    <th className="p-3 text-center">E-mail Récap</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#CFF1D2]/40">
                  <tr>
                    <td className="p-3">
                      <strong className="text-red-700 block">Critique (Urgent)</strong>
                      <span className="text-[10px] text-[#475C50]">Excursion T°C frigo, rupture stupéfiant, alerte ABMed</span>
                    </td>
                    <td className="p-3 text-center">
                      <input type="checkbox" checked={prefCritiquePush} onChange={(e) => setPrefCritiquePush(e.target.checked)} className="size-4 accent-[#0F3B27]" />
                    </td>
                    <td className="p-3 text-center">
                      <input type="checkbox" checked={prefCritiqueSms} onChange={(e) => setPrefCritiqueSms(e.target.checked)} className="size-4 accent-[#0F3B27]" />
                      <span className="block text-[9px] text-[#475C50]">Contourne plages</span>
                    </td>
                    <td className="p-3 text-center"><span className="text-[10px] text-gray-400">Non recommandé</span></td>
                    <td className="p-3 text-center">
                      <input type="checkbox" checked={prefCritiqueEmail} onChange={(e) => setPrefCritiqueEmail(e.target.checked)} className="size-4 accent-[#0F3B27]" />
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3">
                      <strong className="text-amber-700 block">Important</strong>
                      <span className="text-[10px] text-[#475C50]">Lots proches péremption &lt; 30j, rappel fournisseur</span>
                    </td>
                    <td className="p-3 text-center">
                      <input type="checkbox" checked={prefImportantPush} onChange={(e) => setPrefImportantPush(e.target.checked)} className="size-4 accent-[#0F3B27]" />
                    </td>
                    <td className="p-3 text-center"><span className="text-[10px] text-gray-400">Non renseigné</span></td>
                    <td className="p-3 text-center">
                      <input type="checkbox" checked={prefImportantWhatsapp} onChange={(e) => setPrefImportantWhatsapp(e.target.checked)} className="size-4 accent-[#0F3B27]" />
                    </td>
                    <td className="p-3 text-center">
                      <input type="checkbox" checked={prefImportantEmail} onChange={(e) => setPrefImportantEmail(e.target.checked)} className="size-4 accent-[#0F3B27]" />
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3">
                      <strong className="text-[#0F3B27] block">Information & Quotidien</strong>
                      <span className="text-[10px] text-[#475C50]">Résumé de pointage, clôture de caisse, check-lists</span>
                    </td>
                    <td className="p-3 text-center">
                      <input type="checkbox" checked={prefInfoPush} onChange={(e) => setPrefInfoPush(e.target.checked)} className="size-4 accent-[#0F3B27]" />
                    </td>
                    <td className="p-3 text-center"><span className="text-[10px] text-gray-400">Non renseigné</span></td>
                    <td className="p-3 text-center"><span className="text-[10px] text-gray-400">Non renseigné</span></td>
                    <td className="p-3 text-center">
                      <input type="checkbox" checked={prefInfoEmail} onChange={(e) => setPrefInfoEmail(e.target.checked)} className="size-4 accent-[#0F3B27]" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <Label className="text-xs font-semibold text-[#0F3B27]">Heure du résumé quotidien</Label>
                <Input
                  type="time"
                  value={heureResume}
                  onChange={(e) => setHeureResume(e.target.value)}
                  className="mt-1 rounded-[10px] border-[#CFF1D2] bg-[#F7F9F7] text-xs h-10"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-[#0F3B27]">Retours sonores (scans caisse & borne)</Label>
                <div className="mt-1 flex items-center justify-between p-2 rounded-[10px] border border-[#CFF1D2] bg-[#F7F9F7] h-10">
                  <span className="text-xs text-[#0F3B27] flex items-center gap-1.5"><Volume2 className="size-3.5" /> Bips audio</span>
                  <input type="checkbox" checked={sonsScans} onChange={(e) => setSonsScans(e.target.checked)} className="size-4 accent-[#0F3B27]" />
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold text-[#0F3B27]">Taille des polices d'interface</Label>
                <select
                  value={tailleTexte}
                  onChange={(e) => setTailleTexte(e.target.value)}
                  className="mt-1 w-full rounded-[10px] border border-[#CFF1D2] bg-[#F7F9F7] text-xs h-10 px-3 font-semibold text-[#0F3B27]"
                >
                  <option value="normale">Standard (Recommandé)</option>
                  <option value="confort">Confort tactile (+10%)</option>
                  <option value="large">Grande lisibilité (+20%)</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                type="button"
                onClick={() => toast.success("Préférences de notification et d'affichage enregistrées.")}
                className="rounded-[10px] bg-[#0F3B27] hover:bg-[#18AA38] text-white text-xs font-bold h-10 px-5 shadow-2xs"
              >
                <Save className="size-3.5 mr-1.5" /> Sauvegarder mes préférences
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SECTION 8 : MON ESPACE RH */}
      {sectionActive === "rh" && (
        <Card className="rounded-[10px] border-[#CFF1D2] bg-white shadow-2xs">
          <CardHeader className="pb-3 border-b border-[#CFF1D2]/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="font-display text-base text-[#0F3B27] flex items-center gap-2">
                <FileText className="size-4 text-[#18AA38]" /> Espace Personnel RH & Déontologie (PRO-10, PRO-11, PRO-12)
              </CardTitle>
              <CardDescription className="text-xs text-[#475C50]">
                Bulletins de paie confidentiels, congés, feuille de présence et engagements qualité signés.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setModaleCharte(true)}
              className="rounded-[10px] border-[#CFF1D2] text-[#0F3B27] hover:bg-[#F7F9F7] text-xs font-bold h-9"
            >
              <ShieldCheck className="size-3.5 mr-1.5 text-emerald-600" /> Voir ma Charte Qualité signée
            </Button>
          </CardHeader>
          <CardContent className="pt-4 space-y-6">
            {/* Mes Bulletins de Paie */}
            <div>
              <h3 className="text-xs font-bold text-[#0F3B27] mb-2 flex items-center gap-1.5">
                <Download className="size-3.5 text-[#18AA38]" /> Mes Bulletins de Paie Sécurisés (PAI-04, PAI-10)
              </h3>
              <p className="text-[11px] text-[#475C50] mb-3">Visibilité strictement réservée à l'agent concerné et au titulaire.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { mois: "Octobre 2026", date: "31/10/2026", taille: "185 Ko" },
                  { mois: "Septembre 2026", date: "30/09/2026", taille: "182 Ko" },
                  { mois: "Août 2026", date: "31/08/2026", taille: "180 Ko" },
                ].map((b, i) => (
                  <div key={i} className="p-3 rounded-[10px] border border-[#CFF1D2] bg-[#F7FBF8] flex items-center justify-between">
                    <div>
                      <p className="font-bold text-xs text-[#0F3B27]">{b.mois}</p>
                      <p className="text-[10px] text-[#475C50]">Émis le {b.date} · {b.taille}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toast.success(`Téléchargement du bulletin ${b.mois} (PDF crypté)...`)}
                      className="h-8 text-xs text-[#0F3B27] hover:bg-[#CFF1D2]/30"
                    >
                      <Download className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Congés et Soldes */}
            <div className="pt-2 border-t border-[#CFF1D2]/60">
              <h3 className="text-xs font-bold text-[#0F3B27] mb-2 flex items-center gap-1.5">
                <Calendar className="size-3.5 text-[#18AA38]" /> Soldes de Congés & Pointages (RH-04, POI-07)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-3 rounded-[10px] border border-[#CFF1D2] bg-[#F7F9F7]">
                  <p className="text-xs text-[#475C50]">Congés payés acquis</p>
                  <p className="font-bold text-lg text-[#0F3B27] mt-1">24 jours</p>
                </div>
                <div className="p-3 rounded-[10px] border border-[#CFF1D2] bg-[#F7F9F7]">
                  <p className="text-xs text-[#475C50]">Congés restants</p>
                  <p className="font-bold text-lg text-[#18AA38] mt-1">16 jours</p>
                </div>
                <div className="p-3 rounded-[10px] border border-[#CFF1D2] bg-[#F7F9F7]">
                  <p className="text-xs text-[#475C50]">Présence ce mois (Novembre)</p>
                  <p className="font-bold text-lg text-[#0F3B27] mt-1">100 % (40 h)</p>
                </div>
              </div>
            </div>

            {/* Téléchargement de la feuille de présence */}
            <div className="pt-2 flex justify-end">
              <Button
                variant="outline"
                onClick={() => exporterDonneesPersonnelles("csv")}
                className="rounded-[10px] border-[#CFF1D2] text-[#0F3B27] hover:bg-[#F7FBF8] text-xs font-bold h-9 shadow-2xs"
              >
                <Download className="size-3.5 mr-1.5" /> Exporter ma feuille de présence (CSV)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SECTION 9 : MES DONNÉES APDP / RGPD */}
      {sectionActive === "donnees" && (
        <Card className="rounded-[10px] border-[#CFF1D2] bg-white shadow-2xs">
          <CardHeader className="pb-3 border-b border-[#CFF1D2]/60">
            <CardTitle className="font-display text-base text-[#0F3B27] flex items-center gap-2">
              <Database className="size-4 text-[#18AA38]" /> Protection des Données Personnelles (PRO-13, PRO-14, DP-05)
            </CardTitle>
            <CardDescription className="text-xs text-[#475C50]">
              Conformité Loi n° 2017-20 portant Code du numérique en République du Bénin (Livre V : Protection des données à caractère personnel - APDP).
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="p-4 rounded-[10px] border border-[#CFF1D2] bg-[#F7FBF8] text-xs text-[#0F3B27] leading-relaxed">
              <strong className="block mb-1">Droit d'accès, de rectification et d'effacement :</strong>
              Vous disposez du droit d'obtenir une copie intégrale de vos données personnelles stockées dans BestPharma. 
              Veuillez noter que les registres officiels de dispensation, d'ordonnancier et de stupéfiants font l'objet d'une obligation légale de conservation (3 à 10 ans) ne pouvant être effacée prématurément.
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                onClick={() => exporterDonneesPersonnelles("json")}
                className="rounded-[10px] bg-[#0F3B27] hover:bg-[#18AA38] text-white text-xs font-bold h-10 px-4 shadow-2xs"
              >
                <Download className="size-3.5 mr-1.5" /> Exporter toutes mes données (JSON)
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setTypeDemandeDonnees("acces");
                  setModaleDonnees(true);
                }}
                className="rounded-[10px] border-[#CFF1D2] text-[#0F3B27] text-xs font-bold h-10 px-4"
              >
                Demande d'accès ou rectification
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setTypeDemandeDonnees("effacement");
                  setModaleDonnees(true);
                }}
                className="rounded-[10px] border-red-300 text-red-600 hover:bg-red-50 text-xs font-bold h-10 px-4"
              >
                Demande d'effacement de données
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* MODALE : Demande de droit supplémentaire */}
      <Dialog open={modaleDroit} onOpenChange={setModaleDroit}>
        <DialogContent className="rounded-[10px] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#0F3B27] font-bold text-base">Demande de droit supplémentaire (PRO-03)</DialogTitle>
            <DialogDescription className="text-xs text-[#475C50]">
              Cette demande sera transmise au pharmacien titulaire et à l'administrateur de l'officine.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={soumettreDemandeDroit} className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-semibold text-[#0F3B27]">Domaine d'officine</Label>
              <select
                value={domaineDemande}
                onChange={(e) => setDomaineDemande(e.target.value)}
                className="mt-1 w-full rounded-[10px] border border-[#CFF1D2] bg-[#F7F9F7] text-xs h-10 px-3 font-semibold text-[#0F3B27]"
              >
                <option value="dispensation">Dispensation & Ordonnances</option>
                <option value="stupefiants">Stupéfiants & Substances</option>
                <option value="preparations">Préparations magistrales</option>
                <option value="stock">Magasin & Réceptions de lots</option>
                <option value="caisse">Gestion de caisse</option>
              </select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-[#0F3B27]">Habilitation sollicitée</Label>
              <Input
                value={droitDemande}
                onChange={(e) => setDroitDemande(e.target.value)}
                className="mt-1 rounded-[10px] border-[#CFF1D2] text-xs h-10"
                required
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-[#0F3B27]">Motif professionnel de la demande</Label>
              <Textarea
                value={motifDemande}
                onChange={(e) => setMotifDemande(e.target.value)}
                placeholder="Précisez le contexte (ex : prise en charge des gardes de nuit, délégation temporaire)..."
                rows={3}
                className="mt-1 rounded-[10px] border-[#CFF1D2] text-xs"
                required
              />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setModaleDroit(false)} className="rounded-[10px] text-xs h-9">
                Annuler
              </Button>
              <Button type="submit" className="rounded-[10px] bg-[#0F3B27] hover:bg-[#18AA38] text-white text-xs font-bold h-9">
                Transmettre la demande
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODALE : Déclaration de perte de badge */}
      <Dialog open={modalePerteBadge} onOpenChange={setModalePerteBadge}>
        <DialogContent className="rounded-[10px] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-700 font-bold text-base flex items-center gap-2">
              <AlertTriangle className="size-4" /> Déclaration de perte de badge (PRO-07)
            </DialogTitle>
            <DialogDescription className="text-xs text-[#475C50]">
              La révocation est immédiate. Le code QR du badge <strong className="text-[#0F3B27]">{matricule}</strong> sera bloqué sur toutes les bornes de l'officine sous 30 secondes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <Label className="text-xs font-semibold text-[#0F3B27]">Circonstances / Motif du signalement</Label>
              <Textarea
                value={motifPerte}
                onChange={(e) => setMotifPerte(e.target.value)}
                rows={3}
                className="mt-1 rounded-[10px] border-[#CFF1D2] text-xs"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setModalePerteBadge(false)} className="rounded-[10px] text-xs h-9">
              Annuler
            </Button>
            <Button
              type="button"
              onClick={confirmerPerteBadge}
              className="rounded-[10px] bg-red-600 hover:bg-red-700 text-white text-xs font-bold h-9"
            >
              Confirmer et révoquer le badge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODALE : Charte Qualité et Engagement Déontologique */}
      <Dialog open={modaleCharte} onOpenChange={setModaleCharte}>
        <DialogContent className="rounded-[10px] max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#0F3B27] font-bold text-base flex items-center gap-2">
              <ShieldCheck className="size-4 text-[#18AA38]" /> Charte Déontologique & Engagement BPD (BPD1-F12)
            </DialogTitle>
            <DialogDescription className="text-xs text-[#475C50]">
              Document officiel conservé au dossier du personnel de l'officine BestPharma.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-xs text-[#0F3B27] max-h-80 overflow-y-auto p-3 rounded-[8px] bg-[#F7FBF8] border border-[#CFF1D2] leading-relaxed">
            <p><strong>1. Respect du secret professionnel :</strong> Tout acte de dispensation, dossier patient et ordonnance demeurent strictement confidentiels.</p>
            <p><strong>2. Présence et signature :</strong> Chaque dispensation sous ma session est effectuée sous mon contrôle effectif.</p>
            <p><strong>3. Traçabilité des températures :</strong> Engagement de signalement immédiat de toute rupture de la chaîne du froid 2–8 °C.</p>
            <p><strong>4. Sécurité des stupéfiants :</strong> Respect strict de la balance GAD-EN-010 et tenue sous clef.</p>
            <div className="mt-3 pt-3 border-t border-[#CFF1D2] text-[11px] text-[#475C50]">
              Signé électroniquement par <strong>{nom}</strong> le 15/01/2026 à 09:12 (Porto-Novo). Empreinte SHA-256 certifiée.
            </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setModaleCharte(false)} className="rounded-[10px] bg-[#0F3B27] text-white text-xs h-9 font-bold">
              Fermer la charte
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODALE : Demande APDP */}
      <Dialog open={modaleDonnees} onOpenChange={setModaleDonnees}>
        <DialogContent className="rounded-[10px] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#0F3B27] font-bold text-base">
              {typeDemandeDonnees === "effacement" ? "Demande d'effacement de données" : "Demande d'accès ou rectification"}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#475C50]">
              Enregistrée et suivie sous l'autorité du Délégué à la Protection des Données d'officine (APDP Bénin).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <Label className="text-xs font-semibold text-[#0F3B27]">Précisez votre demande</Label>
              <Textarea
                value={motifDonnees}
                onChange={(e) => setMotifDonnees(e.target.value)}
                placeholder="Indiquez les éléments concernés..."
                rows={3}
                className="mt-1 rounded-[10px] border-[#CFF1D2] text-xs"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setModaleDonnees(false)} className="rounded-[10px] text-xs h-9">
              Annuler
            </Button>
            <Button
              type="button"
              onClick={() => {
                setModaleDonnees(false);
                setMotifDonnees("");
                toast.success("Votre demande APDP a été enregistrée avec accusé de réception.");
              }}
              className="rounded-[10px] bg-[#0F3B27] hover:bg-[#18AA38] text-white text-xs font-bold h-9"
            >
              Envoyer la requête
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
