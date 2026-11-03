import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useOfficine } from "@/lib/officine-context";
import { fr } from "@/lib/i18n/fr";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/journal")({
  head: () => ({
    meta: [
      { title: "Journal d'audit — BEGPHARMA" },
      {
        name: "description",
        content: "Journal d'audit inaltérable de votre officine dans BEGPHARMA.",
      },
      { property: "og:title", content: "Journal d'audit — BEGPHARMA" },
      {
        property: "og:description",
        content: "Journal d'audit inaltérable de votre officine dans BEGPHARMA.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PageJournal,
});

interface LigneJournal {
  id: number;
  table_nom: string;
  ligne_id: string | null;
  action: string;
  user_id: string | null;
  appareil: string | null;
  created_at: string;
}

const fmtDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" });

function PageJournal() {
  const { courante, aRole, chargement } = useOfficine();

  const autorise = aRole("promoteur", "pharmacien_titulaire", "rmq");

  const { data: lignes, isLoading } = useQuery({
    queryKey: ["journal", courante?.officine_id],
    enabled: !!courante && autorise,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journal_audit")
        .select("id, table_nom, ligne_id, action, user_id, appareil, created_at")
        .eq("officine_id", courante!.officine_id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as LigneJournal[];
    },
  });

  const ids = Array.from(new Set((lignes ?? []).map((l) => l.user_id).filter(Boolean))) as string[];
  const { data: profils } = useQuery({
    queryKey: ["profils-noms", ids],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profils")
        .select("id, nom_complet")
        .in("id", ids);
      if (error) throw error;
      return new Map((data ?? []).map((p) => [p.id, p.nom_complet]));
    },
  });

  if (chargement) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!autorise) {
    return (
      <div className="grid gap-4">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          {fr.journal.titre}
        </h1>
        <Alert>
          <AlertDescription>{fr.journal.nonAutorise}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          {fr.journal.titre}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{fr.journal.sousTitre}</p>
      </div>

      {isLoading ? <Skeleton className="h-20 w-full" /> : null}
      {(lignes ?? []).map((l) => (
        <Card key={l.id}>
          <CardContent className="grid gap-1 p-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{fr.actions[l.action as keyof typeof fr.actions] ?? l.action}</Badge>
              <span className="font-medium text-foreground">{l.table_nom}</span>
              <span className="text-muted-foreground">{fmtDate.format(new Date(l.created_at))}</span>
            </div>
            <p className="text-muted-foreground">
              {fr.journal.utilisateur} : {l.user_id ? (profils?.get(l.user_id) ?? "—") : "—"}
              {l.appareil ? ` · ${fr.journal.appareil} : ${l.appareil}` : ""}
            </p>
          </CardContent>
        </Card>
      ))}
      {!isLoading && (lignes ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">{fr.commun.vide}</p>
      ) : null}
    </div>
  );
}
