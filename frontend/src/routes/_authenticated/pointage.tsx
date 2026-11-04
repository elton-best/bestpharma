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
} from "lucide-react";
import { api } from "@/lib/api-client";
import { useOfficine } from "@/lib/officine-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EnTete, Vide, heureFr } from "@/components/modules/commun";

export const Route = createFileRoute("/_authenticated/pointage")({
  head: () => ({
    meta: [
      { title: "Pointage & Présence Pharmacien — BEGPHARMA" },
      { name: "description", content: "Pointage nominatif et respect de l'obligation de présence d'un pharmacien (art. 1.11 BPD)." },
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
      toast.success(p.type === "arrivee" ? "Arrivée enregistrée à l'heure serveur" : "Départ enregistré à l'heure serveur");
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

  return (
    <div className="grid gap-6">
      {/* EN-TÊTE OFFICIEL */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-black tracking-tight text-[#0F3B27]">
              Pointage des Présences (BPD-C09)
            </h1>
            <Badge className="bg-[#0F3B27] text-[#92FF5F] border-[#0F3B27]">Art. 1.11 ABMed</Badge>
          </div>
          <p className="mt-1 text-xs text-[#475C50] max-w-xl">
            L'horodatage serveur certifié fait foi. La présence continue d'au moins un pharmacien diplômé et inscrit à l'Ordre est légalement obligatoire pendant l'ouverture.
          </p>
        </div>

        {/* Horloge numérique en direct Porto-Novo (Bénin) */}
        <div className="rounded-2xl border-2 border-[#0F3B27] bg-[#0F3B27] p-3 text-white shadow-md flex items-center gap-3 shrink-0">
          <div className="p-2 rounded-xl bg-[#164E35] text-[#92FF5F]">
            <Clock className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <div className="font-mono font-black text-xl text-[#92FF5F] tracking-wider leading-none">
              {heureBenin || "--:--:--"}
            </div>
            <div className="text-[10px] text-[#CFF1D2] font-semibold capitalize mt-0.5">
              {dateBenin || "Cotonou (GMT+1)"}
            </div>
          </div>
        </div>
      </div>

      {/* HERO BANNER DE CONFORMITÉ RÉGLEMENTAIRE (ART. 1.11 ABMed) */}
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
                pharmacienPresent
                  ? "bg-[#92FF5F] text-[#0F3B27]"
                  : "bg-red-600 text-white"
              }`}
            >
              {pharmacienPresent ? <ShieldCheck className="w-8 h-8" /> : <ShieldAlert className="w-8 h-8" />}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className={`font-display text-lg sm:text-xl font-black ${pharmacienPresent ? "text-white" : "text-red-900"}`}>
                  {pharmacienPresent
                    ? "Conformité BPD Active : Présence Pharmaceutique Conforme"
                    : "ALERTE RÉGLEMENTAIRE : Aucun pharmacien pointé sur place !"}
                </h2>
                <Badge
                  className={
                    pharmacienPresent
                      ? "bg-[#92FF5F] text-[#0F3B27] font-extrabold uppercase text-[10px]"
                      : "bg-red-600 text-white font-extrabold uppercase text-[10px]"
                  }
                >
                  {pharmacienPresent ? "Dispensation Autorisée" : "Dispensation Interdite"}
                </Badge>
              </div>

              <p className={`text-xs mt-1.5 max-w-2xl leading-relaxed ${pharmacienPresent ? "text-[#CFF1D2]" : "text-red-800"}`}>
                {pharmacienPresent ? (
                  <span>
                    Conformément à l'article 1.11 du Guide BPD de l'ABMed, la présence effective est certifiée. Les délivrances de toutes catégories (listes I, II, stupéfiants et conseil) sont juridiquement couvertes.
                  </span>
                ) : (
                  <span>
                    Conformément à l'article 1.11 du Guide BPD de l'ABMed, l'officine ne peut délivrer aucun médicament sans la présence physique continue d'un pharmacien diplômé.
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
              <span className="text-[10px] opacity-75">Employés pointés</span>
            </div>
            <div className={`p-3 rounded-2xl border text-center ${pharmacienPresent ? "bg-white/10 border-white/20 text-white" : "bg-white border-red-200 text-red-900"}`}>
              <span className="text-[10px] font-bold block uppercase tracking-wider opacity-80">Pharmaciens</span>
              <p className="font-display font-black text-2xl mt-0.5">{pharmaciensSurPlace.length}</p>
              <span className="text-[10px] opacity-75">Inscrits Ordre</span>
            </div>
          </div>
        </div>
      </div>

      {/* GRILLE DU PERSONNEL AVEC CARTES BORDÉES ET ACTIONS RAPIDES */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-black text-base text-[#0F3B27] flex items-center gap-2">
            <Users className="w-5 h-5 text-[#0F3B27]" /> Équipe de l'officine ({employes.length} membres)
          </h3>
          <span className="text-xs text-[#475C50] font-medium">Pointage express en 1 clic</span>
        </div>

        {employes.length === 0 ? (
          <Vide texte="Aucun employé enregistré dans l'officine." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {employes.map((e: any) => {
              const d = dernier(e.id);
              const present = d?.type === "arrivee";
              const estPharmacien = ["pharmacien_titulaire", "pharmacien_adjoint", "pharmacien_remplacant", "promoteur"].includes(e.poste);
              const initiales = (e.nom_complet || "E")
                .split(/\s+/)
                .slice(0, 2)
                .map((s: string) => s[0]?.toUpperCase() ?? "")
                .join("");

              return (
                <div
                  key={e.id}
                  className={`rounded-2xl border-2 p-4.5 bg-white shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-4 ${
                    present
                      ? "border-[#0F3B27] ring-2 ring-[#92FF5F]/40 bg-[#CFF1D2]/10"
                      : "border-[#CFF1D2] hover:border-[#0F3B27]/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {/* Avatar avec initiales */}
                      <div
                        className={`size-11 rounded-2xl flex items-center justify-center font-display font-black text-sm shrink-0 shadow-sm border ${
                          present
                            ? "bg-[#0F3B27] text-[#92FF5F] border-[#92FF5F]/40"
                            : "bg-[#F7F9F7] text-[#475C50] border-[#CFF1D2]"
                        }`}
                      >
                        {initiales}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="font-display font-bold text-base text-[#0F3B27]">{e.nom_complet}</p>
                          {estPharmacien && (
                            <Badge className="bg-[#0F3B27] text-[#92FF5F] border-[#0F3B27] text-[10px]">
                              Pharmacien diplômé
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-[#475C50] font-medium mt-0.5">
                          Matricule : <span className="font-mono font-bold text-[#0F3B27]">{e.matricule || "—"}</span>
                          {e.telephone ? ` · Tél : ${e.telephone}` : ""}
                        </p>
                      </div>
                    </div>

                    {/* Statut de présence badge */}
                    <div className="shrink-0 text-right">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                          present
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        <span className={`size-2 rounded-full ${present ? "bg-emerald-600 animate-pulse" : "bg-slate-400"}`} />
                        {present ? "Sur place" : "Absent"}
                      </span>
                    </div>
                  </div>

                  {/* Ligne d'état & Bouton d'action */}
                  <div className="pt-3 border-t border-[#CFF1D2]/60 flex items-center justify-between gap-3">
                    <div className="text-xs text-[#475C50]">
                      {present ? (
                        <span className="font-bold text-[#0F3B27] flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Présent depuis {heureFr(d!.horodatage)}
                        </span>
                      ) : d ? (
                        <span className="text-[#475C50]">Parti à {heureFr(d.horodatage)}</span>
                      ) : (
                        <span className="italic text-[#475C50]">Non pointé aujourd'hui</span>
                      )}
                    </div>

                    <Button
                      size="sm"
                      variant={present ? "outline" : "default"}
                      disabled={pointer.isPending}
                      className={`h-9 min-w-32 rounded-xl text-xs font-bold gap-1.5 transition-all ${
                        present
                          ? "border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800"
                          : "bg-[#0F3B27] text-[#92FF5F] hover:bg-[#164E35] shadow-sm"
                      }`}
                      onClick={() => pointer.mutate({ employe_id: e.id, type: present ? "depart" : "arrivee" })}
                    >
                      {present ? (
                        <>
                          <LogOut className="size-3.5" /> Pointer Départ
                        </>
                      ) : (
                        <>
                          <LogIn className="size-3.5" /> Pointer Arrivée
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* HISTORIQUE CHRONOLOGIQUE DES POINTAGES DU JOUR */}
      <Card className="rounded-3xl border border-[#CFF1D2] bg-white p-5 shadow-sm">
        <CardHeader className="p-0 pb-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-black text-[#0F3B27] flex items-center gap-2">
              <History className="size-4 text-[#0F3B27]" /> Journal Chronologique du Jour (Heure Serveur)
            </CardTitle>
            <CardDescription className="text-xs">
              Chaque arrivée et départ est scellé avec son horodatage officiel non modifiable.
            </CardDescription>
          </div>
          <Badge variant="outline" className="font-mono text-xs border-[#CFF1D2]">
            {pointages.length} pointage(s)
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          {pointages.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#475C50] rounded-2xl bg-[#F7F9F7] border border-dashed border-[#CFF1D2]">
              Aucun pointage enregistré aujourd'hui.
            </div>
          ) : (
            <div className="divide-y divide-[#CFF1D2]/50">
              {pointages.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-3 px-2 text-xs hover:bg-[#F7F9F7] rounded-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <span
                      className={`size-2.5 rounded-full ${
                        p.type === "arrivee" ? "bg-emerald-500" : "bg-amber-500"
                      }`}
                    />
                    <div>
                      <span className="font-bold text-[#0F3B27]">{p.employe_nom}</span>
                      <span className="text-[#475C50] ml-2 font-medium">({p.employe_poste})</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold ${
                        p.type === "arrivee"
                          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                          : "border-amber-300 bg-amber-50 text-amber-800"
                      }`}
                    >
                      {p.type === "arrivee" ? "Arrivée" : "Départ"}
                    </Badge>
                    <span className="font-mono font-bold text-xs text-[#0F3B27]">{heureFr(p.horodatage)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
