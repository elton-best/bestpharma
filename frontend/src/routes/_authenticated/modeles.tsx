import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileCheck, Sparkles, BookOpen } from "lucide-react";
import { api } from "@/lib/api-client";
import { useOfficine } from "@/lib/officine-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EnTete, Vide, QUALITE } from "@/components/modules/commun";

export const Route = createFileRoute("/_authenticated/modeles")({
  head: () => ({
    meta: [
      { title: "Bibliothèque des 59 Modèles BPD — BEGPHARMA" },
      { name: "description", content: "Bibliothèque de modèles de procédures, modes opératoires et registres conformes au Guide BPD de l'ABMed." },
    ],
  }),
  component: PageModeles,
});

interface ModeleBpd {
  id: string;
  code_ref: string;
  processus: string;
  type_document: string;
  titre: string;
  objet: string | null;
  domaine_application: string | null;
  contenu_modele: string;
  articles_guide: string | null;
  duree_conservation_ans: number;
}

const libellesProcessus: Record<string, string> = {
  tous: "Tous les processus",
  TAM: "TAM (Direction)",
  QAM: "QAM (Qualité & CAPA)",
  GAD: "GAD (Dispensation)",
  GAC: "GAC (Stock & Froid)",
  GAR: "GAR (RH & Locaux)",
};

function PageModeles() {
  const { courante, aRole } = useOfficine();
  const id = courante?.officine_id;
  const qc = useQueryClient();
  const peutInstancier = aRole(...QUALITE);
  const [filtreProcessus, setFiltreProcessus] = useState("tous");

  const { data: modeles = [], isLoading } = useQuery<ModeleBpd[]>({
    queryKey: ["modeles-bpd"],
    queryFn: async () => {
      return api.get<ModeleBpd[]>("/api/modeles-bpd");
    },
  });

  const instancier = useMutation({
    mutationFn: async (modeleId: string) => {
      return api.post(`/api/officines/${id}/modeles-bpd/${modeleId}/instancier`);
    },
    onSuccess: () => {
      toast.success("Modèle instancié avec succès dans les documents de l'officine (en statut brouillon).");
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (e: any) => toast.error(e.message || "Erreur lors de l'instanciation du modèle"),
  });

  const modelesFiltres = filtreProcessus === "tous"
    ? modeles
    : modeles.filter((m) => m.processus === filtreProcessus);

  return (
    <div className="grid gap-6">
      <EnTete
        titre="Bibliothèque des Modèles BPD (BPD-C02)"
        description="Collection officielle des 59 modèles types préchargés (procédures, registres, fiches), prêts à être adaptés et validés par le pharmacien titulaire."
      />

      <Tabs value={filtreProcessus} onValueChange={setFiltreProcessus}>
        <TabsList className="grid grid-cols-3 sm:grid-cols-6 h-auto p-1">
          {Object.entries(libellesProcessus).map(([cle, libelle]) => (
            <TabsTrigger key={cle} value={cle} className="text-xs py-2">
              {libelle}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {modelesFiltres.length === 0 ? (
        <Vide texte="Aucun modèle disponible pour ce filtre de processus." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {modelesFiltres.map((m) => (
            <Card key={m.id} className="flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className="font-mono text-xs font-bold text-primary">
                      {m.code_ref}
                    </Badge>
                    <Badge variant="secondary" className="text-[11px]">
                      {m.processus} · {m.type_document}
                    </Badge>
                  </div>
                  {m.articles_guide ? (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      {m.articles_guide}
                    </Badge>
                  ) : null}
                </div>
                <CardTitle className="text-base font-bold text-foreground mt-2 leading-snug">
                  {m.titre}
                </CardTitle>
                {m.objet ? (
                  <CardDescription className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {m.objet}
                  </CardDescription>
                ) : null}
              </CardHeader>

              <CardContent className="pt-0">
                <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground font-mono whitespace-pre-line line-clamp-4 mb-4 border">
                  {m.contenu_modele}
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t text-xs text-muted-foreground">
                  <span>Conservation légale : {m.duree_conservation_ans} ans</span>
                  {peutInstancier && id ? (
                    <Button
                      size="sm"
                      className="h-8"
                      disabled={instancier.isPending}
                      onClick={() => instancier.mutate(m.id)}
                    >
                      <Sparkles className="size-3.5 mr-1.5" /> Adopter ce modèle
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
