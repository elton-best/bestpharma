import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LogIn, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOfficine } from "@/lib/officine-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EnTete, Vide, heureFr } from "@/components/modules/commun";

export const Route = createFileRoute("/_authenticated/pointage")({
  head: () => ({ meta: [{ title: "Pointage — BEGPHARMA" }, { name: "description", content: "Arrivées et départs du personnel, à l'heure du serveur." }] }),
  component: Page,
});

/** Début de la journée à Porto-Novo (UTC+1), en ISO. */
function debutJour() {
  const j = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Porto-Novo" });
  return new Date(j + "T00:00:00+01:00").toISOString();
}

function Page() {
  const { courante } = useOfficine();
  const id = courante?.officine_id;
  const qc = useQueryClient();
  const { data: employes = [] } = useQuery({
    queryKey: ["employes-actifs", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("employes").select("id, nom_complet").eq("officine_id", id!).eq("actif", true).eq("archived", false).order("nom_complet");
      if (error) throw error;
      return data;
    },
  });
  const { data: pointages = [] } = useQuery({
    queryKey: ["pointages", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("pointages").select("*").eq("officine_id", id!).gte("horodatage", debutJour()).order("horodatage", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const pointer = useMutation({
    mutationFn: async (p: { employe_id: string; type: "arrivee" | "depart" }) => {
      const { error } = await supabase.from("pointages").insert({ officine_id: id!, ...p });
      if (error) throw error;
    },
    onSuccess: (_d, p) => {
      toast.success(p.type === "arrivee" ? "Arrivée enregistrée" : "Départ enregistré");
      qc.invalidateQueries({ queryKey: ["pointages"] });
      qc.invalidateQueries({ queryKey: ["dashboard-kpi"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const dernier = (eid: string) => pointages.find((p) => p.employe_id === eid);
  const nom = (eid: string) => employes.find((e) => e.id === eid)?.nom_complet ?? "—";

  return (
    <div className="grid gap-6">
      <EnTete titre="Pointage" description="L'heure enregistrée est celle du serveur, pas celle du téléphone." />
      {employes.length === 0 ? (
        <Vide texte="Aucun employé actif. Ajoutez du personnel d'abord." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {employes.map((e) => {
            const d = dernier(e.id);
            const present = d?.type === "arrivee";
            return (
              <Card key={e.id}>
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-semibold text-foreground">{e.nom_complet}</p>
                    <Badge variant={present ? "default" : "secondary"} className="mt-1">
                      {present ? `Présent depuis ${heureFr(d!.horodatage)}` : d ? `Parti à ${heureFr(d.horodatage)}` : "Pas encore arrivé"}
                    </Badge>
                  </div>
                  <Button size="sm" variant={present ? "outline" : "default"} disabled={pointer.isPending} onClick={() => pointer.mutate({ employe_id: e.id, type: present ? "depart" : "arrivee" })}>
                    {present ? <><LogOut className="size-4" /> Départ</> : <><LogIn className="size-4" /> Arrivée</>}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      <section className="grid gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Aujourd'hui</h2>
        {pointages.length === 0 ? (
          <Vide texte="Aucun pointage aujourd'hui." />
        ) : (
          <Card>
            <CardContent className="divide-y p-0">
              {pointages.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-4 py-2 text-sm">
                  <span>{nom(p.employe_id)}</span>
                  <span className="text-muted-foreground">{p.type === "arrivee" ? "Arrivée" : "Départ"} · {heureFr(p.horodatage)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
