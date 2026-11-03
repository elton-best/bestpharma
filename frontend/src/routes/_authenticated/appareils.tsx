import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { appareilCourant } from "@/lib/appareil";
import { deconnecter } from "@/lib/session";
import { fr } from "@/lib/i18n/fr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient as useQC } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/appareils")({
  head: () => ({
    meta: [
      { title: "Appareils connectés — BEGPHARMA" },
      {
        name: "description",
        content: "Appareils connectés à votre compte BEGPHARMA et révocation à distance.",
      },
      { property: "og:title", content: "Appareils connectés — BEGPHARMA" },
      {
        property: "og:description",
        content: "Appareils connectés à votre compte BEGPHARMA et révocation à distance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PageAppareils,
});

interface Appareil {
  id: string;
  libelle: string;
  derniere_activite: string;
  revoquee: boolean;
}

const fmtDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" });

function PageAppareils() {
  const queryClient = useQC();
  const router = useRouter();
  const { user } = Route.useRouteContext() as unknown as { user: { id: string } };
  const userId = user.id;
  const [courant, setCourant] = useState<string | null>(null);

  useEffect(() => setCourant(appareilCourant()), []);

  const { data: appareils, isLoading } = useQuery({
    queryKey: ["appareils", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions_appareils")
        .select("id, libelle, derniere_activite, revoquee")
        .eq("user_id", userId)
        .order("derniere_activite", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Appareil[];
    },
  });

  async function revoquer(id: string) {
    const { error } = await supabase
      .from("sessions_appareils")
      .update({ revoquee: true })
      .eq("id", id);
    if (error) {
      toast.error(fr.commun.erreur);
      return;
    }
    toast.success(fr.appareils.revoque);
    await queryClient.invalidateQueries({ queryKey: ["appareils", userId] });
    if (id === courant) await deconnecter(queryClient, router);
  }

  async function revoquerAutres() {
    if (!courant) return;
    const { error } = await supabase
      .from("sessions_appareils")
      .update({ revoquee: true })
      .eq("user_id", userId)
      .neq("id", courant)
      .eq("revoquee", false);
    if (error) {
      toast.error(fr.commun.erreur);
      return;
    }
    toast.success(fr.appareils.revoque);
    await queryClient.invalidateQueries({ queryKey: ["appareils", userId] });
  }

  const actifs = (appareils ?? []).filter((a) => !a.revoquee);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            {fr.appareils.titre}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{fr.appareils.sousTitre}</p>
        </div>
        {actifs.length > 1 ? (
          <Button variant="outline" onClick={revoquerAutres}>
            {fr.appareils.toutRevoquer}
          </Button>
        ) : null}
      </div>

      {isLoading ? <Skeleton className="h-16 w-full" /> : null}
      {(appareils ?? []).map((a) => (
        <Card key={a.id} className={a.revoquee ? "opacity-50" : ""}>
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-foreground">{a.libelle}</span>
                {a.id === courant ? <Badge>{fr.appareils.actuel}</Badge> : null}
                {a.revoquee ? <Badge variant="destructive">{fr.appareils.revoque}</Badge> : null}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {fr.appareils.derniere} : {fmtDate.format(new Date(a.derniere_activite))}
              </p>
            </div>
            {!a.revoquee ? (
              <Button variant="outline" size="sm" onClick={() => revoquer(a.id)}>
                {fr.appareils.revoquer}
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ))}
      {!isLoading && (appareils ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">{fr.commun.vide}</p>
      ) : null}
    </div>
  );
}
