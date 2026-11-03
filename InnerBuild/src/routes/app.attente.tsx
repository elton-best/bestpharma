import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Clock, MailCheck, LogOut } from "lucide-react";
import { appHead, PageHeader, Panel } from "@/components/app/AppShell";
import { clearD1Session } from "@/lib/d1-session";
import { useProfile } from "@/lib/learner";

export const Route = createFileRoute("/app/attente")({
  head: appHead("Liste d'attente", "Ton inscription est en cours de validation."),
  component: Page,
});

function Page() {
  const { data: p } = useProfile();
  const navigate = useNavigate();

  function logout() {
    clearD1Session();
    navigate({ to: "/auth", replace: true });
  }

  const rejected = p?.access_status === "rejected";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-6">
      <PageHeader eyebrow="Inscription" title={rejected ? "Inscription refusée" : "Liste d'attente"} />
      <div className="w-full max-w-2xl">
        <Panel title={rejected ? "Décision de l'équipe" : "Compte en cours de validation"}>
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${rejected ? "bg-destructive/10 text-destructive" : "bg-amber/20 text-amber-600"}`}>
              {rejected ? <MailCheck className="h-8 w-8" /> : <Clock className="h-8 w-8" />}
            </div>
            {rejected ? (
              <>
                <p className="max-w-md text-sm text-muted-foreground">
                  Ton inscription n'a pas été retenue pour cette cohorte. Tu peux réessayer avec un autre email ou contacter l'équipe pédagogique.
                </p>
              </>
            ) : (
              <>
                <p className="max-w-md text-sm text-muted-foreground">
                  Bienvenue{p?.full_name ? `, ${p.full_name.split(" ")[0]}` : ""} ! Ton inscription est bien enregistrée.
                  L'équipe AI Factory la vérifie actuellement. Tu recevras un email de confirmation
                  dès que ton compte sera validé, et tu pourras alors suivre l'onboarding puis commencer à apprendre.
                </p>
                <p className="rounded-lg bg-muted/50 px-4 py-2 font-mono text-xs text-muted-foreground">
                  {p?.email ?? ""}
                </p>
              </>
            )}
            <button type="button" onClick={logout} className="btn-base btn-ghost mt-2 gap-2 text-sm">
              <LogOut className="h-4 w-4" /> Se déconnecter
            </button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
