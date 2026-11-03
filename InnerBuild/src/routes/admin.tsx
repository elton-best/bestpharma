import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { getD1SessionUser } from "@/lib/d1-session";
import { d1ListServerFn } from "@/lib/d1-data.functions";
import { loadCourseFromD1 } from "@/lib/content";
import { AdminShell } from "@/components/admin/AdminShell";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async () => {
    const session = getD1SessionUser();
    if (!session) throw redirect({ to: "/" });
    const user = { id: session.id, email: session.email };
    const isMasterAdmin = user.email?.toLowerCase() === "eltonhounnou27@gmail.com";
    if (!isMasterAdmin) {
      try {
        const roles = await d1ListServerFn({
          data: { table: "user_roles", where: { user_id: user.id } },
        });
        const isAdmin = (roles.rows || []).some((r: any) => r.role === "admin");
        if (!isAdmin) throw redirect({ to: "/" });
      } catch {
        throw redirect({ to: "/" });
      }
    }
    await loadCourseFromD1().catch(() => {});
  },
  component: () => (
    <AdminShell>
      <Outlet />
    </AdminShell>
  ),
  errorComponent: ({ error }) => (
    <div className="p-10 text-center">
      <p className="font-bold text-ink">Erreur de chargement</p>
      <p className="text-sm text-muted-foreground">
        {error instanceof Error ? error.message : String(error)}
      </p>
      <Link to="/admin" className="btn-base btn-ghost mt-4">
        Réessayer
      </Link>
    </div>
  ),
});
