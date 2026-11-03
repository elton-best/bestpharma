import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, Clock, PlusCircle } from "lucide-react";
import { api } from "@/lib/api-client";
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
  head: () => ({
    meta: [
      { title: "Non-conformités & Plan CAPA — BEGPHARMA" },
      { name: "description", content: "Déclaration, analyse des causes 5M et plan d'actions correctives et préventives (CAPA)." },
    ],
  }),
  component: PageNonConformites,
});

const statuts: Record<string, string> = {
  ouverte: "Ouverte",
  en_cours: "Plan CAPA en cours",
  cloturee: "Clôturée & Efficace",
};

const gravites: Record<string, string> = {
  mineure: "Mineure",
  majeure: "Majeure",
  critique: "Critique",
};

interface NonConformite {
  id: string;
  numero_nc?: string;
  titre: string;
  description?: string;
  gravite: "mineure" | "majeure" | "critique";
  statut: "ouverte" | "en_cours" | "cloturee";
  processus: string;
  source: string;
  action_immediate?: string;
  action_preventive?: string;
  analyse_causes_5m?: string;
  date_echeance_capa?: string;
  responsable_action?: string;
  created_at: string;
}

function PageNonConformites() {
  const { courante, aRole } = useOfficine();
  const id = courante?.officine_id;
  const qc = useQueryClient();
  const peutTraiter = aRole(...QUALITE);

  const { data: ncs = [] } = useQuery<NonConformite[]>({
    queryKey: ["non-conformites", id],
    enabled: !!id,
    queryFn: async () => {
      return api.get<NonConformite[]>(`/api/officines/${id}/non-conformites`);
    },
  });

  const maj = useMutation({
    mutationFn: async ({ ncId, champs }: { ncId: string; champs: Partial<NonConformite> }) => {
      return api.put(`/api/officines/${id}/non-conformites/${ncId}`, champs);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["non-conformites"] });
      toast.success("Fiche de non-conformité mise à jour.");
    },
    onError: (e: any) => toast.error(e.message || "Erreur"),
  });

  return (
    <div className="grid gap-6">
      <EnTete
        titre="Non-conformités & CAPA (BPD1-F09)"
        description="Tout employé peut déclarer un dysfonctionnement. Le responsable qualité conduit l'analyse des causes (5M) et le titulaire valide la clôture."
        action={id ? <DeclarerNonConformite officineId={id} /> : null}
      />

      {ncs.length === 0 ? (
        <Vide texte="Aucune non-conformité enregistrée. La conformité BPD est optimale." />
      ) : (
        <div className="grid gap-4">
          {ncs.map((n) => (
            <Card key={n.id} className="border-l-4 border-l-primary shadow-sm">
              <CardContent className="grid gap-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-foreground text-base">{n.titre}</p>
                    {n.numero_nc ? (
                      <Badge variant="outline" className="font-mono text-xs font-bold text-primary">
                        {n.numero_nc}
                      </Badge>
                    ) : null}
                    <Badge variant={n.gravite === "critique" ? "destructive" : n.gravite === "majeure" ? "secondary" : "outline"}>
                      {gravites[n.gravite] || n.gravite}
                    </Badge>
                    <Badge variant={n.statut === "cloturee" ? "default" : "secondary"}>
                      {statuts[n.statut] || n.statut}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">Déclarée le {dateFr(n.created_at)}</span>
                </div>

                {n.description ? (
                  <p className="text-sm text-foreground bg-muted/30 p-2.5 rounded-md border">{n.description}</p>
                ) : null}

                {/* DÉTAIL DE L'ANALYSE 5M & PLAN CAPA */}
                {(n.analyse_causes_5m || n.action_immediate || n.action_preventive) ? (
                  <div className="rounded-lg bg-muted/20 p-3 border text-xs grid gap-2">
                    {n.analyse_causes_5m ? (
                      <div>
                        <span className="font-semibold text-muted-foreground">Analyse des causes (5M) :</span>
                        <p className="mt-0.5">{n.analyse_causes_5m}</p>
                      </div>
                    ) : null}

                    {n.action_immediate ? (
                      <div>
                        <span className="font-semibold text-muted-foreground">Action immédiate / corrective :</span>
                        <p className="mt-0.5">{n.action_immediate}</p>
                      </div>
                    ) : null}

                    {n.action_preventive ? (
                      <div>
                        <span className="font-semibold text-muted-foreground">Action préventive (CAPA) :</span>
                        <p className="mt-0.5">{n.action_preventive}</p>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {/* ACTIONS SUR LE WORKFLOW */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t text-xs text-muted-foreground">
                  <div>
                    {n.responsable_action ? (
                      <span>Responsable : <strong>{n.responsable_action}</strong></span>
                    ) : null}
                    {n.date_echeance_capa ? (
                      <span className="ml-3">Échéance : <strong>{dateFr(n.date_echeance_capa)}</strong></span>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {peutTraiter && n.statut === "ouverte" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => maj.mutate({ ncId: n.id, champs: { statut: "en_cours" } })}
                      >
                        Engager le plan CAPA
                      </Button>
                    )}

                    {peutTraiter && n.statut === "en_cours" && (
                      <Button
                        size="sm"
                        className="h-8 bg-emerald-600 hover:bg-emerald-700 text-xs"
                        onClick={() => maj.mutate({ ncId: n.id, champs: { statut: "cloturee", efficacite_verifiee: true } })}
                      >
                        <CheckCircle2 className="size-3.5 mr-1" /> Clôturer & Valider efficacité
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function DeclarerNonConformite({ officineId }: { officineId: string }) {
  const qc = useQueryClient();
  const [ouvert, setOuvert] = useState(false);
  const [titre, setTitre] = useState("");
  const [gravite, setGravite] = useState<"mineure" | "majeure" | "critique">("mineure");
  const [description, setDescription] = useState("");
  const [actionImmediate, setActionImmediate] = useState("");
  const [causes5m, setCauses5m] = useState("");

  const creation = useMutation({
    mutationFn: async () => {
      return api.post(`/api/officines/${officineId}/non-conformites`, {
        titre: titre.trim(),
        gravite,
        description: description.trim(),
        action_immediate: actionImmediate.trim(),
        analyse_causes_5m: causes5m.trim(),
      });
    },
    onSuccess: () => {
      toast.success("Non-conformité déclarée avec succès.");
      qc.invalidateQueries({ queryKey: ["non-conformites"] });
      setOuvert(false);
      setTitre("");
      setDescription("");
      setActionImmediate("");
      setCauses5m("");
    },
    onError: (e: any) => toast.error(e.message || "Erreur lors de la déclaration"),
  });

  return (
    <Dialog open={ouvert} onOpenChange={setOuvert}>
      <DialogTrigger asChild>
        <Button className="h-10">
          <PlusCircle className="size-4 mr-1.5" /> Signaler une Non-Conformité
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Déclaration d'incident ou de non-conformité</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-3 py-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (titre.trim()) creation.mutate();
          }}
        >
          <div className="grid gap-1">
            <Label htmlFor="nc-titre">Intitulé du dysfonctionnement *</Label>
            <Input id="nc-titre" required placeholder="Ex: Rupture de chaîne du froid, Colis endommagé..." value={titre} onChange={(e) => setTitre(e.target.value)} />
          </div>

          <div className="grid gap-1">
            <Label>Niveau de gravité réglementaire *</Label>
            <Select value={gravite} onValueChange={(v: any) => setGravite(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mineure">Mineure (Aucun risque patient ni produit)</SelectItem>
                <SelectItem value="majeure">Majeure (Risque de détérioration ou retard)</SelectItem>
                <SelectItem value="critique">Critique (Risque direct pour la santé publique ou température frigo)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1">
            <Label htmlFor="nc-desc">Constat / Description détaillée des faits</Label>
            <Textarea id="nc-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="grid gap-1">
            <Label htmlFor="nc-act">Action immédiate de mise en sécurité</Label>
            <Input id="nc-act" placeholder="Ex: Mise en quarantaine, Isolement..." value={actionImmediate} onChange={(e) => setActionImmediate(e.target.value)} />
          </div>

          <div className="grid gap-1">
            <Label htmlFor="nc-5m">Première hypothèse sur les causes (Méthode 5M)</Label>
            <Input id="nc-5m" placeholder="Matériel, Milieu, Méthode, Main d'œuvre, Matière" value={causes5m} onChange={(e) => setCauses5m(e.target.value)} />
          </div>

          <Button type="submit" disabled={creation.isPending} className="mt-2">
            Enregistrer et notifier le responsable qualité
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
