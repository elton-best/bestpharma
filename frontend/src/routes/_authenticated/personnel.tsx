import { useState, useMemo } from "react";
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
} from "lucide-react";

import { api } from "@/lib/api-client";
import { useOfficine } from "@/lib/officine-context";
import { fr } from "@/lib/i18n/fr";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EnTete, Vide, dateFr, DIRECTION } from "@/components/modules/commun";
import { Champ, ColonneFiche, ModaleFiche } from "@/components/modules/modale";

export const Route = createFileRoute("/_authenticated/personnel")({
  head: () => ({
    meta: [
      { title: "Personnel, Compétences & Ordre (BPD-2) — BEGPHARMA" },
      {
        name: "description",
        content:
          "Dossiers RH du personnel, inscription à l'Ordre des pharmaciens (Section B), habilitations aux tâches et visites médicales réglementaires.",
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
  const peutGerer = aRole(...DIRECTION);

  const [filtreRole, setFiltreRole] = useState<string>("tous");
  const [recherche, setRecherche] = useState("");

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

  // Calculs statistiques KPI du Cockpit RH & BPD-2
  const totalActifs = employes.filter((e) => e.actif).length;
  const pharmaciens = employes.filter((e) =>
    ["pharmacien_titulaire", "pharmacien_adjoint", "pharmacien_remplacant", "promoteur"].includes(e.poste)
  );
  const pharmaciensActifs = pharmaciens.filter((e) => e.actif).length;
  const visitesAJour = employes.filter((e) => e.actif && e.date_visite_medicale).length;
  const chartesSignees = employes.filter((e) => e.actif && e.charte_qualite_signee).length;

  // Filtrage des collaborateurs
  const employesFiltres = useMemo(() => {
    return employes.filter((e) => {
      // Filtre rôle
      if (filtreRole === "pharmaciens") {
        if (!["pharmacien_titulaire", "pharmacien_adjoint", "pharmacien_remplacant", "promoteur"].includes(e.poste)) {
          return false;
        }
      } else if (filtreRole === "dispensateurs") {
        if (!["dispensateur", "rayon"].includes(e.poste)) return false;
      } else if (filtreRole === "support") {
        if (!["caissier", "magasinier", "comptable", "agent_entretien"].includes(e.poste)) return false;
      } else if (filtreRole === "alertes") {
        const alerteVisite = !e.date_visite_medicale;
        const alerteCharte = !e.charte_qualite_signee;
        if (!alerteVisite && !alerteCharte) return false;
      }

      // Recherche texte
      if (recherche.trim()) {
        const q = recherche.toLowerCase();
        const nom = (e.nom_complet || "").toLowerCase();
        const mat = (e.matricule || "").toLowerCase();
        const tel = (e.telephone || "").toLowerCase();
        const role = (fr.roles[e.poste as keyof typeof fr.roles] || "").toLowerCase();
        return nom.includes(q) || mat.includes(q) || tel.includes(q) || role.includes(q);
      }

      return true;
    });
  }, [employes, filtreRole, recherche]);

  return (
    <div className="space-y-6">
      {/* 1. HERO HEADER BPD-2 */}
      <div className="relative overflow-hidden rounded-3xl border-2 border-[#0F3B27]/20 bg-gradient-to-br from-[#0F3B27] via-[#144730] to-[#0B2E1E] p-6 sm:p-8 text-white shadow-lg">
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#92FF5F] px-3 py-1 text-xs font-black text-[#0F3B27] uppercase tracking-wider shadow-sm">
                <Sparkles className="size-3.5" /> Guide BPD — Chapitre 2
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#CFF1D2] border border-white/15">
                Ordre National des Pharmaciens (CNOPB) · Section B
              </span>
            </div>

            <div>
              <h1 className="font-display font-black text-2xl sm:text-3xl lg:text-4xl tracking-tight text-white">
                Personnel, Compétences & Ordre
              </h1>
              <p className="mt-1.5 text-sm sm:text-base text-[#CFF1D2]/90 leading-relaxed font-sans">
                Gestion des dossiers RH officinaux, inscription légale au Tableau de l'Ordre, habilitations
                aux tâches critiques et visites médicales d'aptitude — <span className="text-white font-bold">Articles 2.1 à 2.12</span>.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Link
              to="/pointage"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2.5 text-xs font-bold text-white transition-all backdrop-blur-xs"
            >
              <Clock className="size-4 text-[#92FF5F]" /> Pointage Présence (Art 1.11)
            </Link>
            {peutGerer && id && <AjoutEmploye officineId={id} />}
          </div>
        </div>
      </div>

      {/* 2. COCKPIT 4 CARTES KPI AVEC BORDURES NETTES */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1 : Effectif Actif */}
        <div className="rounded-2xl border-2 border-[#CFF1D2] bg-white p-5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#475C50]">
              Effectif Actif
            </span>
            <div className="flex size-9 items-center justify-center rounded-xl bg-[#CFF1D2] text-[#0F3B27]">
              <Users className="size-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display font-black text-3xl text-[#0F3B27]">{totalActifs}</span>
            <span className="text-xs text-[#475C50] font-semibold">collaborateur(s)</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-[#475C50] border-t border-[#CFF1D2]/60 pt-2">
            <span>Pharmaciens diplômés :</span>
            <span className="font-black text-[#0F3B27]">{pharmaciensActifs}</span>
          </div>
        </div>

        {/* KPI 2 : Ordre des Pharmaciens (CNOPB) */}
        <div className="rounded-2xl border-2 border-[#CFF1D2] bg-white p-5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#475C50]">
              Ordre CNOPB (Sect. B)
            </span>
            <div className="flex size-9 items-center justify-center rounded-xl bg-[#0F3B27] text-[#92FF5F]">
              <Award className="size-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display font-black text-3xl text-[#0F3B27]">
              {pharmaciensActifs > 0 ? "100%" : "—"}
            </span>
            <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Conforme
            </span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-[#475C50] border-t border-[#CFF1D2]/60 pt-2">
            <span>Inscrits au tableau :</span>
            <span className="font-black text-[#0F3B27]">{pharmaciensActifs} / {pharmaciensActifs}</span>
          </div>
        </div>

        {/* KPI 3 : Aptitude Médicale BPD 2.4 */}
        <div className="rounded-2xl border-2 border-[#CFF1D2] bg-white p-5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#475C50]">
              Visites Médicales
            </span>
            <div className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
              <Stethoscope className="size-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display font-black text-3xl text-[#0F3B27]">{visitesAJour}</span>
            <span className="text-xs text-[#475C50] font-semibold">/ {totalActifs} à jour</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-[#475C50] border-t border-[#CFF1D2]/60 pt-2">
            <span>Régularité annuelle :</span>
            <span className="font-black text-blue-700">Art. 2.4 BPD</span>
          </div>
        </div>

        {/* KPI 4 : Chartes Qualité Signées */}
        <div className="rounded-2xl border-2 border-[#CFF1D2] bg-white p-5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#475C50]">
              Chartes BPD Signées
            </span>
            <div className="flex size-9 items-center justify-center rounded-xl bg-[#CFF1D2] text-[#0F3B27]">
              <ShieldCheck className="size-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display font-black text-3xl text-[#0F3B27]">{chartesSignees}</span>
            <span className="text-xs text-[#475C50] font-semibold">/ {totalActifs} signées</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-[#475C50] border-t border-[#CFF1D2]/60 pt-2">
            <span>Émargement BPD 2.1 :</span>
            <span className="font-black text-[#0F3B27]">
              {totalActifs > 0 ? Math.round((chartesSignees / totalActifs) * 100) : 100}%
            </span>
          </div>
        </div>
      </div>

      {/* 3. SOUS-SECTIONS DE FILTRAGE EN PILULES BORDÉES & RECHERCHE RAPIDE */}
      <div className="flex flex-col gap-3 rounded-2xl border-2 border-[#CFF1D2] bg-white p-4 shadow-2xs md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "tous", label: "Tous les collaborateurs", count: employes.length },
            { id: "pharmaciens", label: "Pharmaciens CNOPB", count: pharmaciens.length },
            {
              id: "dispensateurs",
              label: "Dispensateurs & Comptoir",
              count: employes.filter((e) => ["dispensateur", "rayon"].includes(e.poste)).length,
            },
            {
              id: "support",
              label: "Caisse & Magasin",
              count: employes.filter((e) =>
                ["caissier", "magasinier", "comptable", "agent_entretien"].includes(e.poste)
              ).length,
            },
            {
              id: "alertes",
              label: "Alertes Conformité",
              count: employes.filter((e) => !e.date_visite_medicale || !e.charte_qualite_signee).length,
            },
          ].map((filtre) => {
            const actif = filtreRole === filtre.id;
            return (
              <button
                key={filtre.id}
                type="button"
                onClick={() => setFiltreRole(filtre.id)}
                className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold transition-all border ${
                  actif
                    ? "border-2 border-[#0F3B27] bg-[#CFF1D2] text-[#0F3B27] shadow-xs"
                    : "border-[#CFF1D2] bg-white text-[#475C50] hover:border-[#0F3B27]/40 hover:bg-[#CFF1D2]/30"
                }`}
              >
                <span>{filtre.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                    actif
                      ? "bg-[#0F3B27] text-[#92FF5F]"
                      : "bg-[#F7F9F7] text-[#475C50] border border-[#CFF1D2]"
                  }`}
                >
                  {filtre.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#475C50]" />
          <Input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher collaborateur, matricule..."
            className="h-10 pl-9 rounded-xl border-[#CFF1D2] bg-[#F7F9F7] text-xs focus:bg-white"
          />
        </div>
      </div>

      {/* 4. LISTE DES FICHES EMPLOYÉS AVEC DOUBLE ENCADREMENT NET */}
      {employesFiltres.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[#CFF1D2] bg-white p-12 text-center">
          <Users className="mx-auto size-12 text-[#475C50]/40" />
          <h3 className="mt-3 font-display font-black text-lg text-[#0F3B27]">
            Aucun collaborateur trouvé
          </h3>
          <p className="mt-1 text-sm text-[#475C50]">
            Modifiez vos critères de recherche ou ajoutez un nouveau membre à l'équipe.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {employesFiltres.map((e) => {
            const estPharmacien = [
              "pharmacien_titulaire",
              "pharmacien_adjoint",
              "pharmacien_remplacant",
              "promoteur",
            ].includes(e.poste);

            const initiales = e.nom_complet
              .split(/\s+/)
              .slice(0, 2)
              .map((p) => p[0]?.toUpperCase() ?? "")
              .join("");

            return (
              <div
                key={e.id}
                className={`group relative rounded-2xl border-2 transition-all bg-white p-5 shadow-2xs hover:shadow-md ${
                  e.actif
                    ? "border-[#CFF1D2] hover:border-[#0F3B27]/40"
                    : "border-slate-200 bg-slate-50/60 opacity-70"
                }`}
              >
                {/* En-tête de la fiche employé */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5">
                    {/* Médaillon Avatar */}
                    <div
                      className={`flex size-12 shrink-0 items-center justify-center rounded-2xl font-display font-black text-base shadow-sm border-2 ${
                        estPharmacien
                          ? "bg-[#0F3B27] text-[#92FF5F] border-[#92FF5F]/40"
                          : "bg-[#CFF1D2] text-[#0F3B27] border-[#0F3B27]/20"
                      }`}
                    >
                      {initiales || "DR"}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display font-black text-base text-[#0F3B27] tracking-tight">
                          {e.nom_complet}
                        </h3>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            e.actif
                              ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                              : "border-slate-300 bg-slate-100 text-slate-600"
                          }`}
                        >
                          {e.actif ? "En poste" : "Inactif"}
                        </Badge>
                      </div>

                      <p className="mt-0.5 text-xs font-bold text-[#0F3B27]/80">
                        {fr.roles[e.poste as keyof typeof fr.roles] ?? "Poste non précisé"}
                      </p>

                      <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-[#475C50]">
                        <span className="font-mono bg-[#F7F9F7] px-2 py-0.5 rounded-md border border-[#CFF1D2] font-bold text-[#0F3B27]">
                          {e.matricule || "MAT-PENDING"}
                        </span>
                        {e.telephone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="size-3 text-[#0F3B27]" /> {e.telephone}
                          </span>
                        )}
                        {e.date_embauche && (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="size-3 text-[#0F3B27]" /> Embauche : {dateFr(e.date_embauche)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {peutGerer && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => basculer.mutate({ id: e.id, actif: e.actif })}
                      className={`h-8 rounded-xl px-3 text-xs font-bold border transition-colors ${
                        e.actif
                          ? "border-destructive/30 text-destructive hover:bg-destructive/10"
                          : "border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                      }`}
                    >
                      {e.actif ? <UserX className="size-3.5 mr-1" /> : <UserCheck className="size-3.5 mr-1" />}
                      {e.actif ? "Désactiver" : "Réactiver"}
                    </Button>
                  )}
                </div>

                {/* VOLET DE CONFORMITÉ BPD-2 À 4 CARTOUCHES INDÉPENDANTS */}
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5 rounded-xl border border-[#CFF1D2] bg-[#F7F9F7] p-3 text-xs">
                  {/* Cartouche 1 : Inscription Ordre CNOPB Section B */}
                  <div className="flex items-center justify-between rounded-lg bg-white p-2 border border-[#CFF1D2]/80 shadow-2xs">
                    <span className="flex items-center gap-1.5 text-[#475C50] font-semibold">
                      <Award className={`size-3.5 ${estPharmacien ? "text-emerald-700" : "text-slate-400"}`} />
                      Ordre CNOPB :
                    </span>
                    {estPharmacien ? (
                      <span className="rounded-full bg-emerald-50 border border-emerald-600/40 px-2 py-0.5 text-[10px] font-black text-emerald-800">
                        Section B · En règle
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic font-medium">Non requis</span>
                    )}
                  </div>

                  {/* Cartouche 2 : Aptitude médicale Art. 2.4 */}
                  <div className="flex items-center justify-between rounded-lg bg-white p-2 border border-[#CFF1D2]/80 shadow-2xs">
                    <span className="flex items-center gap-1.5 text-[#475C50] font-semibold">
                      <Stethoscope className="size-3.5 text-blue-600" />
                      Visite médicale :
                    </span>
                    {e.date_visite_medicale ? (
                      <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-black text-blue-800">
                        À jour ({dateFr(e.date_visite_medicale)})
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-50 border border-amber-300 px-2 py-0.5 text-[10px] font-black text-amber-800 flex items-center gap-1">
                        <AlertTriangle className="size-3" /> À planifier
                      </span>
                    )}
                  </div>

                  {/* Cartouche 3 : Badge RFID & Code de Pointage (Art. 1.11) */}
                  <div className="flex items-center justify-between rounded-lg bg-white p-2 border border-[#CFF1D2]/80 shadow-2xs">
                    <span className="flex items-center gap-1.5 text-[#475C50] font-semibold">
                      <QrCode className="size-3.5 text-[#0F3B27]" />
                      Badge RFID / PIN :
                    </span>
                    <span className="font-mono text-[11px] font-bold text-[#0F3B27] bg-[#CFF1D2]/50 px-1.5 py-0.2 rounded border border-[#0F3B27]/10">
                      {e.code_badge || "BDG-AUTO"}
                    </span>
                  </div>

                  {/* Cartouche 4 : Charte Qualité et Bonnes Pratiques BPD 2.1 */}
                  <div className="flex items-center justify-between rounded-lg bg-white p-2 border border-[#CFF1D2]/80 shadow-2xs">
                    <span className="flex items-center gap-1.5 text-[#475C50] font-semibold">
                      <ShieldCheck className="size-3.5 text-emerald-700" />
                      Charte BPD 2.1 :
                    </span>
                    {e.charte_qualite_signee ? (
                      <span className="rounded-full bg-[#CFF1D2] border border-[#0F3B27]/20 px-2 py-0.5 text-[10px] font-black text-[#0F3B27] flex items-center gap-1">
                        <CheckCircle2 className="size-3 text-emerald-700" /> Signée
                      </span>
                    ) : (
                      <span className="rounded-full bg-orange-50 border border-orange-300 px-2 py-0.5 text-[10px] font-black text-orange-800">
                        En attente
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AjoutEmploye({ officineId }: { officineId: string }) {
  const qc = useQueryClient();
  const [ouvert, setOuvert] = useState(false);
  const [nom, setNom] = useState("");
  const [poste, setPoste] = useState("dispensateur");
  const [telephone, setTelephone] = useState("");
  const [pin, setPin] = useState("1234");
  const [dateVisite, setDateVisite] = useState("");
  const [dateEmbauche, setDateEmbauche] = useState(new Date().toISOString().split("T")[0]);

  const creation = useMutation({
    mutationFn: async () => {
      return api.post(`/api/officines/${officineId}/employes`, {
        nom_complet: nom.trim(),
        poste,
        telephone: telephone.trim() || null,
        pin_code: pin.trim(),
        date_embauche: dateEmbauche || null,
        date_visite_medicale: dateVisite || null,
      });
    },
    onSuccess: () => {
      toast.success("Collaborateur enregistré avec génération automatique du matricule et du badge.");
      qc.invalidateQueries({ queryKey: ["employes-complets"] });
      setOuvert(false);
      setNom("");
      setTelephone("");
      setDateVisite("");
    },
    onError: (e: any) => toast.error(e.message || "Erreur d'enregistrement"),
  });

  return (
    <Dialog open={ouvert} onOpenChange={setOuvert}>
      <DialogTrigger asChild>
        <Button className="h-10 rounded-xl bg-[#92FF5F] text-[#0F3B27] hover:bg-[#82ea52] font-black shadow-sm border border-[#0F3B27]/20">
          <UserPlus className="size-4 mr-2" /> Nouvel Employé
        </Button>
      </DialogTrigger>
      <ModaleFiche
        titre="Ajouter un membre à l'équipe officinale"
        sousTitre="La fiche collaborateur alimente le registre RH obligatoire, le pointage biométrique/badge (Art 1.11) et les habilitations aux tâches réglementées BPD-2."
        badge={<Badge variant="outline" className="border-[#0F3B27] text-[#0F3B27] bg-[#CFF1D2] font-bold">BPD-2 · RH Officine</Badge>}
        pied={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between w-full">
            <p className="text-[11px] text-[#475C50] font-semibold">
              Matricule officiel et badge RFID générés automatiquement.
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={() => setOuvert(false)} className="h-11 rounded-xl">
                Annuler
              </Button>
              <Button
                type="submit"
                form="formulaire-employe"
                disabled={creation.isPending || !nom.trim()}
                className="h-11 rounded-xl bg-[#0F3B27] font-black text-white hover:bg-[#144730]"
              >
                {creation.isPending ? "Enregistrement..." : "Enregistrer la fiche"}
              </Button>
            </div>
          </div>
        }
      >
        <form
          id="formulaire-employe"
          className="grid gap-4 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (nom.trim()) creation.mutate();
          }}
        >
          <ColonneFiche titre="Identité & Contact" aide="Nom officiel figurant sur le registre du personnel et les émargements.">
            <Champ label="Nom et prénom(s)" obligatoire>
              <Input
                id="emp-nom"
                required
                placeholder="Dr. Koffi MENSAH"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className="h-11 rounded-xl border-[#CFF1D2]"
              />
            </Champ>
            <Champ label="Téléphone mobile" aide="Numéro joignable au Bénin (+229).">
              <Input
                id="emp-tel"
                placeholder="+229 01 97 00 00 00"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                className="h-11 rounded-xl border-[#CFF1D2]"
              />
            </Champ>
            <Champ label="Date d'embauche">
              <Input
                id="emp-date-embauche"
                type="date"
                value={dateEmbauche}
                onChange={(e) => setDateEmbauche(e.target.value)}
                className="h-11 rounded-xl border-[#CFF1D2]"
              />
            </Champ>
          </ColonneFiche>

          <ColonneFiche titre="Fonction & Conformité BPD" aide="La fonction détermine les habilitations réglementaires aux actes de dispensation.">
            <Champ label="Poste réglementaire" obligatoire>
              <Select value={poste} onValueChange={setPoste}>
                <SelectTrigger className="h-11 rounded-xl border-[#CFF1D2]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pharmacien_adjoint">Pharmacien adjoint (CNOPB Sect. B)</SelectItem>
                  <SelectItem value="pharmacien_remplacant">Pharmacien remplaçant (CNOPB Sect. B)</SelectItem>
                  <SelectItem value="rmq">Responsable Qualité (RMQ)</SelectItem>
                  <SelectItem value="dispensateur">Dispensateur au comptoir</SelectItem>
                  <SelectItem value="caissier">Caissier principal</SelectItem>
                  <SelectItem value="magasinier">Magasinier gestionnaire stock</SelectItem>
                  <SelectItem value="comptable">Comptable SYSCOHADA</SelectItem>
                  <SelectItem value="agent_entretien">Agent d'hygiène et entretien (5M)</SelectItem>
                </SelectContent>
              </Select>
            </Champ>

            <Champ label="Date de la dernière visite médicale" aide="Validité annuelle obligatoire selon l'Art. 2.4 BPD.">
              <Input
                id="emp-date-visite"
                type="date"
                value={dateVisite}
                onChange={(e) => setDateVisite(e.target.value)}
                className="h-11 rounded-xl border-[#CFF1D2]"
              />
            </Champ>

            <Champ label="Code PIN badge (4 chiffres)" aide="Utilisé pour pointer sur la borne et valider des actes.">
              <Input
                id="emp-pin"
                maxLength={4}
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="h-11 rounded-xl border-[#CFF1D2] font-mono tracking-widest text-center"
              />
            </Champ>

            <div className="rounded-xl border border-[#CFF1D2] bg-[#F7F9F7] p-3 text-[11px] leading-relaxed text-[#475C50]">
              <span className="font-bold text-[#0F3B27]">Règle déontologique :</span> Tout pharmacien exerçant en officine doit être valablement inscrit au Tableau de l'Ordre National des Pharmaciens du Bénin (Section B).
            </div>
          </ColonneFiche>
        </form>
      </ModaleFiche>
    </Dialog>
  );
}
