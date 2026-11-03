import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOfficine } from "@/lib/officine-context";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EnTete, Vide, QUALITE } from "@/components/modules/commun";
import { NouveauDocument } from "./documents";

export const Route = createFileRoute("/_authenticated/modeles")({
  head: () => ({ meta: [{ title: "Modèles — BEGPHARMA" }, { name: "description", content: "Modèles de documents BPD prêts à l'emploi." }] }),
  component: Page,
});

function Page() {
  const { courante, aRole } = useOfficine();
  const id = courante?.officine_id;
  const peutUtiliser = aRole(...QUALITE);
  const { data = [] } = useQuery({
    queryKey: ["modeles", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("documents").select("*").eq("officine_id", id!).eq("modele", true).eq("archived", false).order("titre");
      if (error) throw error;
      return data;
    },
  });
  return (
    <div className="grid gap-6">
      <EnTete titre="Modèles" description="Partez d'un modèle pour créer un document de l'officine. Les 59 modèles BEG seront importés dès réception du fichier." />
      {data.length === 0 ? <Vide texte="Aucun modèle disponible." /> : (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.map((m) => (
            <Card key={m.id}>
              <CardContent className="grid gap-2 p-4">
                <div className="flex items-center gap-2"><p className="font-semibold text-foreground">{m.titre}</p><Badge variant="outline">{m.categorie}</Badge></div>
                <p className="whitespace-pre-line text-sm text-muted-foreground">{m.contenu}</p>
                {peutUtiliser && id && (
                  <div><NouveauDocument officineId={id} libelle="Utiliser ce modèle" initial={{ titre: m.titre.replace(/^Modèle (de )?/i, ""), categorie: m.categorie, contenu: m.contenu }} /></div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
