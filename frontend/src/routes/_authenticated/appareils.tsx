import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MonitorSmartphone, ShieldAlert } from "lucide-react";

import { api } from "@/lib/api-client";
import { deconnecter } from "@/lib/session";
import { fr } from "@/lib/i18n/fr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/appareils")({
  head: () => ({
    meta: [
      { title: "Appareils connectés — BestPharma" },
      {
        name: "description",
        content: "Appareils connectés à votre compte BestPharma et déconnexion à distance.",
      },
    ],
  }),
  component: PageAppareils,
});

interface Appareil {
  id: number | string;
  name: string;
  is_current: boolean;
  last_used_at: string | null;
  created_at: string | null;
}

const fmtDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" });

function PageAppareils() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data, isLoading } = useQuery<{ devices: Appareil[] }>({
    queryKey: ["appareils"],
    queryFn: () => api.get<{ devices: Appareil[] }>("/auth/devices"),
  });

  const revoquer = useMutation({
    mutationFn: (id: string | number) => api.delete(`/auth/devices/${id}`),
    onSuccess: async (_res, id) => {
      const etaitCourant = (data?.devices ?? []).find((a) => a.id === id)?.is_current;
      toast.success(fr.appareils.revoque);
      if (etaitCourant) {
        await deconnecter(queryClient, router);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["appareils"] });
    },
    onError: (e: any) => toast.error(e.message || fr.commun.erreur),
  });

  const revoquerAutres = useMutation({
    mutationFn: async (courantId: string | number) => {
      const autres = (data?.devices ?? []).filter((a) => a.id !== courantId);
      for (const appareil of autres) {
        await api.delete(`/auth/devices/${appareil.id}`);
      }
      return autres.length;
    },
    onSuccess: async (nombre) => {
      toast.success(
        nombre > 0
          ? `${nombre} appareil${nombre > 1 ? "s" : ""} déconnecté${nombre > 1 ? "s" : ""}.`
          : "Aucun autre appareil à déconnecter.",
      );
      await queryClient.invalidateQueries({ queryKey: ["appareils"] });
    },
    onError: (e: any) => toast.error(e.message || fr.commun.erreur),
  });

  const appareils = data?.devices ?? [];
  const courant = appareils.find((a) => a.is_current);

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            {fr.appareils.titre}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{fr.appareils.sousTitre}</p>
        </div>
        {appareils.length > 1 && courant ? (
          <Button
            variant="outline"
            className="h-12 gap-2"
            onClick={() => revoquerAutres.mutate(courant.id)}
            disabled={revoquerAutres.isPending}
          >
            <ShieldAlert className="size-4" />
            {fr.appareils.toutRevoquer}
          </Button>
        ) : null}
      </div>

      {isLoading ? <Skeleton className="h-16 w-full" /> : null}

      {appareils.map((a) => (
        <Card key={a.id} className={a.is_current ? "border-[#CFF1D2] bg-[#F7FBF8]" : ""}>
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="rounded-lg bg-[#EFF7F1] p-2 text-[#0F3B27]">
                <MonitorSmartphone className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">{a.name || "Navigateur"}</span>
                  {a.is_current ? <Badge>{fr.appareils.actuel}</Badge> : null}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {fr.appareils.derniere} :{" "}
                  {a.last_used_at ? fmtDate.format(new Date(a.last_used_at)) : "à l'instant"}
                </p>
                {a.created_at ? (
                  <p className="text-xs text-muted-foreground">
                    Ouverture de session : {fmtDate.format(new Date(a.created_at))}
                  </p>
                ) : null}
              </div>
            </div>
            <Button
              variant="outline"
              className="h-11 shrink-0"
              onClick={() => revoquer.mutate(a.id)}
              disabled={revoquer.isPending}
            >
              {fr.appareils.revoquer}
            </Button>
          </CardContent>
        </Card>
      ))}

      {!isLoading && appareils.length === 0 ? (
        <p className="text-sm text-muted-foreground">{fr.commun.vide}</p>
      ) : null}
    </div>
  );
}
