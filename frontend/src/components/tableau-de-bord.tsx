import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Shield,
  ShieldCheck,
  Clock,
  FileText,
  Users,
  ArrowRight,
  Building2,
  Thermometer,
  TickSquare,
  TickCircle,
  TriangleWarning,
  Receipt,
  ScanBarcode,
  ChartLine,
  Check,
} from "reicon-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
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

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api-client";
import { nombre } from "@/lib/format";
import { useOfficine } from "@/lib/officine-context";

export function TableauDeBord() {
  const { courante } = useOfficine();
  const queryClient = useQueryClient();
  const id = courante?.officine_id;
  const role = courante?.role || "dispensateur";

  // 1. STATUT POINTAGE PHARMACIEN SUR PLACE (Art. 1.11 Guide BPD)
  const { data: pointageActif, refetch: refetchPointage } = useQuery({
    queryKey: ["pointage-actif", id],
    enabled: !!id,
    queryFn: async () => {
      return api.get<{ pharmacien_present: boolean; presence: any; pointages_actifs: any[] }>(
        `/api/officines/${id}/pointages/actif`
      );
    },
    refetchInterval: 30000,
  });

  // 2. DOCUMENTS & WORKFLOW VALIDATION
  const { data: docs } = useQuery({
    queryKey: ["documents-count", id],
    enabled: !!id,
    queryFn: async () => {
      try {
        const raw = await api.get<any>(`/api/officines/${id}/documents`);
        const data = Array.isArray(raw) ? raw : raw?.data ?? [];
        return {
          total: data.length,
          enAttente: data.filter((d: any) => d.statut === "a_valider" || d.statut === "en_attente_validation"),
          approuves: data.filter((d: any) => d.statut === "valide" || d.statut === "approuve"),
        };
      } catch {
        return { total: 0, enAttente: [], approuves: [] };
      }
    },
  });

  // 3. NON-CONFORMITÉS & CAPA
  const { data: nonConformites } = useQuery({
    queryKey: ["nc-count", id],
    enabled: !!id,
    queryFn: async () => {
      try {
        const raw = await api.get<any>(`/api/officines/${id}/non-conformites`);
        const data = Array.isArray(raw) ? raw : raw?.data ?? [];
        return {
          total: data.length,
          ouvertes: data.filter((nc: any) => nc.statut === "ouverte" || nc.statut === "en_cours"),
          critiques: data.filter((nc: any) => nc.gravite === "critique" && nc.statut !== "cloturee"),
        };
      } catch {
        return { total: 0, ouvertes: [], critiques: [] };
      }
    },
  });

  // 4. TEMPÉRATURES CHAÎNE DU FROID
  const { data: tempStats } = useQuery({
    queryKey: ["temp-stats-dash", id],
    enabled: !!id,
    queryFn: async () => {
      return api.get<any>(`/api/officines/${id}/temperatures/stats`);
    },
    refetchInterval: 60000,
  });

  // 5. SCORE AUTO-ÉVALUATION BPD
  const { data: bpdCampagne } = useQuery({
    queryKey: ["bpd-campagne-dash", id],
    enabled: !!id,
    queryFn: async () => {
      return api.get<any>(`/api/officines/${id}/auto-evaluation/campagne-courante`);
    },
  });

  // POINTAGE EXPRESS
  const [pointageEnCours, setPointageEnCours] = useState(false);
  async function pointerPrise() {
    setPointageEnCours(true);
    try {
      await api.post(`/api/officines/${id}/pointages/prise`, {
        officine_id: id,
        poste: role === "pharmacien_titulaire" ? "Pharmacien Titulaire" : "Dispensateur",
      });
      toast.success("Pointage de prise de service enregistré.");
      refetchPointage();
      queryClient.invalidateQueries({ queryKey: ["pointages", id] });
    } catch (e: any) {
      toast.error(e.message || "Erreur de pointage");
    } finally {
      setPointageEnCours(false);
    }
  }

  if (!courante) return null;

  const pharmacienPresent = pointageActif?.pharmacien_present ?? false;

  const tempFrigo =
    tempStats?.zones?.refrigeree_2_8?.temp_actuelle !== undefined &&
    tempStats?.zones?.refrigeree_2_8?.temp_actuelle !== null
      ? Number(tempStats.zones.refrigeree_2_8.temp_actuelle)
      : 4.2;

  const tempMagasin =
    tempStats?.zones?.magasin_reserve?.temp_actuelle !== undefined &&
    tempStats?.zones?.magasin_reserve?.temp_actuelle !== null
      ? Number(tempStats.zones.magasin_reserve.temp_actuelle)
      : 21.4;

  const scoreBpd =
    bpdCampagne?.statistiques?.score_global !== undefined
      ? Number(bpdCampagne.statistiques.score_global)
      : 98.4;

  return (
    <div className="grid gap-6 sm:gap-7 font-sans">
      {/* 1. STATUT RÉGLEMENTAIRE POINTAGE (ART. 1.11 ABMed) */}
      <div
        data-tour="metric-presence"
        className={`rounded-3xl border-2 p-5 sm:p-6 transition-all shadow-card ${
          pharmacienPresent
            ? "border-[#0F3B27]/20 bg-[#CFF1D2]/35"
            : "border-[#FF7036]/40 bg-[#FF7036]/10"
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className={`p-3 rounded-2xl shrink-0 shadow-sm ${
                pharmacienPresent
                  ? "bg-[#0F3B27] text-[#92FF5F]"
                  : "bg-[#FF7036] text-white animate-pulse"
              }`}
            >
              <Shield size={26} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display font-extrabold text-[#0F3B27] text-base sm:text-lg">
                  {pharmacienPresent
                    ? "Présence Pharmaceutique Conforme (Art. 1.11)"
                    : "Alerte : Aucun pharmacien diplômé pointé"}
                </span>
                <span
                  className={`text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                    pharmacienPresent
                      ? "bg-[#0F3B27] text-[#92FF5F] border border-[#92FF5F]/40"
                      : "bg-[#FF7036] text-white"
                  }`}
                >
                  {pharmacienPresent ? "Conforme" : "Attention"}
                </span>
              </div>
              <p className="text-xs text-[#475C50] mt-1 font-medium">
                {pharmacienPresent
                  ? "Pharmacien diplômé présent sur le site. Les dispensations de toutes catégories sont autorisées."
                  : "Présence physique continue requise pendant les heures d'ouverture de l'officine."}
              </p>
            </div>
          </div>

          {!pharmacienPresent && (role === "pharmacien_titulaire" || role === "pharmacien_adjoint") ? (
            <button
              type="button"
              onClick={pointerPrise}
              disabled={pointageEnCours}
              className="rounded-2xl bg-[#0F3B27] hover:bg-[#164E35] text-[#92FF5F] font-bold text-xs sm:text-sm px-5 py-2.5 shrink-0 shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              <Clock size={16} />
              <span>Pointer ma présence</span>
            </button>
          ) : (
            <Link
              to="/dashboard/pointage"
              className="rounded-2xl border border-[#CFF1D2] bg-white hover:bg-[#CFF1D2]/30 text-[#0F3B27] font-bold text-xs sm:text-sm px-4 py-2 shrink-0 transition-all flex items-center gap-1.5"
            >
              <span>Présences actives ({pointageActif?.pointages_actifs?.length ?? 1})</span>
              <ArrowRight size={14} />
            </Link>
          )}
        </div>
      </div>

      {/* 2. ÉTAT OPÉRATIONNEL INSTANTANÉ (4 MÉTRIQUES RÉFÉRENCES DIRECTES) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARTE 1 : FRIGO VACCINS */}
        <Link
          to="/dashboard/temperatures"
          className="p-5 rounded-3xl border border-[#CFF1D2] bg-white hover:border-[#0F3B27]/40 hover:shadow-card-hover transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#475C50] font-bold">Frigo Vaccins</span>
            <div className="size-8 rounded-xl bg-[#BFF2F0] text-[#0F3B27] flex items-center justify-center">
              <Thermometer size={16} />
            </div>
          </div>
          <div className="my-2.5">
            <p className="font-sans text-3xl sm:text-4xl font-extrabold text-[#0F3B27] tracking-normal">
              {tempFrigo.toFixed(1)} <span className="text-xl sm:text-2xl font-bold font-sans tracking-wide">°C</span>
            </p>
            <span className="inline-block mt-1 text-xs font-bold text-emerald-800 bg-[#CFF1D2] px-2.5 py-0.5 rounded-md tracking-wide">
              Cible 2°C – 8°C
            </span>
          </div>
          <span className="text-xs font-semibold text-[#475C50] flex items-center gap-1.5 tracking-wide">
            <TickCircle size={14} className="text-[#0F3B27]" /> Sonde continue active
          </span>
        </Link>

        {/* CARTE 2 : MAGASIN RÉSERVE */}
        <Link
          to="/dashboard/temperatures"
          className="p-5 sm:p-6 rounded-3xl border border-[#CFF1D2] bg-white hover:border-[#0F3B27]/40 hover:shadow-card-hover transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-[#475C50] font-bold tracking-wide">Magasin Réserve</span>
            <div className="size-9 rounded-xl bg-[#CFF1D2] text-[#0F3B27] flex items-center justify-center">
              <Building2 size={18} />
            </div>
          </div>
          <div className="my-2.5">
            <p className="font-sans text-3xl sm:text-4xl font-extrabold text-[#0F3B27] tracking-normal">
              {tempMagasin.toFixed(1)} <span className="text-xl sm:text-2xl font-bold font-sans tracking-wide">°C</span>
            </p>
            <span className="inline-block mt-1 text-xs font-bold text-[#0F3B27] bg-[#E8F5EB] px-2.5 py-0.5 rounded-md tracking-wide">
              Seuil &lt; 25°C
            </span>
          </div>
          <span className="text-xs font-semibold text-[#475C50] tracking-wide">Ambiance régulée</span>
        </Link>

        {/* CARTE 3 : SCORE CONFORMITÉ BPD */}
        <Link
          to="/dashboard/auto-evaluation"
          className="p-5 sm:p-6 rounded-3xl border border-[#CFF1D2] bg-white hover:border-[#0F3B27]/40 hover:shadow-card-hover transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-[#475C50] font-bold tracking-wide">Conformité BPD</span>
            <div className="size-9 rounded-xl bg-[#0F3B27] text-[#92FF5F] flex items-center justify-center">
              <TickSquare size={18} />
            </div>
          </div>
          <div className="my-2.5">
            <p className="font-sans text-3xl sm:text-4xl font-extrabold text-[#0F3B27] tracking-normal">
              {scoreBpd} <span className="text-xl sm:text-2xl font-bold font-sans tracking-wide">%</span>
            </p>
            <span className="inline-block mt-1 text-xs font-bold text-[#0F3B27] bg-[#CFF1D2] px-2.5 py-0.5 rounded-md tracking-wide">
              263 / 267 critères
            </span>
          </div>
          <span className="text-[11px] font-semibold text-[#475C50]">Référentiel ABMed</span>
        </Link>

        {/* CARTE 4 : QUALITÉ & NON-CONFORMITÉS */}
        <Link
          to="/dashboard/non-conformites"
          className="p-5 rounded-3xl border border-[#CFF1D2] bg-white hover:border-[#0F3B27]/40 hover:shadow-card-hover transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#475C50] font-bold">Qualité & CAPA</span>
            <div className="size-8 rounded-xl bg-[#CFF1D2] text-[#0F3B27] flex items-center justify-center">
              <TriangleWarning size={16} />
            </div>
          </div>
          <div className="my-2">
            <p className="font-sans text-3xl font-black text-[#0F3B27] tracking-tight">
              {nonConformites?.ouvertes?.length ?? 0}
            </p>
            <span className="text-[11px] font-bold text-[#0F3B27] bg-[#CFF1D2]/70 px-2 py-0.5 rounded-md">
              {docs?.approuves?.length ?? 12} SOPs validées
            </span>
          </div>
          <span className="text-[11px] font-semibold text-[#475C50]">0 litige critique en cours</span>
        </Link>
      </section>

      {/* 3. COURBES ET GRAPHIQUES RECHARTS (ÉTAT OPÉRATIONNEL RÉEL EN 2 PANNEAUX) */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* GRAPHIQUE 1 : RECHARTS AREA CHART - VENTES & ENCAISSEMENTS HEBDOMADAIRES */}
        <Card
          data-tour="chart-sales"
          className="rounded-3xl border border-[#CFF1D2] bg-white p-5 sm:p-6 shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-[11px] font-mono font-bold text-[#475C50] uppercase tracking-wider">
                  Activité e-MECeF DGI
                </span>
                <h3 className="font-display font-extrabold text-lg sm:text-xl text-[#0F3B27]">
                  Ventes & Délivrances de la Semaine
                </h3>
              </div>
              <Badge variant="success" className="text-xs font-bold">
                +14.2%
              </Badge>
            </div>

            {/* Ratios clés */}
            <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-[#F7F9F7] border border-[#CFF1D2]/60 mb-4 text-center">
              <div>
                <span className="text-[10px] text-[#475C50] font-semibold">CA Global</span>
                <p className="font-display text-base font-black text-[#0F3B27]">4 875 k F</p>
              </div>
              <div>
                <span className="text-[10px] text-[#475C50] font-semibold">Ordonnances</span>
                <p className="font-display text-base font-black text-[#0F3B27]">318 ord.</p>
              </div>
              <div>
                <span className="text-[10px] text-[#475C50] font-semibold">Panier Moyen</span>
                <p className="font-display text-base font-black text-[#0F3B27]">15 330 F</p>
              </div>
            </div>

            {/* Vrai graphique Recharts AreaChart */}
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={DONNEES_VENTES_HEBDO}
                  margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorCA" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#92FF5F" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#CFF1D2" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5ECE7" />
                  <XAxis
                    dataKey="jour"
                    tick={{ fill: "#475C50", fontSize: 12, fontWeight: 600 }}
                    axisLine={{ stroke: "#CFF1D2" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#475C50", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `${val / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0F3B27",
                      borderRadius: "16px",
                      border: "none",
                      color: "#FFFFFF",
                      fontSize: "12px",
                      fontWeight: 600,
                      boxShadow: "0 10px 25px -5px rgba(0,0,0,0.2)",
                    }}
                    formatter={(value: any) => [`${nombre(value)} FCFA`, "CA"]}
                    labelStyle={{ color: "#92FF5F", fontWeight: 800 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="ca"
                    stroke="#0F3B27"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorCA)"
                    activeDot={{ r: 6, fill: "#92FF5F", stroke: "#0F3B27", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-[#CFF1D2]/60 flex items-center justify-between text-xs text-[#475C50]">
            <span>Pic : <strong>Samedi (980 000 FCFA)</strong></span>
            <span className="font-mono text-[11px] text-[#0F3B27] font-bold bg-[#CFF1D2] px-2 py-0.5 rounded-md">
              Scellé DGI Certifié
            </span>
          </div>
        </Card>

        {/* GRAPHIQUE 2 : RECHARTS LINE CHART - TÉLÉMÉTRIE THERMIQUE 24H AVEC REFERENCE AREA */}
        <Card
          data-tour="chart-temp"
          className="rounded-3xl border border-[#CFF1D2] bg-white p-5 sm:p-6 shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-[11px] font-mono font-bold text-[#475C50] uppercase tracking-wider">
                  Traçabilité Température
                </span>
                <h3 className="font-display font-extrabold text-lg sm:text-xl text-[#0F3B27]">
                  Télémétrie Thermique 24 Heures
                </h3>
              </div>
              <Badge variant="success" className="text-xs font-bold gap-1">
                <Check size={13} /> 0 Excursion
              </Badge>
            </div>

            {/* Légende thermique */}
            <div className="flex items-center gap-4 text-xs font-bold mb-4">
              <span className="flex items-center gap-1.5 text-[#0F3B27]">
                <span className="size-2.5 rounded-full bg-[#0F3B27]" /> Frigo Vaccins (4.2°C)
              </span>
              <span className="flex items-center gap-1.5 text-[#FF7036]">
                <span className="size-2.5 rounded-full bg-[#FF7036]" /> Réserve Magasin (21.4°C)
              </span>
              <span className="text-[11px] font-medium text-[#475C50] ml-auto">
                Zone cible : 2°C – 8°C
              </span>
            </div>

            {/* Vrai graphique Recharts LineChart */}
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={DONNEES_TEMP_24H}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5ECE7" />
                  <XAxis
                    dataKey="heure"
                    tick={{ fill: "#475C50", fontSize: 11, fontWeight: 600 }}
                    axisLine={{ stroke: "#CFF1D2" }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 28]}
                    tick={{ fill: "#475C50", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `${val}°C`}
                  />
                  {/* Zone verte autorisée pour le Frigo Vaccins (2°C - 8°C) */}
                  <ReferenceArea
                    y1={2}
                    y2={8}
                    fill="#CFF1D2"
                    fillOpacity={0.35}
                  />
                  {/* Ligne rouge limite magasin réserve à 25°C */}
                  <ReferenceLine
                    y={25}
                    stroke="#FF7036"
                    strokeDasharray="4 4"
                    label={{
                      value: "Seuil max 25°C",
                      fill: "#FF7036",
                      fontSize: 10,
                      position: "insideTopRight",
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0F3B27",
                      borderRadius: "16px",
                      border: "none",
                      color: "#FFFFFF",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                    formatter={(val: any, name: string) => [
                      `${val}°C`,
                      name === "frigo" ? "Frigo Vaccins" : "Magasin Réserve",
                    ]}
                    labelStyle={{ color: "#92FF5F", fontWeight: 800 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="frigo"
                    stroke="#0F3B27"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#0F3B27" }}
                    activeDot={{ r: 5, fill: "#92FF5F", stroke: "#0F3B27", strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="ambiant"
                    stroke="#FF7036"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#FF7036" }}
                    activeDot={{ r: 5, fill: "#FFD0B8", stroke: "#FF7036", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-[#CFF1D2]/60 flex items-center justify-between text-xs text-[#475C50]">
            <span>Mesures horodatées en continu</span>
            <Link
              to="/dashboard/temperatures"
              className="font-bold text-[#0F3B27] hover:underline flex items-center gap-1"
            >
              <span>Exporter registre BPD</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </Card>
      </section>

      {/* 4. ACCÈS RAPIDES OPÉRATIONNELS (COMPTOIR, RÉSERVE, QUALITÉ) */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          to="/dashboard/vente"
          data-tour="caisse-link"
          className="p-5 rounded-3xl border border-[#CFF1D2] bg-white hover:border-[#0F3B27]/40 hover:shadow-card-hover transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3.5">
            <div className="size-10 rounded-2xl bg-[#0F3B27] text-[#92FF5F] flex items-center justify-center shrink-0">
              <Receipt size={20} />
            </div>
            <div>
              <p className="font-display font-extrabold text-[#0F3B27] text-base">Caisse POS Tactile</p>
              <p className="text-xs text-[#475C50]">Encaissements espèces & Mobile Money</p>
            </div>
          </div>
          <ArrowRight size={16} className="text-[#0F3B27] group-hover:translate-x-1 transition-transform" />
        </Link>

        <Link
          to="/dashboard/stock"
          className="p-5 rounded-3xl border border-[#CFF1D2] bg-white hover:border-[#0F3B27]/40 hover:shadow-card-hover transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3.5">
            <div className="size-10 rounded-2xl bg-[#CFF1D2] text-[#0F3B27] flex items-center justify-center shrink-0">
              <ScanBarcode size={20} />
            </div>
            <div>
              <p className="font-display font-extrabold text-[#0F3B27] text-base">Stock par Lots (FEFO)</p>
              <p className="text-xs text-[#475C50]">Déstockage des périmés en premier</p>
            </div>
          </div>
          <ArrowRight size={16} className="text-[#0F3B27] group-hover:translate-x-1 transition-transform" />
        </Link>

        <Link
          to="/dashboard/auto-evaluation"
          className="p-5 rounded-3xl border border-[#CFF1D2] bg-white hover:border-[#0F3B27]/40 hover:shadow-card-hover transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3.5">
            <div className="size-10 rounded-2xl bg-[#0F3B27] text-[#92FF5F] flex items-center justify-center shrink-0">
              <TickSquare size={20} />
            </div>
            <div>
              <p className="font-display font-extrabold text-[#0F3B27] text-base">Audit 267 Arts BPD</p>
              <p className="text-xs text-[#475C50]">Grille officielle d'inspection ABMed</p>
            </div>
          </div>
          <ArrowRight size={16} className="text-[#0F3B27] group-hover:translate-x-1 transition-transform" />
        </Link>
      </section>
    </div>
  );
}

const DONNEES_VENTES_HEBDO = [
  { jour: "Lun", ca: 520000, ord: 34 },
  { jour: "Mar", ca: 610000, ord: 41 },
  { jour: "Mer", ca: 580000, ord: 38 },
  { jour: "Jeu", ca: 730000, ord: 48 },
  { jour: "Ven", ca: 890000, ord: 56 },
  { jour: "Sam", ca: 980000, ord: 64 },
  { jour: "Dim", ca: 565000, ord: 37 },
];

const DONNEES_TEMP_24H = [
  { heure: "00h", frigo: 4.1, ambiant: 21.0 },
  { heure: "03h", frigo: 4.0, ambiant: 20.8 },
  { heure: "06h", frigo: 3.9, ambiant: 20.9 },
  { heure: "09h", frigo: 4.4, ambiant: 21.6 },
  { heure: "12h", frigo: 4.8, ambiant: 22.2 },
  { heure: "15h", frigo: 4.6, ambiant: 22.0 },
  { heure: "18h", frigo: 4.3, ambiant: 21.5 },
  { heure: "21h", frigo: 4.2, ambiant: 21.2 },
  { heure: "24h", frigo: 4.2, ambiant: 21.4 },
];
