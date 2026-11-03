import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useOfficine, type Role } from "@/lib/officine-context";
import { fr } from "@/lib/i18n/fr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EnTete, Vide, dateFr, DIRECTION } from "@/components/modules/commun";

export const Route = createFileRoute("/_authenticated/personnel")({
  head: () => ({ meta: [{ title: "Personnel — BEGPHARMA" }, { name: "description", content: "Fiches du personnel de l'officine." }] }),
  component: Page,
});

function Page() {
  const { courante, aRole } = useOfficine();
  const id = courante?.officine_id;
  const qc = useQueryClient();
  const peutGerer = aRole(...DIRECTION);
  const { data = [] } = useQuery({
    queryKey: ["employes", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("employes").select("*").eq("officine_id", id!).eq("archived", false).order("nom_complet");
      if (error) throw error;
      return data;
    },
  });
  const basculer = useMutation({
    mutationFn: async (e: { id: string; actif: boolean }) => {
      const { error } = await supabase.from("employes").update({ actif: !e.actif }).eq("id", e.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employes"] }),
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="grid gap-6">
      <EnTete titre="Personnel" description={`${data.filter((e) => e.actif).length} employé(s) actif(s)`} action={peutGerer && id ? <Ajout officineId={id} /> : null} />
      {data.length === 0 ? (
        <Vide texte="Aucun employé enregistré." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.map((e) => (
            <Card key={e.id} className={e.actif ? "" : "opacity-60"}>
              <CardContent className="flex items-start justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold text-foreground">{e.nom_complet}</p>
                  <p className="text-sm text-muted-foreground">{fr.roles[e.poste]}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{e.telephone ?? "—"} · Embauche : {dateFr(e.date_embauche)}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant={e.actif ? "default" : "secondary"}>{e.actif ? "Actif" : "Inactif"}</Badge>
                  {peutGerer && (
                    <Button size="sm" variant="ghost" onClick={() => basculer.mutate(e)}>
                      {e.actif ? "Désactiver" : "Réactiver"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Ajout({ officineId }: { officineId: string }) {
  const qc = useQueryClient();
  const [ouvert, setOuvert] = useState(false);
  const [f, setF] = useState({ nom_complet: "", telephone: "", poste: "preparateur" as Role, date_embauche: "" });
  const m = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("employes").insert({
        officine_id: officineId,
        nom_complet: f.nom_complet.trim(),
        telephone: f.telephone || null,
        poste: f.poste,
        date_embauche: f.date_embauche || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Employé ajouté");
      qc.invalidateQueries({ queryKey: ["employes"] });
      setOuvert(false);
      setF({ nom_complet: "", telephone: "", poste: "preparateur", date_embauche: "" });
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Dialog open={ouvert} onOpenChange={setOuvert}>
      <DialogTrigger asChild>
        <Button>Ajouter un employé</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvel employé</DialogTitle>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); if (f.nom_complet.trim()) m.mutate(); }}>
          <div className="grid gap-1"><Label>Nom complet</Label><Input required value={f.nom_complet} onChange={(e) => setF({ ...f, nom_complet: e.target.value })} /></div>
          <div className="grid gap-1"><Label>Téléphone</Label><Input value={f.telephone} onChange={(e) => setF({ ...f, telephone: e.target.value })} placeholder="+229 …" /></div>
          <div className="grid gap-1">
            <Label>Poste</Label>
            <Select value={f.poste} onValueChange={(v) => setF({ ...f, poste: v as Role })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(fr.roles) as Role[]).map((r) => <SelectItem key={r} value={r}>{fr.roles[r]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1"><Label>Date d'embauche</Label><Input type="date" value={f.date_embauche} onChange={(e) => setF({ ...f, date_embauche: e.target.value })} /></div>
          <Button type="submit" disabled={m.isPending}>Enregistrer</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
