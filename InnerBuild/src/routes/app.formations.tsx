import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { appHead, Bar, PageHeader, Panel, Stat } from "@/components/app/AppShell";
import { getChartData } from "@/lib/chart-data";
import { useLearnerCurriculum } from "@/lib/course-curriculum";
import { useProfile, useProgress, useSubmissions } from "@/lib/learner";
import { FileText, ExternalLink, BookOpen, Sparkles } from "lucide-react";

const FormationInsights = lazy(() => import("@/components/app/FormationInsights"));

export const Route = createFileRoute("/app/formations")({ head: appHead("Mes formations", "Tes parcours AIFAC, ton avancement et le classement de la cohorte."), component: Page });

function Page() {
  const { data: p } = useProfile();
  const { data: prog = [] } = useProgress();
  const { data: subs = [] } = useSubmissions();
  const { courses, allLessons, totalLessons } = useLearnerCurriculum();
  const charts = useMemo(() => getChartData(prog), [prog]);
  const [insightsReady, setInsightsReady] = useState(false);
  const validated = subs.filter((s) => s.status === "validated").length;

  useEffect(() => {
    const timer = window.setTimeout(() => setInsightsReady(true), 300);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <>
      <PageHeader eyebrow="Mes formations" title="Tes parcours" subtitle="Accès à vie. Tu avances à ton rythme avec les cours interactifs et les supports PDF officiels." />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label="Avancement" value={`${charts.pct} %`} />
        <Stat label="Leçons" value={`${prog.length}/${totalLessons}`} />
        <Stat label="Rendus validés" value={String(validated)} />
        <Stat label="Mon score" value={String(prog.length * 10 + validated * 50)} hint="10 pts / leçon · 50 pts / rendu validé" />
      </div>

      <div className="mt-8 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-accent" />
            Formations & Cursus Disponibles
          </h2>
          <span className="text-xs text-muted-foreground">{courses.length} parcours publiés</span>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {courses.map((course) => {
            const isBase = course.id === "c1";
            return (
              <Panel key={course.id} className="flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      isBase
                        ? "bg-emerald/15 text-emerald"
                        : "bg-blue-500/15 text-blue-500"
                    }`}>
                      {isBase ? "Cursus Principal · Accès Intégral Gratuit" : "Support Officiel & Synthèse"}
                    </span>
                    {course.pdf_url && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                        <FileText className="h-3 w-3" /> PDF Inclus
                      </span>
                    )}
                  </div>

                  <h3 className="mt-3 text-lg font-bold text-ink">{course.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{course.description}</p>
                  <p className="mt-2 text-xs font-semibold text-muted-foreground/80">
                    {course.modules.length} {course.modules.length > 1 ? "modules" : "module"} · {course.lessonCount} {course.lessonCount > 1 ? "leçons" : "leçon"}
                  </p>

                  {isBase && (
                    <div className="mt-4">
                      <Bar value={charts.pct} />
                      <p className="mt-2 text-xs text-muted-foreground">{charts.pct} % terminé</p>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-2 pt-3 border-t border-line/60">
                  <Link
                    to="/app/apprendre"
                    search={{ course: course.id }}
                    className="btn-base btn-glow text-xs sm:text-sm"
                  >
                    Accéder aux leçons
                  </Link>

                  {course.pdf_url && (
                    <a
                      href={course.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-base btn-ghost text-xs gap-1.5 border border-line"
                    >
                      <FileText className="h-3.5 w-3.5 text-accent" />
                      Consulter le PDF
                      <ExternalLink className="h-3 w-3 opacity-60" />
                    </a>
                  )}
                </div>
              </Panel>
            );
          })}

          <Panel className="flex flex-col justify-between">
            <div>
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground">Inclus</span>
              <h3 className="mt-3 text-lg font-bold text-ink">Découverte — Registre public</h3>
              <p className="mt-1 text-sm text-muted-foreground">Registre des 212 skills, prompts opérationnels et modèles de cahier de charge.</p>
            </div>
            <div className="mt-6 pt-3 border-t border-line/60">
              <Link to="/app/ressources" className="btn-base btn-ghost text-xs">Explorer les ressources</Link>
            </div>
          </Panel>
        </div>
      </div>
      {insightsReady ? (
        <Suspense fallback={<InsightsSkeleton />}>
          <FormationInsights charts={charts} />
        </Suspense>
      ) : (
        <InsightsSkeleton />
      )}
    </>
  );
}

function InsightsSkeleton() {
  return (
    <div className="mt-5 space-y-4" aria-hidden>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-[18rem] animate-pulse rounded-2xl border border-line bg-card lg:col-span-2" />
        <div className="h-[18rem] animate-pulse rounded-2xl border border-line bg-card" />
      </div>
      <div className="h-48 animate-pulse rounded-2xl border border-line bg-card" />
    </div>
  );
}
