import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { appHead, Empty, PageHeader, Panel, Stat } from "@/components/app/AppShell";
import { ErrorBox, Loading } from "@/components/admin/AdminShell";
import { useAdmin, useAudit } from "@/lib/admin";

export const Route = createFileRoute("/admin/tracabilite")({ head: appHead("Traçabilité", "Journal d'audit filtrable et exportable des actions d'administration."), component: Page });

const label: Record<string, string> = {
  "Paiement verified": "Paiement vérifié", "Paiement rejected": "Paiement rejeté",
  "Rendu validated": "Rendu validé", "Rendu changes": "Rendu à refaire", "Rendu review": "Rendu en relecture",
  "Accès active": "Accès activé", "Accès pending": "Accès retiré", "Accès rejected": "Candidature refusée",
};
const tip = { contentStyle: { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 } };
const periods = { all: "Toute la période", "1": "24 dernières heures", "7": "7 derniers jours", "30": "30 derniers jours" } as const;

function Page() {
  const a = useAdmin();
  const log = useAudit();
  const [actor, setActor] = useState("all");
  const [action, setAction] = useState("all");
  const [learner, setLearner] = useState("all");
  const [period, setPeriod] = useState<keyof typeof periods>("all");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const rows = log.data ?? [];
  const nice = (x: string) => label[x] ?? x;

  const filtered = useMemo(() => rows.filter((e) => {
    const t = new Date(e.created_at).getTime();
    if (actor !== "all" && (e.actor_id ?? "system") !== actor) return false;
    if (action !== "all" && e.action !== action) return false;
    if (learner !== "all" && e.target !== learner) return false;
    if (period !== "all" && t < Date.now() - +period * 864e5) return false;
    if (from && t < new Date(from).getTime()) return false;
    if (to && t > new Date(to).getTime() + 864e5) return false;
    return true;
  }), [rows, actor, action, learner, period, from, to]);

  if (log.error) return <ErrorBox error={log.error as Error} onRetry={() => log.refetch()} />;
  if (log.isLoading || a.loading) return <Loading />;

  const actors = [...new Set(rows.map((e) => e.actor_id ?? "system"))];
  const actions = [...new Set(rows.map((e) => e.action))].sort();
  const targets = [...new Set(rows.map((e) => e.target).filter((x) => a.byId(x)))];
  const days = [...Array(14)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - (13 - i)); return d; });
  const series = days.map((d) => ({ day: d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }), actions: filtered.filter((e) => new Date(e.created_at).toDateString() === d.toDateString()).length }));
  const byAction = Object.entries(filtered.reduce<Record<string, number>>((m, e) => { m[nice(e.action)] = (m[nice(e.action)] ?? 0) + 1; return m; }, {})).sort((x, y) => y[1] - x[1]).slice(0, 8).map(([name, n]) => ({ name, n }));

  function exportCsv() {
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const lines = [["Date", "Acteur", "Action", "Apprenant / entité", "Détails"].join(";"),
      ...filtered.map((e) => [new Date(e.created_at).toLocaleString("fr-FR"), e.actor_id ? a.who(e.actor_id) : "système", nice(e.action), e.target ? a.who(e.target) : "", e.details].map(esc).join(";"))];
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = `aifac-tracabilite-${new Date().toISOString().slice(0, 10)}.csv`; link.click();
    URL.revokeObjectURL(url);
  }
  const reset = () => { setActor("all"); setAction("all"); setLearner("all"); setPeriod("all"); setFrom(""); setTo(""); };

  return (
    <>
      <PageHeader eyebrow="Suivi" title="Traçabilité" subtitle="Qui a fait quoi et quand. Lecture seule, filtrable et exportable."
        action={<button onClick={exportCsv} disabled={!filtered.length} className="btn-base btn-glow disabled:opacity-50">Exporter CSV ({filtered.length})</button>} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Opérations tracées" value={String(filtered.length)} />
        <Stat label="Dernières 24 h" value={String(filtered.filter((e) => new Date(e.created_at).getTime() > Date.now() - 864e5).length)} />
        <Stat label="Actions distinctes" value={String(new Set(filtered.map((e) => e.action)).size)} />
        <Stat label="Contenus publiés" value={String(filtered.filter((e) => e.action.endsWith(" publié")).length)} />
      </div>
      <Panel title="Filtres" className="mt-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-xs font-semibold text-muted-foreground">Administrateur<select value={actor} onChange={(e) => setActor(e.target.value)} className="field mt-1"><option value="all">Tous</option>{actors.map((x) => <option key={x} value={x}>{x === "system" ? "Système" : a.who(x)}</option>)}</select></label>
          <label className="text-xs font-semibold text-muted-foreground">Action<select value={action} onChange={(e) => setAction(e.target.value)} className="field mt-1"><option value="all">Toutes</option>{actions.map((x) => <option key={x} value={x}>{nice(x)}</option>)}</select></label>
          <label className="text-xs font-semibold text-muted-foreground">Apprenant<select value={learner} onChange={(e) => setLearner(e.target.value)} className="field mt-1"><option value="all">Tous</option>{targets.map((x) => <option key={x} value={x}>{a.who(x)}</option>)}</select></label>
          <label className="text-xs font-semibold text-muted-foreground">Période<select value={period} onChange={(e) => setPeriod(e.target.value as keyof typeof periods)} className="field mt-1">{Object.entries(periods).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label className="text-xs font-semibold text-muted-foreground">Du<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="field mt-1" /></label>
          <label className="text-xs font-semibold text-muted-foreground">Au<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="field mt-1" /></label>
        </div>
        <button onClick={reset} className="btn-base btn-ghost mt-3 text-xs">Réinitialiser les filtres</button>
      </Panel>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Volume sur 14 jours"><div className="h-52"><ResponsiveContainer width="100%" height="100%"><BarChart data={series} margin={{ left: -20, right: 8 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} /><XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" interval="preserveStartEnd" /><YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" /><Tooltip {...tip} /><Bar dataKey="actions" fill="var(--accent)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></Panel>
        <Panel title="Répartition par action">{byAction.length ? <ul className="space-y-2">{byAction.map((x) => <li key={x.name} className="text-sm"><div className="flex justify-between"><span className="text-ink">{x.name}</span><span className="font-bold">{x.n}</span></div><div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-accent" style={{ width: `${(x.n / byAction[0]!.n) * 100}%` }} /></div></li>)}</ul> : <p className="text-sm text-muted-foreground">Aucune donnée.</p>}</Panel>
      </div>
      <Panel className="mt-6">
        {filtered.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs uppercase text-muted-foreground"><tr><th className="py-2 pr-4">Date</th><th className="pr-4">Acteur</th><th className="pr-4">Action</th><th className="pr-4">Entité</th><th>Détails</th></tr></thead>
          <tbody className="divide-y divide-line">{filtered.map((e) => (
            <tr key={e.id}><td className="whitespace-nowrap py-3 pr-4 text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</td><td className="pr-4">{e.actor_id ? a.who(e.actor_id) : "Système"}</td><td className="pr-4 font-semibold text-ink">{nice(e.action)}</td><td className="pr-4 text-muted-foreground">{e.target ? a.who(e.target) : "—"}</td><td className="max-w-xs truncate text-muted-foreground">{e.details}</td></tr>
          ))}</tbody></table></div> : <Empty title="Aucune opération" text={rows.length ? "Aucune opération ne correspond à ces filtres." : "Les prochaines actions apparaîtront ici."} />}
      </Panel>
    </>
  );
}
