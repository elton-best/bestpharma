import { createFileRoute } from "@tanstack/react-router";
import { appHead, Empty, PageHeader, Panel } from "@/components/app/AppShell";
import { ErrorBox, Loading } from "@/components/admin/AdminShell";
import { fdate, useAdmin, useAdminActions } from "@/lib/admin";

export const Route = createFileRoute("/admin/candidatures")({ head: appHead("Candidatures", "Valider ou refuser les nouvelles inscriptions."), component: Page });

function Page() {
  const a = useAdmin();
  const { refresh, setAccess } = useAdminActions();
  if (a.error) return <ErrorBox error={a.error} onRetry={refresh} />;
  if (a.loading) return <Loading />;
  const rejected = a.learners.filter((p) => p.access_status === "rejected");
  return (
    <>
      <PageHeader eyebrow="Utilisateurs" title="Candidatures" subtitle="Nouvelles inscriptions en attente. Valider donne l'accès complet, refuser le bloque." />
      <Panel title={`En attente de validation (${a.candidates.length})`}>
        {a.candidates.length ? (
          <ul className="divide-y divide-line">
            {a.candidates.map((p) => {
              const paid = (a.payments.data ?? []).find((x) => x.user_id === p.id);
              return (
                <li key={p.id} className="flex flex-col gap-3 py-3.5 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold text-ink">{p.full_name || "—"}</p>
                      <span className="inline-flex items-center rounded-full bg-amber/15 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                        {p.access_status === "pending" ? "En attente" : p.access_status}
                      </span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground mt-0.5">
                      {p.email} · inscrit le {fdate(p.created_at)}
                      {paid ? ` · paiement ${paid.status === "pending" ? "à vérifier" : paid.status}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setAccess(p.id, "active")}
                      className="btn-base btn-glow text-xs py-1.5 px-3 flex-1 sm:flex-none cursor-pointer"
                    >
                      Valider l'accès
                    </button>
                    <button
                      type="button"
                      onClick={() => setAccess(p.id, "rejected")}
                      className="btn-base btn-ghost text-xs py-1.5 px-3 flex-1 sm:flex-none cursor-pointer"
                    >
                      Refuser
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <Empty title="File vide" text="Aucune candidature en attente." />
        )}
      </Panel>
      {rejected.length > 0 && <Panel title="Refusées" className="mt-6"><ul className="divide-y divide-line">{rejected.map((p) => <li key={p.id} className="flex items-center justify-between gap-3 py-3 text-sm"><span className="min-w-0 truncate">{p.full_name || p.email}</span><button onClick={() => setAccess(p.id, "pending")} className="btn-base btn-ghost text-xs">Remettre en attente</button></li>)}</ul></Panel>}
    </>
  );
}
