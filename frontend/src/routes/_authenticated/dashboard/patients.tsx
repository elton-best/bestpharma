import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Search,
  Plus,
  FileText,
  AlertTriangle,
  ShieldAlert,
  Heart,
  Baby,
  Stethoscope,
  RefreshCw,
  Upload,
  Calendar,
  Phone,
  CheckCircle2,
  Clock,
  Eye,
  Activity,
  FileCheck,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/dashboard/patients")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Dossier Pharmaceutique Patient (DP) : BestPharma" },
      {
        name: "description",
        content: "Gestion des dossiers pharmaceutiques, antécédents, allergies et traçabilité des ordonnances selon les BPD ABMed.",
      },
    ],
  }),
  component: PagePatients,
});

interface Patient {
  id: string;
  code_patient: string;
  nom: string;
  prenom: string;
  sexe: "M" | "F";
  date_naissance: string;
  age: number;
  telephone: string;
  email?: string;
  adresse?: string;
  ville?: string;
  groupe_sanguin?: string;
  poids_kg?: number;
  taille_cm?: number;
  est_enceinte: boolean;
  est_allaitante: boolean;
  pathologies_chroniques?: string[];
  allergies_declarees?: string[];
  notes_cliniques?: string;
  consentement_dp: boolean;
  ordonnances_count?: number;
  dispensations_count?: number;
}

interface Prescripteur {
  id: string;
  nom_complet: string;
  titre: string;
  specialite?: string;
  numero_ordre?: string;
  centre_sante?: string;
  telephone?: string;
}

interface Ordonnance {
  id: string;
  numero_ordonnance: string;
  patient_id: string;
  patient?: Patient;
  prescripteur_id?: string;
  prescripteur?: Prescripteur;
  prescripteur_nom_libre?: string;
  prescripteur_centre_libre?: string;
  date_prescription: string;
  date_expiration?: string;
  duree_traitement_jours: number;
  nombre_renouvellements_autorises: number;
  nombre_renouvellements_effectues: number;
  statut: "active" | "cloturee" | "expiree" | "refusee";
  scan_ordonnance_path?: string;
  scan_sha256?: string;
  diagnostic_presume?: string;
  lignes_prescrites?: Array<{
    medicament: string;
    dosage?: string;
    posologie: string;
    duree: string;
  }>;
  commentaires_pharmacien?: string;
}

function PagePatients() {
  const queryClient = useQueryClient();
  const [ongletActif, setOngletActif] = useState("patients");

  // Filtres & Recherche Patients
  const [recherchePatient, setRecherchePatient] = useState("");
  const [patientSelectionne, setPatientSelectionne] = useState<Patient | null>(null);

  // Modales
  const [dialogNouveauPatient, setDialogNouveauPatient] = useState(false);
  const [dialogNouvelleOrdonnance, setDialogNouvelleOrdonnance] = useState(false);
  const [dialogNouveauPrescripteur, setDialogNouveauPrescripteur] = useState(false);
  const [dialogHistoriquePatient, setDialogHistoriquePatient] = useState(false);

  // Formulaire Patient
  const [formPatient, setFormPatient] = useState({
    nom: "",
    prenom: "",
    sexe: "M" as "M" | "F",
    date_naissance: "1990-01-01",
    telephone: "",
    email: "",
    adresse: "",
    ville: "Cotonou",
    groupe_sanguin: "O+",
    poids_kg: "",
    taille_cm: "",
    est_enceinte: false,
    est_allaitante: false,
    allergies: "Pénicillines",
    pathologies: "Hypertension artérielle",
    notes_cliniques: "",
  });

  // Formulaire Ordonnance
  const [formOrdonnance, setFormOrdonnance] = useState({
    patient_id: "",
    prescripteur_id: "",
    prescripteur_nom_libre: "",
    prescripteur_centre_libre: "",
    date_prescription: new Date().toISOString().split("T")[0],
    duree_traitement_jours: 30,
    nombre_renouvellements_autorises: 1,
    diagnostic_presume: "",
    lignes_texte: "Amoxicilline 500mg : 1 gélule 3x/jour pendant 7 jours\nParacétamol 1g : 1 cp si douleur",
    commentaires_pharmacien: "",
  });

  // Formulaire Prescripteur
  const [formPrescripteur, setFormPrescripteur] = useState({
    nom_complet: "",
    titre: "Dr",
    specialite: "Médecin Généraliste",
    numero_ordre: "",
    centre_sante: "CNHU Cotonou",
    telephone: "",
  });

  // Requêtes API
  const { data: dataPatients, isLoading: loadingPatients } = useQuery<{
    data: { data: Patient[]; total: number };
  }>({
    queryKey: ["patients", recherchePatient],
    queryFn: () => api.get(`/patients?search=${encodeURIComponent(recherchePatient)}`),
  });

  const { data: dataOrdonnances } = useQuery<{
    data: { data: Ordonnance[]; total: number };
  }>({
    queryKey: ["ordonnances"],
    queryFn: () => api.get("/ordonnances"),
  });

  const { data: dataPrescripteurs } = useQuery<{
    data: Prescripteur[];
  }>({
    queryKey: ["prescripteurs"],
    queryFn: () => api.get("/prescripteurs"),
  });

  const { data: historiquePatientData, isLoading: loadingHistorique } = useQuery<{
    status: string;
    patient: any;
    historique: any[];
  }>({
    queryKey: ["historique-patient", patientSelectionne?.id],
    queryFn: () => api.get(`/patients/${patientSelectionne?.id}/historique-therapeutique`),
    enabled: Boolean(patientSelectionne && dialogHistoriquePatient),
  });

  // Mutations
  const mutationCreerPatient = useMutation({
    mutationFn: (payload: any) => api.post("/patients", payload),
    onSuccess: (res: any) => {
      toast.success(res.message || "Dossier pharmaceutique créé !");
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      setDialogNouveauPatient(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors de la création du patient");
    },
  });

  const mutationCreerOrdonnance = useMutation({
    mutationFn: (payload: any) => api.post("/ordonnances", payload),
    onSuccess: (res: any) => {
      toast.success(res.message || "Ordonnance enregistrée avec succès !");
      queryClient.invalidateQueries({ queryKey: ["ordonnances"] });
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      setDialogNouvelleOrdonnance(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors de l'enregistrement de l'ordonnance");
    },
  });

  const mutationRenouvelerOrdonnance = useMutation({
    mutationFn: (id: string) => api.post(`/ordonnances/${id}/renouveler`, {}),
    onSuccess: (res: any) => {
      toast.success(res.message || "Renouvellement validé !");
      queryClient.invalidateQueries({ queryKey: ["ordonnances"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Impossible de renouveler cette ordonnance");
    },
  });

  const mutationCreerPrescripteur = useMutation({
    mutationFn: (payload: any) => api.post("/prescripteurs", payload),
    onSuccess: (res: any) => {
      toast.success(res.message || "Prescripteur enregistré !");
      queryClient.invalidateQueries({ queryKey: ["prescripteurs"] });
      setDialogNouveauPrescripteur(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors de l'enregistrement du prescripteur");
    },
  });

  const handleCreerPatient = (e: React.FormEvent) => {
    e.preventDefault();
    const allergiesArray = formPatient.allergies
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const pathologiesArray = formPatient.pathologies
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    mutationCreerPatient.mutate({
      nom: formPatient.nom,
      prenom: formPatient.prenom,
      sexe: formPatient.sexe,
      date_naissance: formPatient.date_naissance,
      telephone: formPatient.telephone,
      email: formPatient.email || null,
      adresse: formPatient.adresse || null,
      ville: formPatient.ville,
      groupe_sanguin: formPatient.groupe_sanguin || null,
      poids_kg: formPatient.poids_kg ? parseFloat(formPatient.poids_kg) : null,
      taille_cm: formPatient.taille_cm ? parseFloat(formPatient.taille_cm) : null,
      est_enceinte: formPatient.est_enceinte,
      est_allaitante: formPatient.est_allaitante,
      allergies_declarees: allergiesArray,
      pathologies_chroniques: pathologiesArray,
      notes_cliniques: formPatient.notes_cliniques || null,
      consentement_dp: true,
    });
  };

  const handleCreerOrdonnance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formOrdonnance.patient_id) {
      toast.error("Veuillez sélectionner un patient");
      return;
    }

    const lignes = formOrdonnance.lignes_texte
      .split("\n")
      .map((ligne) => {
        const parts = ligne.split(":");
        return {
          medicament: parts[0]?.trim() || "Médicament",
          posologie: parts[1]?.trim() || "1 par jour",
          duree: "30 jours",
        };
      })
      .filter((l) => l.medicament);

    mutationCreerOrdonnance.mutate({
      patient_id: formOrdonnance.patient_id,
      prescripteur_id: formOrdonnance.prescripteur_id || null,
      prescripteur_nom_libre: formOrdonnance.prescripteur_nom_libre || null,
      prescripteur_centre_libre: formOrdonnance.prescripteur_centre_libre || null,
      date_prescription: formOrdonnance.date_prescription,
      duree_traitement_jours: parseInt(String(formOrdonnance.duree_traitement_jours), 10),
      nombre_renouvellements_autorises: parseInt(String(formOrdonnance.nombre_renouvellements_autorises), 10),
      diagnostic_presume: formOrdonnance.diagnostic_presume || null,
      lignes_prescrites: lignes,
      commentaires_pharmacien: formOrdonnance.commentaires_pharmacien || null,
    });
  };

  const handleCreerPrescripteur = (e: React.FormEvent) => {
    e.preventDefault();
    mutationCreerPrescripteur.mutate(formPrescripteur);
  };

  const patients = dataPatients?.data?.data || [];
  const ordonnances = dataOrdonnances?.data?.data || [];
  const prescripteurs = dataPrescripteurs?.data || [];

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="h-7 w-7 text-emerald-600" />
            Dossier Pharmaceutique Patient (DP) & Ordonnances
          </h1>
          <p className="text-sm text-slate-500">
            Conformité Guide BPD ABMed Chapitre 7 (Art. 7.1 à 7.30) · Sécurité clinique, détection des allergies et traçabilité décennale.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setDialogNouveauPrescripteur(true)}
            className="border-slate-300"
          >
            <Stethoscope className="mr-2 h-4 w-4 text-emerald-600" />
            Nouveau Médecin
          </Button>
          <Button
            variant="outline"
            onClick={() => setDialogNouvelleOrdonnance(true)}
            className="border-emerald-600 text-emerald-700 hover:bg-emerald-50"
          >
            <FileText className="mr-2 h-4 w-4" />
            Nouvelle Ordonnance
          </Button>
          <Button
            onClick={() => setDialogNouveauPatient(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nouveau Patient
          </Button>
        </div>
      </div>

      {/* Onglets principaux */}
      <Tabs value={ongletActif} onValueChange={setOngletActif} className="space-y-4">
        <TabsList className="bg-slate-100 dark:bg-slate-800 p-1">
          <TabsTrigger value="patients" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Dossiers Patients ({patients.length})
          </TabsTrigger>
          <TabsTrigger value="ordonnances" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Ordonnances Médicales ({ordonnances.length})
          </TabsTrigger>
          <TabsTrigger value="prescripteurs" className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4" />
            Répertoire Prescripteurs ({prescripteurs.length})
          </TabsTrigger>
        </TabsList>

        {/* ONGLET 1 : DOSSIERS PATIENTS */}
        <TabsContent value="patients" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">Patients de l'Officine</CardTitle>
                  <CardDescription>
                    Consultation des fiches patient, allergies, contre-indications et antécédents thérapeutiques.
                  </CardDescription>
                </div>
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Recherche par nom, prénom, code ou tél..."
                    value={recherchePatient}
                    onChange={(e) => setRecherchePatient(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingPatients ? (
                <div className="py-12 text-center text-slate-500">Chargement des dossiers patients...</div>
              ) : patients.length === 0 ? (
                <div className="py-12 text-center">
                  <Users className="mx-auto h-12 w-12 text-slate-300" />
                  <p className="mt-2 text-sm font-medium text-slate-700">Aucun patient trouvé</p>
                  <p className="text-xs text-slate-500">Créez votre premier dossier patient pharmaceutique pour démarrer le suivi.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {patients.map((pat) => (
                    <div
                      key={pat.id}
                      className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 p-3 rounded-lg transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0">
                          {pat.nom.charAt(0)}{pat.prenom.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {pat.nom} {pat.prenom}
                            </span>
                            <Badge variant="outline" className="text-xs font-mono">
                              {pat.code_patient}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {pat.sexe === "F" ? "Femme" : "Homme"}, {pat.age} ans
                            </Badge>
                            {pat.est_enceinte && (
                              <Badge className="bg-pink-100 text-pink-800 border-pink-200">
                                <Baby className="h-3 w-3 mr-1" /> Enceinte
                              </Badge>
                            )}
                            {pat.est_allaitante && (
                              <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                                Allaitante
                              </Badge>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {pat.telephone}
                            </span>
                            {pat.groupe_sanguin && (
                              <span className="font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                                Groupe {pat.groupe_sanguin}
                              </span>
                            )}
                            {pat.poids_kg && <span>{pat.poids_kg} kg</span>}
                            <span>{pat.ville || "Cotonou"}</span>
                          </div>

                          {/* Alertes d'allergies */}
                          {pat.allergies_declarees && pat.allergies_declarees.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 mt-2">
                              <span className="text-xs font-medium text-red-700 flex items-center gap-1">
                                <ShieldAlert className="h-3.5 w-3.5" /> Allergies :
                              </span>
                              {pat.allergies_declarees.map((alg, i) => (
                                <Badge key={i} className="bg-red-100 text-red-800 text-[11px] font-medium border-red-200">
                                  {alg}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {/* Pathologies */}
                          {pat.pathologies_chroniques && pat.pathologies_chroniques.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              <span className="text-xs text-slate-500 flex items-center gap-1">
                                <Heart className="h-3 w-3 text-amber-500" /> Chronique :
                              </span>
                              {pat.pathologies_chroniques.map((ch, i) => (
                                <span key={i} className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                                  {ch}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setPatientSelectionne(pat);
                            setDialogHistoriquePatient(true);
                          }}
                        >
                          <Activity className="h-4 w-4 mr-1 text-emerald-600" />
                          Historique Thérapeutique
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ONGLET 2 : ORDONNANCES MÉDICALES */}
        <TabsContent value="ordonnances" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Ordonnances Médicales & Renouvellements</CardTitle>
              <CardDescription>
                Contrôle des quotas de renouvellement et archivage légal de 10 ans selon le Guide BPD Art. 7.15.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {ordonnances.length === 0 ? (
                <div className="py-12 text-center">
                  <FileText className="mx-auto h-12 w-12 text-slate-300" />
                  <p className="mt-2 text-sm font-medium text-slate-700">Aucune ordonnance enregistrée</p>
                  <p className="text-xs text-slate-500">Enregistrez une ordonnance pour démarrer la traçabilité des délivrances.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {ordonnances.map((ord) => (
                    <div
                      key={ord.id}
                      className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 p-3 rounded-lg"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {ord.numero_ordonnance}
                          </span>
                          <Badge
                            className={
                              ord.statut === "active"
                                ? "bg-emerald-100 text-emerald-800"
                                : ord.statut === "cloturee"
                                ? "bg-slate-200 text-slate-700"
                                : "bg-red-100 text-red-800"
                            }
                          >
                            {ord.statut.toUpperCase()}
                          </Badge>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> Prescrit le {ord.date_prescription}
                          </span>
                        </div>

                        <div className="mt-1 text-sm">
                          <span className="text-slate-500">Patient : </span>
                          <span className="font-medium text-slate-900 dark:text-white">
                            {ord.patient ? `${ord.patient.nom} ${ord.patient.prenom}` : "Patient"}
                          </span>
                          <span className="mx-2 text-slate-300">|</span>
                          <span className="text-slate-500">Prescripteur : </span>
                          <span className="font-medium text-slate-800">
                            {ord.prescripteur?.nom_complet || ord.prescripteur_nom_libre || "Dr Inconnu"}
                          </span>
                          {(ord.prescripteur?.centre_sante || ord.prescripteur_centre_libre) && (
                            <span className="text-xs text-slate-500 ml-1">
                              ({ord.prescripteur?.centre_sante || ord.prescripteur_centre_libre})
                            </span>
                          )}
                        </div>

                        {ord.diagnostic_presume && (
                          <p className="text-xs text-slate-600 mt-1 italic">
                            Diagnostic : {ord.diagnostic_presume}
                          </p>
                        )}

                        <div className="flex items-center gap-3 mt-2 text-xs">
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                            Renouvellements : <strong>{ord.nombre_renouvellements_effectues}</strong> / {ord.nombre_renouvellements_autorises}
                          </span>
                          {ord.scan_sha256 && (
                            <Badge variant="outline" className="text-emerald-700 border-emerald-300 flex items-center gap-1">
                              <FileCheck className="h-3 w-3" /> Numérisée & Scellée SHA-256
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-center">
                        {ord.statut === "active" && ord.nombre_renouvellements_effectues < ord.nombre_renouvellements_autorises && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                            onClick={() => mutationRenouvelerOrdonnance.mutate(ord.id)}
                            disabled={mutationRenouvelerOrdonnance.isPending}
                          >
                            <RefreshCw className="h-3.5 w-3.5 mr-1" />
                            Valider Renouvellement
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ONGLET 3 : RÉPERTOIRE DES PRESCRIPTEURS */}
        <TabsContent value="prescripteurs" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Répertoire Officiel des Prescripteurs</CardTitle>
              <CardDescription>
                Médecins, spécialistes et sages-femmes habilités selon le Code de la Santé publique du Bénin.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {prescripteurs.map((doc) => (
                  <div key={doc.id} className="p-4 border rounded-lg hover:border-emerald-300 transition-colors">
                    <div className="flex items-center gap-2">
                      <Stethoscope className="h-5 w-5 text-emerald-600" />
                      <span className="font-bold text-slate-900">{doc.nom_complet}</span>
                    </div>
                    <p className="text-xs font-medium text-emerald-700 mt-1">{doc.specialite || "Médecin"}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {doc.centre_sante || "Centre médical"}
                    </p>
                    {doc.numero_ordre && (
                      <Badge variant="outline" className="mt-2 text-[11px] font-mono">
                        Ordre: {doc.numero_ordre}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODALE : NOUVEAU PATIENT */}
      <Dialog open={dialogNouveauPatient} onOpenChange={setDialogNouveauPatient}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <Users className="h-5 w-5" />
              Création du Dossier Pharmaceutique Patient (DP)
            </DialogTitle>
            <DialogDescription>
              Enregistrement des données cliniques pour le suivi personnalisé et la sécurité des délivrances (BPD Art. 7.1).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreerPatient} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="nom">Nom de famille *</Label>
                <Input
                  id="nom"
                  required
                  placeholder="Ex: SOSSOU"
                  value={formPatient.nom}
                  onChange={(e) => setFormPatient({ ...formPatient, nom: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="prenom">Prénoms *</Label>
                <Input
                  id="prenom"
                  required
                  placeholder="Ex: Claire"
                  value={formPatient.prenom}
                  onChange={(e) => setFormPatient({ ...formPatient, prenom: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="sexe">Sexe *</Label>
                <select
                  id="sexe"
                  className="w-full border rounded-md p-2 text-sm"
                  value={formPatient.sexe}
                  onChange={(e) => setFormPatient({ ...formPatient, sexe: e.target.value as any })}
                >
                  <option value="M">Masculin</option>
                  <option value="F">Féminin</option>
                </select>
              </div>
              <div>
                <Label htmlFor="date_naissance">Date de naissance *</Label>
                <Input
                  id="date_naissance"
                  type="date"
                  required
                  value={formPatient.date_naissance}
                  onChange={(e) => setFormPatient({ ...formPatient, date_naissance: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="groupe_sanguin">Groupe Sanguin</Label>
                <select
                  id="groupe_sanguin"
                  className="w-full border rounded-md p-2 text-sm"
                  value={formPatient.groupe_sanguin}
                  onChange={(e) => setFormPatient({ ...formPatient, groupe_sanguin: e.target.value })}
                >
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="telephone">Téléphone principal *</Label>
                <Input
                  id="telephone"
                  required
                  placeholder="+229 97 00 00 00"
                  value={formPatient.telephone}
                  onChange={(e) => setFormPatient({ ...formPatient, telephone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="patient@example.com"
                  value={formPatient.email}
                  onChange={(e) => setFormPatient({ ...formPatient, email: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="poids">Poids (kg)</Label>
                <Input
                  id="poids"
                  type="number"
                  step="0.1"
                  placeholder="Ex: 65"
                  value={formPatient.poids_kg}
                  onChange={(e) => setFormPatient({ ...formPatient, poids_kg: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="taille">Taille (cm)</Label>
                <Input
                  id="taille"
                  type="number"
                  placeholder="Ex: 170"
                  value={formPatient.taille_cm}
                  onChange={(e) => setFormPatient({ ...formPatient, taille_cm: e.target.value })}
                />
              </div>
            </div>

            {formPatient.sexe === "F" && (
              <div className="flex items-center gap-6 p-3 bg-pink-50 rounded-md border border-pink-100">
                <label className="flex items-center gap-2 text-sm font-medium text-pink-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formPatient.est_enceinte}
                    onChange={(e) => setFormPatient({ ...formPatient, est_enceinte: e.target.checked })}
                    className="rounded text-pink-600"
                  />
                  Patiente Enceinte (Alerte AINS/IEC)
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-purple-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formPatient.est_allaitante}
                    onChange={(e) => setFormPatient({ ...formPatient, est_allaitante: e.target.checked })}
                    className="rounded text-purple-600"
                  />
                  Patiente Allaitante
                </label>
              </div>
            )}

            <div>
              <Label htmlFor="allergies" className="text-red-700 font-semibold flex items-center gap-1">
                <ShieldAlert className="h-4 w-4" /> Allergies médicamenteuses déclarées (séparées par virgule)
              </Label>
              <Input
                id="allergies"
                placeholder="Ex: Pénicillines, Aspirine, Sulfamides"
                value={formPatient.allergies}
                onChange={(e) => setFormPatient({ ...formPatient, allergies: e.target.value })}
                className="border-red-300 focus-visible:ring-red-500"
              />
            </div>

            <div>
              <Label htmlFor="pathologies">Pathologies chroniques (séparées par virgule)</Label>
              <Input
                id="pathologies"
                placeholder="Ex: Hypertension artérielle, Diabète type 2, Asthme"
                value={formPatient.pathologies}
                onChange={(e) => setFormPatient({ ...formPatient, pathologies: e.target.value })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogNouveauPatient(false)}>
                Annuler
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={mutationCreerPatient.isPending}>
                Enregistrer le Patient
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODALE : NOUVELLE ORDONNANCE */}
      <Dialog open={dialogNouvelleOrdonnance} onOpenChange={setDialogNouvelleOrdonnance}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <FileText className="h-5 w-5" />
              Enregistrement d'une Ordonnance Médicale
            </DialogTitle>
            <DialogDescription>
              Numérotation automatique, rattachement au médecin et calcul des renouvellements.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreerOrdonnance} className="space-y-4 py-2">
            <div>
              <Label htmlFor="ord_patient">Patient *</Label>
              <select
                id="ord_patient"
                required
                className="w-full border rounded-md p-2 text-sm"
                value={formOrdonnance.patient_id}
                onChange={(e) => setFormOrdonnance({ ...formOrdonnance, patient_id: e.target.value })}
              >
                <option value="">-- Choisir un patient --</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nom} {p.prenom} ({p.code_patient}) - {p.telephone}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ord_doc">Médecin Prescripteur</Label>
                <select
                  id="ord_doc"
                  className="w-full border rounded-md p-2 text-sm"
                  value={formOrdonnance.prescripteur_id}
                  onChange={(e) => setFormOrdonnance({ ...formOrdonnance, prescripteur_id: e.target.value })}
                >
                  <option value="">-- Prescripteur du répertoire --</option>
                  {prescripteurs.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.nom_complet} ({doc.centre_sante || doc.specialite})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="ord_doc_libre">Ou nom libre du médecin</Label>
                <Input
                  id="ord_doc_libre"
                  placeholder="Ex: Dr Mensah"
                  value={formOrdonnance.prescripteur_nom_libre}
                  onChange={(e) => setFormOrdonnance({ ...formOrdonnance, prescripteur_nom_libre: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="date_presc">Date prescription *</Label>
                <Input
                  id="date_presc"
                  type="date"
                  required
                  value={formOrdonnance.date_prescription}
                  onChange={(e) => setFormOrdonnance({ ...formOrdonnance, date_prescription: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="duree_traitement">Durée (jours)</Label>
                <Input
                  id="duree_traitement"
                  type="number"
                  value={formOrdonnance.duree_traitement_jours}
                  onChange={(e) => setFormOrdonnance({ ...formOrdonnance, duree_traitement_jours: parseInt(e.target.value, 10) || 30 })}
                />
              </div>
              <div>
                <Label htmlFor="renouvellements">Renouvellements max</Label>
                <Input
                  id="renouvellements"
                  type="number"
                  min="0"
                  max="12"
                  value={formOrdonnance.nombre_renouvellements_autorises}
                  onChange={(e) => setFormOrdonnance({ ...formOrdonnance, nombre_renouvellements_autorises: parseInt(e.target.value, 10) || 0 })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="diag">Diagnostic ou motif présumé</Label>
              <Input
                id="diag"
                placeholder="Ex: Infection ORL, Contrôle trimestriel HTA..."
                value={formOrdonnance.diagnostic_presume}
                onChange={(e) => setFormOrdonnance({ ...formOrdonnance, diagnostic_presume: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="lignes_presc">Lignes prescrites (Médicament : Posologie)</Label>
              <textarea
                id="lignes_presc"
                rows={3}
                className="w-full border rounded-md p-2 text-sm font-mono"
                value={formOrdonnance.lignes_texte}
                onChange={(e) => setFormOrdonnance({ ...formOrdonnance, lignes_texte: e.target.value })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogNouvelleOrdonnance(false)}>
                Annuler
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={mutationCreerOrdonnance.isPending}>
                Créer l'Ordonnance
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODALE : HISTORIQUE THÉRAPEUTIQUE UNIFIÉ DU PATIENT */}
      <Dialog open={dialogHistoriquePatient} onOpenChange={setDialogHistoriquePatient}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-800">
              <Activity className="h-5 w-5" />
              Historique Thérapeutique Unifié — {patientSelectionne?.nom} {patientSelectionne?.prenom}
            </DialogTitle>
            <DialogDescription>
              Traçabilité chronologique complète des spécialités délivrées, numéros de lots et posologies (BPD Art. 7.1).
            </DialogDescription>
          </DialogHeader>

          {loadingHistorique ? (
            <div className="py-8 text-center text-slate-500">Chargement de l'historique...</div>
          ) : (
            <div className="space-y-4 py-2">
              {/* Profil rapide */}
              <div className="p-3 bg-slate-50 rounded-lg flex flex-wrap items-center justify-between text-xs gap-2">
                <div>
                  <span className="text-slate-500">Code DP : </span>
                  <span className="font-mono font-bold text-slate-900">{patientSelectionne?.code_patient}</span>
                </div>
                <div>
                  <span className="text-slate-500">Âge : </span>
                  <span className="font-semibold text-slate-900">{patientSelectionne?.age} ans</span>
                </div>
                {patientSelectionne?.allergies_declarees && patientSelectionne.allergies_declarees.length > 0 && (
                  <div className="text-red-700 font-semibold flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Allergies : {patientSelectionne.allergies_declarees.join(", ")}
                  </div>
                )}
              </div>

              {/* Lignes de l'historique */}
              {historiquePatientData?.historique && historiquePatientData.historique.length > 0 ? (
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-semibold">
                      <tr>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Médicament (DCI)</th>
                        <th className="p-2.5">Lot & Péremption</th>
                        <th className="p-2.5 text-center">Qté</th>
                        <th className="p-2.5">Posologie</th>
                        <th className="p-2.5">Dispensateur</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {historiquePatientData.historique.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2.5 whitespace-nowrap text-slate-500">{item.date_dispensation}</td>
                          <td className="p-2.5 font-medium text-slate-900">
                            {item.nom_commercial}
                            {item.dci && <span className="block text-[11px] text-slate-500 italic">DCI: {item.dci}</span>}
                          </td>
                          <td className="p-2.5 font-mono text-[11px] text-slate-600">
                            Lot: {item.numero_lot || "N/A"}
                            {item.date_peremption && (
                              <span className="block text-slate-400">Exp: {item.date_peremption}</span>
                            )}
                          </td>
                          <td className="p-2.5 text-center font-bold text-emerald-700">{item.quantite}</td>
                          <td className="p-2.5 text-slate-600">{item.posologie || "Standard"}</td>
                          <td className="p-2.5 text-slate-500">{item.dispensateur}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center text-slate-500 text-xs">
                  Aucune délivrance enregistrée pour ce patient jusqu'à présent.
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogHistoriquePatient(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODALE : NOUVEAU MÉDECIN */}
      <Dialog open={dialogNouveauPrescripteur} onOpenChange={setDialogNouveauPrescripteur}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <Stethoscope className="h-5 w-5" />
              Nouveau Médecin / Prescripteur
            </DialogTitle>
            <DialogDescription>
              Ajout au répertoire des praticiens habilités de l'officine.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreerPrescripteur} className="space-y-3 py-2">
            <div>
              <Label htmlFor="doc_nom">Nom complet avec civilité *</Label>
              <Input
                id="doc_nom"
                required
                placeholder="Ex: Dr. Mathieu KOUDJO"
                value={formPrescripteur.nom_complet}
                onChange={(e) => setFormPrescripteur({ ...formPrescripteur, nom_complet: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="doc_spec">Spécialité</Label>
              <Input
                id="doc_spec"
                placeholder="Ex: Cardiologue, Pédiatre..."
                value={formPrescripteur.specialite}
                onChange={(e) => setFormPrescripteur({ ...formPrescripteur, specialite: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="doc_num">Numéro Inscription Ordre (CNOM)</Label>
              <Input
                id="doc_num"
                placeholder="Ex: 1420/CNOM-BEN"
                value={formPrescripteur.numero_ordre}
                onChange={(e) => setFormPrescripteur({ ...formPrescripteur, numero_ordre: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="doc_centre">Hôpital / Clinique</Label>
              <Input
                id="doc_centre"
                placeholder="Ex: CNHU HKM Cotonou"
                value={formPrescripteur.centre_sante}
                onChange={(e) => setFormPrescripteur({ ...formPrescripteur, centre_sante: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogNouveauPrescripteur(false)}>
                Annuler
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={mutationCreerPrescripteur.isPending}>
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
