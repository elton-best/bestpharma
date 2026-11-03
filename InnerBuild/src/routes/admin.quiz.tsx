import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { appHead, Empty, PageHeader, Panel } from "@/components/app/AppShell";
import { ErrorBox, Loading } from "@/components/admin/AdminShell";
import { useAllContent, useContentActions } from "@/lib/content";
import { Pill } from "./admin.cours";
import { QuizForm } from "./admin.cours.$id";

export const Route = createFileRoute("/admin/quiz")({ head: appHead("Quiz", "Tous les QCM des cours : création, points et publication."), component: Page });
const tip = { contentStyle: { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 } };

function Page() {
  const q = useAllContent();
  const act = useContentActions();
  const [course, setCourse] = useState("");
  const [k, setK] = useState(0);
  const [editing, setEditing] = useState<string | null>(null);
  if (q.error) return <ErrorBox error={q.error as Error} onRetry={() => q.refetch()} />;
  if (q.isLoading) return <Loading />;
  const { courses, modules, quiz } = q.data!;
  const cid = course || courses[0]?.id || "";
  const mods = modules.filter((m) => m.course_id === cid);
  const chart = modules.filter((m) => quiz.some((x) => x.module_id === m.id)).map((m) => ({ name: m.title.slice(0, 14), questions: quiz.filter((x) => x.module_id === m.id).length, points: quiz.filter((x) => x.module_id === m.id).reduce((s, x) => s + x.points, 0) }));
  return (
    <>
      <PageHeader eyebrow="Formations" title="Quiz" subtitle="QCM rattachés aux modules. Réponse unique ou multiple, explication et points par question." />
      {chart.length > 0 && <Panel title="Questions et points par module"><div className="h-52"><ResponsiveContainer width="100%" height="100%"><BarChart data={chart} margin={{ left: -20, right: 8 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" /><YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" /><Tooltip {...tip} /><Bar dataKey="questions" fill="var(--accent)" radius={[6, 6, 0, 0]} /><Bar dataKey="points" fill="var(--muted-foreground)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></Panel>}
      {!courses.length ? <Empty title="Aucun cours" text="Crée d'abord un cours." /> : (
        <Panel title="Nouvelle question" className="mt-6">
          <label className="mb-3 block text-xs font-semibold text-muted-foreground">Cours<select value={cid} onChange={(e) => { setCourse(e.target.value); setK((x) => x + 1); }} className="field mt-1">{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
          {mods.length ? <QuizForm key={`${cid}-${k}`} modules={mods} label="Ajouter la question" initial={{ module_id: mods[0]!.id, question: "", choices: ["", "", "", ""], answers: [0], allow_multiple: false, explanation: "", points: 20 }}
            onSave={async (v) => { const ok = await act.insert("quiz_questions", { ...v, position: quiz.filter((x) => x.module_id === v.module_id).length }); if (ok) setK((x) => x + 1); return ok; }} />
            : <p className="text-sm text-muted-foreground">Ce cours n'a aucun module.</p>}
        </Panel>
      )}
      <div className="mt-6 space-y-4">{mods.map((m) => {
        const qs = quiz.filter((x) => x.module_id === m.id);
        return (
          <Panel key={m.id} title={`${m.title} · ${qs.length} question${qs.length > 1 ? "s" : ""} · ${qs.reduce((s, x) => s + x.points, 0)} pts`}>
            {qs.length ? <ol className="divide-y divide-line">{qs.map((x, i) => (
              <li key={x.id} className="py-3">{editing === x.id
                ? <QuizForm modules={mods} label="Enregistrer" initial={x} onCancel={() => setEditing(null)} onSave={async (v) => { const ok = await act.update("quiz_questions", x.id, v); if (ok) setEditing(null); return ok; }} />
                : <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <p className="min-w-0 flex-1 text-sm font-semibold text-ink">{i + 1}. {x.question} <span className="text-xs font-normal text-muted-foreground">({x.points} pts{x.allow_multiple ? " · multiple" : ""})</span></p>
                    <div className="flex flex-wrap items-center gap-2"><Pill on={x.published} />
                      <button onClick={() => setEditing(x.id)} className="btn-base btn-ghost text-xs">Modifier</button>
                      <button onClick={() => act.update("quiz_questions", x.id, { published: !x.published }, x.published ? "Question dépubliée" : "Question publiée")} className="btn-base btn-ghost text-xs">{x.published ? "Dépublier" : "Publier"}</button>
                      <button onClick={() => act.remove("quiz_questions", x.id, x.question)} className="btn-base btn-ghost text-xs text-destructive">Supprimer</button>
                    </div>
                  </div>}
              </li>
            ))}</ol> : <p className="text-sm text-muted-foreground">Aucune question dans ce module.</p>}
          </Panel>
        );
      })}</div>
    </>
  );
}
