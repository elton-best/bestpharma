import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Bot, Loader2, MessageSquare, Plus, Send, ShieldCheck, Sparkles, Trash2, Users } from "lucide-react";
import { toast } from "@/components/ui/heroui-toast";
import { appHead, Empty, PageHeader, Panel, Stat } from "@/components/app/AppShell";
import { ago, topics, useCreateThread, useDeleteThread, usePosts, useReply, useThreads } from "@/lib/community";
import { initials, useProfile } from "@/lib/learner";
import { useAdmin } from "@/lib/admin";

type ThreadItem = NonNullable<ReturnType<typeof useThreads>["data"]>[number];

export const Route = createFileRoute("/admin/communaute")({
  head: appHead("Communauté & Cohorte", "Gérer et interagir sur le forum et avec la cohorte AIFAC."),
  component: AdminCommunityPage,
});

function AdminCommunityPage() {
  const a = useAdmin();
  const { data: threads = [] } = useThreads();
  const postsCount = threads.reduce((acc, t) => acc + t.replies, 0);
  const authorsCount = new Set(threads.map((t) => t.user_id)).size;

  return (
    <>
      <PageHeader
        eyebrow="Communauté"
        title="Forum & Cohorte"
        subtitle="Consulte les discussions des apprenants, réponds avec le badge officiel Admin, et modère la communauté."
      />

      <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Stat label="Apprenants inscrits" value={String(a.learners.length)} />
        <Stat label="Discussions lancées" value={String(threads.length)} />
        <Stat label="Messages échangés" value={String(postsCount)} />
        <Stat label="Participants actifs" value={String(authorsCount)} />
      </div>

      <AdminForum />
    </>
  );
}

function AdminForum() {
  const { data: threads = [], isLoading, error } = useThreads();
  const [topic, setTopic] = useState<string>("Tous");
  const [open, setOpen] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const del = useDeleteThread();
  const list = topic === "Tous" ? threads : threads.filter((t) => t.topic === topic);
  const current = threads.find((t) => t.id === open);

  if (current) {
    return <AdminThreadView t={current} onBack={() => setOpen(null)} />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <Panel title="Sujets du forum" className="h-fit">
        <div className="flex flex-wrap gap-2 lg:flex-col">
          {["Tous", ...topics].map((t) => {
            const n = t === "Tous" ? threads.length : threads.filter((x) => x.topic === t).length;
            return (
              <button
                key={t}
                onClick={() => setTopic(t)}
                className={`flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-left text-sm transition-colors ${
                  topic === t ? "bg-accent/10 font-bold text-accent" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {t}
                <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">{n}</span>
              </button>
            );
          })}
        </div>
      </Panel>

      <div className="space-y-4">
        {creating ? (
          <AdminNewThread onDone={(id) => { setCreating(false); if (id) setOpen(id); }} />
        ) : (
          <button onClick={() => setCreating(true)} className="btn-base btn-glow">
            <Plus className="h-4 w-4 mr-1.5" /> Nouvelle annonce / discussion officielle
          </button>
        )}

        <Panel>
          {isLoading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground p-4">
              <Loader2 className="h-4 w-4 animate-spin" /> Chargement des discussions…
            </p>
          ) : error ? (
            <p className="text-sm text-destructive p-4">Impossible de charger le forum.</p>
          ) : !list.length ? (
            <Empty title="Aucune discussion" text="Aucune discussion trouvée dans cette catégorie." />
          ) : (
            <ul className="divide-y divide-line">
              {list.map((t) => (
                <li key={t.id} className="flex items-start gap-3 py-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent/15 text-xs font-bold text-accent">
                    {initials(t.author_name, "")}
                  </span>
                  <button onClick={() => setOpen(t.id)} className="min-w-0 flex-1 text-left">
                    <p className="font-bold text-ink hover:text-accent transition-colors">{t.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.body}</p>
                    <p className="mt-2 text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                      <span className="rounded bg-accent/10 px-2 py-0.5 font-semibold text-accent">{t.topic}</span>
                      <span>· Par {t.author_name}</span>
                      <span>· {ago(t.created_at)}</span>
                      <span className="font-semibold text-ink">· {t.replies} réponse(s)</span>
                    </p>
                  </button>
                  <button
                    aria-label="Supprimer"
                    title="Modérer et supprimer cette discussion"
                    onClick={() => {
                      const toastId = toast(`Supprimer « ${t.title} » ?`, {
                        description: "Cette action est définitive et modère la discussion.",
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
                    className="icon-button shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function AdminThreadView({ t, onBack }: { t: ThreadItem; onBack: () => void }) {
  const { data: posts = [], isLoading } = usePosts(t.id);
  const reply = useReply();
  const [body, setBody] = useState("");

  const submitReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    reply.mutate({ thread_id: t.id, body: `[ADMIN AIFAC] ${body.trim()}` }, {
      onSuccess: () => {
        setBody("");
        toast.success("Réponse officielle envoyée !");
      },
      onError: (err) => toast.danger("Échec : " + err.message),
    });
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="btn-base btn-ghost text-xs inline-flex items-center gap-1.5">
        <ArrowLeft className="h-3.5 w-3.5" /> Retour à la liste des discussions
      </button>

      <Panel>
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent/15 text-xs font-bold text-accent">
            {initials(t.author_name, "")}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="rounded bg-accent/10 px-2 py-0.5 text-xs font-bold text-accent">{t.topic}</span>
              <h2 className="text-lg font-bold text-ink">{t.title}</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Par {t.author_name} · {ago(t.created_at)}</p>
            <div className="mt-3 whitespace-pre-line text-sm text-ink/90 leading-relaxed border-t border-line pt-3">
              {t.body}
            </div>
          </div>
        </div>
      </Panel>

      <Panel title={`Réponses (${posts.length})`}>
        {isLoading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground p-3">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
          </p>
        ) : !posts.length ? (
          <Empty title="Pas encore de réponse" text="Sois le premier à répondre à cet apprenant." />
        ) : (
          <ul className="divide-y divide-line">
            {posts.map((p) => {
              const isAdmin = (p as any).is_admin || p.author_name?.includes("ADMIN") || p.body?.startsWith("[ADMIN");
              const displayBody = p.body?.replace(/^\[ADMIN AIFAC\]\s*/, "") || "";
              return (
                <li key={p.id} className="py-3 flex items-start gap-3">
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${isAdmin ? "bg-accent text-accent-foreground shadow-xs" : "bg-muted text-ink"}`}>
                    {isAdmin ? <ShieldCheck className="h-4 w-4" /> : initials(p.author_name, "")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-ink">{p.author_name}</span>
                      {isAdmin && (
                        <span className="rounded bg-accent/15 px-1.5 py-0.2 text-[10px] font-bold text-accent flex items-center gap-0.5">
                          <ShieldCheck className="h-3 w-3" /> Admin
                        </span>
                      )}
                      <span className="text-[11px] text-muted-foreground">· {ago(p.created_at)}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-line text-xs text-ink/90 leading-relaxed">{displayBody || p.body}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <form onSubmit={submitReply} className="mt-4 pt-4 border-t border-line space-y-3">
          <label className="text-xs font-bold text-ink block">Répondre en tant qu'administrateur :</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            required
            placeholder="Écrivez votre réponse ou vos conseils d'expert pour débloquer l'apprenant..."
            className="field text-xs"
          />
          <div className="flex justify-end">
            <button disabled={reply.isPending} className="btn-base btn-glow text-xs flex items-center gap-1.5">
              <Send className="h-3.5 w-3.5" /> {reply.isPending ? "Envoi…" : "Publier la réponse officielle"}
            </button>
          </div>
        </form>
      </Panel>
    </div>
  );
}

function AdminNewThread({ onDone }: { onDone: (id?: string) => void }) {
  const [f, setF] = useState({ topic: "Général", title: "", body: "" });
  const m = useCreateThread();
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (f.title.trim().length < 3 || !f.body.trim()) {
      toast.danger("Ajoute un titre et un message.");
      return;
    }
    m.mutate({ topic: f.topic, title: `[Officiel] ${f.title.trim()}`, body: f.body.trim() }, {
      onSuccess: (res: any) => {
        toast.success("Discussion officielle créée");
        onDone(typeof res === "string" ? res : res?.id);
      },
      onError: (err) => toast.danger("Échec : " + err.message),
    });
  };

  return (
    <Panel title="Créer une discussion officielle pour la cohorte">
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Catégorie</label>
          <select value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })} className="field text-xs">
            {topics.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Titre de la discussion</label>
          <input
            value={f.title}
            onChange={(e) => setF({ ...f, title: e.target.value })}
            required
            placeholder="Ex. Lancement de la session pratique #3"
            className="field text-xs"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Message</label>
          <textarea
            value={f.body}
            onChange={(e) => setF({ ...f, body: e.target.value })}
            rows={4}
            required
            placeholder="Partagez une consigne, une opportunité ou un échange avec toute la promo..."
            className="field text-xs"
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={() => onDone()} className="btn-base btn-ghost text-xs">Annuler</button>
          <button disabled={m.isPending} className="btn-base btn-glow text-xs flex items-center gap-1.5">
            <Send className="h-3.5 w-3.5" /> {m.isPending ? "Publication…" : "Publier"}
          </button>
        </div>
      </form>
    </Panel>
  );
}
