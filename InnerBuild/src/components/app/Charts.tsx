import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Panel } from "@/components/app/AppShell";
import type { ChartData } from "@/lib/chart-data";

export type { ChartData } from "@/lib/chart-data";

const tip = { contentStyle: { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 } };

export function ActivityChart({ data }: { data: ChartData["activity"] }) {
  return (
    <Panel title="Activité sur 14 jours">
      <div className="h-56"><ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: -20, right: 8 }}>
          <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity={0.4} /><stop offset="100%" stopColor="var(--accent)" stopOpacity={0} /></linearGradient></defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" interval="preserveStartEnd" />
          <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
          <Tooltip {...tip} />
          <Area type="monotone" dataKey="cumul" name="Total cumulé" stroke="var(--accent)" fill="url(#g)" strokeWidth={2} />
          <Area type="monotone" dataKey="leçons" name="Leçons du jour" stroke="var(--ink)" fill="transparent" strokeWidth={1.5} />
        </AreaChart>
      </ResponsiveContainer></div>
    </Panel>
  );
}

export function ModuleChart({ data }: { data: ChartData["perModule"] }) {
  return (
    <Panel title="Leçons par étape">
      <div className="h-56"><ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: -20, right: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="step" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
          <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
          <Tooltip {...tip} cursor={{ fill: "var(--muted)" }} />
          <Bar dataKey="faites" name="Terminées" stackId="a" fill="var(--accent)" radius={[0, 0, 0, 0]} />
          <Bar dataKey="restantes" name="Restantes" stackId="a" fill="var(--muted)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer></div>
    </Panel>
  );
}

export function Donut({ data, pct, title = "Avancement" }: { data: { name: string; value: number }[]; pct: number; title?: string }) {
  return (
    <Panel title={title}>
      <div className="relative h-56"><ResponsiveContainer width="100%" height="100%">
        <PieChart><Pie data={data} dataKey="value" innerRadius="65%" outerRadius="90%" startAngle={90} endAngle={-270} stroke="none">
          <Cell fill="var(--accent)" /><Cell fill="var(--muted)" />
        </Pie><Tooltip {...tip} /></PieChart>
      </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center"><div className="text-center"><p className="font-display text-3xl font-extrabold text-ink">{pct} %</p><p className="text-xs text-muted-foreground">du parcours</p></div></div>
      </div>
    </Panel>
  );
}
