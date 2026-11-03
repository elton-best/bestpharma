import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { appHead, Empty, PageHeader, Panel } from "@/components/app/AppShell";
import { ErrorBox, Loading } from "@/components/admin/AdminShell";
import { openPdf, useAllContent, useContentActions } from "@/lib/content";
import { MoveButtons, Pill } from "./admin.cours";
import { blank, LessonForm } from "./admin.cours.$id";

export const Route = createFileRoute("/admin/lecons")({ head: appHead("Leçons", "Toutes les leçons texte, PDF et mixtes de tous les cours."), component: Page });

const kinds = { all: "Toutes", text: "Texte seul", pdf: "PDF", mixed: "Texte + Images + PDF" } as const;

function Page() {
  const search = (useSearch({ strict: false }) || {}) as { kind?: keyof typeof kinds };
  const q = useAllContent();
  const act = useContentActions();
  const [course, setCourse] = useState("");
  const [filter, setFilter] = useState<keyof typeof kinds>(search.kind && kinds[search.kind] ? search.kind : "all");
  const [k, setK] = useState(0);
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => {
    if (search.kind && kinds[search.kind]) {
      setFilter(search.kind);
    }
  }, [search.kind]);

  if (q.error) return <ErrorBox error={q.error as Error} onRetry={() => q.refetch()} />;
  if (q.isLoading) return <Loading />;
  const { courses, modules, lessons } = q.data!;
  const cid = course || courses[0]?.id || "";
  const mods = modules.filter((m) => m.course_id === cid);
  const modName = (id: string) => { const m = modules.find((x) => x.id === id); const c = courses.find((x) => x.id === m?.course_id); return `${c?.title ?? "?"} · ${m?.title ?? "?"}`; };
  const rows = lessons.filter((l) => filter === "all" || l.kind === filter);
  const initialLesson = mods.length ? { ...blank(mods[0]!.id), ...(filter !== "all" ? { kind: filter } : {}) } : null;
  return (
    <>
      <PageHeader eyebrow="Formations" title="Gestion et création des leçons" subtitle="Crée des leçons texte seul, PDF ou enrichies (texte, images, PDF) pour les apprenants." />
      {!courses.length ? <Empty title="Aucun cours" text="Crée d'abord un cours dans Cours et leçons." /> : (
        <Panel title={`Nouvelle leçon ${filter !== "all" ? `(${kinds[filter]})` : ""}`}>
          <label className="mb-3 block text-xs font-semibold text-muted-foreground">Cours<select value={cid} onChange={(e) => { setCourse(e.target.value); setK((x) => x + 1); }} className="field mt-1">{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
          {mods.length && initialLesson ? <LessonForm key={`${cid}-${filter}-${k}`} modules={mods} initial={initialLesson} saveLabel="Ajouter la leçon"
            onSave={async (v) => { const ok = await act.insert("lessons", { ...v, position: lessons.filter((l) => l.module_id === v.module_id).length }); if (ok) setK((x) => x + 1); return ok; }} />
            : <p className="text-sm text-muted-foreground">Ce cours n'a aucun module. <Link to="/admin/cours/$id" params={{ id: cid }} className="text-accent">Ajoute un module →</Link></p>}
        </Panel>
      )}
      <div className="my-4 flex flex-wrap gap-2" role="tablist">{(Object.keys(kinds) as (keyof typeof kinds)[]).map((x) => <button key={x} role="tab" aria-selected={filter === x} onClick={() => setFilter(x)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${filter === x ? "bg-ink text-paper" : "text-muted-foreground hover:bg-muted"}`}>{kinds[x]} ({x === "all" ? lessons.length : lessons.filter((l) => l.kind === x).length})</button>)}</div>
      <Panel>{rows.length ? <ul className="divide-y divide-line">{rows.map((l) => (
        <li key={l.id} className="py-3">{editing === l.id
          ? <LessonForm modules={modules.filter((m) => m.course_id === modules.find((x) => x.id === l.module_id)?.course_id)} initial={l} saveLabel="Enregistrer" onCancel={() => setEditing(null)} onSave={async (v) => { const ok = await act.update("lessons", l.id, v); if (ok) setEditing(null); return ok; }} />
          : <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1"><p className="font-semibold text-ink">{l.title}</p><p className="text-xs text-muted-foreground">{modName(l.module_id)} · {kinds[l.kind as keyof typeof kinds] ?? l.kind}</p></div>
              <div className="flex flex-wrap items-center gap-2"><Pill on={l.published} />
                <button onClick={() => setEditing(l.id)} className="btn-base btn-ghost text-xs">Modifier</button>
                {l.file_path && <button onClick={() => openPdf(l.file_path)} className="btn-base btn-ghost text-xs">Voir PDF</button>}
                <button onClick={() => act.update("lessons", l.id, { published: !l.published }, l.published ? "Leçon dépubliée" : "Leçon publiée")} className="btn-base btn-ghost text-xs">{l.published ? "Dépublier" : "Publier"}</button>
                <button onClick={() => act.remove("lessons", l.id, l.title, [l.file_path, l.image_path])} className="btn-base btn-ghost text-xs text-destructive">Supprimer</button>
                {(() => { const sib = lessons.filter((x) => x.module_id === l.module_id); const i = sib.indexOf(l); return <MoveButtons first={i === 0} last={i === sib.length - 1} onUp={() => act.move("lessons", sib, i, -1)} onDown={() => act.move("lessons", sib, i, 1)} />; })()}
              </div>
            </div>}
        </li>
      ))}</ul> : <Empty title="Aucune leçon" text="Aucune leçon de ce format pour le moment." />}</Panel>
    </>
  );
}
