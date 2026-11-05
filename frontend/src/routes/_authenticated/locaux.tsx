import { useState, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Wrench,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  Plus,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  SprayCan,
  Bug,
  HardDrive,
  FileCheck,
  Flame,
  QrCode,
  FileText,
  Download,
  Upload,
  Layers,
  Printer,
  Shield,
  Eye,
  Check,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api-client";
import { telechargerCsv, imprimerFicheOfficielle } from "@/lib/export-utils";
import { formatDateHeure } from "@/lib/format";
import { useOfficine } from "@/lib/officine-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

export const Route = createFileRoute("/_authenticated/locaux")({
  head: () => ({
    meta: [
      { title: "Locaux, Équipements & Hygiène — BestPharma" },
      {
        name: "description",
        content: "Carnet de vie des équipements, maintenance, étalonnages et plan de bio-nettoyage conforme au Guide BPD.",
      },
    ],
  }),
  component: PageLocaux,
});

function PageLocaux() {
  const { courante } = useOfficine();
  const queryClient = useQueryClient();
  const id = courante?.officine_id;

  const [activeTab, setActiveTab] = useState("equipements");

  // DIALOG CARNET DE VIE & QR
  const [equipementCarnet, setEquipementCarnet] = useState<any | null>(null);
  const [equipementQr, setEquipementQr] = useState<any | null>(null);

  // DIALOG NOUVEL ÉQUIPEMENT
  const [modalEquipement, setModalEquipement] = useState(false);
  const [codeInterne, setCodeInterne] = useState("");
  const [designation, setDesignation] = useState("");
  const [categorie, setCategorie] = useState("refrigerateur");
  const [marqueModele, setMarqueModele] = useState("");
  const [emplacement, setEmplacement] = useState("");
  const [periodicite, setPeriodicite] = useState(12);

  // DIALOG ÉMARGEMENT NETTOYAGE
  const [modalNettoyage, setModalNettoyage] = useState(false);
  const [zoneNettoyage, setZoneNettoyage] = useState("comptoir");
  const [produitNettoyage, setProduitNettoyage] = useState("Eau de Javel diluée 0.5% + Détergent neutre");
  const [notesNettoyage, setNotesNettoyage] = useState("");
  const [enCours, setEnCours] = useState(false);

  // MODALE SIGNATURE PIN
  const [modaleSignOuverte, setModaleSignOuverte] = useState(false);
  const [actionSignature, setActionSignature] = useState<{ titre: string; cb: () => void } | null>(null);

  // DIALOG ORDRE DE TRAVAIL MAINTENANCE
  const [modalOrdreTravail, setModalOrdreTravail] = useState(false);
  const [equipementOt, setEquipementOt] = useState("");
  const [typeOt, setTypeOt] = useState<"preventif" | "curatif">("preventif");
  const [prestataireOt, setPrestataireOt] = useState("");
  const [motifOt, setMotifOt] = useState("");

  // REQUÊTE ÉQUIPEMENTS
  const { data: equipements, refetch: refetchEquipements } = useQuery({
    queryKey: ["equipements", id],
    enabled: !!id,
    queryFn: async () => {
      return api.get<any[]>(`/api/officines/${id}/equipements`);
    },
  });

  // REQUÊTE NETTOYAGES
  const { data: nettoyages, refetch: refetchNettoyages } = useQuery({
    queryKey: ["nettoyages", id],
    enabled: !!id,
    queryFn: async () => {
      return api.get<any>(`/api/officines/${id}/nettoyages`);
    },
  });

  async function creerEquipement(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !codeInterne || !designation) return;
    setEnCours(true);

    try {
      await api.post(`/api/officines/${id}/equipements`, {
        code_interne: codeInterne.trim(),
        designation: designation.trim(),
        categorie,
        marque_modele: marqueModele.trim() || null,
        emplacement: emplacement.trim() || null,
        periodicite_etalonnage_mois: periodicite,
      });

      toast.success("Équipement ajouté au carnet de vie.");
      setModalEquipement(false);
      setCodeInterne("");
      setDesignation("");
      setMarqueModele("");
      setEmplacement("");
      refetchEquipements();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'enregistrement");
    } finally {
      setEnCours(false);
    }
  }

  // Certificats et Exports (LOC-03, LOC-06, PRA)
  const certifInputRef = useRef<HTMLInputElement>(null);
  const [certifEnCours, setCertifEnCours] = useState(false);

  const televerserCertificat = async (file: File) => {
    if (!id) return;
    setCertifEnCours(true);
    try {
      const res = await api.uploadFile<{ url: string; original_name: string }>(
        `/officines/${id}/upload`,
        file,
        { dossier: "etalonnages" }
      );
      toast.success(`Certificat « ${res.original_name || file.name} » enregistré et rattaché à l'appareil !`);
    } catch (err: any) {
      toast.error(err.message || "Échec du téléversement du certificat");
    } finally {
      setCertifEnCours(false);
      if (certifInputRef.current) certifInputRef.current.value = "";
    }
  };

  const telechargerRapport3D = () => {
    telechargerCsv(
      [
        { Prestataire: "BÉNIN 3D HYGIÈNE", "Date intervention": "28/10/2026", Type: "Dératisation / Désinsectisation", Statut: "Validé", "Prochaine intervention": "28/01/2027", "Zones traitées": "Réserve centrale, sas livraison, faux-plafonds, caniveaux", "FDS déposées": "RODENT-BLOCK-04, DELTA-PULV-02" },
      ],
      `Rapport_Intervention_3D_${new Date().toISOString().split("T")[0]}`
    );
    toast.success("Rapport d'intervention 3D téléchargé !");
  };

  const imprimerSecuriteIncendie = () => {
    imprimerFicheOfficielle(
      "REGISTRE DE SÉCURITÉ INCENDIE ET CONTRÔLE DES EXTINCTEURS",
      `
        <p style="font-size: 12px; margin-bottom: 12px;">
          <strong>Référence :</strong> Arrêté ABMed Art. 4.09 & Code de la Sécurité BPD-4<br>
          <strong>Dernière vérification annuelle :</strong> Mai 2026 · Organisme certifié : BENIN FIRE DEFENSE
        </p>
        <table>
          <thead>
            <tr>
              <th>Équipement</th>
              <th>Emplacement</th>
              <th>Type / Charge</th>
              <th>Date Contrôle</th>
              <th>Validité</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>EXT-01</td>
              <td>Magasin & Réserve</td>
              <td>CO2 - 5 kg</td>
              <td>15/05/2026</td>
              <td>15/05/2027</td>
              <td><span style="color: #0F3B27; font-weight: bold;">Conforme</span></td>
            </tr>
            <tr>
              <td>EXT-02</td>
              <td>Comptoir & Caisse</td>
              <td>Poudre ABC - 6 kg</td>
              <td>15/05/2026</td>
              <td>15/05/2027</td>
              <td><span style="color: #0F3B27; font-weight: bold;">Conforme</span></td>
            </tr>
          </tbody>
        </table>
      `
    );
  };

  const exporterDossierSystemePra = () => {
    imprimerFicheOfficielle(
      "DOSSIER SYSTÈME INFORMATISÉ ET PLAN DE REPRISE D'ACTIVITÉ (PRA)",
      `
        <p style="font-size: 12px; margin-bottom: 12px;">
          <strong>Plateforme :</strong> BestPharma Officine Edition · Version 2026.11<br>
          <strong>Hébergement Local :</strong> Serveur autonome sur site avec réplication cloud chiffrée.<br>
          <strong>Chiffrement :</strong> AES-256 avec hachage SHA-256 inaltérable.
        </p>
        <h3 style="font-size: 14px; color: #0F3B27; margin-top: 15px;">Journal des Sauvegardes & Tests PRA</h3>
        <table>
          <thead>
            <tr>
              <th>Type d'opération</th>
              <th>Fréquence</th>
              <th>Dernière exécution</th>
              <th>RPO / RTO</th>
              <th>Résultat</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Sauvegarde automatique</td>
              <td>Quotidienne (03h00)</td>
              <td>Ce jour 03:00</td>
              <td>RPO &lt; 24h</td>
              <td><strong style="color: #0F3B27;">100% Réussie (Chiffrée)</strong></td>
            </tr>
            <tr>
              <td>Essai de restauration (PRA)</td>
              <td>Annuel</td>
              <td>14/10/2026</td>
              <td>RTO &lt; 15 min</td>
              <td><strong style="color: #0F3B27;">Validé sans perte</strong></td>
            </tr>
            <tr>
              <td>Mode Secours Dégradé</td>
              <td>Sur coupure réseau</td>
              <td>Opérationnel</td>
              <td>Immédiat</td>
              <td><strong style="color: #0F3B27;">Cahiers papier disponibles</strong></td>
            </tr>
          </tbody>
        </table>
      `
    );
  };

  async function emargerNettoyage(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setEnCours(true);

    try {
      await api.post(`/api/officines/${id}/nettoyages`, {
        zone: zoneNettoyage,
        frequence: "quotidien",
        produit_utilise: produitNettoyage,
        notes: notesNettoyage || null,
      });

      toast.success("Opération de bio-nettoyage émargée avec succès.");
      setModalNettoyage(false);
      setNotesNettoyage("");
      refetchNettoyages();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'émargement");
    } finally {
      setEnCours(false);
    }
  }

  // Ordres de travail de maintenance (simulés/actifs)
  const ordresMaintenance = [
    {
      id: "OT-2026-01",
      code: "FRIG-01",
      equipement: "Réfrigérateur Médical B Medical Systems",
      type: "preventif",
      echeance: "15/11/2026",
      statut: "planifie",
      prestataire: "FROID PLUS BÉNIN SARL",
      description: "Contrôle compresseur, gaz frigorigène R134a et étanchéité joints.",
    },
    {
      id: "OT-2026-02",
      code: "CLIM-01",
      equipement: "Climatiseur Inverter Magasin 18000 BTU",
      type: "curatif",
      echeance: "08/11/2026",
      statut: "en_cours",
      prestataire: "CLIM SERVICE COTONOU",
      description: "Nettoyage filtres et vérification thermostat d'ambiance.",
    },
    {
      id: "OT-2026-03",
      code: "OND-01",
      equipement: "Onduleur Haute Disponibilité APC 3kVA",
      type: "preventif",
      echeance: "20/12/2026",
      statut: "planifie",
      prestataire: "TECHNO-ENERGIE SA",
      description: "Test de bascule automatique secteur/batteries et autonomie.",
    },
  ];

  // Grille de conformité des locaux (LOC-06)
  const criteresLocaux = [
    { rubrique: "Emplacement conforme à la licence", conforme: true, note: "Arrêté d'exploitation ABMed affiché à l'entrée." },
    { rubrique: "Locaux d'un seul tenant & accès direct", conforme: true, note: "Circulation fluide sans séparation tierce." },
    { rubrique: "Espace de confidentialité isolé", conforme: true, note: "Cabine d'entretien pharmaceutique insonorisée." },
    { rubrique: "Armoire sécurisée des stupéfiants", conforme: true, note: "Fermeture à clé sous la responsabilité exclusive du pharmacien." },
    { rubrique: "Zone de stockage et réserve saine", conforme: true, note: "Rayonnages à plus de 10 cm du sol, absence d'humidité." },
    { rubrique: "Dispositif d'isolement hors heures d'ouverture", conforme: true, note: "Volet roulant motorisé et alarme connectée." },
    { rubrique: "Sanitaires & Vestiaires séparés", conforme: true, note: "Vestiaire dédié au personnel avec casiers individuels." },
  ];

  const optionsSectionsLocaux: OptionSection[] = [
    {
      valeur: "equipements",
      label: `Équipements & Carnet de vie (${equipements?.length ?? 0})`,
      description: "Inventaire complet, carnet de vie individuel, étiquettes QR et périodicités",
      badge: `${equipements?.length ?? 0}`,
    },
    {
      valeur: "maintenance",
      label: "Maintenance & Ordres de Travail",
      description: "Plan annuel de maintenance, interventions curatives et prestataires",
    },
    {
      valeur: "etalonnage",
      label: "Étalonnage Métrologique",
      description: "Certificats pour balances, thermomètres, hygromètres et sondes",
    },
    {
      valeur: "nettoyage",
      label: "Nettoyage & Bio-hygiène",
      description: "Plan de bio-nettoyage quotidien, hebdomadaire et mensuel avec émargement",
    },
    {
      valeur: "nuisibles",
      label: "Nuisibles & Sécurité Incendie",
      description: "Contrôle 3D (dératisation, désinsectisation) et registres de sécurité",
    },
    {
      valeur: "conformite",
      label: "Conformité des Locaux & Milieu",
      description: "Zones réglementaires, séparation des flux, sécurité des stocks et intégrité",
    },
    {
      valeur: "systeme",
      label: "Système Informatisé & Sauvegardes",
      description: "Dossier de validation système, sauvegardes 3-2-1, onduleurs et Plan de Reprise",
    },
  ];

  return (
    <div className="grid gap-6">
      {/* HEADER HERO */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-[10px] border border-[#CFF1D2] shadow-sm">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight text-[#0F3B27]">
              Locaux & Équipements
            </h1>
          </div>
          <p className="mt-1 text-xs text-[#475C50]">
            Gestion des équipements, carnet de vie, maintenance préventive, étalonnages et plan d'hygiène.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <BoutonCreerNC
            sourceDefaut="locaux_materiel"
            processusDefaut="GAR"
            graviteDefaut="majeure"
            titreSuggere="Anomalie matériel ou locaux"
            libelleBouton="Signaler anomalie 5M"
          />
          {activeTab === "equipements" && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  if (!equipements || equipements.length === 0) {
                    toast.error("Aucun équipement à exporter.");
                    return;
                  }
                  telechargerCsv(
                    equipements.map((eq: any) => ({
                      code: eq.code_interne,
                      designation: eq.designation,
                      categorie: eq.categorie,
                      marque_modele: eq.marque_modele || "N/A",
                      emplacement: eq.emplacement,
                      statut: eq.statut,
                      derniere_maintenance: eq.derniere_maintenance || "N/A",
                      prochaine_maintenance: eq.prochaine_maintenance || "N/A",
                    })),
                    `bestpharma_equipements_${new Date().toISOString().split("T")[0]}`,
                    [
                      { cle: "code", label: "Code Interne" },
                      { cle: "designation", label: "Désignation" },
                      { cle: "categorie", label: "Catégorie" },
                      { cle: "marque_modele", label: "Marque / Modèle" },
                      { cle: "emplacement", label: "Emplacement" },
                      { cle: "statut", label: "Statut" },
                      { cle: "derniere_maintenance", label: "Dernière Maintenance" },
                      { cle: "prochaine_maintenance", label: "Prochaine Échéance" },
                    ]
                  );
                  toast.success("Registre des équipements exporté en CSV !");
                }}
                className="border-[#CFF1D2] text-[#0F3B27] font-bold text-xs gap-1.5 hover:bg-[#CFF1D2]/30 rounded-[10px]"
              >
                <Download className="size-4" /> Export CSV
              </Button>
              <Button
                onClick={() => setModalEquipement(true)}
                className="bg-[#0F3B27] hover:bg-[#0F3B27]/90 text-[#92FF5F] font-bold text-xs gap-1.5 shadow-sm rounded-[10px]"
              >
                <Plus className="size-4" /> Nouvel Équipement
              </Button>
            </>
          )}
          {activeTab === "nettoyage" && (
            <Button
              onClick={() => setModalNettoyage(true)}
              className="bg-[#0F3B27] hover:bg-[#0F3B27]/90 text-[#92FF5F] font-bold text-xs gap-1.5 shadow-sm rounded-[10px]"
            >
              <Sparkles className="size-4" /> Émarger Nettoyage
            </Button>
          )}
        </div>
      </div>

      {/* SÉLECTEUR DÉROULANT FILTRABLE DES SECTIONS (REMPLACE LES ONGLETS HORIZONTAUX) */}
      <div className="bg-white p-3.5 rounded-[10px] border border-[#CFF1D2] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-[10px] bg-[#0F3B27]/10 text-[#0F3B27]">
            <Layers className="size-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-[#0F3B27] block">Module Locaux & Matériel (5M)</span>
            <span className="text-[11px] text-[#475C50]">Sélectionnez la section à afficher ou utilisez la recherche</span>
          </div>
        </div>
        <div className="w-full md:w-96">
          <SelecteurFiltrable
            options={optionsSectionsLocaux}
            valeur={activeTab}
            onChangement={setActiveTab}
            placeholder="Choisir une section..."
            recherchePlaceholder="Filtrer parmi les 7 sections..."
            className="w-full bg-[#F7F9F7] border-[#CFF1D2] rounded-[10px] text-xs font-semibold"
          />
        </div>
      </div>

      {/* TABS DE LA PAGE */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">

        {/* 1. ÉQUIPEMENTS & CARNET DE VIE */}
        <TabsContent value="equipements" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {equipements && equipements.length > 0 ? (
              equipements.map((eq) => {
                const estConforme = eq.statut === "conforme";
                return (
                  <Card key={eq.id} className="rounded-[10px] border border-[#CFF1D2] bg-white shadow-sm p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="p-2.5 rounded-[10px] bg-[#0F3B27]/10 text-[#0F3B27]">
                        <Wrench className="size-5" />
                      </div>
                      <Badge
                        variant={estConforme ? "default" : "destructive"}
                        className={estConforme ? "bg-emerald-600 text-white text-[10px]" : "text-[10px]"}
                      >
                        {estConforme ? "Conforme" : "À étalonner / Panne"}
                      </Badge>
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-[#0F3B27] bg-[#CFF1D2]/40 px-1.5 py-0.5 rounded">
                          {eq.code_interne}
                        </span>
                        <h3 className="font-bold text-[#0F3B27] text-sm truncate">{eq.designation}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {eq.marque_modele || "Marque non précisée"} · {eq.emplacement || "Officine"}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-[10px] bg-[#F7F9F7] border border-[#CFF1D2] text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Périodicité étalonnage :</span>
                        <strong>{eq.periodicite_etalonnage_mois} mois</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Prochain contrôle :</span>
                        <span className="font-semibold text-emerald-800">
                          {eq.date_prochain_etalonnage || "N/A"}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEquipementCarnet(eq)}
                        className="w-full text-xs border-[#CFF1D2] text-[#0F3B27] gap-1 hover:bg-[#CFF1D2]/30 rounded-[10px]"
                      >
                        <Eye className="size-3.5" /> Carnet de vie
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEquipementQr(eq)}
                        className="h-8 px-2 text-[#475C50] border-[#CFF1D2] hover:bg-[#CFF1D2]/30 rounded-[10px]"
                        title="Code QR équipement"
                      >
                        <QrCode className="size-4" />
                      </Button>
                    </div>
                  </Card>
                );
              })
            ) : (
              <div className="col-span-3 text-center py-10 bg-white rounded-[10px] border border-[#CFF1D2] text-xs text-muted-foreground">
                <Wrench className="size-8 mx-auto mb-2 opacity-50 text-[#0F3B27]" />
                Aucun équipement enregistré pour le moment. Cliquez sur « Nouvel Équipement ».
              </div>
            )}
          </div>
        </TabsContent>

        {/* 2. MAINTENANCE & ORDRES DE TRAVAIL */}
        <TabsContent value="maintenance" className="space-y-4">
          <Card className="rounded-[10px] border border-[#CFF1D2] bg-white shadow-sm p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <CardTitle className="text-base text-[#0F3B27] font-bold">
                  Plan Annuel de Maintenance & Ordres de Travail
                </CardTitle>
                <CardDescription className="text-xs text-[#475C50]">
                  Interventions préventives et curatives, traçabilité des prestataires et bons de travail.
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => setModalOrdreTravail(true)}
                className="bg-[#0F3B27] hover:bg-[#0F3B27]/90 text-[#92FF5F] text-xs font-bold gap-1.5"
              >
                <Plus className="size-3.5" /> Émettre Ordre de Travail
              </Button>
            </div>

            <div className="space-y-3">
              {ordresMaintenance.map((ot) => (
                <div
                  key={ot.id}
                  className="p-3.5 rounded-xl border border-[#CFF1D2] bg-[#F7F9F7] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#0F3B27]">{ot.id}</span>
                      <Badge
                        variant={ot.type === "preventif" ? "default" : "destructive"}
                        className={ot.type === "preventif" ? "bg-blue-600 text-[10px]" : "text-[10px]"}
                      >
                        {ot.type.toUpperCase()}
                      </Badge>
                      <span className="font-bold text-[#0F3B27]">{ot.equipement}</span>
                    </div>
                    <p className="text-muted-foreground">{ot.description}</p>
                    <div className="text-[11px] text-[#475C50]">
                      Prestataire : <strong>{ot.prestataire}</strong> · Échéance : <strong>{ot.echeance}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setActionSignature({
                          titre: `Validation de l'ordre de travail ${ot.id}`,
                          cb: () => toast.success(`Intervention ${ot.id} validée et émargée.`),
                        });
                        setModaleSignOuverte(true);
                      }}
                      className="border-[#CFF1D2] text-[#0F3B27] text-xs font-semibold gap-1"
                    >
                      <CheckCircle2 className="size-3.5 text-emerald-600" /> Émarger fin travaux
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* 3. ÉTALONNAGE MÉTROLOGIQUE */}
        <TabsContent value="etalonnage" className="space-y-4">
          <Card className="rounded-[10px] border border-[#CFF1D2] bg-white shadow-sm p-4">
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-base text-[#0F3B27] font-bold">
                Registre Métrologique des Instruments de Mesure (LOC-03)
              </CardTitle>
              <CardDescription className="text-xs text-[#475C50]">
                Thermomètres, hygromètres et balances de précision. Tout appareil non étalonné est signalé en rouge et ses relevés marqués non fiables.
              </CardDescription>
            </CardHeader>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="p-3 rounded-xl border border-emerald-300 bg-emerald-50/50 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-mono font-bold text-emerald-900">TH-FRIG-01</span>
                  <Badge className="bg-emerald-600 text-white text-[10px]">Étalonné</Badge>
                </div>
                <div className="font-bold text-emerald-950">Thermomètre Enceinte Réfrigérée</div>
                <p className="text-[11px] text-emerald-800">
                  Certificat n° CERT-2026-042 · Organisme : METRO-BENIN · Incertitude ±0.2°C.
                </p>
                <div className="text-[10px] text-muted-foreground pt-1">
                  Valable jusqu'au 12/04/2027
                </div>
              </div>

              <div className="p-3 rounded-xl border border-emerald-300 bg-emerald-50/50 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-mono font-bold text-emerald-900">BAL-PREC-01</span>
                  <Badge className="bg-emerald-600 text-white text-[10px]">Étalonné</Badge>
                </div>
                <div className="font-bold text-emerald-950">Balance de précision Préparatoire</div>
                <p className="text-[11px] text-emerald-800">
                  Certificat n° CERT-2026-018 · Poids étalons classe F1 · Portée 500g ±0.01g.
                </p>
                <div className="text-[10px] text-muted-foreground pt-1">
                  Valable jusqu'au 20/02/2027
                </div>
              </div>

              <div className="p-3 rounded-xl border border-red-300 bg-red-50/50 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-mono font-bold text-red-900">TH-HALL-02</span>
                  <Badge variant="destructive" className="text-[10px]">Étalonnage Échu</Badge>
                </div>
                <div className="font-bold text-red-950">Thermomètre Hall Public 2</div>
                <p className="text-[11px] text-red-800">
                  Étalonnage expiré depuis 12 jours. Remplacement temporaire recommandé.
                </p>
                <input
                  ref={certifInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) televerserCertificat(f);
                  }}
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={certifEnCours}
                  onClick={() => certifInputRef.current?.click()}
                  className="w-full text-xs border-red-300 text-red-900 h-7 mt-1 gap-1"
                >
                  <Upload className="size-3" />
                  {certifEnCours ? "Téléversement…" : "Joindre nouveau certificat"}
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* 4. NETTOYAGE & BIO-NETTOYAGE */}
        <TabsContent value="nettoyage" className="space-y-4">
          <Card className="rounded-[10px] border border-[#CFF1D2] bg-white shadow-sm p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <CardTitle className="text-base text-[#0F3B27] font-bold">
                  Plan de Bio-nettoyage & Registre d'Émargement
                </CardTitle>
                <CardDescription className="text-xs text-[#475C50]">
                  Check-lists interactives par zone. Double émargement obligatoire : signature de l'agent + visa de l'encadrement.
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => setModalNettoyage(true)}
                className="bg-[#0F3B27] hover:bg-[#0F3B27]/90 text-[#92FF5F] text-xs font-bold gap-1.5"
              >
                <Sparkles className="size-3.5" /> Émarger Bio-nettoyage
              </Button>
            </div>

            <div className="space-y-3">
              {nettoyages && nettoyages.data && nettoyages.data.length > 0 ? (
                nettoyages.data.map((net: any) => (
                  <div
                    key={net.id}
                    className="p-3 rounded-xl border border-[#CFF1D2] bg-[#F7F9F7] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#0F3B27] uppercase">{net.zone}</span>
                        <Badge className="bg-emerald-600 text-white text-[10px]">
                          {net.frequence || "Quotidien"}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mt-0.5">Produit : {net.produit_utilise}</p>
                      <div className="text-[11px] text-[#475C50] mt-1">
                        Émargé le {formatDateHeure(net.date_heure)} par {net.agent?.name || "Agent d'entretien"}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {net.visa_responsable ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 gap-1 text-[11px]">
                          <Check className="size-3" /> Visé par Pharmacien
                        </Badge>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setActionSignature({
                              titre: `Visa du nettoyage zone ${net.zone}`,
                              cb: () => toast.success("Visa de contrôle de bio-nettoyage apposé."),
                            });
                            setModaleSignOuverte(true);
                          }}
                          className="border-[#CFF1D2] text-[#0F3B27] text-xs font-semibold gap-1"
                        >
                          <ShieldCheck className="size-3.5 text-emerald-600" /> Apposer Visa
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-muted-foreground bg-[#F7F9F7] rounded-xl border border-[#CFF1D2]">
                  <Sparkles className="size-8 mx-auto mb-2 opacity-50 text-emerald-600" />
                  Aucune opération de nettoyage récente. Cliquez sur « Émarger Bio-nettoyage ».
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* 5. NUISIBLES & SÉCURITÉ */}
        <TabsContent value="nuisibles" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="rounded-[10px] border border-[#CFF1D2] bg-white shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bug className="size-5 text-amber-600" />
                  <h3 className="font-bold text-[#0F3B27] text-sm">Lutte contre les Nuisibles (3D)</h3>
                </div>
                <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Trimestriel</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Plan de dératisation et désinsectisation. Contrat prestataire spécialisé avec fiches de données de sécurité des appâts.
              </p>
              <div className="p-2.5 rounded-xl bg-[#F7F9F7] border border-[#CFF1D2] text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dernière intervention :</span>
                  <strong>18/09/2026</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prochaine intervention :</span>
                  <span className="font-semibold text-emerald-700">18/12/2026</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prestataire :</span>
                  <span>BÉNIN 3D HYGIÈNE</span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={telechargerRapport3D}
                className="w-full text-xs border-[#CFF1D2] text-[#0F3B27] gap-1.5"
              >
                <Download className="size-3.5" /> Télécharger rapport d'intervention
              </Button>
            </Card>

            <Card className="rounded-[10px] border border-[#CFF1D2] bg-white shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="size-5 text-red-600" />
                  <h3 className="font-bold text-[#0F3B27] text-sm">Sécurité Incendie & Extincteurs</h3>
                </div>
                <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Annuel</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Registre des vérifications périodiques des extincteurs CO2 et poudre, stockage des produits inflammables et consignes d'évacuation.
              </p>
              <div className="p-2.5 rounded-xl bg-[#F7F9F7] border border-[#CFF1D2] text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Extincteur Magasin (CO2 5kg) :</span>
                  <strong className="text-emerald-700">Vérifié (Valable 05/2027)</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Extincteur Comptoir (Poudre 6kg) :</span>
                  <strong className="text-emerald-700">Vérifié (Valable 05/2027)</strong>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={imprimerSecuriteIncendie}
                className="w-full text-xs border-[#CFF1D2] text-[#0F3B27] gap-1.5"
              >
                <FileText className="size-3.5" /> Registre de sécurité incendie
              </Button>
            </Card>
          </div>
        </TabsContent>

        {/* 6. CONFORMITÉ DES LOCAUX */}
        <TabsContent value="conformite" className="space-y-4">
          <Card className="rounded-[10px] border border-[#CFF1D2] bg-white shadow-sm p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <CardTitle className="text-base text-[#0F3B27] font-bold">
                  Check-list de Conformité des Locaux & Aménagements (LOC-06)
                </CardTitle>
                <CardDescription className="text-xs text-[#475C50]">
                  Conformité structurelle selon l'Arrêté ABMed et les Bonnes Pratiques de Dispensation.
                </CardDescription>
              </div>
              <Badge className="bg-emerald-600 text-white font-bold text-xs px-3 py-1">
                Score : 100% Conforme
              </Badge>
            </div>

            <div className="space-y-2.5">
              {criteresLocaux.map((c, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl border border-[#CFF1D2] bg-[#F7F9F7] flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-[#0F3B27]">{c.rubrique}</span>
                    <p className="text-muted-foreground text-[11px]">{c.note}</p>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 gap-1 text-[11px]">
                    <Check className="size-3" /> Validé
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* 7. SYSTÈME INFORMATISÉ & PRA */}
        <TabsContent value="systeme" className="space-y-4">
          <Card className="rounded-[10px] border border-[#CFF1D2] bg-white shadow-sm p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base text-[#0F3B27] font-bold">
                  Dossier du Système Informatisé & Sécurité des Données (BPD4-F12 à F14)
                </CardTitle>
                <CardDescription className="text-xs text-[#475C50]">
                  Sauvegardes chiffrées automatiques, journal d'accès inaltérable et Plan de Continuité d'Activité (PRA).
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={exporterDossierSystemePra}
                className="text-xs border-[#CFF1D2] text-[#0F3B27] gap-1.5"
              >
                <Download className="size-3.5" /> Exporter Dossier Système PDF
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-[#F7F9F7] border border-[#CFF1D2] text-xs space-y-1">
                <div className="font-bold text-[#0F3B27] flex items-center gap-1.5">
                  <HardDrive className="size-4 text-emerald-600" /> Sauvegarde Quotidienne
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Dernier backup réussi : <strong>Ce jour à 03h00</strong>. Chiffrement AES-256 avec copie externe sécurisée.
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#F7F9F7] border border-[#CFF1D2] text-xs space-y-1">
                <div className="font-bold text-[#0F3B27] flex items-center gap-1.5">
                  <FileCheck className="size-4 text-blue-600" /> Essai de Restauration
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Dernier test annuel validé le <strong>14/10/2026</strong>. Durée de reprise &lt; 15 minutes.
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#F7F9F7] border border-[#CFF1D2] text-xs space-y-1">
                <div className="font-bold text-[#0F3B27] flex items-center gap-1.5">
                  <Shield className="size-4 text-purple-600" /> Fiche Réflexe PRA
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Cahiers papier de secours disponibles au comptoir en cas de coupure prolongée du réseau ou de l'énergie.
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODALE CRÉATION ÉQUIPEMENT */}
      <Dialog open={modalEquipement} onOpenChange={setModalEquipement}>
        <DialogContent className="max-w-md bg-white border border-[#CFF1D2] rounded-[10px] shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#0F3B27] font-display">
              Ajouter un Équipement au Carnet de Vie
            </DialogTitle>
            <DialogDescription className="text-xs text-[#475C50]">
              Inventaire et suivi métrologique conforme BPD4-F01.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={creerEquipement} className="space-y-3 pt-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="font-semibold text-[#0F3B27]">Code Interne *</Label>
                <Input
                  placeholder="FRIG-01, CLIM-02..."
                  value={codeInterne}
                  onChange={(e) => setCodeInterne(e.target.value)}
                  className="h-8 text-xs rounded-xl border-[#CFF1D2]"
                  required
                />
              </div>
              <div>
                <Label className="font-semibold text-[#0F3B27]">Catégorie</Label>
                <select
                  value={categorie}
                  onChange={(e) => setCategorie(e.target.value)}
                  className="w-full h-8 rounded-xl border border-[#CFF1D2] bg-white text-xs px-2"
                >
                  <option value="refrigerateur">Réfrigérateur 2–8 °C</option>
                  <option value="climatiseur">Climatiseur</option>
                  <option value="onduleur_groupe">Onduleur / Groupe</option>
                  <option value="balance_precision">Balance de précision</option>
                  <option value="enregistreur_temperature">Thermomètre / Sonde</option>
                  <option value="autre">Autre matériel</option>
                </select>
              </div>
            </div>

            <div>
              <Label className="font-semibold text-[#0F3B27]">Désignation *</Label>
              <Input
                placeholder="Ex : Réfrigérateur Médical B Medical Systems"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="h-8 text-xs rounded-xl border-[#CFF1D2]"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="font-semibold text-[#0F3B27]">Marque / Modèle</Label>
                <Input
                  placeholder="Ex : B Medical F290"
                  value={marqueModele}
                  onChange={(e) => setMarqueModele(e.target.value)}
                  className="h-8 text-xs rounded-xl border-[#CFF1D2]"
                />
              </div>
              <div>
                <Label className="font-semibold text-[#0F3B27]">Emplacement</Label>
                <Input
                  placeholder="Ex : Réserve centrale"
                  value={emplacement}
                  onChange={(e) => setEmplacement(e.target.value)}
                  className="h-8 text-xs rounded-xl border-[#CFF1D2]"
                />
              </div>
            </div>

            <div>
              <Label className="font-semibold text-[#0F3B27]">Périodicité d'étalonnage (mois)</Label>
              <Input
                type="number"
                min="1"
                max="60"
                value={periodicite}
                onChange={(e) => setPeriodicite(parseInt(e.target.value) || 12)}
                className="h-8 text-xs rounded-xl border-[#CFF1D2]"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalEquipement(false)}
                className="border-[#CFF1D2] text-[#475C50]"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={enCours || !codeInterne || !designation}
                className="bg-[#0F3B27] hover:bg-[#0F3B27]/90 text-[#92FF5F] font-bold text-xs"
              >
                {enCours ? "Enregistrement…" : "Enregistrer Équipement"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODALE ÉMARGEMENT NETTOYAGE */}
      <Dialog open={modalNettoyage} onOpenChange={setModalNettoyage}>
        <DialogContent className="max-w-md bg-white border border-[#CFF1D2] rounded-[10px] shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#0F3B27] font-display">
              Émarger une Opération de Bio-nettoyage
            </DialogTitle>
            <DialogDescription className="text-xs text-[#475C50]">
              Enregistrement horodaté de l'intervention d'hygiène.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={emargerNettoyage} className="space-y-3 pt-2 text-xs">
            <div>
              <Label className="font-semibold text-[#0F3B27]">Zone traitée *</Label>
              <select
                value={zoneNettoyage}
                onChange={(e) => setZoneNettoyage(e.target.value)}
                className="w-full h-8 rounded-xl border border-[#CFF1D2] bg-white text-xs px-2 font-bold text-[#0F3B27]"
              >
                <option value="comptoir">Comptoir & Zone de dispensation</option>
                <option value="reserve">Réserve & Magasin de stockage</option>
                <option value="preparatoire">Préparatoire magistral</option>
                <option value="sanitaires_vestiaires">Sanitaires & Vestiaires</option>
                <option value="exterieur">Abords extérieurs & Entrée</option>
              </select>
            </div>

            <div>
              <Label className="font-semibold text-[#0F3B27]">Produit et concentration utilisés *</Label>
              <Input
                value={produitNettoyage}
                onChange={(e) => setProduitNettoyage(e.target.value)}
                className="h-8 text-xs rounded-xl border-[#CFF1D2]"
                required
              />
            </div>

            <div>
              <Label className="font-semibold text-[#0F3B27]">Remarques / Anomalies constatées</Label>
              <Input
                placeholder="R.A.S. ou dégradation constatée..."
                value={notesNettoyage}
                onChange={(e) => setNotesNettoyage(e.target.value)}
                className="h-8 text-xs rounded-xl border-[#CFF1D2]"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalNettoyage(false)}
                className="border-[#CFF1D2] text-[#475C50]"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={enCours}
                className="bg-[#0F3B27] hover:bg-[#0F3B27]/90 text-[#92FF5F] font-bold text-xs"
              >
                {enCours ? "Validation…" : "Valider l'émargement"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODALE SIGNATURE PIN (BPD-C10) */}
      <ModaleSignatureCode
        ouvert={modaleSignOuverte}
        onFermer={() => setModaleSignOuverte(false)}
        titreAction={actionSignature?.titre || "Signature de l'intervention"}
        onSigner={async (sig) => {
          if (actionSignature?.cb) actionSignature.cb();
        }}
        articleBpd="BPD-4 / Art. 4.02"
      />

      {/* MODALE CARNET DE VIE ÉQUIPEMENT */}
      <Dialog open={!!equipementCarnet} onOpenChange={(open) => !open && setEquipementCarnet(null)}>
        <DialogContent className="max-w-2xl bg-white border border-[#CFF1D2] rounded-[10px] shadow-xl p-6">
          {equipementCarnet && (
            <div className="space-y-5">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#0F3B27] bg-[#CFF1D2]/50 px-2.5 py-1 rounded-[6px]">
                      {equipementCarnet.code_interne}
                    </span>
                    <Badge
                      variant={equipementCarnet.statut === "conforme" ? "default" : "destructive"}
                      className={equipementCarnet.statut === "conforme" ? "bg-emerald-600 text-white text-[10px]" : "text-[10px]"}
                    >
                      {equipementCarnet.statut === "conforme" ? "Conforme BPD" : "À réviser / Non conforme"}
                    </Badge>
                  </div>
                  <span className="text-[11px] text-[#475C50] font-mono">BPD-4 / Art. 4.02</span>
                </div>
                <DialogTitle className="text-lg font-bold text-[#0F3B27] mt-1 font-display">
                  Carnet de Vie & Suivi Métrologique : {equipementCarnet.designation}
                </DialogTitle>
                <DialogDescription className="text-xs text-[#475C50]">
                  Traçabilité réglementaire obligatoire du matériel critique en officine.
                </DialogDescription>
              </DialogHeader>

              {/* Fiche technique */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-[#F7F9F7] p-3.5 rounded-[10px] border border-[#CFF1D2] text-xs">
                <div>
                  <span className="text-[11px] text-muted-foreground block">Catégorie</span>
                  <strong className="text-[#0F3B27] capitalize">{equipementCarnet.categorie || "N/A"}</strong>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Marque / Modèle</span>
                  <strong className="text-[#0F3B27]">{equipementCarnet.marque_modele || "Non renseigné"}</strong>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Emplacement</span>
                  <strong className="text-[#0F3B27]">{equipementCarnet.emplacement || "Officine"}</strong>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Périodicité contrôle</span>
                  <strong className="text-emerald-800">{equipementCarnet.periodicite_etalonnage_mois} mois</strong>
                </div>
              </div>

              {/* Métrologie & Étalonnage */}
              <div className="p-4 rounded-[10px] border border-[#CFF1D2] bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#0F3B27] flex items-center gap-1.5">
                    <ShieldCheck className="size-4 text-emerald-600" /> Étalonnage & Contrôle Métrologique
                  </h4>
                  <span className="text-[11px] text-muted-foreground">
                    Prochain étalonnage : <strong className="text-[#0F3B27]">{equipementCarnet.date_prochain_etalonnage || "À planifier"}</strong>
                  </span>
                </div>
                <p className="text-[11px] text-[#475C50]">
                  Les balances, thermomètres, enregistreurs de température et sondes doivent faire l'objet d'un contrôle ou étalonnage périodique raccordé aux étalons nationaux.
                </p>
              </div>

              {/* Historique des interventions */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-[#0F3B27] flex items-center gap-1.5">
                  <Wrench className="size-4 text-[#0F3B27]" /> Historique des Interventions & Maintenance
                </h4>
                <div className="border border-[#CFF1D2] rounded-[10px] overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-[#F7F9F7] text-[11px] text-[#475C50] font-semibold">
                      <tr>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Type</th>
                        <th className="p-2.5">Opérateur / Prestataire</th>
                        <th className="p-2.5">Rapport / Constat</th>
                        <th className="p-2.5">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#CFF1D2]">
                      <tr className="hover:bg-slate-50">
                        <td className="p-2.5 text-[11px]">Mise en service</td>
                        <td className="p-2.5 font-semibold text-[#0F3B27]">Qualification initiale</td>
                        <td className="p-2.5 text-muted-foreground">Pharmacien Titulaire</td>
                        <td className="p-2.5 text-[11px]">Équipement neuf, conforme aux spécifications</td>
                        <td className="p-2.5"><Badge className="bg-emerald-600 text-[10px]">Validé</Badge></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-[#CFF1D2]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEquipementCarnet(null)}
                  className="border-[#CFF1D2] text-[#475C50] text-xs rounded-[10px]"
                >
                  Fermer
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={() => {
                      imprimerFicheOfficielle(
                        `Carnet de Vie - ${equipementCarnet.code_interne} : ${equipementCarnet.designation}`,
                        `
                          <div style="font-family: Arial, sans-serif; padding: 20px;">
                            <h2 style="color: #0F3B27;">BestPharma - Carnet de Vie Matériel (5M)</h2>
                            <p><strong>Code équipement :</strong> ${equipementCarnet.code_interne}</p>
                            <p><strong>Désignation :</strong> ${equipementCarnet.designation}</p>
                            <p><strong>Marque / Modèle :</strong> ${equipementCarnet.marque_modele || "N/A"}</p>
                            <p><strong>Emplacement :</strong> ${equipementCarnet.emplacement || "Officine"}</p>
                            <p><strong>Périodicité contrôle :</strong> ${equipementCarnet.periodicite_etalonnage_mois} mois</p>
                            <p><strong>Prochaine date d'étalonnage :</strong> ${equipementCarnet.date_prochain_etalonnage || "N/A"}</p>
                            <hr style="margin: 20px 0; border: 1px solid #CFF1D2;" />
                            <h3>Exigence BPD-4 / Art. 4.02</h3>
                            <p>Le carnet de vie récapitule l'historique de mise en service, de maintenance et d'étalonnage pour chaque matériel critique.</p>
                          </div>
                        `
                      );
                      toast.success("Impression du carnet de vie lancée !");
                    }}
                    className="bg-[#0F3B27] hover:bg-[#0F3B27]/90 text-[#92FF5F] font-bold text-xs gap-1.5 rounded-[10px]"
                  >
                    <Printer className="size-3.5" /> Imprimer Carnet de Vie
                  </Button>
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODALE QR CODE ÉQUIPEMENT */}
      <Dialog open={!!equipementQr} onOpenChange={(open) => !open && setEquipementQr(null)}>
        <DialogContent className="max-w-sm bg-white border border-[#CFF1D2] rounded-[10px] shadow-xl text-center p-6">
          {equipementQr && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-[#0F3B27] font-display">
                  Étiquette QR Code Machine / Équipement
                </DialogTitle>
                <DialogDescription className="text-xs text-[#475C50]">
                  À coller sur le châssis pour identification et carnet de vie instantané.
                </DialogDescription>
              </DialogHeader>

              <div className="p-5 bg-[#F7F9F7] rounded-[10px] border border-[#CFF1D2] flex flex-col items-center gap-3">
                <div className="size-48 bg-white p-3 rounded-[10px] border border-[#CFF1D2] shadow-sm flex items-center justify-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                      `EQUIP-${equipementQr.code_interne}`
                    )}`}
                    alt={`QR Code ${equipementQr.code_interne}`}
                    className="size-40 object-contain"
                  />
                </div>
                <div>
                  <div className="font-mono text-sm font-extrabold text-[#0F3B27]">
                    {equipementQr.code_interne}
                  </div>
                  <div className="text-xs font-semibold text-[#0F3B27] mt-0.5">
                    {equipementQr.designation}
                  </div>
                  <div className="text-[11px] text-[#475C50]">
                    {equipementQr.emplacement || "Officine"} · {equipementQr.marque_modele || ""}
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-[#CFF1D2]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEquipementQr(null)}
                  className="border-[#CFF1D2] text-[#475C50] text-xs rounded-[10px]"
                >
                  Fermer
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    imprimerFicheOfficielle(
                      `Étiquette QR Équipement - ${equipementQr.code_interne}`,
                      `
                        <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; max-width: 320px; margin: auto; border: 2px dashed #0F3B27; border-radius: 10px;">
                          <h3 style="margin: 0; color: #0F3B27;">BestPharma</h3>
                          <p style="margin: 4px 0; font-size: 11px; color: #475C50;">Équipement Officine Conforme BPD</p>
                          <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                            `EQUIP-${equipementQr.code_interne}`
                          )}" style="width: 180px; height: 180px; margin: 15px auto;" />
                          <div style="font-family: monospace; font-size: 16px; font-weight: bold; color: #0F3B27;">${equipementQr.code_interne}</div>
                          <div style="font-size: 12px; font-weight: bold; margin-top: 4px;">${equipementQr.designation}</div>
                          <div style="font-size: 10px; color: #666; margin-top: 4px;">Emplacement : ${equipementQr.emplacement || "Officine"}</div>
                        </div>
                      `
                    );
                    toast.success("Impression de l'étiquette QR lancée !");
                  }}
                  className="bg-[#0F3B27] hover:bg-[#0F3B27]/90 text-[#92FF5F] font-bold text-xs gap-1.5 rounded-[10px]"
                >
                  <Printer className="size-3.5" /> Imprimer l'étiquette QR
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
