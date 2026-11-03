import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useOfficine } from "@/lib/officine-context";
import { fr } from "@/lib/i18n/fr";
import { navPrincipale } from "@/components/navigation";

const indicateurs = [
  { titre: "Présents aujourd'hui", sprint: "S3" },
  { titre: "Documents à valider", sprint: "S4" },
  { titre: "Non-conformités ouvertes", sprint: "S5" },
  { titre: "Échéances sous 7 jours", sprint: "S6" },
];

export function TableauDeBord() {
  const { courante } = useOfficine();
  const id = courante?.officine_id;

  const { data: audit } = useQuery({
    queryKey: ["dashboard-audit", id],
    enabled: !!id,
    queryFn: async () => {
      const { count } = await supabase
        .from("journal_audit")
        .select("id", { count: "exact", head: true })
        .eq("officine_id", id!);
      return count ?? 0;
    },
  });

  if (!courante) return null;

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            {courante.officine.nom}
            <Badge variant="secondary">{fr.roles[courante.role]}</Badge>
          </CardTitle>
          <CardDescription>{courante.officine.ville ?? "—"}</CardDescription>
        </CardHeader>
      </Card>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {indicateurs.map((k) => (
          <Card key={k.titre}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{k.titre}</p>
              <p className="mt-1 font-display text-2xl font-bold text-muted-foreground/60">—</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Disponible au {k.sprint}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <p className="text-xs text-muted-foreground">Écritures au journal d'audit</p>
            <p className="font-display text-2xl font-bold text-foreground">{audit ?? "…"}</p>
          </div>
          <Link to="/journal" className="text-sm font-medium text-primary hover:underline">
            Voir le journal
          </Link>
        </CardContent>
      </Card>

      <section className="grid gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Modules</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {navPrincipale.slice(1).map((m) => (
            <Link
              key={m.url}
              to={m.url}
              className="flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-accent/40"
            >
              <m.icone className="size-5 text-primary" />
              <span className="text-sm font-semibold text-foreground">{m.titre}</span>
              <span className="text-[11px] text-muted-foreground">Prévu au {m.sprint}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
