import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { appHead, Bar, Empty, PageHeader, Panel } from "@/components/app/AppShell";
import { ErrorBox, Loading } from "@/components/admin/AdminShell";
import { fdate, useAdmin, useAdminActions } from "@/lib/admin";

export const Route = createFileRoute("/admin/apprenants")({ head: appHead("Suivi individuel", "Liste des apprenants et fiche de suivi."), component: Page });

function Page() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const a = useAdmin();
  const { refresh } = useAdminActions();
  const [search, setSearch] = useState("");
  if (path.replace(/\/$/, "") !== "/admin/apprenants") return <Outlet />;
  if (a.error) return <ErrorBox error={a.error} onRetry={refresh} />;
  if (a.loading) return <Loading />;
  const list = a.learners.filter((p) => `${p.full_name} ${p.email}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <>
      <PageHeader eyebrow="Suivi" title="Suivi individuel" subtitle="Clique sur un apprenant pour voir son profil, sa progression, ses paiements et ses rendus." />
      <Panel>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un nom ou un email…" className="mb-4 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-accent sm:w-80" />
        {list.length ? <ul className="divide-y divide-line text-sm">{list.map((p) => (
          <li key={p.id}><Link to="/admin/apprenants/$uid" params={{ uid: p.id }} className="flex flex-col gap-2 py-3 hover:bg-muted/50 sm:flex-row sm:items-center sm:gap-4">
            <div className="min-w-0 flex-1"><p className="truncate font-semibold text-ink">{p.full_name || "—"}</p><p className="truncate text-xs text-muted-foreground">{p.email} · {fdate(p.created_at)}</p></div>
            <div className="flex items-center gap-3 sm:w-48"><Bar value={a.pctOf(p.id)} /><span className="w-10 text-right text-xs font-bold">{a.pctOf(p.id)}%</span></div>
            <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${p.access_status === "active" ? "bg-emerald/15 text-emerald" : p.access_status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-amber/25 text-ink"}`}>{p.access_status === "active" ? "Actif" : p.access_status === "rejected" ? "Refusé" : "En attente"}</span>
          </Link></li>
        ))}</ul> : <Empty title="Aucun résultat" text="Aucun apprenant ne correspond." />}
      </Panel>
    </>
  );
}
