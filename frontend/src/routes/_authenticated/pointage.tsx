import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LogIn, LogOut, ShieldAlert, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api-client";
import { useOfficine } from "@/lib/officine-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EnTete, Vide, heureFr } from "@/components/modules/commun";

export const Route = createFileRoute("/_authenticated/pointage")({
  head: () => ({
    meta: [
      { title: "Pointage & Présence Pharmacien — BEGPHARMA" },
      { name: "description", content: "Pointage nominatif et respect de l'obligation de présence d'un pharmacien (art. 1.11 BPD)." },
    ],
  }),
  component: PagePointage,
});

interface PointageData {
  pointages: Array<{
    id: string;
    employe_id: string;
    employe_nom: string;
    employe_poste: string;
    type: "arrivee" | "depart";
    horodatage: string;
  }>;
  pharmacien_present: boolean;
  pharmaciens_sur_place: string[];
  statut_reglementaire: string;
  message: string;
}

function PagePointage() {
  const { courante } = useOfficine();
  const id = courante?.officine_id;
  const qc = useQueryClient();

  // Liste des employés actifs
  const { data: employesData } = useQuery({
    queryKey: ["employes", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await api.get<{ employes: any[] }>(`/api/officines/${id}/employes`);
      return res.employes || [];
    },
  });

  // État des pointages et présence pharmaceutique
  const { data: presenceData } = useQuery<PointageData>({
    queryKey: ["pointages", id],
    enabled: !!id,
    queryFn: async () => {
      return api.get<PointageData>(`/api/officines/${id}/pointages`);
    },
    refetchInterval: 10000, // Rafraîchissement automatique toutes les 10s
  });

  const pointer = useMutation({
    mutationFn: async (p: { employe_id: string; type: "arrivee" | "depart" }) => {
      return api.post(`/api/officines/${id}/pointages`, p);
    },
    onSuccess: (_d, p) => {
      toast.success(p.type === "arrivee" ? "Arrivée enregistrée à l'heure serveur" : "Départ enregistré à l'heure serveur");
      qc.invalidateQueries({ queryKey: ["pointages"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const employes = employesData || [];
  const pointages = presenceData?.pointages || [];
  const pharmacienPresent = presenceData?.pharmacien_present ?? false;
  const pharmaciensSurPlace = presenceData?.pharmaciens_sur_place || [];

  const dernier = (eid: string) => pointages.find((p) => p.employe_id === eid);

  return (
    <div className="grid gap-6">
      <EnTete
        titre="Pointage des présences (BPD-C09)"
        description="L'horodatage serveur fait foi. La présence continue d'au moins un pharmacien inscrit est obligatoire pendant l'ouverture."
      />

      {/* Règle du pharmacien présent */}
      <Alert variant={pharmacienPresent ? "default" : "destructive"} className="border-2">
        {pharmacienPresent ? (
          <ShieldCheck className="size-5 text-emerald-600" />
        ) : (
          <ShieldAlert className="size-5" />
        )}
        <AlertTitle className="text-base font-bold">
          {pharmacienPresent
            ? "Conformité BPD : Présence pharmaceutique active"
            : "ALERTE RÉGLEMENTAIRE : Aucun pharmacien pointé présent !"}
        </AlertTitle>
        <AlertDescription className="mt-1 text-sm">
          {pharmacienPresent ? (
            <span>
              Pharmacien(s) sur place :{" "}
              <strong>{pharmaciensSurPlace.join(", ")}</strong>. La dispensation aux patients est légalement autorisée.
            </span>
          ) : (
            <span>
              Conformément à l'article 1.11 du Guide BPD de l'ABMed, la pharmacie ne peut ouvrir ses portes ni délivrer
              de médicaments sans la présence effective d'un pharmacien.
            </span>
          )}
        </AlertDescription>
      </Alert>

      {/* GRILLE DU PERSONNEL ET POINTAGE RAPIDE AU POUCE */}
      {employes.length === 0 ? (
        <Vide texte="Aucun employé enregistré dans l'officine." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {employes.map((e: any) => {
            const d = dernier(e.id);
            const present = d?.type === "arrivee";
            const estPharmacien = ["pharmacien_titulaire", "pharmacien_adjoint", "pharmacien_remplacant", "promoteur"].includes(e.poste);

            return (
              <Card key={e.id} className={present ? "border-primary/50 shadow-sm" : "opacity-80"}>
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground">{e.nom_complet}</p>
                      {estPharmacien ? (
                        <Badge variant="outline" className="border-emerald-600 text-emerald-700 bg-emerald-50 text-[10px]">
                          Pharmacien
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">Matricule: {e.matricule || "—"}</p>
                    <Badge variant={present ? "default" : "secondary"} className="mt-2 text-xs">
                      {present ? `Présent depuis ${heureFr(d!.horodatage)}` : d ? `Parti à ${heureFr(d.horodatage)}` : "Non pointé aujourd'hui"}
                    </Badge>
                  </div>

                  <Button
                    size="sm"
                    variant={present ? "outline" : "default"}
                    disabled={pointer.isPending}
                    className="h-10 min-w-28"
                    onClick={() => pointer.mutate({ employe_id: e.id, type: present ? "depart" : "arrivee" })}
                  >
                    {present ? (
                      <>
                        <LogOut className="size-4 mr-1.5" /> Départ
                      </>
                    ) : (
                      <>
                        <LogIn className="size-4 mr-1.5" /> Arrivée
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* HISTORIQUE CHRONOLOGIQUE DES POINTAGES DE LA JOURNÉE */}
      <section className="grid gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Historique chronologique du jour (horodatage serveur)</h2>
        {pointages.length === 0 ? (
          <Vide texte="Aucun pointage aujourd'hui." />
        ) : (
          <Card>
            <CardContent className="divide-y p-0">
              {pointages.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <span className="font-medium">{p.employe_nom}</span>
                    <span className="text-xs text-muted-foreground ml-2">({p.employe_poste})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={p.type === "arrivee" ? "default" : "secondary"}>
                      {p.type === "arrivee" ? "Arrivée" : "Départ"}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono">{heureFr(p.horodatage)}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
