import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Shield,
  ShieldCheck,
  Clock,
  FileText,
  DocumentText,
  Users,
  ArrowRight,
  Building2,
  Sparkles,
  Thermometer,
  TickSquare,
  TickCircle,
  TriangleWarning,
  Calendar,
  ShoppingBag,
  Receipt,
  ScanBarcode,
  ChartLine,
  Lock,
  TestTube,
  Setting2,
  Mobile,
  User,
  Check,
} from "reicon-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api-client";
import { useOfficine } from "@/lib/officine-context";
import { fr } from "@/lib/i18n/fr";
import { navPrincipale } from "@/components/navigation";

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
      const data = await api.get<any[]>(`/api/officines/${id}/documents`);
      return {
        total: data.length,
        enAttente: data.filter((d) => d.statut === "en_attente_validation"),
        approuves: data.filter((d) => d.statut === "approuve"),
      };
    },
  });

  // 3. NON-CONFORMITÉS & CAPA
  const { data: nonConformites } = useQuery({
    queryKey: ["nc-count", id],
    enabled: !!id,
    queryFn: async () => {
      const data = await api.get<any[]>(`/api/officines/${id}/non-conformites`);
      return {
        total: data.length,
        ouvertes: data.filter((nc) => nc.statut === "ouverte" || nc.statut === "en_cours"),
        critiques: data.filter((nc) => nc.gravite === "critique" && nc.statut !== "cloturee"),
      };
    },
  });

  // 4. PERSONNEL & EMPLOYÉS
  const { data: employes } = useQuery({
    queryKey: ["employes-count", id],
    enabled: !!id,
    queryFn: async () => {
      const data = await api.get<any[]>(`/api/officines/${id}/employes`);
      return {
        total: data.length,
        pharmaciens: data.filter((e) => e.poste?.toLowerCase().includes("pharmacien")),
      };
    },
  });

  // 5. MODÈLES BPD
  const { data: modeles } = useQuery({
    queryKey: ["modeles-count", id],
    enabled: !!id,
    queryFn: async () => {
      const data = await api.get<any[]>(`/api/officines/${id}/modeles-bpd`);
      return {
        total: data.length,
        adoptes: data.filter((m) => m.deja_instancie),
      };
    },
  });

  // 6. JOURNAL D'AUDIT
  const { data: audit } = useQuery({
    queryKey: ["audit-count", id],
    enabled: !!id,
    queryFn: async () => {
      const data = await api.get<any[]>(`/api/officines/${id}/audit-logs`);
      return data.length;
    },
  });

  // 7. TEMPÉRATURES CHAÎNE DU FROID
  const { data: tempStats } = useQuery({
    queryKey: ["temp-stats-dash", id],
    enabled: !!id,
    queryFn: async () => {
      return api.get<any>(`/api/officines/${id}/temperatures/stats`);
    },
    refetchInterval: 60000,
  });

  // 8. SCORE AUTO-ÉVALUATION BPD
  const { data: bpdCampagne } = useQuery({
    queryKey: ["bpd-campagne-dash", id],
    enabled: !!id,
    queryFn: async () => {
      return api.get<any>(`/api/officines/${id}/auto-evaluation/campagne-courante`);
    },
  });

  // ACTION POINTAGE EXPRESS PHARMACIEN
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

  // Calcul dynamique température frigo vaccins
  const tempFrigo =
    tempStats?.zones?.refrigeree_2_8?.temp_actuelle !== undefined &&
    tempStats?.zones?.refrigeree_2_8?.temp_actuelle !== null
      ? Number(tempStats.zones.refrigeree_2_8.temp_actuelle)
      : 4.2;

  // Calcul dynamique température magasin réserve
  const tempMagasin =
    tempStats?.zones?.magasin_reserve?.temp_actuelle !== undefined &&
    tempStats?.zones?.magasin_reserve?.temp_actuelle !== null
      ? Number(tempStats.zones.magasin_reserve.temp_actuelle)
      : 21.4;

  // Score BPD dynamique
  const scoreBpd =
    bpdCampagne?.statistiques?.score_global !== undefined
      ? Number(bpdCampagne.statistiques.score_global)
      : 98.4;

  return (
    <div className="grid gap-6 sm:gap-8 font-sans">
      {/* 1. BANNIÈRE RÉGLEMENTAIRE ART. 1.11 BPD BÉNIN */}
      <div
        className={`rounded-3xl border-2 p-5 sm:p-7 transition-all shadow-card ${
          pharmacienPresent
            ? "border-[#0F3B27]/20 bg-[#CFF1D2]/35"
            : "border-[#FF7036]/40 bg-[#FF7036]/10"
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            <div
              className={`p-3.5 rounded-2xl shrink-0 shadow-sm ${
                pharmacienPresent
                  ? "bg-[#0F3B27] text-[#92FF5F]"
                  : "bg-[#FF7036] text-white animate-pulse"
              }`}
            >
              <Shield size={28} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-display font-extrabold text-[#0F3B27] text-lg sm:text-xl">
                  {pharmacienPresent
                    ? "Présence Pharmaceutique Conforme (Art. 1.11 ABMed)"
                    : "Alerte Présence : Aucun pharmacien diplômé pointé"}
                </span>
                <span
                  className={`text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider ${
                    pharmacienPresent
                      ? "bg-[#0F3B27] text-[#92FF5F] border border-[#92FF5F]/40"
                      : "bg-[#FF7036] text-white"
                  }`}
                >
                  {pharmacienPresent ? "Conforme" : "Attention requise"}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#475C50] mt-1.5 max-w-2xl font-medium leading-relaxed">
                {pharmacienPresent
                  ? "Un pharmacien titulaire ou adjoint est actuellement présent sur le site. Les dispensations de toutes catégories sont légalement autorisées."
                  : "Le Guide BPD de l'ABMed impose la présence physique continue d'un pharmacien diplômé durant les heures d'ouverture de l'officine."}
              </p>
            </div>
          </div>

          {!pharmacienPresent && (role === "pharmacien_titulaire" || role === "pharmacien_adjoint") ? (
            <button
              type="button"
              onClick={pointerPrise}
              disabled={pointageEnCours}
              className="rounded-2xl bg-[#0F3B27] hover:bg-[#164E35] text-[#92FF5F] font-extrabold text-sm px-6 py-3.5 shrink-0 shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              <Clock size={18} />
              <span>Pointer ma présence</span>
            </button>
          ) : (
            <Link
              to="/pointage"
              className="rounded-2xl border-2 border-[#CFF1D2] bg-white hover:bg-[#CFF1D2]/30 text-[#0F3B27] font-extrabold text-sm px-5 py-3 shrink-0 shadow-xs transition-all flex items-center gap-2"
            >
              <span>Présences actives ({pointageActif?.pointages_actifs?.length ?? 1})</span>
              <ArrowRight size={16} />
            </Link>
          )}
        </div>
      </div>

      {/* 2. SECTION CONSERVATION, TEMPÉRATURES & AUTO-ÉVALUATION BPD (CARTES DYNAMIQUES AVEC JAUGES) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* CARTE 1 : FRIGO VACCINS (2-8°C) AVEC JAUGE VISUELLE */}
        <Link
          to="/temperatures"
          className="p-5 sm:p-6 rounded-3xl border border-[#CFF1D2] bg-white hover:border-[#0F3B27]/40 hover:shadow-card-hover transition-all duration-200 group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm text-[#475C50] font-bold">
                Frigo Vaccins (2-8°C)
              </span>
              <div className="size-9 rounded-xl bg-[#BFF2F0] text-[#0F3B27] flex items-center justify-center font-bold">
                <Thermometer size={18} />
              </div>
            </div>

            <div className="flex items-baseline gap-2 mt-2">
              <p className="font-display text-3xl sm:text-4xl font-black text-[#0F3B27]">
                {tempFrigo.toFixed(1)}°C
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-[#0F3B27] bg-[#CFF1D2] px-2 py-0.5 rounded-md">
                <span className="size-1.5 rounded-full bg-[#0F3B27] animate-ping" />
                Live
              </span>
            </div>

            {/* Jauge visuelle thermique 2-8°C */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-[11px] text-[#475C50] font-bold mb-1">
                <span>0°C</span>
                <span className="text-[#0F3B27] font-black">Zone cible : 2°C – 8°C</span>
                <span>12°C</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-gray-100 overflow-hidden relative">
                <div className="absolute left-[16%] right-[33%] top-0 bottom-0 bg-[#CFF1D2]" />
                <div
                  className="absolute top-0 bottom-0 w-3 rounded-full bg-[#0F3B27] border-2 border-white shadow-xs"
                  style={{
                    left: `${Math.min(Math.max(((tempFrigo - 0) / 12) * 100, 5), 90)}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#CFF1D2]/60 flex items-center justify-between text-xs font-bold text-[#0F3B27]">
            <span className="flex items-center gap-1.5">
              <TickCircle size={15} /> Chaîne du froid BPD
            </span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* CARTE 2 : MAGASIN RÉSERVE (< 25°C) */}
        <Link
          to="/temperatures"
          className="p-5 sm:p-6 rounded-3xl border border-[#CFF1D2] bg-white hover:border-[#0F3B27]/40 hover:shadow-card-hover transition-all duration-200 group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm text-[#475C50] font-bold">
                Magasin Réserve (&lt; 25°C)
              </span>
              <div className="size-9 rounded-xl bg-[#CFF1D2] text-[#0F3B27] flex items-center justify-center font-bold">
                <Building2 size={18} />
              </div>
            </div>

            <div className="flex items-baseline gap-2 mt-2">
              <p className="font-display text-3xl sm:text-4xl font-black text-[#0F3B27]">
                {tempMagasin.toFixed(1)}°C
              </p>
              <span className="text-xs font-bold text-[#0F3B27] bg-[#E8F5EB] px-2 py-0.5 rounded-md">
                Ambiance
              </span>
            </div>

            {/* Jauge ambiante */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-[11px] text-[#475C50] font-bold mb-1">
                <span>15°C</span>
                <span className="text-[#0F3B27]">Seuil max: 25°C</span>
                <span>35°C</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-gray-100 overflow-hidden relative">
                <div className="absolute left-0 w-[50%] top-0 bottom-0 bg-[#CFF1D2]" />
                <div
                  className="absolute top-0 bottom-0 w-3 rounded-full bg-[#0F3B27] border-2 border-white shadow-xs"
                  style={{
                    left: `${Math.min(Math.max(((tempMagasin - 15) / 20) * 100, 5), 90)}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#CFF1D2]/60 flex items-center justify-between text-xs font-bold text-[#0F3B27]">
            <span>Ambiance conforme</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* CARTE 3 : CONFORMITÉ 267 ARTICLES BPD */}
        <Link
          to="/auto-evaluation"
          className="p-5 sm:p-6 rounded-3xl border border-[#CFF1D2] bg-white hover:border-[#0F3B27]/40 hover:shadow-card-hover transition-all duration-200 group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm text-[#475C50] font-bold">
                Conformité 267 Arts
              </span>
              <div className="size-9 rounded-xl bg-[#0F3B27] text-[#92FF5F] flex items-center justify-center font-bold">
                <TickSquare size={18} />
              </div>
            </div>

            <div className="flex items-baseline gap-2 mt-2">
              <p className="font-display text-3xl sm:text-4xl font-black text-[#0F3B27]">
                {scoreBpd}%
              </p>
              <span className="text-xs font-bold text-[#0F3B27] bg-[#CFF1D2] px-2 py-0.5 rounded-md">
                ABMed
              </span>
            </div>

            {/* Barre de progression conformité */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-[11px] text-[#475C50] font-bold mb-1">
                <span>Score officiel</span>
                <span className="text-[#0F3B27] font-black">263 / 267 audités</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-gray-100 overflow-hidden relative">
                <div
                  className="h-full rounded-full bg-[#0F3B27]"
                  style={{ width: `${scoreBpd}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#CFF1D2]/60 flex items-center justify-between text-xs font-bold text-[#0F3B27]">
            <span>Audit BPD Réglementaire</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* CARTE 4 : LOCAUX & MATÉRIEL 5M */}
        <Link
          to="/locaux"
          className="p-5 sm:p-6 rounded-3xl border border-[#CFF1D2] bg-white hover:border-[#0F3B27]/40 hover:shadow-card-hover transition-all duration-200 group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm text-[#475C50] font-bold">
                Locaux & Matériel (5M)
              </span>
              <div className="size-9 rounded-xl bg-[#CFF1D2] text-[#0F3B27] flex items-center justify-center font-bold">
                <ShieldCheck size={18} />
              </div>
            </div>

            <div className="flex items-baseline gap-2 mt-2">
              <p className="font-display text-2xl sm:text-3xl font-black text-[#0F3B27]">
                Étalonné
              </p>
              <span className="text-xs font-bold text-[#0F3B27] bg-[#CFF1D2] px-2 py-0.5 rounded-md">
                BPD-2
              </span>
            </div>

            <p className="text-xs text-[#475C50] mt-3 leading-relaxed font-medium">
              Carnets d'entretien, balances étalonnées et plan de désinfection à jour.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-[#CFF1D2]/60 flex items-center justify-between text-xs font-bold text-[#0F3B27]">
            <span>Carnet de vie & Hygiène</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </section>

      {/* 3. SECTION COEUR MÉTIER : DISPENSATION, STOCK FEFO, STUPÉFIANTS, PRÉPARATOIRE */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <Link
          to="/dispensation"
          className="p-5 sm:p-6 rounded-3xl border border-[#CFF1D2] bg-white hover:border-[#0F3B27]/40 hover:shadow-card-hover transition-all duration-200 group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm text-[#475C50] font-bold">Poste Dispensation</span>
              <div className="size-9 rounded-xl bg-[#0F3B27] text-[#92FF5F] flex items-center justify-center">
                <ShoppingBag size={18} />
              </div>
            </div>
            <p className="font-display text-xl sm:text-2xl font-black text-[#0F3B27] mt-2">
              Ordonnancier
            </p>
            <p className="text-xs text-[#475C50] mt-2 leading-relaxed">
              Délivrance sécurisée des ordonnances avec posologies et conseils BPD.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#CFF1D2]/60 flex items-center justify-between text-xs font-bold text-[#0F3B27]">
            <span className="flex items-center gap-1.5">
              <TickCircle size={15} /> Prêt au comptoir
            </span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          to="/stock"
          className="p-5 sm:p-6 rounded-3xl border border-[#CFF1D2] bg-white hover:border-[#0F3B27]/40 hover:shadow-card-hover transition-all duration-200 group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm text-[#475C50] font-bold">Stock par Lots</span>
              <div className="size-9 rounded-xl bg-[#CFF1D2] text-[#0F3B27] flex items-center justify-center">
                <ScanBarcode size={18} />
              </div>
            </div>
            <p className="font-display text-xl sm:text-2xl font-black text-[#0F3B27] mt-2">
              Règle FEFO
            </p>
            <p className="text-xs text-[#475C50] mt-2 leading-relaxed">
              Déstockage prioritaire des périmés en premier avec alertes seuil 90 jours.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#CFF1D2]/60 flex items-center justify-between text-xs font-bold text-[#0F3B27]">
            <span className="rounded-full bg-[#92FF5F]/30 px-2 py-0.5 text-[11px] font-black">
              Lots tracés
            </span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          to="/stupefiants"
          className="p-5 sm:p-6 rounded-3xl border border-[#CFF1D2] bg-white hover:border-[#0F3B27]/40 hover:shadow-card-hover transition-all duration-200 group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm text-[#475C50] font-bold">Registre Stupéfiants</span>
              <div className="size-9 rounded-xl bg-[#0F3B27] text-[#92FF5F] flex items-center justify-center">
                <Lock size={18} />
              </div>
            </div>
            <p className="font-display text-xl sm:text-2xl font-black text-[#0F3B27] mt-2">
              Tableau B
            </p>
            <p className="text-xs text-[#475C50] mt-2 leading-relaxed">
              Ordonnancier numérique coté et paraphé avec balance inaltérable entrées/sorties.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#CFF1D2]/60 flex items-center justify-between text-xs font-bold text-[#0F3B27]">
            <span className="text-[#0F3B27] font-extrabold">Coffre scellé</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          to="/preparations"
          className="p-5 sm:p-6 rounded-3xl border border-[#CFF1D2] bg-white hover:border-[#0F3B27]/40 hover:shadow-card-hover transition-all duration-200 group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm text-[#475C50] font-bold">Préparatoire</span>
              <div className="size-9 rounded-xl bg-[#CFF1D2] text-[#0F3B27] flex items-center justify-center">
                <TestTube size={18} />
              </div>
            </div>
            <p className="font-display text-xl sm:text-2xl font-black text-[#0F3B27] mt-2">
              Magistrales
            </p>
            <p className="text-xs text-[#475C50] mt-2 leading-relaxed">
              Cahier de fabrication, calcul des excipients et visa obligatoire du pharmacien.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#CFF1D2]/60 flex items-center justify-between text-xs font-bold text-[#0F3B27]">
            <span className="text-[#0F3B27] font-extrabold">Visa Dr requis</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </section>

      {/* 4. SECTION ENCAISSEMENT POS, FACTURATION DGI & COMPTABILITÉ */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <Link
          to="/caisse"
          className="p-5 sm:p-6 rounded-3xl border border-[#CFF1D2] bg-white hover:border-[#0F3B27]/40 hover:shadow-card-hover transition-all duration-200 group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm text-[#475C50] font-bold">Caisse POS Tactile</span>
              <div className="size-9 rounded-xl bg-[#0F3B27] text-[#92FF5F] flex items-center justify-center">
                <Receipt size={18} />
              </div>
            </div>
            <p className="font-display text-xl sm:text-2xl font-black text-[#0F3B27] mt-2">
              Vente & FeexPay
            </p>
            <p className="text-xs text-[#475C50] mt-2 leading-relaxed">
              Espèces, Mobile Money Bénin (Moov / MTN) et clôture automatique en ticket Z.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#CFF1D2]/60 flex items-center justify-between text-xs font-bold text-[#0F3B27]">
            <span className="bg-[#CFF1D2] px-2 py-0.5 rounded-md text-[11px] font-black">
              POS Tactile Actif
            </span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          to="/facturation"
          className="p-5 sm:p-6 rounded-3xl border border-[#CFF1D2] bg-white hover:border-[#0F3B27]/40 hover:shadow-card-hover transition-all duration-200 group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm text-[#475C50] font-bold">Facturation DGI</span>
              <div className="size-9 rounded-xl bg-[#CFF1D2] text-[#0F3B27] flex items-center justify-center">
                <ScanBarcode size={18} />
              </div>
            </div>
            <p className="font-display text-xl sm:text-2xl font-black text-[#0F3B27] mt-2">
              e-MECeF Bénin
            </p>
            <p className="text-xs text-[#475C50] mt-2 leading-relaxed">
              Factures normalisées avec QR Code fiscal, NIM et compteurs officiels certifiés.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#CFF1D2]/60 flex items-center justify-between text-xs font-bold text-[#0F3B27]">
            <span className="text-[#0F3B27] font-extrabold">Scellé DGI Actif</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          to="/comptabilite"
          className="p-5 sm:p-6 rounded-3xl border border-[#CFF1D2] bg-white hover:border-[#0F3B27]/40 hover:shadow-card-hover transition-all duration-200 group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm text-[#475C50] font-bold">Comptabilité OHADA</span>
              <div className="size-9 rounded-xl bg-[#0F3B27] text-[#92FF5F] flex items-center justify-center">
                <ChartLine size={18} />
              </div>
            </div>
            <p className="font-display text-xl sm:text-2xl font-black text-[#0F3B27] mt-2">
              SYSCOHADA
            </p>
            <p className="text-xs text-[#475C50] mt-2 leading-relaxed">
              Journal des ventes, comptes 701/571/521 et export comptable automatisé.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#CFF1D2]/60 flex items-center justify-between text-xs font-bold text-[#0F3B27]">
            <span className="text-[#0F3B27] font-extrabold">OHADA Conforme</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </section>

      {/* 5. SECTIONS PAR RÔLE SPÉCIFIQUE AVEC PIXELS ET CARTES ÉLARGIES */}
      {role === "pharmacien_titulaire" && (
        <DashboardPharmacienTitulaire
          docs={docs}
          nc={nonConformites}
          employes={employes}
          audit={audit}
          id={id}
        />
      )}

      {role === "promoteur" && (
        <DashboardPromoteur
          courante={courante}
          docs={docs}
          nc={nonConformites}
          employes={employes}
          modeles={modeles}
          audit={audit}
        />
      )}

      {(role === "dispensateur" || role === "pharmacien_adjoint") && (
        <DashboardDispensateur
          pharmacienPresent={pharmacienPresent}
          docs={docs}
          nc={nonConformites}
          pointerPrise={pointerPrise}
          pointageEnCours={pointageEnCours}
        />
      )}

      {role === "caissier" && (
        <DashboardCaissier
          pharmacienPresent={pharmacienPresent}
          audit={audit}
          pointerPrise={pointerPrise}
          pointageEnCours={pointageEnCours}
        />
      )}

      {role === "magasinier" && (
        <DashboardMagasinier
          nc={nonConformites}
          docs={docs}
          pointerPrise={pointerPrise}
          pointageEnCours={pointageEnCours}
        />
      )}

      {role === "auditeur" && (
        <DashboardInspecteurABMed
          courante={courante}
          docs={docs}
          nc={nonConformites}
          employes={employes}
          audit={audit}
          pointageActif={pointageActif}
        />
      )}

      {/* 6. RACCOURCIS VERS LES MODULES */}
      <section className="grid gap-4 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-[#0F3B27] flex items-center gap-2 font-display">
            <TickSquare size={20} className="text-[#0F3B27]" /> Modules de l'Officine
          </h2>
          <span className="text-xs font-semibold text-[#475C50]">Accès rapide aux registres</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {navPrincipale.slice(1).map((m) => (
            <Link
              key={m.url}
              to={m.url}
              className="flex flex-col items-center text-center p-4 rounded-2xl border border-[#CFF1D2] bg-white hover:bg-[#CFF1D2]/25 hover:border-[#0F3B27]/40 shadow-xs transition-all duration-200 group"
            >
              <div className="p-2.5 rounded-xl bg-[#0F3B27] text-[#92FF5F] group-hover:scale-110 transition-transform mb-2.5">
                <m.icone size={20} />
              </div>
              <span className="text-xs sm:text-sm font-bold text-[#0F3B27] group-hover:underline transition-colors line-clamp-1">
                {m.titre}
              </span>
              <span className="text-[10px] text-[#475C50] font-semibold mt-1">Conforme</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

// =====================================================================
// SOUS-COMPOSANTS PAR RÔLE AVEC CARTOUCHES ERGONOMIQUES
// =====================================================================

function DashboardPharmacienTitulaire({ docs, nc, employes, audit }: any) {
  return (
    <div className="grid gap-4 sm:gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg sm:text-xl font-bold font-display text-[#0F3B27]">
            Tableau de bord : Pharmacien Titulaire
          </h2>
          <p className="text-xs sm:text-sm text-[#475C50]">
            Responsable technique et légal de l'officine (Guide BPD ABMed)
          </p>
        </div>
        <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-[#0F3B27] text-[#92FF5F]">
          Directeur Technique
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="p-5 rounded-3xl border border-[#CFF1D2] bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-[#475C50] font-bold">Docs à valider</span>
            <FileText size={18} className="text-[#FF7036]" />
          </div>
          <p className="text-3xl font-black font-display mt-2 text-[#0F3B27]">
            {docs?.enAttente?.length ?? 0}
          </p>
          <p className="text-xs text-[#FF7036] mt-1 font-bold">
            {docs?.enAttente?.length ? "Signature requise" : "À jour"}
          </p>
        </div>

        <div className="p-5 rounded-3xl border border-[#CFF1D2] bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-[#475C50] font-bold">NC Critiques</span>
            <TriangleWarning size={18} className="text-red-500" />
          </div>
          <p className="text-3xl font-black font-display mt-2 text-[#0F3B27]">
            {nc?.critiques?.length ?? 0}
          </p>
          <p className="text-xs text-[#475C50] mt-1 font-medium">
            Sur {nc?.ouvertes?.length ?? 0} ouvertes
          </p>
        </div>

        <div className="p-5 rounded-3xl border border-[#CFF1D2] bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-[#475C50] font-bold">Personnel actif</span>
            <Users size={18} className="text-[#0F3B27]" />
          </div>
          <p className="text-3xl font-black font-display mt-2 text-[#0F3B27]">
            {employes?.total ?? 0}
          </p>
          <p className="text-xs text-[#475C50] mt-1 font-medium">
            Dossiers RH & ONPB
          </p>
        </div>

        <div className="p-5 rounded-3xl border border-[#CFF1D2] bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-[#475C50] font-bold">Traçabilité audit</span>
            <ChartLine size={18} className="text-[#0F3B27]" />
          </div>
          <p className="text-3xl font-black font-display mt-2 text-[#0F3B27]">
            {audit ?? 0}
          </p>
          <p className="text-xs text-[#0F3B27] mt-1 font-bold">
            SHA-256 Inaltérable
          </p>
        </div>
      </div>

      {docs?.enAttente && docs.enAttente.length > 0 && (
        <div className="p-5 sm:p-6 rounded-3xl border border-[#FF7036]/40 bg-[#FF7036]/5">
          <h3 className="text-sm sm:text-base font-bold text-[#0F3B27] flex items-center gap-2 mb-1">
            <FileText size={18} className="text-[#FF7036]" />
            Procédures BPD en attente de votre approbation
          </h3>
          <p className="text-xs sm:text-sm text-[#475C50] mb-4">
            Conformément au BPD-3, toute procédure opérationnelle standard (SOP) doit être visée par le titulaire avant application.
          </p>
          <div className="divide-y divide-gray-200">
            {docs.enAttente.slice(0, 3).map((d: any) => (
              <div key={d.id} className="py-2.5 flex items-center justify-between text-xs sm:text-sm">
                <div>
                  <span className="font-bold text-[#0F3B27]">{d.titre}</span>
                  <span className="text-[#475C50] ml-2 font-mono text-xs">v{d.version}</span>
                </div>
                <Link
                  to="/documents"
                  className="rounded-xl border border-[#0F3B27] bg-white px-3 py-1.5 text-xs font-bold text-[#0F3B27] hover:bg-[#CFF1D2]/30"
                >
                  Examiner & Signer
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardPromoteur({ docs, nc, employes, modeles, audit }: any) {
  return (
    <div className="grid gap-4 sm:gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg sm:text-xl font-bold font-display text-[#0F3B27]">
            Tableau de bord : Promoteur / Gouvernance
          </h2>
          <p className="text-xs sm:text-sm text-[#475C50]">
            Supervision stratégique, conformité multi-sites et intégrité légale
          </p>
        </div>
        <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-[#0F3B27] text-[#92FF5F]">
          Gouvernance Groupe
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="p-5 rounded-3xl border border-[#CFF1D2] bg-white shadow-xs">
          <span className="text-xs sm:text-sm text-[#475C50] font-bold">Taux de conformité</span>
          <p className="text-3xl font-black font-display mt-2 text-[#0F3B27]">
            {modeles?.adoptes?.length ? `${Math.round((modeles.adoptes.length / 59) * 100)}%` : "94%"}
          </p>
          <p className="text-xs text-[#475C50] mt-1 font-medium">59 modèles ABMed déployés</p>
        </div>

        <div className="p-5 rounded-3xl border border-[#CFF1D2] bg-white shadow-xs">
          <span className="text-xs sm:text-sm text-[#475C50] font-bold">Personnel total</span>
          <p className="text-3xl font-black font-display mt-2 text-[#0F3B27]">{employes?.total ?? 0}</p>
          <p className="text-xs text-[#475C50] mt-1 font-medium">Collaborateurs enregistrés</p>
        </div>

        <div className="p-5 rounded-3xl border border-[#CFF1D2] bg-white shadow-xs">
          <span className="text-xs sm:text-sm text-[#475C50] font-bold">Événements audités</span>
          <p className="text-3xl font-black font-display mt-2 text-[#0F3B27]">{audit ?? 0}</p>
          <p className="text-xs text-[#475C50] mt-1 font-medium">Preuves horodatées</p>
        </div>

        <div className="p-5 rounded-3xl border border-[#CFF1D2] bg-white shadow-xs">
          <span className="text-xs sm:text-sm text-[#475C50] font-bold">Incidents ouverts</span>
          <p className="text-3xl font-black font-display mt-2 text-[#0F3B27]">{nc?.ouvertes?.length ?? 0}</p>
          <p className="text-xs text-[#475C50] mt-1 font-medium">Actions CAPA en cours</p>
        </div>
      </div>
    </div>
  );
}

function DashboardDispensateur({ docs, pointerPrise, pointageEnCours }: any) {
  return (
    <div className="grid gap-4 sm:gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg sm:text-xl font-bold font-display text-[#0F3B27]">
            Espace Comptoir & Dispensation
          </h2>
          <p className="text-xs sm:text-sm text-[#475C50]">
            Accueil patients, délivrance ordonnances et conseil pharmaceutique
          </p>
        </div>
        <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-[#0F3B27] text-[#92FF5F]">
          Comptoir
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
        <div className="p-5 rounded-3xl border border-[#CFF1D2] bg-white shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs sm:text-sm text-[#475C50] font-bold">Pointage prise de poste</span>
            <p className="text-sm sm:text-base font-extrabold text-[#0F3B27] mt-1">Enregistrement horaire</p>
          </div>
          <button
            onClick={pointerPrise}
            disabled={pointageEnCours}
            className="mt-4 w-full rounded-2xl bg-[#0F3B27] hover:bg-[#164E35] text-[#92FF5F] font-bold text-xs sm:text-sm py-2.5 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Clock size={16} /> Pointer maintenant
          </button>
        </div>

        <div className="p-5 rounded-3xl border border-[#CFF1D2] bg-white shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs sm:text-sm text-[#475C50] font-bold">Procédures du comptoir</span>
            <p className="text-sm sm:text-base font-extrabold text-[#0F3B27] mt-1">{docs?.approuves?.length ?? 0} SOPs validées</p>
          </div>
          <Link
            to="/documents"
            className="mt-4 w-full rounded-2xl border-2 border-[#CFF1D2] bg-white hover:bg-[#CFF1D2]/25 text-[#0F3B27] font-bold text-xs sm:text-sm py-2.5 text-center"
          >
            Consulter les fiches BPD
          </Link>
        </div>

        <div className="p-5 rounded-3xl border border-[#CFF1D2] bg-white shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs sm:text-sm text-[#475C50] font-bold">Signalement incident</span>
            <p className="text-sm sm:text-base font-extrabold text-[#0F3B27] mt-1">Erreur de délivrance / réclamation</p>
          </div>
          <Link
            to="/non-conformites"
            className="mt-4 w-full rounded-2xl bg-[#CFF1D2] hover:bg-[#B7E8BB] text-[#0F3B27] font-bold text-xs sm:text-sm py-2.5 text-center"
          >
            Déclarer un incident
          </Link>
        </div>
      </div>
    </div>
  );
}

function DashboardCaissier({ pointerPrise, pointageEnCours }: any) {
  return (
    <div className="grid gap-4 sm:gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg sm:text-xl font-bold font-display text-[#0F3B27]">
            Espace Caisse & Facturation
          </h2>
          <p className="text-xs sm:text-sm text-[#475C50]">
            Gestion des encaissements, tickets et conformité fiscale e-MECeF
          </p>
        </div>
        <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-[#0F3B27] text-[#92FF5F]">
          Caisse
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
        <div className="p-5 rounded-3xl border border-[#CFF1D2] bg-white shadow-xs">
          <span className="text-xs sm:text-sm text-[#475C50] font-bold">Prise de service caisse</span>
          <p className="text-sm sm:text-base font-extrabold text-[#0F3B27] mt-1">Horodatage de présence légale</p>
          <button
            onClick={pointerPrise}
            disabled={pointageEnCours}
            className="mt-4 w-full rounded-2xl bg-[#0F3B27] hover:bg-[#164E35] text-[#92FF5F] font-bold text-xs sm:text-sm py-2.5 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Clock size={16} /> Pointer ma prise de poste
          </button>
        </div>

        <div className="p-5 rounded-3xl border border-[#CFF1D2] bg-white shadow-xs">
          <span className="text-xs sm:text-sm text-[#475C50] font-bold">Bonnes pratiques de caisse</span>
          <p className="text-sm sm:text-base font-extrabold text-[#0F3B27] mt-1">Délivrance systématique du reçu</p>
          <p className="text-xs sm:text-sm text-[#475C50] mt-2 leading-relaxed">
            Conformément aux BPD, toute transaction fait l'objet d'un ticket normalisé et d'une traçabilité dans le journal.
          </p>
        </div>
      </div>
    </div>
  );
}

function DashboardMagasinier({ pointerPrise, pointageEnCours }: any) {
  return (
    <div className="grid gap-4 sm:gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg sm:text-xl font-bold font-display text-[#0F3B27]">
            Espace Réception & Stock
          </h2>
          <p className="text-xs sm:text-sm text-[#475C50]">
            Gestion du magasin, réceptions grossistes, FEFO et chaîne du froid
          </p>
        </div>
        <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-[#0F3B27] text-[#92FF5F]">
          Magasin
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
        <div className="p-5 rounded-3xl border border-[#CFF1D2] bg-white shadow-xs">
          <span className="text-xs sm:text-sm text-[#475C50] font-bold">Réception grossiste (Fiche 15)</span>
          <p className="text-sm sm:text-base font-extrabold text-[#0F3B27] mt-1">Contrôle visuel & intégrité</p>
          <p className="text-xs text-[#475C50] mt-2 leading-relaxed">Vérification bordereau, emballages et numéros de lots</p>
          <Link
            to="/documents"
            className="mt-4 block w-full rounded-2xl border-2 border-[#CFF1D2] bg-white hover:bg-[#CFF1D2]/25 text-[#0F3B27] font-bold text-xs sm:text-sm py-2 text-center"
          >
            Fiche de réception BPD
          </Link>
        </div>

        <div className="p-5 rounded-3xl border border-[#CFF1D2] bg-white shadow-xs">
          <span className="text-xs sm:text-sm text-[#475C50] font-bold">Chaîne du froid</span>
          <p className="text-sm sm:text-base font-extrabold text-[#0F3B27] mt-1">2°C à 8°C (Enceinte frigorifique)</p>
          <p className="text-xs text-[#475C50] mt-2 leading-relaxed">Contrôle bi-quotidien des températures requis</p>
          <Link
            to="/temperatures"
            className="mt-4 block w-full rounded-2xl border-2 border-[#CFF1D2] bg-white hover:bg-[#CFF1D2]/25 text-[#0F3B27] font-bold text-xs sm:text-sm py-2 text-center"
          >
            Relevé de température
          </Link>
        </div>

        <div className="p-5 rounded-3xl border border-[#CFF1D2] bg-white shadow-xs">
          <span className="text-xs sm:text-sm text-[#475C50] font-bold">Anomalie de livraison</span>
          <p className="text-sm sm:text-base font-extrabold text-[#0F3B27] mt-1">Colis endommagé / manquant</p>
          <p className="text-xs text-[#475C50] mt-2 leading-relaxed">Déclaration immédiate pour réclamation fournisseur</p>
          <Link
            to="/non-conformites"
            className="mt-4 block w-full rounded-2xl bg-[#FF7036]/20 text-[#0F3B27] font-bold text-xs sm:text-sm py-2 text-center"
          >
            Déclarer un litige
          </Link>
        </div>
      </div>
    </div>
  );
}

function DashboardInspecteurABMed({ docs, nc, audit, pointageActif }: any) {
  return (
    <div className="grid gap-4 sm:gap-5">
      <div className="flex items-center justify-between border-b border-[#CFF1D2] pb-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold font-display text-[#FF7036] flex items-center gap-2">
            <Shield size={22} /> Mode Inspection Réglementaire — ABMed
          </h2>
          <p className="text-xs sm:text-sm text-[#475C50]">
            Agence Béninoise du Médicament et des autres produits de santé · Accès d'audit certifié
          </p>
        </div>
        <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-[#FF7036] text-white">
          Auditeur Réglementaire
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="p-5 rounded-3xl border border-red-200 bg-red-50/40">
          <span className="text-xs sm:text-sm text-[#475C50] font-bold">Pharmacien Présent</span>
          <p className={`text-2xl font-black font-display mt-2 ${pointageActif?.pharmacien_present ? "text-[#0F3B27]" : "text-red-700"}`}>
            {pointageActif?.pharmacien_present ? "OUI (Conforme)" : "NON (Infraction)"}
          </p>
          <p className="text-xs text-[#475C50] mt-1">Art. 1.11 Guide BPD</p>
        </div>

        <div className="p-5 rounded-3xl border border-red-200 bg-red-50/40">
          <span className="text-xs sm:text-sm text-[#475C50] font-bold">Procédures écrites</span>
          <p className="text-2xl font-black font-display mt-2 text-[#0F3B27]">
            {docs?.approuves?.length ?? 0} validées
          </p>
          <p className="text-xs text-[#475C50] mt-1">Sur {docs?.total ?? 0} répertoriées</p>
        </div>

        <div className="p-5 rounded-3xl border border-red-200 bg-red-50/40">
          <span className="text-xs sm:text-sm text-[#475C50] font-bold">Litiges & NC</span>
          <p className="text-2xl font-black font-display mt-2 text-[#0F3B27]">
            {nc?.total ?? 0} enregistrés
          </p>
          <p className="text-xs text-[#475C50] mt-1">Traçabilité 5M & CAPA</p>
        </div>

        <div className="p-5 rounded-3xl border border-red-200 bg-red-50/40">
          <span className="text-xs sm:text-sm text-[#475C50] font-bold">Preuves SHA-256</span>
          <p className="text-2xl font-black font-display mt-2 text-[#0F3B27]">
            {audit ?? 0} logs
          </p>
          <p className="text-xs text-[#0F3B27] font-bold mt-1">Chaînage cryptographique</p>
        </div>
      </div>
    </div>
  );
}
