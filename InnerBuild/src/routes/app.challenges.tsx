import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  FolderGit2,
  Github,
  KeyRound,
  Loader2,
  Rocket,
  Send,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { toast } from "@/components/ui/heroui-toast";
import { appHead, Empty, PageHeader, Panel, Stat } from "@/components/app/AppShell";
import { Markdown } from "@/components/app/AiChat";
import {
  useChallenges,
  useMyChallengeRegistrations,
  useMyChallengeSubmissions,
  useChallengeResults,
  useChallengeEvaluations,
  type Challenge,
} from "@/lib/challenges";
import { getD1SessionUser } from "@/lib/d1-session";
import { d1InsertServerFn, d1UpdateServerFn } from "@/lib/d1-data.functions";

export const Route = createFileRoute("/app/challenges")({
  head: appHead("Challenges & Hackathons", "Participe aux défis InnerBuild, livre des SaaS réels et gagne des dotations."),
  component: LearnerChallengesPage,
});

function LearnerChallengesPage() {
  const qc = useQueryClient();
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);

  const { data: challenges = [], isLoading } = useChallenges();
  const { data: myRegistrations = [] } = useMyChallengeRegistrations();
  const { data: mySubmissions = [] } = useMyChallengeSubmissions();

  const activeChallenges = challenges.filter((c) => c.status === "active" || c.status === "evaluation");
  const myRegMap = new Set(myRegistrations.map((r) => r.challenge_id));

  return (
    <>
      <PageHeader
        eyebrow="Hackathons & Recrutement"
        title="Challenges InnerBuild"
        subtitle="Conçois et livre des applications avec des agents IA en conditions réelles. Évaluations par jury d'experts, dotations et opportunités d'embauche."
      />

      {/* Section THE InnerBuild */}
      <div className="mb-6 rounded-2xl border border-accent/30 bg-gradient-to-r from-accent/10 via-card to-card p-5 sm:p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-accent/20 px-2.5 py-0.5 text-[10px] font-mono font-bold text-accent">
              <Sparkles className="h-3 w-3" />
              <span>THE INNERBUILD · HACKATHON OFFICIEL</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-ink">
              On ne forme pas des développeurs. On forge des <span className="text-accent">Frontend Killers</span>.
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Découvre le programme complet de 4 semaines, les 13 jurys d'experts indépendants, le système de notation à 7 dimensions et les opportunités d'embauche.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link
              to="/the-innerbuild"
              className="btn-base btn-glow text-xs inline-flex items-center gap-1.5 font-bold"
            >
              <span>En savoir plus sur The InnerBuild</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Stat label="Challenges ouverts" value={String(activeChallenges.length)} />
        <Stat label="Mes participations" value={String(myRegistrations.length)} />
        <Stat label="Projets déposés" value={String(mySubmissions.length)} />
        <Stat label="Dotation maximale" value={challenges[0]?.prize_pool || "500 000 F"} />
      </div>

      {selectedChallenge ? (
        <ChallengeDetailView
          challenge={selectedChallenge}
          isRegistered={myRegMap.has(selectedChallenge.id)}
          mySubmission={mySubmissions.find((s) => s.challenge_id === selectedChallenge.id)}
          onBack={() => setSelectedChallenge(null)}
          onRegistered={() => {
            qc.invalidateQueries({ queryKey: ["challenge_registrations"] });
          }}
          onSubmitted={() => {
            qc.invalidateQueries({ queryKey: ["challenge_submissions"] });
          }}
        />
      ) : (
        <div className="space-y-6">
          {isLoading ? (
            <Panel>
              <p className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Chargement des challenges…
              </p>
            </Panel>
          ) : !challenges.length ? (
            <Panel>
              <Empty
                title="Aucun challenge pour le moment"
                text="L'équipe d'administration prépare le prochain Hackathon InnerBuild. Reste à l'écoute !"
              />
            </Panel>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {challenges.map((c) => {
                const isReg = myRegMap.has(c.id);
                const isSub = mySubmissions.some((s) => s.challenge_id === c.id);
                const isOpen = c.status === "active";

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedChallenge(c)}
                    className="rounded-2xl border border-line bg-card p-6 hover:border-accent/40 transition-all cursor-pointer shadow-xs flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            isOpen
                              ? "bg-emerald/15 text-emerald"
                              : c.status === "evaluation"
                              ? "bg-blue-500/15 text-blue-500"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {isOpen ? "En cours" : c.status === "evaluation" ? "Délibération Jury" : "Terminé"}
                        </span>
                        <span className="rounded bg-accent/10 px-2 py-0.5 text-xs font-bold text-accent">
                          Dotation : {c.prize_pool}
                        </span>
                      </div>

                      <h3 className="mt-3 text-lg font-bold text-ink group-hover:text-accent transition-colors">
                        {c.title}
                      </h3>
                      <p className="mt-2 text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                        {c.description || "Consulte le brief complet du challenge pour participer."}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-line flex items-center justify-between">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" /> {c.duration_days} jours
                        </span>
                        {isReg && (
                          <span className="text-emerald font-bold flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" /> {isSub ? "Projet rendu" : "Inscrit"}
                          </span>
                        )}
                      </div>

                      <span className="text-xs font-bold text-accent group-hover:translate-x-0.5 transition-transform">
                        Voir le brief & Participer →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );
}

function ChallengeDetailView({
  challenge,
  isRegistered,
  mySubmission,
  onBack,
  onRegistered,
  onSubmitted,
}: {
  challenge: Challenge;
  isRegistered: boolean;
  mySubmission?: any;
  onBack: () => void;
  onRegistered: () => void;
  onSubmitted: () => void;
}) {
  const [busyReg, setBusyReg] = useState(false);
  const [title, setTitle] = useState(mySubmission?.title || "");
  const [repoUrl, setRepoUrl] = useState(mySubmission?.repo_url || "");
  const [demoUrl, setDemoUrl] = useState(mySubmission?.demo_url || "");
  const [description, setDescription] = useState(mySubmission?.description || "");
  const [busySub, setBusySub] = useState(false);

  const { data: results = [] } = useChallengeResults(challenge.id);
  const { data: evaluations = [] } = useChallengeEvaluations(challenge.id);

  const myEval = evaluations.find((e) => e.submission_id === mySubmission?.id);

  async function register() {
    setBusyReg(true);
    try {
      const session = getD1SessionUser();
      if (!session) throw new Error("Veuillez vous connecter.");

      const res = await d1InsertServerFn({
        data: {
          table: "challenge_registrations",
          row: {
            challenge_id: challenge.id,
            user_id: session.id,
            status: "accepted",
          },
        },
      });

      if (!res.success) throw new Error(res.error || "D1");

      // Notifications apprenant & admin
      try {
        await d1InsertServerFn({
          data: {
            table: "notifications",
            row: {
              user_id: session.id,
              title: "Inscription au Challenge validée",
              body: `Vous êtes désormais inscrit au challenge "${challenge.title}". Bonne chance !`,
              link: "/app/challenges",
            },
          },
        });

        await d1InsertServerFn({
          data: {
            table: "notifications",
            row: {
              user_id: "admin",
              title: "Nouvelle inscription au Challenge",
              body: `L'apprenant (${session.email}) s'est inscrit au challenge "${challenge.title}".`,
              link: "/admin/challenges",
            },
          },
        });
      } catch {
        /* notification fallback */
      }

      toast.success("Félicitations ! Vous êtes officiellement inscrit à ce challenge.");
      onRegistered();
    } catch (err: any) {
      toast.danger("Erreur d'inscription : " + err.message);
    } finally {
      setBusyReg(false);
    }
  }

  async function submitProject(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !repoUrl.trim()) {
      toast.danger("Veuillez renseigner au moins un titre et le lien du dépôt GitHub.");
      return;
    }
    setBusySub(true);

    try {
      const session = getD1SessionUser();
      if (!session) throw new Error("Non connecté.");

      const payload = {
        challenge_id: challenge.id,
        user_id: session.id,
        title: title.trim(),
        repo_url: repoUrl.trim(),
        demo_url: demoUrl.trim(),
        description: description.trim(),
        status: "submitted",
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (mySubmission) {
        const res = await d1UpdateServerFn({
          data: { table: "challenge_submissions", id: mySubmission.id, patch: payload },
        });
        if (!res.success) throw new Error(res.error || "D1");
      } else {
        const res = await d1InsertServerFn({
          data: { table: "challenge_submissions", row: payload },
        });
        if (!res.success) throw new Error(res.error || "D1");
      }

      // Notifications apprenant & admin
      try {
        await d1InsertServerFn({
          data: {
            table: "notifications",
            row: {
              user_id: session.id,
              title: "Projet Challenge transmis",
              body: `Votre projet "${title}" a bien été transmis au jury pour le challenge "${challenge.title}".`,
              link: "/app/challenges",
            },
          },
        });

        await d1InsertServerFn({
          data: {
            table: "notifications",
            row: {
              user_id: "admin",
              title: "Nouveau projet de Challenge soumis",
              body: `L'apprenant (${session.email}) a soumis son projet "${title}" pour le challenge "${challenge.title}".`,
              link: "/admin/challenges",
            },
          },
        });
      } catch {
        /* notification fallback */
      }

      toast.success("Projet transmis avec succès au Jury InnerBuild !");
      onSubmitted();
    } catch (err: any) {
      toast.danger("Erreur lors de la soumission : " + err.message);
    } finally {
      setBusySub(false);
    }
  }

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="btn-base btn-ghost text-xs inline-flex items-center gap-1.5">
        <ArrowLeft className="h-3.5 w-3.5" /> Retour à la liste des challenges
      </button>

      {/* Header Banner */}
      <div className="rounded-2xl border border-line bg-gradient-to-br from-card to-muted/30 p-6 sm:p-8 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full bg-emerald/15 px-3 py-1 text-xs font-bold text-emerald flex items-center gap-1.5">
            <Flame className="h-3.5 w-3.5" /> Challenge {challenge.status === "active" ? "Actif" : challenge.status}
          </span>
          <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-bold text-accent inline-flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5" /> Dotation globale : {challenge.prize_pool}
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">{challenge.title}</h1>
        <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">{challenge.description}</p>

        <div className="pt-2 flex flex-wrap items-center gap-4">
          {!isRegistered ? (
            <button
              disabled={busyReg || challenge.status !== "active"}
              onClick={register}
              className="btn-base btn-glow text-sm flex items-center gap-2"
            >
              <Rocket className="h-4 w-4" /> {busyReg ? "Inscription…" : "Participer à ce Challenge"}
            </button>
          ) : (
            <span className="rounded-xl border border-emerald/30 bg-emerald/10 px-4 py-2 text-xs font-bold text-emerald flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Tu es officiellement participant
            </span>
          )}
        </div>
      </div>

      {/* Submission Box (if registered) */}
      {isRegistered && (
        <Panel title={mySubmission ? "Projet déposé auprès du Jury (Verrouillé)" : "Déposer mon projet pour le Jury"}>
          {mySubmission && (
            <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 flex items-start gap-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
              <div>
                <p className="font-bold text-ink">Projet soumis et scellé</p>
                <p className="text-muted-foreground mt-0.5">
                  Conformément au règlement du hackathon, l'accès à la modification est immédiatement verrouillé dès la soumission pour garantir l'intégrité de la session d'évaluation par le Jury.
                </p>
              </div>
            </div>
          )}
          <form onSubmit={submitProject} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Nom du projet *</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  disabled={!!mySubmission}
                  placeholder="Ex. Autonome SaaS — Plateforme de prospection IA"
                  className="field text-xs font-bold disabled:opacity-75 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Lien du dépôt GitHub *</label>
                <div className="relative">
                  <input
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    required
                    type="url"
                    disabled={!!mySubmission}
                    placeholder="https://github.com/mon-compte/mon-saas"
                    className="field text-xs pl-8 disabled:opacity-75 disabled:cursor-not-allowed"
                  />
                  <Github className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Lien de la démo en ligne</label>
                <div className="relative">
                  <input
                    value={demoUrl}
                    onChange={(e) => setDemoUrl(e.target.value)}
                    type="url"
                    disabled={!!mySubmission}
                    placeholder="https://mon-saas.vercel.app"
                    className="field text-xs pl-8 disabled:opacity-75 disabled:cursor-not-allowed"
                  />
                  <ExternalLink className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Notes techniques & stack</label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={!!mySubmission}
                  placeholder="Vite, React 19, Supabase, Groq API, Tailwind"
                  className="field text-xs disabled:opacity-75 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {myEval && (
              <div className="rounded-xl border border-emerald/30 bg-emerald/5 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald flex items-center gap-1.5">
                    <Award className="h-4 w-4" /> Note attribuée par le Jury : {myEval.score}/100
                  </span>
                  <span className="text-[11px] text-muted-foreground">Par {myEval.jury_name}</span>
                </div>
                {myEval.feedback && (
                  <p className="text-xs text-ink/90 whitespace-pre-line leading-relaxed">{myEval.feedback}</p>
                )}
              </div>
            )}

            {!mySubmission && (
              <div className="flex justify-end pt-2">
                <button disabled={busySub} className="btn-base btn-glow text-xs flex items-center gap-1.5">
                  <Send className="h-3.5 w-3.5" /> {busySub ? "Envoi…" : "Transmettre au Jury"}
                </button>
              </div>
            )}
          </form>
        </Panel>
      )}

      {/* Official Markdown Brief */}
      <Panel title="Brief Officiel & Règles du Challenge">
        <div className="prose prose-sm dark:prose-invert max-w-none text-ink leading-relaxed">
          <Markdown>{challenge.brief_content}</Markdown>
        </div>
      </Panel>

      {/* Classement officiel — toujours visible, état vide explicite */}
      <Panel title="Classement Officiel du Challenge">
        {results.length > 0 ? (
          <div className="space-y-3">
            {results.map((r) => (
              <div
                key={r.id}
                className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                  r.rank === 1
                    ? "border-amber-500/40 bg-amber-500/10 font-bold"
                    : r.rank === 2
                    ? "border-slate-400/40 bg-slate-400/10 font-semibold"
                    : r.rank === 3
                    ? "border-amber-700/40 bg-amber-700/10 font-semibold"
                    : "border-line bg-card"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-paper font-mono font-bold text-xs">
                    #{r.rank}
                  </span>
                  <div>
                    <p className="font-bold text-ink text-sm">Inbuilder {r.user_id.slice(0, 8)}</p>
                    {r.award && <p className="text-accent text-[11px] font-semibold">{r.award}</p>}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-base font-extrabold text-ink">{r.final_score}</span>
                  <span className="text-muted-foreground text-[10px]"> / 100</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty title="Classement en attente" text="Le jury n'a pas encore publié les résultats. Livre ton projet et reviens après les évaluations." />
        )}
      </Panel>
    </div>
  );
}
