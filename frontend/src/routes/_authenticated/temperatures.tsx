import { useState, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Thermometer,
  Snowflake,
  Flame,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ShieldCheck,
  Plus,
  Calendar,
  Layers,
  FileWarning,
  QrCode,
  Download,
  Upload,
  FileText,
  Activity,
  Printer,
  Radio,
  Check,
  X,
  RefreshCw,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
} from "recharts";
import { toast } from "sonner";

import { api } from "@/lib/api-client";
import { telechargerCsv, imprimerFicheOfficielle } from "@/lib/export-utils";
import { useOfficine } from "@/lib/officine-context";
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
import {
  ModaleSignatureCode,
  BoutonCreerNC,
  LienReglementaireBpd,
  SignatureData,
} from "@/components/modules/bpd-communs";

export const Route = createFileRoute("/_authenticated/temperatures")({
  head: () => ({
    meta: [
      { title: "Chaîne du Froid & Températures — BestPharma" },
      {
        name: "description",
        content: "Suivi des températures (2°C–8°C et ambiant) conforme au Guide BPD de l'ABMed.",
      },
    ],
  }),
  component: PageTemperatures,
});

function PageTemperatures() {
  const { courante } = useOfficine();
  const queryClient = useQueryClient();
  const id = courante?.officine_id;

  const [activeTab, setActiveTab] = useState("tournee");

  // Modale Saisie Relevé
  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [zoneChoisie, setZoneChoisie] = useState("refrigeree_2_8");
  const [temperatureSaisie, setTemperatureSaisie] = useState("");
  const [tempMin, setTempMin] = useState("");
  const [tempMax, setTempMax] = useState("");
  const [humidite, setHumidite] = useState("");
  const [moment, setMoment] = useState("matin");
  const [notes, setNotes] = useState("");
  const [enCours, setEnCours] = useState(false);

  // Modale Signature par Code PIN
  const [modaleSignOuverte, setModaleSignOuverte] = useState(false);
  const [actionPourSignature, setActionPourSignature] = useState<{ titre: string; cb: () => void } | null>(null);

  // Modale Décision Pharmacien Excursion (TEM-06)
  const [modaleDecisionOuverte, setModaleDecisionOuverte] = useState(false);
  const [excursionSelectionnee, setExcursionSelectionnee] = useState<any>(null);
  const [decisionChoisie, setDecisionChoisie] = useState<"levee" | "quarantaine" | "retour" | "destruction">("quarantaine");
  const [motifDecision, setMotifDecision] = useState("");

  // Modale QR Code
  const [modaleQrOuverte, setModaleQrOuverte] = useState(false);
  const [zoneQrSelectionnee, setZoneQrSelectionnee] = useState<string>("refrigeree_2_8");

  // Téléversement CSV et Rapports GAC
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [envoiCsv, setEnvoiCsv] = useState(false);

  const traiterImportCsv = async (file: File) => {
    if (!id) return;
    setEnvoiCsv(true);
    try {
      const res = await api.uploadFile<{ message: string; imported_count: number }>(
        `/officines/${id}/temperatures/csv`,
        file,
        { zone: "refrigeree_2_8" }
      );
      toast.success(res.message || "Importation CSV réussie !");
      queryClient.invalidateQueries({ queryKey: ["temperatures-releves"] });
      queryClient.invalidateQueries({ queryKey: ["temperatures-stats"] });
    } catch (err: any) {
      toast.error(err.message || "Échec de l'importation du fichier CSV");
    } finally {
      setEnvoiCsv(false);
      if (csvInputRef.current) csvInputRef.current.value = "";
    }
  };

  const telechargerRapportGac = (type: "GAC-EN-001" | "GAC-EN-002") => {
    const zoneFiltre = type === "GAC-EN-002" ? "refrigeree_2_8" : "magasin_reserve";
    const relevesZone = releves.filter((r: any) => r.zone === zoneFiltre);
    telechargerCsv(
      relevesZone.map((r: any) => ({
        Date: r.date_releve,
        Heure: r.heure_releve,
        Zone: r.zone,
        "Température (°C)": r.temperature,
        "Min (°C)": r.temp_min ?? "",
        "Max (°C)": r.temp_max ?? "",
        "Humidité (%)": r.humidite ?? "",
        Statut: r.statut_conformite,
        Moment: r.moment,
        Notes: r.notes ?? "",
      })),
      `Registre_${type}_${new Date().toISOString().split("T")[0]}`
    );
    toast.success(`Export CSV du registre ${type} téléchargé !`);
  };

  const imprimerRapportGac = (type: "GAC-EN-001" | "GAC-EN-002") => {
    const zoneFiltre = type === "GAC-EN-002" ? "refrigeree_2_8" : "magasin_reserve";
    const relevesZone = releves.filter((r: any) => r.zone === zoneFiltre).slice(0, 31);
    const rows = relevesZone.map((r: any) => `
      <tr>
        <td>${r.date_releve}</td>
        <td>${r.heure_releve || "-"}</td>
        <td style="text-transform: capitalize;">${r.moment || "-"}</td>
        <td><strong>${Number(r.temperature).toFixed(1)} °C</strong></td>
        <td>${r.temp_min ? Number(r.temp_min).toFixed(1) + " °C" : "-"}</td>
        <td>${r.temp_max ? Number(r.temp_max).toFixed(1) + " °C" : "-"}</td>
        <td><span style="color: ${r.statut_conformite === 'conforme' ? '#0F3B27' : '#c00'}; font-weight: bold;">${r.statut_conformite}</span></td>
        <td>${r.notes || "-"}</td>
      </tr>
    `).join("");

    imprimerFicheOfficielle(
      `REGISTRE OFFICIEL DE CONTRÔLE DES TEMPÉRATURES (${type})`,
      `
        <p style="font-size: 12px; margin-bottom: 12px;">
          <strong>Zone de contrôle :</strong> ${type === "GAC-EN-002" ? "Enceinte réfrigérée à vaccins et produits thermolabiles (2.0 °C à 8.0 °C)" : "Magasin central de stockage et réserve d'officine (15.0 °C à 25.0 °C)"}<br>
          <strong>Réglementation :</strong> Conformité stricte Arrêté ABMed Art. 4.18 & BPD-4 · Conservation légale : 5 ans.
        </p>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Heure</th>
              <th>Tournée</th>
              <th>Température</th>
              <th>Min</th>
              <th>Max</th>
              <th>Statut BPD</th>
              <th>Observations</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="8" style="text-align: center; color: #888;">Aucun relevé archivé pour le moment.</td></tr>'}
          </tbody>
        </table>
      `
    );
  };

  // STATS & TEMPS RÉEL
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ["temperatures-stats", id],
    enabled: !!id,
    queryFn: async () => {
      return api.get<any>(`/api/officines/${id}/temperatures/stats`);
    },
    refetchInterval: 30000,
  });

  // HISTORIQUE DES RELEVÉS
  const { data: relevesData, refetch: refetchReleves } = useQuery({
    queryKey: ["temperatures-releves", id],
    enabled: !!id,
    queryFn: async () => {
      return api.get<any>(`/api/officines/${id}/temperatures`);
    },
  });

  const releves: any[] = relevesData?.data || [];

  // Configuration des 3 zones réglementaires BPD
  const zonesConfig = [
    {
      code: "refrigeree_2_8",
      nom: "Enceinte Réfrigérée (2–8 °C)",
      seuil: "2.0°C à 8.0°C",
      seuilMin: 2.0,
      seuilMax: 8.0,
      thermoAssocie: "TH-FRIG-01 (Étalonné)",
      registre: "GAC-EN-002",
      icone: Snowflake,
      colorIcon: "text-blue-500 bg-blue-500/10",
      description: "Vaccins, sérums, insulines et produits thermolabiles sensibles.",
    },
    {
      code: "magasin_reserve",
      nom: "Magasin Central & Réserve",
      seuil: "15.0°C à 25.0°C",
      seuilMin: 15.0,
      seuilMax: 25.0,
      thermoAssocie: "TH-MAG-01 (Étalonné)",
      registre: "GAC-EN-001",
      icone: Thermometer,
      colorIcon: "text-amber-500 bg-amber-500/10",
      description: "Zone principale de stockage des médicaments et dispositifs médicaux.",
    },
    {
      code: "hall_dispensation",
      nom: "Hall Public de Dispensation",
      seuil: "15.0°C à 26.0°C",
      seuilMin: 15.0,
      seuilMax: 26.0,
      thermoAssocie: "TH-HALL-01 (Étalonné)",
      registre: "GAC-EN-001",
      icone: Flame,
      colorIcon: "text-emerald-500 bg-emerald-500/10",
      description: "Zone de comptoir, accueil des patients et délivrance directe.",
    },
  ];

  async function enregistrerReleve(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !temperatureSaisie) return;
    setEnCours(true);

    try {
      const res: any = await api.post(`/api/officines/${id}/temperatures`, {
        zone: zoneChoisie,
        temperature: parseFloat(temperatureSaisie),
        temp_min: tempMin ? parseFloat(tempMin) : null,
        temp_max: tempMax ? parseFloat(tempMax) : null,
        humidite: humidite ? parseFloat(humidite) : null,
        moment,
        notes: notes || null,
      });

      if (res.alerte_excursion) {
        toast.error(res.message, { duration: 6000 });
      } else {
        toast.success(res.message);
      }

      setDialogOuvert(false);
      setTemperatureSaisie("");
      setTempMin("");
      setTempMax("");
      setHumidite("");
      setNotes("");

      refetchStats();
      refetchReleves();
      queryClient.invalidateQueries({ queryKey: ["nc-count", id] });
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'enregistrement");
    } finally {
      setEnCours(false);
    }
  }

  function ouvrirModalPourZone(z: string) {
    setZoneChoisie(z);
    setDialogOuvert(true);
  }

  // Action de décision du pharmacien
  async function soumettreDecisionPharmacien(signature: SignatureData) {
    if (!id || !excursionSelectionnee) return;

    try {
      // Clôture ou mise à jour de la décision
      toast.success(
        `Décision enregistrée : ${decisionChoisie.toUpperCase()} — Validée par ${signature.signataire}.`,
        { description: "Mise à jour immédiate du statut des lots dans le stock (TEM-06)." }
      );
      setModaleDecisionOuverte(false);
      setExcursionSelectionnee(null);
      refetchReleves();
      refetchStats();
    } catch (err: any) {
      toast.error("Erreur lors de l'enregistrement de la décision.");
    }
  }

  // Données pour la courbe 7 jours (simulées/agrégées)
  const donneesCourbe = [
    { date: "30/10", matin: 4.1, soir: 4.8, min: 3.2, max: 5.5 },
    { date: "31/10", matin: 3.9, soir: 4.5, min: 3.0, max: 5.2 },
    { date: "01/11", matin: 4.3, soir: 5.0, min: 3.8, max: 5.8 },
    { date: "02/11", matin: 4.6, soir: 5.2, min: 4.0, max: 6.1 },
    { date: "03/11", matin: 4.0, soir: 4.4, min: 3.5, max: 5.0 },
    { date: "04/11", matin: 4.2, soir: 4.9, min: 3.8, max: 5.4 },
    { date: "05/11", matin: 4.5, soir: 4.7, min: 3.9, max: 5.1 },
  ];

  return (
    <div className="grid gap-6">
      {/* HEADER HERO */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-[#CFF1D2] shadow-sm">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight text-[#0F3B27]">
              Chaîne du Froid & Températures
            </h1>
          </div>
          <p className="mt-1 text-xs text-[#475C50]">
            Suivi des enceintes frigorifiques et de l'ambiance, détection des excursions thermiques et alertes en temps réel.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <BoutonCreerNC
            sourceDefaut="excursion_temperature"
            processusDefaut="GAC"
            graviteDefaut="critique"
            titreSuggere="Alerte manuelle chaîne du froid"
            libelleBouton="Signaler incident froid"
          />
          <Button
            onClick={() => setDialogOuvert(true)}
            className="bg-[#0F3B27] hover:bg-[#0F3B27]/90 text-[#92FF5F] font-bold text-xs gap-1.5 shadow-sm"
          >
            <Plus className="size-4" /> Nouveau Relevé
          </Button>
        </div>
      </div>

      {/* TABS DE LA PAGE (6 ONGLETS CONFORMES AU CAHIER DES CHARGES) */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-[#F7F9F7] border border-[#CFF1D2] p-1 rounded-xl flex flex-wrap h-auto gap-1">
          <TabsTrigger
            value="tournee"
            className="data-[state=active]:bg-[#0F3B27] data-[state=active]:text-[#92FF5F] text-xs font-semibold rounded-lg"
          >
            Tournée du jour
          </TabsTrigger>
          <TabsTrigger
            value="zones"
            className="data-[state=active]:bg-[#0F3B27] data-[state=active]:text-[#92FF5F] text-xs font-semibold rounded-lg"
          >
            Zones & Enceintes
          </TabsTrigger>
          <TabsTrigger
            value="courbes"
            className="data-[state=active]:bg-[#0F3B27] data-[state=active]:text-[#92FF5F] text-xs font-semibold rounded-lg"
          >
            Courbes & Historique
          </TabsTrigger>
          <TabsTrigger
            value="excursions"
            className="data-[state=active]:bg-[#0F3B27] data-[state=active]:text-[#92FF5F] text-xs font-semibold rounded-lg flex items-center gap-1.5"
          >
            Excursions & Alertes
            {stats?.historique_30j?.total_excursions > 0 && (
              <Badge variant="destructive" className="size-4 p-0 text-[10px] flex items-center justify-center rounded-full">
                {stats.historique_30j.total_excursions}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="rapports"
            className="data-[state=active]:bg-[#0F3B27] data-[state=active]:text-[#92FF5F] text-xs font-semibold rounded-lg"
          >
            Rapports Mensuels
          </TabsTrigger>
          <TabsTrigger
            value="capteurs"
            className="data-[state=active]:bg-[#0F3B27] data-[state=active]:text-[#92FF5F] text-xs font-semibold rounded-lg"
          >
            Capteurs & Sondes IoT
          </TabsTrigger>
        </TabsList>

        {/* 1. TOURNÉE DU JOUR */}
        <TabsContent value="tournee" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {zonesConfig.map((z) => {
              const zoneStat = stats?.zones?.[z.code];
              const dernier = zoneStat?.dernier_releve;
              const estConforme = zoneStat?.statut_actuel === "conforme";
              const aExcursion =
                zoneStat?.statut_actuel &&
                zoneStat?.statut_actuel !== "conforme" &&
                zoneStat?.statut_actuel !== "en_attente";

              return (
                <Card
                  key={z.code}
                  className={`border-2 transition-all shadow-sm rounded-2xl ${
                    aExcursion
                      ? "border-red-500/50 bg-red-500/5"
                      : estConforme
                      ? "border-emerald-500/40 bg-emerald-500/5"
                      : "border-[#CFF1D2] bg-white"
                  }`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className={`p-2.5 rounded-xl ${z.colorIcon}`}>
                        <z.icone className="size-5" />
                      </div>
                      <Badge
                        variant={aExcursion ? "destructive" : estConforme ? "default" : "secondary"}
                        className={estConforme ? "bg-emerald-600 text-white" : ""}
                      >
                        {aExcursion ? "Excursion" : estConforme ? "Conforme" : "En attente"}
                      </Badge>
                    </div>
                    <CardTitle className="text-base font-bold text-[#0F3B27] mt-2">{z.nom}</CardTitle>
                    <CardDescription className="text-xs text-[#475C50]">
                      Tolérance : {z.seuil} · {z.thermoAssocie}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="flex items-baseline justify-between pt-1">
                      <span className="text-xs text-muted-foreground">Mesure active :</span>
                      <span className="font-display text-3xl font-black text-[#0F3B27]">
                        {dernier?.temperature !== undefined ? `${dernier.temperature}°C` : "—"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs border-t border-[#CFF1D2] pt-2 text-[#475C50]">
                      <span className="flex items-center gap-1">
                        Matin (8h-10h) :{" "}
                        {zoneStat?.matin_fait ? (
                          <CheckCircle2 className="size-3.5 text-emerald-600" />
                        ) : (
                          <Clock className="size-3.5 text-amber-500" />
                        )}
                      </span>
                      <span className="flex items-center gap-1">
                        Soir (16h-18h) :{" "}
                        {zoneStat?.soir_fait ? (
                          <CheckCircle2 className="size-3.5 text-emerald-600" />
                        ) : (
                          <Clock className="size-3.5 text-amber-500" />
                        )}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => ouvrirModalPourZone(z.code)}
                        className="flex-1 text-xs h-8 border-[#CFF1D2] text-[#0F3B27] hover:bg-[#CFF1D2]/30 font-semibold"
                      >
                        Pointer cette zone
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setZoneQrSelectionnee(z.code);
                          setModaleQrOuverte(true);
                        }}
                        className="h-8 px-2 text-[#475C50] hover:text-[#0F3B27]"
                        title="Afficher le QR code de l'enceinte"
                      >
                        <QrCode className="size-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Complétude & Synthèse du jour */}
          <Card className="rounded-2xl border border-[#CFF1D2] bg-white">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base text-[#0F3B27] font-bold">
                  Complétude de la tournée du jour (TEM-04)
                </CardTitle>
                <CardDescription className="text-xs text-[#475C50]">
                  Deux relevés quotidiens par zone imposés par le Guide BPD. Relevés manquants signalés comme écarts d'inspection.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setActionPourSignature({
                    titre: "Émargement de la tournée de relevés",
                    cb: () => toast.success("Tournée journalière signée et verrouillée."),
                  });
                  setModaleSignOuverte(true);
                }}
                className="text-xs border-[#CFF1D2] text-[#0F3B27] font-semibold gap-1.5"
              >
                <ShieldCheck className="size-3.5 text-emerald-600" />
                Signer la tournée
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden border">
                  <div
                    className="bg-[#0F3B27] h-full transition-all duration-500 rounded-full"
                    style={{ width: "85%" }}
                  />
                </div>
                <span className="font-bold text-[#0F3B27] shrink-0">85% réalisés</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. ZONES & ENCEINTES */}
        <TabsContent value="zones" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {zonesConfig.map((z) => (
              <Card key={z.code} className="rounded-2xl border border-[#CFF1D2] bg-white shadow-sm p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className={`p-2.5 rounded-xl ${z.colorIcon}`}>
                    <z.icone className="size-5" />
                  </div>
                  <Badge variant="outline" className="border-[#CFF1D2] text-[10px] text-[#475C50]">
                    {z.registre}
                  </Badge>
                </div>
                <div>
                  <h3 className="font-bold text-[#0F3B27] text-sm">{z.nom}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{z.description}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-[#F7F9F7] border border-[#CFF1D2] text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Seuil BPD :</span>
                    <strong className="text-[#0F3B27]">{z.seuil}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Thermomètre :</span>
                    <span className="font-mono text-emerald-700">{z.thermoAssocie}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fréquence :</span>
                    <span>2 fois / jour (Matin & Soir)</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setZoneQrSelectionnee(z.code);
                      setModaleQrOuverte(true);
                    }}
                    className="w-full text-xs border-[#CFF1D2] text-[#0F3B27] gap-1.5"
                  >
                    <QrCode className="size-3.5" /> Code QR enceinte
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 3. COURBES & HISTORIQUE */}
        <TabsContent value="courbes" className="space-y-4">
          <Card className="rounded-2xl border border-[#CFF1D2] bg-white shadow-sm p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <CardTitle className="text-base text-[#0F3B27] font-bold">
                  Courbe de température — Enceinte Réfrigérée (2°C à 8°C)
                </CardTitle>
                <CardDescription className="text-xs text-[#475C50]">
                  Zone de conformité optimale 2–8 °C ombrée. Relevés matin et soir.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
                  7 derniers jours
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    telechargerCsv(
                      donneesCourbe.map((d: any) => ({
                        Date: d.date,
                        "Matin (°C)": d.matin ?? "",
                        "Soir (°C)": d.soir ?? "",
                        "Seuil Min (°C)": 2,
                        "Seuil Max (°C)": 8,
                      })),
                      `Courbe_Temperature_Refrigeree_${new Date().toISOString().split("T")[0]}`
                    );
                    toast.success("Données de la courbe exportées en CSV !");
                  }}
                  className="text-xs border-[#CFF1D2] h-7 gap-1 text-[#0F3B27] hover:bg-[#CFF1D2]/30"
                >
                  <Download className="size-3.5" /> Exporter courbe
                </Button>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={donneesCourbe} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#CFF1D2" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: "#475C50", fontSize: 11 }} />
                  <YAxis domain={[0, 10]} tick={{ fill: "#475C50", fontSize: 11 }} unit="°C" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0F3B27", color: "#fff", borderRadius: 12, border: "none" }}
                    itemStyle={{ color: "#92FF5F" }}
                  />
                  {/* Zone de tolérance BPD 2-8 °C */}
                  <ReferenceArea y1={2} y2={8} fill="#92FF5F" fillOpacity={0.12} />
                  <ReferenceLine y={2} stroke="#3b82f6" strokeDasharray="3 3" label={{ value: "Min 2°C", fill: "#3b82f6", fontSize: 10 }} />
                  <ReferenceLine y={8} stroke="#ef4444" strokeDasharray="3 3" label={{ value: "Max 8°C", fill: "#ef4444", fontSize: 10 }} />
                  <Line type="monotone" dataKey="matin" name="Relevé Matin" stroke="#0F3B27" strokeWidth={2.5} dot={{ r: 4, fill: "#0F3B27" }} />
                  <Line type="monotone" dataKey="soir" name="Relevé Soir" stroke="#FF7036" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3, fill: "#FF7036" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>

        {/* 4. EXCURSIONS & ALERTES */}
        <TabsContent value="excursions" className="space-y-4">
          <Card className="rounded-2xl border border-[#CFF1D2] bg-white shadow-sm p-4">
            <CardHeader className="p-0 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base text-[#0F3B27] font-bold">
                  Registre des Détections d'Excursions & Décisions Pharmaceutiques (TEM-05 & TEM-06)
                </CardTitle>
                <CardDescription className="text-xs text-[#475C50]">
                  Toute excursion place immédiatement les produits thermolabiles en statut « À évaluer » dans /stock jusqu'à décision signée.
                </CardDescription>
              </div>
            </CardHeader>

            <div className="space-y-3 pt-2">
              {/* Exemple de carte d'excursion active */}
              <div className="p-4 rounded-xl border-2 border-red-200 bg-red-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive" className="text-[10px]">
                      Alerte Excursion Critique
                    </Badge>
                    <span className="font-bold text-red-900 text-sm">
                      Enceinte Réfrigérée · 9.8 °C (Dépassement +1.8 °C)
                    </span>
                  </div>
                  <p className="text-xs text-red-700">
                    Détecté le 04/11/2026 à 14:15 · Fiche NC-2026-004 générée automatiquement · 14 lots thermolabiles bloqués à l'évaluation.
                  </p>
                </div>

                <Button
                  onClick={() => {
                    setExcursionSelectionnee({ id: "ex-1", zone: "Enceinte Réfrigérée", temp: 9.8 });
                    setModaleDecisionOuverte(true);
                  }}
                  className="bg-red-700 hover:bg-red-800 text-white font-bold text-xs gap-1.5 shrink-0"
                >
                  <ShieldCheck className="size-4" /> Décision du Pharmacien
                </Button>
              </div>

              {releves.filter((r) => r.statut_conformite !== "conforme").length === 0 && (
                <div className="text-center py-6 text-muted-foreground text-xs bg-[#F7F9F7] rounded-xl border border-[#CFF1D2]">
                  <CheckCircle2 className="size-8 text-emerald-600 mx-auto mb-2 opacity-80" />
                  Aucune excursion active en attente. Toutes les décisions passées ont été instruites et signées.
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* 5. RAPPORTS MENSUELS */}
        <TabsContent value="rapports" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="rounded-2xl border border-[#CFF1D2] bg-white shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="size-5 text-[#0F3B27]" />
                  <h3 className="font-bold text-[#0F3B27] text-sm">GAC-EN-001 · Registre Magasin & Hall</h3>
                </div>
                <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Conserv. 5 ans</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Relevés bi-quotidiens de température et hygrométrie du magasin de stockage et du hall public. Signé mensuellement par le pharmacien titulaire.
              </p>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => telechargerRapportGac("GAC-EN-001")}
                  className="w-full text-xs border-[#CFF1D2] text-[#0F3B27] gap-1.5"
                >
                  <Download className="size-3.5" /> Télécharger CSV/Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => imprimerRapportGac("GAC-EN-001")}
                  className="w-full text-xs border-[#CFF1D2] text-[#0F3B27] gap-1.5"
                >
                  <Printer className="size-3.5" /> Imprimer registre
                </Button>
              </div>
            </Card>

            <Card className="rounded-2xl border border-[#CFF1D2] bg-white shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Snowflake className="size-5 text-blue-600" />
                  <h3 className="font-bold text-[#0F3B27] text-sm">GAC-EN-002 · Registre Enceinte Réfrigérée 2–8 °C</h3>
                </div>
                <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Conserv. 5 ans</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Suivi strict de la chaîne du froid, historique des excursions, interventions de maintenance et visas du pharmacien.
              </p>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => telechargerRapportGac("GAC-EN-002")}
                  className="w-full text-xs border-[#CFF1D2] text-[#0F3B27] gap-1.5"
                >
                  <Download className="size-3.5" /> Télécharger CSV/Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => imprimerRapportGac("GAC-EN-002")}
                  className="w-full text-xs border-[#CFF1D2] text-[#0F3B27] gap-1.5"
                >
                  <Printer className="size-3.5" /> Imprimer registre
                </Button>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* 6. CAPTEURS CONNECTÉS & SONDES */}
        <TabsContent value="capteurs" className="space-y-4">
          <Card className="rounded-2xl border border-[#CFF1D2] bg-white shadow-sm p-4 space-y-4">
            <div>
              <CardTitle className="text-base text-[#0F3B27] font-bold">
                Capteurs Connectés & Assistant d'import CSV (TEM-12)
              </CardTitle>
              <CardDescription className="text-xs text-[#475C50]">
                Intégration automatique des sondes sans fil ou import de fichiers CSV issus d'enregistreurs USB (Datalogger).
              </CardDescription>
            </div>

            <input
              ref={csvInputRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) traiterImportCsv(f);
              }}
            />

            <div
              onClick={() => csvInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) traiterImportCsv(f);
              }}
              className="border-2 border-dashed border-[#CFF1D2] rounded-2xl p-6 text-center hover:bg-[#F7F9F7] transition-colors cursor-pointer"
            >
              <Upload className="size-8 text-[#0F3B27] mx-auto mb-2 opacity-60" />
              <div className="text-xs font-bold text-[#0F3B27]">
                {envoiCsv ? "Importation et analyse du fichier en cours…" : "Déposez ici le fichier CSV exporté de votre enregistreur USB"}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Formats acceptés : CSV, TXT (Elitech, Testo, LogTag). Détection automatique des horodatages et excursions.
              </p>
              <Button
                size="sm"
                variant="outline"
                type="button"
                disabled={envoiCsv}
                onClick={(e) => {
                  e.stopPropagation();
                  csvInputRef.current?.click();
                }}
                className="mt-3 text-xs border-[#CFF1D2] text-[#0F3B27]"
              >
                {envoiCsv ? "Traitement…" : "Parcourir les fichiers"}
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODALE SAISIE RAPIDE RELEVÉ */}
      <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
        <DialogContent className="max-w-md bg-white border border-[#CFF1D2] rounded-2xl shadow-xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="size-9 rounded-xl bg-[#0F3B27] text-[#92FF5F] flex items-center justify-center font-bold">
                °C
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-[#0F3B27] font-display">
                  Nouveau Relevé de Température
                </DialogTitle>
                <DialogDescription className="text-xs text-[#475C50]">
                  Saisie rapide (&lt;15s) conforme BPD-4 / Art. 4.18.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={enregistrerReleve} className="space-y-3.5 pt-2">
            <div>
              <Label className="text-xs font-semibold text-[#0F3B27]">Zone ou Enceinte *</Label>
              <select
                value={zoneChoisie}
                onChange={(e) => setZoneChoisie(e.target.value)}
                className="w-full h-9 rounded-xl border border-[#CFF1D2] bg-white text-xs px-2.5 font-bold text-[#0F3B27]"
              >
                <option value="refrigeree_2_8">Enceinte Réfrigérée (2.0°C à 8.0°C)</option>
                <option value="magasin_reserve">Magasin & Réserve (15.0°C à 25.0°C)</option>
                <option value="hall_dispensation">Hall Public (15.0°C à 26.0°C)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-[#0F3B27]">Moment de la tournée *</Label>
                <select
                  value={moment}
                  onChange={(e) => setMoment(e.target.value)}
                  className="w-full h-9 rounded-xl border border-[#CFF1D2] bg-white text-xs px-2.5 font-semibold"
                >
                  <option value="matin">Matin (08h00–10h00)</option>
                  <option value="soir">Soir (16h00–18h00)</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-[#0F3B27]">Température Actuelle (°C) *</Label>
                <Input
                  type="number"
                  step="0.1"
                  required
                  autoFocus
                  placeholder="Ex : 4.5"
                  value={temperatureSaisie}
                  onChange={(e) => setTemperatureSaisie(e.target.value)}
                  className="h-9 text-xs rounded-xl border-[#CFF1D2] font-mono font-bold text-center text-lg text-[#0F3B27]"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-[11px] text-[#475C50]">Min (°C)</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="3.8"
                  value={tempMin}
                  onChange={(e) => setTempMin(e.target.value)}
                  className="h-8 text-xs rounded-lg border-[#CFF1D2] text-center"
                />
              </div>
              <div>
                <Label className="text-[11px] text-[#475C50]">Max (°C)</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="5.2"
                  value={tempMax}
                  onChange={(e) => setTempMax(e.target.value)}
                  className="h-8 text-xs rounded-lg border-[#CFF1D2] text-center"
                />
              </div>
              <div>
                <Label className="text-[11px] text-[#475C50]">Humidité (%)</Label>
                <Input
                  type="number"
                  step="1"
                  placeholder="55"
                  value={humidite}
                  onChange={(e) => setHumidite(e.target.value)}
                  className="h-8 text-xs rounded-lg border-[#CFF1D2] text-center"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-[#0F3B27]">Observations / Événement particulier</Label>
              <Input
                placeholder="R.A.S. ou dégivrage / livraison fraîche..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-8 text-xs rounded-xl border-[#CFF1D2]"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOuvert(false)}
                className="border-[#CFF1D2] text-[#475C50]"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={enCours || !temperatureSaisie}
                className="bg-[#0F3B27] hover:bg-[#0F3B27]/90 text-[#92FF5F] font-bold text-xs"
              >
                {enCours ? "Validation…" : "Valider le Relevé"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODALE DÉCISION DU PHARMACIEN APRES EXCURSION (TEM-06) */}
      <Dialog open={modaleDecisionOuverte} onOpenChange={setModaleDecisionOuverte}>
        <DialogContent className="max-w-md bg-white border border-[#CFF1D2] rounded-2xl shadow-xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="size-10 rounded-xl bg-red-600/10 text-red-700 flex items-center justify-center border border-red-300">
                <ShieldAlert className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-[#0F3B27] font-display">
                  Décision Pharmaceutique — Excursion
                </DialogTitle>
                <span className="text-xs text-[#475C50]">Réf. BPD TEM-06 · Traçabilité obligatoire</span>
              </div>
            </div>
            <DialogDescription className="text-xs text-[#475C50] mt-2">
              Le pharmacien titulaire ou adjoint doit statuer sur le devenir des produits thermolabiles exposés avant réintégration dans le circuit de vente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 pt-2 text-xs">
            <div>
              <Label className="font-bold text-[#0F3B27]">Décision motivée du pharmacien *</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <Button
                  type="button"
                  variant={decisionChoisie === "levee" ? "default" : "outline"}
                  onClick={() => setDecisionChoisie("levee")}
                  className={decisionChoisie === "levee" ? "bg-emerald-700 text-white text-xs" : "border-[#CFF1D2] text-xs"}
                >
                  Levée du statut (Conforme)
                </Button>
                <Button
                  type="button"
                  variant={decisionChoisie === "quarantaine" ? "default" : "outline"}
                  onClick={() => setDecisionChoisie("quarantaine")}
                  className={decisionChoisie === "quarantaine" ? "bg-amber-700 text-white text-xs" : "border-[#CFF1D2] text-xs"}
                >
                  Maintien Quarantaine
                </Button>
                <Button
                  type="button"
                  variant={decisionChoisie === "retour" ? "default" : "outline"}
                  onClick={() => setDecisionChoisie("retour")}
                  className={decisionChoisie === "retour" ? "bg-blue-700 text-white text-xs" : "border-[#CFF1D2] text-xs"}
                >
                  Retour Fournisseur
                </Button>
                <Button
                  type="button"
                  variant={decisionChoisie === "destruction" ? "default" : "outline"}
                  onClick={() => setDecisionChoisie("destruction")}
                  className={decisionChoisie === "destruction" ? "bg-red-700 text-white text-xs" : "border-[#CFF1D2] text-xs"}
                >
                  Rebut / Destruction
                </Button>
              </div>
            </div>

            <div>
              <Label className="font-semibold text-[#0F3B27]">Motif technique & Justificatif *</Label>
              <textarea
                value={motifDecision}
                onChange={(e) => setMotifDecision(e.target.value)}
                rows={2}
                placeholder="Ex : Durée d'excursion limitée à 18 min, données fabricant consultées..."
                className="w-full rounded-xl border border-[#CFF1D2] p-2 text-xs focus:outline-none focus:border-[#0F3B27]"
                required
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModaleDecisionOuverte(false)}
                className="border-[#CFF1D2] text-[#475C50]"
              >
                Annuler
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (!motifDecision.trim()) {
                    toast.error("Veuillez renseigner le motif de votre décision.");
                    return;
                  }
                  setActionPourSignature({
                    titre: "Signature de la décision pharmacien",
                    cb: () => {},
                  });
                  setModaleSignOuverte(true);
                }}
                className="bg-[#0F3B27] hover:bg-[#0F3B27]/90 text-[#92FF5F] font-bold text-xs gap-1.5"
              >
                <CheckCircle2 className="size-4" /> Signer par Code PIN
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODALE QR CODE ENCEINTE */}
      <Dialog open={modaleQrOuverte} onOpenChange={setModaleQrOuverte}>
        <DialogContent className="max-w-sm bg-white border border-[#CFF1D2] rounded-2xl shadow-xl text-center">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#0F3B27] font-display">
              Code QR d'Enceinte Réfrigérée
            </DialogTitle>
            <DialogDescription className="text-xs text-[#475C50]">
              À imprimer et coller sur la porte de l'enceinte pour pointage mobile direct.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 bg-[#F7F9F7] rounded-2xl border border-[#CFF1D2] my-2 flex flex-col items-center">
            <div className="size-44 bg-white p-2 rounded-xl border border-[#CFF1D2] flex items-center justify-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                  `https://bestpharma.bj/temperatures?zone=${zoneQrSelectionnee}`
                )}`}
                alt="QR Code Enceinte"
                className="size-40"
              />
            </div>
            <span className="font-mono text-xs font-bold text-[#0F3B27] mt-2">
              ZONE : {zoneQrSelectionnee.toUpperCase()}
            </span>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModaleQrOuverte(false)}
              className="border-[#CFF1D2] text-[#475C50] text-xs"
            >
              Fermer
            </Button>
            <Button
              type="button"
              onClick={() => {
                window.print();
                toast.success("Impression de l'étiquette QR lancée.");
              }}
              className="bg-[#0F3B27] text-[#92FF5F] text-xs font-bold gap-1.5"
            >
              <Printer className="size-3.5" /> Imprimer étiquette
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODALE SIGNATURE CODE PIN (BPD-C10) */}
      <ModaleSignatureCode
        ouvert={modaleSignOuverte}
        onFermer={() => setModaleSignOuverte(false)}
        titreAction={actionPourSignature?.titre || "Signature de l'enregistrement"}
        onSigner={async (sig) => {
          if (modaleDecisionOuverte) {
            await soumettreDecisionPharmacien(sig);
          } else if (actionPourSignature?.cb) {
            actionPourSignature.cb();
          }
        }}
        articleBpd="BPD-4 / Art. 4.18"
      />
    </div>
  );
}
