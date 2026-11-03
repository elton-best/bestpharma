import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "reicon-react";
import { appHead, Empty, PageHeader, Panel } from "@/components/app/AppShell";
import { ErrorBox, Loading } from "@/components/admin/AdminShell";
import { useContentActions, useCourseContent, type CLesson, type CModule, type CQuiz, type CExercise, type CCourseExam } from "@/lib/content";
import { MoveButtons, Pill } from "./admin.cours";
import { FilePreview } from "@/components/admin/FilePreview";
import { MarkdownEditor } from "@/components/admin/MarkdownEditor";

export const Route = createFileRoute("/admin/cours/$id")({ head: appHead("Éditeur de cours", "Modules, leçons et quiz d'un cours."), component: Page });

type Tab = "modules" | "lessons" | "exercises" | "quiz" | "exam";
const kindLabel: Record<string, string> = { text: "Texte", pdf: "PDF seul", mixed: "Texte + PDF + image" };

function Page() {
  const { id } = Route.useParams();
  const q = useCourseContent(id);
  const act = useContentActions();
  const [tab, setTab] = useState<Tab>("modules");
  const [info, setInfo] = useState<{ title: string; description: string; image_url: string; pdf_url: string } | null>(null);
  if (q.error) return <ErrorBox error={q.error as Error} onRetry={() => q.refetch()} />;
  if (q.isLoading) return <Loading />;
  const { course, modules, lessons, quiz, exercises } = q.data!;
  const exam = (q.data as any)?.exam ?? null;
  if (!course) return <Empty title="Cours introuvable" text="Il a peut-être été supprimé." />;
  const edit = info ?? { title: course.title, description: course.description, image_url: course.image_url ?? "", pdf_url: course.pdf_url ?? "" };
  return (
    <>
      <Link to="/admin/cours" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-ink"><ArrowLeft size={16} /> Tous les cours</Link>
      <PageHeader eyebrow="Éditeur de cours" title={course.title} action={<div className="flex items-center gap-2"><Pill on={course.published} /><button onClick={() => act.update("courses", course.id, { published: !course.published }, course.published ? "Cours dépublié" : "Cours publié")} className="btn-base btn-glow">{course.published ? "Dépublier" : "Publier le cours"}</button></div>} />
      <Panel title="Informations">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_2fr_1fr_1fr_auto]">
          <input value={edit.title} onChange={(e) => setInfo({ ...edit, title: e.target.value })} className="field" placeholder="Titre" />
          <input value={edit.description} onChange={(e) => setInfo({ ...edit, description: e.target.value })} className="field" placeholder="Description" />
          <input type="url" value={edit.image_url} onChange={(e) => setInfo({ ...edit, image_url: e.target.value })} className="field" placeholder="URL de l'image de présentation" />
          <input type="url" value={edit.pdf_url} onChange={(e) => setInfo({ ...edit, pdf_url: e.target.value })} className="field" placeholder="URL du PDF de présentation" />
          <button disabled={!info || !edit.title.trim()} onClick={async () => { if (await act.update("courses", course.id, { title: edit.title.trim(), description: edit.description.trim(), image_url: edit.image_url.trim(), pdf_url: edit.pdf_url.trim() })) setInfo(null); }} className="btn-base btn-ghost disabled:opacity-50">Enregistrer</button>
        </div>
      </Panel>
      <div className="my-6 flex gap-1 overflow-x-auto">
        {([
          ["modules", `Modules (${modules.length})`],
          ["lessons", `Leçons (${lessons.length})`],
          ["exercises", `Exercices (${exercises.length})`],
          ["quiz", `Quiz (${quiz.length})`],
          ["exam", `Contrôle final (${exam ? "Actif" : "0"})`],
        ] as [Tab, string][]).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold ${tab === k ? "bg-ink text-paper" : "text-muted-foreground hover:bg-muted"}`}>{l}</button>
        ))}
      </div>
      {tab === "modules" && <Modules courseId={id} modules={modules} lessons={lessons} quiz={quiz} exercises={exercises} />}
      {tab === "lessons" && <Lessons modules={modules} lessons={lessons} />}
      {tab === "exercises" && <Exercises courseId={id} modules={modules} lessons={lessons} exercises={exercises} />}
      {tab === "quiz" && <Quiz modules={modules} quiz={quiz} />}
      {tab === "exam" && <CourseExam courseId={id} exam={exam} />}
    </>
  );
}

function Modules({ courseId, modules, lessons, quiz, exercises }: { courseId: string; modules: CModule[]; lessons: CLesson[]; quiz: CQuiz[]; exercises: CExercise[] }) {
  const act = useContentActions();
  const [step, setStep] = useState(""); const [title, setTitle] = useState("");
  const [editing, setEditing] = useState<CModule | null>(null);
  return (
    <>
      <Panel title="Nouveau module">
        <div className="grid gap-3 sm:grid-cols-[160px_1fr_auto]">
          <input value={step} onChange={(e) => setStep(e.target.value)} placeholder="Étape (ex. Spec)" className="field" />
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre du module *" className="field" />
          <button disabled={!title.trim()} onClick={async () => { if (await act.insert("course_modules", { course_id: courseId, step: step.trim(), title: title.trim(), position: modules.length })) { setStep(""); setTitle(""); } }} className="btn-base btn-glow disabled:opacity-50">Ajouter</button>
        </div>
      </Panel>
      <Panel className="mt-4">{modules.length ? <ul className="divide-y divide-line">{modules.map((m, i) => (
        <li key={m.id} className="py-3">
          {editing?.id === m.id ? (
            <div className="grid gap-2 sm:grid-cols-[140px_1fr_auto_auto_auto] sm:items-center">
              <input value={editing.step} onChange={(e) => setEditing({ ...editing, step: e.target.value })} className="field" />
              <input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className="field" />
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={editing.free} onChange={(e) => setEditing({ ...editing, free: e.target.checked })} /> Gratuit</label>
              <button onClick={async () => { if (await act.update("course_modules", m.id, { step: editing.step, title: editing.title, free: editing.free })) setEditing(null); }} className="btn-base btn-glow text-xs">Enregistrer</button>
              <button onClick={() => setEditing(null)} className="btn-base btn-ghost text-xs">Annuler</button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1"><p className="font-semibold text-ink"><span className="mr-2 rounded bg-accent/10 px-1.5 py-0.5 text-xs text-accent">{m.step || "—"}</span>{m.title}{m.free && <span className="ml-2 text-xs text-emerald">gratuit</span>}</p><p className="text-xs text-muted-foreground">{lessons.filter((l) => l.module_id === m.id).length} leçons · {exercises.filter((x) => x.module_id === m.id).length} exercices · {quiz.filter((x) => x.module_id === m.id).length} questions</p></div>
              <div className="flex flex-wrap items-center gap-2"><Pill on={m.published} />
                <button onClick={() => setEditing(m)} className="btn-base btn-ghost text-xs">Modifier</button>
                <button onClick={() => act.update("course_modules", m.id, { published: !m.published }, m.published ? "Module dépublié" : "Module publié")} className="btn-base btn-ghost text-xs">{m.published ? "Dépublier" : "Publier"}</button>
                <button onClick={() => act.remove("course_modules", m.id, m.title)} className="btn-base btn-ghost text-xs text-destructive">Supprimer</button>
                <MoveButtons first={i === 0} last={i === modules.length - 1} onUp={() => act.move("course_modules", modules, i, -1)} onDown={() => act.move("course_modules", modules, i, 1)} />
              </div>
            </div>
          )}
        </li>
      ))}</ul> : <Empty title="Aucun module" text="Ajoute un premier module." />}</Panel>
    </>
  );
}

export const blank = (module_id: string): Omit<CLesson, "id" | "position" | "published"> => ({ module_id, title: "", kind: "text", body: "", task: "", file_path: "", image_path: "", minutes: 10 });

export function LessonForm({ modules, initial, onSave, onCancel, saveLabel }: { modules: CModule[]; initial: Omit<CLesson, "id" | "position" | "published">; onSave: (v: Omit<CLesson, "id" | "position" | "published">) => Promise<boolean>; onCancel?: () => void; saveLabel: string }) {
  const act = useContentActions();
  const [v, setV] = useState(initial); const [busy, setBusy] = useState(false); const [drag, setDrag] = useState(false);
  const needsFile = v.kind !== "text"; const needsBody = v.kind !== "pdf";
  async function file(f?: File) { if (!f) return; setBusy(true); const p = await act.upload(f); setBusy(false); if (p) setV((x) => ({ ...x, file_path: p })); }
  async function image(f?: File) { if (!f) return; setBusy(true); const p = await act.upload(f, "image"); setBusy(false); if (p) setV((x) => ({ ...x, image_path: p })); }
  const valid = v.title.trim() && v.module_id && (!needsFile || v.file_path) && (!needsBody || v.body.trim());
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_140px_100px]">
        <select value={v.module_id} onChange={(e) => setV({ ...v, module_id: e.target.value })} className="field">{modules.map((m) => <option key={m.id} value={m.id}>{m.step} — {m.title}</option>)}</select>
        <input value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} placeholder="Titre de la leçon *" className="field" />
        <select value={v.kind} onChange={(e) => setV({ ...v, kind: e.target.value })} className="field"><option value="text">Texte</option><option value="mixed">Texte + PDF + image</option><option value="pdf">PDF seul</option></select>
        <input type="number" min={1} value={v.minutes} onChange={(e) => setV({ ...v, minutes: Math.max(1, +e.target.value || 1) })} className="field" title="Durée (min)" />
      </div>
      {needsBody && <MarkdownEditor value={v.body} onChange={(body) => setV((x) => ({ ...x, body }))} placeholder="Contenu de la leçon en markdown : titres, listes, code, tableaux, images…" />}
      {needsFile && (
        <label onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); file(e.dataTransfer.files[0]); }}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center text-sm ${drag ? "border-accent bg-accent/5" : "border-line"}`}>
          <input type="file" accept="application/pdf" className="hidden" onChange={(e) => file(e.target.files?.[0])} />
          <span className="font-semibold text-ink">{busy ? "Envoi…" : v.file_path ? "PDF joint ✓ — cliquer pour remplacer" : "Glisse un PDF ici ou clique (10 Mo max)"}</span>
          {v.file_path && <button type="button" onClick={(e) => { e.preventDefault(); setV({ ...v, file_path: "" }); }} className="mt-1 text-xs text-destructive">Retirer le PDF</button>}
        </label>
      )}
      {needsFile && v.file_path && <FilePreview path={v.file_path} type="pdf" />}
      {needsBody && (
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-line p-4 text-sm">
          <input type="file" accept="image/*" className="hidden" onChange={(e) => image(e.target.files?.[0])} />
          <span className="font-semibold text-ink">{busy ? "Envoi…" : v.image_path ? "Image jointe ✓ — cliquer pour remplacer" : "Ajouter une image d'illustration (optionnel)"}</span>
          {v.image_path && <button type="button" onClick={(e) => { e.preventDefault(); setV({ ...v, image_path: "" }); }} className="ml-auto text-xs text-destructive">Retirer</button>}
        </label>
      )}
      {needsBody && v.image_path && <FilePreview path={v.image_path} type="image" />}
      <input value={v.task} onChange={(e) => setV({ ...v, task: e.target.value })} placeholder="Exercice / consigne « À faire »" className="field" />
      <div className="flex gap-2"><button disabled={!valid || busy} onClick={async () => { setBusy(true); await onSave(v); setBusy(false); }} className="btn-base btn-glow disabled:opacity-50">{saveLabel}</button>{onCancel && <button onClick={onCancel} className="btn-base btn-ghost">Annuler</button>}</div>
    </div>
  );
}

function Lessons({ modules, lessons }: { modules: CModule[]; lessons: CLesson[] }) {
  const act = useContentActions();
  const [filter, setFilter] = useState<"all" | "text" | "pdf" | "mixed">("all");
  const [mod, setMod] = useState<string>("all");
  const [editing, setEditing] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  if (!modules.length) return <Empty title="Crée d'abord un module" text="Les leçons sont rangées dans des modules." />;
  const shown = modules.filter((m) => mod === "all" || m.id === mod);
  return (
    <>
      <Panel title="Ajouter une leçon"><LessonForm key={formKey} modules={modules} initial={blank(mod !== "all" ? mod : modules[0]!.id)} saveLabel="Ajouter la leçon"
        onSave={async (v) => { const n = lessons.filter((l) => l.module_id === v.module_id).length; const ok = await act.insert("lessons", { ...v, position: n }); if (ok) setFormKey((k) => k + 1); return ok; }} /></Panel>
      <div className="my-4 flex flex-wrap gap-2">
        {(["all", "text", "pdf", "mixed"] as const).map((k) => <button key={k} onClick={() => setFilter(k)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${filter === k ? "bg-ink text-paper" : "text-muted-foreground hover:bg-muted"}`}>{k === "all" ? "Toutes" : kindLabel[k]}</button>)}
        <select value={mod} onChange={(e) => setMod(e.target.value)} className="field ml-auto w-auto py-1.5 text-xs"><option value="all">Tous les modules</option>{modules.map((m) => <option key={m.id} value={m.id}>{m.step} — {m.title}</option>)}</select>
      </div>
      <div className="space-y-4">{shown.map((m) => {
        const ls = lessons.filter((l) => l.module_id === m.id);
        const vis = ls.filter((l) => filter === "all" || l.kind === filter);
        return (
          <Panel key={m.id} title={`${m.step} — ${m.title}`}>{vis.length ? <ul className="divide-y divide-line">{vis.map((l) => { const i = ls.indexOf(l); return (
            <li key={l.id} className="py-3">{editing === l.id
              ? <LessonForm modules={modules} initial={l} saveLabel="Enregistrer" onCancel={() => setEditing(null)} onSave={async (v) => { const ok = await act.update("lessons", l.id, v); if (ok) setEditing(null); return ok; }} />
              : <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1"><p className="font-semibold text-ink">{l.title}</p><p className="text-xs text-muted-foreground">{kindLabel[l.kind] ?? l.kind} · {l.minutes} min{l.file_path ? " · PDF joint" : ""}</p></div>
                  <div className="flex flex-wrap items-center gap-2"><Pill on={l.published} />
                    <button onClick={() => setEditing(l.id)} className="btn-base btn-ghost text-xs">Modifier</button>
                    <button onClick={() => act.update("lessons", l.id, { published: !l.published }, l.published ? "Leçon dépubliée" : "Leçon publiée")} className="btn-base btn-ghost text-xs">{l.published ? "Dépublier" : "Publier"}</button>
                    <button onClick={() => act.remove("lessons", l.id, l.title)} className="btn-base btn-ghost text-xs text-destructive">Supprimer</button>
                    <MoveButtons first={i === 0} last={i === ls.length - 1} onUp={() => act.move("lessons", ls, i, -1)} onDown={() => act.move("lessons", ls, i, 1)} />
                  </div>
                </div>}
            </li>
          ); })}</ul> : <p className="text-sm text-muted-foreground">Aucune leçon{filter !== "all" ? " de ce format" : ""}.</p>}</Panel>
        );
      })}</div>
    </>
  );
}

type QDraft = { module_id: string; question: string; choices: string[]; answers: number[]; allow_multiple: boolean; explanation: string; points: number };
export function QuizForm({ modules, initial, onSave, onCancel, label }: { modules: CModule[]; initial: QDraft; onSave: (v: QDraft & { correct: number }) => Promise<boolean>; onCancel?: () => void; label: string }) {
  const [v, setV] = useState<QDraft>({ ...initial, answers: initial.answers?.length ? initial.answers : [0], allow_multiple: !!initial.allow_multiple, explanation: initial.explanation ?? "" });
  const [busy, setBusy] = useState(false);
  const choices = v.choices.map((c) => c.trim());
  const valid = v.question.trim() && choices.filter(Boolean).length >= 2 && v.answers.length >= 1 && v.answers.every((a) => choices[a]);
  const toggle = (i: number) => setV({ ...v, answers: v.allow_multiple ? (v.answers.includes(i) ? v.answers.filter((a) => a !== i) : [...v.answers, i].sort()) : [i] });
  const removeChoice = (i: number) => setV({ ...v, choices: v.choices.filter((_, j) => j !== i), answers: v.answers.filter((a) => a !== i).map((a) => (a > i ? a - 1 : a)) });
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_2fr_90px]">
        <select aria-label="Module" value={v.module_id} onChange={(e) => setV({ ...v, module_id: e.target.value })} className="field">{modules.map((m) => <option key={m.id} value={m.id}>{m.step} — {m.title}</option>)}</select>
        <input aria-label="Question" value={v.question} onChange={(e) => setV({ ...v, question: e.target.value })} placeholder="Question *" className="field" />
        <input aria-label="Points" type="number" min={1} value={v.points} onChange={(e) => setV({ ...v, points: Math.max(1, +e.target.value || 1) })} className="field" title="Points" />
      </div>
      <div className="flex gap-2 text-xs" role="group" aria-label="Mode de réponse">
        {([[false, "Réponse unique"], [true, "Réponses multiples"]] as const).map(([k, l]) => <button key={l} type="button" aria-pressed={v.allow_multiple === k} onClick={() => setV({ ...v, allow_multiple: k, answers: k ? v.answers : v.answers.slice(0, 1) })} className={`rounded-lg px-3 py-1.5 font-semibold ${v.allow_multiple === k ? "bg-ink text-paper" : "bg-muted text-muted-foreground"}`}>{l}</button>)}
      </div>
      <div className="space-y-2">{v.choices.map((c, i) => (
        <div key={i} className="flex items-center gap-2">
          <input type={v.allow_multiple ? "checkbox" : "radio"} aria-label={`Choix ${i + 1} correct`} checked={v.answers.includes(i)} onChange={() => toggle(i)} />
          <input value={c} onChange={(e) => setV({ ...v, choices: v.choices.map((x, j) => (j === i ? e.target.value : x)) })} placeholder={`Choix ${i + 1}`} className="field" />
          {v.choices.length > 2 && <button type="button" aria-label="Supprimer le choix" onClick={() => removeChoice(i)} className="icon-button">×</button>}
        </div>
      ))}</div>
      <p className="text-xs text-muted-foreground">Coche la ou les bonnes réponses (au moins une, minimum 2 choix).</p>
      <textarea aria-label="Explication" value={v.explanation} onChange={(e) => setV({ ...v, explanation: e.target.value })} rows={2} placeholder="Explication de la réponse (affichée après validation)" className="field text-sm" />
      <div className="flex flex-wrap gap-2">
        {v.choices.length < 6 && <button type="button" onClick={() => setV({ ...v, choices: [...v.choices, ""] })} className="btn-base btn-ghost text-xs">+ Choix</button>}
        <button disabled={!valid || busy} onClick={async () => { setBusy(true); await onSave({ ...v, question: v.question.trim(), explanation: v.explanation.trim(), choices, correct: v.answers[0] ?? 0 }); setBusy(false); }} className="btn-base btn-glow disabled:opacity-50">{busy ? "Enregistrement…" : label}</button>
        {onCancel && <button onClick={onCancel} className="btn-base btn-ghost">Annuler</button>}
      </div>
    </div>
  );
}
function Quiz({ modules, quiz }: { modules: CModule[]; quiz: CQuiz[] }) {
  const act = useContentActions();
  const [editing, setEditing] = useState<string | null>(null);
  const [k, setK] = useState(0);
  if (!modules.length) return <Empty title="Crée d'abord un module" text="Chaque quiz est rattaché à un module." />;
  return (
    <>
      <Panel title="Nouvelle question (QCM)"><QuizForm key={k} modules={modules} label="Ajouter la question" initial={{ module_id: modules[0]!.id, question: "", choices: ["", "", "", ""], answers: [0], allow_multiple: false, explanation: "", points: 20 }}
        onSave={async (v) => { const ok = await act.insert("quiz_questions", { ...v, position: quiz.filter((x) => x.module_id === v.module_id).length }); if (ok) setK((x) => x + 1); return ok; }} /></Panel>
      <div className="mt-4 space-y-4">{modules.map((m) => {
        const qs = quiz.filter((x) => x.module_id === m.id);
        if (!qs.length) return null;
        return (
          <Panel key={m.id} title={`${m.step} — ${m.title} · ${qs.reduce((s, x) => s + x.points, 0)} pts`}><ol className="divide-y divide-line">{qs.map((x, i) => (
            <li key={x.id} className="py-3">{editing === x.id
              ? <QuizForm modules={modules} label="Enregistrer" initial={x} onCancel={() => setEditing(null)} onSave={async (v) => { const ok = await act.update("quiz_questions", x.id, v); if (ok) setEditing(null); return ok; }} />
              : <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1 text-sm"><p className="font-semibold text-ink">{i + 1}. {x.question} <span className="text-xs text-muted-foreground">({x.points} pt{x.points > 1 ? "s" : ""})</span></p><ul className="mt-1 space-y-0.5 text-xs">{x.choices.map((c, ci) => { const ok = (x.answers?.length ? x.answers : [x.correct]).includes(ci); return <li key={ci} className={ok ? "font-bold text-emerald" : "text-muted-foreground"}>{ok ? "✓ " : "· "}{c}</li>; })}</ul>{x.explanation && <p className="mt-1 text-xs italic text-muted-foreground">{x.explanation}</p>}</div>
                  <div className="flex flex-wrap items-center gap-2"><Pill on={x.published} />
                    <button onClick={() => setEditing(x.id)} className="btn-base btn-ghost text-xs">Modifier</button>
                    <button onClick={() => act.update("quiz_questions", x.id, { published: !x.published }, x.published ? "Question dépubliée" : "Question publiée")} className="btn-base btn-ghost text-xs">{x.published ? "Dépublier" : "Publier"}</button>
                    <button onClick={() => act.remove("quiz_questions", x.id, x.question)} className="btn-base btn-ghost text-xs text-destructive">Supprimer</button>
                    <MoveButtons first={i === 0} last={i === qs.length - 1} onUp={() => act.move("quiz_questions", qs, i, -1)} onDown={() => act.move("quiz_questions", qs, i, 1)} />
                  </div>
                </div>}
            </li>
          ))}</ol></Panel>
        );
      })}{!quiz.length && <Empty title="Aucune question" text="Ajoute une première question ci-dessus." />}</div>
    </>
  );
}

import { Check, Plus, Trash2, Award, HelpCircle, Code, FileText, CheckCircle2 } from "lucide-react";

function Exercises({ courseId, modules, lessons, exercises }: { courseId: string; modules: CModule[]; lessons: CLesson[]; exercises: CExercise[] }) {
  const act = useContentActions();
  const [scope, setScope] = useState<"course" | "module" | "lesson">("course");
  const [mod, setMod] = useState(modules[0]?.id ?? "");
  const [les, setLes] = useState(lessons[0]?.id ?? "");
  const [type, setType] = useState<"projet" | "qcm" | "question_reponse">("projet");
  const [title, setTitle] = useState("");
  const [ins, setIns] = useState("");
  const [points, setPoints] = useState(20);
  const [solutionCriteria, setSolutionCriteria] = useState("");
  const [qcmChoices, setQcmChoices] = useState<string[]>(["", "", ""]);
  const [qcmAnswers, setQcmAnswers] = useState<number[]>([0]);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<CExercise | null>(null);

  const filteredLessons = lessons.filter((l) => !mod || l.module_id === mod);

  async function add() {
    if (!title.trim()) return;
    setBusy(true);

    const cId = courseId;
    const mId = scope === "course" ? null : mod || null;
    const lId = scope === "lesson" ? les || null : null;

    const payload: any = {
      course_id: cId,
      module_id: mId,
      lesson_id: lId,
      type,
      title: title.trim(),
      instructions: ins.trim(),
      points: Number(points) || 10,
      position: exercises.length,
      published: true,
    };

    if (type === "qcm") {
      payload.options = qcmChoices.filter(Boolean).map((choice, idx) => ({
        choice,
        correct: qcmAnswers.includes(idx),
      }));
      payload.solution_criteria = solutionCriteria.trim();
    } else if (type === "question_reponse") {
      payload.solution_criteria = solutionCriteria.trim();
    }

    const ok = await act.insert("exercises", payload);
    setBusy(false);
    if (ok) {
      setTitle("");
      setIns("");
      setSolutionCriteria("");
      setQcmChoices(["", "", ""]);
      setQcmAnswers([0]);
    }
  }

  return (
    <>
      <Panel title="Créer un nouvel exercice">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Portée de l'exercice</label>
              <select value={scope} onChange={(e) => setScope(e.target.value as any)} className="field">
                <option value="course">Global au Cours</option>
                <option value="module">Rattaché à un Module</option>
                <option value="lesson">Rattaché à une Leçon précise</option>
              </select>
            </div>

            {scope !== "course" && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Module</label>
                <select value={mod} onChange={(e) => { setMod(e.target.value); const first = lessons.find((l) => l.module_id === e.target.value); if (first) setLes(first.id); }} className="field">
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>{m.step} — {m.title}</option>
                  ))}
                </select>
              </div>
            )}

            {scope === "lesson" && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Leçon</label>
                <select value={les} onChange={(e) => setLes(e.target.value)} className="field">
                  {filteredLessons.map((l) => (
                    <option key={l.id} value={l.id}>{l.title}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Type d'exercice</label>
              <select value={type} onChange={(e) => setType(e.target.value as any)} className="field">
                <option value="projet">Projet à rendre (GitHub + Démo)</option>
                <option value="qcm">QCM interactif</option>
                <option value="question_reponse">Question / Réponse ouverte</option>
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
            <input aria-label="Titre de l'exercice" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre de l'exercice *" className="field" />
            <div className="flex items-center gap-1">
              <input type="number" min={1} value={points} onChange={(e) => setPoints(Number(e.target.value))} className="field" placeholder="Points" />
              <span className="text-xs text-muted-foreground">pts</span>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              {type === "projet" ? "Consignes & spécifications du projet (Markdown)" : "Énoncé / Consignes de l'exercice (Markdown)"}
            </label>
            <textarea value={ins} onChange={(e) => setIns(e.target.value)} rows={4} placeholder="Détaillez les exigences, les critères de validation, les liens utiles..." className="field font-mono text-xs" />
          </div>

          {type === "qcm" && (
            <div className="rounded-xl border border-line bg-muted/20 p-4 space-y-3">
              <p className="text-xs font-bold text-ink">Options du QCM (Cocher la ou les réponses exactes) :</p>
              {qcmChoices.map((choice, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={qcmAnswers.includes(idx)}
                    onChange={() => {
                      if (qcmAnswers.includes(idx)) setQcmAnswers(qcmAnswers.filter((a) => a !== idx));
                      else setQcmAnswers([...qcmAnswers, idx]);
                    }}
                    className="h-4 w-4 rounded border-line text-accent"
                  />
                  <input
                    value={choice}
                    onChange={(e) => {
                      const next = [...qcmChoices];
                      next[idx] = e.target.value;
                      setQcmChoices(next);
                    }}
                    placeholder={`Option ${idx + 1}`}
                    className="field flex-1 text-xs"
                  />
                  {qcmChoices.length > 2 && (
                    <button type="button" onClick={() => setQcmChoices(qcmChoices.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-destructive text-sm px-2">×</button>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => setQcmChoices([...qcmChoices, ""])} className="btn-base btn-ghost text-xs">
                <Plus className="h-3 w-3 mr-1" /> Ajouter une option
              </button>
            </div>
          )}

          {(type === "question_reponse" || type === "qcm") && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                {type === "question_reponse" ? "Réponse modèle / Critères de notation attendus" : "Explication de la réponse"}
              </label>
              <textarea value={solutionCriteria} onChange={(e) => setSolutionCriteria(e.target.value)} rows={2} placeholder="Explication fournie pour la correction ou l'auto-évaluation..." className="field text-xs" />
            </div>
          )}

          <button disabled={!title.trim() || busy} onClick={add} className="btn-base btn-glow disabled:opacity-50">
            {busy ? "Ajout…" : "Créer l'exercice"}
          </button>
        </div>
      </Panel>

      <div className="mt-6 space-y-4">
        <h3 className="font-bold text-ink text-sm">Exercices existants ({exercises.length})</h3>
        {exercises.length ? (
          <ul className="divide-y divide-line rounded-xl border border-line bg-card">
            {exercises.map((x, i) => {
              const scopeLabel = x.lesson_id
                ? `Leçon: ${lessons.find((l) => l.id === x.lesson_id)?.title || x.lesson_id}`
                : x.module_id
                ? `Module: ${modules.find((m) => m.id === x.module_id)?.title || x.module_id}`
                : "Cours complet";

              return (
                <li key={x.id} className="p-4">
                  {editing?.id === x.id ? (
                    <div className="space-y-3">
                      <div className="grid gap-2 sm:grid-cols-[1fr_120px]">
                        <input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className="field" />
                        <input type="number" value={editing.points} onChange={(e) => setEditing({ ...editing, points: Number(e.target.value) })} className="field" />
                      </div>
                      <MarkdownEditor label="Consignes" rows={4} value={editing.instructions} onChange={(instructions) => setEditing((e) => e && ({ ...e, instructions }))} />
                      <div className="flex gap-2">
                        <button
                          disabled={!editing.title.trim()}
                          onClick={async () => {
                            if (await act.update("exercises", x.id, { title: editing.title.trim(), instructions: editing.instructions.trim(), points: editing.points })) {
                              setEditing(null);
                            }
                          }}
                          className="btn-base btn-glow text-xs"
                        >
                          Enregistrer
                        </button>
                        <button onClick={() => setEditing(null)} className="btn-base btn-ghost text-xs">Annuler</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-ink">{x.title}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            x.type === "projet" ? "bg-accent/15 text-accent" : x.type === "qcm" ? "bg-purple-500/15 text-purple-600" : "bg-emerald/15 text-emerald"
                          }`}>
                            {x.type === "projet" ? "Projet à rendre" : x.type === "qcm" ? "QCM" : "Question / Réponse"}
                          </span>
                          <span className="text-xs font-semibold text-muted-foreground">{x.points || 10} pts</span>
                          <span className="rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{scopeLabel}</span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{x.instructions || "Pas de consignes."}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <Pill on={x.published} />
                        <button onClick={() => setEditing(x)} className="btn-base btn-ghost text-xs">Modifier</button>
                        <button onClick={() => act.update("exercises", x.id, { published: !x.published }, x.published ? "Exercice masqué" : "Exercice publié")} className="btn-base btn-ghost text-xs">
                          {x.published ? "Dépublier" : "Publier"}
                        </button>
                        <button onClick={() => act.remove("exercises", x.id, x.title)} className="btn-base btn-ghost text-xs text-destructive">
                          Supprimer
                        </button>
                        <MoveButtons first={i === 0} last={i === exercises.length - 1} onUp={() => act.move("exercises", exercises, i, -1)} onDown={() => act.move("exercises", exercises, i, 1)} />
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <Empty title="Aucun exercice programmé" text="Crée ton premier exercice ci-dessus." />
        )}
      </div>
    </>
  );
}

function CourseExam({ courseId, exam }: { courseId: string; exam: CCourseExam | null }) {
  const act = useContentActions();
  const [title, setTitle] = useState(exam?.title ?? "Contrôle Final de Validation");
  const [desc, setDesc] = useState(exam?.description ?? "Évaluation récapitulative des compétences acquises sur l'ensemble du cours.");
  const [passingScore, setPassingScore] = useState(exam?.passing_score ?? 70);
  const [questions, setQuestions] = useState<any[]>(exam?.questions ?? []);

  // Form for new question
  const [qTitle, setQTitle] = useState("");
  const [qType, setQType] = useState<"single" | "multiple" | "open">("single");
  const [qPoints, setQPoints] = useState(10);
  const [qChoices, setQChoices] = useState<string[]>(["", "", ""]);
  const [qCorrect, setQCorrect] = useState<number[]>([0]);
  const [qExplanation, setQExplanation] = useState("");
  const [busy, setBusy] = useState(false);

  const totalPoints = questions.reduce((acc, q) => acc + (Number(q.points) || 10), 0);

  function addQuestion() {
    if (!qTitle.trim()) return;
    const newQ: any = {
      id: crypto.randomUUID(),
      question: qTitle.trim(),
      type: qType,
      points: Number(qPoints) || 10,
      explanation: qExplanation.trim(),
    };
    if (qType === "single" || qType === "multiple") {
      newQ.choices = qChoices.filter(Boolean);
      newQ.correct = qType === "single" ? qCorrect[0] ?? 0 : qCorrect;
    }
    setQuestions([...questions, newQ]);
    setQTitle("");
    setQChoices(["", "", ""]);
    setQCorrect([0]);
    setQExplanation("");
  }

  function removeQuestion(idx: number) {
    setQuestions(questions.filter((_, i) => i !== idx));
  }

  async function saveExam() {
    setBusy(true);
    if (!exam) {
      await act.insert("course_exams", {
        course_id: courseId,
        title: title.trim(),
        description: desc.trim(),
        passing_score: Number(passingScore) || 70,
        questions,
      });
    } else {
      await act.update("course_exams", exam.id, {
        title: title.trim(),
        description: desc.trim(),
        passing_score: Number(passingScore) || 70,
        questions,
        updated_at: new Date().toISOString(),
      });
    }
    setBusy(false);
  }

  return (
    <div className="space-y-6">
      <Panel title="Paramètres du Contrôle Final">
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_140px]">
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Titre de l'épreuve</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="field" placeholder="Ex. Contrôle Final de Certification" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Description</label>
            <input value={desc} onChange={(e) => setDesc(e.target.value)} className="field" placeholder="Instructions pour l'épreuve..." />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Note min. requise (%)</label>
            <input type="number" min={1} max={100} value={passingScore} onChange={(e) => setPassingScore(Number(e.target.value))} className="field" />
          </div>
        </div>
      </Panel>

      <Panel title={`Questions de l'épreuve (${questions.length}) · Total : ${totalPoints} points`}>
        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-muted/10 p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-ink">Ajouter une question au contrôle :</p>
            <div className="grid gap-3 sm:grid-cols-[1fr_160px_100px]">
              <input value={qTitle} onChange={(e) => setQTitle(e.target.value)} placeholder="Intitulé de la question *" className="field" />
              <select value={qType} onChange={(e) => setQType(e.target.value as any)} className="field">
                <option value="single">QCM choix unique</option>
                <option value="multiple">QCM choix multiples</option>
                <option value="open">Question / Réflexion ouverte</option>
              </select>
              <input type="number" min={1} value={qPoints} onChange={(e) => setQPoints(Number(e.target.value))} placeholder="Points" className="field" />
            </div>

            {qType !== "open" && (
              <div className="space-y-2 pt-2">
                <p className="text-[11px] font-semibold text-muted-foreground">Options de réponse (Cocher la ou les bonnes réponses) :</p>
                {qChoices.map((choice, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type={qType === "single" ? "radio" : "checkbox"}
                      name="exam-qcm-radio"
                      checked={qCorrect.includes(i)}
                      onChange={() => {
                        if (qType === "single") setQCorrect([i]);
                        else setQCorrect(qCorrect.includes(i) ? qCorrect.filter((c) => c !== i) : [...qCorrect, i]);
                      }}
                      className="h-4 w-4 text-accent"
                    />
                    <input
                      value={choice}
                      onChange={(e) => {
                        const copy = [...qChoices];
                        copy[i] = e.target.value;
                        setQChoices(copy);
                      }}
                      placeholder={`Choix ${i + 1}`}
                      className="field flex-1 text-xs"
                    />
                    {qChoices.length > 2 && (
                      <button type="button" onClick={() => setQChoices(qChoices.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive px-2">×</button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => setQChoices([...qChoices, ""])} className="btn-base btn-ghost text-xs">
                  <Plus className="h-3 w-3 mr-1" /> Ajouter une option
                </button>
              </div>
            )}

            <div>
              <input value={qExplanation} onChange={(e) => setQExplanation(e.target.value)} placeholder="Explication ou correction détaillée (optionnel)" className="field text-xs" />
            </div>

            <button disabled={!qTitle.trim()} onClick={addQuestion} className="btn-base btn-glow text-xs">
              <Plus className="h-3 w-3 mr-1" /> Ajouter la question à l'épreuve
            </button>
          </div>

          {questions.length > 0 ? (
            <ul className="divide-y divide-line">
              {questions.map((q, idx) => (
                <li key={q.id || idx} className="py-3 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-ink text-sm">{idx + 1}. {q.question}</span>
                      <span className="rounded bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent">
                        {q.type === "single" ? "Choix unique" : q.type === "multiple" ? "Choix multiples" : "Question ouverte"}
                      </span>
                      <span className="text-xs text-muted-foreground font-semibold">{q.points || 10} pts</span>
                    </div>
                    {q.choices && (
                      <ul className="text-xs text-muted-foreground space-y-0.5 pl-4 list-disc">
                        {q.choices.map((c: string, ci: number) => {
                          const isOk = Array.isArray(q.correct) ? q.correct.includes(ci) : q.correct === ci;
                          return (
                            <li key={ci} className={isOk ? "font-bold text-emerald" : ""}>
                              {c} {isOk && "✓"}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                  <button type="button" onClick={() => removeQuestion(idx)} className="btn-base btn-ghost text-xs text-destructive shrink-0">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground py-2">Aucune question dans le contrôle final pour l'instant.</p>
          )}
        </div>
      </Panel>

      <div className="flex items-center justify-end gap-3">
        <button disabled={busy} onClick={saveExam} className="btn-base btn-glow">
          {busy ? "Enregistrement…" : exam ? "Mettre à jour le contrôle final" : "Créer le contrôle final"}
        </button>
      </div>
    </div>
  );
}

