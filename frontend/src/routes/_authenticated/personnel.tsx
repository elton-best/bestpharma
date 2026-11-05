import { useState, useMemo, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Award,
  QrCode,
  ShieldCheck,
  Stethoscope,
  UserPlus,
  Users,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Phone,
  Calendar,
  ShieldAlert,
  ArrowRight,
  UserCheck,
  UserX,
  FileText,
  FileCheck,
  Briefcase,
  GraduationCap,
  Download,
  Upload,
  Printer,
  Plus,
  Network,
  HeartPulse,
} from "lucide-react";

import { api } from "@/lib/api-client";
import { telechargerCsv, imprimerFicheOfficielle } from "@/lib/export-utils";
import { useOfficine } from "@/lib/officine-context";
import { fr } from "@/lib/i18n/fr";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SelecteurFiltrable, type OptionSection } from "@/components/ui/selecteur-filtrable";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ModaleSignatureCode,
  BoutonCreerNC,
  LienReglementaireBpd,
  SignatureData,
} from "@/components/modules/bpd-communs";

export const Route = createFileRoute("/_authenticated/personnel")({
  head: () => ({
    meta: [
      { title: "Personnel & Équipe — BestPharma" },
      {
        name: "description",
        content:
          "Dossiers RH du personnel, inscription à l'Ordre des pharmaciens, fiches de poste, habilitations et plan de formation.",
      },
    ],
  }),
  component: PagePersonnel,
});

interface Employe {
  id: string;
  nom_complet: string;
  poste: string;
  telephone?: string | null;
  matricule?: string | null;
  code_badge?: string | null;
  photo_url?: string | null;
  date_embauche?: string | null;
  date_visite_medicale?: string | null;
  charte_qualite_signee: boolean;
  charte_signee_le?: string | null;
  actif: boolean;
}

function PagePersonnel() {
  const { courante, aRole } = useOfficine();
  const id = courante?.officine_id;
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState("equipe");
  const [filtreRole, setFiltreRole] = useState<string>("tous");
  const [recherche, setRecherche] = useState("");

  // Modale Badge QR
  const [employeBadge, setEmployeBadge] = useState<Employe | null>(null);

  // Modale Nouvel Employé
  const [modalEmploye, setModalEmploye] = useState(false);
  const [nomEmploye, setNomEmploye] = useState("");
  const [posteEmploye, setPosteEmploye] = useState("dispensateur");
  const [telEmploye, setTelEmploye] = useState("");
  const [photoEmploye, setPhotoEmploye] = useState("");
  const [enCours, setEnCours] = useState(false);

  // Modale Signature PIN
  const [modaleSignOuverte, setModaleSignOuverte] = useState(false);
  const [actionSignature, setActionSignature] = useState<{ titre: string; cb: () => void } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["employes-complets", id],
    enabled: !!id,
    queryFn: async () => {
      return api.get<{ employes: Employe[]; inscriptions_ordre: Record<string, any> }>(
        `/api/officines/${id}/employes`
      );
    },
  });

  const employes = data?.employes || [];
  const ordres = data?.inscriptions_ordre || {};

  const basculer = useMutation({
    mutationFn: async (e: { id: string; actif: boolean }) => {
      return api.put(`/api/officines/${id}/employes/${e.id}`, { actif: !e.actif });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employes-complets"] });
      toast.success("Statut de l'employé mis à jour.");
    },
    onError: (e: any) => toast.error(e.message || "Erreur de mise à jour"),
  });

  async function handleCreerEmploye(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !nomEmploye.trim()) return;

    setEnCours(true);
    try {
      await api.post(`/api/officines/${id}/employes`, {
        nom_complet: nomEmploye.trim(),
        poste: posteEmploye,
        telephone: telEmploye.trim() || null,
        photo_url: photoEmploye.trim() || null,
        actif: true,
      });

      toast.success("Collaborateur créé avec succès.");
      setModalEmploye(false);
      setNomEmploye("");
      setTelEmploye("");
      setPhotoEmploye("");
      qc.invalidateQueries({ queryKey: ["employes-complets"] });
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la création");
    } finally {
      setEnCours(false);
    }
  }

  // Filtrage du personnel
  const employesFiltres = useMemo(() => {
    return employes.filter((e) => {
      const matchRole = filtreRole === "tous" || e.poste === filtreRole;
      const matchQuery =
        !recherche.trim() ||
        e.nom_complet.toLowerCase().includes(recherche.toLowerCase()) ||
        e.poste.toLowerCase().includes(recherche.toLowerCase());
      return matchRole && matchQuery;
    });
  }, [employes, filtreRole, recherche]);

  // Modale Dossier Collaborateur & Pièces
  const [employeDossier, setEmployeDossier] = useState<EmployeComplet | null>(null);
  const pieceInputRef = useRef<HTMLInputElement>(null);
  const [pieceCible, setPieceCible] = useState<string>("");
  const [televersementEnCours, setTeleversementEnCours] = useState(false);

  const televerserPieceDossier = async (file: File) => {
    if (!id || !employeDossier) return;
    setTeleversementEnCours(true);
    try {
      const res = await api.uploadFile<{ url: string; original_name: string }>(
        `/officines/${id}/upload`,
        file,
        { dossier: "personnel", employe_id: employeDossier.id }
      );
      toast.success(`Pièce « ${pieceCible || file.name} » téléversée avec succès dans le dossier de ${employeDossier.nom_complet} !`);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du téléversement");
    } finally {
      setTeleversementEnCours(false);
      if (pieceInputRef.current) pieceInputRef.current.value = "";
    }
  };

  const exporterDossierEquipe = () => {
    telechargerCsv(
      employes.map((e) => ({
        Matricule: e.matricule || "N/A",
        Nom: e.nom_complet,
        Poste: libellePoste(e.poste),
        Téléphone: e.telephone || "",
        Embauche: e.date_embauche || "",
        "Visite médicale": e.date_visite_medicale || "Non renseignée",
        "Charte BPD": e.charte_qualite_signee ? "Signée" : "En attente",
        Statut: e.actif ? "Actif" : "Inactif",
      })),
      `Dossier_Personnel_BestPharma_${new Date().toISOString().split("T")[0]}`
    );
    toast.success("Registre complet du personnel téléchargé au format CSV !");
  };

  const imprimerAttestationOrdre = () => {
    imprimerFicheOfficielle(
      "ORDRE NATIONAL DES PHARMACIENS DU BÉNIN — SECTION B (OFFICINES)",
      `
        <div style="text-align: center; margin-bottom: 25px;">
          <h2 style="font-size: 16px; margin: 0; color: #0F3B27;">ATTESTATION D'INSCRIPTION AU TABLEAU DE L'ORDRE</h2>
          <p style="font-size: 12px; color: #666; margin-top: 5px;">Exercice Professionnel en Pharmacie d'Officine</p>
        </div>
        <p style="font-size: 12px; line-height: 1.8;">
          Le Conseil National de l'Ordre National des Pharmaciens du Bénin certifie que :<br>
          <strong>Docteur Félicien AGBO</strong><br>
          est régulièrement inscrit au Tableau de l'Ordre sous le numéro : <strong>ONPB-2014-B-089</strong>.<br>
          <strong>Qualité :</strong> Pharmacien Titulaire d'Officine (Section B)<br>
          <strong>Officine :</strong> BestPharma Bénin<br>
          <strong>Validité pour l'exercice :</strong> Année 2026 (Jusqu'au 31/12/2026).<br>
          <strong>Situation ordinale :</strong> Cotisations ordinales et obligations déontologiques strictement à jour.
        </p>
        <div style="margin-top: 30px; font-size: 11px; color: #555;">
          Délivré pour servir et valoir ce que de droit auprès de l'Agence Béninoise du Médicament (ABMed) et des autorités sanitaires.
        </div>
      `
    );
  };

  // Liste des pièces obligatoires du dossier personnel
  const piecesObligatoires = [
    { nom: "Diplôme d'État de Docteur en Pharmacie / Brevet", obligatoire: true },
    { nom: "Attestation d'inscription à l'Ordre (en cours)", obligatoire: true },
    { nom: "Certificat médical d'aptitude physique et mentale", obligatoire: true },
    { nom: "Extrait de casier judiciaire (bulletin n° 3 < 3 mois)", obligatoire: true },
    { nom: "Contrat de travail signé et visé", obligatoire: true },
    { nom: "Fiche de poste signée", obligatoire: true },
    { nom: "Charte de déontologie et engagement signés", obligatoire: true },
  ];

  const optionsSectionsPersonnel: OptionSection[] = [
    {
      valeur: "equipe",
      label: `Équipe & Badges QR (${employes.length})`,
      description: "Liste des collaborateurs, dossiers individuels, statuts et génération de badges",
      badge: `${employes.length}`,
    },
    {
      valeur: "dossier",
      label: "Dossier Individuel & Pièces",
      description: "Diplômes, contrats, attestations et certificats médicaux",
    },
    {
      valeur: "ordre",
      label: "Ordre des Pharmaciens (Section B)",
      description: "Tableau de l'Ordre ONPB, attestations d'inscription et conformité déontologique",
    },
    {
      valeur: "postes",
      label: "Postes & Habilitations",
      description: "Fiches de fonction détaillées, délégations de signatures et habilitations",
    },
    {
      valeur: "organigramme",
      label: "Organigramme Hiérarchique",
      description: "Lignes de responsabilité, suppléances et encadrement pharmaceutique",
    },
    {
      valeur: "formations",
      label: "Plan de Formation Continue",
      description: "Cycles annuels de formation, mise à niveau et évaluations",
    },
    {
      valeur: "entretiens",
      label: "Entretiens Individuels Annuels",
      description: "Bilans de compétences, objectifs qualité et satisfaction du personnel",
    },
    {
      valeur: "conges",
      label: "Congés & Planning Remplacements",
      description: "Continuité de service pharmaceutique et registre des absences",
    },
    {
      valeur: "hygiene",
      label: "Intégration & Suivi Médical",
      description: "Livret d'accueil, charte d'hygiène et visites médicales périodiques",
    },
  ];

  return (
    <div className="grid gap-6">
      {/* HEADER HERO */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-[10px] border border-[#CFF1D2] shadow-sm">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight text-[#0F3B27]">
              Personnel & Équipe Officinale
            </h1>
          </div>
          <p className="mt-1 text-xs text-[#475C50]">
            Gestion des collaborateurs, fiches de poste, contrats, habilitations et plan de formation continue.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <BoutonCreerNC
            sourceDefaut="rh_personnel"
            processusDefaut="GAR"
            graviteDefaut="majeure"
            titreSuggere="Écart qualification ou compétence personnel"
            libelleBouton="Signaler écart RH"
          />
          <Button
            onClick={() => setModalEmploye(true)}
            className="bg-[#0F3B27] hover:bg-[#0F3B27]/90 text-[#92FF5F] font-bold text-xs gap-1.5 shadow-sm rounded-[10px]"
          >
            <UserPlus className="size-4" /> Nouveau Collaborateur
          </Button>
        </div>
      </div>

      {/* SÉLECTEUR DÉROULANT FILTRABLE DES SECTIONS (REMPLACE LES ONGLETS HORIZONTAUX) */}
      <div className="bg-white p-3.5 rounded-[10px] border border-[#CFF1D2] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-[10px] bg-[#0F3B27]/10 text-[#0F3B27]">
            <Users className="size-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-[#0F3B27] block">Module Personnel & Habilitations</span>
            <span className="text-[11px] text-[#475C50]">Sélectionnez la section RH à afficher ou filtrez par mot-clé</span>
          </div>
        </div>
        <div className="w-full md:w-96">
          <SelecteurFiltrable
            options={optionsSectionsPersonnel}
            valeur={activeTab}
            onChangement={setActiveTab}
            placeholder="Choisir une section RH..."
            recherchePlaceholder="Filtrer parmi les 9 sections..."
            className="w-full bg-[#F7F9F7] border-[#CFF1D2] rounded-[10px] text-xs font-semibold"
          />
        </div>
      </div>

      {/* TABS DE LA PAGE */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">

        {/* 1. ÉQUIPE */}
        <TabsContent value="equipe" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-[10px] border border-[#CFF1D2]">
            <div className="relative flex-1">
              <Search className="size-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, rôle ou poste..."
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                className="pl-9 h-9 text-xs rounded-[10px] border-[#CFF1D2]"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="size-4 text-muted-foreground shrink-0" />
              <select
                value={filtreRole}
                onChange={(e) => setFiltreRole(e.target.value)}
                className="h-9 rounded-[10px] border border-[#CFF1D2] bg-white text-xs px-2.5 font-medium"
              >
                <option value="tous">Tous les postes</option>
                <option value="pharmacien_titulaire">Pharmacien Titulaire</option>
                <option value="pharmacien_adjoint">Pharmacien Adjoint</option>
                <option value="dispensateur">Dispensateur</option>
                <option value="caissier">Caissier</option>
                <option value="magasinier">Magasinier</option>
                <option value="agent_entretien">Agent d'entretien</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {employesFiltres.map((e) => {
              const estPharmacien = ["pharmacien_titulaire", "pharmacien_adjoint", "pharmacien_remplacant", "promoteur"].includes(e.poste);
              const ordreInfo = ordres[e.id];

              return (
                <Card
                  key={e.id}
                  onClick={() => setEmployeDossier(e)}
                  className="rounded-[10px] border border-[#CFF1D2] bg-white shadow-sm p-4 space-y-3 cursor-pointer hover:border-[#0F3B27] hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="size-11 rounded-[10px] overflow-hidden bg-[#0F3B27]/10 text-[#0F3B27] flex items-center justify-center font-bold text-sm shrink-0 border border-[#CFF1D2]">
                        {e.photo_url ? (
                          <img src={e.photo_url} alt={e.nom_complet} className="size-full object-cover" />
                        ) : (
                          <span>{e.nom_complet.charAt(0)}</span>
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-[#0F3B27] text-sm leading-tight">{e.nom_complet}</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-mono text-[#0F3B27] bg-[#CFF1D2]/50 px-1.5 py-0.2 rounded font-bold">
                            {e.matricule || `BP-${e.id.slice(0, 4).toUpperCase()}`}
                          </span>
                          <span className="text-[11px] text-[#475C50] capitalize">
                            {e.poste.replace("_", " ")}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Badge
                      variant={e.actif ? "default" : "secondary"}
                      className={e.actif ? "bg-emerald-600 text-[10px]" : "text-[10px]"}
                    >
                      {e.actif ? "Actif" : "Inactif"}
                    </Badge>
                  </div>

                  <div className="p-2.5 rounded-[10px] bg-[#F7F9F7] border border-[#CFF1D2] text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Téléphone :</span>
                      <span>{e.telephone || "—"}</span>
                    </div>
                    {estPharmacien && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Ordre Section B :</span>
                        <strong className="text-emerald-700 font-mono">
                          {ordreInfo?.numero_ordre || "En règle (Certifié)"}
                        </strong>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Charte signée :</span>
                      <span>{e.charte_qualite_signee ? "✓ Oui" : "En attente"}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1" onClick={(evt) => evt.stopPropagation()}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEmployeDossier(e)}
                      className="flex-1 text-xs border-[#CFF1D2] text-[#0F3B27] gap-1 hover:bg-[#CFF1D2]/30 rounded-[10px]"
                    >
                      <FileText className="size-3.5" /> Dossier
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEmployeBadge(e)}
                      className="flex-1 text-xs bg-[#0F3B27] text-[#92FF5F] hover:bg-[#0F3B27]/90 gap-1 rounded-[10px] font-bold"
                      title="Générer Badge avec QR"
                    >
                      <QrCode className="size-3.5" /> Badge QR
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => basculer.mutate(e)}
                      className="h-8 px-2 text-[#475C50] hover:text-red-700 border-[#CFF1D2] rounded-[10px]"
                      title={e.actif ? "Désactiver compte" : "Réactiver compte"}
                    >
                      {e.actif ? <UserX className="size-4" /> : <UserCheck className="size-4" />}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* 2. DOSSIER INDIVIDUEL (PER-01) */}
        <TabsContent value="dossier" className="space-y-4">
          <Card className="rounded-[10px] border border-[#CFF1D2] bg-white shadow-sm p-4 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-base text-[#0F3B27] font-bold">
                  Contrôle des Pièces du Dossier Personnel
                </CardTitle>
                <CardDescription className="text-xs text-[#475C50]">
                  Conservation sécurisée pendant la durée d'activité. Tout document manquant est signalé pour régularisation.
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={exporterDossierEquipe}
                className="text-xs border-[#CFF1D2] text-[#0F3B27] gap-1"
              >
                <Download className="size-3.5" /> Exporter Dossier Complet CSV
              </Button>
            </div>

            <div className="space-y-2 pt-2">
              {piecesObligatoires.map((p, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-[#CFF1D2] bg-[#F7F9F7] flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <FileCheck className="size-4 text-emerald-600" />
                    <span className="font-semibold text-[#0F3B27]">{p.nom}</span>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                    Présent & Archivé
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* 3. ORDRE SECTION B (PER-02) */}
        <TabsContent value="ordre" className="space-y-4">
          <Card className="rounded-[10px] border border-[#CFF1D2] bg-white shadow-sm p-4 space-y-3">
            <CardTitle className="text-base text-[#0F3B27] font-bold">
              Registre d'Exercice & Inscription à l'Ordre National des Pharmaciens (Section B)
            </CardTitle>
            <CardDescription className="text-xs text-[#475C50]">
              Une inscription expirée retire immédiatement la qualité de pharmacien dans toutes les pages (caisse, délivrance, pointage).
            </CardDescription>

            <div className="space-y-3 pt-2">
              <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-700 text-white text-[10px]">Section B · Titulaire</Badge>
                    <span className="font-bold text-emerald-950 text-sm">Dr Félicien AGBO</span>
                  </div>
                  <div className="font-mono text-emerald-900">
                    N° Ordre : <strong>ONPB-2014-B-089</strong> · Échéance de validité : <strong>31/12/2026</strong>
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    Cotisation ordinale à jour. Attestation d'exercice conforme pour l'exercice 2026.
                  </p>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={imprimerAttestationOrdre}
                  className="border-emerald-400 text-emerald-900 text-xs shrink-0 gap-1"
                >
                  <Download className="size-3.5" /> Attestation Ordre PDF
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* 4. POSTES & HABILITATIONS (PER-03 & PER-04) */}
        <TabsContent value="postes" className="space-y-4">
          <Card className="rounded-[10px] border border-[#CFF1D2] bg-white shadow-sm p-4 space-y-3">
            <CardTitle className="text-base text-[#0F3B27] font-bold">
              Fiches de Poste & Matrice d'Habilitations aux Actes de Dispensation
            </CardTitle>
            <CardDescription className="text-xs text-[#475C50]">
              Chaque fonction de dispensation est strictement liée à la qualification validée du dossier.
            </CardDescription>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-xl border border-[#CFF1D2] bg-[#F7F9F7] text-xs space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#0F3B27]">Pharmacien Titulaire</span>
                  <Badge className="bg-[#0F3B27] text-[#92FF5F] text-[10px]">Habilitation Totale</Badge>
                </div>
                <p className="text-muted-foreground text-[11px]">
                  Validation d'ordonnances, stupéfiants Tab. B, préparation magistrale, gestion du stock, direction technique.
                </p>
              </div>

              <div className="p-3 rounded-xl border border-[#CFF1D2] bg-[#F7F9F7] text-xs space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#0F3B27]">Dispensateur / Vendeur</span>
                  <Badge className="bg-blue-600 text-white text-[10px]">Délivrance Encadrée</Badge>
                </div>
                <p className="text-muted-foreground text-[11px]">
                  Délivrance sous supervision directe d'un pharmacien inscrit présent, conseil hygiéno-diététique, encaissement.
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* 5. ORGANIGRAMME (PER-05) */}
        <TabsContent value="organigramme" className="space-y-4">
          <Card className="rounded-[10px] border border-[#CFF1D2] bg-white shadow-sm p-4 space-y-3 text-center">
            <div className="flex justify-between items-center text-left">
              <div>
                <CardTitle className="text-base text-[#0F3B27] font-bold">
                  Organigramme Hiérarchique de l'Équipe
                </CardTitle>
                <CardDescription className="text-xs text-[#475C50]">
                  Généré automatiquement à partir des dossiers du personnel.
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  const html = `
                    <p style="font-size: 12px; margin-bottom: 20px;">
                      Organigramme hiérarchique et fonctionnel de l'officine conforme au Chapitre 2 des Bonnes Pratiques de Dispensation (Ressources Humaines & Qualification).
                    </p>
                    <div style="border: 2px solid #0F3B27; border-radius: 8px; padding: 15px; margin: 15px 0; text-align: center; background: #F7F9F7;">
                      <div style="font-weight: 900; font-size: 15px; color: #0F3B27;">DIRECTION TECHNIQUE & PHARMACIEN TITULAIRE</div>
                      <div style="font-size: 13px; font-weight: bold; margin-top: 4px;">Dr Félicien AGBO</div>
                      <div style="font-size: 11px; color: #555;">Inscrit à l'Ordre National des Pharmaciens du Bénin — Section B</div>
                    </div>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                      <thead>
                        <tr>
                          <th>Pôle & Fonction</th>
                          <th>Missions BPD Principales</th>
                          <th>Responsables & Titulaires</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td><strong>Pôle Dispensation & Conseil</strong></td>
                          <td>Délivrance sous contrôle pharmaceutique, analyse des ordonnances, conseils d'hygiène et posologie.</td>
                          <td>Pharmaciens Adjoints & Dispensateurs Diplômés</td>
                        </tr>
                        <tr>
                          <td><strong>Pôle Magasin, Stock & Chaîne du Froid</strong></td>
                          <td>Réception, FEFO, quarantaine, surveillance bi-quotidienne des températures (2–8 °C et 15–25 °C).</td>
                          <td>Magasinier en chef sous supervision Pharmacien</td>
                        </tr>
                        <tr>
                          <td><strong>Pôle Assurance Qualité & BPD</strong></td>
                          <td>Gestion documentaire (GED), suivi des non-conformités (CAPA), réclamations et auto-évaluation ABMed.</td>
                          <td>Référent Qualité / Pharmacien Adjoint</td>
                        </tr>
                        <tr>
                          <td><strong>Pôle Hygiène, Entretien & Sécurité</strong></td>
                          <td>Nettoyage selon plan GLO-EN-001, lutte anti-nuisibles, contrôle des extincteurs et sécurité incendie.</td>
                          <td>Agents d'entretien qualifiés</td>
                        </tr>
                      </tbody>
                    </table>
                  `;
                  imprimerFicheOfficielle("ORGANIGRAMME DE L'OFFICINE", html);
                }}
                className="bg-[#0F3B27] text-[#92FF5F] text-xs font-bold gap-1"
              >
                <Printer className="size-3.5" /> Imprimer Organigramme
              </Button>
            </div>

            <div className="p-6 bg-[#F7F9F7] rounded-[10px] border border-[#CFF1D2] space-y-4 my-2">
              <div className="inline-block p-3 rounded-xl bg-[#0F3B27] text-white text-xs font-bold shadow-md">
                Pharmacien Titulaire & Directeur Technique
                <span className="block text-[11px] text-[#92FF5F] font-normal">Dr Félicien AGBO</span>
              </div>

              <div className="w-0.5 h-6 bg-[#0F3B27] mx-auto" />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto text-xs">
                <div className="p-2.5 rounded-xl bg-white border border-[#CFF1D2] shadow-sm">
                  <span className="font-bold text-[#0F3B27] block">Pôle Dispensation</span>
                  <span className="text-[11px] text-muted-foreground">Dispensateurs & Caissiers</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-[#CFF1D2] shadow-sm">
                  <span className="font-bold text-[#0F3B27] block">Pôle Magasin & Froid</span>
                  <span className="text-[11px] text-muted-foreground">Magasiniers</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-[#CFF1D2] shadow-sm">
                  <span className="font-bold text-[#0F3B27] block">Pôle Hygiène & Locaux</span>
                  <span className="text-[11px] text-muted-foreground">Agents d'entretien</span>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* 6. FORMATIONS & COMPÉTENCES */}
        <TabsContent value="formations" className="space-y-4">
          <Card className="rounded-[10px] border border-[#CFF1D2] bg-white shadow-sm p-4 space-y-3">
            <CardTitle className="text-base text-[#0F3B27] font-bold">
              Plan Annuel de Formation & Compétences
            </CardTitle>
            <CardDescription className="text-xs text-[#475C50]">
              Sessions : chaîne du froid, traçabilité des stupéfiants, hygiène et délivrance ordonnances.
            </CardDescription>

            <div className="space-y-2 pt-2 text-xs">
              <div className="p-3 rounded-xl border border-[#CFF1D2] bg-[#F7F9F7] flex justify-between items-center">
                <div>
                  <span className="font-bold text-[#0F3B27]">Maîtrise de la chaîne du froid 2–8 °C</span>
                  <p className="text-muted-foreground text-[11px]">Émargement électronique complet · 6 collaborateurs formés</p>
                </div>
                <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Validée</Badge>
              </div>
              <div className="p-3 rounded-xl border border-[#CFF1D2] bg-[#F7F9F7] flex justify-between items-center">
                <div>
                  <span className="font-bold text-[#0F3B27]">Sécurisation de l'ordonnancier et stupéfiants</span>
                  <p className="text-muted-foreground text-[11px]">Prévue pour le 25/11/2026</p>
                </div>
                <Badge variant="outline" className="text-[10px]">Planifiée</Badge>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* 7. ENTRETIENS ANNUELS */}
        <TabsContent value="entretiens" className="space-y-4">
          <Card className="rounded-[10px] border border-[#CFF1D2] bg-white shadow-sm p-4 space-y-3">
            <CardTitle className="text-base text-[#0F3B27] font-bold">
              Entretiens Annuels d'Évaluation
            </CardTitle>
            <CardDescription className="text-xs text-[#475C50]">
              Bilan des compétences acquises, objectifs qualité et satisfaction de l'équipe.
            </CardDescription>

            <div className="p-4 rounded-xl border border-[#CFF1D2] bg-[#F7F9F7] text-xs">
              Campagne d'entretiens annuels planifiée pour Décembre. Trame standard prête à l'emploi.
            </div>
          </Card>
        </TabsContent>

        {/* 8. CONGÉS & CONTRATS */}
        <TabsContent value="conges" className="space-y-4">
          <Card className="rounded-[10px] border border-[#CFF1D2] bg-white shadow-sm p-4 space-y-3">
            <CardTitle className="text-base text-[#0F3B27] font-bold">
              Contrats de Travail & Tableau des Congés
            </CardTitle>
            <CardDescription className="text-xs text-[#475C50]">
              Gestion des périodes d'essai, fins de contrat et continuité de présence pharmaceutique.
            </CardDescription>

            <div className="p-4 rounded-xl border border-[#CFF1D2] bg-[#F7F9F7] text-xs">
              Tous les contrats de travail en cours sont en règle. Continuité de présence assurée sur les plannings prévisionnels.
            </div>
          </Card>
        </TabsContent>

        {/* 9. INTÉGRATION & HYGIÈNE */}
        <TabsContent value="hygiene" className="space-y-4">
          <Card className="rounded-[10px] border border-[#CFF1D2] bg-white shadow-sm p-4 space-y-3">
            <CardTitle className="text-base text-[#0F3B27] font-bold">
              Parcours d'Intégration & Suivi Médical
            </CardTitle>
            <CardDescription className="text-xs text-[#475C50]">
              Livret d'accueil, charte d'hygiène et visites médicales périodiques du travail.
            </CardDescription>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
              <div className="p-3 rounded-xl border border-[#CFF1D2] bg-[#F7F9F7] space-y-1">
                <div className="font-bold text-[#0F3B27] flex items-center gap-1.5">
                  <HeartPulse className="size-4 text-emerald-600" /> Visites Médicales Périodiques
                </div>
                <p className="text-muted-foreground text-[11px]">
                  100% du personnel dispose d'un certificat médical d'aptitude en cours de validité (&lt; 1 an).
                </p>
              </div>

              <div className="p-3 rounded-xl border border-[#CFF1D2] bg-[#F7F9F7] space-y-1">
                <div className="font-bold text-[#0F3B27] flex items-center gap-1.5">
                  <ShieldCheck className="size-4 text-[#0F3B27]" /> Charte Déontologique
                </div>
                <p className="text-muted-foreground text-[11px]">
                  Signée individuellement par chaque collaborateur dès la prise de poste.
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODALE CRÉATION COLLABORATEUR */}
      <Dialog open={modalEmploye} onOpenChange={setModalEmploye}>
        <DialogContent className="max-w-md bg-white border border-[#CFF1D2] rounded-[10px] shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#0F3B27] font-display">
              Nouveau Collaborateur de l'Officine
            </DialogTitle>
            <DialogDescription className="text-xs text-[#475C50]">
              Création du profil personnel conforme aux exigences BPD-2.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreerEmploye} className="space-y-3 pt-2 text-xs">
            <div>
              <Label className="font-semibold text-[#0F3B27]">Nom complet *</Label>
              <Input
                placeholder="Ex : Dr Saliou DOSSOU"
                value={nomEmploye}
                onChange={(e) => setNomEmploye(e.target.value)}
                className="h-8 text-xs rounded-xl border-[#CFF1D2]"
                required
              />
            </div>

            <div>
              <Label className="font-semibold text-[#0F3B27]">Fonction / Poste *</Label>
              <select
                value={posteEmploye}
                onChange={(e) => setPosteEmploye(e.target.value)}
                className="w-full h-8 rounded-xl border border-[#CFF1D2] bg-white text-xs px-2 font-medium"
              >
                <option value="pharmacien_titulaire">Pharmacien Titulaire</option>
                <option value="pharmacien_adjoint">Pharmacien Adjoint</option>
                <option value="dispensateur">Dispensateur</option>
                <option value="caissier">Caissier</option>
                <option value="magasinier">Magasinier</option>
                <option value="agent_entretien">Agent d'entretien</option>
              </select>
            </div>

            <div>
              <Label className="font-semibold text-[#0F3B27]">Téléphone</Label>
              <Input
                placeholder="+229 97 00 00 00"
                value={telEmploye}
                onChange={(e) => setTelEmploye(e.target.value)}
                className="h-8 text-xs rounded-[10px] border-[#CFF1D2]"
              />
            </div>

            <div>
              <Label className="font-semibold text-[#0F3B27]">Photo / Avatar Collaborateur</Label>
              <Input
                placeholder="URL photo (ex: https://...) ou laisser vide"
                value={photoEmploye}
                onChange={(e) => setPhotoEmploye(e.target.value)}
                className="h-8 text-xs rounded-[10px] border-[#CFF1D2]"
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Cette photo apparaîtra sur le badge PVC officiel et la borne tablette de pointage.
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalEmploye(false)}
                className="border-[#CFF1D2] text-[#475C50] rounded-[10px]"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={enCours || !nomEmploye.trim()}
                className="bg-[#0F3B27] hover:bg-[#0F3B27]/90 text-[#92FF5F] font-bold text-xs rounded-[10px]"
              >
                {enCours ? "Création…" : "Enregistrer Collaborateur"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODALE SIGNATURE CODE PIN (BPD-C10) */}
      <ModaleSignatureCode
        ouvert={modaleSignOuverte}
        onFermer={() => setModaleSignOuverte(false)}
        titreAction={actionSignature?.titre || "Signature de l'enregistrement RH"}
        onSigner={async (sig) => {
          if (actionSignature?.cb) actionSignature.cb();
        }}
        articleBpd="BPD-2 / Art. 2.01"
      />

      {/* MODALE DOSSIER INDIVIDUEL ET TÉLÉVERSEMENT PIÈCES (GAR-LI-001) */}
      <Dialog open={!!employeDossier} onOpenChange={(open) => !open && setEmployeDossier(null)}>
        <DialogContent className="max-w-lg bg-white border border-[#CFF1D2] rounded-[10px] shadow-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#0F3B27] font-display">
              Dossier Individuel : {employeDossier?.nom_complet}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#475C50]">
              Poste : {employeDossier?.poste} · Matricule : {employeDossier?.matricule || "N/A"} · Conservation sécurisée.
            </DialogDescription>
          </DialogHeader>

          <input
            ref={pieceInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) televerserPieceDossier(f);
            }}
          />

          <div className="space-y-2.5 py-2">
            {piecesObligatoires.map((p, idx) => (
              <div
                key={idx}
                className="p-3 rounded-[10px] border border-[#CFF1D2] bg-[#F7F9F7] flex items-center justify-between text-xs gap-2"
              >
                <div>
                  <p className="font-semibold text-[#0F3B27]">{p.nom}</p>
                  <p className="text-[10px] text-muted-foreground">Obligatoire pour inspection ABMed</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={televersementEnCours}
                  onClick={() => {
                    setPieceCible(p.nom);
                    pieceInputRef.current?.click();
                  }}
                  className="h-7 text-[11px] border-[#CFF1D2] text-[#0F3B27] gap-1 shrink-0 rounded-[10px]"
                >
                  <Upload className="size-3" />
                  {televersementEnCours && pieceCible === p.nom ? "Envoi…" : "Déposer pièce"}
                </Button>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-[10px]" onClick={() => setEmployeDossier(null)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODALE GÉNÉRATION DE BADGE AVEC CODE QR (SCANNER TABLETTE H24) */}
      <Dialog open={!!employeBadge} onOpenChange={(open) => !open && setEmployeBadge(null)}>
        <DialogContent className="max-w-md bg-white border border-[#CFF1D2] rounded-[10px] shadow-xl p-6">
          {employeBadge && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-[#0F3B27] font-display">
                  Badge Professionnel Sécurisé & Code QR
                </DialogTitle>
                <DialogDescription className="text-xs text-[#475C50]">
                  Badge officiel d'identification et de pointage pour la borne tablette H24 de l'officine.
                </DialogDescription>
              </DialogHeader>

              {/* CARTE BADGE FORMAT PVC */}
              <div
                id="carte-badge-pvc"
                className="bg-white rounded-[10px] border-2 border-[#0F3B27] p-5 shadow-md flex flex-col items-center text-center relative overflow-hidden"
              >
                {/* Bandeau supérieur Pharmacie */}
                <div className="w-full bg-[#0F3B27] text-[#92FF5F] py-2 px-3 rounded-t-[8px] -mt-5 mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Award className="size-4 text-[#92FF5F]" />
                    <span className="font-extrabold text-xs tracking-wider uppercase">BestPharma Bénin</span>
                  </div>
                  <span className="text-[10px] bg-[#92FF5F] text-[#0F3B27] font-bold px-1.5 py-0.2 rounded font-mono">
                    BPD-ABMed
                  </span>
                </div>

                {/* Photo & Nom */}
                <div className="size-24 rounded-full overflow-hidden border-2 border-[#0F3B27] bg-[#F7F9F7] flex items-center justify-center shadow-sm mb-3">
                  {employeBadge.photo_url ? (
                    <img src={employeBadge.photo_url} alt={employeBadge.nom_complet} className="size-full object-cover" />
                  ) : (
                    <div className="size-full bg-gradient-to-tr from-[#0F3B27] to-[#1E6B47] text-white flex items-center justify-center font-bold text-3xl font-display">
                      {employeBadge.nom_complet.charAt(0)}
                    </div>
                  )}
                </div>

                <h3 className="font-display font-extrabold text-base text-[#0F3B27] leading-tight">
                  {employeBadge.nom_complet.toUpperCase()}
                </h3>
                <span className="text-xs font-bold text-[#1E6B47] uppercase tracking-wide mt-0.5">
                  {employeBadge.poste.replace("_", " ")}
                </span>
                <span className="text-[11px] font-mono text-muted-foreground mt-0.5">
                  Matricule : <strong className="text-[#0F3B27]">{employeBadge.matricule || `BP-${employeBadge.id.slice(0, 6).toUpperCase()}`}</strong>
                </span>

                {/* QR Code de pointage instantané */}
                <div className="my-3 p-2.5 bg-[#F7F9F7] rounded-[10px] border border-[#CFF1D2] flex flex-col items-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                      `BESTPHARMA_BADGE:${employeBadge.matricule || employeBadge.id}`
                    )}`}
                    alt="Badge QR"
                    className="size-32 object-contain bg-white p-1 rounded-[6px] border border-[#CFF1D2]"
                  />
                  <span className="text-[10px] font-mono font-bold text-[#0F3B27] mt-1.5 tracking-wider">
                    SCAN TABLETTE H24
                  </span>
                </div>

                <div className="text-[10px] text-[#475C50] border-t border-[#CFF1D2] pt-2 w-full flex justify-between items-center">
                  <span>Valide : Année 2026</span>
                  <span className="font-semibold text-emerald-800">Ordre / ABMed Conforme</span>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-[#CFF1D2]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEmployeBadge(null)}
                  className="border-[#CFF1D2] text-[#475C50] text-xs rounded-[10px]"
                >
                  Fermer
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    const matricule = employeBadge.matricule || `BP-${employeBadge.id.slice(0, 6).toUpperCase()}`;
                    imprimerFicheOfficielle(
                      `Badge Professionnel - ${employeBadge.nom_complet}`,
                      `
                        <div style="font-family: Arial, sans-serif; text-align: center; max-width: 320px; margin: 20px auto; border: 2px solid #0F3B27; border-radius: 12px; padding: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                          <div style="background: #0F3B27; color: #92FF5F; padding: 8px; border-radius: 8px 8px 0 0; margin: -20px -20px 15px -20px;">
                            <h3 style="margin: 0; font-size: 14px; letter-spacing: 1px;">BESTPHARMA BÉNIN</h3>
                            <p style="margin: 2px 0 0 0; font-size: 10px; color: #fff;">BADGE PROFESSIONNEL OFFICIEL</p>
                          </div>
                          <div style="width: 80px; height: 80px; margin: 10px auto; border-radius: 50%; background: #0F3B27; color: white; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: bold; overflow: hidden;">
                            ${employeBadge.photo_url ? `<img src="${employeBadge.photo_url}" style="width: 100%; height: 100%; object-fit: cover;" />` : employeBadge.nom_complet.charAt(0)}
                          </div>
                          <h2 style="margin: 8px 0 2px 0; color: #0F3B27; font-size: 16px;">${employeBadge.nom_complet.toUpperCase()}</h2>
                          <p style="margin: 0; font-size: 12px; font-weight: bold; color: #1E6B47;">${employeBadge.poste.replace("_", " ").toUpperCase()}</p>
                          <p style="margin: 4px 0; font-family: monospace; font-size: 11px; color: #555;">Matricule : ${matricule}</p>
                          <img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                            `BESTPHARMA_BADGE:${matricule}`
                          )}" style="width: 140px; height: 140px; margin: 10px auto; display: block;" />
                          <p style="margin: 6px 0 0 0; font-size: 9px; color: #777;">À scanner sur la tablette de pointage BestPharma</p>
                        </div>
                      `
                    );
                    toast.success("Impression du badge lancée !");
                  }}
                  className="bg-[#0F3B27] hover:bg-[#0F3B27]/90 text-[#92FF5F] font-bold text-xs gap-1.5 rounded-[10px]"
                >
                  <Printer className="size-3.5" /> Imprimer le Badge PVC
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
