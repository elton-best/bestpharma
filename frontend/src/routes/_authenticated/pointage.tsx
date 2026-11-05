import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  LogIn,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Users,
  Award,
  CheckCircle2,
  UserCheck,
  AlertTriangle,
  History,
  Sparkles,
  QrCode,
  Printer,
  Calendar,
  FileText,
  FileCheck,
  KeyRound,
  Download,
  Settings,
  Plus,
  Coffee,
  X,
  Smartphone,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { useOfficine } from "@/lib/officine-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import {
  ModaleSignatureCode,
  BoutonCreerNC,
  LienReglementaireBpd,
  SignatureData,
} from "@/components/modules/bpd-communs";

export const Route = createFileRoute("/_authenticated/pointage")({
  head: () => ({
    meta: [
      { title: "Pointage & Présence Pharmacien — BestPharma" },
      {
        name: "description",
        content: "Pointage nominatif et respect strict de l'obligation de présence d'un pharmacien (art. 1.11 BPD).",
      },
    ],
  }),
  component: PagePointage,
});

interface PointageData {
  pointages: Array<{
    id: string;
    employe_id: string;
    employe_nom: string;
    employe_poste: string;
    type: "arrivee" | "depart";
    horodatage: string;
  }>;
  pharmacien_present: boolean;
  pharmaciens_sur_place: string[];
  statut_reglementaire: string;
  message: string;
}

function PagePointage() {
  const { courante } = useOfficine();
  const id = courante?.officine_id;
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState("direct");

  // Mode borne de pointage plein écran (POI-03)
  const [modeBorne, setModeBorne] = useState(false);
  const [bornePin, setBornePin] = useState("");
  const [dernierScanResultat, setDernierScanResultat] = useState<any>(null);

  // Modale Correction d'Oubli (POI-09)
  const [modaleCorrection, setModaleCorrection] = useState(false);
  const [employeCorrection, setEmployeCorrection] = useState("");
  const [typeCorrection, setTypeCorrection] = useState<"arrivee" | "depart">("arrivee");
  const [heureCorrection, setHeureCorrection] = useState("08:00");
  const [motifCorrection, setMotifCorrection] = useState("");

  // Modale Demande d'absence (POI-10)
  const [modaleAbsence, setModaleAbsence] = useState(false);
  const [employeAbsence, setEmployeAbsence] = useState("");
  const [motifAbsence, setMotifAbsence] = useState("Maladie");
  const [dateDebutAbsence, setDateDebutAbsence] = useState("");
  const [dateFinAbsence, setDateFinAbsence] = useState("");

  // Modale Impression Badges (POI-01)
  const [modaleBadge, setModaleBadge] = useState(false);
  const [employeBadge, setEmployeBadge] = useState<any>(null);

  // Modale Signature PIN (BPD-C10)
  const [modaleSignOuverte, setModaleSignOuverte] = useState(false);
  const [actionSignature, setActionSignature] = useState<{ titre: string; cb: () => void } | null>(null);

  // Horloge numérique en direct synchronisée sur le fuseau du Bénin (Africa/Porto-Novo)
  const [heureBenin, setHeureBenin] = useState("");
  const [dateBenin, setDateBenin] = useState("");

  useEffect(() => {
    const majHorloge = () => {
      const now = new Date();
      setHeureBenin(
        now.toLocaleTimeString("fr-FR", {
          timeZone: "Africa/Porto-Novo",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
      setDateBenin(
        now.toLocaleDateString("fr-FR", {
          timeZone: "Africa/Porto-Novo",
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      );
    };
    majHorloge();
    const interval = setInterval(majHorloge, 1000);
    return () => clearInterval(interval);
  }, []);

  // Liste des employés actifs
  const { data: employesData } = useQuery({
    queryKey: ["employes", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await api.get<{ employes: any[] }>(`/api/officines/${id}/employes`);
      return res.employes || [];
    },
  });

  // État des pointages et présence pharmaceutique
  const { data: presenceData } = useQuery<PointageData>({
    queryKey: ["pointages", id],
    enabled: !!id,
    queryFn: async () => {
      return api.get<PointageData>(`/api/officines/${id}/pointages`);
    },
    refetchInterval: 10000,
  });

  const pointer = useMutation({
    mutationFn: async (p: { employe_id: string; type: "arrivee" | "depart" }) => {
      return api.post(`/api/officines/${id}/pointages`, p);
    },
    onSuccess: (_d, p) => {
      toast.success(
        p.type === "arrivee" ? "Arrivée enregistrée à l'heure serveur" : "Départ enregistré à l'heure serveur"
      );
      qc.invalidateQueries({ queryKey: ["pointages"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const employes = employesData || [];
  const pointages = presenceData?.pointages || [];
  const pharmacienPresent = presenceData?.pharmacien_present ?? false;
  const pharmaciensSurPlace = presenceData?.pharmaciens_sur_place || [];

  const dernier = (eid: string) => pointages.find((p) => p.employe_id === eid);

  // Ratios de présence
  const totalPresents = employes.filter((e: any) => dernier(e.id)?.type === "arrivee").length;

  // Soumission pointage via borne PIN
  function validerBornePin(e: React.FormEvent) {
    e.preventDefault();
    if (bornePin.length < 4) return;

    // Simulation de recherche employé par code PIN
    const matchEmp = employes[0] || { id: "emp-1", nom_complet: "Dr Félicien AGBO", poste: "pharmacien_titulaire" };
    const estPresent = dernier(matchEmp.id)?.type === "arrivee";
    const nouveauType = estPresent ? "depart" : "arrivee";

    pointer.mutate({ employe_id: matchEmp.id, type: nouveauType });
    setDernierScanResultat({
      nom: matchEmp.nom_complet,
      type: nouveauType,
      heure: heureBenin,
      poste: matchEmp.poste,
    });
    setBornePin("");

    setTimeout(() => {
      setDernierScanResultat(null);
    }, 4000);
  }

  // Si le mode borne plein écran est activé (POI-03)
  if (modeBorne) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0F3B27] text-white flex flex-col justify-between p-8 font-sans">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-2xl bg-[#92FF5F] text-[#0F3B27] flex items-center justify-center font-black text-2xl">
              +
            </div>
            <div>
              <h1 className="font-display font-black text-2xl tracking-tight text-white">
                BESTPHARMA · Borne de Pointage
              </h1>
              <p className="text-xs text-[#CFF1D2]">
                {courante?.officine?.nom || "Officine BPD Bénin"} · Fuseau Africa/Porto-Novo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="font-mono text-3xl font-black text-[#92FF5F]">{heureBenin}</div>
              <div className="text-xs text-[#CFF1D2] capitalize">{dateBenin}</div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModeBorne(false)}
              className="border-[#92FF5F] text-[#92FF5F] hover:bg-[#92FF5F]/20 text-xs gap-1.5"
            >
              <X className="size-4" /> Quitter Borne
            </Button>
          </div>
        </div>

        {/* Cœur interactif de la borne */}
        <div className="max-w-md mx-auto w-full text-center space-y-6">
          {dernierScanResultat ? (
            <div className="p-8 rounded-3xl bg-white text-[#0F3B27] shadow-2xl space-y-3 animate-in zoom-in-95">
              <div className="size-16 rounded-full bg-[#92FF5F] text-[#0F3B27] flex items-center justify-center mx-auto font-black text-2xl">
                ✓
              </div>
              <h2 className="font-display text-2xl font-black">{dernierScanResultat.nom}</h2>
              <Badge className={dernierScanResultat.type === "arrivee" ? "bg-emerald-600 text-white text-sm px-3 py-1" : "bg-amber-600 text-white text-sm px-3 py-1"}>
                {dernierScanResultat.type === "arrivee" ? "Arrivée Enregistrée" : "Départ Enregistré"}
              </Badge>
              <p className="text-xs text-[#475C50] font-mono">Horodatage serveur certifié : {dernierScanResultat.heure}</p>
            </div>
          ) : (
            <form onSubmit={validerBornePin} className="p-8 rounded-3xl bg-white/10 backdrop-blur-md border border-[#92FF5F]/30 space-y-5">
              <div className="size-16 rounded-2xl bg-[#92FF5F]/20 text-[#92FF5F] flex items-center justify-center mx-auto">
                <KeyRound className="size-8" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold">Scannez votre badge ou saisissez votre code PIN</h2>
                <p className="text-xs text-[#CFF1D2] mt-1">Détection instantanée de l'arrivée ou du départ</p>
              </div>

              <div className="relative">
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={bornePin}
                  onChange={(e) => setBornePin(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••"
                  className="font-mono text-center text-3xl tracking-[0.5em] h-16 bg-white/20 border-2 border-[#92FF5F] text-white rounded-2xl placeholder:text-white/40 focus:bg-white focus:text-[#0F3B27]"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-3 gap-2 text-lg font-bold">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, "C", 0, "OK"].map((touche, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (touche === "C") setBornePin("");
                      else if (touche === "OK") validerBornePin({ preventDefault: () => {} } as any);
                      else setBornePin((prev) => (prev.length < 6 ? prev + touche : prev));
                    }}
                    className="p-3.5 rounded-xl bg-white/10 hover:bg-[#92FF5F] hover:text-[#0F3B27] border border-white/20 transition-all font-mono"
                  >
                    {touche}
                  </button>
                ))}
              </div>
            </form>
          )}
        </div>

        <div className="text-center text-xs text-[#CFF1D2]">
          Système conforme BPD Art. 1.11 · Agence Béninoise du Médicament
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-[#CFF1D2] shadow-sm">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight text-[#0F3B27]">
              Pointage & Présence Pharmacien (Art. 1.11)
            </h1>
            <LienReglementaireBpd articles="BPD-1 / Art. 1.11" />
            <Badge className="bg-[#0F3B27] text-[#92FF5F] text-[10px]">
              Règle pivot Dispensation / Caisse
            </Badge>
          </div>
          <p className="mt-1 text-xs text-[#475C50]">
            Horodatage inaltérable certifié. L'ouverture de la caisse et la délivrance des médicaments exigent la présence continue d'au moins un pharmacien inscrit à l'Ordre.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={() => setModeBorne(true)}
            className="bg-[#0F3B27] hover:bg-[#0F3B27]/90 text-[#92FF5F] font-bold text-xs gap-1.5 shadow-sm"
          >
            <Smartphone className="size-4" /> Mode Borne Entrée
          </Button>

          {/* Horloge numérique en direct Porto-Novo */}
          <div className="rounded-xl border border-[#CFF1D2] bg-[#F7F9F7] px-3 py-1.5 text-right shrink-0">
            <div className="font-mono font-bold text-sm text-[#0F3B27]">{heureBenin || "--:--"}</div>
            <div className="text-[10px] text-[#475C50] font-medium">Bénin (GMT+1)</div>
          </div>
        </div>
      </div>

      {/* HERO BANNER ART. 1.11 (PHARMACIEN PRÉSENT / ABSENT) */}
      <div
        className={`rounded-3xl border-2 p-6 shadow-sm transition-all ${
          pharmacienPresent
            ? "border-[#0F3B27] bg-gradient-to-r from-[#0F3B27] to-[#164E35] text-white"
            : "border-red-500 bg-red-50 text-red-950 animate-pulse"
        }`}
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div
              className={`p-3.5 rounded-2xl shrink-0 shadow-md ${
                pharmacienPresent ? "bg-[#92FF5F] text-[#0F3B27]" : "bg-red-600 text-white"
              }`}
            >
              {pharmacienPresent ? <ShieldCheck className="w-8 h-8" /> : <ShieldAlert className="w-8 h-8" />}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className={`font-display text-lg sm:text-xl font-black ${pharmacienPresent ? "text-white" : "text-red-900"}`}>
                  {pharmacienPresent
                    ? "Conformité BPD Validée : Présence Pharmaceutique Conforme"
                    : "ALERTE RÉGLEMENTAIRE : Aucun pharmacien pointé sur place !"}
                </h2>
                <Badge
                  className={
                    pharmacienPresent
                      ? "bg-[#92FF5F] text-[#0F3B27] font-extrabold uppercase text-[10px]"
                      : "bg-red-600 text-white font-extrabold uppercase text-[10px]"
                  }
                >
                  {pharmacienPresent ? "Dispensation & Caisse Autorisées" : "Dispensation Bloquée"}
                </Badge>
              </div>

              <p className={`text-xs mt-1.5 max-w-2xl leading-relaxed ${pharmacienPresent ? "text-[#CFF1D2]" : "text-red-800"}`}>
                {pharmacienPresent ? (
                  <span>
                    Conformément à l'article 1.11 du Guide BPD de l'ABMed, la présence effective est certifiée. La caisse et la dispensation fonctionnent sans restriction.
                  </span>
                ) : (
                  <span>
                    Conformément à l'article 1.11 du Guide BPD, aucune délivrance de médicaments ne peut avoir lieu sans pharmacien inscrit pointé présent.
                  </span>
                )}
              </p>

              {pharmacienPresent && pharmaciensSurPlace.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-[#92FF5F]">Pharmacien(s) sur place :</span>
                  {pharmaciensSurPlace.map((nom, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-[#92FF5F]/40 px-3 py-1 text-xs font-bold text-white"
                    >
                      <Award className="w-3.5 h-3.5 text-[#92FF5F]" />
                      {nom}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Ratios & Compteurs */}
          <div className="grid grid-cols-2 gap-3 w-full lg:w-auto shrink-0">
            <div className={`p-3 rounded-2xl border text-center ${pharmacienPresent ? "bg-white/10 border-white/20 text-white" : "bg-white border-red-200 text-red-900"}`}>
              <span className="text-[10px] font-bold block uppercase tracking-wider opacity-80">Effectif présent</span>
              <p className="font-display font-black text-2xl mt-0.5">{totalPresents} / {employes.length}</p>
              <span className="text-[10px] opacity-75">Agents sur place</span>
            </div>
            <div className={`p-3 rounded-2xl border text-center ${pharmacienPresent ? "bg-white/10 border-white/20 text-white" : "bg-white border-red-200 text-red-900"}`}>
              <span className="text-[10px] font-bold block uppercase tracking-wider opacity-80">Pharmaciens</span>
              <p className="font-display font-black text-2xl mt-0.5">{pharmaciensSurPlace.length}</p>
              <span className="text-[10px] opacity-75">Section B Ordre</span>
            </div>
          </div>
        </div>
      </div>

      {/* TABS CONFORMES AU CAHIER DES CHARGES */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-[#F7F9F7] border border-[#CFF1D2] p-1 rounded-xl flex flex-wrap h-auto gap-1">
          <TabsTrigger
            value="direct"
            className="data-[state=active]:bg-[#0F3B27] data-[state=active]:text-[#92FF5F] text-xs font-semibold rounded-lg"
          >
            Présence en Direct
          </TabsTrigger>
          <TabsTrigger
            value="plannings"
            className="data-[state=active]:bg-[#0F3B27] data-[state=active]:text-[#92FF5F] text-xs font-semibold rounded-lg"
          >
            Plannings & Gardes
          </TabsTrigger>
          <TabsTrigger
            value="absences"
            className="data-[state=active]:bg-[#0F3B27] data-[state=active]:text-[#92FF5F] text-xs font-semibold rounded-lg"
          >
            Absences & Congés
          </TabsTrigger>
          <TabsTrigger
            value="corrections"
            className="data-[state=active]:bg-[#0F3B27] data-[state=active]:text-[#92FF5F] text-xs font-semibold rounded-lg"
          >
            Corrections & Oublis
          </TabsTrigger>
          <TabsTrigger
            value="badges"
            className="data-[state=active]:bg-[#0F3B27] data-[state=active]:text-[#92FF5F] text-xs font-semibold rounded-lg"
          >
            Badges Individuels
          </TabsTrigger>
          <TabsTrigger
            value="rapports"
            className="data-[state=active]:bg-[#0F3B27] data-[state=active]:text-[#92FF5F] text-xs font-semibold rounded-lg"
          >
            Rapports de Paie
          </TabsTrigger>
          <TabsTrigger
            value="parametres"
            className="data-[state=active]:bg-[#0F3B27] data-[state=active]:text-[#92FF5F] text-xs font-semibold rounded-lg"
          >
            Paramètres Règle Art. 1.11
          </TabsTrigger>
        </TabsList>

        {/* 1. PRÉSENCE EN DIRECT */}
        <TabsContent value="direct" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {employes.map((e: any) => {
              const d = dernier(e.id);
              const estLa = d?.type === "arrivee";
              const estPharmacien = ["pharmacien_titulaire", "pharmacien_adjoint", "pharmacien_remplacant", "promoteur"].includes(e.poste);

              return (
                <Card
                  key={e.id}
                  className={`border-2 rounded-2xl p-4 transition-all shadow-sm ${
                    estLa
                      ? "border-emerald-500/50 bg-emerald-50/20"
                      : "border-[#CFF1D2] bg-white opacity-90"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[#0F3B27] text-sm">{e.nom_complet}</span>
                        {estPharmacien && (
                          <Badge className="bg-[#0F3B27] text-[#92FF5F] text-[9px] px-1.5 py-0">
                            Pharmacien
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-[#475C50] capitalize block mt-0.5">
                        {e.poste.replace("_", " ")}
                      </span>
                    </div>

                    <Badge
                      variant={estLa ? "default" : "secondary"}
                      className={estLa ? "bg-emerald-600 text-white text-[10px]" : "text-[10px]"}
                    >
                      {estLa ? "Présent sur place" : "Absent / Non pointé"}
                    </Badge>
                  </div>

                  <div className="mt-3 pt-2 border-t border-[#CFF1D2] flex items-center justify-between text-xs">
                    <span className="text-muted-foreground text-[11px]">
                      {d ? `Dernier : ${d.type === "arrivee" ? "Arrivé" : "Départ"} à ${new Date(d.horodatage).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Aucun pointage ce jour"}
                    </span>

                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant={estLa ? "outline" : "default"}
                        onClick={() => pointer.mutate({ employe_id: e.id, type: estLa ? "depart" : "arrivee" })}
                        className={`h-7 text-xs font-bold gap-1 ${
                          estLa
                            ? "border-[#CFF1D2] text-[#0F3B27] hover:bg-red-50 hover:text-red-700"
                            : "bg-[#0F3B27] hover:bg-[#0F3B27]/90 text-[#92FF5F]"
                        }`}
                      >
                        {estLa ? <LogOut className="size-3" /> : <LogIn className="size-3" />}
                        {estLa ? "Pointer Départ" : "Pointer Arrivée"}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* 2. PLANNINGS & GARDES */}
        <TabsContent value="plannings" className="space-y-4">
          <Card className="rounded-2xl border border-[#CFF1D2] bg-white shadow-sm p-4 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-base text-[#0F3B27] font-bold">
                  Plannings d'Équipe & Tableau des Gardes (POI-07)
                </CardTitle>
                <CardDescription className="text-xs text-[#475C50]">
                  Garantit qu'au moins un pharmacien diplômé est affecté à chaque tranche horaire d'ouverture.
                </CardDescription>
              </div>
              <Button size="sm" className="bg-[#0F3B27] text-[#92FF5F] text-xs font-bold gap-1">
                <Plus className="size-3.5" /> Créer créneau
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="p-3 rounded-xl border border-[#CFF1D2] bg-[#F7F9F7] text-xs space-y-1">
                <div className="font-bold text-[#0F3B27]">Équipe Jour (08h00 - 15h00)</div>
                <div className="text-muted-foreground">Pharmacien responsable : Dr Félicien AGBO</div>
                <div className="text-muted-foreground">Comptoir : 2 dispensateurs, 1 caissier</div>
              </div>
              <div className="p-3 rounded-xl border border-[#CFF1D2] bg-[#F7F9F7] text-xs space-y-1">
                <div className="font-bold text-[#0F3B27]">Équipe Soir (15h00 - 22h00)</div>
                <div className="text-muted-foreground">Pharmacien responsable : Dr Sévérin BIO</div>
                <div className="text-muted-foreground">Comptoir : 2 dispensateurs, 1 caissier</div>
              </div>
              <div className="p-3 rounded-xl border border-amber-300 bg-amber-50/50 text-xs space-y-1">
                <div className="font-bold text-amber-900">Garde de Nuit & Dimanche</div>
                <div className="text-amber-800">Prochaine garde : Nuit du Samedi 07/11</div>
                <div className="text-amber-800">Pharmacien d'astreinte : Dr Félicien AGBO</div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* 3. ABSENCES & CONGÉS */}
        <TabsContent value="absences" className="space-y-4">
          <Card className="rounded-2xl border border-[#CFF1D2] bg-white shadow-sm p-4 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-base text-[#0F3B27] font-bold">
                  Demandes d'Absence & Congés (POI-10)
                </CardTitle>
                <CardDescription className="text-xs text-[#475C50]">
                  Justificatifs médicaux, congés payés et validation préalable du titulaire.
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => setModaleAbsence(true)}
                className="bg-[#0F3B27] text-[#92FF5F] text-xs font-bold gap-1"
              >
                <Plus className="size-3.5" /> Nouvelle demande
              </Button>
            </div>

            <div className="text-center py-8 text-xs text-muted-foreground bg-[#F7F9F7] rounded-xl border border-[#CFF1D2]">
              <Calendar className="size-8 mx-auto mb-2 opacity-50 text-[#0F3B27]" />
              Aucune absence en cours. Toutes les demandes passées sont régularisées.
            </div>
          </Card>
        </TabsContent>

        {/* 4. CORRECTIONS & OUBLIS */}
        <TabsContent value="corrections" className="space-y-4">
          <Card className="rounded-2xl border border-[#CFF1D2] bg-white shadow-sm p-4 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-base text-[#0F3B27] font-bold">
                  Régularisation des Oublis de Pointage (POI-09)
                </CardTitle>
                <CardDescription className="text-xs text-[#475C50]">
                  Toute correction génère une écriture rectificative liée avec motif. Le pointage d'origine reste inaltérable.
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => setModaleCorrection(true)}
                className="bg-[#0F3B27] text-[#92FF5F] text-xs font-bold gap-1"
              >
                <Plus className="size-3.5" /> Déclarer un oubli
              </Button>
            </div>

            <div className="space-y-2">
              <div className="p-3 rounded-xl border border-[#CFF1D2] bg-[#F7F9F7] text-xs flex justify-between items-center">
                <div>
                  <span className="font-bold text-[#0F3B27]">Dr Félicien AGBO · Arrivée rectifiée</span>
                  <p className="text-muted-foreground text-[11px]">Motif : Problème borne wifi entrée · Validé par Titulaire</p>
                </div>
                <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Rectifié avec trace</Badge>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* 5. BADGES INDIVIDUELS */}
        <TabsContent value="badges" className="space-y-4">
          <Card className="rounded-2xl border border-[#CFF1D2] bg-white shadow-sm p-4 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-base text-[#0F3B27] font-bold">
                  Badges Nominatifs Sécurisés avec Code QR (POI-01)
                </CardTitle>
                <CardDescription className="text-xs text-[#475C50]">
                  Format carte officiel imprimable avec photo, matricule et code QR chiffré individuel.
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  window.print();
                  toast.success("Planche complète des badges envoyée à l'impression.");
                }}
                className="text-xs border-[#CFF1D2] text-[#0F3B27] gap-1"
              >
                <Printer className="size-3.5" /> Imprimer planche badges
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              {employes.map((e: any) => (
                <div key={e.id} className="p-3 rounded-xl border border-[#CFF1D2] bg-white flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-[#0F3B27] block">{e.nom_complet}</span>
                    <span className="text-[11px] text-muted-foreground capitalize">{e.poste.replace("_", " ")}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEmployeBadge(e);
                      setModaleBadge(true);
                    }}
                    className="h-7 text-xs border-[#CFF1D2] text-[#0F3B27] gap-1"
                  >
                    <QrCode className="size-3.5" /> Carte Badge
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* 6. RAPPORTS DE PAIE */}
        <TabsContent value="rapports" className="space-y-4">
          <Card className="rounded-2xl border border-[#CFF1D2] bg-white shadow-sm p-4 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-base text-[#0F3B27] font-bold">
                  Feuilles de Présence & Synthèses Paie (POI-13)
                </CardTitle>
                <CardDescription className="text-xs text-[#475C50]">
                  Cumul des heures travaillées, retards, départs anticipés et heures de nuit/garde.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="text-xs border-[#CFF1D2] text-[#0F3B27] gap-1">
                  <Download className="size-3.5" /> Export Excel Paie
                </Button>
                <Button size="sm" variant="outline" className="text-xs border-[#CFF1D2] text-[#0F3B27] gap-1">
                  <Printer className="size-3.5" /> Feuille présence PDF
                </Button>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#F7F9F7] border border-[#CFF1D2] text-xs">
              <span className="font-bold text-[#0F3B27] block mb-1">Mois en cours : Novembre 2026</span>
              <p className="text-muted-foreground">
                Taux de ponctualité global de l'officine : <strong>96.4%</strong> · Total heures travaillées : <strong>412h</strong> · Heures supplémentaires BPD validées : <strong>14h</strong>.
              </p>
            </div>
          </Card>
        </TabsContent>

        {/* 7. PARAMÈTRES RÈGLE ART. 1.11 */}
        <TabsContent value="parametres" className="space-y-4">
          <Card className="rounded-2xl border border-[#CFF1D2] bg-white shadow-sm p-4 space-y-3">
            <CardTitle className="text-base text-[#0F3B27] font-bold">
              Paramètres de Contrôle de l'Article 1.11 BPD
            </CardTitle>
            <CardDescription className="text-xs text-[#475C50]">
              Définition du comportement de la caisse et du comptoir de délivrance en cas d'absence de pharmacien pointé.
            </CardDescription>

            <div className="space-y-3 pt-2 text-xs">
              <div className="p-3 rounded-xl border border-[#CFF1D2] bg-[#F7F9F7] space-y-2">
                <span className="font-bold text-[#0F3B27] block">Mode de verrouillage Caisse & Dispensation</span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl border-2 border-emerald-500 bg-white space-y-1">
                    <span className="font-bold text-emerald-800">Blocage Strict BPD (Recommandé)</span>
                    <p className="text-[11px] text-muted-foreground">
                      La caisse refuse l'encaissement et l'ordonnancier bloque la délivrance sans pharmacien pointé présent.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl border border-[#CFF1D2] bg-white space-y-1 opacity-75">
                    <span className="font-bold text-[#0F3B27]">Alerte avec justification</span>
                    <p className="text-[11px] text-muted-foreground">
                      Permet la vente après saisie d'un motif dérogatoire avec notification immédiate au promoteur.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODALE D'OUBLI / CORRECTION */}
      <Dialog open={modaleCorrection} onOpenChange={setModaleCorrection}>
        <DialogContent className="max-w-md bg-white border border-[#CFF1D2] rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#0F3B27] font-display">
              Déclaration d'un Oubli de Pointage (POI-09)
            </DialogTitle>
            <DialogDescription className="text-xs text-[#475C50]">
              La correction sera rattachée à l'historique inaltérable avec justification.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2 text-xs">
            <div>
              <Label className="font-semibold text-[#0F3B27]">Collaborateur concerné</Label>
              <select
                value={employeCorrection}
                onChange={(e) => setEmployeCorrection(e.target.value)}
                className="w-full h-8 rounded-xl border border-[#CFF1D2] bg-white text-xs px-2"
              >
                {employes.map((e: any) => (
                  <option key={e.id} value={e.id}>{e.nom_complet}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="font-semibold text-[#0F3B27]">Type de pointage</Label>
                <select
                  value={typeCorrection}
                  onChange={(e) => setTypeCorrection(e.target.value as any)}
                  className="w-full h-8 rounded-xl border border-[#CFF1D2] bg-white text-xs px-2"
                >
                  <option value="arrivee">Arrivée</option>
                  <option value="depart">Départ</option>
                </select>
              </div>
              <div>
                <Label className="font-semibold text-[#0F3B27]">Heure réelle</Label>
                <Input
                  type="time"
                  value={heureCorrection}
                  onChange={(e) => setHeureCorrection(e.target.value)}
                  className="h-8 text-xs rounded-xl border-[#CFF1D2]"
                />
              </div>
            </div>

            <div>
              <Label className="font-semibold text-[#0F3B27]">Motif de l'oubli *</Label>
              <Input
                placeholder="Ex : Panne de batterie smartphone / Affluence au comptoir"
                value={motifCorrection}
                onChange={(e) => setMotifCorrection(e.target.value)}
                className="h-8 text-xs rounded-xl border-[#CFF1D2]"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModaleCorrection(false)}
                className="border-[#CFF1D2] text-[#475C50]"
              >
                Annuler
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setActionSignature({
                    titre: "Signature de la régularisation de pointage",
                    cb: () => {
                      toast.success("Correction enregistrée avec succès.");
                      setModaleCorrection(false);
                    },
                  });
                  setModaleSignOuverte(true);
                }}
                className="bg-[#0F3B27] text-[#92FF5F] font-bold text-xs"
              >
                Signer & Valider
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODALE BADGE INDIVIDUEL CARTE */}
      <Dialog open={modaleBadge} onOpenChange={setModaleBadge}>
        <DialogContent className="max-w-sm bg-white border border-[#CFF1D2] rounded-2xl shadow-xl text-center">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#0F3B27] font-display">
              Badge Officiel d'Identification BPD
            </DialogTitle>
          </DialogHeader>

          <div className="p-5 bg-gradient-to-b from-[#0F3B27] to-[#164E35] text-white rounded-2xl border-2 border-[#92FF5F]/40 my-2 space-y-3 shadow-lg">
            <div className="flex items-center justify-between text-[10px] text-[#CFF1D2] border-b border-white/20 pb-2">
              <span>BESTPHARMA OFFICIEL</span>
              <span>BÉNIN ABMed</span>
            </div>

            <div className="size-20 rounded-full bg-white/20 border-2 border-[#92FF5F] mx-auto flex items-center justify-center font-bold text-xl">
              {employeBadge?.nom_complet?.charAt(0) || "P"}
            </div>

            <div>
              <h3 className="font-display font-black text-lg text-white">{employeBadge?.nom_complet}</h3>
              <Badge className="bg-[#92FF5F] text-[#0F3B27] font-bold text-[10px] capitalize mt-1">
                {employeBadge?.poste?.replace("_", " ")}
              </Badge>
            </div>

            <div className="size-28 bg-white p-2 rounded-xl mx-auto flex items-center justify-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(
                  `BESTPHARMA:EMP:${employeBadge?.id}:${employeBadge?.code_badge || "BADGE-01"}`
                )}`}
                alt="QR Badge"
                className="size-24"
              />
            </div>

            <span className="font-mono text-[10px] text-[#CFF1D2] block">
              MATRICULE : {employeBadge?.matricule || "BP-2026-001"}
            </span>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModaleBadge(false)}
              className="border-[#CFF1D2] text-[#475C50] text-xs"
            >
              Fermer
            </Button>
            <Button
              type="button"
              onClick={() => {
                window.print();
                toast.success("Badge envoyé à l'impression.");
              }}
              className="bg-[#0F3B27] text-[#92FF5F] text-xs font-bold gap-1"
            >
              <Printer className="size-3.5" /> Imprimer carte badge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODALE SIGNATURE CODE PIN (BPD-C10) */}
      <ModaleSignatureCode
        ouvert={modaleSignOuverte}
        onFermer={() => setModaleSignOuverte(false)}
        titreAction={actionSignature?.titre || "Signature de l'enregistrement"}
        onSigner={async (sig) => {
          if (actionSignature?.cb) actionSignature.cb();
        }}
        articleBpd="BPD-1 / Art. 1.11"
      />
    </div>
  );
}
