import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Bell, BookOpen, Check, CheckCheck, FileCode2, Megaphone, Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NotificationBell } from "./NotificationBell";
import { useMarkRead, useNotifications } from "@/lib/notifications";
import { ago } from "@/lib/community";

export function Notifications({ size = 40 }: { size?: number }) {
  const { data = [], isError } = useNotifications();
  const mark = useMarkRead();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [open, setOpen] = useState(false);

  const unread = data.filter((n) => !n.read).length;
  const filtered = filter === "unread" ? data.filter((n) => !n.read) : data;

  function getNotificationIcon(title: string) {
    const t = title.toLowerCase();
    if (t.includes("cours") || t.includes("leçon")) {
      return <BookOpen className="h-4 w-4 text-accent" />;
    }
    if (t.includes("exercice") || t.includes("projet") || t.includes("rendu")) {
      return <FileCode2 className="h-4 w-4 text-emerald" />;
    }
    if (t.includes("annonce") || t.includes("keynote")) {
      return <Megaphone className="h-4 w-4 text-amber" />;
    }
    return <Sparkles className="h-4 w-4 text-accent" />;
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <NotificationBell count={unread} size={size} aria-label="Notifications" />
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col bg-card border-l border-line text-ink">
        {/* Header */}
        <SheetHeader className="p-5 border-b border-line flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <SheetTitle className="text-base font-bold text-ink">Centre de notifications</SheetTitle>
              <p className="text-xs text-muted-foreground">Mises à jour des cours, annonces & retours</p>
            </div>
          </div>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => mark.mutate(undefined)}
              className="mr-6 inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline cursor-pointer"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Tout lire
            </button>
          )}
        </SheetHeader>

        {/* Filter Tabs */}
        <div className="flex items-center border-b border-line px-5 py-2.5 gap-2 bg-muted/20">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
              filter === "all" ? "bg-ink text-paper" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Toutes ({data.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("unread")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
              filter === "unread" ? "bg-ink text-paper" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Non lues ({unread})
          </button>
        </div>

        {/* List of Notifications */}
        <div className="flex-1 overflow-y-auto divide-y divide-line">
          {isError && (
            <div className="p-8 text-center text-sm text-destructive">
              Impossible de charger les notifications.
            </div>
          )}

          {!isError && filtered.length === 0 && (
            <div className="p-12 text-center flex flex-col items-center justify-center text-muted-foreground">
              <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
                <Bell className="h-5 w-5 opacity-40" />
              </div>
              <p className="text-sm font-semibold text-ink">Aucune notification</p>
              <p className="text-xs mt-1">
                {filter === "unread" ? "Toutes vos notifications sont lues !" : "Rien de neuf pour l’instant."}
              </p>
            </div>
          )}

          {filtered.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => {
                if (!n.read) mark.mutate(n.id);
                setOpen(false);
                if (n.link) {
                  if (n.link.startsWith("http://") || n.link.startsWith("https://")) {
                    window.location.href = n.link;
                  } else {
                    try {
                      navigate({ to: n.link as any }).catch(() => {
                        window.location.href = n.link;
                      });
                    } catch {
                      window.location.href = n.link;
                    }
                  }
                }
              }}
              className={`w-full p-4 text-left transition-colors flex items-start gap-3 hover:bg-muted/60 cursor-pointer ${
                n.read ? "bg-transparent opacity-85" : "bg-accent/5 font-medium"
              }`}
            >
              <div className="mt-0.5 h-8 w-8 rounded-xl bg-card border border-line flex items-center justify-center shrink-0 shadow-xs">
                {getNotificationIcon(n.title)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-ink truncate">{n.title}</span>
                  {!n.read && <span className="h-2 w-2 rounded-full bg-accent shrink-0" />}
                </div>
                {n.body && <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">{n.body}</p>}
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{ago(n.created_at)}</span>
                  {n.read && <span className="flex items-center gap-1 text-[10px] text-emerald"><Check className="h-3 w-3" /> Lu</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
