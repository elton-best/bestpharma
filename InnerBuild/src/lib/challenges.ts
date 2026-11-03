import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/heroui-toast";
import { getD1SessionUser } from "@/lib/d1-session";
import { d1DeleteServerFn, d1InsertServerFn, d1ListServerFn, d1UpdateServerFn } from "./d1-data.functions";
import { logAudit } from "@/lib/admin";

export type Challenge = {
  id: string;
  title: string;
  slug?: string;
  description: string;
  brief_content: string;
  objectives: string;
  target_audience: string;
  solution_criteria: string;
  prize_pool: string;
  fee_amount: number;
  duration_days: number;
  max_participants?: number | null;
  status: "draft" | "active" | "evaluation" | "completed";
  start_date?: string | null;
  end_date?: string | null;
  cover_image?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
};

export type ChallengeRegistration = {
  id: string;
  challenge_id: string;
  user_id: string;
  status: "pending" | "accepted" | "rejected";
  motivation?: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
};

export type ChallengeSubmission = {
  id: string;
  challenge_id: string;
  user_id: string;
  title: string;
  description: string;
  repo_url: string;
  demo_url?: string;
  status: "draft" | "submitted" | "evaluated" | "published";
  submitted_at: string;
  created_at: string;
  updated_at: string;
};

export type ChallengeEvaluation = {
  id: string;
  challenge_id: string;
  submission_id: string;
  jury_id?: string | null;
  jury_name: string;
  score: number;
  score_ui: number;
  score_architecture: number;
  score_cahier_charges: number;
  score_delivery: number;
  feedback: string;
  strengths: string;
  improvements: string;
  evaluated_at: string;
  created_at: string;
};

export type ChallengeJury = {
  id: string;
  challenge_id: string;
  user_id?: string | null;
  code: string;
  name: string;
  email: string;
  role: "lead" | "expert" | "mentor";
  dimension?: string;
  status: "active" | "inactive";
  created_at: string;
};

export type ChallengeResult = {
  id: string;
  challenge_id: string;
  submission_id: string;
  user_id: string;
  final_score: number;
  rank: number;
  award?: string;
  is_published: boolean;
  published_at: string;
  created_at: string;
};

export type ChallengeDailyProgress = {
  id: string;
  challenge_id: string;
  user_id: string;
  day_number: number;
  progress_date: string;
  content: string;
  created_at: string;
};

export const DEFAULT_CHALLENGES: Challenge[] = [
  {
    id: "596c1ea1-0aee-4d06-be28-cd348015cd2b",
    title: "Hackathon AIFAC S01 — Agent SaaS Autonome",
    slug: "hackathon-s01-agent-saas",
    description: "Concevoir, planifier et livrer en 7 jours un SaaS fonctionnel orchestré par un agent IA avec paiement et base de données.",
    brief_content: `# Brief Officiel : Hackathon AIFAC S01\n\nBienvenue dans la première édition du **Hackathon AI Factory x The InnerBuild** !\n\n## 🎯 Objectif du Challenge\nTu as 7 jours pour concevoir et déployer une application web complète (Frontend + Backend Supabase + Agent IA autonome).\n\n### Les 4 Piliers d’évaluation (Barème /100) :\n1. **Design UI/UX & Finition (25 pts)** : Ergonomie, micro-interactions, dark mode et fluidité.\n2. **Architecture & Qualité de code (25 pts)** : Code TypeScript modulaire, requêtes optimisées.\n3. **Respect du Cahier des Charges (25 pts)** : Toutes les fonctionnalités "Done" de la spec sont livrées.\n4. **Agent IA & Faisabilité (25 pts)** : Intégration concrète d’un agent IA utile et démo live en production.\n\n## 🏆 Récompenses & Dotations\n- **1er Prix** : 300 000 FCFA + Accompagnement incubation + Badge "Master Inbuilder"\n- **2e Prix** : 150 000 FCFA + Accès prioritaire aux missions clients\n- **3e Prix** : 50 000 FCFA + Certification d’Excellence AIFAC\n\n## 📋 Modalités de soumission\n- Dépôt GitHub public avec README documenté\n- URL de démo accessible sans bug\n- Description concise des choix d’architecture`,
    objectives: "Livrer une application SaaS complète prête à être utilisée par des clients finaux.",
    target_audience: "Développeurs et apprenants AI Factory de tout niveau.",
    solution_criteria: "Fonctionnel, responsive, connecté à une base de données et avec un agent IA opérationnel.",
    prize_pool: "500 000 FCFA",
    fee_amount: 0,
    duration_days: 7,
    max_participants: null,
    status: "active",
    start_date: "2026-09-25T14:03:05.988855+00:00",
    end_date: "2026-10-09T14:03:05.988855+00:00",
    cover_image: null,
    created_by: null,
    created_at: "2026-09-25T14:03:05.988855+00:00",
    updated_at: "2026-09-25T14:03:05.988855+00:00",
  },
];

function getDeletedChallengeIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem("ib_deleted_challenges");
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function markChallengeDeleted(id: string) {
  if (typeof window === "undefined") return;
  try {
    const set = getDeletedChallengeIds();
    set.add(id);
    localStorage.setItem("ib_deleted_challenges", JSON.stringify(Array.from(set)));
  } catch {}
}

/* ================== QUERIES ================== */

export function useChallenges() {
  return useQuery({
    queryKey: ["challenges"],
    queryFn: async () => {
      const deleted = getDeletedChallengeIds();
      try {
        const res = await d1ListServerFn({ data: { table: "challenges", orderBy: "created_at", orderDir: "DESC", limit: 200 } });
        const rows = ((res.rows || []) as Challenge[]).filter((c) => !deleted.has(c.id));
        if (!rows.length) {
          return DEFAULT_CHALLENGES.filter((c) => !deleted.has(c.id));
        }
        return rows;
      } catch {
        return DEFAULT_CHALLENGES.filter((c) => !deleted.has(c.id));
      }
    },
  });
}

export function useChallenge(id?: string) {
  return useQuery({
    queryKey: ["challenges", id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) return null;
      const deleted = getDeletedChallengeIds();
      if (deleted.has(id)) return null;

      try {
        const res = await d1ListServerFn({ data: { table: "challenges", where: { id: id! } } });
        const row = ((res.rows || []) as Challenge[])[0];
        if (!row) {
          const fallback = DEFAULT_CHALLENGES.find((c) => c.id === id);
          return fallback && !deleted.has(fallback.id) ? fallback : null;
        }
        return row as Challenge | null;
      } catch {
        const fallback = DEFAULT_CHALLENGES.find((c) => c.id === id);
        return fallback && !deleted.has(fallback.id) ? fallback : null;
      }
    },
  });
}

export function useChallengeRegistrations(challengeId?: string) {
  return useQuery({
    queryKey: ["challenge_registrations", challengeId],
    enabled: !!challengeId,
    queryFn: async () => {
      try {
        const res = await d1ListServerFn({ data: { table: "challenge_registrations", where: { challenge_id: challengeId! }, orderBy: "created_at", orderDir: "DESC", limit: 500 } });
        return ((res.rows || []) as ChallengeRegistration[]);
      } catch {
        return [];
      }
    },
  });
}

export function useMyChallengeRegistrations() {
  return useQuery({
    queryKey: ["challenge_registrations", "me"],
    queryFn: async () => {
      try {
        const u = getD1SessionUser();
        if (!u) return [];
        const res = await d1ListServerFn({ data: { table: "challenge_registrations", where: { user_id: u.id }, limit: 200 } });
        return ((res.rows || []) as ChallengeRegistration[]);
      } catch {
        return [];
      }
    },
  });
}

export function useChallengeSubmissions(challengeId?: string) {
  return useQuery({
    queryKey: ["challenge_submissions", challengeId],
    enabled: !!challengeId,
    queryFn: async () => {
      try {
        const res = await d1ListServerFn({ data: { table: "challenge_submissions", where: { challenge_id: challengeId! }, orderBy: "created_at", orderDir: "DESC", limit: 500 } });
        return ((res.rows || []) as ChallengeSubmission[]);
      } catch {
        return [];
      }
    },
  });
}

export function useMyChallengeSubmissions() {
  return useQuery({
    queryKey: ["challenge_submissions", "me"],
    queryFn: async () => {
      try {
        const u = getD1SessionUser();
        if (!u) return [];
        const res = await d1ListServerFn({ data: { table: "challenge_submissions", where: { user_id: u.id }, limit: 200 } });
        return ((res.rows || []) as ChallengeSubmission[]);
      } catch {
        return [];
      }
    },
  });
}

export function useChallengeEvaluations(challengeId?: string) {
  return useQuery({
    queryKey: ["challenge_evaluations", challengeId],
    enabled: !!challengeId,
    queryFn: async () => {
      const res = await d1ListServerFn({ data: { table: "challenge_evaluations", where: { challenge_id: challengeId! }, orderBy: "created_at", orderDir: "DESC", limit: 500 } });
      if (!res.success) throw new Error(res.error || "D1");
      return ((res.rows || []) as ChallengeEvaluation[]);
    },
  });
}

export function useChallengeJury(challengeId?: string) {
  return useQuery({
    queryKey: ["challenge_jury", challengeId],
    queryFn: async () => {
      const res = await d1ListServerFn({ data: { table: "challenge_jury", ...(challengeId ? { where: { challenge_id: challengeId } } : {}), orderBy: "created_at", orderDir: "DESC", limit: 200 } });
      if (!res.success) throw new Error(res.error || "D1");
      return ((res.rows || []) as ChallengeJury[]);
    },
  });
}

export function useChallengeResults(challengeId?: string) {
  return useQuery({
    queryKey: ["challenge_results", challengeId],
    enabled: !!challengeId,
    queryFn: async () => {
      const res = await d1ListServerFn({ data: { table: "challenge_results", where: { challenge_id: challengeId! }, orderBy: "rank", orderDir: "ASC", limit: 200 } });
      if (!res.success) throw new Error(res.error || "D1");
      return ((res.rows || []) as ChallengeResult[]);
    },
  });
}

export function useChallengeDailyProgress(challengeId?: string, userId?: string) {
  return useQuery({
    queryKey: ["challenge_daily_progress", challengeId, userId],
    enabled: !!challengeId,
    queryFn: async () => {
      const res = await d1ListServerFn({ data: { table: "challenge_daily_progress", where: userId ? { challenge_id: challengeId!, user_id: userId } : { challenge_id: challengeId! }, orderBy: "day_number", orderDir: "ASC", limit: 500 } });
      if (!res.success) throw new Error(res.error || "D1");
      return ((res.rows || []) as ChallengeDailyProgress[]);
    },
  });
}

/* ================== ACTIONS / MUTATIONS ================== */

export function useChallengeActions() {
  const qc = useQueryClient();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["challenges"] });
  };

  async function saveChallenge(payload: Partial<Challenge> & { title: string }, id?: string) {
    try {
      const u = getD1SessionUser();
      const body: any = {
        title: payload.title.trim(),
        description: payload.description || "",
        brief_content: payload.brief_content || "",
        objectives: payload.objectives || "",
        target_audience: payload.target_audience || "",
        solution_criteria: payload.solution_criteria || "",
        prize_pool: payload.prize_pool || "500 000 FCFA",
        duration_days: payload.duration_days || 7,
        status: payload.status || "draft",
        start_date: payload.start_date || null,
        end_date: payload.end_date || null,
      };

      if (id) {
        const res = await d1UpdateServerFn({ data: { table: "challenges", id, patch: body } });
        if (!res.success) throw new Error(res.error || "D1");
        toast.success("Challenge mis à jour");
        await logAudit("Challenge modifié", id, `Mise à jour du challenge « ${payload.title} »`);
      } else {
        const res = await d1InsertServerFn({ data: { table: "challenges", row: { ...body, created_by: u?.id ?? null } } });
        if (!res.success) throw new Error(res.error || "D1");
        toast.success("Nouveau challenge créé !");
        await logAudit("Challenge créé", res.id, `Création du challenge « ${payload.title} »`);

        // If published immediately, notify all learners
        if (body.status === "active") {
          await notifyAllLearnersOfChallenge((res.id as string) || id!, body.title);
        }
      }
      refresh();
      return true;
    } catch (err: any) {
      toast.danger("Erreur : " + err.message);
      return false;
    }
  }

  async function setChallengeStatus(id: string, title: string, status: Challenge["status"]) {
    try {
      const res = await d1UpdateServerFn({ data: { table: "challenges", id, patch: { status } } });
      if (!res.success) throw new Error(res.error || "D1");
      toast.success(`Statut du challenge : ${status}`);
      await logAudit(`Challenge ${status}`, id, `Statut du challenge « ${title} » changé en ${status}`);

      if (status === "active") {
        await notifyAllLearnersOfChallenge(id, title);
      }

      refresh();
    } catch (err: any) {
      toast.danger("Échec : " + err.message);
    }
  }

  async function deleteChallenge(c: Challenge) {
    try {
      markChallengeDeleted(c.id);
      const { deleteChallengeServerFn } = await import("@/lib/challenges.functions");
      const res = await deleteChallengeServerFn({ data: { id: c.id } });
      if (!res.success) {
        console.warn("Delete server warning:", res.error);
      }
      toast.success(`Challenge « ${c.title} » supprimé avec succès`);
      await logAudit("Challenge supprimé", c.id, `Suppression de « ${c.title} »`);
      refresh();
      return true;
    } catch (err: any) {
      markChallengeDeleted(c.id);
      toast.success(`Challenge « ${c.title} » supprimé avec succès`);
      refresh();
      return true;
    }
  }

  return { saveChallenge, setChallengeStatus, deleteChallenge, refresh };
}

/** Broadcasts notification to all learners when a challenge goes live */
export async function notifyAllLearnersOfChallenge(challengeId: string, challengeTitle: string) {
  try {
    const profs = await d1ListServerFn({ data: { table: "profiles", limit: 200 } });
    const list = (profs.rows || []) as any[];
    for (const p of list) {
      await d1InsertServerFn({
        data: {
          table: "notifications",
          row: {
            user_id: p.id,
            title: `Nouveau Hackathon Challenge : ${challengeTitle}`,
            body: "Un nouveau défi est lancé ! Inscris-toi dès maintenant, livre ton SaaS et tente de remporter les dotations.",
            link: "/app/challenges",
          },
        },
      });
    }
  } catch (e) {
    console.error("Broadcast notification error:", e);
  }
}
