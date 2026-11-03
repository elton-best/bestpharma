import { createFileRoute, Outlet, redirect, isRedirect } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { getD1SessionUser } from "@/lib/d1-session";
import { d1GetServerFn, d1ListServerFn } from "@/lib/d1-data.functions";
import { loadCourseFromD1 } from "@/lib/content";

let courseSyncScheduled = false;

export const Route = createFileRoute("/app")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    try {
      // 1. Session D1 (source unique, synchrone)
      const session = getD1SessionUser();
      const user = session
        ? {
            id: session.id,
            email: session.email,
            user_metadata: {
              full_name: session.fullName ?? session.full_name,
              role: session.role,
            },
          }
        : null;

      if (!user) {
        throw redirect({ to: "/auth" });
      }

      // Master admin bypass
      const cleanEmail = user.email?.toLowerCase();
      const isMasterAdmin = cleanEmail === "eltonhounnou27@gmail.com";

      // D1 source unique : rôle admin + onboarded
      let isAdmin = false;
      let prof: any = null;
      try {
        const [roles, profile] = await Promise.all([
          d1ListServerFn({ data: { table: "user_roles", where: { user_id: user.id } } }),
          d1GetServerFn({ data: { table: "profiles", id: user.id } }),
        ]);
        isAdmin = (roles.rows || []).some((r: any) => r.role === "admin");
        prof = profile.row || null;
      } catch (queryErr) {
        console.warn("Non-fatal app profile query notice:", queryErr);
      }

      if (isAdmin || isMasterAdmin) {
        throw redirect({ to: "/admin" });
      }

      // Comptes explicitement rejetés par l'administrateur
      if (prof && prof.access_status === "rejected" && !location.pathname.startsWith("/app/attente")) {
        throw redirect({ to: "/app/attente" });
      }

      // Offre de lancement gratuit & verrouillage strict à la fin du mois
      const { getLaunchTrialState } = await import("@/lib/learner");
      const trial = getLaunchTrialState(prof?.access_status);
      const isPaid = prof?.access_status === "pro" || prof?.access_status === "active" || prof?.access_status === "unlimited";

      if (!isPaid && trial.isTrialExpired && !location.pathname.startsWith("/app/paiement")) {
        throw redirect({ to: "/app/paiement" });
      }

      if (prof && (prof.onboarded === 0 || prof.onboarded === false) && !location.pathname.startsWith("/app/bienvenue") && !location.pathname.startsWith("/app/attente") && !location.pathname.startsWith("/app/paiement")) {
        throw redirect({ to: "/app/bienvenue" });
      }

      // Load the large course catalogue after the first paint so it does not
      // compete with the shell, navigation and profile requests on mobile.
      if (!courseSyncScheduled && typeof window !== "undefined") {
        courseSyncScheduled = true;
        const syncCourse = () => loadCourseFromD1().catch(() => {});
        const requestIdle = (
          window as unknown as {
            requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
          }
        ).requestIdleCallback;
        if (requestIdle) requestIdle(syncCourse, { timeout: 4_000 });
        else globalThis.setTimeout(syncCourse, 1_500);
      }

      return { user, profile: prof };
    } catch (err: any) {
      // Si c'est une redirection TanStack Router, la propager directement sans interférence
      if (
        isRedirect(err) ||
        err instanceof Response ||
        (err && typeof err === "object" && ("status" in err || "headers" in err)) ||
        err?.to
      ) {
        throw err;
      }
      console.warn("Non-fatal app auth check notice:", err);
      return { user: null, profile: null };
    }
  },
  component: () => <AppShell><Outlet /></AppShell>,
});
