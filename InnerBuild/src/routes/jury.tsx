import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Award,
  CheckCircle2,
  ExternalLink,
  Github,
  Key,
  Layers,
  Loader2,
  LogOut,
  Send,
  ShieldCheck,
  Sparkles,
  Trophy,
  FileText,
  X,
} from "lucide-react";
import { toast } from "@/components/ui/heroui-toast";
import { appHead, Empty, PageHeader, Panel } from "@/components/app/AppShell";
import { Markdown } from "@/components/app/AiChat";
import {
  useChallenges,
  useChallengeSubmissions,
  useChallengeEvaluations,
  type Challenge,
  type ChallengeSubmission,
} from "@/lib/challenges";
import { getD1SessionUser } from "@/lib/d1-session";
import { d1InsertServerFn, d1UpdateServerFn } from "@/lib/d1-data.functions";
import { JurySidebar } from "@/components/JurySidebar";
import { JuryNavbar } from "@/components/JuryNavbar";

const CRITERIA_GUIDE = [
  {
    dim: "01",
    key: "development",
    title: "Développement & Architecture",
    max: 20,
    desc: "Qualité et lisibilité du code (5 pts), fonctionnement complet (5 pts), responsive design (4 pts), flux panier → WhatsApp (4 pts), régularité des commits (2 pts).",
  },
  {
    dim: "02",
    key: "branding",
    title: "Branding & Identité visuelle",
    max: 20,
    desc: "Respect de la palette (6 pts), typographie (4 pts), harmonie visuelle (5 pts), positionnement de marque (5 pts).",
  },
  {
    dim: "03",
    key: "seo_performance",
    title: "SEO & Performance",
    max: 20,
    desc: "Structure des balises H1-H3 (5 pts), métadonnées (4 pts), performance de chargement (6 pts), accessibilité de base (5 pts).",
  },
  {
    dim: "04",
    key: "communication",
    title: "Communication & Storytelling",
    max: 20,
    desc: "Respect du rythme imposé (5 pts), respect des mentions obligatoires (5 pts), qualité du storytelling (6 pts), pertinence technique (4 pts).",
  },
  {
    dim: "05",
    key: "marketing",
    title: "Marketing & Conversion",
    max: 20,
    desc: "Clarté du parcours utilisateur (6 pts), placement des appels à l'action (6 pts), cohérence de l'offre (4 pts), pouvoir de conversion global (4 pts).",
  },
  {
    dim: "06",
    key: "business",
    title: "Robustesse fonctionnelle & Business",
    max: 20,
    desc: "Fonctionnement réel du parcours de commande (7 pts), cohérence des pages dédiées (5 pts), valeur business perçue (5 pts), robustesse générale (3 pts).",
  },
  {
    dim: "07",
    key: "acquisition",
    title: "Acquisition client & Publicité",
    max: 20,
    desc: "Message pub & accroche (5 pts), tunnel d'acquisition client (6 pts), offre & réassurance (5 pts), génération de leads / capture (4 pts).",
  },
];

export const Route = createFileRoute("/jury")({
  head: appHead("Portail d'Évaluation Jury — InnerBuild", "Espace réservé aux membres du jury pour évaluer les projets des hackathons."),
  component: JuryPortalPage,
});

function JuryPortalPage() {
  const qc = useQueryClient();
  const [juryCode, setJuryCode] = useState(() => localStorage.getItem("aifac-jury-code") || "");
  const [juryName, setJuryName] = useState(() => localStorage.getItem("aifac-jury-name") || "");
  const [selectedSub, setSelectedSub] = useState<ChallengeSubmission | null>(null);
  const [showCriteriaModal, setShowCriteriaModal] = useState(false);

  const { data: challenges = [] } = useChallenges();
  const activeChallenge = challenges.find((c) => c.status === "active" || c.status === "evaluation") || challenges[0];

  const { data: submissions = [], isLoading } = useChallengeSubmissions(activeChallenge?.id);
  const { data: evaluations = [] } = useChallengeEvaluations(activeChallenge?.id);

  const {
    data: verifiedJury,
    isLoading: isVerifyingCode,
    isError: isCodeInvalid,
  } = useQuery({
    queryKey: ["verified-jury-code", juryCode],
    queryFn: async () => {
      if (!juryCode) return null;
      const { verifyJuryAccessServerFn } = await import("@/lib/jury.functions");
      const session = getD1SessionUser();
      const res = await verifyJuryAccessServerFn({
        data: {
          code: juryCode,
          email: session?.email || "",
        },
      });
      if (!res.success || !res.jury) {
        throw new Error(res.error || "Code jury invalide ou expiré");
      }
      return res.jury;
    },
    enabled: !!juryCode,
    retry: 0,
    staleTime: 60_000,
  });

  function loginJury(code: string, name: string) {
    localStorage.setItem("aifac-jury-code", code);
    localStorage.setItem("aifac-jury-name", name);
    setJuryCode(code);
    setJuryName(name);
    toast.success(`Bienvenue, ${name} ! Accès jury vérifié.`);
    qc.invalidateQueries({ queryKey: ["verified-jury-code"] });
  }

  function logoutJury() {
    localStorage.removeItem("aifac-jury-code");
    localStorage.removeItem("aifac-jury-name");
    setJuryCode("");
    setJuryName("");
    setSelectedSub(null);
    qc.invalidateQueries({ queryKey: ["verified-jury-code"] });
  }

  if (juryCode && isVerifyingCode) {
    return (
      <div className="min-h-screen bg-paper text-ink flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto" />
          <p className="text-sm font-semibold text-muted-foreground">Vérification de l'habilitation jury…</p>
        </div>
      </div>
    );
  }

  if (!juryCode || isCodeInvalid || !verifiedJury) {
    return <JuryLoginForm onLogin={loginJury} />;
  }

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col lg:flex-row selection:bg-accent/20">
      <JurySidebar
        juryName={juryName}
        juryCode={juryCode}
        onLogout={logoutJury}
        submissionCount={submissions.length}
        evaluatedCount={evaluations.length}
        onOpenCriteriaModal={() => setShowCriteriaModal(true)}
        selectedSub={selectedSub}
        onClearSelectedSub={() => setSelectedSub(null)}
      />

      <main className="flex-1 p-4 sm:p-8 max-w-5xl w-full mx-auto space-y-6 overflow-y-auto">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-4">
          <div>
            <span className="rounded bg-accent/15 px-2.5 py-0.5 text-xs font-bold text-accent">
              The InnerBuild · Évaluation
            </span>
            <h1 className="mt-1.5 text-2xl sm:text-3xl font-black text-ink">Collège des Jurys</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Évaluateur : <strong className="text-ink">{juryName}</strong> ({juryCode})
            </p>
          </div>

          <button
            onClick={() => setShowCriteriaModal(true)}
            className="btn-base btn-ghost text-xs inline-flex items-center gap-1.5 self-start sm:self-auto"
          >
            <FileText className="h-3.5 w-3.5 text-accent" />
            <span>Grille & Critères (7D)</span>
          </button>
        </header>

      {activeChallenge && (
        <div className="rounded-xl border border-line bg-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
          <div>
            <span className="font-semibold text-muted-foreground uppercase text-[10px]">Challenge en cours</span>
            <p className="font-bold text-ink text-sm">{activeChallenge.title}</p>
          </div>
          <span className="rounded-full bg-accent/10 text-accent font-bold px-3 py-1">
            Dotations : {activeChallenge.prize_pool}
          </span>
        </div>
      )}

      {selectedSub ? (
        <JuryEvaluationSheet
          submission={selectedSub}
          challengeId={activeChallenge?.id || ""}
          juryName={juryName}
          existingEval={evaluations.find((e) => e.submission_id === selectedSub.id)}
          onBack={() => setSelectedSub(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["challenge_evaluations"] });
            setSelectedSub(null);
          }}
        />
      ) : (
        <Panel title={`Projets soumis à évaluer (${submissions.length})`}>
          {isLoading ? (
            <p className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
            </p>
          ) : !submissions.length ? (
            <Empty title="Aucun projet soumis" text="Les projets déposés par les participants apparaîtront ici." />
          ) : (
            <ul className="divide-y divide-line">
              {submissions.map((s) => {
                const ev = evaluations.find((e) => e.submission_id === s.id);
                return (
                  <li key={s.id} className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-ink text-base">{s.title}</h3>
                        {ev ? (
                          <span className="rounded-full bg-emerald/15 px-2.5 py-0.5 text-xs font-bold text-emerald">
                            Noté : {ev.score}/100
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-600">
                            À évaluer
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-3 text-xs">
                        {s.repo_url && (
                          <a
                            href={s.repo_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-accent hover:underline font-mono"
                          >
                            <Github className="h-3.5 w-3.5" /> Dépôt GitHub <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        {s.demo_url && (
                          <a
                            href={s.demo_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-emerald hover:underline font-mono"
                          >
                            <ExternalLink className="h-3.5 w-3.5" /> Démo Live
                          </a>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedSub(s)}
                      className={`btn-base text-xs ${ev ? "btn-ghost" : "btn-glow"}`}
                    >
                      {ev ? "Modifier la note" : "Évaluer ce projet"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      )}
      </main>

      {/* Criteria Modal */}
      {showCriteriaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-line bg-card p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-ink text-base">
                    Grille d'Évaluation à 7 Dimensions
                  </h3>
                  <p className="text-xs text-muted-foreground">Standard officiel d'excellence THE InnerBuild (Total 100 pts)</p>
                </div>
              </div>
              <button
                onClick={() => setShowCriteriaModal(false)}
                className="btn-base btn-ghost text-xs p-1.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              {CRITERIA_GUIDE.map((c) => (
                <div key={c.dim} className="rounded-xl border border-line bg-paper p-3.5 flex items-start justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-accent text-[11px]">{c.dim}</span>
                      <span className="font-bold text-ink">{c.title}</span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">{c.desc}</p>
                  </div>
                  <span className="shrink-0 font-mono font-bold text-accent bg-accent/10 px-2 py-0.5 rounded text-[11px]">
                    {c.max} pts
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-line pt-4 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Chaque juré note selon sa spécialité assignée.
              </span>
              <button
                onClick={() => setShowCriteriaModal(false)}
                className="btn-base btn-glow text-xs"
              >
                Compris, fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function JuryLoginForm({ onLogin }: { onLogin: (code: string, name: string) => void }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return;
    setBusy(true);

    try {
      const { verifyJuryAccessServerFn } = await import("@/lib/jury.functions");
      const session = getD1SessionUser();
      const res = await verifyJuryAccessServerFn({
        data: {
          code: cleanCode,
          email: session?.email || "",
        },
      });

      if (!res.success || !res.jury) {
        toast.danger(res.error || "Code jury invalide ou non autorisé.");
        return;
      }

      const verifiedName = res.jury.name || name.trim() || "Membre du Jury";
      onLogin(res.jury.code, verifiedName);
    } catch (err: any) {
      toast.danger("Erreur lors de la validation du code : " + (err.message || String(err)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col justify-between selection:bg-accent/20">
      <JuryNavbar />

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-line bg-card p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="text-center space-y-2">
            <div className="h-12 w-12 rounded-2xl bg-accent/15 text-accent flex items-center justify-center mx-auto">
              <Trophy className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold text-ink">Espace Jury InnerBuild</h1>
            <p className="text-xs text-muted-foreground">
              Saisissez votre code officiel d'accès juré transmis par l'administration.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Votre Nom & Titre (Optionnel si pré-enregistré)</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex. Thomas Dubois — Lead Architect"
                className="field text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Code d'accès Jury *</label>
              <div className="relative">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  placeholder="Ex. JURY-9K42"
                  className="field text-xs pl-8 font-mono uppercase tracking-wider"
                />
                <Key className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </div>

            <button disabled={busy} className="btn-base btn-glow w-full text-xs flex items-center justify-center gap-2">
              <ShieldCheck className="h-4 w-4" /> {busy ? "Vérification de l'habilitation…" : "Accéder à la grille d'évaluation"}
            </button>
          </form>
        </div>
      </main>

      <footer className="border-t border-line py-4 px-4 text-center text-xs text-muted-foreground">
        AI Factory × THE InnerBuild · Accès réservé aux évaluateurs officiels
      </footer>
    </div>
  );
}

function JuryEvaluationSheet({
  submission,
  challengeId,
  juryName,
  existingEval,
  onBack,
  onSaved,
}: {
  submission: ChallengeSubmission;
  challengeId: string;
  juryName: string;
  existingEval?: any;
  onBack: () => void;
  onSaved: () => void;
}) {
  const [dimension, setDimension] = useState<string>(existingEval?.dimension || "development");
  const [score, setScore] = useState<number>(existingEval?.score ?? 15);
  const [strengths, setStrengths] = useState(existingEval?.strengths ?? "");
  const [improvements, setImprovements] = useState(existingEval?.improvements ?? "");
  const [observations, setObservations] = useState(existingEval?.observations ?? existingEval?.feedback ?? "");
  const [remarks, setRemarks] = useState(existingEval?.remarks ?? "");
  const [busy, setBusy] = useState(false);

  const activeDimMeta = CRITERIA_GUIDE.find((c) => c.key === dimension) || CRITERIA_GUIDE[0];

  async function submitEval(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);

    try {
      const sessionUser = getD1SessionUser();

      const payload = {
        challenge_id: challengeId,
        submission_id: submission.id,
        jury_id: sessionUser?.id || null,
        jury_name: juryName,
        dimension,
        score: Number(score),
        strengths: strengths.trim(),
        improvements: improvements.trim(),
        observations: observations.trim(),
        remarks: remarks.trim(),
        feedback: `${observations.trim()} ${remarks.trim() ? "— " + remarks.trim() : ""}`.trim(),
        evaluated_at: new Date().toISOString(),
      };

      if (existingEval) {
        const res = await d1UpdateServerFn({
          data: { table: "challenge_evaluations", id: existingEval.id, patch: payload },
        });
        if (!res.success) throw new Error(res.error || "Mise à jour impossible.");
      } else {
        const res = await d1InsertServerFn({
          data: { table: "challenge_evaluations", row: payload },
        });
        if (!res.success) throw new Error(res.error || "Enregistrement impossible.");
      }
      toast.success("Évaluation enregistrée avec succès sur la dimension " + (activeDimMeta?.title || dimension) + " !");
      onSaved();
    } catch (err: any) {
      toast.danger("Erreur lors de l'enregistrement : " + err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title={`Évaluation du projet « ${submission.title} »`}>
      <form onSubmit={submitEval} className="space-y-6">
        <div className="flex flex-wrap gap-4 text-xs">
          {submission.repo_url && (
            <a href={submission.repo_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-accent hover:underline font-mono">
              <Github className="h-4 w-4" /> Dépôt GitHub <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {submission.demo_url && (
            <a href={submission.demo_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-emerald hover:underline font-mono">
              <ExternalLink className="h-4 w-4" /> Démo en ligne
            </a>
          )}
        </div>

        {/* 7 Dimensions Selector */}
        <div>
          <label className="block text-xs font-bold text-ink mb-1.5">
            Dimension d'évaluation officielle (The InnerBuild 7D)
          </label>
          <select
            value={dimension}
            onChange={(e) => setDimension(e.target.value)}
            className="field text-xs font-bold text-ink bg-card"
          >
            {CRITERIA_GUIDE.map((g) => (
              <option key={g.key} value={g.key}>
                {g.dim}. {g.title} (Max {g.max} pts)
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[11px] text-muted-foreground bg-paper/60 p-2.5 rounded-lg border border-line">
            <strong>Barème indicatif :</strong> {activeDimMeta?.desc || ""}
          </p>
        </div>

        {/* Score Note sur 20 */}
        <div className="p-4 rounded-xl border border-line bg-card space-y-3">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-ink">Note attribuée sur 20</span>
            <span className="text-xl font-extrabold text-accent">{score} / 20</span>
          </div>
          <input
            type="range"
            min={0}
            max={20}
            step={0.5}
            value={score}
            onChange={(e) => setScore(Number(e.target.value))}
            className="w-full accent-accent"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
            <span>0</span>
            <span>10 (Moyenne)</span>
            <span>15 (Excellent)</span>
            <span>20 (Parfait)</span>
          </div>
        </div>

        {/* Strengths & Improvements */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold text-ink mb-1 text-emerald-700">
              Points forts & Maîtrise constatée
            </label>
            <textarea
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
              rows={3}
              placeholder="Ex: Architecture modulaire, typage strict, flux panier WhatsApp fluide..."
              className="field text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-ink mb-1 text-amber-700">
              Axes d'amélioration & Recommandations
            </label>
            <textarea
              value={improvements}
              onChange={(e) => setImprovements(e.target.value)}
              rows={3}
              placeholder="Ex: Revoir les breakpoints tablettes, optimiser le bundle WebP..."
              className="field text-xs"
            />
          </div>
        </div>

        {/* Observations & Remarks */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-ink mb-1">
              Observations techniques détaillées
            </label>
            <textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              rows={3}
              required
              placeholder="Analyse approfondie de la réalisation selon les critères de la dimension..."
              className="field text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-ink mb-1">
              Remarques & Conseils d'encouragement
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Ex: Belle persévérance, continue d'appliquer les conventional commits !"
              className="field text-xs"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-line">
          <button type="button" onClick={onBack} className="btn-base btn-ghost text-xs">
            Annuler
          </button>
          <button disabled={busy} className="btn-base btn-glow text-xs flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" /> {busy ? "Enregistrement…" : "Valider l'évaluation"}
          </button>
        </div>
      </form>
    </Panel>
  );
}
