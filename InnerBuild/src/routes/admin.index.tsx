import { createFileRoute, Link } from "@tanstack/react-router";
import { Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart, Legend, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { appHead, PageHeader, Panel, Stat } from "@/components/app/AppShell";
import { ErrorBox, Loading } from "@/components/admin/AdminShell";
import { useAdmin, useAdminActions } from "@/lib/admin";
import { useAllContent } from "@/lib/content";

export const Route = createFileRoute("/admin/")({ head: appHead("Pilotage admin", "Santé de la plateforme AIFAC : inscriptions, revenus, files d'attente."), component: Pilotage });

const tip = { contentStyle: { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 } };

function Pilotage() {
  const a = useAdmin();
  const content = useAllContent();
  const { refresh } = useAdminActions();
  if (a.error) return <ErrorBox error={a.error} onRetry={refresh} />;
  if (a.loading) return <Loading />;
  const days = [...Array(14)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - (13 - i)); return d; });
  const isConfirmed = (p: { status?: string }) =>
    p.status === "verified" || p.status === "received" || p.status === "paid" || p.status === "successful";
  const confirmed = (a.payments.data ?? []).filter(isConfirmed);
  const same = (s?: string | null, d?: Date) => Boolean(s && d) && new Date(s!).toDateString() === d!.toDateString();
  const series = days.map((d) => ({
    day: d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
    inscriptions: a.learners.filter((p) => same(p.created_at, d)).length,
    revenus: confirmed.filter((p) => same(p.created_at, d)).reduce((s, p) => s + (Number(p.amount) || 1000), 0),
  }));
  const revenue = confirmed.reduce((s, p) => s + (Number(p.amount) || 1000), 0);
  const active = a.learners.filter((p) => p.access_status === "active" || p.access_status === "pro" || p.access_status === "unlimited").length;
  const avg = a.learners.length ? Math.round(a.learners.reduce((s, p) => s + a.pctOf(p.id), 0) / a.learners.length) : 0;
  const queues = [
    { l: "Candidatures", n: a.candidates.length, to: "/admin/candidatures" as const },
    { l: "Paiements à vérifier", n: a.pendingPays.length, to: "/admin/paiements" as const },
    { l: "Rendus à corriger", n: a.pendingSubs.length, to: "/admin/rendus" as const },
  ];
  return (
    <>
      <PageHeader eyebrow="Pilotage" title="Santé de la plateforme" subtitle="Inscriptions, revenus encaissés et files d'attente en un coup d'œil." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Apprenants" value={String(a.learners.length)} hint={`${active} avec accès actif`} />
        <Stat label="Revenus encaissés" value={`${revenue.toLocaleString("fr-FR")} F CFA`} hint={`${confirmed.length} paiements confirmés`} />
        <Stat label="Progression moyenne" value={`${avg} %`} />
        <Stat label="Rendus validés" value={String((a.subs.data ?? []).filter((s) => s.status === "validated").length)} />
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {queues.map((q) => <Link key={q.l} to={q.to} className="card-surface flex items-center justify-between p-5 transition-colors hover:border-accent"><span className="text-sm font-semibold text-ink">{q.l}</span><span className={`rounded-full px-3 py-1 text-sm font-bold ${q.n ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}>{q.n}</span></Link>)}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Inscriptions sur 14 jours"><div className="h-56"><ResponsiveContainer width="100%" height="100%">
          <BarChart data={series} margin={{ left: -20, right: 8 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} /><XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" interval="preserveStartEnd" /><YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" /><Tooltip {...tip} /><Bar dataKey="inscriptions" fill="var(--accent)" radius={[6, 6, 0, 0]} /></BarChart>
        </ResponsiveContainer></div></Panel>
        <Panel title="Revenus vérifiés sur 14 jours (F)"><div className="h-56"><ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ left: -10, right: 8 }}><defs><linearGradient id="rv" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--emerald, #10B981)" stopOpacity={0.4} /><stop offset="100%" stopColor="var(--emerald, #10B981)" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} /><XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" interval="preserveStartEnd" /><YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" /><Tooltip {...tip} /><Area dataKey="revenus" stroke="var(--emerald, #10B981)" fill="url(#rv)" strokeWidth={2} /></AreaChart>
        </ResponsiveContainer></div></Panel>
      </div>
      <Extra a={a} content={content.data} />
    </>
  );
}

const COLORS = ["var(--accent)", "var(--emerald, #10B981)", "var(--amber, #F59E0B)", "var(--destructive)", "var(--muted-foreground)"];

function Extra({ a, content }: { a: ReturnType<typeof useAdmin>; content: ReturnType<typeof useAllContent>["data"] }) {
  const count = <T,>(xs: T[], f: (x: T) => string, labels: Record<string, string>) => Object.entries(labels).map(([k, name]) => ({ name, value: xs.filter((x) => f(x) === k).length })).filter((x) => x.value);
  const access = count(a.learners, (p) => p.access_status, { active: "Actif", pro: "Pro", unlimited: "Illimité", pending: "En attente", approved: "Validé", rejected: "Refusé", free: "Découverte", discovery: "Découverte" });
  const subs = count(a.subs.data ?? [], (s) => s.status, { submitted: "Soumis", review: "En relecture", validated: "Validés", changes: "À refaire" });
  const buckets = ["0 %", "1-25 %", "26-50 %", "51-75 %", "76-100 %"].map((name, i) => ({ name, apprenants: a.learners.filter((p) => { const v = a.pctOf(p.id); return i === 0 ? v === 0 : v > (i - 1) * 25 && v <= i * 25; }).length }));
  const perCourse = (content?.courses ?? []).map((c) => {
    const mids = (content?.modules ?? []).filter((m) => m.course_id === c.id).map((m) => m.id);
    const pub = <T extends { module_id?: string | null; published: boolean }>(xs?: T[]) => (xs ?? []).filter((x) => x.module_id && mids.includes(x.module_id) && x.published).length;
    return { id: c.id, title: c.title, published: c.published, L: pub(content?.lessons), Ex: pub(content?.exercises), Q: pub(content?.quiz) };
  });
  const pending = [...a.pendingSubs].sort((x, y) => x.created_at.localeCompare(y.created_at)).slice(0, 6);
  const pie = (data: { name: string; value: number }[]) => data.length ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={3}>{data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 11 }} /></PieChart></ResponsiveContainer> : <p className="pt-16 text-center text-sm text-muted-foreground">Pas encore de données.</p>;
  return (
    <>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel title="Statut d'accès"><div className="h-56">{pie(access)}</div></Panel>
        <Panel title="Rendus par statut"><div className="h-56">{pie(subs)}</div></Panel>
        <Panel title="Répartition de la progression"><div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={buckets} margin={{ left: -20, right: 8 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" /><YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" /><Tooltip {...tip} /><Bar dataKey="apprenants" fill="var(--emerald, #10B981)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></Panel>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Rendus en attente">{pending.length ? <ul className="divide-y divide-line text-sm">{pending.map((s) => <li key={s.id} className="flex items-center gap-3 py-2"><span className="w-14 shrink-0 text-xs font-bold text-accent">{Math.max(0, Math.round((Date.now() - new Date(s.created_at).getTime()) / 36e5))} h</span><span className="min-w-0 flex-1 truncate text-ink">{s.title}</span><Link to="/admin/rendus" className="text-xs font-semibold text-accent">Relire</Link></li>)}</ul> : <p className="text-sm text-muted-foreground">Aucun rendu en attente.</p>}</Panel>
        <Panel title="Contenu publié par cours">{perCourse.length ? <><div className="h-44"><ResponsiveContainer width="100%" height="100%"><BarChart data={perCourse} margin={{ left: -20, right: 8 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} /><XAxis dataKey="title" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" /><YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" /><Tooltip {...tip} /><Bar dataKey="L" name="Leçons" stackId="c" fill={COLORS[0]} /><Bar dataKey="Ex" name="Exercices" stackId="c" fill={COLORS[1]} /><Bar dataKey="Q" name="Questions" stackId="c" fill={COLORS[2]} radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
          <p className="mt-3 text-xs text-muted-foreground">Les PDF sont privés : les apprenants reçoivent un lien signé valable 1 h.</p></> : <p className="text-sm text-muted-foreground">Pas encore de données.</p>}        </Panel>
      </div>
    </>
  );
}
