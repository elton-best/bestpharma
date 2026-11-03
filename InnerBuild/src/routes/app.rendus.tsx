import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Clock,
  Code2,
  ExternalLink,
  FileCheck2,
  FileCode2,
  Github,
  Plus,
  Rocket,
  ShieldCheck,
  Sparkles,
  Trophy,
} from "lucide-react";
import { appHead, Empty, PageHeader, Panel, Stat } from "@/components/app/AppShell";
import { useSubmissions, statusLabel, type Profile, useProfile } from "@/lib/learner";
import { useMyChallengeSubmissions, useChallenges } from "@/lib/challenges";
import { LearnerSubmissionViewer } from "@/components/app/LearnerSubmissionViewer";

export const Route = createFileRoute("/app/rendus")({
  head: appHead(
    "Mes Rendus & Projets — AI Factory",
    "Consultez l'historique et les corrections de vos travaux pratiques, projets et livrables de Hackathon."
  ),
  component: LearnerRendusPage,
});

function fdate(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function LearnerRendusPage() {
  const { data: profile } = useProfile();
  const { data: exerciseSubs = [], isLoading: loadingExercises } = useSubmissions();
  const { data: challengeSubs = [], isLoading: loadingChallenges } = useMyChallengeSubmissions();
  const { data: challenges = [] } = useChallenges();

  const [activeTab, setActiveTab] = useState<"all" | "exercises" | "challenges">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "validated" | "pending" | "changes">("all");

  const challengeMap = new Map(challenges.map((c) => [c.id, c]));

  // Combiner les statistiques
  const totalSubmissions = exerciseSubs.length + challengeSubs.length;
  const validatedCount =
    exerciseSubs.filter((s) => s.status === "validated").length +
    challengeSubs.filter((s) => s.status === "evaluated" || (s.status as string) === "validated").length;
  const pendingCount =
    exerciseSubs.filter((s) => s.status === "submitted" || s.status === "pending" || s.status === "review").length +
    challengeSubs.filter((s) => s.status === "submitted" || (s.status as string) === "in_review").length;
  const changesCount = exerciseSubs.filter((s) => s.status === "changes").length;

  // Filtrage des exercices
  const filteredExercises = exerciseSubs.filter((s) => {
    if (statusFilter === "validated") return s.status === "validated";
    if (statusFilter === "pending") return s.status === "submitted" || s.status === "pending" || s.status === "review";
    if (statusFilter === "changes") return s.status === "changes";
    return true;
  });

  // Filtrage des challenges
  const filteredChallenges = challengeSubs.filter((s) => {
    if (statusFilter === "validated") return s.status === "evaluated" || (s.status as string) === "validated";
    if (statusFilter === "pending") return s.status === "submitted" || (s.status as string) === "in_review";
    if (statusFilter === "changes") return false;
    return true;
  });

  const isLoading = loadingExercises || loadingChallenges;

  return (
    <>
      <PageHeader
        eyebrow="Portfolio & Évaluations"
        title="Mes Rendus & Projets"
        subtitle="Suivez en temps réel l'évaluation de vos travaux pratiques de cours, les retours des formateurs et les notes attribuées par le Jury du Hackathon InnerBuild."
        action={
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Link to="/app/pratique" className="btn-base btn-glow text-xs flex items-center gap-1.5 w-full sm:w-auto justify-center">
              <Code2 className="h-3.5 w-3.5" /> Studio de Pratique
            </Link>
            <Link to="/app/challenges" className="btn-base btn-ghost text-xs border border-line flex items-center gap-1.5 w-full sm:w-auto justify-center">
              <Trophy className="h-3.5 w-3.5 text-accent" /> Hackathons
            </Link>
          </div>
        }
      />

      {/* KPI Stats */}
      <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Stat label="Total Livrables" value={String(totalSubmissions)} hint="Travaux & Hackathons" />
        <Stat label="Validés & Approuvés" value={String(validatedCount)} hint="Code conforme DoD" />
        <Stat label="En relecture" value={String(pendingCount)} hint="Correction en cours" />
        <Stat label="À reprendre" value={String(changesCount)} hint="Itérations nécessaires" />
      </div>

      {/* Main Tabs */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div className="flex flex-wrap gap-2" role="tablist">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "all" ? "bg-ink text-paper shadow-xs" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Tous mes livrables ({totalSubmissions})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("exercises")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "exercises" ? "bg-ink text-paper shadow-xs" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Travaux de Cours ({exerciseSubs.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("challenges")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "challenges" ? "bg-ink text-paper shadow-xs" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Hackathons InnerBuild ({challengeSubs.length})
          </button>
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-1 text-xs">
          <span className="text-muted-foreground mr-1 hidden sm:inline">Statut :</span>
          {(
            [
              ["all", "Tous"],
              ["validated", "Validés"],
              ["pending", "En attente"],
              ["changes", "À reprendre"],
            ] as const
          ).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setStatusFilter(val)}
              className={`rounded px-2 py-1 text-[11px] font-semibold transition-colors ${
                statusFilter === val ? "bg-accent/15 text-accent font-bold" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      ) : (
        <div className="space-y-6">
          {/* Section 1 : Travaux Pratiques de Cours */}
          {(activeTab === "all" || activeTab === "exercises") && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-ink flex items-center gap-2">
                  <FileCode2 className="h-4 w-4 text-accent" />
                  Travaux Pratiques & Exercices de Cours ({filteredExercises.length})
                </h2>
                <Link to="/app/pratique" className="text-xs text-accent hover:underline font-semibold">
                  + Déposer un rendu
                </Link>
              </div>

              {filteredExercises.length ? (
                <div className="space-y-4">
                  {filteredExercises.map((s) => {
                    const st = statusLabel[s.status] || { label: s.status, cls: "bg-muted text-muted-foreground" };
                    return (
                      <Panel key={s.id} className="border-line/70 hover:border-accent/30 transition-all">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-line pb-3">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${st.cls}`}>
                              {s.status === "validated" ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                              {st.label}
                            </span>
                            <span className="font-bold text-ink text-sm sm:text-base">{s.title || "Exercice pratique"}</span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {s.grade != null && (
                              <span className="inline-flex items-center gap-1 font-bold text-emerald rounded-lg bg-emerald/10 px-2.5 py-1">
                                <Award className="h-3.5 w-3.5" /> Note : {s.grade}/100
                              </span>
                            )}
                            <span>Soumis le {fdate(s.created_at)}</span>
                          </div>
                        </div>

                        {/* Liens GitHub & Démo */}
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          {s.repo_url && (
                            <a
                              href={s.repo_url}
                              target="_blank"
                              rel="noreferrer"
                              className="btn-base btn-ghost text-xs border border-line inline-flex items-center gap-1.5"
                            >
                              <Github className="h-3.5 w-3.5" />
                              <span>Code GitHub</span>
                              <ExternalLink className="h-3 w-3 text-muted-foreground" />
                            </a>
                          )}
                          {s.demo_url && (
                            <a
                              href={s.demo_url}
                              target="_blank"
                              rel="noreferrer"
                              className="btn-base btn-ghost text-xs border border-line inline-flex items-center gap-1.5 text-accent"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              <span>Démo en ligne</span>
                            </a>
                          )}
                        </div>

                        {/* Retours et corrections du formateur */}
                        {s.feedback && (
                          <div className="mt-4 rounded-xl border border-line bg-muted/30 p-3.5 space-y-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
                              <Sparkles className="h-3 w-3" /> Retour de l'Admin / Formateur
                            </span>
                            <p className="text-xs text-ink/90 leading-relaxed whitespace-pre-wrap">{s.feedback}</p>
                          </div>
                        )}

                        {/* Détails et aperçu du code soumis */}
                        {s.notes && (
                          <div className="mt-4 pt-3 border-t border-line">
                            <LearnerSubmissionViewer
                              title={s.title}
                              notes={s.notes}
                              repoUrl={s.repo_url}
                              demoUrl={s.demo_url}
                            />
                          </div>
                        )}
                      </Panel>
                    );
                  })}
                </div>
              ) : (
                <Panel>
                  <Empty
                    title="Aucun travail pratique trouvé"
                    text={
                      statusFilter !== "all"
                        ? "Aucun rendu ne correspond à ce filtre."
                        : "Tu n'as pas encore soumis d'exercice. Rends-toi sur le Studio de Pratique pour démarrer !"
                    }
                    action={
                      <Link to="/app/pratique" className="btn-base btn-glow text-xs flex items-center gap-1.5">
                        <Plus className="h-3.5 w-3.5" /> Ouvrir le Studio de Pratique
                      </Link>
                    }
                  />
                </Panel>
              )}
            </div>
          )}

          {/* Section 2 : Projets de Hackathon InnerBuild */}
          {(activeTab === "all" || activeTab === "challenges") && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-ink flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-accent" />
                  Projets Hackathon InnerBuild ({filteredChallenges.length})
                </h2>
                <Link to="/app/challenges" className="text-xs text-accent hover:underline font-semibold">
                  Voir tous les challenges
                </Link>
              </div>

              {filteredChallenges.length ? (
                <div className="space-y-4">
                  {filteredChallenges.map((cs) => {
                    const ch = challengeMap.get(cs.challenge_id);
                    const isEvaluated = cs.status === "evaluated" || (cs.status as string) === "validated";
                    return (
                      <Panel key={cs.id} className="border-accent/25 hover:border-accent/40 transition-all">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-line pb-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                isEvaluated ? "bg-emerald/15 text-emerald" : "bg-accent/15 text-accent"
                              }`}
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                              {isEvaluated ? "Évalué par le Jury" : "En délibération"}
                            </span>
                            <span className="font-bold text-ink text-base">{cs.title || "Projet Hackathon"}</span>
                            {ch && (
                              <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground font-mono">
                                {ch.title}
                              </span>
                            )}
                          </div>

                          <span className="text-xs text-muted-foreground">
                            Soumis le {fdate(cs.submitted_at || cs.created_at)}
                          </span>
                        </div>

                        {cs.description && (
                          <p className="mt-3 text-xs sm:text-sm text-ink/80 leading-relaxed">
                            {cs.description}
                          </p>
                        )}

                        {/* Liens de démo et repo du challenge */}
                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          {cs.repo_url && (
                            <a
                              href={cs.repo_url}
                              target="_blank"
                              rel="noreferrer"
                              className="btn-base btn-ghost text-xs border border-line inline-flex items-center gap-1.5"
                            >
                              <Github className="h-3.5 w-3.5" />
                              <span>Dépôt GitHub</span>
                              <ExternalLink className="h-3 w-3 text-muted-foreground" />
                            </a>
                          )}
                          {cs.demo_url && (
                            <a
                              href={cs.demo_url}
                              target="_blank"
                              rel="noreferrer"
                              className="btn-base btn-glow text-xs inline-flex items-center gap-1.5"
                            >
                              <Rocket className="h-3.5 w-3.5" />
                              <span>Tester la Démo Live</span>
                            </a>
                          )}
                        </div>
                      </Panel>
                    );
                  })}
                </div>
              ) : (
                <Panel>
                  <Empty
                    title="Aucun projet Hackathon soumis"
                    text="Tu n'as pas encore soumis de projet pour les challenges InnerBuild. Inscris-toi à un challenge pour tenter de remporter les prix et distinctions !"
                    action={
                      <Link to="/app/challenges" className="btn-base btn-glow text-xs flex items-center gap-1.5">
                        <Trophy className="h-3.5 w-3.5" /> Découvrir les Hackathons
                      </Link>
                    }
                  />
                </Panel>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
