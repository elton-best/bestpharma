import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useOfficine } from "@/lib/officine-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EnTete, Vide, dateFr, QUALITE } from "@/components/modules/commun";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({ meta: [{ title: "Documents — BEGPHARMA" }, { name: "description", content: "Procédures et documents qualité, avec versions et validation." }] }),
  component: Page,
});

export const statutDoc = { brouillon: "Brouillon", a_valider: "À valider", valide: "Validé" } as Record<string, string>;

function Page() {
  const { courante, aRole } = useOfficine();
  const id = courante?.officine_id;
  const qc = useQueryClient();
  const [filtre, setFiltre] = useState("tous");
  const peutRediger = aRole(...QUALITE);
  const peutValider = aRole("pharmacien_titulaire", "promoteur");
  const { data = [] } = useQuery({
    queryKey: ["documents", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("documents").select("*").eq("officine_id", id!).eq("modele", false).eq("archived", false).order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const maj = useMutation({
    mutationFn: async ({ docId, champs }: { docId: string; champs: Database["public"]["Tables"]["documents"]["Update"] }) => {
      const { error } = await supabase.from("documents").update(champs).eq("id", docId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["documents"] }); qc.invalidateQueries({ queryKey: ["dashboard-kpi"] }); },
    onError: (e) => toast.error(e.message),
  });
  const liste = filtre === "tous" ? data : data.filter((d) => d.statut === filtre);

  return (
    <div className="grid gap-6">
      <EnTete titre="Documents" description="Les documents ne sont jamais supprimés : chaque modification crée une nouvelle version." action={peutRediger && id ? <NouveauDocument officineId={id} /> : null} />
      <Tabs value={filtre} onValueChange={setFiltre}>
        <TabsList>
          <TabsTrigger value="tous">Tous</TabsTrigger>
          <TabsTrigger value="brouillon">Brouillons</TabsTrigger>
          <TabsTrigger value="a_valider">À valider</TabsTrigger>
          <TabsTrigger value="valide">Validés</TabsTrigger>
        </TabsList>
      </Tabs>
      {liste.length === 0 ? <Vide texte="Aucun document." /> : (
        <div className="grid gap-3">
          {liste.map((d) => (
            <Card key={d.id}>
              <CardContent className="grid gap-2 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-foreground">{d.titre}</p>
                  <Badge variant="outline">v{d.version}</Badge>
                  <Badge variant={d.statut === "valide" ? "default" : "secondary"}>{statutDoc[d.statut]}</Badge>
                </div>
                <p className="line-clamp-2 text-sm text-muted-foreground">{d.contenu || "—"}</p>
                <p className="text-xs text-muted-foreground">{d.categorie} · modifié le {dateFr(d.updated_at)}{d.valide_le ? ` · validé le ${dateFr(d.valide_le)}` : ""}</p>
                <div className="flex flex-wrap gap-2">
                  {peutRediger && d.statut === "brouillon" && <Button size="sm" variant="outline" onClick={() => maj.mutate({ docId: d.id, champs: { statut: "a_valider" } })}>Soumettre à validation</Button>}
                  {peutValider && d.statut === "a_valider" && <Button size="sm" onClick={() => maj.mutate({ docId: d.id, champs: { statut: "valide", valide_le: new Date().toISOString() } })}>Valider</Button>}
                  {peutRediger && d.statut === "valide" && <Button size="sm" variant="ghost" onClick={() => maj.mutate({ docId: d.id, champs: { statut: "brouillon", version: d.version + 1, valide_le: null, valide_par: null } })}>Nouvelle version</Button>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function NouveauDocument({ officineId, initial, libelle = "Nouveau document" }: { officineId: string; initial?: { titre: string; categorie: string; contenu: string }; libelle?: string }) {
  const qc = useQueryClient();
  const [ouvert, setOuvert] = useState(false);
  const [f, setF] = useState(initial ?? { titre: "", categorie: "procedure", contenu: "" });
  const m = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("documents").insert({ officine_id: officineId, ...f, titre: f.titre.trim() });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Document créé en brouillon"); qc.invalidateQueries({ queryKey: ["documents"] }); setOuvert(false); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Dialog open={ouvert} onOpenChange={setOuvert}>
      <DialogTrigger asChild><Button size={initial ? "sm" : "default"} variant={initial ? "outline" : "default"}>{libelle}</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{libelle}</DialogTitle></DialogHeader>
        <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); if (f.titre.trim()) m.mutate(); }}>
          <div className="grid gap-1"><Label>Titre</Label><Input required value={f.titre} onChange={(e) => setF({ ...f, titre: e.target.value })} /></div>
          <div className="grid gap-1"><Label>Catégorie</Label><Input value={f.categorie} onChange={(e) => setF({ ...f, categorie: e.target.value })} /></div>
          <div className="grid gap-1"><Label>Contenu</Label><Textarea rows={6} value={f.contenu} onChange={(e) => setF({ ...f, contenu: e.target.value })} /></div>
          <Button type="submit" disabled={m.isPending}>Créer</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
