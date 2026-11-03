import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "@/components/ui/heroui-toast";
import { ExternalLink, Github, Award, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { appHead, Empty, PageHeader, Panel } from "@/components/app/AppShell";
import { ErrorBox, Loading } from "@/components/admin/AdminShell";
import { fdate, useAdmin, useAdminActions, type ASub } from "@/lib/admin";
import { statusLabel } from "@/lib/learner";
import { LearnerSubmissionViewer } from "@/components/app/LearnerSubmissionViewer";

export const Route = createFileRoute("/admin/rendus")({ head: appHead("File de correction", "Corriger les rendus des apprenants."), component: Page });

function Page() {
  const a = useAdmin();
  const { refresh } = useAdminActions();
  const [f, setF] = useState<"pending" | "validated" | "changes" | "all">("pending");
  if (a.error) return <ErrorBox error={a.error} onRetry={refresh} />;
  if (a.loading) return <Loading />;
  
  const allSubs = a.subs.data ?? [];
  const pendingList = a.pendingSubs;
  const validatedList = allSubs.filter((s) => s.status === "validated");
  const changesList = allSubs.filter((s) => s.status === "changes");

  const list =
    f === "pending"
      ? (pendingList.length > 0 ? pendingList : allSubs)
      : f === "validated"
      ? validatedList
      : f === "changes"
      ? changesList
      : allSubs;

  return (
    <>
      <PageHeader
        eyebrow="Correction Admin"
        title="File de correction des Exercices de Cours (Admin Uniquement)"
        subtitle="L'Admin évalue et valide les travaux pratiques et exercices de cours soumis par les apprenants. Attribuez une note, rédigez vos retours précis, puis validez. (Les projets du Challenge InnerBuild sont évalués séparément par le Jury)."
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => setF("pending")}
          className={`rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold transition-colors ${
            f === "pending" ? "bg-ink text-paper shadow-xs" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          À traiter ({pendingList.length})
        </button>
        <button
          onClick={() => setF("all")}
          className={`rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold transition-colors ${
            f === "all" ? "bg-ink text-paper shadow-xs" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          Tous ({allSubs.length})
        </button>
        <button
          onClick={() => setF("validated")}
          className={`rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold transition-colors ${
            f === "validated" ? "bg-ink text-paper shadow-xs" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          Validés ({validatedList.length})
        </button>
        <button
          onClick={() => setF("changes")}
          className={`rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold transition-colors ${
            f === "changes" ? "bg-ink text-paper shadow-xs" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          À refaire ({changesList.length})
        </button>
      </div>
      <Panel>
        {list.length ? (
          <ul className="divide-y divide-line">
            {list.map((s) => (
              <Review key={s.id} s={s} who={a.who(s.user_id)} />
            ))}
          </ul>
        ) : (
          <Empty title="File vide" text="Aucun rendu dans cette catégorie." />
        )}
      </Panel>
    </>
  );
}

const STATUSES = [
  ["pending", "En attente"],
  ["submitted", "Soumis"],
  ["review", "En relecture"],
  ["validated", "Validé"],
  ["changes", "À refaire"],
] as const;

function Review({ s, who }: { s: ASub; who: string }) {
  const { review } = useAdminActions();
  const [fb, setFb] = useState("");
  const [grade, setGrade] = useState<number | string>(s.grade ?? "");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function setStatus(status: string) {
    setBusy(true);
    const numGrade = grade === "" ? null : Number(grade);
    await review(s.id, status, s.feedback, numGrade, s.user_id, s.title);
    setBusy(false);
  }

  async function send(targetStatus?: string) {
    if (fb.trim().length < 2 && grade === "" && !targetStatus) {
      toast.danger("Veuillez renseigner un retour ou une note.");
      return;
    }
    const stamp = new Date().toLocaleDateString("fr-FR");
    const numGrade = grade === "" ? null : Number(grade);
    const history = fb.trim()
      ? s.feedback
        ? `${s.feedback}\n\n— ${stamp}${numGrade != null ? ` (Note : ${numGrade}/20)` : ""}\n${fb.trim()}`
        : `— ${stamp}${numGrade != null ? ` (Note : ${numGrade}/20)` : ""}\n${fb.trim()}`
      : s.feedback;
    setBusy(true);
    const nextStatus = targetStatus ?? (numGrade != null && numGrade >= 10 ? "validated" : "review");
    await review(s.id, nextStatus, history, numGrade, s.user_id, s.title);
    setBusy(false);
    setFb("");
    setOpen(false);
  }

  return (
    <li className="py-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-ink">{s.title}</p>
            {s.grade != null && (
              <span className="rounded-full bg-emerald/15 px-2.5 py-0.5 text-xs font-bold text-emerald flex items-center gap-1">
                <Award className="h-3 w-3" /> Note : {s.grade}/20
              </span>
            )}
            {s.course_id && (
              <span className="rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                Cours : {s.course_id}
              </span>
            )}
          </div>
          <p className="truncate text-xs text-muted-foreground mt-0.5">{who} · {fdate(s.created_at)}</p>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
            {s.repo_url && (
              <a href={s.repo_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline font-mono">
                <Github className="h-3.5 w-3.5" /> Dépôt GitHub <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {s.demo_url && (
              <a href={s.demo_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-emerald hover:underline font-mono">
                <ExternalLink className="h-3.5 w-3.5" /> Démo en ligne
              </a>
            )}
          </div>
        </div>

        <span className={`w-fit shrink-0 rounded-full px-3 py-1 text-xs font-bold ${statusLabel[s.status]?.cls ?? "bg-muted"}`}>
          {statusLabel[s.status]?.label ?? (s.status === "review" ? "En relecture" : s.status)}
        </span>
      </div>

      {s.notes && (
        <div className="mt-3">
          <p className="font-semibold text-ink text-xs mb-1.5">Documents & Livrables transmis :</p>
          <LearnerSubmissionViewer
            notes={s.notes}
            repoUrl={s.repo_url}
            demoUrl={s.demo_url}
            title={s.title}
          />
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Statut">
        {STATUSES.map(([k, l]) => (
          <button
            key={k}
            disabled={busy}
            aria-pressed={s.status === k}
            onClick={() => setStatus(k)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${s.status === k ? "bg-ink text-paper" : "bg-muted text-muted-foreground hover:bg-line"}`}
          >
            {l}
          </button>
        ))}
        <button onClick={() => setOpen(!open)} aria-expanded={open} className="btn-base btn-ghost ml-auto text-xs">
          {open ? "Fermer" : "Évaluer / Noter"}
        </button>
      </div>

      {open && (
        <div className="mt-4 rounded-xl border border-line bg-card p-4 space-y-3">
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-ink">Attribuer une note :</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={20}
                step={0.5}
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                placeholder="Ex. 18"
                className="field w-24 text-xs font-bold"
              />
              <span className="text-xs text-muted-foreground font-semibold">/ 20</span>
            </div>
          </div>

          {s.feedback && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Historique des retours :</p>
              <pre className="whitespace-pre-wrap rounded-lg bg-muted p-3 font-sans text-xs text-muted-foreground">{s.feedback}</pre>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-ink block mb-1" htmlFor={`fb-${s.id}`}>Nouveau retour ligne par ligne :</label>
            <textarea
              id={`fb-${s.id}`}
              value={fb}
              onChange={(e) => setFb(e.target.value)}
              rows={4}
              placeholder="Points forts, points à améliorer, architecture du code, tests, consignes pour valider..."
              className="field text-xs"
            />
          </div>

          <div className="flex flex-wrap gap-2 justify-end pt-2 border-t border-line">
            <button
              disabled={busy}
              onClick={() => send("changes")}
              className="btn-base btn-ghost text-xs text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/10 disabled:opacity-50"
            >
              <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Demander corrections (À refaire)
            </button>
            <button
              disabled={busy}
              onClick={() => send("review")}
              className="btn-base btn-ghost text-xs disabled:opacity-50"
            >
              <Clock className="h-3.5 w-3.5 mr-1" /> Enregistrer retour (En relecture)
            </button>
            <button
              disabled={busy}
              onClick={() => send("validated")}
              className="btn-base btn-glow text-xs disabled:opacity-50"
            >
              <CheckCircle className="h-3.5 w-3.5 mr-1" /> Valider le projet & Notifier
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

