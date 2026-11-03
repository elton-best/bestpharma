import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useOfficine } from "@/lib/officine-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EnTete, Vide, dateFr, joursRestants, QUALITE } from "@/components/modules/commun";

export const Route = createFileRoute("/_authenticated/echeances")({
  head: () => ({ meta: [{ title: "Échéances — BEGPHARMA" }, { name: "description", content: "Échéances réglementaires, formations et équipements à suivre." }] }),
  component: Page,
});

function Page() {
  const { courante, aRole } = useOfficine();
  const id = courante?.officine_id;
  const qc = useQueryClient();
  const peutGerer = aRole(...QUALITE);
  const { data = [] } = useQuery({
    queryKey: ["echeances", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("echeances").select("*").eq("officine_id", id!).eq("archived", false).order("fait").order("date_echeance");
      if (error) throw error;
      return data;
    },
  });
  const faire = useMutation({
    mutationFn: async (eid: string) => {
      const { error } = await supabase.from("echeances").update({ fait: true }).eq("id", eid);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["echeances"] }); qc.invalidateQueries({ queryKey: ["dashboard-kpi"] }); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="grid gap-6">
      <EnTete titre="Échéances" description="Renouvellements, étalonnages et formations à ne pas manquer." action={peutGerer && id ? <Ajout officineId={id} /> : null} />
      {data.length === 0 ? <Vide texte="Aucune échéance." /> : (
        <div className="grid gap-3">
          {data.map((e) => {
            const j = joursRestants(e.date_echeance);
            return (
              <Card key={e.id} className={e.fait ? "opacity-60" : ""}>
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-semibold text-foreground">{e.titre}</p>
                    <p className="text-xs text-muted-foreground">{e.categorie} · {dateFr(e.date_echeance)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {e.fait ? <Badge>Fait</Badge> : (
                      <Badge variant={j < 0 ? "destructive" : j <= 7 ? "secondary" : "outline"}>
                        {j < 0 ? `En retard de ${-j} j` : j === 0 ? "Aujourd'hui" : `Dans ${j} j`}
                      </Badge>
                    )}
                    {peutGerer && !e.fait && <Button size="sm" variant="outline" onClick={() => faire.mutate(e.id)}>Marquer fait</Button>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Ajout({ officineId }: { officineId: string }) {
  const qc = useQueryClient();
  const [ouvert, setOuvert] = useState(false);
  const [f, setF] = useState({ titre: "", categorie: "reglementaire", date_echeance: "" });
  const m = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("echeances").insert({ officine_id: officineId, ...f, titre: f.titre.trim() });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Échéance ajoutée"); qc.invalidateQueries({ queryKey: ["echeances"] }); setOuvert(false); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Dialog open={ouvert} onOpenChange={setOuvert}>
      <DialogTrigger asChild><Button>Ajouter</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nouvelle échéance</DialogTitle></DialogHeader>
        <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); if (f.titre.trim() && f.date_echeance) m.mutate(); }}>
          <div className="grid gap-1"><Label>Titre</Label><Input required value={f.titre} onChange={(e) => setF({ ...f, titre: e.target.value })} /></div>
          <div className="grid gap-1"><Label>Catégorie</Label><Input value={f.categorie} onChange={(e) => setF({ ...f, categorie: e.target.value })} /></div>
          <div className="grid gap-1"><Label>Date</Label><Input required type="date" value={f.date_echeance} onChange={(e) => setF({ ...f, date_echeance: e.target.value })} /></div>
          <Button type="submit" disabled={m.isPending}>Enregistrer</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
