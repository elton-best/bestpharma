import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Calendar as CalendarIcon,
  CalendarCheck2,
  CalendarPlus,
  Clock,
  AlertTriangle,
  RotateCcw,
  Download,
  ShieldAlert,
  FileText,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  UploadCloud,
  SlidersHorizontal,
  Bell,
  Sparkles,
  ExternalLink,
  Layers,
  Send,
} from "lucide-react";

import { api } from "@/lib/api-client";
import { useOfficine } from "@/lib/officine-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Champ, ColonneFiche, ModaleFiche } from "@/components/modules/modale";
import { EnTete, Vide, dateFr, joursRestants, QUALITE } from "@/components/modules/commun";
import {
  ModaleSignatureCode,
  BoutonCreerNC,
  LienReglementaireBpd,
  SignatureData,
} from "@/components/modules/bpd-communs";

export const Route = createFileRoute("/_authenticated/echeances")({
  head: () => ({
    meta: [
      { title: "Échéances Réglementaires — BestPharma" },
      { name: "description", content: "Calendrier unifié de conformité BPD, renouvellement licences, étalonnages et obligations légales." },
    ],
  }),
  component: PageEcheances,
});

export interface Echeance {
  id: string;
  officine_id?: string;
  titre: string;
  responsable?: string | null;
  categorie: string | null;
  priorite?: "critique" | "important" | "information";
  date_echeance: string;
  periodicite?: "unique" | "mensuelle" | "trimestrielle" | "semestrielle" | "annuelle";
  reglementaire?: boolean;
  fait: boolean;
  date_realisation?: string | null;
  preuve_titre?: string | null;
  justificatif_url?: string | null;
  notes?: string | null;
}

const CATEGORIES = [
  { valeur: "reglementaire", libelle: "Licence & Autorisation ABMed", badge: "bg-emerald-100 text-emerald-800" },
  { valeur: "personnel", libelle: "Ordre Section B & Personnel", badge: "bg-blue-100 text-blue-800" },
  { valeur: "equipement", libelle: "Équipements & Étalonnages", badge: "bg-amber-100 text-amber-800" },
  { valeur: "locaux", libelle: "Locaux, 3D & Sécurité Incendie", badge: "bg-purple-100 text-purple-800" },
  { valeur: "qualite", libelle: "Qualité, GED, Audit & PRA", badge: "bg-teal-100 text-teal-800" },
  { valeur: "fiscal_social", libelle: "Fiscal, Social & Assurances", badge: "bg-slate-100 text-slate-800" },
  { valeur: "autre", libelle: "Autre échéance interne", badge: "bg-muted text-foreground" },
];

const libelleCategorie = (valeur: string | null) =>
  CATEGORIES.find((c) => c.valeur === valeur)?.libelle ?? "Autre obligation";

function PageEcheances() {
  const { courante, aRole, chargement } = useOfficine();
  const id = courante?.officine_id;
  const qc = useQueryClient();
  const peutGerer = aRole(...QUALITE);

  const [ongletActif, setOngletActif] = useState<string>("a_venir_retard");
  const [echeanceACloturer, setEcheanceACloturer] = useState<Echeance | null>(null);
  const [echeanceAReporter, setEcheanceAReporter] = useState<Echeance | null>(null);
  const [echeanceASigner, setEcheanceASigner] = useState<Echeance | null>(null);

  const { data: echeances = [], isLoading } = useQuery<Echeance[]>({
    queryKey: ["echeances", id],
    enabled: !!id,
    queryFn: () => api.get<Echeance[]>(`/officines/${id}/echeances`),
  });

  const marquerFait = useMutation({
    mutationFn: ({ eid, fait, date_realisation, preuve_titre, recreer_suivante }: {
      eid: string;
      fait: boolean;
      date_realisation?: string;
      preuve_titre?: string;
      recreer_suivante?: boolean;
    }) =>
      api.put(`/echeances/${eid}`, { fait, date_realisation, preuve_titre, recreer_suivante }),
    onSuccess: () => {
      toast.success("Échéance régularisée avec succès !");
      qc.invalidateQueries({ queryKey: ["echeances"] });
      setEcheanceACloturer(null);
      setEcheanceASigner(null);
    },
    onError: (e: any) => toast.error(e.message || "Mise à jour impossible"),
  });

  // KPI
  const nonFaites = echeances.filter((e) => !e.fait);
  const enRetard = nonFaites.filter((e) => joursRestants(e.date_echeance) < 0);
  const retardsReglementaires = enRetard.filter((e) => e.reglementaire !== false);
  const a30Jours = nonFaites.filter((e) => {
    const j = joursRestants(e.date_echeance);
    return j >= 0 && j <= 30;
  });
  const faites = echeances.filter((e) => e.fait);

  const telechargerIcal = () => {
    if (!id) return;
    window.open(`/api/officines/${id}/echeances/ical`, "_blank");
    toast.success("Téléchargement du fichier iCal (.ics) en cours…");
  };

  return (
    <div className="grid gap-6">
      <EnTete
        titre="Échéancier Réglementaire"
        description="BPD Section 9 · Calendrier unifié des licences ABMed, inscriptions à l'Ordre, étalonnages et obligations légales de l'officine."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={telechargerIcal}
              className="gap-1.5 border-[#CFF1D2] text-[#0F3B27] hover:bg-[#CFF1D2]/20"
              title="Synchroniser avec Google Calendar ou Apple Calendar"
            >
              <Download className="size-4" /> Export iCal
            </Button>
            {peutGerer && id ? <AjoutEcheance officineId={id} /> : null}
          </div>
        }
      />

      {/* BANNIÈRE ROUGE IMPÉRATIVE EN CAS DE RETARD RÉGLEMENTAIRE (Règle §9.4 ECH-05 / ECH-07) */}
      {retardsReglementaires.length > 0 && (
        <Card className="border-red-400 bg-red-50 shadow-sm animate-pulse">
          <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-red-100 text-red-700 shrink-0">
                <ShieldAlert className="size-6" />
              </div>
              <div>
                <h3 className="font-bold text-red-900 flex items-center gap-2">
                  <span>{retardsReglementaires.length} échéance(s) réglementaire(s) en retard critique !</span>
                  <LienReglementaireBpd articles="BPD Section 9 & Art. 3.04" />
                </h3>
                <p className="text-xs text-red-800 mt-0.5">
                  Conformément aux BPD ABMed, les obligations réglementaires ne peuvent être reportées. Elles doivent être régularisées avec justificatif ou faire l'objet d'une Non-Conformité tracée.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {retardsReglementaires.slice(0, 3).map((r) => (
                    <Badge key={r.id} variant="destructive" className="text-[11px] font-medium">
                      {r.titre} ({Math.abs(joursRestants(r.date_echeance))} j de retard)
                    </Badge>
                  ))}
                  {retardsReglementaires.length > 3 && (
                    <Badge variant="outline" className="text-[11px] border-red-300 text-red-800">
                      +{retardsReglementaires.length - 3} autre(s)
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <BoutonCreerNC
                sourceDefaut="reglementaire"
                processusDefaut="QAM"
                graviteDefaut="critique"
                titreSuggere={`Dépassement échéance réglementaire : ${retardsReglementaires[0]?.titre}`}
                descriptionDefaut={`L'échéance réglementaire « ${retardsReglementaires[0]?.titre} » est arrivée à expiration sans justificatif de renouvellement enregistré.`}
                actionImmediateDefaut="Saisine d'urgence du Pharmacien Titulaire et préparation du dossier de régularisation."
                libelleBouton="Ouvrir une NC d'urgence"
                classeBouton="bg-red-700 hover:bg-red-800 text-white"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI COCKPIT */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-[#CFF1D2] bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">À traiter</p>
              <p className="text-2xl font-black text-[#0F3B27] mt-1">{nonFaites.length}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-[#CFF1D2]/30 text-[#0F3B27]">
              <Clock className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className={`border-[#CFF1D2] bg-card ${enRetard.length > 0 ? "border-red-300 bg-red-50/30" : ""}`}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">En retard</p>
              <p className={`text-2xl font-black mt-1 ${enRetard.length > 0 ? "text-red-600" : "text-emerald-700"}`}>
                {enRetard.length}
              </p>
            </div>
            <div className={`p-2.5 rounded-xl ${enRetard.length > 0 ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-700"}`}>
              <AlertTriangle className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#CFF1D2] bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Dans les 30 jours</p>
              <p className="text-2xl font-black text-amber-600 mt-1">{a30Jours.length}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700">
              <CalendarIcon className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#CFF1D2] bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Régularisées (Historique)</p>
              <p className="text-2xl font-black text-emerald-700 mt-1">{faites.length}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 5 ONGLETS CONFORMES AU CAHIER DES CHARGES (§9.2) */}
      <Tabs value={ongletActif} onValueChange={setOngletActif} className="space-y-4">
        <TabsList className="bg-muted/70 p-1 rounded-xl flex flex-wrap h-auto gap-1">
          <TabsTrigger value="calendrier" className="gap-2 rounded-lg py-2 data-[state=checked]:bg-white data-[state=checked]:text-[#0F3B27] data-[state=checked]:shadow-sm">
            <CalendarIcon className="size-4" /> Calendrier
          </TabsTrigger>
          <TabsTrigger value="a_venir_retard" className="gap-2 rounded-lg py-2 data-[state=checked]:bg-white data-[state=checked]:text-[#0F3B27] data-[state=checked]:shadow-sm">
            <Clock className="size-4" /> À venir & en retard
            {enRetard.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-red-600 text-white">
                {enRetard.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2 rounded-lg py-2 data-[state=checked]:bg-white data-[state=checked]:text-[#0F3B27] data-[state=checked]:shadow-sm">
            <Layers className="size-4" /> Par catégorie
          </TabsTrigger>
          <TabsTrigger value="regles" className="gap-2 rounded-lg py-2 data-[state=checked]:bg-white data-[state=checked]:text-[#0F3B27] data-[state=checked]:shadow-sm">
            <Bell className="size-4" /> Règles de rappel
          </TabsTrigger>
          <TabsTrigger value="historique" className="gap-2 rounded-lg py-2 data-[state=checked]:bg-white data-[state=checked]:text-[#0F3B27] data-[state=checked]:shadow-sm">
            <CheckCircle2 className="size-4" /> Historique ({faites.length})
          </TabsTrigger>
        </TabsList>

        {/* ========================================================================= */}
        {/* ONGLET 1 : CALENDRIER (Mois / Semaine / Liste) */}
        {/* ========================================================================= */}
        <TabsContent value="calendrier" className="space-y-4">
          <VueCalendrier
            echeances={echeances}
            onCloturer={(e) => setEcheanceACloturer(e)}
            onSigner={(e) => setEcheanceASigner(e)}
            onReporter={(e) => setEcheanceAReporter(e)}
          />
        </TabsContent>

        {/* ========================================================================= */}
        {/* ONGLET 2 : À VENIR ET EN RETARD */}
        {/* ========================================================================= */}
        <TabsContent value="a_venir_retard" className="space-y-4">
          <VueAVenirEtEnRetard
            echeances={nonFaites}
            peutGerer={peutGerer}
            onCloturer={(e) => setEcheanceACloturer(e)}
            onSigner={(e) => setEcheanceASigner(e)}
            onReporter={(e) => setEcheanceAReporter(e)}
          />
        </TabsContent>

        {/* ========================================================================= */}
        {/* ONGLET 3 : PAR CATÉGORIE */}
        {/* ========================================================================= */}
        <TabsContent value="categories" className="space-y-4">
          <VueParCategorie
            echeances={echeances}
            peutGerer={peutGerer}
            onCloturer={(e) => setEcheanceACloturer(e)}
            onSigner={(e) => setEcheanceASigner(e)}
            onReporter={(e) => setEcheanceAReporter(e)}
          />
        </TabsContent>

        {/* ========================================================================= */}
        {/* ONGLET 4 : RÈGLES DE RAPPEL (§9.3 ECH-02, ECH-03, ECH-09) */}
        {/* ========================================================================= */}
        <TabsContent value="regles" className="space-y-4">
          <VueReglesDeRappel officineId={id} />
        </TabsContent>

        {/* ========================================================================= */}
        {/* ONGLET 5 : HISTORIQUE AVEC PREUVES (ECH-06) */}
        {/* ========================================================================= */}
        <TabsContent value="historique" className="space-y-4">
          <VueHistorique
            echeances={faites}
            peutGerer={peutGerer}
            onRouvrir={(e) => marquerFait.mutate({ eid: e.id, fait: false })}
          />
        </TabsContent>
      </Tabs>

      {/* MODALE DE CLÔTURE AVEC DÉPÔT DE PREUVE (ECH-06) */}
      {echeanceACloturer && (
        <ModaleCloturePreuve
          echeance={echeanceACloturer}
          ouvert={!!echeanceACloturer}
          onFermer={() => setEcheanceACloturer(null)}
          onValider={(preuveTitre, recreer) => {
            marquerFait.mutate({
              eid: echeanceACloturer.id,
              fait: true,
              date_realisation: new Date().toISOString().split("T")[0],
              preuve_titre: preuveTitre,
              recreer_suivante: recreer,
            });
          }}
          isPending={marquerFait.isPending}
        />
      )}

      {/* MODALE DE REPORT AVEC MOTIF (ECH-07 : INTERDIT SI RÉGLEMENTAIRE) */}
      {echeanceAReporter && (
        <ModaleReportMotif
          echeance={echeanceAReporter}
          ouvert={!!echeanceAReporter}
          onFermer={() => setEcheanceAReporter(null)}
          onReporter={async (nouvelleDate, motif) => {
            try {
              await api.put(`/echeances/${echeanceAReporter.id}`, {
                date_echeance: nouvelleDate,
                notes: `${echeanceAReporter.notes || ""}\n[Report au ${dateFr(nouvelleDate)}] : ${motif}`,
              });
              toast.success("Échéance interne reportée.");
              qc.invalidateQueries({ queryKey: ["echeances"] });
              setEcheanceAReporter(null);
            } catch (err: any) {
              toast.error(err.message || "Impossible de reporter.");
            }
          }}
        />
      )}

      {/* MODALE DE SIGNATURE PAR CODE PERSONNEL (BPD-C10) */}
      {echeanceASigner && (
        <ModaleSignatureCode
          ouvert={!!echeanceASigner}
          onFermer={() => setEcheanceASigner(null)}
          titreAction={`Validation réglementaire : ${echeanceASigner.titre}`}
          descriptionAction="Apposez votre code PIN personnel pour certifier la conformité de ce renouvellement réglementaire auprès de l'ABMed."
          articleBpd="BPD Section 9 · Art. 3.04"
          onSigner={(sig: SignatureData) => {
            marquerFait.mutate({
              eid: echeanceASigner.id,
              fait: true,
              date_realisation: new Date().toISOString().split("T")[0],
              preuve_titre: `Visa certifié PIN (${sig.signataire})`,
              recreer_suivante: true,
            });
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// COMPOSANT : VUE CALENDRIER (Mois / Semaine / Liste)
// ============================================================================
function VueCalendrier({
  echeances,
  onCloturer,
  onSigner,
  onReporter,
}: {
  echeances: Echeance[];
  onCloturer: (e: Echeance) => void;
  onSigner: (e: Echeance) => void;
  onReporter: (e: Echeance) => void;
}) {
  const [modeVue, setModeVue] = useState<"mois" | "semaine" | "liste">("mois");
  const [dateRef, setDateRef] = useState(new Date());

  const moisNom = dateRef.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  const changerMois = (delta: number) => {
    const d = new Date(dateRef);
    d.setMonth(d.getMonth() + delta);
    setDateRef(d);
  };

  const annee = dateRef.getFullYear();
  const mois = dateRef.getMonth();
  const premierJourDuMois = new Date(annee, mois, 1).getDay(); // 0 = Dimanche
  const nbJoursDansMois = new Date(annee, mois + 1, 0).getDate();
  const decalageLundi = (premierJourDuMois + 6) % 7; // 0 = Lundi

  const jours = Array.from({ length: nbJoursDansMois }, (_, i) => i + 1);

  return (
    <Card className="border-[#CFF1D2] shadow-sm">
      <CardHeader className="p-4 border-b border-[#CFF1D2]/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="size-8" onClick={() => changerMois(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="font-bold capitalize text-[#0F3B27] min-w-[140px] text-center">
            {moisNom}
          </span>
          <Button variant="outline" size="icon" className="size-8" onClick={() => changerMois(1)}>
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDateRef(new Date())} className="text-xs">
            Aujourd'hui
          </Button>
        </div>

        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
          <Button
            size="sm"
            variant={modeVue === "mois" ? "default" : "ghost"}
            className={`h-7 text-xs ${modeVue === "mois" ? "bg-[#0F3B27] text-white" : ""}`}
            onClick={() => setModeVue("mois")}
          >
            Vue Mois
          </Button>
          <Button
            size="sm"
            variant={modeVue === "semaine" ? "default" : "ghost"}
            className={`h-7 text-xs ${modeVue === "semaine" ? "bg-[#0F3B27] text-white" : ""}`}
            onClick={() => setModeVue("semaine")}
          >
            Vue Semaine
          </Button>
          <Button
            size="sm"
            variant={modeVue === "liste" ? "default" : "ghost"}
            className={`h-7 text-xs ${modeVue === "liste" ? "bg-[#0F3B27] text-white" : ""}`}
            onClick={() => setModeVue("liste")}
          >
            Vue Liste
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {modeVue === "mois" && (
          <div className="grid grid-cols-7 gap-1">
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((j) => (
              <div key={j} className="text-center font-bold text-xs py-1.5 text-muted-foreground bg-muted/30 rounded">
                {j}
              </div>
            ))}

            {Array.from({ length: decalageLundi }).map((_, i) => (
              <div key={`vide-${i}`} className="min-h-[90px] bg-muted/10 rounded border border-dashed border-muted/40 p-1" />
            ))}

            {jours.map((jour) => {
              const strDate = `${annee}-${String(mois + 1).padStart(2, "0")}-${String(jour).padStart(2, "0")}`;
              const echeancesDuJour = echeances.filter((e) => e.date_echeance === strDate);
              const isToday = new Date().toISOString().split("T")[0] === strDate;

              return (
                <div
                  key={jour}
                  className={`min-h-[90px] rounded border p-1.5 flex flex-col justify-between transition-colors ${
                    isToday ? "border-[#92FF5F] bg-[#92FF5F]/10" : "border-muted/60 bg-card hover:bg-muted/10"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${isToday ? "text-[#0F3B27] bg-[#92FF5F] px-1.5 rounded-full" : "text-muted-foreground"}`}>
                      {jour}
                    </span>
                    {echeancesDuJour.length > 0 && (
                      <span className="text-[10px] font-bold text-muted-foreground">
                        {echeancesDuJour.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 mt-1 overflow-y-auto max-h-[70px]">
                    {echeancesDuJour.map((e) => {
                      const j = joursRestants(e.date_echeance);
                      const retard = !e.fait && j < 0;
                      return (
                        <div
                          key={e.id}
                          onClick={() => (e.fait ? null : onCloturer(e))}
                          className={`text-[10px] p-1 rounded font-medium truncate cursor-pointer transition-transform hover:scale-[1.02] ${
                            e.fait
                              ? "bg-emerald-100 text-emerald-800 line-through opacity-70"
                              : retard
                                ? "bg-red-500 text-white font-bold"
                                : e.priorite === "critique"
                                  ? "bg-amber-500 text-white font-bold"
                                  : "bg-[#0F3B27] text-[#92FF5F]"
                          }`}
                          title={`${e.titre} - ${libelleCategorie(e.categorie)}`}
                        >
                          {e.titre}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {modeVue === "semaine" && (
          <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((_, i) => {
              const d = new Date(dateRef);
              d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + i);
              const iso = d.toISOString().split("T")[0];
              const duJour = echeances.filter((e) => e.date_echeance === iso);
              const estAujourdhui = new Date().toISOString().split("T")[0] === iso;

              return (
                <div
                  key={i}
                  className={`border rounded-xl p-3 min-h-[220px] flex flex-col justify-between ${
                    estAujourdhui ? "border-[#0F3B27] bg-[#F7FBF8]" : "border-border bg-card"
                  }`}
                >
                  <div>
                    <div className="border-b pb-2 mb-2 flex items-center justify-between">
                      <p className="text-xs font-bold capitalize text-muted-foreground">
                        {d.toLocaleDateString("fr-FR", { weekday: "short" })}
                      </p>
                      <p className={`text-sm font-black ${estAujourdhui ? "text-[#0F3B27]" : ""}`}>
                        {d.getDate()}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      {duJour.map((e) => (
                        <div
                          key={e.id}
                          onClick={() => (e.fait ? null : onCloturer(e))}
                          className={`p-2 rounded-lg text-xs cursor-pointer ${
                            e.fait
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : joursRestants(e.date_echeance) < 0
                                ? "bg-red-100 text-red-900 border border-red-300 font-bold"
                                : "bg-muted text-foreground border"
                          }`}
                        >
                          <p className="font-semibold truncate">{e.titre}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {e.responsable || "RMQ"}
                          </p>
                        </div>
                      ))}
                      {duJour.length === 0 && (
                        <p className="text-[11px] text-muted-foreground/60 text-center py-6">
                          Aucune échéance
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {modeVue === "liste" && (
          <div className="space-y-2">
            {echeances.slice(0, 15).map((e) => {
              const j = joursRestants(e.date_echeance);
              const retard = !e.fait && j < 0;
              return (
                <div
                  key={e.id}
                  className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    e.fait
                      ? "bg-emerald-50/40 border-emerald-200 opacity-80"
                      : retard
                        ? "bg-red-50/50 border-red-300"
                        : "bg-card border-border"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">{e.titre}</span>
                      {e.reglementaire && (
                        <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-800">
                          Réglementaire
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {libelleCategorie(e.categorie)} · {dateFr(e.date_echeance)} · Responsable : {e.responsable || "RMQ"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {e.fait ? (
                      <Badge className="bg-emerald-600 text-white">Régularisé</Badge>
                    ) : (
                      <Badge variant={retard ? "destructive" : "secondary"}>
                        {retard ? `${Math.abs(j)} j de retard` : `Dans ${j} jour(s)`}
                      </Badge>
                    )}
                    {!e.fait && (
                      <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => onCloturer(e)}>
                        <CalendarCheck2 className="size-3.5" /> Clôturer
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// COMPOSANT : VUE À VENIR ET EN RETARD
// ============================================================================
function VueAVenirEtEnRetard({
  echeances,
  peutGerer,
  onCloturer,
  onSigner,
  onReporter,
}: {
  echeances: Echeance[];
  peutGerer: boolean;
  onCloturer: (e: Echeance) => void;
  onSigner: (e: Echeance) => void;
  onReporter: (e: Echeance) => void;
}) {
  // Tri : les retards d'abord, puis par date croissante
  const triees = [...echeances].sort((a, b) => {
    return new Date(a.date_echeance).getTime() - new Date(b.date_echeance).getTime();
  });

  if (triees.length === 0) {
    return (
      <Card className="border-[#CFF1D2] bg-card p-8 text-center">
        <CheckCircle2 className="size-12 text-emerald-600 mx-auto mb-3" />
        <h3 className="text-base font-bold text-foreground">Toutes les échéances sont à jour !</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
          Aucune échéance réglementaire ou interne n'est en attente pour votre officine.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {triees.map((e) => {
        const j = joursRestants(e.date_echeance);
        const retard = j < 0;
        const estCritique = e.priorite === "critique" || retard;

        return (
          <Card
            key={e.id}
            className={`border transition-all ${
              retard
                ? "border-red-400 bg-red-50/50 shadow-sm"
                : j <= 7
                  ? "border-amber-300 bg-amber-50/30"
                  : "border-[#CFF1D2] bg-card"
            }`}
          >
            <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-sm md:text-base text-foreground">{e.titre}</span>
                  {e.reglementaire ? (
                    <Badge className="bg-[#0F3B27] text-[#92FF5F] text-[10px] font-bold">
                      Obligation BPD
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">Interne</Badge>
                  )}
                  {e.priorite === "critique" && (
                    <Badge variant="destructive" className="text-[10px]">Priorité Critique</Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{libelleCategorie(e.categorie)}</span>
                  <span>·</span>
                  <span>Date butoir : <strong className={retard ? "text-red-700 font-black" : "text-foreground"}>{dateFr(e.date_echeance)}</strong></span>
                  <span>·</span>
                  <span>Responsable : {e.responsable || "Pharmacien Titulaire / RMQ"}</span>
                  {e.periodicite && (
                    <>
                      <span>·</span>
                      <span className="capitalize">Récurrence : {e.periodicite}</span>
                    </>
                  )}
                </div>

                {e.notes && (
                  <p className="text-xs text-muted-foreground bg-muted/40 p-2 rounded-lg border border-muted/50 mt-1">
                    {e.notes}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Badge
                  variant={retard ? "destructive" : j <= 7 ? "secondary" : "outline"}
                  className="text-xs font-semibold px-2.5 py-1"
                >
                  {retard
                    ? `En retard de ${Math.abs(j)} jour${Math.abs(j) > 1 ? "s" : ""}`
                    : j === 0
                      ? "Aujourd'hui"
                      : `Dans ${j} jour${j > 1 ? "s" : ""}`}
                </Badge>

                {peutGerer && (
                  <div className="flex items-center gap-1.5">
                    {/* BOUTON SIGNER PIN OU CLÔTURER AVEC PREUVE */}
                    {e.reglementaire ? (
                      <Button
                        size="sm"
                        className="bg-[#0F3B27] hover:bg-[#0F3B27]/90 text-[#92FF5F] font-bold h-9 gap-1.5 shadow-sm"
                        onClick={() => onSigner(e)}
                      >
                        <CheckCircle2 className="size-4" /> Signer & Régulariser
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="default"
                        className="bg-[#0F3B27] hover:bg-[#0F3B27]/90 text-white font-bold h-9 gap-1.5"
                        onClick={() => onCloturer(e)}
                      >
                        <CalendarCheck2 className="size-4" /> Régulariser
                      </Button>
                    )}

                    {/* BOUTON REPORT : OUVRE MODALE QUI ENFORCE ECH-07 */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 gap-1 text-xs"
                      onClick={() => onReporter(e)}
                    >
                      <RotateCcw className="size-3.5" /> Reporter
                    </Button>

                    {/* SI RETARD : BOUTON CRÉER NC */}
                    {retard && (
                      <BoutonCreerNC
                        sourceDefaut="echeancier"
                        processusDefaut="QAM"
                        graviteDefaut={e.reglementaire ? "critique" : "majeure"}
                        titreSuggere={`Non-respect délai : ${e.titre}`}
                        descriptionDefaut={`L'échéance « ${e.titre} » est dépassée depuis le ${dateFr(e.date_echeance)} sans justificatif.`}
                        libelleBouton="Créer NC"
                        iconOnly={true}
                      />
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ============================================================================
// COMPOSANT : VUE PAR CATÉGORIE
// ============================================================================
function VueParCategorie({
  echeances,
  peutGerer,
  onCloturer,
  onSigner,
  onReporter,
}: {
  echeances: Echeance[];
  peutGerer: boolean;
  onCloturer: (e: Echeance) => void;
  onSigner: (e: Echeance) => void;
  onReporter: (e: Echeance) => void;
}) {
  const [catFiltre, setCatFiltre] = useState<string>("toutes");

  const filtrees = catFiltre === "toutes"
    ? echeances
    : echeances.filter((e) => e.categorie === catFiltre);

  return (
    <div className="space-y-4">
      {/* SÉLECTEUR DE CATÉGORIES EN GRILLE DE CARTES */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <Button
          variant={catFiltre === "toutes" ? "default" : "outline"}
          className={`h-auto py-2.5 px-3 flex flex-col items-center justify-center text-xs gap-1 ${
            catFiltre === "toutes" ? "bg-[#0F3B27] text-white" : "border-[#CFF1D2]"
          }`}
          onClick={() => setCatFiltre("toutes")}
        >
          <span className="font-bold">Toutes</span>
          <span className="text-[10px] opacity-80">{echeances.length} totale(s)</span>
        </Button>

        {CATEGORIES.slice(0, 5).map((c) => {
          const count = echeances.filter((e) => e.categorie === c.valeur).length;
          const retardCount = echeances.filter((e) => e.categorie === c.valeur && !e.fait && joursRestants(e.date_echeance) < 0).length;

          return (
            <Button
              key={c.valeur}
              variant={catFiltre === c.valeur ? "default" : "outline"}
              className={`h-auto py-2.5 px-3 flex flex-col items-center justify-center text-xs gap-1 text-center ${
                catFiltre === c.valeur ? "bg-[#0F3B27] text-white" : "border-[#CFF1D2]"
              }`}
              onClick={() => setCatFiltre(c.valeur)}
            >
              <span className="font-bold truncate max-w-full">{c.libelle.split(" ")[0]}</span>
              <span className="text-[10px] flex items-center gap-1">
                {count} {retardCount > 0 && <span className="text-red-500 font-bold">({retardCount}!)</span>}
              </span>
            </Button>
          );
        })}
      </div>

      <div className="space-y-2.5">
        {filtrees.map((e) => (
          <Card key={e.id} className="border-[#CFF1D2] bg-card p-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-sm text-foreground">{e.titre}</p>
                  {e.fait ? (
                    <Badge className="bg-emerald-600 text-white text-[10px]">Régularisé</Badge>
                  ) : joursRestants(e.date_echeance) < 0 ? (
                    <Badge variant="destructive" className="text-[10px]">En retard</Badge>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {libelleCategorie(e.categorie)} · Date : {dateFr(e.date_echeance)} · Responsable : {e.responsable || "RMQ"}
                </p>
              </div>

              {!e.fait && peutGerer && (
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => onCloturer(e)}>
                    <UploadCloud className="size-3.5" /> Clôturer avec preuve
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// COMPOSANT : VUE RÈGLES DE RAPPEL (§9.3 ECH-02, ECH-03, ECH-09)
// ============================================================================
function VueReglesDeRappel({ officineId }: { officineId?: string }) {
  const [j30, setJ30] = useState(true);
  const [j7, setJ7] = useState(true);
  const [j0, setJ0] = useState(true);
  const [canalPush, setCanalPush] = useState(true);
  const [canalSms, setCanalSms] = useState(true);
  const [canalInApp, setCanalInApp] = useState(true);
  const [heureResume, setHeureResume] = useState("08:00");

  const testerResume = () => {
    toast.success("Résumé quotidien simulé !", {
      description: "Notification push et e-mail envoyés avec les 3 échéances prioritaires du jour (Porto-Novo 08:00).",
    });
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="border-[#CFF1D2] shadow-sm">
        <CardHeader className="p-4 border-b border-[#CFF1D2]/40">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-[#0F3B27]">
            <Bell className="size-4 text-[#0F3B27]" /> Délais et Déclencheurs de Rappel (ECH-02)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between p-3 rounded-xl border border-muted bg-muted/20">
            <div>
              <p className="text-xs font-bold text-foreground">Alerte Anticipation (J-30)</p>
              <p className="text-[11px] text-muted-foreground">Premier rappel pour préparer les dossiers de renouvellement ABMed.</p>
            </div>
            <Switch checked={j30} onCheckedChange={setJ30} />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl border border-muted bg-muted/20">
            <div>
              <p className="text-xs font-bold text-foreground">Alerte Rapprochement (J-7)</p>
              <p className="text-[11px] text-muted-foreground">Rappel d'urgence adressé au Pharmacien Titulaire et au RMQ.</p>
            </div>
            <Switch checked={j7} onCheckedChange={setJ7} />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl border border-muted bg-muted/20">
            <div>
              <p className="text-xs font-bold text-foreground">Alerte Échéance (Jour J)</p>
              <p className="text-[11px] text-muted-foreground">Notification impérative le jour même de la date butoir.</p>
            </div>
            <Switch checked={j0} onCheckedChange={setJ0} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#CFF1D2] shadow-sm">
        <CardHeader className="p-4 border-b border-[#CFF1D2]/40">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-[#0F3B27]">
            <SlidersHorizontal className="size-4 text-[#0F3B27]" /> Canaux de Diffusion & Résumé Quotidien (ECH-03, ECH-09)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Notifications Push Mobiles (PWA)</Label>
              <Switch checked={canalPush} onCheckedChange={setCanalPush} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">SMS Alertes Critiques (MTN / Moov Bénin)</Label>
              <Switch checked={canalSms} onCheckedChange={setCanalSms} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Cloche In-App BestPharma</Label>
              <Switch checked={canalInApp} onCheckedChange={setCanalInApp} />
            </div>
          </div>

          <div className="pt-3 border-t border-muted space-y-2">
            <Label className="text-xs font-bold text-foreground">Heure du Résumé Quotidien Matinal (ECH-09)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="time"
                value={heureResume}
                onChange={(e) => setHeureResume(e.target.value)}
                className="h-10 w-36"
              />
              <Button size="sm" variant="outline" onClick={testerResume} className="gap-1.5 h-10 border-[#CFF1D2] text-[#0F3B27]">
                <Send className="size-3.5" /> Tester l'envoi immédiat
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Envoi automatique chaque matin aux pharmaciens avec les échéances du jour, de la semaine et les retards éventuels.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// COMPOSANT : VUE HISTORIQUE AVEC PREUVES (ECH-06)
// ============================================================================
function VueHistorique({
  echeances,
  peutGerer,
  onRouvrir,
}: {
  echeances: Echeance[];
  peutGerer: boolean;
  onRouvrir: (e: Echeance) => void;
}) {
  if (echeances.length === 0) {
    return <Vide texte="Aucune échéance archivée dans l'historique pour le moment." />;
  }

  return (
    <div className="space-y-3">
      {echeances.map((e) => (
        <Card key={e.id} className="border-[#CFF1D2] bg-[#F7FBF8] shadow-sm">
          <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-foreground">{e.titre}</span>
                <Badge className="bg-emerald-600 text-white text-[10px]">
                  Régularisée le {e.date_realisation ? dateFr(e.date_realisation) : "Terminé"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {libelleCategorie(e.categorie)} · Échéance initiale : {dateFr(e.date_echeance)} · Responsable : {e.responsable || "RMQ"}
              </p>
              {e.preuve_titre && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-medium bg-emerald-100/60 px-2 py-1 rounded w-fit mt-1">
                  <FileText className="size-3.5" /> Preuve enregistrée : {e.preuve_titre}
                </div>
              )}
            </div>

            {peutGerer && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 gap-1 text-muted-foreground hover:text-foreground text-xs"
                onClick={() => onRouvrir(e)}
              >
                <RotateCcw className="size-3.5" /> Rouvrir
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================================================
// MODALE : CLÔTURE AVEC DÉPÔT DE PREUVE (ECH-06)
// ============================================================================
function ModaleCloturePreuve({
  echeance,
  ouvert,
  onFermer,
  onValider,
  isPending,
}: {
  echeance: Echeance;
  ouvert: boolean;
  onFermer: () => void;
  onValider: (preuveTitre: string, recreer: boolean) => void;
  isPending: boolean;
}) {
  const [nomPreuve, setNomPreuve] = useState(`Certificat_${echeance.titre.substring(0, 20).replace(/\s+/g, "_")}_2026.pdf`);
  const [recreer, setRecreer] = useState(echeance.periodicite && echeance.periodicite !== "unique");

  return (
    <Dialog open={ouvert} onOpenChange={onFermer}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#0F3B27]">
            <CheckCircle2 className="size-5 text-emerald-600" /> Régulariser l'échéance avec preuve
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Conformément à la règle BPD ECH-06, marquer une obligation réalisée exige la consignation de la pièce renouvelée ou du justificatif d'intervention.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="p-3 rounded-xl bg-muted/40 border text-xs">
            <p className="font-bold text-foreground">{echeance.titre}</p>
            <p className="text-muted-foreground mt-0.5">Date butoir : {dateFr(echeance.date_echeance)}</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Nom de la pièce justificative téléversée</Label>
            <Input
              value={nomPreuve}
              onChange={(e) => setNomPreuve(e.target.value)}
              placeholder="Ex. Attestation_Ordre_2026.pdf"
              className="h-10 text-xs"
            />
            <p className="text-[11px] text-muted-foreground">Attestation, certificat d'étalonnage, rapport 3D ou bon d'intervention.</p>
          </div>

          {echeance.periodicite && echeance.periodicite !== "unique" && (
            <div className="flex items-center justify-between p-3 rounded-xl border border-[#CFF1D2] bg-[#F7FBF8]">
              <div>
                <p className="text-xs font-bold text-[#0F3B27]">Recalcul automatique de la prochaine échéance</p>
                <p className="text-[11px] text-muted-foreground">Créera l'échéance suivante dans {echeance.periodicite}.</p>
              </div>
              <Switch checked={!!recreer} onCheckedChange={setRecreer} />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onFermer}>Annuler</Button>
          <Button
            className="bg-[#0F3B27] hover:bg-[#0F3B27]/90 text-[#92FF5F] font-bold gap-1.5"
            onClick={() => onValider(nomPreuve, !!recreer)}
            disabled={isPending || !nomPreuve.trim()}
          >
            <CheckCircle2 className="size-4" /> Confirmer la régularisation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// MODALE : REPORT AVEC MOTIF (ECH-07 : INTERDIT SI RÉGLEMENTAIRE)
// ============================================================================
function ModaleReportMotif({
  echeance,
  ouvert,
  onFermer,
  onReporter,
}: {
  echeance: Echeance;
  ouvert: boolean;
  onFermer: () => void;
  onReporter: (nouvelleDate: string, motif: string) => Promise<void>;
}) {
  const [nouvelleDate, setNouvelleDate] = useState("");
  const [motif, setMotif] = useState("");
  const [chargement, setChargement] = useState(false);

  const estReglementaire = echeance.reglementaire !== false;

  return (
    <Dialog open={ouvert} onOpenChange={onFermer}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#0F3B27]">
            <RotateCcw className="size-5" /> Reporter une échéance
          </DialogTitle>
          <DialogDescription className="text-xs">
            Règle BPD ECH-07 : Conditions de report de date.
          </DialogDescription>
        </DialogHeader>

        {estReglementaire ? (
          <div className="space-y-3 py-2">
            <div className="p-4 rounded-xl bg-red-50 border border-red-300 text-red-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <ShieldAlert className="size-5 text-red-600" />
                Report interdit pour obligation réglementaire !
              </div>
              <p className="text-xs leading-relaxed">
                Conformément aux BPD ABMed Bénin (Règle ECH-07), une échéance réglementaire (licence ABMed, Ordre des pharmaciens, métrologie certifiée) ne peut faire l'objet d'un report unilatéral.
              </p>
              <p className="text-xs font-semibold text-red-800">
                Vous devez soit la régulariser avec preuve, soit la laisser en dépassement et ouvrir une fiche de Non-Conformité (NC) avec plan d'action CAPA.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nouvelle date d'échéance souhaitée</Label>
              <Input
                type="date"
                value={nouvelleDate}
                onChange={(e) => setNouvelleDate(e.target.value)}
                className="h-10 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Motif obligatoire du report interne</Label>
              <Textarea
                rows={3}
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                placeholder="Ex. Report convenu avec l'équipe pour disponibilité du prestataire informatique..."
                className="text-xs"
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onFermer}>Fermer</Button>
          {!estReglementaire && (
            <Button
              className="bg-[#0F3B27] hover:bg-[#0F3B27]/90 text-white font-bold"
              disabled={chargement || !nouvelleDate || !motif.trim()}
              onClick={async () => {
                setChargement(true);
                await onReporter(nouvelleDate, motif);
                setChargement(false);
              }}
            >
              {chargement ? "Report en cours…" : "Confirmer le report"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// MODALE : AJOUT D'UNE ÉCHÉANCE MANUELLE (ECH-04)
// ============================================================================
function AjoutEcheance({ officineId }: { officineId: string }) {
  const qc = useQueryClient();
  const [ouvert, setOuvert] = useState(false);
  const [f, setF] = useState({
    titre: "",
    responsable: "",
    categorie: "reglementaire",
    priorite: "important" as "critique" | "important" | "information",
    date_echeance: "",
    periodicite: "annuelle" as "unique" | "mensuelle" | "trimestrielle" | "semestrielle" | "annuelle",
    reglementaire: true,
    notes: "",
  });

  const m = useMutation({
    mutationFn: () =>
      api.post(`/officines/${officineId}/echeances`, {
        titre: f.titre.trim(),
        responsable: f.responsable.trim() || null,
        categorie: f.categorie,
        priorite: f.priorite,
        date_echeance: f.date_echeance,
        periodicite: f.periodicite,
        reglementaire: f.reglementaire,
        notes: f.notes.trim() || null,
      }),
    onSuccess: () => {
      toast.success("Échéance ajoutée avec succès au calendrier !");
      qc.invalidateQueries({ queryKey: ["echeances"] });
      setOuvert(false);
      setF({
        titre: "",
        responsable: "",
        categorie: "reglementaire",
        priorite: "important",
        date_echeance: "",
        periodicite: "annuelle",
        reglementaire: true,
        notes: "",
      });
    },
    onError: (e: any) => toast.error(e.message || "Enregistrement impossible"),
  });

  return (
    <Dialog open={ouvert} onOpenChange={setOuvert}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-[#0F3B27] hover:bg-[#0F3B27]/90 text-[#92FF5F] font-bold shadow-sm">
          <CalendarPlus className="size-4" /> Ajouter une échéance
        </Button>
      </DialogTrigger>
      <ModaleFiche
        titre="Nouvelle échéance réglementaire ou interne"
        sousTitre="Inscrivez une date à ne pas manquer : elle alimentera le tableau de bord qualité et déclenchera les alertes J-30, J-7 et J."
        pied={
          <>
            <Button variant="outline" className="h-11" onClick={() => setOuvert(false)}>
              Annuler
            </Button>
            <Button
              className="h-11 bg-[#0F3B27] hover:bg-[#0F3B27]/90 text-[#92FF5F] font-bold"
              onClick={() => f.titre.trim() && f.date_echeance && m.mutate()}
              disabled={m.isPending || !f.titre.trim() || !f.date_echeance}
            >
              {m.isPending ? "Enregistrement…" : "Enregistrer dans l'échéancier"}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <ColonneFiche titre="Détail de l'obligation">
            <Champ label="Intitulé de l'échéance" obligatoire>
              <Input
                value={f.titre}
                onChange={(e) => setF({ ...f, titre: e.target.value })}
                placeholder="Ex. Renouvellement Licence d'Exploitation ABMed"
                className="h-10 text-xs"
              />
            </Champ>
            <Champ label="Domaine / Catégorie">
              <Select value={f.categorie} onValueChange={(v) => setF({ ...f, categorie: v })}>
                <SelectTrigger className="h-10 w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.valeur} value={c.valeur}>
                      {c.libelle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Champ>
            <Champ label="Responsable du suivi">
              <Input
                value={f.responsable}
                onChange={(e) => setF({ ...f, responsable: e.target.value })}
                placeholder="Ex. Dr Félicien AGBO (Titulaire)"
                className="h-10 text-xs"
              />
            </Champ>
            <div className="flex items-center justify-between p-2.5 rounded-xl border border-muted bg-muted/20">
              <div>
                <p className="text-xs font-bold text-foreground">Obligation réglementaire stricte</p>
                <p className="text-[10px] text-muted-foreground">Si cochée, le report sera bloqué (Règle ECH-07).</p>
              </div>
              <Switch checked={f.reglementaire} onCheckedChange={(v) => setF({ ...f, reglementaire: v })} />
            </div>
          </ColonneFiche>

          <ColonneFiche titre="Date & Cadence">
            <Champ label="Date de l'échéance" obligatoire>
              <Input
                type="date"
                value={f.date_echeance}
                onChange={(e) => setF({ ...f, date_echeance: e.target.value })}
                className="h-10 text-xs"
              />
            </Champ>
            <Champ label="Priorité d'alerte">
              <Select value={f.priorite} onValueChange={(v: any) => setF({ ...f, priorite: v })}>
                <SelectTrigger className="h-10 w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critique">Critique (SMS + Push + Cloche)</SelectItem>
                  <SelectItem value="important">Important (Push + Cloche)</SelectItem>
                  <SelectItem value="information">Information (Cloche in-app)</SelectItem>
                </SelectContent>
              </Select>
            </Champ>
            <Champ label="Périodicité de renouvellement">
              <Select value={f.periodicite} onValueChange={(v: any) => setF({ ...f, periodicite: v })}>
                <SelectTrigger className="h-10 w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annuelle">Annuelle (12 mois)</SelectItem>
                  <SelectItem value="semestrielle">Semestrielle (6 mois)</SelectItem>
                  <SelectItem value="trimestrielle">Trimestrielle (3 mois)</SelectItem>
                  <SelectItem value="mensuelle">Mensuelle (1 mois)</SelectItem>
                  <SelectItem value="unique">Ponctuelle / Unique</SelectItem>
                </SelectContent>
              </Select>
            </Champ>
            <Champ label="Consignes / Notes">
              <Textarea
                value={f.notes}
                onChange={(e) => setF({ ...f, notes: e.target.value })}
                rows={2}
                placeholder="Ex. Contact prestataire métrologie : +229 97 ... "
                className="text-xs"
              />
            </Champ>
          </ColonneFiche>
        </div>
      </ModaleFiche>
    </Dialog>
  );
}
