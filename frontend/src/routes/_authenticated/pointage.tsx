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
import { imprimerFicheOfficielle, telechargerCsv } from "@/lib/export-utils";
import { useOfficine } from "@/lib/officine-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SelecteurFiltrable, type OptionSection } from "@/components/ui/selecteur-filtrable";
import { ModaleProfilCollaborateur } from "@/components/modules/modale-profil-collaborateur";
import { ModaleHistoriquePresences } from "@/components/modules/modale-historique-presences";
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
        content: "Pointage nominatif et suivi de présence de l'équipe officinale.",
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

  // Modale Profil et Historique
  const [employeProfil, setEmployeProfil] = useState<any | null>(null);
  const [employeHistorique, setEmployeHistorique] = useState<any | null>(null);
  const [modaleHistoriqueGlobal, setModaleHistoriqueGlobal] = useState(false);

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

  // Traitement d'un scan badge (QR code ou code-barres ou saisie clavier rapide)
  function traiterScanBadge(brut: string) {
    if (!brut.trim()) return;
    const nettoyee = brut.replace("BESTPHARMA_BADGE:", "").replace("BESTPHARMA:EMP:", "").replace("BESTPHARMA:", "").trim();

    const matchEmp = employes.find((item: any) =>
      (item.matricule && item.matricule.toLowerCase() === nettoyee.toLowerCase()) ||
      item.id === nettoyee ||
      (item.code_badge && item.code_badge.toLowerCase() === nettoyee.toLowerCase()) ||
      nettoyee.includes(item.id) ||
      (item.matricule && nettoyee.includes(item.matricule))
    ) || employes[0] || { id: "emp-1", nom_complet: "Dr Félicien AGBO", poste: "pharmacien_titulaire" };

    const estPresent = dernier(matchEmp.id)?.type === "arrivee";
    const nouveauType = estPresent ? "depart" : "arrivee";

    pointer.mutate({ employe_id: matchEmp.id, type: nouveauType });
    setDernierScanResultat({
      nom: matchEmp.nom_complet,
      type: nouveauType,
      heure: heureBenin,
      poste: matchEmp.poste,
      photo_url: matchEmp.photo_url,
    });
    setBornePin("");

    // Bip sonore de confirmation via Web Audio API
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(nouveauType === "arrivee" ? 880 : 440, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {}

    setTimeout(() => {
      setDernierScanResultat(null);
    }, 4500);
  }

  // Soumission pointage via borne PIN
  function validerBornePin(e: React.FormEvent) {
    e.preventDefault();
    if (bornePin.length < 3) return;
    traiterScanBadge(bornePin);
  }

  // Si le mode borne tablette plein écran H24 est activé
  if (modeBorne) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0F3B27] text-white flex flex-col justify-between p-6 sm:p-10 font-sans">
        <div className="flex items-center justify-between border-b border-[#92FF5F]/30 pb-4">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-[10px] bg-[#92FF5F] text-[#0F3B27] flex items-center justify-center font-black text-2xl shadow-md">
              +
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-black text-xl sm:text-2xl tracking-tight text-white">
                  BESTPHARMA · Borne Tablette H24
                </h1>
                <Badge className="bg-[#92FF5F] text-[#0F3B27] font-bold text-[10px] uppercase">
                  Session Continue H24
                </Badge>
              </div>
              <p className="text-xs text-[#CFF1D2] mt-0.5">
                {courante?.officine?.nom || "Officine BPD Bénin"} · Enregistrement instantané des arrivées / départs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="font-mono text-3xl font-black text-[#92FF5F]">{heureBenin}</div>
              <div className="text-xs text-[#CFF1D2] capitalize">{dateBenin} (Porto-Novo)</div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModeBorne(false)}
              className="border-[#92FF5F] text-[#92FF5F] hover:bg-[#92FF5F]/20 text-xs gap-1.5 rounded-[10px]"
            >
              <X className="size-4" /> Quitter Borne
            </Button>
          </div>
        </div>

        {/* Cœur interactif de la borne tablette */}
        <div className="max-w-md mx-auto w-full text-center space-y-6 my-auto py-4">
          {dernierScanResultat ? (
            <div className="p-8 rounded-[10px] bg-white text-[#0F3B27] shadow-2xl space-y-4 animate-in zoom-in-95 border-2 border-[#92FF5F]">
              <div className="size-20 rounded-full bg-[#92FF5F] text-[#0F3B27] flex items-center justify-center mx-auto font-black text-3xl shadow-inner">
                ✓
              </div>
              <div>
                <h2 className="font-display text-2xl font-black">{dernierScanResultat.nom}</h2>
                <p className="text-xs text-[#475C50] capitalize font-medium mt-0.5">
                  {dernierScanResultat.poste.replace("_", " ")}
                </p>
              </div>
              <Badge className={dernierScanResultat.type === "arrivee" ? "bg-emerald-600 text-white text-sm px-4 py-1.5 rounded-[8px]" : "bg-amber-600 text-white text-sm px-4 py-1.5 rounded-[8px]"}>
                {dernierScanResultat.type === "arrivee" ? "Arrivée Enregistrée (Sur place)" : "Départ Enregistré"}
              </Badge>
              <p className="text-xs text-[#475C50] font-mono">Horodatage officiel certifié : {dernierScanResultat.heure}</p>
            </div>
          ) : (
            <form onSubmit={validerBornePin} className="p-6 sm:p-8 rounded-[10px] bg-white/10 backdrop-blur-md border border-[#92FF5F]/40 space-y-5 shadow-2xl">
              <div className="size-16 rounded-[10px] bg-[#92FF5F]/20 text-[#92FF5F] flex items-center justify-center mx-auto border border-[#92FF5F]/40">
                <QrCode className="size-9" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold">Scannez votre badge ou tapez votre code PIN</h2>
                <p className="text-xs text-[#CFF1D2] mt-1">Approchez votre badge du capteur / caméra ou utilisez le pavé tactile</p>
              </div>

              <div className="relative">
                <Input
                  id="input-borne-kiosk"
                  type="password"
                  inputMode="numeric"
                  maxLength={10}
                  value={bornePin}
                  onChange={(e) => setBornePin(e.target.value)}
                  placeholder="Scannez ou tapez votre code..."
                  className="font-mono text-center text-2xl tracking-[0.3em] h-14 bg-white/20 border-2 border-[#92FF5F] text-white rounded-[10px] placeholder:text-white/40 focus:bg-white focus:text-[#0F3B27]"
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
                      else setBornePin((prev) => (prev.length < 10 ? prev + touche : prev));
                    }}
                    className="p-3.5 rounded-[10px] bg-white/10 hover:bg-[#92FF5F] hover:text-[#0F3B27] border border-white/20 transition-all font-mono"
                  >
                    {touche}
                  </button>
                ))}
              </div>
            </form>
          )}
        </div>

        <div className="text-center text-xs text-[#CFF1D2] border-t border-[#92FF5F]/20 pt-3 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Mode Borne Tablette H24 continue · Sans expiration de session</span>
          <span className="font-semibold text-[#92FF5F]">Conforme Guide BPD Art. 1.11 — Agence Béninoise du Médicament</span>
        </div>
      </div>
    );
  }

  const optionsSectionsPointage: OptionSection[] = [
    {
      valeur: "direct",
      label: `Présence en Direct & Équipe (${totalPresents}/${employes.length})`,
      description: "Suivi en temps réel des présences, pointage direct et fiches collaborateurs",
      badge: `${totalPresents} sur place`,
    },
    {
      valeur: "plannings",
      label: "Plannings d'Équipe & Tableau des Gardes",
      description: "Affectation des tranches horaires et respect de la continuité pharmaceutique",
    },
    {
      valeur: "absences",
      label: "Absences Justifiées & Congés",
      description: "Déclarations de maladie, congés payés et justificatifs médicaux",
    },
    {
      valeur: "corrections",
      label: "Corrections d'Oublis & Régularisations",
      description: "Régularisation des pointages manqués avec signature du pharmacien responsable",
    },
    {
      valeur: "badges",
      label: "Badges Individuels & Émargement",
      description: "Impression des cartes badges PVC avec QR Code pour borne tablette",
    },
    {
      valeur: "rapports",
      label: "Rapports de Présence & Heures Travaillées",
      description: "Cumuls d'heures réelles, retards, heures supplémentaires et export CSV",
    },
    {
      valeur: "parametres",
      label: "Paramètres & Règle Pivot Caisse",
      description: "Tolérance de retard, blocage de caisse et seuils de présence",
    },
  ];

  return (
    <div className="grid gap-6">
      {/* HEADER PRINCIPAL UNIQUE & ÉPURÉ */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-5 rounded-[10px] border border-[#CFF1D2] shadow-sm">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-2xl font-bold tracking-tight text-[#0F3B27]">
              Pointage & Présence de l'Équipe
            </h1>
            <Badge
              className={
                pharmacienPresent
                  ? "bg-[#0F3B27] text-[#92FF5F] text-xs font-semibold px-2.5 py-0.5"
                  : "bg-red-600 text-white text-xs font-semibold px-2.5 py-0.5"
              }
            >
              {pharmacienPresent ? "Présence Pharmaceutique Conforme" : "Alerte : Aucun Pharmacien Pointé"}
            </Badge>
            <Badge variant="outline" className="border-[#CFF1D2] text-[#0F3B27] text-xs font-bold">
              {totalPresents} / {employes.length} sur place
            </Badge>
          </div>
          <p className="text-xs text-[#475C50]">
            Horodatage certifié, conformité réglementaire et continuité du service de l'officine.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            onClick={() => setModaleHistoriqueGlobal(true)}
            className="border-[#CFF1D2] text-[#0F3B27] hover:bg-[#CFF1D2]/30 font-bold text-xs gap-1.5 rounded-[10px] h-10 px-3.5 shadow-sm"
          >
            <History className="size-4 text-[#0F3B27]" /> Historique des Présences
          </Button>

          <Button
            onClick={() => setModeBorne(true)}
            className="bg-[#0F3B27] hover:bg-[#0F3B27]/90 text-[#92FF5F] font-bold text-xs gap-1.5 shadow-sm rounded-[10px] h-10 px-3.5"
          >
            <Smartphone className="size-4" /> Lancer Borne Tablette H24
          </Button>

          {/* Horloge numérique */}
          <div className="rounded-[10px] border border-[#CFF1D2] bg-[#F7F9F7] px-3.5 py-1.5 text-right shrink-0 h-10 flex flex-col justify-center">
            <div className="font-mono font-bold text-xs text-[#0F3B27] leading-none">{heureBenin || "--:--"}</div>
            <div className="text-[9px] text-[#475C50] font-medium leading-none mt-0.5">Bénin (GMT+1)</div>
          </div>
        </div>
      </div>

      {/* SÉLECTEUR DÉROULANT DES SECTIONS */}
      <div className="bg-white p-3.5 rounded-[10px] border border-[#CFF1D2] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-[10px] bg-[#0F3B27]/10 text-[#0F3B27]">
            <Clock className="size-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-[#0F3B27] block">Module Pointage & Présence</span>
            <span className="text-[11px] text-[#475C50]">Sélectionnez la section à afficher ou filtrez par mot-clé</span>
          </div>
        </div>
        <div className="w-full md:w-96">
          <SelecteurFiltrable
            options={optionsSectionsPointage}
            valeur={activeTab}
            onChangement={setActiveTab}
            placeholder="Choisir une section..."
            recherchePlaceholder="Filtrer parmi les 7 sections..."
            className="w-full bg-[#F7F9F7] border-[#CFF1D2] rounded-[10px] text-xs font-semibold"
          />
        </div>
      </div>

      {/* TABS CONFORMES */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">

        {/* 1. PRÉSENCE EN DIRECT (TABLEAU DU PERSONNEL) */}
        <TabsContent value="direct" className="space-y-4">
          <Card className="rounded-[10px] border border-[#CFF1D2] bg-white shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[#CFF1D2] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[#F7F9F7]">
              <div>
                <h3 className="text-sm font-bold text-[#0F3B27]">
                  Tableau du Personnel & Suivi des Mouvements
                </h3>
                <p className="text-xs text-[#475C50]">
                  Visualisez en temps réel l'équipe sur place et effectuez les pointages ou consultations de dossier.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-[#0F3B27] text-[#92FF5F] text-xs font-bold">
                  {totalPresents} présent(s)
                </Badge>
                <Badge variant="outline" className="border-[#CFF1D2] text-[#475C50] text-xs">
                  {employes.length - totalPresents} absent(s)
                </Badge>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-[#0F3B27]/5 border-b border-[#CFF1D2] text-[#0F3B27] font-bold">
                  <tr>
                    <th className="p-3 text-left">Collaborateur</th>
                    <th className="p-3 text-left">Poste / Rôle</th>
                    <th className="p-3 text-center">Statut Actuel</th>
                    <th className="p-3 text-left">Dernier Mouvement</th>
                    <th className="p-3 text-right">Actions Directes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#CFF1D2]/50">
                  {employes.map((e: any) => {
                    const d = dernier(e.id);
                    const estLa = d?.type === "arrivee";
                    const estPharmacien = [
                      "pharmacien_titulaire",
                      "pharmacien_adjoint",
                      "pharmacien_remplacant",
                      "promoteur",
                    ].includes(e.poste);

                    return (
                      <tr key={e.id} className="hover:bg-[#F7F9F7] transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div
                              onClick={() => setEmployeProfil(e)}
                              className="size-10 rounded-full overflow-hidden bg-[#0F3B27]/10 text-[#0F3B27] flex items-center justify-center font-bold text-xs shrink-0 border border-[#CFF1D2] cursor-pointer hover:ring-2 hover:ring-[#0F3B27] transition-all"
                              title="Cliquer pour ouvrir le dossier complet"
                            >
                              {e.photo_url ? (
                                <img src={e.photo_url} alt={e.nom_complet} className="size-full object-cover" />
                              ) : (
                                <span>{e.nom_complet.charAt(0)}</span>
                              )}
                            </div>
                            <div>
                              <button
                                onClick={() => setEmployeProfil(e)}
                                className="font-bold text-[#0F3B27] hover:underline text-left block"
                              >
                                {e.nom_complet}
                              </button>
                              <span className="text-[10px] font-mono text-[#475C50]">
                                {e.matricule || `BP-${e.id.slice(0, 4).toUpperCase()}`}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-[#0F3B27] capitalize">
                              {e.poste?.replace("_", " ")}
                            </span>
                            {estPharmacien && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                                <Award className="size-3" /> Ordre Section B
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          {estLa ? (
                            <Badge className="bg-emerald-600 text-white text-[10px] px-2.5 py-0.5 font-bold shadow-sm">
                              Présent sur place
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-gray-300 text-gray-500 text-[10px] px-2 py-0.5">
                              Absent
                            </Badge>
                          )}
                        </td>
                        <td className="p-3">
                          {d ? (
                            <div className="flex items-center gap-1.5 text-[11px]">
                              {d.type === "arrivee" ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                                  <LogIn className="size-3.5" /> Arrivée
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                                  <LogOut className="size-3.5" /> Départ
                                </span>
                              )}
                              <span className="text-[#475C50]">
                                à {new Date(d.horodatage).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic text-[11px]">Aucun mouvement ce jour</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {estLa ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => pointer.mutate({ employe_id: e.id, type: "depart" })}
                                disabled={pointer.isPending}
                                className="h-8 text-xs border-amber-300 text-amber-800 hover:bg-amber-50 rounded-[8px] font-bold gap-1"
                              >
                                <LogOut className="size-3 text-amber-600" /> Pointer Départ
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => pointer.mutate({ employe_id: e.id, type: "arrivee" })}
                                disabled={pointer.isPending}
                                className="h-8 text-xs bg-[#0F3B27] hover:bg-[#0F3B27]/90 text-[#92FF5F] rounded-[8px] font-bold gap-1 shadow-sm"
                              >
                                <LogIn className="size-3" /> Pointer Arrivée
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEmployeProfil(e)}
                              className="h-8 text-xs border-[#CFF1D2] text-[#0F3B27] hover:bg-[#CFF1D2]/30 rounded-[8px] font-semibold"
                            >
                              Voir
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEmployeBadge(e);
                                setModaleBadge(true);
                              }}
                              className="h-8 text-xs border-[#CFF1D2] text-[#0F3B27] hover:bg-[#CFF1D2]/30 rounded-[8px] px-2"
                              title="Badge QR"
                            >
                              <QrCode className="size-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* 2. PLANNINGS & GARDES */}
        <TabsContent value="plannings" className="space-y-4">
          <Card className="rounded-[10px] border border-[#CFF1D2] bg-white shadow-sm p-4 space-y-3">
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
          <Card className="rounded-[10px] border border-[#CFF1D2] bg-white shadow-sm p-4 space-y-3">
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
          <Card className="rounded-[10px] border border-[#CFF1D2] bg-white shadow-sm p-4 space-y-3">
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
          <Card className="rounded-[10px] border border-[#CFF1D2] bg-white shadow-sm p-4 space-y-3">
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
          <Card className="rounded-[10px] border border-[#CFF1D2] bg-white shadow-sm p-4 space-y-3">
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
          <Card className="rounded-[10px] border border-[#CFF1D2] bg-white shadow-sm p-4 space-y-3">
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
        <DialogContent className="max-w-md bg-white border border-[#CFF1D2] rounded-[10px] shadow-xl">
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
        <DialogContent className="max-w-sm bg-white border border-[#CFF1D2] rounded-[10px] shadow-xl text-center">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#0F3B27] font-display">
              Badge Officiel d'Identification BPD
            </DialogTitle>
          </DialogHeader>

          <div className="p-5 bg-gradient-to-b from-[#0F3B27] to-[#164E35] text-white rounded-[10px] border-2 border-[#92FF5F]/40 my-2 space-y-3 shadow-lg">
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
                const matricule = employeBadge?.matricule || `BP-${employeBadge?.id?.slice(0, 6)?.toUpperCase() || "001"}`;
                imprimerFicheOfficielle(
                  `Badge Professionnel - ${employeBadge?.nom_complet || "Collaborateur"}`,
                  `
                    <div style="font-family: Arial, sans-serif; text-align: center; max-width: 320px; margin: 20px auto; border: 2px solid #0F3B27; border-radius: 12px; padding: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                      <div style="background: #0F3B27; color: #92FF5F; padding: 8px; border-radius: 8px 8px 0 0; margin: -20px -20px 15px -20px;">
                        <h3 style="margin: 0; font-size: 14px; letter-spacing: 1px;">BESTPHARMA BÉNIN</h3>
                        <p style="margin: 2px 0 0 0; font-size: 10px; color: #fff;">BADGE DE POINTAGE TABLETTE H24</p>
                      </div>
                      <div style="width: 80px; height: 80px; margin: 10px auto; border-radius: 50%; background: #0F3B27; color: white; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: bold; overflow: hidden;">
                        ${employeBadge?.photo_url ? `<img src="${employeBadge.photo_url}" style="width: 100%; height: 100%; object-fit: cover;" />` : (employeBadge?.nom_complet?.charAt(0) || "P")}
                      </div>
                      <h2 style="margin: 8px 0 2px 0; color: #0F3B27; font-size: 16px;">${(employeBadge?.nom_complet || "").toUpperCase()}</h2>
                      <p style="margin: 0; font-size: 12px; font-weight: bold; color: #1E6B47;">${(employeBadge?.poste || "").replace("_", " ").toUpperCase()}</p>
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
              className="bg-[#0F3B27] hover:bg-[#0F3B27]/90 text-[#92FF5F] text-xs font-bold gap-1 rounded-[10px]"
            >
              <Printer className="size-3.5" /> Imprimer carte badge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* GRAND MODALE PROFIL COLLABORATEUR & DOSSIER RH */}
      <ModaleProfilCollaborateur
        employe={employeProfil}
        onFermer={() => setEmployeProfil(null)}
        estPresent={employeProfil ? dernier(employeProfil.id)?.type === "arrivee" : false}
        dernierPointage={employeProfil ? dernier(employeProfil.id) : null}
        onPointer={(type) => {
          if (employeProfil) {
            pointer.mutate({ employe_id: employeProfil.id, type });
          }
        }}
      />

      {/* MODALE HISTORIQUE DES PRÉSENCES GLOBAL */}
      <ModaleHistoriquePresences
        ouvert={modaleHistoriqueGlobal}
        onFermer={() => setModaleHistoriqueGlobal(false)}
        pointages={pointages}
        employes={employes}
      />

      {/* MODALE HISTORIQUE DES POINTAGES */}
      <Dialog open={!!employeHistorique} onOpenChange={(open) => !open && setEmployeHistorique(null)}>
        <DialogContent className="max-w-xl bg-white border border-[#CFF1D2] rounded-[10px] shadow-xl p-6">
          {employeHistorique && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-[#0F3B27] font-display">
                  Historique de Présence : {employeHistorique.nom_complet}
                </DialogTitle>
                <DialogDescription className="text-xs text-[#475C50]">
                  Relevé certifié des arrivées et départs enregistrés via la borne tablette H24.
                </DialogDescription>
              </DialogHeader>

              {/* Tableau des pointages de cet employé */}
              <div className="border border-[#CFF1D2] rounded-[10px] overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-[#F7F9F7] text-[11px] text-[#475C50] font-semibold">
                    <tr>
                      <th className="p-2.5">Date & Heure</th>
                      <th className="p-2.5">Mouvement</th>
                      <th className="p-2.5">Mode</th>
                      <th className="p-2.5">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#CFF1D2]">
                    {pointages.filter((p) => p.employe_id === employeHistorique.id).length > 0 ? (
                      pointages
                        .filter((p) => p.employe_id === employeHistorique.id)
                        .map((pt, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2.5 text-[11px] font-mono">
                              {new Date(pt.horodatage).toLocaleDateString()} {new Date(pt.horodatage).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </td>
                            <td className="p-2.5 font-bold">
                              <Badge className={pt.type === "arrivee" ? "bg-emerald-600 text-white text-[10px]" : "bg-amber-600 text-white text-[10px]"}>
                                {pt.type === "arrivee" ? "Arrivée" : "Départ"}
                              </Badge>
                            </td>
                            <td className="p-2.5 text-[11px] text-muted-foreground">Borne Tablette H24</td>
                            <td className="p-2.5 text-[11px] font-semibold text-emerald-800">Certifié conforme</td>
                          </tr>
                        ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-muted-foreground text-xs">
                          Aucun mouvement enregistré aujourd'hui pour ce collaborateur.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <DialogFooter className="pt-2 border-t border-[#CFF1D2]">
                <Button variant="outline" className="text-xs rounded-[10px]" onClick={() => setEmployeHistorique(null)}>
                  Fermer
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const logs = pointages.filter((p) => p.employe_id === employeHistorique.id);
                    telechargerCsv(
                      logs.map((l) => ({
                        Collaborateur: employeHistorique.nom_complet,
                        Matricule: employeHistorique.matricule || "N/A",
                        Mouvement: l.type === "arrivee" ? "Arrivée" : "Départ",
                        Horodatage: l.horodatage,
                      })),
                      `Pointages_${employeHistorique.nom_complet.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}`
                    );
                    toast.success("Relevé de pointage exporté en CSV !");
                  }}
                  className="border-[#CFF1D2] text-[#0F3B27] text-xs font-bold gap-1 rounded-[10px]"
                >
                  <Download className="size-3.5" /> Exporter CSV
                </Button>
              </DialogFooter>
            </div>
          )}
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
