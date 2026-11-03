import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requireD1User } from "@/lib/d1-session";
import { d1DeleteServerFn, d1GetServerFn, d1InsertServerFn, d1ListServerFn, d1UpdateServerFn } from "./d1-data.functions";

// Exercices des skills : créés par l'admin en D1 (table skill_exercises),
// réalisés par les apprenants puis envoyés en correction via les Rendus.

export type SkillExercise = {
  id: string;
  skill_id: string;
  title: string;
  instructions: string;
  position: number;
  published: boolean;
};

async function uid() {
  const u = await requireD1User();
  return { id: u.id } as any;
}

function toBool(v: unknown) {
  return v === 1 || v === true;
}

/** Exercices publiés d'un skill (côté apprenant). */
export function useSkillExercises(skillId: string) {
  return useQuery({
    queryKey: ["skill-exercises", skillId],
    queryFn: async () => {
      try {
        const res = await d1ListServerFn({ data: { table: "skill_exercises", where: { skill_id: skillId, published: 1 }, orderBy: "position", orderDir: "ASC", limit: 200 } });
        return (((res.rows || []) as any[]).map((r) => ({ ...r, published: toBool(r.published) })) as SkillExercise[]);
      } catch {
        return [];
      }
    },
    enabled: !!skillId,
  });
}

/** Tous les exercices d'un skill, publiés ou non (côté admin). */
export function useAdminSkillExercises(skillId: string) {
  return useQuery({
    queryKey: ["admin-skill-exercises", skillId],
    queryFn: async () => {
      try {
        const res = await d1ListServerFn({ data: { table: "skill_exercises", where: { skill_id: skillId }, orderBy: "position", orderDir: "ASC", limit: 200 } });
        return (((res.rows || []) as any[]).map((r) => ({ ...r, published: toBool(r.published) })) as SkillExercise[]);
      } catch {
        return [];
      }
    },
    enabled: !!skillId,
  });
}

export function useSkillExerciseMutations(skillId: string) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-skill-exercises", skillId] });
    qc.invalidateQueries({ queryKey: ["skill-exercises", skillId] });
    // Compteurs de couverture du dashboard admin (vue « Skills & Modèles »).
    qc.invalidateQueries({ queryKey: ["skill-exercise-counts"] });
  };
  return {
    insert: useMutation({
      mutationFn: async (v: { title: string; instructions: string }) => {
        await uid();
        const existing = await d1ListServerFn({ data: { table: "skill_exercises", where: { skill_id: skillId }, orderBy: "position", orderDir: "DESC", limit: 1 } });
        const position = (((existing.rows || [])[0] as any)?.position ?? -1) + 1;
        const res = await d1InsertServerFn({
          data: { table: "skill_exercises", row: { skill_id: skillId, title: v.title.trim(), instructions: v.instructions.trim(), position, published: 1 } },
        });
        if (!res.success) throw new Error(res.error || "D1");
      },
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: async (v: {
        id: string;
        title: string;
        instructions: string;
        published: boolean;
      }) => {
        await uid();
        const res = await d1UpdateServerFn({
          data: { table: "skill_exercises", id: v.id, patch: { title: v.title.trim(), instructions: v.instructions.trim(), published: v.published ? 1 : 0 } },
        });
        if (!res.success) throw new Error(res.error || "D1");
      },
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: async (id: string) => {
        await uid();
        const res = await d1DeleteServerFn({ data: { table: "skill_exercises", id } });
        if (!res.success) throw new Error(res.error || "D1");
      },
      onSuccess: invalidate,
    }),
  };
}

/** Un exercice précis (pré-remplissage du formulaire de rendu). */
export function useSkillExercise(exoId: string | undefined) {
  return useQuery({
    queryKey: ["skill-exercise", exoId],
    queryFn: async () => {
      const res = await d1GetServerFn({ data: { table: "skill_exercises", id: exoId! } });
      const r: any = res.row;
      if (!r || !toBool(r.published)) return null;
      return { ...r, published: true } as SkillExercise | null;
    },
    enabled: !!exoId,
  });
}
