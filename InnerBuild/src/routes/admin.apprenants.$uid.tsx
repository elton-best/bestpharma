import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "reicon-react";
import { appHead, Bar, Empty, PageHeader, Panel, Stat } from "@/components/app/AppShell";
import { ErrorBox, Loading } from "@/components/admin/AdminShell";
import { fdate, useAdmin, useAdminActions } from "@/lib/admin";
import { statusLabel } from "@/lib/learner";
import { modules } from "@/data/course";

export const Route = createFileRoute("/admin/apprenants/$uid")({ head: appHead("Fiche apprenant", "Profil, progression, paiements et rendus d'un apprenant."), component: Page });

function Page() {
  const { uid } = Route.useParams();
  const a = useAdmin();
  const { refresh, setAccess } = useAdminActions();
  if (a.error) return <ErrorBox error={a.error} onRetry={refresh} />;
  if (a.loading) return <Loading />;
  const p = a.byId(uid);
  if (!p) return <Empty title="Apprenant introuvable" text="Ce compte n'existe pas ou a été supprimé." />;
  const done = new Set(a.lessonsOf(uid).map((l) => l.lesson_id));
  const pays = (a.payments.data ?? []).filter((x) => x.user_id === uid);
  const subs = (a.subs.data ?? []).filter((x) => x.user_id === uid);
  const active = p.access_status === "active";
  return (
    <>
      <Link to="/admin/apprenants" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-ink"><ArrowLeft size={16} /> Tous les apprenants</Link>
      <PageHeader eyebrow="Fiche apprenant" title={p.full_name || p.email} subtitle={`${p.email} · inscrit le ${fdate(p.created_at)}`}
        action={<button onClick={() => setAccess(p.id, active ? "pending" : "active")} className={`btn-base ${active ? "btn-ghost" : "btn-glow"}`}>{active ? "Retirer l'accès" : "Activer l'accès"}</button>} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Progression" value={`${a.pctOf(uid)} %`} hint={`${done.size} leçons`} />
        <Stat label="Accès" value={active ? "Actif" : p.access_status === "rejected" ? "Refusé" : "Attente"} />
        <Stat label="Rendus" value={String(subs.length)} hint={`${subs.filter((s) => s.status === "validated").length} validés`} />
        <Stat label="Paiements" value={String(pays.length)} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Profil"><dl className="space-y-2 text-sm"><div><dt className="text-xs text-muted-foreground">Objectif</dt><dd className="text-ink">{p.goal || "—"}</dd></div><div><dt className="text-xs text-muted-foreground">Niveau</dt><dd className="text-ink">{p.level || "—"}</dd></div><div><dt className="text-xs text-muted-foreground">Démarrage guidé</dt><dd className="text-ink">{p.onboarded ? "Terminé" : "Pas encore"}</dd></div></dl></Panel>
        <Panel title="Progression par module"><ul className="space-y-3">{modules.map((m) => { const n = m.lessons.filter((l) => done.has(l.id)).length; const pct = Math.round((n / m.lessons.length) * 100); return <li key={m.id}><div className="mb-1 flex justify-between text-xs"><span className="font-semibold text-ink">{m.step} · {m.title}</span><span>{n}/{m.lessons.length}</span></div><Bar value={pct} /></li>; })}</ul></Panel>
        <Panel title="Paiements">{pays.length ? <ul className="divide-y divide-line text-sm">{pays.map((x) => <li key={x.id} className="flex items-center justify-between gap-2 py-2"><span className="min-w-0 truncate font-mono">{x.reference}</span><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${statusLabel[x.status]?.cls}`}>{statusLabel[x.status]?.label ?? x.status}</span></li>)}</ul> : <p className="text-sm text-muted-foreground">Aucun paiement.</p>}</Panel>
        <Panel title="Rendus">{subs.length ? <ul className="divide-y divide-line text-sm">{subs.map((x) => <li key={x.id} className="flex items-center justify-between gap-2 py-2"><span className="min-w-0 truncate">{x.title}</span><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${statusLabel[x.status]?.cls}`}>{statusLabel[x.status]?.label ?? x.status}</span></li>)}</ul> : <p className="text-sm text-muted-foreground">Aucun rendu.</p>}</Panel>
      </div>
    </>
  );
}
