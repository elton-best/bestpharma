import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { d1ListServerFn, d1UpdateServerFn } from "./d1-data.functions";

export type NotificationItem = {
  id: string;
  user_id?: string;
  title: string;
  body: string;
  link: string;
  read: boolean;
  created_at: string;
  kind?: "notification" | "announcement" | "keynote";
};

function getReadAnnouncements(): Set<string> {
  try {
    const raw = localStorage.getItem("aifac-read-announcements");
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function setReadAnnouncement(id: string) {
  try {
    const set = getReadAnnouncements();
    set.add(id);
    localStorage.setItem("aifac-read-announcements", JSON.stringify([...set]));
  } catch {}
}

function setAllReadAnnouncements(ids: string[]) {
  try {
    const set = getReadAnnouncements();
    ids.forEach((id) => set.add(id));
    localStorage.setItem("aifac-read-announcements", JSON.stringify([...set]));
  } catch {}
}

import { getD1SessionUser } from "./d1-session";

function toBool(v: unknown) {
  return v === 1 || v === true;
}

export function useNotifications() {
  const u = getD1SessionUser();
  const userId = u?.id;
  // Seul le compte Master Admin (eltonhounnou27@gmail.com) ou le rôle explicite admin reçoit les alertes système
  const isAdmin = u
    ? Boolean(
        u.role === "admin" ||
          (u.email &&
            (u.email.toLowerCase().includes("eltonhounnou") ||
              u.email.toLowerCase() ===
                ((import.meta.env as any)["VITE_ADMIN_EMAIL"] || "").toLowerCase()))
      )
    : false;

  return useQuery({
    queryKey: ["notifications", userId ?? "guest"],
    refetchInterval: 15000,
    queryFn: async () => {
      if (!userId) {
        return [];
      }

      let sql: string;
      let params: unknown[];

      if (isAdmin) {
        sql = "SELECT * FROM notifications WHERE user_id = ? OR user_id = 'admin' ORDER BY created_at DESC LIMIT 50;";
        params = [userId];
      } else {
        sql = "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50;";
        params = [userId];
      }

      const { d1QueryServerFn } = await import("./d1-data.functions");
      const [nRes, aRes] = await Promise.all([
        d1QueryServerFn({ data: { sql, params } }),
        d1ListServerFn({ data: { table: "announcements", where: { published: 1 }, orderBy: "created_at", orderDir: "DESC", limit: 10 } }),
      ]);

      const readAnnIds = getReadAnnouncements();
      const annNotifs: NotificationItem[] = ((aRes.rows || []) as any[]).map((a) => {
        const isKeynote = a.kind === "keynote";
        return {
          id: `ann-${a.id}`,
          title: `${isKeynote ? "Keynote" : "Annonce"} : ${a.title}`,
          body: (a.body || "").slice(0, 140) + "…",
          link: "/app/annonces",
          read: readAnnIds.has(`ann-${a.id}`),
          created_at: a.created_at,
          kind: isKeynote ? "keynote" : "announcement",
        };
      });

      // Filtrage strict : un apprenant ne voit JAMAIS les alertes admin ni les notifications d'un autre utilisateur
      const dbNotifs: NotificationItem[] = ((nRes.rows || []) as any[])
        .filter((n) => {
          if (isAdmin) {
            return n.user_id === userId || n.user_id === "admin";
          }
          return n.user_id === userId;
        })
        .map((n) => ({ ...n, read: toBool(n.read) }));

      const all: NotificationItem[] = [...dbNotifs, ...annNotifs];
      all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return all;
    },
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  const u = getD1SessionUser();
  const userId = u?.id;
  const isAdmin = u
    ? Boolean(
        u.role === "admin" ||
          (u.email &&
            (u.email.toLowerCase().includes("eltonhounnou") ||
              u.email.toLowerCase() ===
                ((import.meta.env as any)["VITE_ADMIN_EMAIL"] || "").toLowerCase()))
      )
    : false;

  return useMutation({
    mutationFn: async (id?: string) => {
      const { d1QueryServerFn, d1UpdateServerFn } = await import("./d1-data.functions");

      if (id) {
        if (id.startsWith("ann-")) {
          setReadAnnouncement(id);
        } else {
          await d1UpdateServerFn({ data: { table: "notifications", id, patch: { read: 1 } } });
        }
      } else {
        // "Tout lire" :
        // 1. Marquer les annonces locales comme lues
        const currentData = qc.getQueryData<NotificationItem[]>(["notifications", userId ?? "guest"]) || [];
        const annIds = currentData.filter((n) => n.id.startsWith("ann-")).map((n) => n.id);
        setAllReadAnnouncements(annIds);

        // 2. Marquer directement en base Cloudflare D1
        if (userId) {
          const sql = isAdmin
            ? "UPDATE notifications SET read = 1 WHERE user_id = ? OR user_id = 'admin';"
            : "UPDATE notifications SET read = 1 WHERE user_id = ?;";
          await d1QueryServerFn({ data: { sql, params: [userId] } });
        }
      }
    },
    onMutate: async (id?: string) => {
      const queryKey = ["notifications", userId ?? "guest"];
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<NotificationItem[]>(queryKey);

      if (previous) {
        if (id) {
          qc.setQueryData<NotificationItem[]>(queryKey, (old) =>
            old ? old.map((n) => (n.id === id ? { ...n, read: true } : n)) : []
          );
        } else {
          qc.setQueryData<NotificationItem[]>(queryKey, (old) =>
            old ? old.map((n) => ({ ...n, read: true })) : []
          );
        }
      }
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        qc.setQueryData(["notifications", userId ?? "guest"], context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

/** Insère une notification ciblée dans D1 */
export async function createNotification({
  userId,
  title,
  body,
  link = "/app",
}: {
  userId: string;
  title: string;
  body: string;
  link?: string;
}) {
  try {
    const { d1InsertServerFn } = await import("./d1-data.functions");
    await d1InsertServerFn({
      data: {
        table: "notifications",
        row: {
          id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          user_id: userId,
          title,
          body,
          link,
          read: 0,
        },
      },
    });
  } catch (e) {
    console.error("[Notification Error]", e);
  }
}

/** Insère simultanément une notification pour l'apprenant ET pour l'admin */
export async function createDualNotification({
  learnerId,
  learnerTitle,
  learnerBody,
  learnerLink = "/app",
  adminTitle,
  adminBody,
  adminLink = "/admin",
}: {
  learnerId?: string;
  learnerTitle: string;
  learnerBody: string;
  learnerLink?: string;
  adminTitle: string;
  adminBody: string;
  adminLink?: string;
}) {
  const promises: Promise<void>[] = [];

  if (learnerId) {
    promises.push(
      createNotification({
        userId: learnerId,
        title: learnerTitle,
        body: learnerBody,
        link: learnerLink,
      })
    );
  }

  promises.push(
    createNotification({
      userId: "admin",
      title: adminTitle,
      body: adminBody,
      link: adminLink,
    })
  );

  await Promise.allSettled(promises);
}
