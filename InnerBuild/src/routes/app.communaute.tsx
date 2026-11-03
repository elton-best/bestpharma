import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Bot, Loader2, MessageSquare, Plus, Send, Sparkles, Trash2 } from "lucide-react";
import { toast } from "@/components/ui/heroui-toast";
import { appHead, Empty, PageHeader, Panel, Stat } from "@/components/app/AppShell";
import { ago, topics, useCreateThread, useDeleteThread, usePosts, useReply, useThreads } from "@/lib/community";
import { initials, useProfile, useProgress } from "@/lib/learner";
import { allLessons, totalLessons } from "@/data/course";

export const Route = createFileRoute("/app/communaute")({ head: appHead("Forum et cohorte", "Discute avec la cohorte AIFAC et échange par sujet."), component: Page });

function Page() {
    const { data: threads = [] } = useThreads();
  const posts = threads.reduce((a, t) => a + t.replies, 0);
  const authors = new Set(threads.map((t) => t.user_id)).size;
  return (
    <>
      <PageHeader eyebrow="Communauté" title="Forum et cohorte" subtitle="Lance une discussion, aide les autres et découvre les échanges par sujet." />
      <div className="mb-6 grid grid-cols-3 gap-3 sm:gap-4">
        <Stat label="Discussions" value={String(threads.length)} />
        <Stat label="Réponses" value={String(posts)} />
        <Stat label="Participants" value={String(authors)} />
      </div>
      <Forum />
    </>
  );
}

function Forum() {
  const { data: threads = [], isLoading, error } = useThreads();
  const { data: me } = useProfile();
  const [topic, setTopic] = useState<string>("Tous");
  const [open, setOpen] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const del = useDeleteThread();
  const list = topic === "Tous" ? threads : threads.filter((t) => t.topic === topic);
  const current = threads.find((t) => t.id === open);

  if (current) return <Thread t={current} onBack={() => setOpen(null)} />;
  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <Panel title="Sujets" className="h-fit">
        <div className="flex flex-wrap gap-2 lg:flex-col">
          {["Tous", ...topics].map((t) => {
            const n = t === "Tous" ? threads.length : threads.filter((x) => x.topic === t).length;
            return <button key={t} onClick={() => setTopic(t)} className={`flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-left text-sm ${topic === t ? "bg-accent/10 font-bold text-accent" : "text-muted-foreground hover:bg-muted"}`}>{t}<span className="text-xs">{n}</span></button>;
          })}
        </div>
      </Panel>
      <div className="space-y-4">
        {creating ? <NewThread onDone={(id) => { setCreating(false); if (id) setOpen(id); }} /> :
          <button onClick={() => setCreating(true)} className="btn-base btn-glow"><Plus className="h-4 w-4" /> Nouvelle discussion</button>}
        <Panel>
          {isLoading ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Chargement…</p>
            : error ? <p className="text-sm text-destructive">Impossible de charger le forum. Rafraîchis la page.</p>
            : !list.length ? <Empty title="Aucune discussion ici" text="Sois le premier à lancer le sujet." />
            : <ul className="divide-y divide-line">{list.map((t) => (
              <li key={t.id} className="flex items-start gap-3 py-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted text-xs font-bold text-ink">{initials(t.author_name, "")}</span>
                <button onClick={() => setOpen(t.id)} className="min-w-0 flex-1 text-left">
                  <p className="font-semibold text-ink hover:text-accent">{t.title}</p>
                  <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{t.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground"><span className="rounded bg-accent/10 px-1.5 py-0.5 font-semibold text-accent">{t.topic}</span> · {t.author_name} · {ago(t.created_at)} · {t.replies} réponse(s)</p>
                </button>
                {(t.user_id === me?.id || me?.isAdmin) && (
                  <button
                    aria-label="Supprimer"
                    onClick={() => {
                      const toastId = toast(`Supprimer « ${t.title} » ?`, {
                        description: "Cette discussion et ses messages seront supprimés définitivement.",
                        variant: "danger",
                        timeout: 10000,
                        actionProps: {
                          children: "Confirmer la suppression",
                          variant: "danger",
                          onClick: () => {
                            toast.close(toastId);
                            del.mutate(t.id, {
                              onSuccess: () => toast.success("Discussion supprimée"),
                              onError: () => toast.danger("Suppression impossible"),
                            });
                          },
                        },
                      });
                    }}
                    className="icon-button shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}</ul>}
        </Panel>
      </div>
    </div>
  );
}

function NewThread({ onDone }: { onDone: (id?: string) => void }) {
  const [f, setF] = useState({ topic: "Général", title: "", body: "" });
  const m = useCreateThread();
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (f.title.trim().length < 3 || !f.body.trim()) { toast.error("Ajoute un titre et un message."); return; }
    m.mutate({ topic: f.topic, title: f.title.trim().slice(0, 160), body: f.body.trim().slice(0, 5000) }, { onSuccess: (id) => { toast.success("Discussion publiée"); onDone(id); }, onError: () => toast.error("Publication impossible") });
  };
  return (
    <form onSubmit={submit} className="card-surface space-y-3 p-5">
      <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
        <select value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })} className="rounded-lg border border-line bg-paper px-3 py-2 text-sm">{topics.map((t) => <option key={t}>{t}</option>)}</select>
        <input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={160} placeholder="Titre de ta question" className="rounded-lg border border-line bg-paper px-3 py-2 text-sm" />
      </div>
      <textarea value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} rows={4} maxLength={5000} placeholder="Explique le contexte, ce que tu as essayé…" className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm" />
      <div className="flex gap-2"><button disabled={m.isPending} className="btn-base btn-glow">{m.isPending ? "Publication…" : "Publier"}</button><button type="button" onClick={() => onDone()} className="btn-base btn-ghost">Annuler</button></div>
    </form>
  );
}

function Thread({ t, onBack }: { t: { id: string; title: string; body: string; topic: string; author_name: string; created_at: string }; onBack: () => void }) {
  const { data: posts = [], isLoading } = usePosts(t.id);
  const [body, setBody] = useState("");
  const reply = useReply();
  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    reply.mutate({ thread_id: t.id, body: body.trim().slice(0, 5000) }, { onSuccess: () => setBody(""), onError: () => toast.error("Envoi impossible") });
  };
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="btn-base btn-ghost"><ArrowLeft className="h-4 w-4" /> Toutes les discussions</button>
      <Panel>
        <span className="rounded bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">{t.topic}</span>
        <h2 className="mt-2 text-xl font-bold text-ink">{t.title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{t.author_name} · {ago(t.created_at)}</p>
        <p className="mt-4 whitespace-pre-wrap text-sm text-ink">{t.body}</p>
      </Panel>
      <Panel title={`${posts.length} réponse(s)`}>
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : !posts.length ? <p className="text-sm text-muted-foreground">Pas encore de réponse.</p> :
          <ul className="space-y-4">{posts.map((p) => (
            <li key={p.id} className="flex gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted text-xs font-bold">{initials(p.author_name, "")}</span>
              <div className="min-w-0 flex-1 rounded-xl bg-muted/50 p-3"><p className="text-xs text-muted-foreground"><b className="text-ink">{p.author_name}</b> · {ago(p.created_at)}</p><p className="mt-1 whitespace-pre-wrap text-sm text-ink">{p.body}</p></div></li>
          ))}</ul>}
        <form onSubmit={send} className="mt-5 flex gap-2">
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} maxLength={5000} placeholder="Ta réponse…" className="flex-1 rounded-lg border border-line bg-paper px-3 py-2 text-sm" />
          <button disabled={reply.isPending || !body.trim()} aria-label="Envoyer" className="btn-base btn-glow self-end"><Send className="h-4 w-4" /></button>
        </form>
      </Panel>
    </div>
  );
}

