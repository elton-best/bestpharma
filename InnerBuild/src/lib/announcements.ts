import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/heroui-toast";
import { getD1SessionUser } from "@/lib/d1-session";
import { d1DeleteServerFn, d1InsertServerFn, d1ListServerFn, d1UpdateServerFn } from "./d1-data.functions";
import { deleteFromR2ServerFn } from "./storage.functions";

export type Announcement = { id: string; kind: "announcement" | "keynote"; title: string; body: string; video_url: string; image_path: string; pdf_path: string; event_at: string | null; pinned: boolean; published: boolean; created_at: string };

function toBool(v: unknown) {
  return v === 1 || v === true;
}

export function useAnnouncements() {
  return useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const res = await d1ListServerFn({ data: { table: "announcements", orderBy: "created_at", orderDir: "DESC", limit: 100 } });
      const rows = ((res.rows || []) as any[]).map((a) => ({ ...a, pinned: toBool(a.pinned), published: toBool(a.published) }));
      rows.sort((a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return rows as Announcement[];
    },
  });
}

export function useAnnouncementActions() {
  const qc = useQueryClient();
  const done = () => {
    qc.invalidateQueries({ queryKey: ["announcements"] });
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };
  return {
    async save(row: Partial<Announcement> & { title: string }, id?: string) {
      const u = getD1SessionUser();
      const payload: Record<string, unknown> = {
        ...row,
        pinned: row.pinned ? 1 : 0,
        published: row.published === false ? 0 : 1,
      };
      let ok = false;
      if (id) {
        const res = await d1UpdateServerFn({ data: { table: "announcements", id, patch: payload } });
        ok = res.success;
        if (!ok) toast.danger("Échec : " + (res.error || "D1"));
      } else {
        const res = await d1InsertServerFn({ data: { table: "announcements", row: { ...payload, created_by: u?.id ?? null } } });
        ok = res.success;
        if (!ok) toast.danger("Échec : " + (res.error || "D1"));
      }
      if (!ok) return false;
      toast.success(id ? "Enregistré" : row.published === false ? "Brouillon créé" : "Publié et envoyé aux apprenants");

      // If publishing, notify learners & admin (D1)
      if (row.published !== false) {
        try {
          const isKeynote = row.kind === "keynote";
          const eventDateStr = row.event_at ? new Date(row.event_at as string).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" }) : "";
          const notifTitle = isKeynote ? `[Keynote Live] ${row.title}` : `[Annonce] ${row.title}`;
          const notifBody = isKeynote && eventDateStr
            ? `Session Live prévue le ${eventDateStr} (Jitsi Meet). Cliquez pour accéder au lien et rejoindre le call sur la plateforme.`
            : (row.body || "").slice(0, 150) + "…";

          const profs = await d1ListServerFn({ data: { table: "profiles", limit: 200 } });
          const list = (profs.rows || []) as any[];
          for (const p of list.slice(0, 200)) {
            await d1InsertServerFn({
              data: {
                table: "notifications",
                row: {
                  user_id: p.id,
                  title: notifTitle,
                  body: notifBody,
                  link: "/app/annonces",
                },
              },
            });
          }

          // Notification pour l'administrateur
          await d1InsertServerFn({
            data: {
              table: "notifications",
              row: {
                user_id: "admin",
                title: `[Publication] ${notifTitle}`,
                body: notifBody,
                link: "/admin/annonces",
              },
            },
          });
        } catch {}
      }

      await done();
      return true;
    },
    remove(a: Announcement) {
      const toastId = toast(`Supprimer « ${a.title} » ?`, {
        description: "Cette action est définitive.",
        variant: "danger",
        timeout: 10000,
        actionProps: {
          children: "Confirmer la suppression",
          variant: "danger",
          onClick: async () => {
            toast.close(toastId);
            const res = await d1DeleteServerFn({ data: { table: "announcements", id: a.id } });
            if (!res.success) { toast.danger("Échec : " + (res.error || "D1")); return; }
            // Fichiers désormais sur R2 : suppression best-effort
            const files = [a.image_path, a.pdf_path].filter((path) => path && !/^https?:/.test(path));
            for (const f of files) {
              try { await deleteFromR2ServerFn({ data: { key: f.replace(/^r2:\/?/, "") } }); } catch {}
            }
            toast.success(files.length ? "Supprimé avec ses fichiers" : "Supprimé");
            await done();
          },
        },
      });
    },
  };
}

/** Converts a YouTube/Vimeo link into an embeddable URL, or "" if unsupported. */
export function embedUrl(url: string) {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|live\/)|youtu\.be\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return "";
}
