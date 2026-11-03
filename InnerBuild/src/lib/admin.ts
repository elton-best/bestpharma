import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/heroui-toast";
import { getD1SessionUser } from "@/lib/d1-session";
import { totalLessons } from "@/data/course";
import { d1AdminOverviewServerFn, d1AddManualPaymentServerFn, d1LogAuditServerFn, d1ReviewSubmissionServerFn, d1SetAccessServerFn, d1VerifyPaymentServerFn } from "./d1-admin.functions";
import { d1GetServerFn } from "./d1-data.functions";
import { sendAuthEmailServerFn } from "./d1-auth.functions";

export type AProfile = { id: string; full_name: string; email: string; access_status: string; created_at: string; onboarded: boolean; goal: string; level: string };
export type APayment = { id: string; user_id: string; reference: string; amount: number; status: string; created_at: string };
export type ASub = {
  id: string;
  user_id: string;
  title: string;
  repo_url: string;
  demo_url?: string;
  notes: string;
  status: string;
  feedback: string;
  grade?: number | null;
  course_id?: string | null;
  module_id?: string | null;
  lesson_id?: string | null;
  exercise_id?: string | null;
  created_at: string;
  updated_at: string;
};
export type AProg = { user_id: string; lesson_id: string; completed_at: string };
export type AAudit = { id: string; actor_id: string | null; action: string; target: string; details: string; created_at: string };

async function fetchKind<T>(kind: "profiles" | "payments" | "submissions" | "progress" | "audit"): Promise<T[]> {
  const res = await d1AdminOverviewServerFn({ data: { kind } });
  if (!res.success) throw new Error(res.error || "D1 indisponible");
  return (res.rows || []) as T[];
}

export function useAdmin() {
  const profiles = useQuery({ queryKey: ["admin", "profiles"], queryFn: () => fetchKind<AProfile>("profiles") });
  const roles = useQuery({ queryKey: ["admin", "roles"], queryFn: async () => {
    const u = getD1SessionUser();
    return u ? [u.id] : [];
  } });
  const payments = useQuery({ queryKey: ["admin", "payments"], queryFn: () => fetchKind<APayment>("payments") });
  const subs = useQuery({ queryKey: ["admin", "subs"], queryFn: () => fetchKind<ASub>("submissions") });
  const progress = useQuery({ queryKey: ["admin", "progress"], queryFn: () => fetchKind<AProg>("progress") });

  const me = roles.data ?? [];
  let profilesList = profiles.data ?? [];
  let paymentsList = payments.data ?? [];

  const learners = profilesList.filter((p) => !me.includes(p.id));
  const byId = (id: string) => profilesList.find((p) => p.id === id);
  const who = (id: string) => { const p = byId(id); return p ? p.full_name || p.email : id.slice(0, 8); };
  const lessonsOf = (id: string) => (progress.data ?? []).filter((p) => p.user_id === id);
  const pctOf = (id: string) => Math.round((new Set(lessonsOf(id).map((l) => l.lesson_id)).size / totalLessons) * 100);

  return {
    profiles, payments, subs, progress, learners, byId, who, lessonsOf, pctOf,
    loading: profiles.isLoading || payments.isLoading || subs.isLoading || progress.isLoading,
    error: (profiles.error || payments.error || subs.error || progress.error) as Error | null,
    pendingPays: paymentsList.filter((p) => p.status === "pending"),
    allPaymentsList: paymentsList,
    pendingSubs: (subs.data ?? []).filter((s) => s.status === "submitted" || s.status === "pending" || s.status === "review"),
    candidates: learners.filter(
      (p) =>
        p.access_status === "pending" ||
        p.access_status === "trial" ||
        p.access_status === "discovery" ||
        p.access_status === "free" ||
        !["active", "pro", "unlimited", "rejected"].includes(p.access_status)
    ),
  };
}

export async function logAudit(action: string, target?: string | null, details?: string) {
  try {
    const u = getD1SessionUser();
    await d1LogAuditServerFn({ data: { actorId: u?.id ?? null, action, target: target ?? "", details: details ?? "" } });
  } catch (e) {
    console.error("Audit log error:", e);
  }
}

export function useAdminActions() {
  const qc = useQueryClient();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin"] });
    qc.invalidateQueries({ queryKey: ["submissions"] });
  };
  async function verifyPayment(id: string, userId: string, ok: boolean) {
    const res = await d1VerifyPaymentServerFn({ data: { id, userId, ok } });
    if (!res.success) {
      toast.danger("Échec : " + (res.error || "D1"));
    } else {
      toast.success(ok ? "Paiement vérifié, accès activé" : "Paiement refusé");
    }
    refresh();
  }
  async function setAccess(id: string, status: "active" | "pending" | "rejected") {
    const res = await d1SetAccessServerFn({ data: { id, status } });
    if (!res.success) {
      toast.danger("Échec : " + (res.error || "D1"));
    } else {
      toast.success(status === "active" ? "Accès activé" : status === "rejected" ? "Candidature refusée" : "Accès retiré");
      await logAudit(`Accès ${status}`, id, `Statut d'accès changé en ${status}`);
      // Email de confirmation après validation du compte
      if (status === "active") {
        try {
          const got = await d1GetServerFn({ data: { table: "profiles", id } });
          const prof: any = got.row;
          if (prof?.email) {
            const first = (prof.full_name || prof.email.split("@")[0] || "").split(" ")[0];
            await sendAuthEmailServerFn({
              data: {
                email: prof.email,
                subject: "Ton compte AI Factory est validé !",
                title: "Compte confirmé, à toi de livrer",
                subtitle: "Ton inscription a été validée par l'équipe. Tu peux désormais suivre l'onboarding, accéder aux cours et commencer à apprendre.",
                actionText: "Commencer à apprendre",
                actionUrl: "https://theinnerbuild.com/app",
                ...(first ? { recipientName: first } : {}),
              },
            });
            toast.success("Email de confirmation envoyé");
          }
        } catch {
          toast.warning("Accès activé, mais l'email n'a pas pu partir.");
        }
      }
    }
    refresh();
  }
  async function review(id: string, status: string, feedback: string, grade?: number | null, userId?: string, title?: string) {
    const res = await d1ReviewSubmissionServerFn({ data: { id, status, feedback, grade: grade ?? undefined, userId: userId ?? undefined, title: title ?? undefined } as any });
    if (!res.success) {
      toast.danger("Échec : " + (res.error || "D1"));
    } else {
      toast.success("Correction enregistrée");
      await logAudit(`Rendu ${status}`, userId ?? id, `Rendu "${title ?? id}" passé en statut ${status}${grade != null ? ` avec note ${grade}/20` : ""}`);
    }
    refresh();
  }
  async function addManualPayment(data: { userId: string; email?: string; amount?: number; reference?: string }) {
    const res = await d1AddManualPaymentServerFn({ data });
    if (!res.success) {
      toast.danger("Échec : " + (res.error || "D1"));
    } else {
      toast.success("Paiement enregistré avec succès !");
    }
    refresh();
    return res;
  }
  return { refresh, verifyPayment, setAccess, review, logAudit, addManualPayment };
}

export function useAudit() {
  return useQuery({
    queryKey: ["admin", "audit"],
    queryFn: () => fetchKind<AAudit>("audit"),
  });
}

export function certId(userId: string) {
  const h = userId.replace(/-/g, "").toUpperCase();
  return `AIFAC-${h.slice(0, 2)}-${h.slice(2, 6)}`;
}

export const fdate = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
