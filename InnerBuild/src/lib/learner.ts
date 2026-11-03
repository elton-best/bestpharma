import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requireD1User } from "@/lib/d1-session";
import { d1GetServerFn, d1InsertServerFn, d1ListServerFn } from "./d1-data.functions";
import { toggleLessonProgressServerFn } from "./d1-progress.functions";

async function uid() {
  const u = await requireD1User();
  return {
    id: u.id,
    email: u.email,
    user_metadata: { full_name: u.fullName || u.full_name, role: u.role },
  } as any;
}

import { checkPartnerServerFn, check4TalentsPartnerServerFn } from "./d1-partner.functions";

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  access_status: string;
  goal: string;
  level: string;
  onboarded: boolean;
  avatar_url?: string | null;
  is4TalentsPartner?: boolean;
  partnerCommunity?: string;
};

function toBool(v: unknown) {
  return v === 1 || v === true;
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const u = await uid();
      // D1 source unique
      const got = await d1GetServerFn({ data: { table: "profiles", id: u.id } });
      let data: any = got.row || null;
      if (!data) {
        // fallback : créer le profil minimal côté D1
        const email = u.email ?? "";
        await d1InsertServerFn({
          data: {
            table: "profiles",
            row: {
              id: u.id,
              email,
              full_name: (u as any)?.user_metadata?.full_name || email.split("@")[0] || "Apprenant",
              access_status: "free",
              onboarded: 1,
            },
          },
        });
        const retry = await d1GetServerFn({ data: { table: "profiles", id: u.id } });
        data = retry.row || null;
      }
      const roles = await d1ListServerFn({ data: { table: "user_roles", where: { user_id: u.id } } });
      const email = u.email ?? "";
      const isMasterAdmin = email.toLowerCase().includes("eltonhounnou") || (roles.rows || []).some((r: any) => r.role === "admin");
      const defaultStatus = isMasterAdmin ? "pro" : "free";

      const p: Profile = data
        ? {
            id: data.id,
            full_name: data.full_name,
            email: data.email,
            access_status: data.access_status,
            goal: data.goal || "",
            level: data.level || "",
            onboarded: toBool(data.onboarded),
            avatar_url: data.avatar_url || null,
          }
        : {
            id: u.id,
            full_name: (u as any)?.user_metadata?.full_name || email.split("@")[0] || "Apprenant",
            email: email,
            access_status: defaultStatus,
            goal: "",
            level: "",
            onboarded: true,
            avatar_url: null,
          };

      // Vérification éligibilité Partenaire automatique (BWT & 4Talents)
      let isPartner = false;
      let partnerCommunity: string | undefined = undefined;
      try {
        const partnerRes = await checkPartnerServerFn({ data: { email: p.email } });
        if (partnerRes.eligible) {
          isPartner = true;
          partnerCommunity = partnerRes.community?.name || partnerRes.partner || "Partenaire";
        }
      } catch (err) {
        console.warn("[Partner Check Failed]", err);
      }

      // Offre de lancement gratuit jusqu'à la fin du mois
      const trial = getLaunchTrialState(p.access_status);
      const hasPermanentPaid =
        p.access_status === "pro" ||
        p.access_status === "active" ||
        p.access_status === "unlimited" ||
        isMasterAdmin;

      const isPaid = hasPermanentPaid || trial.isTrialActive;
      const isLocked = !hasPermanentPaid && trial.isTrialExpired;

      return {
        ...p,
        isAdmin: isMasterAdmin,
        active: isPaid,
        isPaid,
        isLocked,
        isTrialActive: trial.isTrialActive,
        isTrialExpired: trial.isTrialExpired,
        trialDaysRemaining: trial.daysRemaining,
        trialEndsAt: LAUNCH_TRIAL_END_ISO,
        isPartner,
        is4TalentsPartner: isPartner,
        partnerCommunity,
      };
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Période de gratuité de lancement de l'AI Factory :
 * Toutes les fonctionnalités sont 100% gratuites jusqu'à la fin du mois en cours (31 octobre 2026 à 23h59:59 UTC).
 * Passée cette date, les comptes non abonnés ("pro" / "unlimited") sont automatiquement verrouillés.
 */
export const LAUNCH_TRIAL_END_ISO = "2026-10-31T23:59:59.999Z";

export function getLaunchTrialState(userStatus: string | undefined) {
  const endDate = new Date(LAUNCH_TRIAL_END_ISO);
  const now = new Date();
  const isPastEnd = now.getTime() > endDate.getTime();
  const msRemaining = Math.max(0, endDate.getTime() - now.getTime());
  const daysRemaining = Math.max(1, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

  // Tout apprenant non rejeté bénéficie de l'accès intégral gratuit jusqu'à la fin du mois
  const isEligible = userStatus !== "rejected";

  return {
    isTrialEligible: isEligible,
    isTrialActive: isEligible && !isPastEnd,
    isTrialExpired: isEligible && isPastEnd,
    daysRemaining,
    endDate,
  };
}


export function useProgress() {
  return useQuery({
    queryKey: ["progress"],
    queryFn: async () => {
      const u = await uid();
      const res = await d1ListServerFn({ data: { table: "lesson_progress", where: { user_id: u.id }, orderBy: "completed_at", orderDir: "DESC" } });
      return (res.rows || []) as { lesson_id: string; completed_at: string }[];
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useToggleLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const u = await uid();
      await toggleLessonProgressServerFn({ data: { userId: u.id, lessonId: id, done } });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["progress"] }),
  });
}

export function useSubmissions() {
  return useQuery({
    queryKey: ["submissions"],
    queryFn: async () => {
      const u = await uid();
      const res = await d1ListServerFn({ data: { table: "submissions", where: { user_id: u.id }, orderBy: "created_at", orderDir: "DESC" } });
      return (res.rows || []) as any[];
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function usePayments() {
  return useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      const u = await uid();
      const res = await d1ListServerFn({ data: { table: "payments", where: { user_id: u.id }, orderBy: "created_at", orderDir: "DESC" } });
      return (res.rows || []) as any[];
    },
  });
}

export const statusLabel: Record<string, { label: string; cls: string }> = {
  submitted: { label: "En correction", cls: "bg-amber/25 text-ink" },
  review: { label: "En relecture", cls: "bg-blue-500/15 text-blue-500" },
  changes: { label: "À reprendre", cls: "bg-accent/15 text-accent" },
  validated: { label: "Validé", cls: "bg-emerald/15 text-emerald" },
  pending: { label: "En attente", cls: "bg-amber/25 text-ink" },
  verified: { label: "Vérifié", cls: "bg-emerald/15 text-emerald" },
  rejected: { label: "Refusé", cls: "bg-destructive/15 text-destructive" },
};

export function initials(name: string, email: string) {
  const s = (name || email || "?").trim();
  const parts = s.split(/[\s@.]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}
