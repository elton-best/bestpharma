import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Circle,
  Lock,
  Check,
  Info,
  FileCode2,
  FileText,
  Send,
  RotateCcw,
  Award,
  Trophy,
  AlertTriangle,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { appHead, PageHeader, Panel } from "@/components/app/AppShell";
import { lazy, Suspense, useEffect, useState } from "react";
import { allLessons as fallbackLessons, modules as fallbackModules, type QuizQ } from "@/data/course";
import { useLearnerCurriculum } from "@/lib/course-curriculum";
import { R2_PUBLIC_BASE_URL, useFileUrl } from "@/lib/content";
import { useProfile, useProgress, useToggleLesson } from "@/lib/learner";
import { MarkdownView } from "@/components/MarkdownView";
import { SocleVisual } from "@/components/course/SocleVisuals";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const LessonAsk = lazy(() =>
  import("@/components/app/LessonAsk").then((module) => ({ default: module.LessonAsk })),
);

export const Route = createFileRoute("/app/apprendre")({
  validateSearch: z.object({
    lecon: z.string().optional(),
    course: z.string().optional(),
  }),
  head: appHead("Apprendre", "Modules et leçons du parcours AIFAC, de la spec à la livraison."),
  component: Page,
});

function resolvePdfUrl(path?: string): string {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  const clean = path.replace(/^r2:\/?/, "");
  return R2_PUBLIC_BASE_URL ? `${R2_PUBLIC_BASE_URL}/${clean}` : clean;
}

function Page() {
  const { lecon, course } = Route.useSearch();
  const { data: p } = useProfile();
  const { data: prog = [] } = useProgress();
  const toggle = useToggleLesson();
  const {
    courses,
    currentCourse,
    currentModules,
    allLessons: loadedLessons,
    isLoading: isCurriculumLoading,
  } = useLearnerCurriculum(course);

  const done = new Set(prog.map((x) => x.lesson_id));
  const lesson = loadedLessons.find((l) => l.id === lecon);
  // Tous les cours des modules sont intégralement ouverts à tout le monde avec le Coach IA !
  const canOpen = (_free?: boolean) => true;

  // Tous les cours, leçons et supports PDF sont 100% ouverts et déverrouillés pour consultation libre
  const isUnlocked = (_id: string) => true;
  const [isChatOpen, setIsChatOpen] = useState(false);

  if (lesson && canOpen() && !isUnlocked(lesson.id) && !done.has(lesson.id)) {
    const idx = loadedLessons.findIndex((l) => l.id === lesson.id);
    const prev = loadedLessons[idx - 1];
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Link
          to="/app/apprendre"
          search={{ course: currentCourse?.id }}
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-ink transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Tous les modules
        </Link>
        <Panel className="p-8 text-center">
          <Lock className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 font-display text-xl font-bold text-ink">Leçon verrouillée</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Termine d'abord la leçon précédente pour débloquer « {lesson.title} ».
          </p>
          {prev && (
            <Link
              to="/app/apprendre"
              search={{ lecon: prev.id, course: currentCourse?.id }}
              className="btn-base btn-glow mt-6"
            >
              Reprendre : {prev.title}
            </Link>
          )}
        </Panel>
      </div>
    );
  }

  if (lesson && canOpen()) {
    const i = loadedLessons.indexOf(lesson);
    const nextL = loadedLessons[i + 1];
    const prevL = loadedLessons[i - 1];
    const isDone = done.has(lesson.id);
    const pdfUrl = lesson.file_path ? resolvePdfUrl(lesson.file_path) : "";

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Navigation & Action Button */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 pb-3">
          <Link
            to="/app/apprendre"
            search={{ course: currentCourse?.id }}
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-ink transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Tous les modules ({currentCourse?.title || "Parcours"})
          </Link>

          {/* Bouton en haut du cours pour ouvrir le chat Claude */}
          <button
            type="button"
            onClick={() => setIsChatOpen(true)}
            className="btn-base flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-accent/40 bg-accent/10 px-4 text-xs font-bold text-accent shadow-xs transition-all hover:bg-accent/15 sm:h-9 sm:w-auto"
          >
            <Sparkles className="h-4 w-4 text-accent" />
            <span>Poser une question au coach IA</span>
          </button>
        </div>

        {/* Centered Lesson Header */}
        <div>
          <PageHeader
            eyebrow={`${lesson.module?.step || "Cours"} · ${lesson.minutes || 10} min`}
            title={lesson.title}
          />
        </div>

        {/* Schéma visuel du Module Socle */}
        {lesson.id.startsWith("m0-") && <SocleVisual lessonId={lesson.id} />}

        {/* Course content centered in the middle */}
        <div className="space-y-6">
          <Panel className="space-y-5 p-4 sm:space-y-6 sm:p-8">
            {lesson.image_path && <LessonImage path={lesson.image_path} />}

            {lesson.body && lesson.body.length > 0 && (
              <div className="max-w-none text-ink leading-relaxed">
                <MarkdownView>{lesson.body.join("\n\n")}</MarkdownView>
              </div>
            )}

            {/* Embedded PDF Viewer if file_path is present */}
            {pdfUrl && (
              <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-white font-bold shadow-md shadow-accent/20">
                      PDF
                    </div>
                    <div>
                      <h4 className="font-bold text-ink text-sm sm:text-base">Support de cours & Document officiel</h4>
                      <p className="text-xs text-muted-foreground">Document téléchargeable et consultable directement ci-dessous.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-base btn-glow text-xs gap-1.5 w-full sm:w-auto"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Plein écran / Télécharger
                    </a>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-line bg-card shadow-inner">
                  <iframe
                    src={pdfUrl}
                    title={lesson.title}
                    className="w-full h-[650px] sm:h-[750px] border-0"
                    loading="lazy"
                  />
                </div>
              </div>
            )}

            <div className="mt-6 grid items-center gap-3 border-t border-line/60 pt-4 sm:flex sm:flex-wrap sm:justify-between">
              <button
                type="button"
                disabled={toggle.isPending}
                onClick={() =>
                  toggle.mutate(
                    { id: lesson.id, done: isDone },
                    {
                      onSuccess: () => !isDone && toast.success("Leçon terminée"),
                      onError: () => toast.error("Impossible d’enregistrer"),
                    },
                  )
                }
                className={`btn-base w-full sm:w-auto ${isDone ? "btn-ghost border border-line" : "btn-glow"}`}
              >
                <CheckCircle2 className="h-4 w-4" />{" "}
                {isDone ? "Marquer comme non terminée" : "J’ai terminé cette leçon"}
              </button>

              <button
                type="button"
                onClick={() => setIsChatOpen(true)}
                className="btn-base btn-ghost w-full gap-1.5 border border-line text-xs font-semibold text-muted-foreground hover:text-ink sm:w-auto"
              >
                <Sparkles className="h-3.5 w-3.5 text-accent" /> Besoin d'aide sur cette leçon ?
              </button>
            </div>
          </Panel>

          {/* Prev / Next navigation */}
          <div className="flex justify-between items-center gap-3 pt-2">
            {prevL ? (
              <Link
                to="/app/apprendre"
                search={{ lecon: prevL.id, course: currentCourse?.id }}
                className="btn-base btn-ghost"
              >
                <ArrowLeft className="h-4 w-4" /> Précédente
              </Link>
            ) : (
              <span />
            )}
            {nextL && (isDone || done.has(nextL.id) ? (
              <Link
                to="/app/apprendre"
                search={{ lecon: nextL.id, course: currentCourse?.id }}
                className="btn-base btn-ghost"
              >
                Suivante <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <span className="btn-base btn-ghost cursor-not-allowed opacity-50" title="Termine cette leçon pour débloquer la suivante">
                <Lock className="h-4 w-4" /> Suivante
              </span>
            ))}
          </div>
        </div>

        {/* Volet sortant du bas avec le Chat style Claude */}
        <Sheet open={isChatOpen} onOpenChange={setIsChatOpen}>
          <SheetContent
            side="bottom"
            className="flex h-[92dvh] max-h-[92dvh] flex-col rounded-t-3xl border-t border-line bg-card p-0 pb-[env(safe-area-inset-bottom,0px)] text-ink shadow-2xl sm:h-[85vh] sm:max-h-[85vh]"
          >
            <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-ink/15" aria-hidden />
            <div className="min-h-0 flex-1 overflow-hidden p-0 sm:p-3">
              {isChatOpen && (
                <Suspense
                  fallback={
                    <div className="flex h-full items-center justify-center text-center">
                      <div className="space-y-3">
                        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                        <p className="text-xs font-semibold text-muted-foreground">
                          Préparation de l’assistant de cours…
                        </p>
                      </div>
                    </div>
                  }
                >
                  <LessonAsk lessonId={lesson.id} lessonTitle={lesson.title} compact />
                </Suspense>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Apprendre"
        title={currentCourse?.title || "Parcours Spec → Deliver"}
        subtitle="Tous les cours, modules, fiches de synthèse PDF et ateliers pratiques sont 100 % gratuits et ouverts à tous avec le Coach IA jusqu'à la fin du mois."
      />

      {/* Onglets de sélection du parcours si plusieurs cours publiés */}
      {courses.length > 1 && (
        <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-line pb-4">
          <span className="text-xs font-bold text-muted-foreground mr-1">Parcours :</span>
          {courses.map((c) => {
            const isSelected = currentCourse ? currentCourse.id === c.id : c.id === "c1";
            return (
              <Link
                key={c.id}
                to="/app/apprendre"
                search={{ course: c.id }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isSelected
                    ? "bg-accent text-white shadow-sm shadow-accent/20"
                    : "bg-card border border-line text-muted-foreground hover:text-ink hover:border-line-hover"
                }`}
              >
                {c.title} ({c.lessonCount} {c.lessonCount > 1 ? "leçons" : "leçon"})
              </Link>
            );
          })}
        </div>
      )}

      {/* Support PDF officiel du cours sélectionné */}
      {currentCourse?.pdf_url && (
        <div className="mb-6 rounded-2xl border border-accent/40 bg-gradient-to-r from-accent/15 via-accent/10 to-transparent p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent text-white font-black text-sm shadow-md shadow-accent/20">
                PDF
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-accent/20 px-2.5 py-0.5 text-[11px] font-bold text-accent uppercase tracking-wider">
                    Document Pédagogique Officiel
                  </span>
                </div>
                <h3 className="font-bold text-ink text-base sm:text-lg">
                  Support de Cours & Synthèse PDF : {currentCourse.title}
                </h3>
                <p className="text-xs text-muted-foreground max-w-xl">
                  Le support complet et la fiche de synthèse officielle au format PDF sont directement accessibles en lecture et téléchargement pour tous les apprenants.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <a
                href={currentCourse.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-base btn-glow text-xs gap-1.5 w-full sm:w-auto"
              >
                <FileText className="h-4 w-4" />
                Consulter / Télécharger le PDF
                <ExternalLink className="h-3.5 w-3.5 opacity-60" />
              </a>
              <Link
                to="/app/lecons-pdf"
                className="btn-base btn-ghost text-xs gap-1.5 border border-line w-full sm:w-auto"
              >
                Toutes les leçons PDF
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="mb-5 flex flex-col items-stretch justify-between gap-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 shadow-xs sm:mb-6 sm:flex-row sm:items-center sm:p-5">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="font-bold text-ink text-sm sm:text-base flex items-center justify-center sm:justify-start gap-2">
            <Sparkles className="h-4 w-4 text-emerald-500" />
            Accès Intégral Gratuit — Offre de Lancement
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Tous les modules, fiches de synthèse PDF, exercices pratiques et l'Assistant IA sont 100 % ouverts et gratuits jusqu'à la fin du mois (31 octobre). Aucun paiement n'est exigé avant la fin du mois.
          </p>
        </div>
        <span className="w-fit self-center shrink-0 rounded-full bg-emerald-500/15 px-3.5 py-1.5 font-mono text-xs font-bold text-emerald-600 sm:self-auto">
          {p?.trialDaysRemaining ?? 17} jour(s) gratuit(s)
        </span>
      </div>

      {/* 2-Column Responsive Layout for Courses & Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {currentModules.map((m) => {
          const open = canOpen();

          const count = m.lessons.filter((l) => done.has(l.id)).length;
          const modLabel = m.id === "m0" ? "Socle" : m.step ? m.step : `Module ${m.id}`;
          return (
            <Panel key={m.id} className="h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-bold text-ink text-sm sm:text-base">
                    {modLabel} · {m.title}
                  </h2>
                  <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                    {!open
                      ? "Verrouillé"
                      : count === m.lessons.length && m.lessons.length > 0
                        ? "Terminé ✓"
                        : `${count}/${m.lessons.length}`}
                  </span>
                </div>
                <ul className="mt-3 divide-y divide-line">
                  {m.lessons.map((l) => {
                    const isPdf = l.kind === "pdf" || Boolean(l.file_path);
                    const d = done.has(l.id);
                    const locked = open && !d && !isUnlocked(l.id);
                    const Icon = !open || locked ? Lock : d ? CheckCircle2 : Circle;
                    const row = (
                      <>
                        <Icon
                          className={`h-4 w-4 shrink-0 ${
                            d ? "text-emerald" : isPdf ? "text-accent" : open && !locked ? "text-accent" : "text-muted-foreground"
                          }`}
                        />
                        <span className={`flex-1 min-w-0 ${isPdf ? "text-ink font-semibold" : open && !locked ? "text-ink font-medium" : "text-muted-foreground"}`}>
                          {l.title}
                          {isPdf && (
                            <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold text-accent bg-accent/15 px-2 py-0.5 rounded-full border border-accent/30">
                              <FileText className="h-2.5 w-2.5" /> Fiche PDF
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {isPdf ? "📄 Accès Libre" : locked ? "Verrouillé" : `${l.minutes} min`}
                        </span>
                      </>
                    );
                    return (
                      <li key={l.id}>
                        {open && !locked ? (
                          <Link
                            to="/app/apprendre"
                            search={{ lecon: l.id, course: currentCourse?.id }}
                            className={`flex items-center gap-2.5 rounded-lg px-2 py-2.5 text-xs sm:text-sm hover:bg-muted transition-colors ${
                              isPdf ? "bg-accent/5 border border-accent/20" : ""
                            }`}
                          >
                            {row}
                          </Link>
                        ) : locked ? (
                          <span className="flex cursor-not-allowed items-center gap-2.5 px-2 py-2.5 text-xs sm:text-sm opacity-70" title="Termine la leçon précédente pour débloquer">
                            {row}
                          </span>
                        ) : (
                          <Link
                            to="/app/paiement"
                            className="flex items-center gap-2.5 px-2 py-2.5 text-xs sm:text-sm"
                          >
                            {row}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="mt-4 space-y-3">
                {open && !!m.exercises?.length && (
                  <div className="mt-4 rounded-xl border border-accent/25 bg-accent/5 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="text-xs font-bold text-ink flex items-center gap-1.5">
                        <FileCode2 className="h-4 w-4 text-accent shrink-0" />
                        <span>{m.exercises.length} atelier(s) pratique(s)</span>
                      </p>
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        Disponibles et traitables directement dans le Studio Pratique
                      </p>
                    </div>
                    <Link
                      to="/app/pratique"
                      search={{ module: m.step }}
                      className="btn-base btn-glow shrink-0 text-xs py-2 px-3.5 font-bold flex items-center justify-center gap-1.5 w-full sm:w-auto"
                    >
                      <span>Accéder aux ateliers</span> <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                )}
                {open && !!m.quiz?.length && <Quiz moduleId={m.id} qs={m.quiz} />}
              </div>
            </Panel>
          );
        })}
      </div>

      {/* Course Final Exam / Contrôle Final de Fin de Parcours */}
      <CourseExamLearner />
    </>
  );
}

function PdfButton({ path }: { path: string }) {
  const [busy, setBusy] = useState(false);
  async function open() {
    setBusy(true);
    try {
      if (/^https?:/.test(path)) { window.open(path, "_blank", "noopener"); return; }
      const clean = path.replace(/^r2:\/?/, "");
      const url = R2_PUBLIC_BASE_URL ? `${R2_PUBLIC_BASE_URL}/${clean}` : "";
      if (!url) { toast.error("Document indisponible (R2 non configuré)"); return; }
      window.open(url, "_blank", "noopener");
    } finally {
      setBusy(false);
    }
  }
  return (
    <button type="button" onClick={open} disabled={busy} className="btn-base btn-ghost mt-6">
      📄 Ouvrir le document PDF
    </button>
  );
}

function Exercises({
  moduleId,
  xs,
}: {
  moduleId: string;
  xs: { id: string; title: string; instructions: string; kind?: "theorie" | "pratique" }[];
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [completed, setCompleted] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(`aifac_exercises_${moduleId}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [solutions, setSolutions] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(`aifac_ex_notes_${moduleId}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  function toggleComplete(id: string) {
    const next = { ...completed, [id]: !completed[id] };
    setCompleted(next);
    try {
      localStorage.setItem(`aifac_exercises_${moduleId}`, JSON.stringify(next));
    } catch {}
    if (!completed[id]) {
      toast.success("Exercice validé avec succès !");
    }
  }

  function handleSaveSolution(id: string, text: string) {
    const next = { ...solutions, [id]: text };
    setSolutions(next);
    try {
      localStorage.setItem(`aifac_ex_notes_${moduleId}`, JSON.stringify(next));
    } catch {}
  }

  return (
    <div className="mt-4 rounded-xl border border-line p-4 bg-paper/50">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
          <FileCode2 className="h-3.5 w-3.5 text-accent" />
          Exercices du module
        </p>
        <span className="text-[11px] font-semibold text-muted-foreground">
          {Object.values(completed).filter(Boolean).length}/{xs.length} validé(s)
        </span>
      </div>

      <ul className="mt-3 divide-y divide-line">
        {xs.map((x, i) => {
          const isDone = !!completed[x.id];
          return (
            <li key={x.id} className="py-2.5 text-sm">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  aria-expanded={open === x.id}
                  onClick={() => setOpen(open === x.id ? null : x.id)}
                  className="flex flex-1 items-center gap-2 text-left font-semibold text-ink hover:text-accent transition-colors"
                >
                  <span
                    className={`h-2 w-2 rounded-full shrink-0 ${isDone ? "bg-emerald" : "bg-muted-foreground/40"}`}
                  />
                  <span>
                    {i + 1}. {x.title}
                  </span>
                  {x.kind && (
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${x.kind === "theorie" ? "bg-blue-500/15 text-blue-600" : "bg-accent/15 text-accent"}`}>
                      {x.kind === "theorie" ? "Théorie" : "Pratique"}
                    </span>
                  )}
                </button>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isDone ? "bg-emerald/15 text-emerald" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isDone ? "Validé" : "À faire"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setOpen(open === x.id ? null : x.id)}
                    className="text-xs text-accent font-medium hover:underline"
                  >
                    {open === x.id ? "Masquer" : "Ouvrir"}
                  </button>
                </div>
              </div>

              {open === x.id && (
                <div className="mt-3 rounded-lg bg-card p-3.5 border border-line space-y-3">
                  <div className="text-xs text-ink whitespace-pre-line leading-relaxed">
                    {x.instructions}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Votre réponse ou lien GitHub / démo :
                    </label>
                    <textarea
                      rows={3}
                      value={solutions[x.id] || ""}
                      onChange={(e) => handleSaveSolution(x.id, e.target.value)}
                      placeholder="Note de réalisation, lien GitHub de ta PR ou URL de ton déploiement..."
                      className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs text-ink outline-none focus:border-accent"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                    <Link
                      to="/app/pratique"
                      search={{ exercise: x.id }}
                      className="btn-base btn-glow text-xs py-1.5 px-3 font-bold flex items-center gap-1.5"
                    >
                      <FileCode2 className="h-3.5 w-3.5" /> Traiter dans le Studio Pratique
                    </Link>
                    <Link
                      to="/app/rendus"
                      className="btn-base btn-ghost text-xs py-1.5 px-3 font-semibold text-accent flex items-center gap-1.5"
                    >
                      <Send className="h-3.5 w-3.5" /> Soumettre ce projet
                    </Link>
                    <button
                      type="button"
                      onClick={() => toggleComplete(x.id)}
                      className={`btn-base text-xs py-1.5 px-3 font-semibold ${
                        isDone
                          ? "btn-ghost text-muted-foreground"
                          : "btn-glow text-accent-foreground"
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" />
                      {isDone ? "Marquer comme non fait" : "Valider l'exercice"}
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Quiz({ moduleId, qs }: { moduleId: string; qs: QuizQ[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [ans, setAns] = useState<Record<string, number[]>>(() => {
    try {
      const saved = localStorage.getItem(`aifac_quiz_ans_${moduleId}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [done, setDone] = useState(() => {
    try {
      return localStorage.getItem(`aifac_quiz_done_${moduleId}`) === "true";
    } catch {
      return false;
    }
  });

  const good = (q: QuizQ) => (q.answers?.length ? q.answers : [q.correct]);
  const same = (a: number[] = [], b: number[]) =>
    a.length === b.length && a.every((x) => b.includes(x));
  const total = qs.reduce((s, q) => s + q.points, 0);
  const score = qs.reduce((s, q) => s + (same(ans[q.id], good(q)) ? q.points : 0), 0);

  const pick = (q: QuizQ, ci: number) => {
    setAns((a) => {
      const cur = a[q.id] ?? [];
      const updated = {
        ...a,
        [q.id]: q.allow_multiple
          ? cur.includes(ci)
            ? cur.filter((x) => x !== ci)
            : [...cur, ci]
          : [ci],
      };
      try {
        localStorage.setItem(`aifac_quiz_ans_${moduleId}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  function validateQuiz() {
    setDone(true);
    try {
      localStorage.setItem(`aifac_quiz_done_${moduleId}`, "true");
    } catch {}
    toast.success(`Quiz validé ! Ton score : ${score}/${total}`);
  }

  function resetQuiz() {
    setAns({});
    setDone(false);
    try {
      localStorage.removeItem(`aifac_quiz_ans_${moduleId}`);
      localStorage.removeItem(`aifac_quiz_done_${moduleId}`);
    } catch {}
  }

  return (
    <>
      <div className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-xs font-bold text-ink flex items-center gap-1.5">
            <Trophy className="h-4 w-4 text-amber-500 shrink-0" />
            <span>Quiz du Module ({qs.length} questions)</span>
          </p>
          <p className="text-[11px] text-muted-foreground leading-snug">
            {done ? `Quiz validé — Score : ${score} / ${total} pts` : "Testez vos connaissances et évaluez votre maîtrise"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`btn-base shrink-0 text-xs py-2 px-3.5 font-bold flex items-center justify-center gap-1.5 w-full sm:w-auto ${
            done ? "btn-ghost border border-amber-500/30 text-amber-600 dark:text-amber-400" : "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-xs"
          }`}
        >
          <Trophy className="h-3.5 w-3.5" />
          <span>{done ? `Score: ${score}/${total}` : "Passer le Quiz"}</span>
        </button>
      </div>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl md:max-w-2xl p-0 flex flex-col bg-card border-l border-line text-ink">
          <SheetHeader className="p-5 border-b border-line flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <Trophy className="size-4" />
              </div>
              <div>
                <SheetTitle className="text-base font-bold text-ink">Quiz du Module ({qs.length} questions)</SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  {done ? `Score obtenu : ${score} / ${total} pts` : "Répondez aux questions et validez pour voir votre score."}
                </SheetDescription>
              </div>
            </div>
            {done && (
              <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {score}/{total} pts
              </span>
            )}
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <ol className="space-y-6">
              {qs.map((q, i) => (
                <li key={q.id} className="text-sm space-y-2 pb-4 border-b border-line/60 last:border-0">
                  <p className="font-semibold text-ink leading-snug">
                    {i + 1}. {q.question}{" "}
                    {q.allow_multiple && (
                      <span className="text-xs font-normal text-muted-foreground">
                        (plusieurs réponses)
                      </span>
                    )}
                  </p>
                  <div className="grid gap-2 mt-2">
                    {q.choices.map((c, ci) => {
                      const picked = (ans[q.id] ?? []).includes(ci);
                      const isCorrect = good(q).includes(ci);
                      const ok = done && isCorrect;
                      const bad = done && picked && !isCorrect;

                      return (
                        <button
                          key={ci}
                          type="button"
                          aria-pressed={picked}
                          disabled={done}
                          onClick={() => pick(q, ci)}
                          className={`rounded-xl border px-3.5 py-2.5 text-left text-xs font-medium transition-all ${
                            ok
                              ? "border-emerald-500/50 bg-emerald-500/10 text-ink font-semibold"
                              : bad
                                ? "border-rose-500/50 bg-rose-500/10 text-ink"
                                : picked
                                  ? "border-accent bg-accent/10 text-ink font-semibold shadow-xs"
                                  : "border-line bg-paper hover:border-accent text-ink"
                          }`}
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span>{c}</span>
                            {ok && <Check className="h-4 w-4 text-emerald-500 shrink-0" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {done && q.explanation && (
                    <div className="mt-2.5 flex items-start gap-2 rounded-xl bg-paper p-3 text-xs text-muted-foreground border border-line">
                      <Info className="h-4 w-4 shrink-0 text-accent mt-0.5" />
                      <span className="leading-relaxed">{q.explanation}</span>
                    </div>
                  )}
                </li>
              ))}
            </ol>

            <div className="pt-2 flex items-center justify-between border-t border-line">
              {done ? (
                <button type="button" onClick={resetQuiz} className="btn-base btn-ghost text-xs gap-1.5">
                  <RotateCcw className="h-3.5 w-3.5" /> Recommencer le quiz
                </button>
              ) : (
                <button
                  type="button"
                  disabled={qs.some((q) => !(ans[q.id] ?? []).length)}
                  onClick={validateQuiz}
                  className="btn-base btn-glow text-xs py-2 px-4 font-bold disabled:opacity-50"
                >
                  <Check className="h-4 w-4" /> Valider mes réponses
                </button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function LessonImage({ path }: { path: string }) {
  const { data } = useFileUrl(path);
  return data ? (
    <img src={data} alt="" className="mb-5 max-h-80 w-full rounded-xl object-cover" />
  ) : (
    <div className="mb-5 h-48 animate-pulse rounded-xl bg-muted" />
  );
}

function CourseExamLearner() {
  const qc = useQueryClient();
  const [ans, setAns] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState(false);
  const [retake, setRetake] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["course-final-exam"],
    queryFn: async () => {
      const { d1ListServerFn } = await import("@/lib/d1-data.functions");
      const examsRes = await d1ListServerFn({ data: { table: "course_exams", orderBy: "created_at", orderDir: "DESC", limit: 1 } });
      const exams = (examsRes.rows || []) as any[];
      if (!exams?.length) return null;
      const exam = exams[0];

      const { getD1SessionUser } = await import("@/lib/d1-session");
      const session = getD1SessionUser();
      let attempt = null;
      if (session) {
        try {
          const attRes = await d1ListServerFn({ data: { table: "course_exam_attempts" as any, where: { course_id: exam.course_id } as any, orderBy: "created_at", orderDir: "DESC", limit: 1 } });
          attempt = ((attRes.rows || []) as any[]).filter((a) => a.user_id === session.id)[0] || null;
        } catch { attempt = null; }
      }
      return { exam, attempt };
    },
  });

  if (isLoading || !data?.exam) return null;
  const { exam, attempt } = data;
  const questions = (exam.questions as any[]) || [];
  if (!questions.length) return null;

  const hasPassed = attempt && attempt.passed;
  const showForm = !attempt || retake;

  async function submitExam() {
    setBusy(true);
    let earnedPoints = 0;
    let totalPoints = 0;

    questions.forEach((q) => {
      const qPts = Number(q.points) || 10;
      totalPoints += qPts;
      const userAns = ans[q.id];

      if (q.type === "single") {
        if (Number(userAns) === Number(q.correct)) {
          earnedPoints += qPts;
        }
      } else if (q.type === "multiple") {
        const correctArr = Array.isArray(q.correct) ? q.correct : [q.correct];
        const userArr = Array.isArray(userAns) ? userAns : [];
        if (
          correctArr.length === userArr.length &&
          correctArr.every((c: any) => userArr.includes(c))
        ) {
          earnedPoints += qPts;
        }
      } else {
        if (typeof userAns === "string" && userAns.trim().length >= 15) {
          earnedPoints += qPts;
        }
      }
    });

    const scorePct = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const passed = scorePct >= (exam.passing_score || 70);

    const { getD1SessionUser } = await import("@/lib/d1-session");
    const { d1InsertServerFn } = await import("@/lib/d1-data.functions");
    const session = getD1SessionUser();
    if (!session) {
      toast.error("Non connecté");
      setBusy(false);
      return;
    }
    {
      try {
        await d1InsertServerFn({
          data: {
            table: "course_exam_attempts" as any,
            row: {
              user_id: session.id,
              course_id: exam.course_id,
              score: scorePct,
              passed: passed ? 1 : 0,
              answers: JSON.stringify(ans),
            },
          },
        });
      } catch {}
    }

    setBusy(false);
    setRetake(false);
    qc.invalidateQueries({ queryKey: ["course-final-exam"] });

    if (passed) {
      toast.success(`Félicitations ! Contrôle validé avec ${scorePct}% !`);
    } else {
      toast.error(`Score : ${scorePct}%. Le seuil requis est de ${exam.passing_score}%.`);
    }
  }

  return (
    <div className="mt-8 rounded-2xl border-2 border-accent/30 bg-gradient-to-br from-paper to-accent/5 p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-accent/20 px-3 py-0.5 text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-1">
              <Trophy className="h-3.5 w-3.5" /> Épreuve finale
            </span>
            <span className="text-xs font-semibold text-muted-foreground">
              Seuil de validation : {exam.passing_score}%
            </span>
          </div>
          <h2 className="mt-2 text-xl font-bold text-ink">{exam.title}</h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-xl">{exam.description}</p>
        </div>

        {attempt && (
          <div
            className={`rounded-xl border p-3 text-center sm:text-right ${
              attempt.passed
                ? "border-emerald/30 bg-emerald/10 text-emerald"
                : "border-amber/30 bg-amber/10 text-amber-700"
            }`}
          >
            <p className="text-[11px] font-bold uppercase tracking-wider">
              {attempt.passed ? "Statut : Validé" : "À repasser"}
            </p>
            <p className="text-xl font-black mt-0.5">{attempt.score}%</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {new Date(attempt.created_at).toLocaleDateString("fr-FR")}
            </p>
          </div>
        )}
      </div>

      {hasPassed && !retake && (
        <div className="mt-5 space-y-3">
          <div className="rounded-xl border border-emerald/30 bg-emerald/10 p-4 text-xs text-ink flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald shrink-0" />
              <div>
                <p className="font-bold text-emerald">
                  Vous avez validé avec succès le contrôle final de ce cours !
                </p>
                <p className="text-muted-foreground mt-0.5">
                  Votre score de {attempt.score}% a été comptabilisé dans vos statistiques de
                  certification.
                </p>
              </div>
            </div>
            <button onClick={() => setRetake(true)} className="btn-base btn-ghost text-xs shrink-0">
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Repasser pour améliorer
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="mt-6 space-y-6">
          <ol className="space-y-6">
            {questions.map((q: any, i: number) => {
              const userVal = ans[q.id];
              return (
                <li key={q.id || i} className="rounded-xl border border-line bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm text-ink">
                      {i + 1}. {q.question}
                    </p>
                    <span className="text-xs text-muted-foreground font-semibold shrink-0">
                      {q.points || 10} pts
                    </span>
                  </div>

                  {q.type === "single" && q.choices && (
                    <div className="grid gap-2">
                      {q.choices.map((c: string, ci: number) => (
                        <label
                          key={ci}
                          className={`flex items-center gap-3 rounded-lg border p-2.5 text-xs cursor-pointer transition-colors ${
                            userVal === ci
                              ? "border-accent bg-accent/10 font-semibold"
                              : "border-line bg-paper hover:bg-muted"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`q-${q.id}`}
                            checked={userVal === ci}
                            onChange={() => setAns({ ...ans, [q.id]: ci })}
                            className="text-accent"
                          />
                          <span>{c}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {q.type === "multiple" && q.choices && (
                    <div className="grid gap-2">
                      {q.choices.map((c: string, ci: number) => {
                        const curList: number[] = Array.isArray(userVal) ? userVal : [];
                        const checked = curList.includes(ci);
                        return (
                          <label
                            key={ci}
                            className={`flex items-center gap-3 rounded-lg border p-2.5 text-xs cursor-pointer transition-colors ${
                              checked
                                ? "border-accent bg-accent/10 font-semibold"
                                : "border-line bg-paper hover:bg-muted"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                const nextList = checked
                                  ? curList.filter((x) => x !== ci)
                                  : [...curList, ci];
                                setAns({ ...ans, [q.id]: nextList });
                              }}
                              className="text-accent rounded"
                            />
                            <span>{c}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {q.type === "open" && (
                    <div>
                      <textarea
                        rows={3}
                        value={userVal || ""}
                        onChange={(e) => setAns({ ...ans, [q.id]: e.target.value })}
                        placeholder="Rédigez votre réponse argumentée..."
                        className="field text-xs"
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>

          <div className="flex items-center justify-end gap-3 pt-2">
            {retake && (
              <button onClick={() => setRetake(false)} className="btn-base btn-ghost text-xs">
                Annuler
              </button>
            )}
            <button
              disabled={busy}
              onClick={submitExam}
              className="btn-base btn-glow text-sm font-bold flex items-center gap-2"
            >
              <Award className="h-4 w-4" />{" "}
              {busy ? "Évaluation en cours…" : "Soumettre mon contrôle final"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
