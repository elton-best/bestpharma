import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, CreditCard, FolderGit2, Lock, Sparkles } from "lucide-react";
import { appHead, Bar, PageHeader, Panel, Stat } from "@/components/app/AppShell";
import { allLessons, modules, totalLessons } from "@/data/course";
import { statusLabel, useProfile, useProgress, useSubmissions } from "@/lib/learner";
import { getChartData } from "@/lib/chart-data";

const DashboardCharts = lazy(() => import("@/components/app/DashboardCharts"));

export const Route = createFileRoute("/app/")({ head: appHead("Tableau de bord", "Ta progression AIFAC, ta prochaine leçon et tes rendus en un coup d’œil."), component: Dashboard });

function Dashboard() {
  const { data: p } = useProfile();
  const { data: prog = [] } = useProgress();
  const { data: subs = [] } = useSubmissions();
  const charts = useMemo(() => getChartData(prog), [prog]);
  const [chartsReady, setChartsReady] = useState(false);
  const done = new Set(prog.map((x) => x.lesson_id));
  const pct = Math.round((done.size / totalLessons) * 100);
  const next = allLessons.find((l) => !done.has(l.id));
  const nextLocked = Boolean(next && p?.isTrialExpired && !p?.active);
  const validated = subs.filter((s) => s.status === "validated").length;
  const first = (p?.full_name || "").split(" ")[0];

  useEffect(() => {
    const timer = window.setTimeout(() => setChartsReady(true), 250);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <>
      <PageHeader eyebrow="Tableau de bord" title={`Bon retour${first ? `, ${first}` : ""}`}
        subtitle={next ? `Étape en cours : ${next.module.step}. ${totalLessons - done.size} leçon(s) avant la fin du parcours.` : "Parcours terminé. Place à la livraison."} />

      {p?.isTrialActive && (
        <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-emerald/30 bg-emerald/5 p-4 sm:mb-6 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-emerald" />
            <div>
              <p className="font-bold text-ink flex items-center gap-2">Offre de Lancement — Accès Intégral Gratuit</p>
              <p className="text-xs text-muted-foreground">
                Toutes les fonctionnalités (cours, coach IA, atelier pratique, hackathons) sont gratuites jusqu'à la fin du mois (31 octobre). Le paiement ne sera demandé qu'à la fin du mois.
              </p>
            </div>
          </div>
          <span className="w-fit shrink-0 rounded-full bg-emerald/15 px-3.5 py-1 font-mono text-xs font-bold text-emerald">
            {p.trialDaysRemaining} jour(s) gratuit(s) restant(s)
          </span>
        </div>
      )}

      {p && p.isTrialExpired && !p.active && (
        <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-accent/30 bg-accent/5 p-4 sm:mb-6 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex gap-3"><CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-accent" /><div><p className="font-bold text-ink">Période de gratuité expirée — Paiement requis</p><p className="text-sm text-muted-foreground">Votre accès d'essai est arrivé à son terme. Activez votre accès illimité pour 4 000 F CFA pour continuer à utiliser la plateforme.</p></div></div>
          <Link to="/app/paiement" className="btn-base btn-glow w-full shrink-0 sm:w-auto">Débloquer mon accès (4 000 F)</Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label="Progression" value={`${pct} %`} hint="Parcours Spec → Deliver" />
        <Stat label="Leçons terminées" value={`${done.size}/${totalLessons}`} />
        <Stat label="Rendus validés" value={String(validated)} hint={`${subs.length} rendu(s) au total`} />
        <Stat
          label="Accès"
          value={
            p?.isAdmin
              ? "Master Admin"
              : p?.access_status === "pro" || p?.access_status === "unlimited"
                ? "Complet (Pro)"
                : p?.isTrialActive
                  ? "Gratuit (31 oct)"
                  : "Paiement requis"
          }
        />
      </div>

      {chartsReady ? (
        <Suspense fallback={<ChartSkeleton />}>
          <DashboardCharts charts={charts} />
        </Suspense>
      ) : (
        <ChartSkeleton />
      )}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel title="Prochaine leçon" className="lg:col-span-2">
          {next ? <>
            <p className="font-mono text-xs text-accent">Module {modules.indexOf(next.module) + 1} · {next.module.step}</p>
            <h3 className="mt-1 text-xl font-bold text-ink">{next.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{next.body[0]} {next.minutes} min.</p>
            <div className="mt-4"><Bar value={pct} /></div>
            {nextLocked
              ? <Link to="/app/paiement" className="btn-base btn-glow mt-5"><Lock className="h-4 w-4" /> Débloquer pour continuer</Link>
              : <Link to="/app/apprendre" search={{ lecon: next.id }} className="btn-base btn-glow mt-5">{done.size ? "Reprendre" : "Commencer"} <ArrowRight className="h-4 w-4" /></Link>}
          </> : <p className="text-sm text-muted-foreground">Parcours terminé. Place à la livraison.</p>}
        </Panel>
        <Panel title="Derniers rendus">
          {subs.length ? <ul className="space-y-3 text-sm">{subs.slice(0, 3).map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2"><span className="truncate font-semibold text-ink">{s.title}</span><span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${statusLabel[s.status]?.cls}`}>{statusLabel[s.status]?.label}</span></li>
          ))}</ul> : <p className="text-sm text-muted-foreground">Aucun rendu pour l’instant.</p>}
          <Link to="/app/rendus" className="btn-base btn-ghost mt-4 w-full"><FolderGit2 className="h-4 w-4" /> Mes rendus</Link>
        </Panel>
      </div>

      <Panel title="Activité récente" className="mt-6">
        {prog.length ? <ul className="divide-y divide-line">
          {prog.slice(0, 5).map((a) => {
            const l = allLessons.find((x) => x.id === a.lesson_id);
            return <li key={a.lesson_id} className="flex items-center gap-3 py-3 text-sm"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald" /><span className="min-w-0 flex-1 text-ink">Leçon « {l?.title ?? a.lesson_id} » terminée</span><span className="shrink-0 text-xs text-muted-foreground">{new Date(a.completed_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span></li>;
          })}
        </ul> : <p className="text-sm text-muted-foreground">Termine ta première leçon pour la voir ici.</p>}
      </Panel>
    </>
  );
}

function ChartSkeleton() {
  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-3 lg:gap-6" aria-hidden>
      <div className="h-[18rem] animate-pulse rounded-2xl border border-line bg-card lg:col-span-2" />
      <div className="h-[18rem] animate-pulse rounded-2xl border border-line bg-card" />
    </div>
  );
}
