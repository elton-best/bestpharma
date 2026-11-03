import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requireD1User } from "@/lib/d1-session";
import { d1ListServerFn } from "./d1-data.functions";
import { toggleSkillProgressServerFn } from "./d1-progress.functions";

// Suivi des cours de skills (cours en code : src/data/skill-courses.ts).
// Progression persistée en D1 (table skill_lesson_progress), fallback local.

async function uid() {
  const u = await requireD1User();
  return { id: u.id } as any;
}

export type SkillProgressRow = { lesson_id: string; completed_at: string };

const LOCAL_STORAGE_KEY = "aifac_skill_completed_lessons";

function getLocalProgress(): SkillProgressRow[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const ids: string[] = JSON.parse(raw);
    return ids.map((id) => ({ lesson_id: id, completed_at: new Date().toISOString() }));
  } catch {
    return [];
  }
}

function setLocalProgress(id: string, done: boolean) {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    const next = done ? ids.filter((x) => x !== id) : Array.from(new Set([...ids, id]));
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage errors
  }
}

export function useSkillProgress() {
  return useQuery({
    queryKey: ["skill-progress"],
    queryFn: async () => {
      try {
        const u = await uid();
        const res = await d1ListServerFn({ data: { table: "skill_lesson_progress", where: { user_id: (u as any).id }, orderBy: "completed_at", orderDir: "DESC", limit: 1000 } });
        if (!res.success) return getLocalProgress();
        return ((res.rows || []) as SkillProgressRow[]).map((r) => ({ lesson_id: r.lesson_id, completed_at: r.completed_at }));
      } catch {
        return getLocalProgress();
      }
    },
  });
}

export function useToggleSkillLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      try {
        const u = await uid();
        const res = await toggleSkillProgressServerFn({ data: { userId: (u as any).id, lessonId: id, done } });
        if (!res.success) setLocalProgress(id, done);
      } catch {
        setLocalProgress(id, done);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["skill-progress"] }),
  });
}
