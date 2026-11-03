import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Bell, BookOpen, CreditCard, CheckCheck, Clock, ExternalLink, FileCode, FolderOpen, ShieldCheck, Sparkles, User, Users } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAdmin } from "@/lib/admin";
import { allLessons } from "@/data/course";

export function AdminNotifications() {
  const a = useAdmin();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "subs" | "pays" | "activity">("all");

  const pendingSubs = a.pendingSubs;
  const pendingPays = a.pendingPays;
  const candidates = a.candidates;
  const recentProg = (a.progress.data ?? []).slice(0, 15);

  const totalUrgent = pendingSubs.length + pendingPays.length + candidates.length;

  const getLessonTitle = (id: string) => {
    const l = allLessons.find((x) => x.id === id);
    return l ? `${l.module.step} — ${l.title}` : id;
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Centre de notifications admin"
          className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-card hover:bg-muted text-ink transition-colors cursor-pointer"
        >
          <Bell className="h-4 w-4" />
          {totalUrgent > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground shadow-xs animate-pulse">
              {totalUrgent}
            </span>
          )}
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col bg-card border-l border-line text-ink">
        <SheetHeader className="p-5 border-b border-line flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <SheetTitle className="text-base font-bold text-ink">Alertes & Activités Apprenants</SheetTitle>
              <p className="text-xs text-muted-foreground">Suivi en direct des actions sur la plateforme</p>
            </div>
          </div>
        </SheetHeader>

        {/* Filters */}
        <div className="flex items-center border-b border-line px-4 py-2 gap-1.5 overflow-x-auto bg-muted/20">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition-colors ${
              filter === "all" ? "bg-ink text-paper" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Tout ({totalUrgent + recentProg.length})
          </button>
          <button
            onClick={() => setFilter("subs")}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition-colors ${
              filter === "subs" ? "bg-ink text-paper" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Rendus ({pendingSubs.length})
          </button>
          <button
            onClick={() => setFilter("pays")}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition-colors ${
              filter === "pays" ? "bg-ink text-paper" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Paiements ({pendingPays.length})
          </button>
          <button
            onClick={() => setFilter("activity")}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition-colors ${
              filter === "activity" ? "bg-ink text-paper" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Cours terminés ({recentProg.length})
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto divide-y divide-line p-2">
          {/* Submissions awaiting correction */}
          {(filter === "all" || filter === "subs") && pendingSubs.map((s) => (
            <Link
              key={s.id}
              to="/admin/rendus"
              onClick={() => setOpen(false)}
              className="p-3 rounded-xl block hover:bg-muted/60 transition-colors group"
            >
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-accent/15 text-accent flex items-center justify-center shrink-0">
                  <FolderOpen className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-ink truncate group-hover:text-accent">
                      Nouveau rendu à corriger
                    </span>
                    <span className="rounded bg-accent/15 px-1.5 py-0.2 text-[10px] font-bold text-accent">
                      {s.status}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-ink/90 font-medium truncate">{s.title}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Par {a.who(s.user_id)} · Cliquez pour évaluer →
                  </p>
                </div>
              </div>
            </Link>
          ))}

          {/* Payments awaiting verification */}
          {(filter === "all" || filter === "pays") && pendingPays.map((p) => (
            <Link
              key={p.id}
              to="/admin/paiements"
              onClick={() => setOpen(false)}
              className="p-3 rounded-xl block hover:bg-muted/60 transition-colors group"
            >
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-emerald/15 text-emerald flex items-center justify-center shrink-0">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-ink truncate group-hover:text-emerald">
                      Paiement en attente
                    </span>
                    <span className="rounded bg-emerald/15 px-1.5 py-0.2 text-[10px] font-bold text-emerald">
                      {p.amount || 4000} F
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground truncate">
                    Réf : <span className="font-mono text-ink font-semibold">{p.reference}</span>
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Par {a.who(p.user_id)} · Vérifier et activer →
                  </p>
                </div>
              </div>
            </Link>
          ))}

          {/* Candidates */}
          {(filter === "all" || filter === "subs") && candidates.map((c) => (
            <Link
              key={c.id}
              to="/admin/candidatures"
              onClick={() => setOpen(false)}
              className="p-3 rounded-xl block hover:bg-muted/60 transition-colors group"
            >
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-blue-500/15 text-blue-500 flex items-center justify-center shrink-0">
                  <Users className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-ink group-hover:text-blue-500">
                    Nouvelle candidature
                  </span>
                  <p className="mt-0.5 text-xs text-muted-foreground truncate">{c.full_name || c.email}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">Niveau : {c.level || "Débutant"}</p>
                </div>
              </div>
            </Link>
          ))}

          {/* Recent lesson completions */}
          {(filter === "all" || filter === "activity") && recentProg.map((pr, idx) => (
            <Link
              key={`${pr.user_id}-${pr.lesson_id}-${idx}`}
              to="/admin/apprenants/$uid"
              params={{ uid: pr.user_id }}
              onClick={() => setOpen(false)}
              className="p-3 rounded-xl block hover:bg-muted/60 transition-colors group"
            >
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-ink truncate group-hover:text-accent">
                    Leçon terminée
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground truncate">
                    {getLessonTitle(pr.lesson_id)}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Par {a.who(pr.user_id)} · Progression mise à jour
                  </p>
                </div>
              </div>
            </Link>
          ))}

          {totalUrgent === 0 && recentProg.length === 0 && (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Aucune action urgente en attente.
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
