import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown, X } from "reicon-react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { appHead, Empty, PageHeader, Panel } from "@/components/app/AppShell";
import { ErrorBox, Loading } from "@/components/admin/AdminShell";
import { useContentActions, useCourseContent, useCourses, useFileUrl, type CCourse } from "@/lib/content";
import { FilePreview } from "@/components/admin/FilePreview";
import { MarkdownEditor } from "@/components/admin/MarkdownEditor";
import { AttachmentUpload } from "@/components/admin/AttachmentUpload";

export const Route = createFileRoute("/admin/cours")({ head: appHead("Cours", "Créer, ordonner et publier les cours."), component: Page });

export function Pill({ on }: { on: boolean }) {
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${on ? "bg-emerald/15 text-emerald" : "bg-muted text-muted-foreground"}`}>{on ? "publié" : "brouillon"}</span>;
}
export function MoveButtons({ onUp, onDown, first, last }: { onUp: () => void; onDown: () => void; first: boolean; last: boolean }) {
  return <span className="flex gap-1"><button type="button" aria-label="Monter" disabled={first} onClick={onUp} className="icon-button disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button><button type="button" aria-label="Descendre" disabled={last} onClick={onDown} className="icon-button disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button></span>;
}

function Page() {
  const path = useRouterState({ select: (s) => s.location.pathname }).replace(/\/$/, "");
  const courses = useCourses();
  const act = useContentActions();
  const [title, setTitle] = useState(""); const [desc, setDesc] = useState(""); const [img, setImg] = useState(""); const [pdf, setPdf] = useState("");
  const [edit, setEdit] = useState<CCourse | null>(null); const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<CCourse | null>(null);
  if (path !== "/admin/cours") return <Outlet />;
  if (courses.error) return <ErrorBox error={courses.error as Error} onRetry={() => courses.refetch()} />;
  if (courses.isLoading) return <Loading />;
  const list = courses.data ?? [];
  async function create() {
    setBusy(true);
    if (await act.insert("courses", { title: title.trim(), description: desc.trim(), image_url: img.trim(), pdf_url: pdf.trim(), position: list.length })) { setTitle(""); setDesc(""); setImg(""); setPdf(""); }
    setBusy(false);
  }
  return (
    <>
      <PageHeader eyebrow="Formations" title="Cours" subtitle="Tout contenu naît en brouillon et reste invisible pour les apprenants tant qu'il n'est pas publié." />
      <Panel title="Nouveau cours">
        <div className="grid gap-4 sm:grid-cols-2">
          <input
            aria-label="Titre du nouveau cours"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre du nouveau cours *"
            className="field sm:col-span-full font-semibold text-base"
          />
          <div className="sm:col-span-full">
            <MarkdownEditor
              label="Description du cours"
              rows={5}
              value={desc}
              onChange={setDesc}
              placeholder="Présente le cours : objectifs, public, prérequis…"
            />
          </div>

          <div className="sm:col-span-full rounded-xl border border-line bg-muted/20 p-4 space-y-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-ink">Image de couverture du cours</p>
              <p className="text-xs text-muted-foreground">Téléverse un fichier image ou colle une URL directe.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 items-start">
              <AttachmentUpload type="image" value={img} onChange={setImg} />
              <div className="space-y-2">
                <input
                  type="url"
                  value={img}
                  onChange={(e) => setImg(e.target.value)}
                  placeholder="Ou colle une URL d'image (https://...)"
                  className="field text-xs"
                />
                {img && (
                  <div className="overflow-hidden rounded-lg border border-line max-h-36">
                    <CourseImage path={img} className="h-32 w-full object-cover" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="sm:col-span-full">
            <AttachmentUpload type="pdf" value={pdf} onChange={setPdf} />
          </div>

          <button
            disabled={!title.trim() || busy}
            onClick={create}
            className="btn-base btn-glow w-fit disabled:opacity-50"
          >
            {busy ? "Création en cours…" : "Créer le cours"}
          </button>
        </div>
      </Panel>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {list.map((c, i) => (
          <div key={c.id} className="card-surface flex flex-col p-5">
            {edit?.id === c.id ? (
              <div className="space-y-2">
                <input aria-label="Titre" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} className="field" />
                <MarkdownEditor label="Description" rows={6} value={edit.description} onChange={(description) => setEdit((x) => x && ({ ...x, description }))} />
                 <AttachmentUpload type="image" value={edit.image_url ?? ""} onChange={(x) => setEdit({ ...edit, image_url: x })} />
                 <AttachmentUpload type="pdf" value={edit.pdf_url ?? ""} onChange={(x) => setEdit({ ...edit, pdf_url: x })} />
                <div className="flex gap-2"><button disabled={!edit.title.trim()} onClick={async () => { if (await act.update("courses", c.id, { title: edit.title.trim(), description: edit.description.trim(), image_url: (edit.image_url ?? "").trim(), pdf_url: (edit.pdf_url ?? "").trim() })) setEdit(null); }} className="btn-base btn-glow text-xs disabled:opacity-50">Enregistrer</button><button onClick={() => setEdit(null)} className="btn-base btn-ghost text-xs">Annuler</button></div>
              </div>
            ) : (
              <>
                {c.image_url && <CourseImage path={c.image_url} />}
                <div className="flex items-start justify-between gap-2"><h3 className="font-bold text-ink">{c.title}</h3><Pill on={c.published} /></div>
                <p className="mt-1 line-clamp-2 flex-1 text-sm text-muted-foreground">{c.description || "Pas de description."}</p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Link to="/admin/cours/$id" params={{ id: c.id }} className="btn-base btn-glow text-xs">Ouvrir</Link>
                  <button onClick={() => setEdit(c)} className="btn-base btn-ghost text-xs">Modifier</button>
                  <button onClick={() => setPreview(c)} className="btn-base btn-ghost text-xs">Prévisualiser</button>
                  <button onClick={() => act.update("courses", c.id, { published: !c.published }, c.published ? "Cours dépublié" : "Cours publié")} className="btn-base btn-ghost text-xs">{c.published ? "Dépublier" : "Publier"}</button>
                  <button onClick={() => act.remove("courses", c.id, c.title)} className="btn-base btn-ghost text-xs text-destructive">Supprimer</button>
                  <span className="ml-auto"><MoveButtons first={i === 0} last={i === list.length - 1} onUp={() => act.move("courses", list, i, -1)} onDown={() => act.move("courses", list, i, 1)} /></span>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      {!list.length && <div className="mt-6"><Empty title="Aucun cours" text="Aucun cours. Crée le premier ci-dessus." /></div>}
      {preview && <Preview course={preview} onClose={() => setPreview(null)} />}
    </>
  );
}

function Preview({ course, onClose }: { course: CCourse; onClose: () => void }) {
  const q = useCourseContent(course.id);
  const [open, setOpen] = useState<string | null>(null);
  const mods = (q.data?.modules ?? []).filter((m) => m.published);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={onClose} className="absolute inset-0 bg-ink/40 backdrop-blur-sm" />
      <div className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3"><div><span className="eyebrow">Vue apprenant</span><h2 className="mt-2 text-xl font-extrabold text-ink">{course.title}</h2><p className="text-sm text-muted-foreground">{course.description}</p></div><button onClick={onClose} aria-label="Fermer" className="icon-button"><X size={16} /></button></div>
        {!course.published && <p className="mb-3 rounded-lg bg-amber/15 p-3 text-xs text-ink">Ce cours est en brouillon : les apprenants ne le voient pas encore.</p>}
        {q.isLoading ? <Loading /> : mods.length ? mods.map((m, mi) => {
          const ls = (q.data?.lessons ?? []).filter((l) => l.module_id === m.id && l.published);
          return (
            <div key={m.id} className="mb-3 rounded-xl border border-line p-4">
              <button onClick={() => setOpen(open === m.id ? null : m.id)} className="flex w-full items-center justify-between text-left font-bold text-ink">Module {mi + 1} · {m.step} — {m.title}<ChevronDown size={14} /></button>
              <ul className="mt-2 space-y-1 text-sm">{ls.map((l) => <li key={l.id}><p className="text-ink">{l.title} <span className="text-xs text-muted-foreground">· {l.minutes} min</span></p>{open === m.id && <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">{l.body}</p>}</li>)}</ul>
            </div>
          );
        }) : <Empty title="Rien de publié" text="Publie des modules et des leçons pour qu'ils apparaissent ici." />}
      </div>
    </div>
  );
}

export function CourseImage({ path, className = "mb-3 h-28 w-full rounded-lg object-cover" }: { path: string; className?: string }) {
  const { data } = useFileUrl(path);
  return data ? <img src={data} alt="" className={className} /> : <div className={`${className} animate-pulse bg-muted`} />;
}

