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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EnTete, Vide, dateFr, QUALITE } from "@/components/modules/commun";

export const Route = createFileRoute("/_authenticated/non-conformites")({
  head: () => ({ meta: [{ title: "Non-conformités — BEGPHARMA" }, { name: "description", content: "Déclaration et suivi des non-conformités et actions correctives." }] }),
  component: Page,
});

const statuts: Record<string, string> = { ouverte: "Ouverte", en_cours: "En cours", cloturee: "Clôturée" };
const gravites: Record<string, string> = { mineure: "Mineure", majeure: "Majeure", critique: "Critique" };

function Page() {
  const { courante, aRole } = useOfficine();
  const id = courante?.officine_id;
  const qc = useQueryClient();
  const peutTraiter = aRole(...QUALITE);
  const { data = [] } = useQuery({
    queryKey: ["nc", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("non_conformites").select("*").eq("officine_id", id!).eq("archived", false).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const maj = useMutation({
    mutationFn: async ({ ncId, statut }: { ncId: string; statut: string }) => {
      const { error } = await supabase.from("non_conformites").update({ statut }).eq("id", ncId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["nc"] }); qc.invalidateQueries({ queryKey: ["dashboard-kpi"] }); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="grid gap-6">
      <EnTete titre="Non-conformités" description="Tout membre de l'équipe peut déclarer. Le responsable qualité assure le suivi." action={id ? <Declarer officineId={id} /> : null} />
      {data.length === 0 ? <Vide texte="Aucune non-conformité déclarée." /> : (
        <div className="grid gap-3">
          {data.map((n) => (
            <Card key={n.id}>
              <CardContent className="grid gap-2 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-foreground">{n.titre}</p>
                  <Badge variant={n.gravite === "critique" ? "destructive" : "outline"}>{gravites[n.gravite]}</Badge>
                  <Badge variant={n.statut === "cloturee" ? "default" : "secondary"}>{statuts[n.statut]}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{n.description || "—"}</p>
                {n.action_corrective && <p className="text-sm"><span className="font-medium">Action corrective :</span> {n.action_corrective}</p>}
                <p className="text-xs text-muted-foreground">Déclarée le {dateFr(n.created_at)} · échéance {dateFr(n.date_limite)}</p>
                {peutTraiter && n.statut !== "cloturee" && (
                  <div className="flex gap-2">
                    {n.statut === "ouverte" && <Button size="sm" variant="outline" onClick={() => maj.mutate({ ncId: n.id, statut: "en_cours" })}>Prendre en charge</Button>}
                    <Button size="sm" onClick={() => maj.mutate({ ncId: n.id, statut: "cloturee" })}>Clôturer</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Declarer({ officineId }: { officineId: string }) {
  const qc = useQueryClient();
  const [ouvert, setOuvert] = useState(false);
  const vide = { titre: "", description: "", gravite: "mineure", action_corrective: "", date_limite: "" };
  const [f, setF] = useState(vide);
  const m = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("non_conformites").insert({ officine_id: officineId, ...f, titre: f.titre.trim(), date_limite: f.date_limite || null });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Non-conformité déclarée"); qc.invalidateQueries({ queryKey: ["nc"] }); qc.invalidateQueries({ queryKey: ["dashboard-kpi"] }); setOuvert(false); setF(vide); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Dialog open={ouvert} onOpenChange={setOuvert}>
      <DialogTrigger asChild><Button>Déclarer</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Déclarer une non-conformité</DialogTitle></DialogHeader>
        <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); if (f.titre.trim()) m.mutate(); }}>
          <div className="grid gap-1"><Label>Titre</Label><Input required value={f.titre} onChange={(e) => setF({ ...f, titre: e.target.value })} /></div>
          <div className="grid gap-1"><Label>Description</Label><Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
          <div className="grid gap-1">
            <Label>Gravité</Label>
            <Select value={f.gravite} onValueChange={(v) => setF({ ...f, gravite: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(gravites).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid gap-1"><Label>Action corrective proposée</Label><Textarea value={f.action_corrective} onChange={(e) => setF({ ...f, action_corrective: e.target.value })} /></div>
          <div className="grid gap-1"><Label>Date limite</Label><Input type="date" value={f.date_limite} onChange={(e) => setF({ ...f, date_limite: e.target.value })} /></div>
          <Button type="submit" disabled={m.isPending}>Envoyer</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
