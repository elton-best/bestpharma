import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { appHead, Bar, PageHeader, Panel, Stat } from "@/components/app/AppShell";
import { allLessons, modules, totalLessons } from "@/data/course";
import { getChartData } from "@/lib/chart-data";
import { useProgress, useSubmissions } from "@/lib/learner";
import { useLearnerContext } from "@/lib/learner-context";
import { useServerFn } from "@tanstack/react-start";
import { ChartSuccess } from "reicon-react";
import { askTutor } from "@/lib/tutor.functions";
import { MarkdownView } from "@/components/MarkdownView";
import { getD1SessionUser } from "@/lib/d1-session";

const ProgressionCharts = lazy(() => import("@/components/app/ProgressionCharts"));
const Leaderboard = lazy(() =>
  import("@/components/app/Leaderboard").then((module) => ({ default: module.Leaderboard })),
);

export const Route = createFileRoute("/app/progression")({ head: appHead("Ma progression", "Ton avancement détaillé par étape de la méthode Spec → Done."), component: Page });

function Page() {
  const { data: prog = [] } = useProgress();
  const { data: subs = [] } = useSubmissions();
  const done = new Set(prog.map((x) => x.lesson_id));
  const minutes = allLessons.filter((l) => done.has(l.id)).reduce((a, l) => a + l.minutes, 0);
  const days = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d; });
  const perDay = days.map((d) => prog.filter((p) => new Date(p.completed_at).toDateString() === d.toDateString()).length);
  const max = Math.max(1, ...perDay);
  const charts = useMemo(() => getChartData(prog), [prog]);
  const [visualsReady, setVisualsReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisualsReady(true), 300);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <>
      <PageHeader eyebrow="Suivi" title="Où tu en es" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <Stat label="Temps d’étude" value={`${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}`} hint="Durée des leçons terminées" />
        <Stat label="Leçons" value={`${done.size}/${totalLessons}`} />
        <div className="col-span-2 sm:col-span-1">
          <Stat label="Rendus" value={String(subs.length)} hint={`${subs.filter((s) => s.status === "validated").length} validé(s)`} />
        </div>
      </div>
      {visualsReady ? (
        <Suspense fallback={<VisualsSkeleton />}>
          <ProgressionCharts charts={charts} />
        </Suspense>
      ) : (
        <VisualsSkeleton />
      )}
      <div className="mt-5 sm:mt-6"><Analysis /></div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Par étape">
          <ul className="space-y-4">{modules.map((m) => {
            const v = Math.round((m.lessons.filter((l) => done.has(l.id)).length / m.lessons.length) * 100);
            return <li key={m.id}><div className="mb-1 flex justify-between text-sm"><span className="font-semibold text-ink">{m.step}</span><span className="text-muted-foreground">{v} %</span></div><Bar value={v} /></li>;
          })}</ul>
        </Panel>
        <Panel title="7 derniers jours">
          <div className="flex h-40 items-end gap-2">{perDay.map((n, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-2">
              <div className="w-full rounded-t-md bg-accent/80" style={{ height: `${(n / max) * 100}%`, minHeight: 4 }} title={`${n} leçon(s)`} />
              <span className="text-[10px] text-muted-foreground">{days[i]!.toLocaleDateString("fr-FR", { weekday: "short" })}</span>
            </div>
          ))}</div>
        </Panel>
      </div>
      {visualsReady && (
        <Suspense fallback={<div className="mt-8 h-48 animate-pulse rounded-2xl border border-line bg-card" />}>
          <Leaderboard />
        </Suspense>
      )}
    </>
  );
}

function VisualsSkeleton() {
  return (
    <div className="mt-5 space-y-4" aria-hidden>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-[18rem] animate-pulse rounded-2xl border border-line bg-card lg:col-span-2" />
        <div className="h-[18rem] animate-pulse rounded-2xl border border-line bg-card" />
      </div>
      <div className="hidden h-[18rem] animate-pulse rounded-2xl border border-line bg-card sm:block" />
    </div>
  );
}

function Analysis() {
  const ask = useServerFn(askTutor);
  const context = useLearnerContext("Ma progression");
  const [text, setText] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true); setErr("");
    try {
      const userId = getD1SessionUser()?.id;
      const r = await ask({ data: { mode: "analyze", context, messages: [{ role: "user", content: "Analyse ma progression et donne-moi mon plan pour la semaine." }], ...(userId ? { userId } : {}) } });
      if (r.error) setErr(r.error); else setText(r.text);
    } catch { setErr("Analyse impossible pour le moment."); }
    setBusy(false);
  }
  return (
    <Panel>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent"><ChartSuccess size={20} /></span>
          <div><h2 className="font-bold text-ink">Analyse IA de ta progression</h2><p className="text-xs text-muted-foreground">Diagnostic, points forts, risques et plan sur 7 jours.</p></div></div>
        <button type="button" disabled={busy} onClick={run} className="btn-base btn-glow w-full sm:w-auto">{busy ? "Analyse…" : text ? "Relancer l’analyse" : "Analyser ma progression"}</button>
      </div>
      {busy && <p className="shimmer-text mt-4 text-sm font-semibold">Le coach étudie ton parcours…</p>}
      {err && <p className="mt-4 text-sm text-destructive">{err}</p>}
      {text && !busy && <div className="mt-5 border-t border-line pt-5"><MarkdownView className="text-sm">{text}</MarkdownView></div>}
    </Panel>
  );
}
