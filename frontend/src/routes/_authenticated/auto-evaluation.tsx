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
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { useOfficine } from "@/lib/officine-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  head: () => ({
    meta: [
      { title: "Auto-évaluation Qualité BPD (267 articles) — BEGPHARMA" },
      {
        name: "description",
        content: "Grille d'auto-évaluation et calcul du score de conformité aux 267 articles du Guide BPD ABMed.",
      },
    ],
  }),
  component: PageAutoEvaluation,
});

function PageAutoEvaluation() {
  const { courante } = useOfficine();
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
  const { data: campagneData, refetch } = useQuery({
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

  const evaluations = campagneData?.evaluations ?? [];
  const stats = campagneData?.statistiques;
  const chapitres = campagneData?.synthese_chapitres ?? [];
  const scoreGlobal = stats?.score_global ?? 0;

  // FILTRAGE LOCAL
  const articlesFiltres = evaluations.filter((a: any) => {
    if (chapitreFiltre !== null && a.chapitre_numero !== chapitreFiltre) return false;
    if (recherche.trim()) {
      const q = recherche.toLowerCase();
      return (
        a.article_numero.toLowerCase().includes(q) ||
        a.article_libelle.toLowerCase().includes(q) ||
        a.chapitre_titre.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="grid gap-6">
      {/* HEADER & SCORE DE CONFORMITÉ GLOBAL */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Auto-évaluation Qualité BPD
            </h1>
            <Badge variant="outline" className="border-primary/40 text-primary bg-primary/5">
              Guide ABMed · 267 Articles
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Cotation en direct, génération d'actions CAPA et rapport d'auto-inspection pour l'autorité de santé.
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => setDialogRapport(true)} variant="outline" className="gap-2 text-xs h-9">
            <Printer className="size-3.5" /> Rapport Officiel ABMed
          </Button>
        </div>
      </div>

      {/* BANNIÈRE SCORE GLOBAL BPD */}
      <Card className="border-2 border-primary/30 bg-gradient-to-r from-primary/10 via-background to-background shadow-sm">
        <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-primary text-primary-foreground font-display font-extrabold text-3xl shadow-md">
              {scoreGlobal}%
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground text-lg">Indice de Conformité Globale BPD</span>
                <Badge className={scoreGlobal >= 80 ? "bg-emerald-600" : scoreGlobal >= 50 ? "bg-amber-600" : "bg-red-600"}>
                  {scoreGlobal >= 80 ? "Niveau Conforme" : scoreGlobal >= 50 ? "Mise à niveau requise" : "Non Conforme"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                Calcul officiel : Conforme = 1 pt, Écart mineur = 0.5 pt, Écart majeur = 0 pt. Les articles non applicables sont exclus du dénominateur.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs shrink-0 w-full sm:w-auto">
            <div className="p-2.5 rounded-lg border bg-card">
              <span className="text-muted-foreground text-[11px]">Conformes</span>
              <p className="font-bold font-display text-lg text-emerald-600">{stats?.total_conformes ?? 0}</p>
            </div>
            <div className="p-2.5 rounded-lg border bg-card">
              <span className="text-muted-foreground text-[11px]">Écarts min.</span>
              <p className="font-bold font-display text-lg text-amber-600">{stats?.total_ecarts_mineurs ?? 0}</p>
            </div>
            <div className="p-2.5 rounded-lg border bg-card">
              <span className="text-muted-foreground text-[11px]">Écarts maj.</span>
              <p className="font-bold font-display text-lg text-red-600">{stats?.total_ecarts_majeurs ?? 0}</p>
            </div>
            <div className="p-2.5 rounded-lg border bg-card">
              <span className="text-muted-foreground text-[11px]">Non évalués</span>
              <p className="font-bold font-display text-lg text-muted-foreground">{stats?.total_non_evalues ?? 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SYNTHÈSE DES 10 CHAPITRES DU GUIDE BPD */}
      <section className="grid gap-3">
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
          <Award className="size-4 text-primary" /> Conformité par Chapitre du Guide BPD (10 Chapitres)
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {chapitres.map((ch: any) => {
            const actif = chapitreFiltre === ch.numero;
            return (
              <button
                key={ch.numero}
                type="button"
                onClick={() => setChapitreFiltre(actif ? null : ch.numero)}
                className={`p-3 rounded-xl border text-left transition-all text-xs flex flex-col justify-between ${
                  actif
                    ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[11px] font-mono text-primary">Ch. {ch.numero}</span>
                    <Badge variant="outline" className="text-[10px] px-1 py-0">{ch.score_chapitre}%</Badge>
                  </div>
                  <p className="font-semibold text-foreground text-xs mt-1.5 line-clamp-2">{ch.titre}</p>
                </div>
                <div className="mt-2 text-[10px] text-muted-foreground flex justify-between">
                  <span>{ch.conformes} / {ch.total_articles} conf.</span>
                  <span className="font-mono">{ch.processus}</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* FILTRES & RECHERCHE */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par article (ex: 1.11, 4.18, 5.20) ou mot-clé..."
            className="pl-9 h-9 text-xs"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
          />
        </div>
        {chapitreFiltre !== null && (
          <Button variant="ghost" size="sm" onClick={() => setChapitreFiltre(null)} className="text-xs h-9">
            Réinitialiser le filtre (Ch. {chapitreFiltre})
          </Button>
        )}
      </div>

      {/* LISTE DES ARTICLES ET MATRICE DE COTATION */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">
              Grille d'évaluation des articles ({articlesFiltres.length} affichés)
            </CardTitle>
            <CardDescription className="text-xs">
              Cliquez directement sur l'une des cotations pour mettre à jour la conformité et le score en direct.
            </CardDescription>
          </div>
          <Badge variant="secondary" className="font-mono text-xs">ABMed QAM-FI-003</Badge>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {articlesFiltres.map((art: any) => {
              const estConforme = art.cotation === "conforme";
              const estMineur = art.cotation === "ecart_mineur";
              const estMajeur = art.cotation === "ecart_majeur";
              const estNA = art.cotation === "non_applicable";

              return (
                <div
                  key={art.id}
                  className={`p-3.5 rounded-xl border transition-all text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    estConforme
                      ? "bg-emerald-500/5 border-emerald-500/30"
                      : estMineur
                      ? "bg-amber-500/5 border-amber-500/30"
                      : estMajeur
                      ? "bg-red-500/5 border-red-500/30"
                      : "bg-card border-border"
                  }`}
                >
                  <div className="space-y-1 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-muted text-foreground">
                        Art. {art.article_numero}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-medium">
                        Ch. {art.chapitre_numero} : {art.chapitre_titre} ({art.processus})
                      </span>
                      {art.non_conformite && (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-red-600 font-bold ml-2">
                          <FileWarning className="size-3" /> CAPA : {art.non_conformite.numero_nc || "En cours"}
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-foreground text-xs leading-relaxed">
                      {art.article_libelle}
                    </p>
                    {art.preuve && (
                      <p className="text-[11px] text-emerald-700 italic">Preuve : {art.preuve}</p>
                    )}
                  </div>

                  {/* BOUTONS DE COTATION DIRECTE */}
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={() => coterArticle(art.id, "conforme")}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition-all ${
                        estConforme
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                          : "bg-background text-muted-foreground hover:border-emerald-500 hover:text-emerald-600"
                      }`}
                    >
                      Conforme (1 pt)
                    </button>

                    <button
                      type="button"
                      onClick={() => coterArticle(art.id, "ecart_mineur")}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition-all ${
                        estMineur
                          ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                          : "bg-background text-muted-foreground hover:border-amber-500 hover:text-amber-600"
                      }`}
                    >
                      Écart mineur (0.5 pt)
                    </button>

                    <button
                      type="button"
                      onClick={() => coterArticle(art.id, "ecart_majeur")}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition-all ${
                        estMajeur
                          ? "bg-red-600 text-white border-red-600 shadow-sm"
                          : "bg-background text-muted-foreground hover:border-red-500 hover:text-red-600"
                      }`}
                    >
                      Écart majeur (0 pt)
                    </button>

                    <button
                      type="button"
                      onClick={() => coterArticle(art.id, "non_applicable")}
                      className={`px-2 py-1 rounded text-[11px] border transition-all ${
                        estNA
                          ? "bg-muted-foreground text-white border-muted-foreground"
                          : "bg-background text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      N/A
                    </button>

                    {(estMineur || estMajeur) && !art.non_conformite && (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 text-[10px] px-2 ml-1"
                        onClick={() => setDialogCapa(art)}
                      >
                        Créer CAPA
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Modale de création rapide d'une action corrective */}
      <Dialog open={!!dialogCapa} onOpenChange={(o) => !o && setDialogCapa(null)}>
        <ModaleFiche
          titre="Ouvrir une action corrective"
          sousTitre="Cette exigence non satisfaite devient une non-conformité suivie, avec un responsable et une échéance."
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
          badge={<Badge variant="outline" className="border-[#CFF1D2] text-[#475C50]">Guide BPD · ABMed</Badge>}
          pied={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] text-[#475C50]">
                Le rapport imprimé est daté et signé par le pharmacien responsable.
              </p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button variant="outline" onClick={() => setDialogRapport(false)} className="h-12 rounded-xl sm:h-11">
                  Fermer
                </Button>
                <Button onClick={() => window.print()} className="h-12 gap-2 rounded-xl bg-[#0F3B27] font-bold text-white sm:h-11">
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
                  Licence : {courante?.officine?.numero_licence ?? "En cours"} · Ville : {courante?.officine?.ville ?? "Cotonou"}
                </p>
                <p className="text-[#475C50]">
                  Audité le {formatDate(new Date())} par le pharmacien titulaire et le responsable qualité.
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
