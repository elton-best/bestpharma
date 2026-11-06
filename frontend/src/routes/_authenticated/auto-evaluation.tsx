import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckSquare,
  Award,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  FileText,
  Printer,
  Search,
  Filter,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  FileWarning,
  Download,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { toast } from "sonner";

import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { useOfficine } from "@/lib/officine-context";
import { telechargerCsv, imprimerFicheOfficielle } from "@/lib/export-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SelecteurFiltrable, type OptionSection } from "@/components/ui/selecteur-filtrable";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Champ, ColonneFiche, ModaleFiche } from "@/components/modules/modale";

export const Route = createFileRoute("/_authenticated/auto-evaluation")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Auto-évaluation qualité — BestPharma" },
      {
        name: "description",
        content: "Grille complète d’auto-évaluation, constats et suivi des actions correctives.",
      },
    ],
  }),
  component: PageAutoEvaluation,
});

function PageAutoEvaluation() {
  const { courante, aRole } = useOfficine();
  const queryClient = useQueryClient();
  const id = courante?.officine_id;

  const [chapitreFiltre, setChapitreFiltre] = useState<number | null>(null);
  const [recherche, setRecherche] = useState("");
  const [dialogCapa, setDialogCapa] = useState<any | null>(null);
  const [actionCapa, setActionCapa] = useState("");
  const [cause5m, setCause5m] = useState("");
  const [dialogRapport, setDialogRapport] = useState(false);
  const [enCours, setEnCours] = useState(false);

  // CHARGEMENT DE LA CAMPAGNE COURANTE ET DES ARTICLES
  const { data: campagneData, refetch, isError: erreurCampagne, isLoading: chargementCampagne } = useQuery({
    queryKey: ["auto-evaluation-campagne", id],
    enabled: !!id,
    queryFn: async () => {
      return api.get<any>(`/api/officines/${id}/auto-evaluation/campagne-courante`);
    },
  });

  // COTATION D'UN ARTICLE EN 1 CLIC
  async function coterArticle(evaluationId: string, nouvelleCotation: string) {
    if (!id) return;
    try {
      const res: any = await api.put(`/api/officines/${id}/auto-evaluation/evaluer/${evaluationId}`, {
        cotation: nouvelleCotation,
      });
      toast.success(`Article coté : ${nouvelleCotation.replace("_", " ")}`);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la cotation");
    }
  }

  // DÉCLENCHEMENT PLAN CAPA POUR UN ARTICLE EN ÉCART
  async function soumettreCapa(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !dialogCapa || !actionCapa) return;
    setEnCours(true);

    try {
      const res: any = await api.post(`/api/officines/${id}/auto-evaluation/generer-capa/${dialogCapa.id}`, {
        action_corrective: actionCapa,
        cause_principale: cause5m,
      });

      toast.success(res.message);
      setDialogCapa(null);
      setActionCapa("");
      setCause5m("");
      refetch();
      queryClient.invalidateQueries({ queryKey: ["nc-count", id] });
    } catch (err: any) {
      toast.error(err.message || "Erreur de génération CAPA");
    } finally {
      setEnCours(false);
    }
  }

  const campagne = campagneData?.campagne;
  const evaluations = campagneData?.evaluations ?? [];
  const stats = campagneData?.statistiques;
  const chapitres = campagneData?.synthese_chapitres ?? [];
  const scoreGlobal = stats?.score_global ?? campagne?.score_global ?? 0;

  // FILTRAGE LOCAL
  const articlesFiltres = evaluations.filter((a: any) => {
    if (chapitreFiltre !== null && a.chapitre_numero !== chapitreFiltre) return false;
    if (recherche.trim()) {
      const q = recherche.toLowerCase();
      return (
        (a.article_numero ?? "").toLowerCase().includes(q) ||
        (a.article_libelle ?? "").toLowerCase().includes(q) ||
        (a.chapitre_titre ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const exporterCsvAutoEvaluation = () => {
    if (!evaluations.length) {
      toast.info("Aucune donnée d'évaluation disponible.");
      return;
    }
    telechargerCsv(
      evaluations.map((a: any) => ({
        article: a.article_numero,
        chapitre: `Chapitre ${a.chapitre_numero} - ${a.chapitre_titre}`,
        libelle: a.article_libelle,
        cotation: a.cotation ? a.cotation.toUpperCase() : "NON_COTE",
        commentaire: a.commentaire || "",
      })),
      `Grille_AutoEvaluation_BPD_BestPharma_${new Date().toISOString().split("T")[0]}.csv`,
      [
        { cle: "article", entete: "Article BPD" },
        { cle: "chapitre", entete: "Chapitre" },
        { cle: "libelle", entete: "Exigence réglementaire" },
        { cle: "cotation", entete: "Cotation" },
        { cle: "commentaire", entete: "Observations & Preuves" },
      ]
    );
    toast.success("Grille d'auto-évaluation BPD exportée en CSV");
  };

  const imprimerRapportOfficielBpd = () => {
    const lignesChapitres = chapitres
      .map(
        (c: any) => `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Chapitre ${c.numero} : ${c.titre}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${c.total_articles}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center; color: #0F3B27; font-weight: bold;">${c.taux_conformite ?? 0} %</td>
        </tr>`
      )
      .join("");

    const html = `
      <div style="margin-bottom: 24px; padding: 16px; border: 2px solid #0F3B27; border-radius: 8px; background: #F7FBF8;">
        <h2 style="margin: 0 0 8px 0; color: #0F3B27;">RAPPORT ANNUEL D'AUTO-INSPECTION QUALITÉ BPD</h2>
        <p style="margin: 0; font-size: 13px; color: #475C50;">
          Établissement : <strong>${courante?.officine?.nom || "Officine BestPharma"}</strong> · Licence : <strong>${courante?.officine?.numero_licence || "En cours"}</strong> · Ville : <strong>${courante?.officine?.ville || "Cotonou"}</strong>
        </p>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #475C50;">
          Date de l'audit : <strong>${formatDate(new Date())}</strong> · Référentiel : <strong>Guide fourni</strong>
        </p>
      </div>

      <div style="display: flex; gap: 20px; margin-bottom: 24px;">
        <div style="flex: 1; padding: 16px; border: 1px solid #CFF1D2; border-radius: 8px; text-align: center; background: #ffffff;">
          <div style="font-size: 12px; color: #475C50; text-transform: uppercase;">Score Global de Conformité</div>
          <div style="font-size: 36px; font-weight: 900; color: #0F3B27; margin-top: 4px;">${scoreGlobal}%</div>
        </div>
        <div style="flex: 1; padding: 16px; border: 1px solid #CFF1D2; border-radius: 8px; text-align: center; background: #ffffff;">
          <div style="font-size: 12px; color: #475C50; text-transform: uppercase;">Articles Audités</div>
          <div style="font-size: 36px; font-weight: 900; color: #0F3B27; margin-top: 4px;">${evaluations.length}</div>
        </div>
      </div>

      <h3 style="color: #0F3B27; border-bottom: 2px solid #0F3B27; padding-bottom: 6px;">SYNTHÈSE CHAPITRE PAR CHAPITRE</h3>
      <table style="width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px;">
        <thead>
          <tr style="background: #0F3B27; color: white;">
            <th style="padding: 8px; border: 1px solid #0F3B27; text-align: left;">Chapitre du Guide BPD</th>
            <th style="padding: 8px; border: 1px solid #0F3B27; text-align: center; width: 100px;">Articles</th>
            <th style="padding: 8px; border: 1px solid #0F3B27; text-align: center; width: 140px;">Conformité</th>
          </tr>
        </thead>
        <tbody>
          ${lignesChapitres}
        </tbody>
      </table>

      <div style="margin-top: 30px; padding: 16px; border: 1px solid #f59e0b; background: #fffbeb; border-radius: 8px; font-size: 12px; color: #92400e;">
        <strong>Engagement Réglementaire :</strong> Les éventuels écarts identifiés font l'objet d'un plan d'actions correctives et préventives (CAPA) suivi conformément aux Bonnes Pratiques de Dispensation de l'Agence Béninoise du Médicament.
      </div>
    `;

    imprimerFicheOfficielle("Rapport d'Auto-Inspection Qualité BPD — BestPharma", html);
    toast.success("Rapport prêt pour impression.");
  };

  if (erreurCampagne) return <section role="alert" className="grid gap-3 rounded-xl border p-4"><h1 className="text-xl font-bold">Auto-évaluation indisponible</h1><p>La grille ne peut pas être chargée pour cette officine. Aucun résultat ne peut être affiché.</p><Button className="min-h-12 justify-self-start" onClick={() => refetch()}>Recharger la grille</Button></section>;
  if (chargementCampagne || !campagneData) return <p role="status">Chargement de la grille d’auto-évaluation…</p>;
  const nombreCotes = evaluations.filter((a: any) => !["non_evalue", "non_applicable"].includes(a.cotation)).length;
  return (
    <div className="grid gap-6">
      {campagneData?.referentiel_complet === false && aRole("promoteur", "pharmacien_titulaire", "pharmacien_adjoint", "rmq") && <section className="grid gap-3 rounded-xl border p-4">
        <p>Cette campagne utilise l’ancienne grille. Une nouvelle grille complète peut être ouverte ; les notes et les actions de l’ancienne campagne resteront conservées séparément.</p>
        <Button className="min-h-12 justify-self-start" disabled={enCours} onClick={async () => {
          setEnCours(true);
          try { await api.post(`/officines/${id}/auto-evaluation/nouvelle-complete`); await refetch(); }
          catch (e) { toast.error(e instanceof Error ? e.message : "Ouverture impossible."); }
          finally { setEnCours(false); }
        }}>Commencer une grille complète sans reprendre les notes</Button>
      </section>}
      {campagneData?.texte_a_relire && <p className="text-xs text-muted-foreground">Texte extrait du guide fourni, à relire avec le document source lors de l’évaluation.</p>}
      {/* HEADER & SCORE DE CONFORMITÉ GLOBAL */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Auto-évaluation qualité
            </h1>

          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Cotation en direct, génération d'actions CAPA et rapport d'auto-inspection pour l'autorité de santé.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={exporterCsvAutoEvaluation}
            variant="outline"
            className="gap-2 text-xs h-9 border-[#CFF1D2] text-[#0F3B27] hover:bg-[#CFF1D2]/20"
          >
            <Download className="size-3.5" /> Exporter Grille (CSV)
          </Button>
          <Button onClick={() => setDialogRapport(true)} variant="outline" className="gap-2 text-xs h-9">
            <Printer className="size-3.5" /> Rapport Officiel ABMed
          </Button>
        </div>
      </div>

      {/* BANNIÈRE COCKPIT QUALITÉ & SCORE GLOBAL BPD */}
      <div className="rounded-[10px] border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {/* Jauge / Badge radial de score */}
            <div className="relative size-24 sm:size-28 shrink-0 flex items-center justify-center rounded-[10px] bg-gradient-to-br from-[#0F3B27] to-[#164E35] text-white shadow-sm border border-[#92FF5F]/40">
              <div className="text-center">
                <span className="font-display text-3xl sm:text-4xl font-black text-[#92FF5F] tracking-tight">
                  {scoreGlobal}%
                </span>
                <span className="block text-[10px] font-bold text-[#CFF1D2] uppercase tracking-wider">
                  Conformité
                </span>
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-xl sm:text-2xl font-black text-[#0F3B27]">
                  Indice de Conformité Globale BPD
                </h2>
                <Badge className={scoreGlobal >= 80 ? "bg-[#0F3B27] text-[#92FF5F] border border-[#92FF5F]/50 rounded-[6px]" : scoreGlobal >= 50 ? "bg-[#FF7036] text-white rounded-[6px]" : "bg-red-600 text-white rounded-[6px]"}>
                  {!nombreCotes ? "Évaluation à réaliser" : scoreGlobal >= 80 ? "Score favorable sur les articles évalués" : scoreGlobal >= 50 ? "Actions à poursuivre" : "Écarts à traiter"}
                </Badge>
              </div>
              <p className="text-xs text-[#475C50] mt-1.5 max-w-xl font-medium leading-relaxed">
                Le score tient compte des exigences satisfaites et des écarts constatés.
                Les articles non applicables ou non évalués sont exclus du calcul.
              </p>
            </div>
          </div>

          {/* 4 Cartes statistiques percutantes avec bordures nettes */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full lg:w-auto shrink-0">
            <div className="p-3 rounded-[10px] border border-emerald-200 bg-emerald-50/60 text-center">
              <span className="text-emerald-800 text-[11px] font-bold block">Conformes</span>
              <p className="font-display font-black text-2xl text-emerald-700">{stats?.total_conformes ?? 0}</p>
              <span className="text-[10px] text-emerald-800 font-medium">Exigence satisfaite</span>
            </div>
            <div className="p-3 rounded-[10px] border border-amber-200 bg-amber-50/60 text-center">
              <span className="text-amber-800 text-[11px] font-bold block">Écarts min.</span>
              <p className="font-display font-black text-2xl text-amber-700">{stats?.total_ecarts_mineurs ?? 0}</p>
              <span className="text-[10px] text-amber-800 font-medium">Conformité partielle</span>
            </div>
            <div className="p-3 rounded-[10px] border border-red-200 bg-red-50/60 text-center">
              <span className="text-red-800 text-[11px] font-bold block">Écarts maj.</span>
              <p className="font-display font-black text-2xl text-red-700">{stats?.total_ecarts_majeurs ?? 0}</p>
              <span className="text-[10px] text-red-800 font-medium">CAPA requise</span>
            </div>
            <div className="p-3 rounded-[10px] border border-slate-200 bg-[#F7F9F7] text-center">
              <span className="text-[#475C50] text-[11px] font-bold block">Non évalués</span>
              <p className="font-display font-black text-2xl text-[#0F3B27]">{stats?.total_non_evalues ?? 0}</p>
              <span className="text-[10px] text-[#475C50] font-medium">À coter</span>
            </div>
          </div>
        </div>
      </div>

      {/* GRAPHIQUE RECHARTS : TAUX DE CONFORMITÉ PAR CHAPITRE DU GUIDE BPD (10 CHAPITRES) */}
      <Card className="rounded-[10px] border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Award className="size-5 text-[#0F3B27]" />
              <h3 className="font-display font-extrabold text-lg text-[#0F3B27]">
                Taux de Conformité par Chapitre (Guide BPD ABMed)
              </h3>
            </div>
            <p className="text-xs text-[#475C50] mt-0.5">
              Comparatif des chapitres. Cliquez sur une barre ou une carte pour filtrer les articles.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-bold shrink-0">
            <span className="flex items-center gap-1.5 text-emerald-800">
              <span className="size-2.5 rounded-full bg-[#0F3B27]" /> &ge;80% Conforme
            </span>
            <span className="flex items-center gap-1.5 text-amber-700">
              <span className="size-2.5 rounded-full bg-[#FF7036]" /> 50–79% Vigilance
            </span>
            <span className="flex items-center gap-1.5 text-red-700">
              <span className="size-2.5 rounded-full bg-red-600" /> &lt;50% Critique
            </span>
          </div>
        </div>

        {/* Le BarChart interactif Recharts */}
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chapitres.map((ch: any) => ({
                numero: `Ch. ${ch.numero}`,
                chapitreNum: ch.numero,
                titre: ch.titre,
                score: ch.score_chapitre,
                conformes: ch.conformes,
                total: ch.total_articles,
              }))}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              onClick={(data: any) => {
                if (data && data.activePayload && data.activePayload.length > 0) {
                  const num = data.activePayload[0].payload.chapitreNum;
                  setChapitreFiltre(chapitreFiltre === num ? null : num);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5ECE7" />
              <XAxis
                dataKey="numero"
                tick={{ fill: "#475C50", fontSize: 11, fontWeight: 700 }}
                axisLine={{ stroke: "#CFF1D2" }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: "#475C50", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0F3B27",
                  borderRadius: "16px",
                  border: "none",
                  color: "#FFFFFF",
                  fontSize: "12px",
                  fontWeight: 600,
                  boxShadow: "0 10px 25px -5px rgba(0,0,0,0.25)",
                }}
                formatter={(val: any, _name: any, item: any) => [
                  `${val}% (${item.payload.conformes}/${item.payload.total} articles conformes)`,
                  item.payload.titre,
                ]}
                labelStyle={{ color: "#92FF5F", fontWeight: 800 }}
              />
              <Bar dataKey="score" radius={[8, 8, 0, 0]}>
                {chapitres.map((entry: any, index: number) => {
                  const val = entry.score_chapitre;
                  const couleur = val >= 80 ? "#0F3B27" : val >= 50 ? "#FF7036" : "#dc2626";
                  return <Cell key={`cell-${index}`} fill={couleur} cursor="pointer" />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* SÉLECTEUR DÉROULANT FILTRABLE DES 10 CHAPITRES & RECHERCHE */}
      <div className="rounded-[10px] border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
          <div className="flex-1 max-w-xl">
            <SelecteurFiltrable
              id="selecteur-chapitres-bpd"
              etiquette="Chapitre du Guide BPD ABMed"
              placeholder="Filtrer par chapitre (Ch. 1 à 10)…"
              placeholderRecherche="Rechercher un chapitre (management, personnel, locaux, stockage, dispensation…)"
              valeur={chapitreFiltre === null ? "tous" : String(chapitreFiltre)}
              onChange={(val) => setChapitreFiltre(val === "tous" ? null : parseInt(val, 10))}
              options={[
                {
                  valeur: "tous",
                  libelle: "Tous les chapitres",
                  description: "Afficher l’ensemble des exigences de la grille.",
                  icone: <Award className="size-4 text-[#0F3B27]" />,
                  motsCles: ["tous", "complet", "grille", "global", "267"],
                },
                ...chapitres.map((ch: any) => ({
                  valeur: String(ch.numero),
                  libelle: `Ch. ${ch.numero} : ${ch.titre}`,
                  description: `${ch.score_chapitre}% de conformité · ${ch.conformes}/${ch.total_articles} conformes (${ch.processus})`,
                  icone: <CheckSquare className="size-4 text-[#0F3B27]" />,
                  motsCles: [String(ch.numero), (ch.titre ?? "").toLowerCase(), (ch.processus ?? "").toLowerCase()],
                })),
              ]}
            />
          </div>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
            <Input
              placeholder="Rechercher article (ex: 1.11, 4.18), mot-clé..."
              className="pl-9 h-11 text-xs rounded-[8px] border-slate-200"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
            />
          </div>
        </div>

        {/* Bannière de focus chapitre si filtré */}
        {chapitreFiltre !== null && (
          (() => {
            const chCourant = chapitres.find((c: any) => c.numero === chapitreFiltre);
            if (!chCourant) return null;
            return (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-[8px] bg-[#F7F9F7] border border-[#CFF1D2] text-xs">
                <div className="flex items-center gap-3">
                  <Badge className="bg-[#0F3B27] text-[#92FF5F] font-mono text-xs rounded-[6px]">
                    Ch. {chCourant.numero}
                  </Badge>
                  <div>
                    <span className="font-bold text-[#0F3B27]">{chCourant.titre}</span>
                    <span className="text-[#475C50] ml-2 font-mono">({chCourant.processus})</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[#475C50] font-medium">Score :</span>
                    <Badge
                      variant="outline"
                      className={`text-xs font-bold rounded-[6px] ${
                        chCourant.score_chapitre >= 80
                          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                          : chCourant.score_chapitre >= 50
                          ? "border-amber-300 bg-amber-50 text-amber-800"
                          : "border-red-300 bg-red-50 text-red-800"
                      }`}
                    >
                      {chCourant.score_chapitre}% ({chCourant.conformes}/{chCourant.total_articles} conf.)
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setChapitreFiltre(null)}
                    className="h-7 text-xs text-[#475C50] hover:text-[#0F3B27] hover:bg-white"
                  >
                    Effacer le filtre
                  </Button>
                </div>
              </div>
            );
          })()
        )}
      </div>

      {/* TABLEAU ERGONOMIQUE DE LA GRILLE D'ÉVALUATION */}
      <Card className="rounded-[10px] border border-slate-200 bg-white shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base text-slate-900 font-bold">
              Grille d'évaluation des articles ({articlesFiltres.length} affichés)
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Consignez vos constats, cotez les exigences et suivez les actions correctives liées.
            </CardDescription>
          </div>
          <Badge variant="secondary" className="font-mono text-xs w-fit rounded-[6px]">ABMed QAM-FI-003</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#F7F9F7] text-[#0F3B27] border-b border-slate-200 font-bold">
                <tr>
                  <th className="py-3 px-3.5 w-28">Réf. Article</th>
                  <th className="py-3 px-3.5 min-w-[280px]">Exigence et éléments observés</th>
                  <th className="py-3 px-3.5 w-36">Statut actuel</th>
                  <th className="py-3 px-3.5 text-center min-w-[340px]">Cotation en 1 clic</th>
                  <th className="py-3 px-3.5 text-right w-28">Action CAPA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {articlesFiltres.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      Aucun article ne correspond à votre filtre.
                    </td>
                  </tr>
                ) : (
                  articlesFiltres.map((art: any) => {
                    const estConforme = art.cotation === "conforme";
                    const estMineur = art.cotation === "ecart_mineur";
                    const estMajeur = art.cotation === "ecart_majeur";
                    const estNA = art.cotation === "non_applicable";

                    return (
                      <tr
                        key={art.id}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          estConforme
                            ? "bg-emerald-50/15"
                            : estMineur
                            ? "bg-amber-50/20"
                            : estMajeur
                            ? "bg-red-50/20"
                            : "bg-white"
                        }`}
                      >
                        <td className="py-3 px-3.5 align-top">
                          <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-[6px] bg-[#0F3B27] text-[#92FF5F] inline-block">
                            Art. {art.article_numero}
                          </span>
                          <div className="text-[10px] text-slate-500 font-mono mt-1">
                            Ch. {art.chapitre_numero} · {art.processus}
                          </div>
                        </td>

                        <td className="py-3 px-3.5 align-top space-y-1">
                          <p className="font-bold text-[#0F3B27] text-xs leading-relaxed">
                            {art.article_libelle}
                          </p>
                          {art.preuve && (
                            <p className="text-[11px] text-emerald-800 font-medium italic">
                              Élément observé : {art.preuve}
                            </p>
                          )}
                        </td>

                        <td className="py-3 px-3.5 align-top">
                          {estConforme ? (
                            <Badge className="bg-emerald-600 text-white text-[10px] rounded-[6px]">
                              Conforme (1 pt)
                            </Badge>
                          ) : estMineur ? (
                            <Badge className="bg-amber-500 text-white text-[10px] rounded-[6px]">
                              Écart mineur (0.5 pt)
                            </Badge>
                          ) : estMajeur ? (
                            <Badge className="bg-red-600 text-white text-[10px] rounded-[6px]">
                              Écart majeur (0 pt)
                            </Badge>
                          ) : estNA ? (
                            <Badge variant="outline" className="text-[10px] rounded-[6px] text-slate-600 border-slate-300">
                              Non applicable
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] rounded-[6px] border-amber-300 bg-amber-50 text-amber-800">
                              À coter
                            </Badge>
                          )}

                          {art.non_conformite && (
                            <div className="mt-1.5">
                              <span className="inline-flex items-center gap-1 font-mono text-[10px] text-red-700 font-bold bg-red-100 border border-red-200 px-1.5 py-0.5 rounded-[4px]">
                                <FileWarning className="size-3" /> CAPA : {art.non_conformite.numero_nc || "En cours"}
                              </span>
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-3.5 align-top">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => coterArticle(art.id, "conforme")}
                              className={`px-2.5 py-1.5 rounded-[6px] text-[11px] font-bold border transition-all ${
                                estConforme
                                  ? "bg-emerald-700 text-white border-emerald-700 shadow-sm"
                                  : "bg-white text-slate-700 border-slate-200 hover:border-emerald-600 hover:text-emerald-700 hover:bg-emerald-50/50"
                              }`}
                            >
                              Conforme
                            </button>

                            <button
                              type="button"
                              onClick={() => coterArticle(art.id, "ecart_mineur")}
                              className={`px-2.5 py-1.5 rounded-[6px] text-[11px] font-bold border transition-all ${
                                estMineur
                                  ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                                  : "bg-white text-slate-700 border-slate-200 hover:border-amber-600 hover:text-amber-700 hover:bg-amber-50/50"
                              }`}
                            >
                              Écart min.
                            </button>

                            <button
                              type="button"
                              onClick={() => coterArticle(art.id, "ecart_majeur")}
                              className={`px-2.5 py-1.5 rounded-[6px] text-[11px] font-bold border transition-all ${
                                estMajeur
                                  ? "bg-red-600 text-white border-red-600 shadow-sm"
                                  : "bg-white text-slate-700 border-slate-200 hover:border-red-600 hover:text-red-700 hover:bg-red-50/50"
                              }`}
                            >
                              Écart maj.
                            </button>

                            <button
                              type="button"
                              onClick={() => coterArticle(art.id, "non_applicable")}
                              className={`px-2 py-1.5 rounded-[6px] text-[11px] font-medium border transition-all ${
                                estNA
                                  ? "bg-slate-700 text-white border-slate-700"
                                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              N/A
                            </button>
                          </div>
                        </td>

                        <td className="py-3 px-3.5 align-top text-right">
                          {(estMineur || estMajeur) && !art.non_conformite ? (
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 text-[10px] px-2 rounded-[6px] font-bold"
                              onClick={() => setDialogCapa(art)}
                            >
                              Créer CAPA
                            </Button>
                          ) : art.non_conformite ? (
                            <span className="text-[10px] text-emerald-700 font-semibold">CAPA liée</span>
                          ) : (
                            <span className="text-[10px] text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modale de création rapide d'une action corrective */}
      <Dialog open={!!dialogCapa} onOpenChange={(o) => !o && setDialogCapa(null)}>
        <ModaleFiche
          titre="Ouvrir une action corrective"
          sousTitre="Cet écart devient une non-conformité liée, dont vous pourrez préciser le suivi."
          badge={<Badge variant="outline" className="border-[#CFF1D2] text-[#475C50]">Plan d'action qualité</Badge>}
          pied={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] text-[#475C50]">
                La fiche est créée avec le statut « ouverte » : elle reste au registre jusqu'à sa clôture.
              </p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button type="button" variant="outline" onClick={() => setDialogCapa(null)} className="h-12 rounded-xl sm:h-11">
                  Annuler
                </Button>
                <Button
                  type="submit"
                  form="formulaire-capa"
                  disabled={enCours || !actionCapa}
                  className="h-12 rounded-xl bg-[#0F3B27] font-bold text-white sm:h-11"
                >
                  Ouvrir la fiche
                </Button>
              </div>
            </div>
          }
        >
          <form id="formulaire-capa" onSubmit={soumettreCapa} className="grid gap-4 md:grid-cols-2">
            <ColonneFiche
              titre="Exigence non satisfaite"
              aide={`Article ${dialogCapa?.article_numero ?? ""} · ${dialogCapa?.chapitre_titre ?? ""}`}
            >
              <div className="rounded-xl border-2 border-[#CFF1D2] bg-[#F7F9F7] p-3">
                <p className="text-[11px] leading-relaxed text-[#475C50]">{dialogCapa?.article_libelle}</p>
              </div>
            </ColonneFiche>

            <ColonneFiche titre="Traitement" aide="Ce qui sera fait, et pourquoi le manquement est survenu.">
              <Champ label="Action corrective à mener" obligatoire>
                <Input
                  id="action"
                  placeholder="Rédiger la procédure manquante et former l'équipe"
                  value={actionCapa}
                  onChange={(e) => setActionCapa(e.target.value)}
                  required
                  autoFocus
                  className="h-11"
                />
              </Champ>
              <Champ
                label="Cause principale identifiée"
                aide="Méthode, personnel, matériel, milieu ou matière première : la cause oriente la correction."
              >
                <Input
                  id="cause"
                  placeholder="Procédure obsolète, formation à refaire…"
                  value={cause5m}
                  onChange={(e) => setCause5m(e.target.value)}
                  className="h-11"
                />
              </Champ>
            </ColonneFiche>
          </form>
        </ModaleFiche>
      </Dialog>

      {/* Rapport d'auto-inspection */}
      <Dialog open={dialogRapport} onOpenChange={setDialogRapport}>
        <ModaleFiche
          titre="Rapport d'auto-inspection qualité"
          sousTitre="Le bilan de l'officine sur le référentiel des bonnes pratiques de dispensation, chapitre par chapitre."

          pied={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] text-[#475C50]">
                Rapport à relire et à signer par le pharmacien responsable.
              </p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button variant="outline" onClick={() => setDialogRapport(false)} className="h-12 rounded-xl sm:h-11">
                  Fermer
                </Button>
                <Button onClick={imprimerRapportOfficielBpd} className="h-12 gap-2 rounded-xl bg-[#0F3B27] font-bold text-[#92FF5F] sm:h-11">
                  <Printer className="size-4" /> Imprimer le rapport
                </Button>
              </div>
            </div>
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <ColonneFiche titre="Officine inspectée" aide="Identité de l'établissement au jour de l'auto-inspection.">
              <div className="space-y-1 rounded-xl border-2 border-[#CFF1D2] bg-[#F7F9F7] p-4 text-xs">
                <p className="text-sm font-bold text-[#0F3B27]">{courante?.officine?.nom}</p>
                <p className="text-[#475C50]">
                  Licence : {courante?.officine?.numero_licence ?? "À renseigner"} · Ville : {courante?.officine?.ville ?? "À renseigner"}
                </p>
                <p className="text-[#475C50]">
                  Document préparé le {formatDate(new Date())}, à faire vérifier par les responsables de l’officine.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-xl border border-[#CFF1D2] p-3">
                  <span className="block text-[10px] uppercase tracking-wide text-[#475C50]">Score global</span>
                  <p className="text-xl font-black text-[#0F3B27]">{scoreGlobal} %</p>
                </div>
                <div className="rounded-xl border border-[#CFF1D2] p-3">
                  <span className="block text-[10px] uppercase tracking-wide text-[#475C50]">Exigences conformes</span>
                  <p className="text-xl font-black text-emerald-700">{stats?.total_conformes ?? 0}</p>
                </div>
                <div className="rounded-xl border border-[#CFF1D2] p-3">
                  <span className="block text-[10px] uppercase tracking-wide text-[#475C50]">Écarts mineurs</span>
                  <p className="text-xl font-black text-amber-700">{stats?.total_ecarts_mineurs ?? 0}</p>
                </div>
                <div className="rounded-xl border border-[#CFF1D2] p-3">
                  <span className="block text-[10px] uppercase tracking-wide text-[#475C50]">Écarts majeurs</span>
                  <p className="text-xl font-black text-red-700">{stats?.total_ecarts_majeurs ?? 0}</p>
                </div>
              </div>
            </ColonneFiche>

            <ColonneFiche titre="Détail par chapitre" aide="Chaque chapitre du guide, avec son taux de conformité.">
              <div className="divide-y divide-[#CFF1D2] rounded-xl border border-[#CFF1D2] text-xs">
                {chapitres.map((c: any) => (
                  <div key={c.numero} className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="text-[#475C50]">
                      <span className="font-bold text-[#0F3B27]">Chapitre {c.numero}</span> · {c.titre}
                    </span>
                    <span className="font-mono font-bold text-[#0F3B27]">{c.score_chapitre} %</span>
                  </div>
                ))}
              </div>
            </ColonneFiche>
          </div>
        </ModaleFiche>
      </Dialog>
    </div>
  );
}
