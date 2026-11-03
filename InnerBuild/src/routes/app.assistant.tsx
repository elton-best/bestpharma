import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { Bulb, ChatRoundCheck, Target, Gamepad } from "reicon-react";
import { Clock, CheckCircle2, RotateCcw, Award, Play, AlertCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { appHead, PageHeader, Panel } from "@/components/app/AppShell";
import { AiChat, type Mode } from "@/components/app/AiChat";
import { useProfile } from "@/lib/learner";
import { useLearnerContext } from "@/lib/learner-context";
import { askTutor } from "@/lib/tutor.functions";

export const Route = createFileRoute("/app/assistant")({
  head: appHead("Assistant IA", "Pose tes questions sur le cours AIFAC : explications, prochaines étapes, revue de travaux et simulateur d'entraînement."),
  component: Page,
});

const modes = [
  { k: "explain" as Mode, l: "Expliquer", d: "Un concept du cours, simplement", icon: Bulb, ph: "Ex. : c’est quoi une spec testable ?", s: ["C’est quoi « Done » ?", "Différence entre Spec et Plan", "Comment choisir un skill ?"] },
  { k: "next" as Mode, l: "Prochaines étapes", d: "Un plan adapté à ta progression", icon: Target, ph: "Ex. : je bloque sur le module Build…", s: ["Que faire maintenant ?", "Je n’ai que 30 min aujourd’hui", "Comment finir le parcours en 2 semaines ?"] },
  { k: "feedback" as Mode, l: "Revue de travail", d: "Colle ta spec, ton plan ou ton code", icon: ChatRoundCheck, ph: "Colle ici ta spec, ton code ou le lien de ton rendu…", s: ["Relis ma spec de connexion", "Mon découpage en tâches est-il bon ?"] },
  { k: "train" as Mode, l: "Entraînement IA", d: "QCM, Q/R et Sprints chronométrés", icon: Gamepad, ph: "", s: [] },
] as const;

function Page() {
  const [mode, setMode] = useState<Mode>("explain");
  const context = useLearnerContext("Assistant IA");
  const m = modes.find((x) => x.k === mode)!;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="hidden md:block">
        <PageHeader
          eyebrow="Formations · Assistant IA"
          title="Ton assistant & Simulateur de cours"
          subtitle="Il a tout le programme en mémoire et connaît ta progression. Pose des questions ou lance une session d'entraînement."
        />
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 lg:grid lg:grid-cols-[260px_1fr] lg:gap-6">
        <div className="-mx-1 flex shrink-0 gap-2 overflow-x-auto px-1 pb-1 lg:mx-0 lg:grid lg:content-start lg:overflow-visible lg:px-0">
          {modes.map((x) => (
            <button
              key={x.k}
              type="button"
              onClick={() => setMode(x.k)}
              className={`flex min-h-11 min-w-max items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors lg:min-w-0 lg:items-start lg:gap-3 lg:p-4 ${
                mode === x.k ? "border-accent bg-accent/5" : "border-line bg-card hover:border-accent/50"
              }`}
            >
              <x.icon size={20} className={`shrink-0 ${mode === x.k ? "text-accent" : "text-muted-foreground"}`} />
              <span>
                <span className="block text-sm font-bold text-ink">{x.l}</span>
                <span className="hidden text-xs text-muted-foreground lg:block">{x.d}</span>
              </span>
            </button>
          ))}
        </div>

        <section className="card-surface -mx-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-none border-x-0 p-0 sm:mx-0 sm:rounded-2xl sm:border-x lg:p-4">
          {mode === "train" ? (
            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-2">
              <AiTrainingRoom context={context} />
            </div>
          ) : (
            <AiChat
              key={mode}
              compact
              storageKey={`aifac-assistant-${mode}`}
              mode={mode}
              context={context}
              suggestions={[...m.s]}
              placeholder={m.ph}
            />
          )}
        </section>
      </div>
    </div>
  );
}

const COURSES_TOPICS = [
  "Parcours global (Spec → Deliver)",
  "Module 1 : Spec — Écrire ce qu'on livre",
  "Module 2 : Plan — Découper pour avancer",
  "Module 3 : Build — Construire avec les agents",
  "Module 4 : Review & QA — Faire corriger et itérer",
  "Module 5 : Deliver — Livrer pour de vrai",
];

function AiTrainingRoom({ context }: { context: string }) {
  const ask = useServerFn(askTutor);
  const [topic, setTopic] = useState(COURSES_TOPICS[0]);
  const [format, setFormat] = useState<"qcm" | "qr" | "chrono">("qcm");
  const [sessionActive, setSessionActive] = useState(false);
  const [loadingQuestion, setLoadingQuestion] = useState(false);

  // Training state
  const [questionCount, setQuestionCount] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<{
    text: string;
    choices?: string[] | undefined;
    correctIndex?: number | undefined;
    explanation?: string | undefined;
  } | null>(null);

  // Learner input
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [qrAnswer, setQrAnswer] = useState("");
  const [evaluated, setEvaluated] = useState(false);
  const [evaluationFeedback, setEvaluationFeedback] = useState("");
  const [evaluating, setEvaluating] = useState(false);

  // Chrono timer
  const [timeLeft, setTimeLeft] = useState(60);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Stats in localStorage
  const [stats, setStats] = useState(() => {
    try {
      const s = localStorage.getItem("aifac_training_stats");
      return s ? JSON.parse(s) : { completed: 0, totalPts: 0, highStreak: 0 };
    } catch {
      return { completed: 0, totalPts: 0, highStreak: 0 };
    }
  });

  useEffect(() => {
    if (sessionActive && format === "chrono" && !evaluated && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            clearInterval(timerRef.current!);
            handleTimeExpired();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionActive, format, evaluated, timeLeft]);

  function handleTimeExpired() {
    setEvaluated(true);
    toast.error("Temps écoulé pour cette question !");
    setEvaluationFeedback("Le chronomètre a expiré (0 point attribué). Voyez la solution ci-dessous.");
  }

  async function startSession() {
    setSessionActive(true);
    setQuestionCount(1);
    setTotalScore(0);
    await fetchNextQuestion(1);
  }

  async function fetchNextQuestion(qNum: number) {
    setLoadingQuestion(true);
    setSelectedChoice(null);
    setQrAnswer("");
    setEvaluated(false);
    setEvaluationFeedback("");
    setTimeLeft(60);

    const prompt = format === "qcm" || format === "chrono"
      ? `Génère 1 question QCM d'entraînement sur le sujet : "${topic}".
Format JSON strict :
{
  "question": "Texte de la question concise et technique",
  "choices": ["Choix A", "Choix B", "Choix C", "Choix D"],
  "correctIndex": 0,
  "explanation": "Explication claire sans sticker ni emoji"
}`
      : `Génère 1 question ouverte de réflexion / mise en situation pratique sur le sujet : "${topic}".
Format JSON strict :
{
  "question": "Mise en situation ou question précise sur la méthode AIFAC",
  "explanation": "Critères de la réponse modèle attendue"
}`;

    try {
      const r = await ask({
        data: {
          mode: "train",
          context,
          messages: [{ role: "user", content: prompt }],
        },
      });

      if (r.text) {
        const jsonMatch = r.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          setCurrentQuestion({
            text: parsed.question,
            choices: parsed.choices,
            correctIndex: parsed.correctIndex ?? 0,
            explanation: parsed.explanation,
          });
        } else {
          // Fallback if not pure JSON
          setCurrentQuestion({
            text: r.text,
            choices: format !== "qr" ? ["Approche conforme", "Approche partielle", "Erreur de spécification", "Non applicable"] : undefined,
            correctIndex: 0,
            explanation: "Vérifiez vos concepts dans le module associé.",
          });
        }
      }
    } catch {
      toast.error("Erreur de génération de question.");
    }
    setLoadingQuestion(false);
  }

  function handleChoicePick(idx: number) {
    if (evaluated) return;
    setSelectedChoice(idx);
    setEvaluated(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const isCorrect = idx === currentQuestion?.correctIndex;
    if (isCorrect) {
      const pts = format === "chrono" ? Math.max(10, Math.round(timeLeft / 3)) : 10;
      setTotalScore((s) => s + pts);
      toast.success(`Bonne réponse ! (+${pts} pts)`);
    } else {
      toast.error("Réponse incorrecte.");
    }
  }

  async function evaluateOpenAnswer() {
    if (!qrAnswer.trim() || evaluating) return;
    setEvaluating(true);
    try {
      const r = await ask({
        data: {
          mode: "train",
          context,
          messages: [
            {
              role: "user",
              content: `Question posée : "${currentQuestion?.text}".
Critères idéaux : "${currentQuestion?.explanation}".
Réponse de l'apprenant : "${qrAnswer}".

Évalue la réponse sur 10 points. Donne la note sous la forme "NOTE: X/10" sur la première ligne, puis explique brièvement ce qui est solide et ce qui manque en 3 points concis sans sticker ni emoji.`,
            },
          ],
        },
      });

      setEvaluated(true);
      setEvaluationFeedback(r.text);
      const match = r.text.match(/NOTE:\s*(\d+)\/10/i);
      const pts = match ? Number(match[1]) : 7;
      setTotalScore((s) => s + pts);
      toast.success(`Évaluation terminée (+${pts} pts)`);
    } catch {
      toast.error("Échec de l'évaluation");
    }
    setEvaluating(false);
  }

  function nextStep() {
    if (questionCount >= 5) {
      // Session finished
      const updated = {
        completed: stats.completed + 1,
        totalPts: stats.totalPts + totalScore,
        highStreak: Math.max(stats.highStreak, totalScore),
      };
      setStats(updated);
      try {
        localStorage.setItem("aifac_training_stats", JSON.stringify(updated));
      } catch {}
      setSessionActive(false);
      toast.success(`Session terminée avec un score de ${totalScore} pts !`);
    } else {
      setQuestionCount((c) => c + 1);
      fetchNextQuestion(questionCount + 1);
    }
  }

  if (!sessionActive) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-bold text-ink flex items-center gap-2">
            <Gamepad size={20} className="text-accent" /> Simulateur d'entraînement AIFAC
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Entraînez-vous avec l'IA sur des cas réels de cours, testez vos réflexes en sprint chronométré ou perfectionnez votre argumentation.
          </p>
        </div>

        {/* Stats banner */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-line bg-muted/20 p-3 text-center">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Sessions faites</p>
            <p className="text-xl font-bold text-ink mt-0.5">{stats.completed}</p>
          </div>
          <div className="rounded-xl border border-line bg-muted/20 p-3 text-center">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Points accumulés</p>
            <p className="text-xl font-bold text-accent mt-0.5">{stats.totalPts} pts</p>
          </div>
          <div className="rounded-xl border border-line bg-muted/20 p-3 text-center">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Meilleur score</p>
            <p className="text-xl font-bold text-emerald mt-0.5">{stats.highStreak} pts</p>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-card p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-ink mb-1">1. Choisissez le cours ou module à réviser</label>
            <select value={topic} onChange={(e) => setTopic(e.target.value)} className="field text-sm">
              {COURSES_TOPICS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-ink mb-2">2. Choisissez le format d'entraînement</label>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { id: "qcm", label: "QCM interactif", desc: "4 choix de réponse, validation immédiate." },
                { id: "qr", label: "Questions-Réponses", desc: "Rédaction libre, notation et analyse par l'IA." },
                { id: "chrono", label: "Sprint Chronométré", desc: "60 secondes par question. Vitesse et rigueur." },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFormat(f.id as any)}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    format === f.id ? "border-accent bg-accent/5 ring-1 ring-accent" : "border-line bg-paper hover:border-accent/40"
                  }`}
                >
                  <p className="text-xs font-bold text-ink">{f.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{f.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <button onClick={startSession} className="btn-base btn-glow w-full flex items-center justify-center gap-2 pt-3 pb-3 font-bold">
            <Play className="h-4 w-4" /> Démarrer la session (5 questions)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Session progress header */}
      <div className="flex items-center justify-between border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-bold text-accent">
            Question {questionCount} / 5
          </span>
          <span className="text-xs text-muted-foreground font-medium">{topic}</span>
        </div>

        <div className="flex items-center gap-3">
          {format === "chrono" && (
            <div className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
              timeLeft < 15 ? "bg-destructive/15 text-destructive animate-pulse" : "bg-muted text-ink"
            }`}>
              <Clock className="h-3.5 w-3.5" /> {timeLeft}s
            </div>
          )}
          <span className="text-xs font-bold text-emerald flex items-center gap-1">
            <Award className="h-3.5 w-3.5" /> {totalScore} pts
          </span>
        </div>
      </div>

      {loadingQuestion ? (
        <div className="py-16 text-center space-y-3">
          <div className="h-8 w-8 mx-auto border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground">L'IA génère la question d'entraînement...</p>
        </div>
      ) : currentQuestion ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-muted/10 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Énoncé</p>
            <p className="text-sm font-semibold text-ink leading-relaxed">{currentQuestion.text}</p>
          </div>

          {/* QCM / Chrono Choices */}
          {currentQuestion.choices && (
            <div className="grid gap-2">
              {currentQuestion.choices.map((c, idx) => {
                const isPicked = selectedChoice === idx;
                const isCorrect = evaluated && idx === currentQuestion.correctIndex;
                const isWrong = evaluated && isPicked && idx !== currentQuestion.correctIndex;

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={evaluated}
                    onClick={() => handleChoicePick(idx)}
                    className={`w-full rounded-xl border p-3.5 text-left text-xs font-medium transition-all flex items-center justify-between ${
                      isCorrect
                        ? "border-emerald bg-emerald/10 text-ink font-bold"
                        : isWrong
                        ? "border-destructive bg-destructive/10 text-ink font-semibold"
                        : isPicked
                        ? "border-accent bg-accent/10 text-ink"
                        : "border-line bg-paper hover:border-accent text-ink"
                    }`}
                  >
                    <span>{c}</span>
                    {isCorrect && <CheckCircle2 className="h-4 w-4 text-emerald shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Open Question (Q/R) */}
          {!currentQuestion.choices && (
            <div className="space-y-3">
              <textarea
                value={qrAnswer}
                onChange={(e) => setQrAnswer(e.target.value)}
                disabled={evaluated}
                rows={4}
                placeholder="Rédigez votre réponse avec rigueur et précision..."
                className="field text-xs"
              />
              {!evaluated && (
                <button
                  disabled={!qrAnswer.trim() || evaluating}
                  onClick={evaluateOpenAnswer}
                  className="btn-base btn-glow text-xs"
                >
                  {evaluating ? "Évaluation par l'IA…" : "Faire évaluer ma réponse"}
                </button>
              )}
            </div>
          )}

          {/* Evaluation / Feedback block */}
          {evaluated && (
            <div className="rounded-xl border border-line bg-card p-4 space-y-2">
              <p className="text-xs font-bold text-ink flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-accent" /> Analyse & Solution :
              </p>
              <div className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
                {evaluationFeedback || currentQuestion.explanation}
              </div>

              <div className="pt-2 flex justify-end">
                <button onClick={nextStep} className="btn-base btn-glow text-xs flex items-center gap-1.5">
                  {questionCount >= 5 ? "Voir le bilan de session" : "Question suivante"} <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

