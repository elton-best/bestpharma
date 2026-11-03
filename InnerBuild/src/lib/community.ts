import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getD1SessionUser } from "@/lib/d1-session";
import { d1DeleteServerFn, d1GetServerFn, d1InsertServerFn, d1ListServerFn, d1QueryServerFn } from "./d1-data.functions";

export const topics = ["Général", "Spec", "Plan", "Build", "Review", "Deliver", "Entraide technique", "Livraisons"] as const;

async function me() {
  const u = getD1SessionUser();
  if (!u) {
    throw new Error("Non connecté");
  }
  const got = await d1GetServerFn({ data: { table: "profiles", id: u.id } });
  const p: any = got.row;
  return { id: u.id, name: p?.full_name || p?.email?.split("@")[0] || "Apprenant" };
}

export function useThreads() {
  return useQuery({
    queryKey: ["forum", "threads"],
    queryFn: async () => {
      const res = await d1ListServerFn({ data: { table: "forum_threads", orderBy: "created_at", orderDir: "DESC", limit: 200 } });
      const threads = (res.rows || []) as any[];
      // compteur de réponses via requête groupée D1
      const counts = await d1QueryServerFn({ data: { sql: "SELECT thread_id, COUNT(*) as c FROM forum_posts GROUP BY thread_id;" } });
      const map = new Map((counts.rows || []).map((r: any) => [r.thread_id, Number(r.c)]));
      return threads.map((t) => ({ ...t, replies: map.get(t.id) ?? 0 }));
    },
  });
}

export function usePosts(threadId: string | null) {
  return useQuery({
    queryKey: ["forum", "posts", threadId],
    enabled: !!threadId,
    queryFn: async () => {
      const res = await d1ListServerFn({ data: { table: "forum_posts", where: { thread_id: threadId! }, orderBy: "created_at", orderDir: "ASC", limit: 500 } });
      return (res.rows || []) as any[];
    },
  });
}

export function useCreateThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { topic: string; title: string; body: string }) => {
      const u = await me();
      const res = await d1InsertServerFn({ data: { table: "forum_threads", row: { ...v, user_id: u.id, author_name: u.name } } });
      if (!res.success) throw new Error(res.error || "D1");
      return res.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["forum"] }),
  });
}

export function useReply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { thread_id: string; body: string }) => {
      const u = await me();
      const res = await d1InsertServerFn({ data: { table: "forum_posts", row: { ...v, user_id: u.id, author_name: u.name } } });
      if (!res.success) throw new Error(res.error || "D1");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["forum"] }),
  });
}

export function useDeleteThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await d1DeleteServerFn({ data: { table: "forum_threads", id } });
      if (!res.success) throw new Error(res.error || "D1");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["forum"] }),
  });
}

export function useLeaderboard() {
  return useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const res = await d1QueryServerFn({
        data: {
          sql: "SELECT p.id, p.full_name, p.email, COALESCE(u.role, 'learner') AS role, COUNT(DISTINCT lp.lesson_id) as lessons, COUNT(DISTINCT CASE WHEN s.status='validated' THEN s.id END) as validated, (COUNT(DISTINCT lp.lesson_id)*10 + COUNT(DISTINCT CASE WHEN s.status='validated' THEN s.id END)*50) as score FROM profiles p LEFT JOIN users u ON u.id = p.id OR u.email = p.email LEFT JOIN lesson_progress lp ON lp.user_id=p.id LEFT JOIN submissions s ON s.user_id=p.id WHERE LOWER(p.email) NOT LIKE '%eltonhounnou%' AND (u.role IS NULL OR u.role != 'admin') AND UPPER(COALESCE(p.full_name, '')) NOT LIKE '%THE KOF%' GROUP BY p.id ORDER BY score DESC LIMIT 50;",
        },
      });
      return ((res.rows || []) as any[])
        .filter((r) => r.email?.toLowerCase() !== "eltonhounnou27@gmail.com" && r.role !== "admin" && !r.full_name?.toUpperCase().includes("THE KOF"))
        .map((r) => ({
          ...r,
          name: r.full_name || (typeof r.email === "string" ? r.email.split("@")[0] : "") || "Apprenant",
          lessons: Number(r.lessons),
          validated: Number(r.validated),
          score: Number(r.score),
        }));
    },
  });
}

export function ago(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "à l’instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
