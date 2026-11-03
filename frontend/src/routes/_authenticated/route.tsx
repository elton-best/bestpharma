import { useCallback, useEffect } from "react";
import {
  Outlet,
  createFileRoute,
  redirect,
  useRouter,
} from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { supabase } from "@/integrations/supabase/client";
import { enregistrerAppareil } from "@/lib/appareil";
import { OfficineProvider, useOfficine } from "@/lib/officine-context";
import { fr } from "@/lib/i18n/fr";
import { deconnecter } from "@/lib/session";
import { useEnLigne } from "@/hooks/use-en-ligne";
import { useInactivite } from "@/hooks/use-inactivite";

/** Durée d'inactivité avant verrouillage de la session (E0-S8). */
const MINUTES_INACTIVITE = 15;

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth", search: {} });
    return { user: data.user };
  },
  component: LayoutAuthentifie,
});

function LayoutAuthentifie() {
  const { user } = Route.useRouteContext();
  return (
    <OfficineProvider userId={user.id}>
      <Coquille userId={user.id} email={user.email ?? ""} />
    </OfficineProvider>
  );
}

function Coquille({ userId, email }: { userId: string; email: string }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { enLigne, attente } = useEnLigne();
  const { courante } = useOfficine();

  const { data: profil } = useQuery({
    queryKey: ["profil", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profils")
        .select("nom_complet")
        .eq("id", userId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Enregistre l'appareil ; s'il a été révoqué à distance, on déconnecte.
  useEffect(() => {
    let annule = false;
    enregistrerAppareil(userId).then((ok) => {
      if (!ok && !annule) deconnecter(queryClient, router);
    });
    return () => {
      annule = true;
    };
  }, [userId, queryClient, router]);

  const surExpiration = useCallback(() => {
    deconnecter(queryClient, router, { verrouille: true });
  }, [queryClient, router]);
  useInactivite(MINUTES_INACTIVITE, surExpiration);

  async function surDeconnexion() {
    await deconnecter(queryClient, router);
  }

  const initiales = (profil?.nom_complet || email)
    .split(/\s+/)
    .slice(0, 2)
    .map((m) => m[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <SidebarProvider>
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur">
        <div className="flex w-full items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger className="size-9" />
            <div className="min-w-0">
            <span className="font-display text-base font-bold tracking-tight text-foreground">
              {fr.app.nom}
            </span>
            {courante ? (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {fr.officine.selecteur} : <span className="font-medium">{courante.officine.nom}</span>
              </p>
            ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={enLigne ? "secondary" : "destructive"} className="hidden sm:inline-flex">
              {enLigne ? fr.commun.enLigne : fr.commun.horsLigne}
            </Badge>
            {attente > 0 ? (
              <Badge variant="outline" className="hidden sm:inline-flex">
                {attente} {fr.commun.enAttente}
              </Badge>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full" aria-label="Compte">
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-secondary text-xs font-semibold text-secondary-foreground">
                      {initiales || "?"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="truncate text-sm font-semibold">{profil?.nom_complet || email}</div>
                  <div className="truncate text-xs font-normal text-muted-foreground">{email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => router.navigate({ to: "/parametres" })}>
                  {fr.nav.parametres}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => router.navigate({ to: "/securite" })}>
                  {fr.nav.securite}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => router.navigate({ to: "/journal" })}>
                  {fr.nav.journal}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => router.navigate({ to: "/appareils" })}>
                  {fr.nav.appareils}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={() => surDeconnexion()}
                >
                  {fr.commun.deconnexion}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <Outlet />
      </main>
      </div>
    </div>
    </SidebarProvider>
  );
}
